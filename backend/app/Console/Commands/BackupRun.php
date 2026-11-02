<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

/*
 * Takes a backup of everything that cannot be rebuilt from the repository:
 * the MySQL database and the private document store.
 *
 * Deliberately two separate artefacts. The database is small and dumps in
 * seconds; the documents are large and mostly unchanged between runs. Keeping
 * them apart means a restore can take back just the one that went wrong.
 *
 * What is NOT in here, on purpose: .env. It holds APP_KEY and the database
 * password, and a backup set that contains both the data and the key to it is
 * one stolen archive away from being no protection at all. Keep .env in a
 * password manager instead.
 *
 * Scheduled daily in routes/console.php. Restore with backup:restore.
 */
class BackupRun extends Command
{
    protected $signature = 'backup:run {--keep=14 : How many daily backups to retain}';

    protected $description = 'Back up the database and the private document store';

    public function handle(): int
    {
        $root = storage_path('backups');
        $stamp = now()->format('Y-m-d_His');
        File::ensureDirectoryExists($root);

        $this->info("Backing up to {$root}");

        if (! $this->dumpDatabase("{$root}/db_{$stamp}.sql")) {
            return self::FAILURE;
        }

        $this->archiveDocuments("{$root}/documents_{$stamp}.zip");
        $this->prune($root, (int) $this->option('keep'));

        $this->newLine();
        $this->info('Backup complete.');
        $this->line("Verify it with:  php artisan backup:restore --file={$root}/db_{$stamp}.sql --check");

        return self::SUCCESS;
    }

    private function dumpDatabase(string $target): bool
    {
        $db = config('database.connections.'.config('database.default'));

        /* The password goes in via the environment, not on the command line.
         * An argument is visible to every other process on the machine for as
         * long as mysqldump runs. */
        $process = new Process([
            $this->mysqldump(),
            '--host='.$db['host'],
            '--port='.$db['port'],
            '--user='.$db['username'],
            '--single-transaction',      // a consistent snapshot without locking writes out
            '--routines',
            '--events',
            '--default-character-set=utf8mb4',
            $db['database'],
        ], env: ['MYSQL_PWD' => (string) $db['password']], timeout: 600);

        $out = fopen($target, 'wb');
        $process->run(function ($type, $buffer) use ($out) {
            if ($type === Process::OUT) {
                fwrite($out, $buffer);
            } else {
                $this->line('  '.trim($buffer));
            }
        });
        fclose($out);

        if (! $process->isSuccessful() || filesize($target) === 0) {
            $this->error('Database dump failed. Is mysqldump on PATH, or MYSQLDUMP_PATH set?');
            @unlink($target);

            return false;
        }

        $this->line('  database  '.$this->size($target).'  '.basename($target));

        return true;
    }

    private function archiveDocuments(string $target): void
    {
        $source = storage_path('app/private/documents');

        if (! is_dir($source)) {
            $this->line('  documents  (none yet)');

            return;
        }

        $zip = new \ZipArchive;
        if ($zip->open($target, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            $this->error('Could not create the document archive.');

            return;
        }

        $count = 0;
        foreach (File::allFiles($source) as $file) {
            $zip->addFile($file->getRealPath(), 'documents/'.$file->getRelativePathname());
            $count++;
        }
        $zip->close();

        $this->line("  documents  {$this->size($target)}  {$count} file".($count === 1 ? '' : 's'));
    }

    /* Keep the last N of each kind. Without this a daily job fills the disk
     * and the first symptom is the application failing to write, not a
     * backup warning. */
    private function prune(string $root, int $keep): void
    {
        foreach (['db_' => '*.sql', 'documents_' => '*.zip'] as $prefix => $glob) {
            $files = glob("{$root}/{$prefix}{$glob}") ?: [];
            rsort($files); // names are timestamped, so this is newest first

            foreach (array_slice($files, $keep) as $old) {
                @unlink($old);
                $this->line('  pruned     '.basename($old));
            }
        }
    }

    private function mysqldump(): string
    {
        return env('MYSQLDUMP_PATH', 'C:\\xampp\\mysql\\bin\\mysqldump.exe');
    }

    private function size(string $path): string
    {
        $bytes = filesize($path) ?: 0;

        return $bytes >= 1048576
            ? round($bytes / 1048576, 1).' MB'
            : round($bytes / 1024).' KB';
    }
}
