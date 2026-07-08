<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\VendorApplicationController;
use App\Http\Controllers\Api\V1\VendorProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('role:customer,vendor')->group(function () {
            Route::post('/vendors/applications', [VendorApplicationController::class, 'store']);
        });

        Route::middleware('role:vendor,admin')->group(function () {
            Route::get('/vendors/me', [VendorApplicationController::class, 'showMine']);
            Route::patch('/vendors/{vendor}', [VendorApplicationController::class, 'update']);
            Route::post('/vendors/{vendor}/submit-review', [VendorApplicationController::class, 'submitReview']);

            Route::get('/vendor/products', [VendorProductController::class, 'index']);
            Route::post('/vendor/products', [VendorProductController::class, 'store']);
            Route::get('/vendor/products/{product}', [VendorProductController::class, 'show']);
            Route::patch('/vendor/products/{product}', [VendorProductController::class, 'update']);
            Route::delete('/vendor/products/{product}', [VendorProductController::class, 'destroy']);
        });

        Route::middleware('role:customer')->group(function () {
            Route::get('/checkout/cart', [CheckoutController::class, 'cart']);
            Route::post('/checkout/cart/items', [CheckoutController::class, 'addItem']);
            Route::patch('/checkout/cart/items/{cartItem}', [CheckoutController::class, 'updateItem']);
            Route::delete('/checkout/cart/items/{cartItem}', [CheckoutController::class, 'removeItem']);
            Route::post('/checkout/quote', [CheckoutController::class, 'quote']);
            Route::post('/checkout/place-order', [CheckoutController::class, 'placeOrder']);
        });

        Route::middleware('role:admin')->group(function () {
            Route::get('/admin/vendor-applications', [VendorApplicationController::class, 'indexPending']);
            Route::patch('/admin/vendors/{vendor}/approve', [VendorApplicationController::class, 'approve']);
            Route::patch('/admin/vendors/{vendor}/suspend', [VendorApplicationController::class, 'suspend']);
        });
    });
});
