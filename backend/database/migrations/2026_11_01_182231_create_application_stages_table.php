<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * The six-stage journey for each student. `date_label` is free text on purpose
 * ("Since 20 May 2026", "Expected Sep 2026"), matching how the office writes it.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('application_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('state')->default('todo'); // todo | now | done
            $table->string('date_label')->nullable();
            $table->text('note')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_stages');
    }
};
