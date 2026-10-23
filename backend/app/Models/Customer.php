<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    use HasFactory;

    public const SEGMENTS = [
        'mbg' => 'Dapur MBG',
        'kolam' => 'Kolam Pembesaran',
    ];

    public const STATUSES = [
        'lead' => 'Lead',
        'prospect' => 'Prospect',
        'active' => 'Pelanggan aktif',
        'attention' => 'Perlu perhatian',
        'risk' => 'Berisiko',
        'churn' => 'Churn',
    ];

    protected $fillable = [
        'code',
        'name',
        'segment',
        'status',
        'source',
        'owner_id',
        'phone',
        'email',
        'city',
        'address',
        'latitude',
        'longitude',
        'health_score',
        'lifetime_value',
        'last_order_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'health_score' => 'integer',
            'lifetime_value' => 'decimal:2',
            'last_order_at' => 'datetime',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function profile(): HasOne
    {
        return $this->hasOne(CustomerProfile::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function primaryContact(): HasOne
    {
        return $this->hasOne(Contact::class)->where('is_primary', true);
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(Interaction::class)->latest();
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class)->orderBy('due_at');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->latest('issued_at');
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class)->latest('created_at');
    }

    public function buybackCycles(): HasMany
    {
        return $this->hasMany(BuybackCycle::class)->latest('stocked_at');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->latest();
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function (Builder $builder) use ($term) {
            $builder->where('name', 'like', "%{$term}%")
                ->orWhere('code', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%")
                ->orWhere('city', 'like', "%{$term}%");
        });
    }

    public function nextFollowUp()
    {
        return $this->followUps()->where('status', 'open')->orderBy('due_at')->first();
    }

    public function getSegmentLabelAttribute(): string
    {
        return self::SEGMENTS[$this->segment] ?? $this->segment;
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }
}
