<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasFactory;

    public const STAGES = [
        'new' => 'Lead Baru',
        'contacted' => 'Dihubungi',
        'sample_survey' => 'Sample / Survey',
        'quoted' => 'Penawaran',
        'negotiation' => 'Negosiasi',
        'won' => 'Menang',
        'lost' => 'Kalah',
        'nurture' => 'Nurture',
    ];

    public const LOST_REASONS = [
        'harga' => 'Harga',
        'stok' => 'Stok',
        'lokasi' => 'Lokasi / ongkir',
        'kualitas' => 'Kualitas',
        'kompetitor' => 'Kompetitor',
        'tidak_respons' => 'Tidak respons',
        'lainnya' => 'Lainnya',
    ];

    protected $fillable = [
        'name',
        'segment',
        'source',
        'stage',
        'estimated_value',
        'owner_id',
        'phone',
        'city',
        'next_follow_up_at',
        'lost_reason',
        'converted_customer_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_value' => 'decimal:2',
            'next_follow_up_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class);
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(Interaction::class)->latest();
    }

    public function convertedCustomer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'converted_customer_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('stage', ['won', 'lost']);
    }

    public function getStageLabelAttribute(): string
    {
        return self::STAGES[$this->stage] ?? $this->stage;
    }
}
