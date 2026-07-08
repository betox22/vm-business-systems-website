<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;

/*
|--------------------------------------------------------------------------
| User model fragment
|--------------------------------------------------------------------------
| Add HasApiTokens to the real App\Models\User class.
*/

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'uuid',
        'name',
        'email',
        'phone',
        'password',
        'default_role',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
