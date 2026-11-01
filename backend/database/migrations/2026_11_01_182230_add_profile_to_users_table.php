<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Users are both students and staff. Role decides which. Students also carry a
 * small application profile (which country, university, counsellor, intake).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('student')->after('email'); // student | staff | admin
            $table->string('phone')->nullable()->after('role');
            $table->string('student_code')->nullable()->unique()->after('phone');
            $table->string('counsellor')->nullable();
            $table->string('country')->nullable();
            $table->string('university')->nullable();
            $table->string('course')->nullable();
            $table->string('intake')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role', 'phone', 'student_code', 'counsellor',
                'country', 'university', 'course', 'intake',
            ]);
        });
    }
};
