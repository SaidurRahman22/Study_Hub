<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Something the office tells a student about, rather than something the
 * student asked for: a document checked, a stage reached, or a word to
 * everyone. A null user_id means every student sees it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            // What it is about, so the portal can pick an icon and a link.
            $table->enum('kind', ['document', 'stage', 'message', 'announcement'])
                ->default('announcement');
            $table->string('title');
            $table->text('body')->nullable();
            // Where the detail lives in the portal, if there is somewhere to go.
            $table->string('href')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
