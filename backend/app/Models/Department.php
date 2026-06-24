<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name'])]
class Department extends Model
{
    public function elections(): HasMany
    {
        return $this->hasMany(Election::class);
    }

    public function voters(): HasMany
    {
        return $this->hasMany(Voter::class);
    }
}
