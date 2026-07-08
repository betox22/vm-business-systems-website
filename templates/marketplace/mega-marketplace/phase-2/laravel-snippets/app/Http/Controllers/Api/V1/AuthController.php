<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => $data['name'],
            'email' => mb_strtolower($data['email']),
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'default_role' => 'customer',
            'status' => 'active',
        ]);

        $token = $user->createToken(
            $data['device_name'] ?? 'api-client',
            ['customer']
        )->plainTextToken;

        return response()->json([
            'user' => $this->publicUser($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', mb_strtolower($data['email']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is not active.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken(
            $data['device_name'] ?? 'api-client',
            [$user->default_role]
        )->plainTextToken;

        return response()->json([
            'user' => $this->publicUser($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->publicUser($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }

    private function publicUser(User $user): array
    {
        return [
            'id' => $user->uuid,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->default_role,
            'status' => $user->status,
        ];
    }
}
