<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['department_id', 'public_id', 'title', 'description', 'status', 'starts_at', 'ends_at', 'results_published', 'archived_at'])]
class Election extends Model
{
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'results_published' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('display_order');
    }

    public function surveys(): HasMany
    {
        return $this->hasMany(Survey::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
