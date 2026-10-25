@extends('public.layout')

@section('title', 'Invoice ' . $invoice->number . ' · Saung Lele')

@php
    $rp = fn ($value) => 'Rp ' . number_format((float) $value, 0, ',', '.');
    $qty = fn ($value) => rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    $isPaid = $invoice->status === 'paid';
    $downPayment = (float) $invoice->down_payment;
    $paidAmount = (float) $invoice->paid_amount;
    $otherPaid = max(0, $paidAmount - $downPayment);
    $remaining = max(0, (float) $invoice->total - $paidAmount);
    $isSettled = $remaining <= 0;
    $isOverdue = ! $isPaid && $invoice->status !== 'cancelled' && ! $isSettled && $invoice->due_at && $invoice->due_at->lt(today());
@endphp

@section('content')
    <div class="doc-head">
        <div>
            <span class="eyebrow">Tagihan Pembayaran</span>
            <h1>INVOICE <span>{{ $invoice->number }}</span></h1>
            <span class="status-pill">{{ $isOverdue ? 'Terlambat' : $invoice->status_label }}</span>
        </div>
        <div class="doc-total-badge">
            <span>Total tagihan</span>
            <strong>{{ $rp($invoice->total) }}</strong>
        </div>
    </div>

    <div class="meta-grid">
        <div>
            <span class="eyebrow">Ditagihkan kepada</span>
            <strong>{{ $invoice->customer->name }}</strong>
            <p>
                {{ $invoice->customer->address ?? '-' }}<br>
                {{ $invoice->customer->city ?? '' }}<br>
                PIC: {{ $invoice->customer->primaryContact?->name ?? '-' }} · {{ $invoice->customer->phone ?? '-' }}
            </p>
        </div>
        <div>
            <span class="eyebrow">Detail</span>
            <p>
                Tanggal invoice: {{ $invoice->issued_at?->translatedFormat('d F Y') ?? '-' }}<br>
                Jatuh tempo: {{ $invoice->due_at?->translatedFormat('d F Y') ?? '-' }}<br>
                Referensi PO: {{ $invoice->purchaseOrder?->number ?? '-' }}<br>
                Referensi quotation: {{ $invoice->quotation?->number ?? '-' }}<br>
                Sales: {{ $invoice->creator?->name ?? 'Saung Lele' }}
            </p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Produk</th>
                <th>Qty</th>
                <th class="num">Harga</th>
                <th class="num">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td>{{ $qty($item->qty) }} {{ $item->unit }}</td>
                    <td class="num">{{ $rp($item->unit_price) }}</td>
                    <td class="num">{{ $rp($item->subtotal) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Belum ada item invoice.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="totals">
        <div><span>Subtotal</span><strong>{{ $rp($invoice->subtotal) }}</strong></div>
        @if ((float) $invoice->discount > 0)
            <div><span>Diskon</span><strong>- {{ $rp($invoice->discount) }}</strong></div>
        @endif
        <div><span>Ongkos kirim</span><strong>{{ $rp($invoice->shipping) }}</strong></div>
        @if ((float) $invoice->tax > 0)
            <div><span>PPN</span><strong>{{ $rp($invoice->tax) }}</strong></div>
        @endif
        <div class="total"><span>Total</span><strong>{{ $rp($invoice->total) }}</strong></div>
        @if ($downPayment > 0)
            <div><span>DP / uang muka</span><strong>- {{ $rp($downPayment) }}</strong></div>
        @endif
        @if ($otherPaid > 0)
            <div><span>Pembayaran</span><strong>- {{ $rp($otherPaid) }}</strong></div>
        @endif
        @if (! $isSettled)
            <div><span>Sisa tagihan</span><strong>{{ $rp($remaining) }}</strong></div>
        @endif
    </div>

    @if ($invoice->payments->isNotEmpty())
        <div class="delivery-list">
            <h3>Riwayat pembayaran</h3>
            @foreach ($invoice->payments as $payment)
                <div>
                    <span>{{ $payment->paid_at?->translatedFormat('d F Y') }} · {{ $payment->type_label }} · {{ $payment->method_label }}</span>
                    <strong>{{ $rp($payment->amount) }}</strong>
                </div>
            @endforeach
        </div>
    @endif

    @if ($isPaid)
        <div class="note-box">
            <strong>Status pembayaran</strong>
            <p>Invoice ini sudah lunas{{ $invoice->paid_at ? ' pada '.$invoice->paid_at->translatedFormat('d F Y') : '' }}. Terima kasih atas pembayaran Bapak/Ibu.</p>
        </div>
    @elseif ($isSettled)
        <div class="note-box">
            <strong>Status pembayaran</strong>
            <p>Tidak ada sisa tagihan. Seluruh pembayaran sudah tercatat.</p>
        </div>
    @elseif ($isOverdue)
        <div class="note-box">
            <strong>Status pembayaran</strong>
            <p>Invoice ini melewati tanggal jatuh tempo. Mohon selesaikan pembayaran atau hubungi tim Saung Lele bila ada kendala.</p>
        </div>
    @endif

    @if ($invoice->notes)
        <div class="note-box">
            <strong>Catatan</strong>
            <p>{{ $invoice->notes }}</p>
        </div>
    @endif

    @if ($invoice->terms)
        <div class="note-box">
            <strong>Syarat &amp; ketentuan</strong>
            <p>{!! nl2br(e($invoice->terms)) !!}</p>
        </div>
    @endif

    <div class="signatures">
        <div>
            <span>Hormat kami,</span>
            <strong>{{ $invoice->creator?->name ?? 'Saung Lele' }}</strong>
            <em>Saung Lele</em>
        </div>
        <div>
            <span>Diterima oleh,</span>
            <strong>{{ $invoice->customer->name }}</strong>
            <em>{{ $invoice->customer->primaryContact?->name ?? 'PIC Pelanggan' }}</em>
        </div>
    </div>
@endsection
