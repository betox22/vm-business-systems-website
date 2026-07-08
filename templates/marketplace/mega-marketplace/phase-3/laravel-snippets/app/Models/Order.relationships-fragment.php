<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public function vendorOrders(): HasMany
    {
        return $this->hasMany(VendorOrder::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
