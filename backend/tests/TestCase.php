<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Set once a test has pinned an identity with actingAs() or be(). */
    private bool $identityIsPinned = false;

    public function be(Authenticatable $user, $guard = null)
    {
        $this->identityIsPinned = true;

        return parent::be($user, $guard);
    }

    /**
     * Start every test request with nobody signed in.
     *
     * One application object serves every request inside a test, and the
     * guard caches the user it resolved the first time. In production each
     * request arrives at a fresh process and has to prove who it is from its
     * own token; here that has to be arranged, or the second request in a
     * test inherits the first one's identity.
     *
     * It is not a tidiness point. Without this, a revoked token keeps working
     * for the rest of the test, signing out proves nothing, a password change
     * appears to leave the other device signed in, and a request sent as
     * staff is answered as whoever went before — so the security tests that
     * matter most pass for the wrong reason.
     *
     * A test that pinned an identity with actingAs() is left alone: there,
     * the pinned user is the arrangement.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        if (! $this->identityIsPinned) {
            $this->app['auth']->forgetGuards();
        }

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
