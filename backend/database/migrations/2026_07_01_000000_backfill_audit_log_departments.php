<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNotNull('department_id')
            ->select(['email', 'department_id'])
            ->orderBy('id')
            ->each(fn ($user) => DB::table('audit_logs')
                ->whereNull('department_id')
                ->where('actor', $user->email)
                ->update(['department_id' => $user->department_id]));

        DB::table('voters')
            ->whereNotNull('department_id')
            ->select(['student_number', 'email', 'department_id'])
            ->orderBy('id')
            ->each(function ($voter) {
                DB::table('audit_logs')
                    ->whereNull('department_id')
                    ->where(function ($query) use ($voter) {
                        $query->where('actor', $voter->student_number)
                            ->orWhere('actor', $voter->email);
                    })
                    ->update(['department_id' => $voter->department_id]);
            });
    }

    public function down(): void
    {
        // Department attribution is intentionally retained on rollback.
    }
};
