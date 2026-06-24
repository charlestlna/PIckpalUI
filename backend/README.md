# PickPal Backend

Laravel JSON API for the PickPal student election system.

## Local Setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The local API is available at:

```text
http://localhost:8000/api
```

For Laravel Herd, link the backend as `pickpal` and use:

```text
http://pickpal.test/api
```

## Supabase Setup

Copy `.env.supabase.example` to `.env`, fill in the Supabase pooled PostgreSQL values, then run:

```bash
php artisan config:clear
php artisan migrate --seed
```

Use `migrate:fresh --seed` only when you intentionally want to wipe and recreate all remote tables.

## Useful Checks

```bash
php artisan route:list
php artisan test
php artisan pint
```

## Initial Admin Account

```text
Admin: admin@pickpal.test / password
```

The backend seeder does not create sample voters, official student records, elections, candidates, votes, results, or surveys. Add actual records through the PickPal admin screens.
