<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['code' => 'SSC', 'name' => 'Supreme Student Council'],
            ['code' => 'CLA', 'name' => 'College of Liberal Arts'],
            ['code' => 'CED', 'name' => 'College of Education'],
            ['code' => 'CHM', 'name' => 'College of Hospitality Management'],
            ['code' => 'CCS', 'name' => 'College of Computer Studies'],
            ['code' => 'CBA', 'name' => 'College of Business and Accountancy'],
            ['code' => 'CCJE', 'name' => 'College of Criminal Justice Education'],
        ] as $department) {
            Department::firstOrCreate(
                ['code' => $department['code']],
                ['name' => $department['name']],
            );
        }

        $adminEmail = env('PICKPAL_ADMIN_EMAIL', 'admin@pickpal.test');
        $adminPassword = env('PICKPAL_ADMIN_PASSWORD', 'password');

        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => env('PICKPAL_ADMIN_NAME', 'PickPal Admin'),
                'password' => Hash::make($adminPassword),
            ],
        );

        AuditLog::create([
            'department_id' => Department::where('code', 'CCS')->value('id'),
            'actor' => 'system',
            'action' => 'database.seeded',
            'details' => 'Initial PickPal departments and admin account created.',
            'ip_address' => '127.0.0.1',
            'occurred_at' => now(),
        ]);
    }
}
