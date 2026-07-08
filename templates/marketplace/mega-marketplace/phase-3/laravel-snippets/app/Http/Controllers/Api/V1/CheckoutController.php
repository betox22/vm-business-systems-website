<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\PlaceOrderRequest;
use App\Services\Checkout\MultiVendorCheckoutService;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function placeOrder(
        PlaceOrderRequest $request,
        MultiVendorCheckoutService $checkoutService
    ): JsonResponse {
        $order = $checkoutService->placeOrder(
            customer: $request->user(),
            payload: $request->validated(),
            idempotencyKey: $request->header('Idempotency-Key')
        );

        return response()->json([
            'order' => [
                'id' => $order->uuid,
                'orderNumber' => $order->order_number,
                'status' => $order->status,
                'paymentStatus' => $order->payment_status,
                'currency' => $order->currency,
                'subtotal' => $order->subtotal,
                'taxTotal' => $order->tax_total,
                'shippingTotal' => $order->shipping_total,
                'grandTotal' => $order->grand_total,
                'vendorOrders' => $order->vendorOrders->map(fn ($vendorOrder) => [
                    'id' => $vendorOrder->uuid,
                    'vendorOrderNumber' => $vendorOrder->vendor_order_number,
                    'vendorId' => $vendorOrder->vendor_id,
                    'status' => $vendorOrder->status,
                    'subtotal' => $vendorOrder->subtotal,
                    'commissionAmount' => $vendorOrder->commission_amount,
                    'vendorNetAmount' => $vendorOrder->vendor_net_amount,
                ])->values(),
            ],
        ], 201);
    }
}
