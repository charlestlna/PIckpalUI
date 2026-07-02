<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use JsonException;

class ArchiveAuditLogs extends Command
{
    protected $signature = 'audit:archive {year? : Academic calendar year to archive} {--force : Replace an existing archive}';

    protected $description = 'Create an encrypted, non-destructive yearly archive of audit logs';

    public function handle(): int
    {
        $year = (int) ($this->argument('year') ?: now()->subYear()->year);

        if ($year < 2000 || $year > now()->year) {
            $this->error('Enter a year between 2000 and the current year.');
            return self::FAILURE;
        }

        $path = "audit-archives/audit-logs-{$year}.json.enc";
        if (Storage::disk('local')->exists($path) && ! $this->option('force')) {
            $this->error("Archive already exists: {$path}. Use --force to replace it.");
            return self::FAILURE;
        }

        $logs = AuditLog::with('department')
            ->whereYear('occurred_at', $year)
            ->orderBy('occurred_at')
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'department' => $log->department?->code,
                'actor' => $log->actor,
                'action' => $log->action,
                'details' => $log->details,
                'ip_address' => $log->ip_address,
                'occurred_at' => $log->occurred_at?->toIso8601String(),
            ])
            ->values();

        if ($logs->isEmpty()) {
            $this->warn("No audit logs were found for {$year}.");
            return self::SUCCESS;
        }

        try {
            $json = json_encode([
                'archive_version' => 1,
                'year' => $year,
                'created_at' => now()->toIso8601String(),
                'record_count' => $logs->count(),
                'records' => $logs,
            ], JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->error('Could not encode the audit archive: '.$exception->getMessage());
            return self::FAILURE;
        }

        if (! Storage::disk('local')->put($path, Crypt::encryptString($json))) {
            $this->error('Could not write the audit archive.');
            return self::FAILURE;
        }

        $this->info("Archived {$logs->count()} audit logs to storage/app/private/{$path}.");
        $this->comment('The database records were retained. Copy the encrypted file to a separate secure backup location.');

        return self::SUCCESS;
    }
}
