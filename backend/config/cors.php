<?php

/*
 * Which origins the browser may call the API from. The React app runs on a few
 * local origins in dev (Vite, the vite preview, the mock preview, and the XAMPP
 * vhost); add the production origin here when the VPS is set up.
 */
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:4180',
        'http://studyhub.local',
        'https://studyhub.local',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
