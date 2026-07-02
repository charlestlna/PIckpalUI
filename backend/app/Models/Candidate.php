<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['position_id', 'official_student_id', 'name', 'year_level', 'section', 'platform', 'photo_url'])]
class Candidate extends Model
{
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
