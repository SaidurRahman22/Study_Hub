<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * One thread per student: every row belongs to the student whose file it is,
 * and `sender` says which side wrote it. There is no thread table because
 * there is only ever one conversation, between a student and the office.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Who wrote it: the student whose file this is, or the office.
            $table->enum('sender', ['student', 'agency']);
            // The person's name as it should read, kept at write time so a
            // later rename does not rewrite history.
            $table->string('author');
            $table->text('body');
            // Which staff account wrote an agency message, for the audit trail.
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
