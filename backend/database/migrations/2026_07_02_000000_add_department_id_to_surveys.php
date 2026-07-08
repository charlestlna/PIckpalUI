<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surveys', function (Blueprint $table) {
            $table->foreignId('department_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        DB::table('surveys')
            ->whereNotNull('election_id')
            ->update([
                'department_id' => DB::raw('(SELECT department_id FROM elections WHERE elections.id = surveys.election_id)'),
            ]);

        $defaultDepartmentId = DB::table('users')->whereNotNull('department_id')->orderBy('id')->value('department_id');
        if ($defaultDepartmentId) {
            DB::table('surveys')->whereNull('department_id')->update(['department_id' => $defaultDepartmentId]);
        }
    }

    public function down(): void
    {
        Schema::table('surveys', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
        });
    }
};
