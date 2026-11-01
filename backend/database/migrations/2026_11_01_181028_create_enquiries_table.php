<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Enquiries: every lead from the website. The contact form and, later, the
 * consultation booking write here, so staff see one list of who got in touch
 * and where each stands.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('destination')->nullable();
            $table->string('need')->nullable();
            $table->string('subject')->nullable();
            $table->text('message')->nullable();
            // Where it came from: contact | consultation | website.
            $table->string('source')->default('contact');
            // new | contacted | booked | closed.
            $table->string('status')->default('new');
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
