<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/* Daily backup, and a weekly proof that it can actually be restored.
 *
 * The verify run is the point. A dump that has been silently empty for
 * months looks exactly like a working backup until the day it is needed,
 * so backup:restore --check loads the newest dump into a scratch database,
 * counts the rows and drops it again, touching nothing live.
 *
 * These only run if something is running the scheduler. On the VPS that is
 * one cron entry:
 *   * * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
 * On Windows, a Task Scheduler task running `php artisan schedule:run`
 * every minute does the same job.
 */
Schedule::command('backup:run')
    ->dailyAt('02:30')
    ->withoutOverlapping()
    ->onFailure(fn () => Log::error('Nightly backup FAILED.'));

Schedule::call(function () {
    $newest = collect(glob(storage_path('backups/db_*.sql')) ?: [])->sort()->last();

    if (! $newest) {
        Log::error('Backup verify: there are no backups at all to check.');

        return;
    }

    Artisan::call('backup:restore', ['--file' => $newest, '--check' => true]);

    if (Artisan::output() && str_contains(Artisan::output(), 'RESTORE OK')) {
        Log::info('Backup verify: restore drill passed.', ['file' => basename($newest)]);
    } else {
        Log::error('Backup verify: the newest backup did NOT restore.', ['file' => $newest]);
    }
})->weeklyOn(1, '03:30')->name('backup-verify');
