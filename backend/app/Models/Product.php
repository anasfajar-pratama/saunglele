<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    public const CATEGORIES = [
        'consumption' => 'Ikan siap masak',
        'fillet' => 'Fillet',
        'seed' => 'Bibit',
    ];

    protected $fillable = [
        'sku',
        'name',
        'category',
        'size_grade',
        'unit',
        'base_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
