<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['election_id', 'voter_id', 'receipt_id', 'face_verified', 'submitted_at'])]
class Vote extends Model
{
    protected function casts(): array
    {
        return [
            'face_verified' => 'boolean',
            'submitted_at' => 'datetime',
        ];
    }

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(Voter::class);
    }

    public function selections(): HasMany
    {
        return $this->hasMany(VoteSelection::class);
    }
}
