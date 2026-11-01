<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Student documents: passports, transcripts, bank statements.
 *
 * Only metadata lives here. The file itself goes on the private disk
 * (storage/app/private), which is outside the web root, and is only ever
 * released through an authorised download route. A row can exist with no file
 * at all: that is the office asking the student for something.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('group')->default('application'); // application | visa
            // accepted | review | needed | rejected | later
            $table->string('status')->default('needed');
            $table->string('path')->nullable();          // private disk path
            $table->string('original_name')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('mime')->nullable();
            $table->text('note')->nullable();            // the office's feedback
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
