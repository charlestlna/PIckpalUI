<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next, ?string $actorTypes = null): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            abort(401, 'Authentication token is required.');
        }

        $allowedTypes = $actorTypes
            ? array_filter(explode(',', $actorTypes))
            : [];

        $query = ApiToken::where('token_hash', hash('sha256', $plainToken))
            ->where(function ($inner) {
                $inner->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });

        if ($allowedTypes) {
            $query->whereIn('actor_type', $allowedTypes);
        }

        $token = $query->first();

        if (! $token) {
            abort(401, 'Invalid or expired authentication token.');
        }

        $token->update(['last_used_at' => now()]);
        $request->attributes->set('api_token', $token);

        return $next($request);
    }
}
