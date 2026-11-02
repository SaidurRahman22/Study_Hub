<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

/*
 * Restores a database dump, and more importantly proves one can be restored.
 *
 * --check is the mode that matters and the one meant to run regularly. It
 * loads the dump into a scratch database, counts what came back, and drops
 * it again, without touching the live data. An untested backup is a guess:
 * the usual way to find out a dump has been silently empty for months is to
 * need it.
 *
 * Without --check it restores over a real database, and asks first, because
 * that replaces everything currently in it.
 */
class BackupRestore extends Command
{
    protected $signature = 'backup:restore
        {--file= : Path to the .sql dump}
        {--check : Verify into a scratch database and drop it again, leaving the live data alone}
        {--database= : Target database when actually restoring (defaults to the configured one)}';

    protected $description = 'Restore a database backup, or verify that one can be restored';

    public function handle(): int
    {
        $file = (string) $this->option('file');

        if (! $file || ! is_file($file)) {
            $this->error('Pass --file=<path to a .sql dump>.');
            $this->line('Latest backups:');
            foreach (array_slice(array_reverse(glob(storage_path('backups/db_*.sql')) ?: []), 0, 5) as $f) {
                $this->line('  '.$f);
            }

            return self::FAILURE;
        }

        return $this->option('check')
            ? $this->verify($file)
            : $this->restoreForReal($file);
    }

    /* The drill: load into a throwaway database, look at what arrived, drop
     * it. Nothing here can touch the live data, so it is safe to run often. */
    private function verify(string $file): int
    {
        $scratch = 'studyhub_restore_check';

        $this->info("Verifying {$file}");
        $this->line("  into scratch database {$scratch}");

        DB::statement("DROP DATABASE IF EXISTS `{$scratch}`");
        DB::statement("CREATE DATABASE `{$scratch}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        try {
            if (! $this->loadInto($scratch, $file)) {
                $this->error('  the dump would NOT load. This backup is not usable.');

                return self::FAILURE;
            }

            $tables = DB::select(
                'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?',
                [$scratch]
            );

            if ($tables === []) {
                $this->error('  loaded, but the dump contains no tables.');

                return self::FAILURE;
            }

            $this->newLine();
            $this->line('  table                     rows');
            $total = 0;
            foreach ($tables as $row) {
                $name = $row->t;
                $n = DB::selectOne("SELECT COUNT(*) AS c FROM `{$scratch}`.`{$name}`")->c;
                $total += $n;
                $this->line('  '.str_pad($name, 26).$n);
            }

            $this->newLine();
            $this->info("  RESTORE OK: {$total} rows across ".count($tables).' tables.');

            // A dump that loads but has no users is a dump of an empty server.
            $users = DB::selectOne("SELECT COUNT(*) AS c FROM `{$scratch}`.`users`")->c ?? 0;
            if ($users === 0) {
                $this->warn('  but there are no users in it, which is almost certainly wrong.');

                return self::FAILURE;
            }

            return self::SUCCESS;
        } finally {
            DB::statement("DROP DATABASE IF EXISTS `{$scratch}`");
            $this->line('  scratch database dropped.');
        }
    }

    private function restoreForReal(string $file): int
    {
        $target = (string) ($this->option('database') ?: config('database.connections.'.config('database.default').'.database'));

        $this->warn("This REPLACES everything in the database '{$target}'.");
        if (! $this->confirm('Go ahead?', false)) {
            $this->line('Nothing was changed.');

            return self::SUCCESS;
        }

        if (! $this->loadInto($target, $file)) {
            $this->error('Restore failed.');

            return self::FAILURE;
        }

        $this->info("Restored {$file} into {$target}.");

        return self::SUCCESS;
    }

    private function loadInto(string $database, string $file): bool
    {
        $db = config('database.connections.'.config('database.default'));

        // Password via the environment, never as a visible argument.
        $process = new Process([
            env('MYSQL_PATH', 'C:\\xampp\\mysql\\bin\\mysql.exe'),
            '--host='.$db['host'],
            '--port='.$db['port'],
            '--user='.$db['username'],
            '--default-character-set=utf8mb4',
            $database,
        ], env: ['MYSQL_PWD' => (string) $db['password']], timeout: 900);

        $process->setInput(fopen($file, 'rb'));
        $process->run(function ($type, $buffer) {
            if ($type === Process::ERR && ! str_contains($buffer, 'Using a password')) {
                $this->line('  '.trim($buffer));
            }
        });

        return $process->isSuccessful();
    }
}
