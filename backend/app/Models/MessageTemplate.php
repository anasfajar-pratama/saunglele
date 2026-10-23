<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageTemplate extends Model
{
    public const CATEGORIES = [
        'followup' => 'Follow-up',
        'penawaran' => 'Penawaran',
        'quotation' => 'Quotation',
        'po' => 'Konfirmasi PO',
        'pengiriman' => 'Pengiriman',
        'buyback' => 'Buyback',
        'pembayaran' => 'Pembayaran',
        'retensi' => 'Ucapan & retensi',
        'winback' => 'Win-back',
    ];

    protected $fillable = [
        'name',
        'category',
        'segment',
        'body',
        'variables',
        'is_active',
        'usage_count',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
            'usage_count' => 'integer',
        ];
    }
}
