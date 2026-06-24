<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficialStudent extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'student_number',
        'first_name',
        'middle_name',
        'last_name',
        'year_level',
        'section',
        'email',
        'imported_at',
    ];

    protected $casts = [
        'imported_at' => 'datetime',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
