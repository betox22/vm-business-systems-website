<?php

namespace App\Services\Accounting;

use App\Models\VendorLedger;
use App\Models\VendorOrder;
use Illuminate\Support\Str;

class VendorLedgerService
{
    public function recordVendorOrderSale(VendorOrder $vendorOrder): VendorLedger
    {
        $gross = $this->money((float) $vendorOrder->items->sum('line_total'));
        $commission = $this->money((float) $vendorOrder->items->sum(
            fn ($item): float => (float) $item->line_total * ((float) $item->commission_rate / 100)
        ));
        $net = $this->money($gross - $commission);

        $vendorOrder->forceFill([
            'commission_amount' => $commission,
            'vendor_net_amount' => $net,
        ])->save();

        return VendorLedger::create([
            'uuid' => (string) Str::uuid(),
            'vendor_id' => $vendorOrder->vendor_id,
            'order_id' => $vendorOrder->order_id,
            'order_item_id' => null,
            'entry_type' => 'sale',
            'status' => 'pending',
            'currency' => $vendorOrder->currency,
            'gross_amount' => $gross,
            'commission_amount' => $commission,
            'net_amount' => $net,
            'commission_rate' => $this->effectiveCommissionRate($vendorOrder),
            'available_at' => now()->addDays(7),
            'notes' => 'Pending sale ledger entry for vendor order ' . $vendorOrder->vendor_order_number,
        ]);
    }

    private function effectiveCommissionRate(VendorOrder $vendorOrder): float
    {
        $gross = (float) $vendorOrder->items->sum('line_total');

        if ($gross <= 0) {
            return 0.00;
        }

        return $this->money(((float) $vendorOrder->commission_amount / $gross) * 100);
    }

    private function money(float $value): float
    {
        return round($value, 2);
    }
}
