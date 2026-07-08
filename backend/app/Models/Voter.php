<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['department_id', 'student_number', 'first_name', 'middle_name', 'last_name', 'year_level', 'section', 'email', 'password', 'registration_status', 'face_registered_at', 'face_signature', 'face_descriptor'])]
#[Hidden(['password', 'face_signature', 'face_descriptor'])]
class Voter extends Model
{
    protected function casts(): array
    {
        return [
            'face_registered_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
