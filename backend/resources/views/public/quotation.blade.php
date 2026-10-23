@extends('public.layout')

@section('title', 'Quotation ' . $quotation->number . ' · Saung Lele')

@php
    $rp = fn ($value) => 'Rp ' . number_format((float) $value, 0, ',', '.');
    $qty = fn ($value) => rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
@endphp

@section('content')
    <div class="doc-head">
        <div>
            <span class="eyebrow">Penawaran Harga</span>
            <h1>QUOTATION <span>{{ $quotation->number }}</span></h1>
            <span class="status-pill">{{ $quotation->status_label }}</span>
        </div>
        <div class="doc-total-badge">
            <span>Total penawaran</span>
            <strong>{{ $rp($quotation->total) }}</strong>
        </div>
    </div>

    <div class="meta-grid">
        <div>
            <span class="eyebrow">Kepada</span>
            <strong>{{ $quotation->customer->name }}</strong>
            <p>
                {{ $quotation->customer->address ?? '-' }}<br>
                {{ $quotation->customer->city ?? '' }}<br>
                PIC: {{ $quotation->customer->primaryContact?->name ?? '-' }} · {{ $quotation->customer->phone ?? '-' }}
            </p>
        </div>
        <div>
            <span class="eyebrow">Detail</span>
            <p>
                Tanggal: {{ $quotation->issued_at?->translatedFormat('d F Y') ?? '-' }}<br>
                Berlaku sampai: {{ $quotation->valid_until?->translatedFormat('d F Y') ?? '-' }}<br>
                Sales: {{ $quotation->creator?->name ?? 'Saung Lele' }}
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
            @forelse ($quotation->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td>{{ $qty($item->qty) }} {{ $item->unit }}</td>
                    <td class="num">{{ $rp($item->unit_price) }}</td>
                    <td class="num">{{ $rp($item->subtotal) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Belum ada item quotation.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="totals">
        <div><span>Subtotal</span><strong>{{ $rp($quotation->subtotal) }}</strong></div>
        @if ((float) $quotation->discount > 0)
            <div><span>Diskon</span><strong>- {{ $rp($quotation->discount) }}</strong></div>
        @endif
        <div><span>Ongkos kirim</span><strong>{{ $rp($quotation->shipping) }}</strong></div>
        <div><span>PPN</span><strong>{{ $rp($quotation->tax) }}</strong></div>
        <div class="total"><span>Total</span><strong>{{ $rp($quotation->total) }}</strong></div>
    </div>

    @if ($quotation->notes)
        <div class="note-box">
            <strong>Catatan</strong>
            <p>{{ $quotation->notes }}</p>
        </div>
    @endif

    @if ($quotation->terms)
        <div class="note-box">
            <strong>Syarat &amp; ketentuan</strong>
            <p>{!! nl2br(e($quotation->terms)) !!}</p>
        </div>
    @endif

    <div class="signatures">
        <div>
            <span>Hormat kami,</span>
            <strong>{{ $quotation->creator?->name ?? 'Saung Lele' }}</strong>
            <em>Sales Saung Lele</em>
        </div>
        <div>
            <span>Disetujui oleh,</span>
            <strong>{{ $quotation->customer->name }}</strong>
            <em>{{ $quotation->customer->primaryContact?->name ?? 'PIC Pelanggan' }}</em>
        </div>
    </div>
@endsection
