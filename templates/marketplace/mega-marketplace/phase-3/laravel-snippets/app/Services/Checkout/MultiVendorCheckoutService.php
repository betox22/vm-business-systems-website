<?php

namespace App\Services\Checkout;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\VendorOrder;
use App\Services\Accounting\VendorLedgerService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MultiVendorCheckoutService
{
    public function __construct(
        private readonly VendorLedgerService $ledgerService
    ) {
    }

    public function placeOrder(User $customer, array $payload, ?string $idempotencyKey): Order
    {
        if (! $idempotencyKey) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['The Idempotency-Key header is required.'],
            ]);
        }

        $existing = Order::query()
            ->where('user_id', $customer->id)
            ->where('idempotency_key', $idempotencyKey)
            ->with(['vendorOrders.items'])
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($customer, $payload, $idempotencyKey): Order {
            $normalizedItems = $this->normalizeItems($payload['items']);
            $productIds = array_keys($normalizedItems);

            /** @var Collection<int, Product> $products */
            $products = Product::query()
                ->with('vendor')
                ->whereIn('id', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $lines = $this->buildValidatedLines($normalizedItems, $products);
            $subtotal = $this->sum($lines, 'line_total');
            $taxTotal = 0.00;
            $shippingTotal = 0.00;
            $grandTotal = $this->money($subtotal + $taxTotal + $shippingTotal);

            $order = Order::create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $customer->id,
                'order_number' => $this->makeOrderNumber(),
                'status' => 'placed',
                'payment_status' => 'unpaid',
                'currency' => 'USD',
                'subtotal' => $subtotal,
                'discount_total' => 0.00,
                'tax_total' => $taxTotal,
                'shipping_total' => $shippingTotal,
                'grand_total' => $grandTotal,
                'idempotency_key' => $idempotencyKey,
                'placed_at' => now(),
            ]);

            foreach ($this->groupLinesByVendor($lines) as $vendorId => $vendorLines) {
                $vendorOrder = $this->createVendorOrder($order, (int) $vendorId, $vendorLines);

                foreach ($vendorLines as $line) {
                    $this->createOrderItem($order, $vendorOrder, $line);
                    $line['product']->decrement('stock_quantity', $line['quantity']);
                }

                $this->ledgerService->recordVendorOrderSale($vendorOrder->fresh('items'));
            }

            return $order->fresh(['vendorOrders.items']);
        }, 3);
    }

    private function normalizeItems(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            $productId = (int) $item['product_id'];
            $quantity = (int) $item['quantity'];

            if (! isset($normalized[$productId])) {
                $normalized[$productId] = 0;
            }

            $normalized[$productId] += $quantity;
        }

        return $normalized;
    }

    private function buildValidatedLines(array $normalizedItems, Collection $products): array
    {
        $lines = [];

        foreach ($normalizedItems as $productId => $quantity) {
            /** @var Product|null $product */
            $product = $products->get($productId);

            if (! $product || $product->status !== 'active') {
                throw ValidationException::withMessages([
                    'items' => ["Product {$productId} is not available."],
                ]);
            }

            if (! $product->vendor || $product->vendor->status !== 'active') {
                throw ValidationException::withMessages([
                    'items' => ["Vendor for product {$productId} is not active."],
                ]);
            }

            if ($product->inventory_policy === 'deny' && $product->stock_quantity < $quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Product {$product->name} does not have enough stock."],
                ]);
            }

            $unitPrice = $this->money((float) $product->price);
            $lineTotal = $this->money($unitPrice * $quantity);

            $lines[] = [
                'product' => $product,
                'vendor_id' => (int) $product->vendor_id,
                'vendor_display_name' => $product->vendor->display_name,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'commission_rate' => $this->money((float) $product->vendor->commission_rate),
            ];
        }

        return $lines;
    }

    private function groupLinesByVendor(array $lines): array
    {
        $groups = [];

        foreach ($lines as $line) {
            $groups[$line['vendor_id']][] = $line;
        }

        return $groups;
    }

    private function createVendorOrder(Order $order, int $vendorId, array $vendorLines): VendorOrder
    {
        $subtotal = $this->sum($vendorLines, 'line_total');
        $commission = $this->calculateCommission($vendorLines);
        $net = $this->money($subtotal - $commission);

        return VendorOrder::create([
            'uuid' => (string) Str::uuid(),
            'order_id' => $order->id,
            'vendor_id' => $vendorId,
            'vendor_order_number' => $this->makeVendorOrderNumber($order->order_number, $vendorId),
            'status' => 'pending',
            'currency' => $order->currency,
            'subtotal' => $subtotal,
            'discount_total' => 0.00,
            'tax_total' => 0.00,
            'shipping_total' => 0.00,
            'grand_total' => $subtotal,
            'commission_amount' => $commission,
            'vendor_net_amount' => $net,
        ]);
    }

    private function createOrderItem(Order $order, VendorOrder $vendorOrder, array $line): OrderItem
    {
        /** @var Product $product */
        $product = $line['product'];

        return OrderItem::create([
            'order_id' => $order->id,
            'vendor_order_id' => $vendorOrder->id,
            'vendor_id' => $line['vendor_id'],
            'product_id' => $product->id,
            'product_uuid' => $product->uuid,
            'product_sku' => $product->sku,
            'product_name' => $product->name,
            'vendor_display_name' => $line['vendor_display_name'],
            'quantity' => $line['quantity'],
            'unit_price' => $line['unit_price'],
            'discount_total' => 0.00,
            'tax_total' => 0.00,
            'shipping_total' => 0.00,
            'line_total' => $line['line_total'],
            'commission_rate' => $line['commission_rate'],
            'fulfillment_status' => 'pending',
        ]);
    }

    private function calculateCommission(array $lines): float
    {
        $commission = 0.00;

        foreach ($lines as $line) {
            $commission += $line['line_total'] * ($line['commission_rate'] / 100);
        }

        return $this->money($commission);
    }

    private function sum(array $lines, string $key): float
    {
        return $this->money(array_reduce(
            $lines,
            fn (float $carry, array $line): float => $carry + (float) $line[$key],
            0.00
        ));
    }

    private function makeOrderNumber(): string
    {
        return 'ORD-' . now()->format('Ymd-His') . '-' . Str::upper(Str::random(6));
    }

    private function makeVendorOrderNumber(string $orderNumber, int $vendorId): string
    {
        return $orderNumber . '-V' . $vendorId;
    }

    private function money(float $value): float
    {
        return round($value, 2);
    }
}
