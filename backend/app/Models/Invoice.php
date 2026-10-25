<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    public const STATUSES = [
        'draft' => 'Draft',
        'sent' => 'Terkirim',
        'paid' => 'Lunas',
        'overdue' => 'Terlambat',
        'cancelled' => 'Dibatalkan',
    ];

    public const PAYMENT_STATUSES = [
        'unpaid' => 'Belum dibayar',
        'partial' => 'Dibayar sebagian',
        'paid' => 'Lunas',
    ];

    protected $fillable = [
        'number',
        'customer_id',
        'purchase_order_id',
        'quotation_id',
        'status',
        'issued_at',
        'due_at',
        'subtotal',
        'discount',
        'tax',
        'shipping',
        'total',
        'down_payment',
        'paid_amount',
        'terms',
        'notes',
        'created_by',
        'sent_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'due_at' => 'date',
            'sent_at' => 'datetime',
            'paid_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'shipping' => 'decimal:2',
            'total' => 'decimal:2',
            'down_payment' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class)->orderBy('paid_at')->orderBy('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getPaymentStatusAttribute(): string
    {
        $paid = (float) $this->paid_amount;
        $total = (float) $this->total;

        if ($paid <= 0) {
            return 'unpaid';
        }

        return $total > 0 && $paid >= $total ? 'paid' : 'partial';
    }

    public function getPaymentStatusLabelAttribute(): string
    {
        return self::PAYMENT_STATUSES[$this->payment_status] ?? $this->payment_status;
    }

    public function syncPaymentTotals(): void
    {
        $payments = $this->payments()->get();
        $paid = (float) $payments->sum('amount');
        $downPayment = (float) $payments->where('type', 'down_payment')->sum('amount');
        $total = (float) $this->total;

        $this->paid_amount = $paid;
        $this->down_payment = $downPayment;

        if ($this->status !== 'cancelled') {
            if ($total > 0 && $paid >= $total) {
                $this->status = 'paid';
                $this->paid_at = $payments->max('paid_at') ?? now();
            } elseif ($this->status === 'paid') {
                $this->status = 'sent';
                $this->paid_at = null;
            }
        }

        $this->save();
    }
}
