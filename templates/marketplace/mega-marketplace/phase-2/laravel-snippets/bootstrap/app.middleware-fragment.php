<?php

use App\Http\Middleware\EnsureRole;
use Illuminate\Foundation\Configuration\Middleware;

/*
|--------------------------------------------------------------------------
| Middleware alias fragment
|--------------------------------------------------------------------------
| Add this alias in bootstrap/app.php inside ->withMiddleware().
*/

return function (Middleware $middleware): void {
    $middleware->alias([
        'role' => EnsureRole::class,
    ]);
};
