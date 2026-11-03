<?php

namespace Tests\Concerns;

use App\Models\Document;
use App\Models\User;

/*
 * The people and the paperwork the security tests need.
 *
 * One rule worth knowing before using any of this: tokens here are REAL
 * Sanctum tokens, created and sent as a Bearer header, never
 * Sanctum::actingAs(). actingAs installs a TransientToken, which has no id,
 * and two things the API does read that id — logout deletes the current
 * token by id, and changing a password keeps the current token and deletes
 * every other one by id. Against a transient token both of those silently do
 * nothing and the test passes while the product is broken.
 */
trait MakesPortalUsers
{
    protected function student(array $attributes = []): User
    {
        return User::factory()->create([
            'role' => 'student',
            'password' => 'student-password',
            'student_code' => 'SHB-'.fake()->unique()->numberBetween(1000, 9999),
            ...$attributes,
        ]);
    }

    protected function staff(array $attributes = []): User
    {
        return User::factory()->create([
            'role' => 'staff',
            'password' => 'staff-password',
            ...$attributes,
        ]);
    }

    protected function admin(array $attributes = []): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'password' => 'admin-password',
            ...$attributes,
        ]);
    }

    /** A real token, as the browser would hold it. */
    protected function tokenFor(User $user, string $name = 'test'): string
    {
        return $user->createToken($name)->plainTextToken;
    }

    /** Send the next request as this user, over a real token. */
    protected function as(User $user): static
    {
        return $this->withToken($this->tokenFor($user));
    }

    /** A document row belonging to $owner. Pass `path` to give it a file. */
    protected function documentFor(User $owner, array $attributes = []): Document
    {
        return Document::create([
            'user_id' => $owner->id,
            'name' => 'Passport',
            'group' => 'application',
            'status' => 'needed',
            ...$attributes,
        ]);
    }
}
