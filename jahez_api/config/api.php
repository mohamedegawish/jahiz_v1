<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API Rate Limit
    |--------------------------------------------------------------------------
    |
    | Requests allowed per minute for the default "api" rate limiter: per client
    | IP address for guests, and per account for signed-in users. The web client
    | alone made 72 calls in one minute while an administrator moved through
    | about ten portal pages, so signed-in accounts have a higher limit (finding
    | PA-35). Both are provisional technical defaults, not measured capacities.
    |
    */

    'rate_limit_per_minute' => (int) env('API_RATE_LIMIT_PER_MINUTE', 60),

    'user_rate_limit_per_minute' => (int) env('API_USER_RATE_LIMIT_PER_MINUTE', 180),

    /*
    |--------------------------------------------------------------------------
    | Front-end URL
    |--------------------------------------------------------------------------
    |
    | Base URL of the client application. Password reset and invitation emails
    | link to {frontend_url}/reset-password?token=...&email=..., a page the
    | client implements and which posts to POST /api/v1/auth/reset-password.
    |
    */

    'frontend_url' => (string) env('FRONTEND_URL', 'http://localhost:3000'),

];
