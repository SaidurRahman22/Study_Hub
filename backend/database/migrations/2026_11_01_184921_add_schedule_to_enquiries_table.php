<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * A booked consultation is an enquiry with a time on it, so it lives in the
 * same table rather than a second one. `scheduled_at` is stored in UTC;
 * `timezone` records the IANA zone it was booked in, which is what the video
 * booking work will convert against.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->timestamp('scheduled_at')->nullable()->after('status');
            $table->string('timezone')->nullable()->after('scheduled_at');
            $table->boolean('online')->default(false)->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->dropColumn(['scheduled_at', 'timezone', 'online']);
        });
    }
};
