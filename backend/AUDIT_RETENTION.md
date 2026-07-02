# Audit Log Retention

PickPal keeps audit logs in PostgreSQL without automatic deletion. A yearly scheduled command creates an additional encrypted archive for disaster recovery.

## Manual archive

```bash
php artisan audit:archive 2026
```

Archives are written to:

```text
storage/app/private/audit-archives/audit-logs-YYYY.json.enc
```

The archive is encrypted with Laravel's `APP_KEY`. Keep the server `.env` and archive backups secure. Losing `APP_KEY` prevents archive decryption.

Use `--force` only when intentionally replacing an archive:

```bash
php artisan audit:archive 2026 --force
```

## Scheduling

Laravel schedules the previous calendar year's archive every January 1. The server must run Laravel's scheduler. On Windows Server, create a Task Scheduler job that runs this command every minute from the backend directory:

```bash
php artisan schedule:run
```

## Backup procedure

1. Copy encrypted audit archives to a second access-controlled drive.
2. Back up the PostgreSQL `pickpal` database at least monthly and before each election.
3. Back up `storage/app/public` for candidate and profile images.
4. Test restoration annually.
5. Retain audit records and archives for at least five academic years, or longer if required by school policy.

Department administrators must not receive filesystem, `APP_KEY`, or PostgreSQL credentials. These belong only to the designated CCS system custodian.
