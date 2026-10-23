@extends('public.layout')

@section('title', 'Purchase Order ' . $purchaseOrder->number . ' · Saung Lele')

@php
    $rp = fn ($value) => 'Rp ' . number_format((float) $value, 0, ',', '.');
    $qty = fn ($value) => rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    $deliveries = $purchaseOrder->deliveries->sortByDesc('scheduled_at')->take(3);
@endphp

@section('content')
    <div class="doc-head">
        <div>
            <span class="eyebrow">Pesanan Pembelian</span>
            <h1>PURCHASE ORDER <span>{{ $purchaseOrder->number }}</span></h1>
            <span class="status-pill">{{ $purchaseOrder->status_label }}</span>
        </div>
        <div class="doc-total-badge">
            <span>Total PO</span>
            <strong>{{ $rp($purchaseOrder->total) }}</strong>
        </div>
    </div>

    <div class="meta-grid">
        <div>
            <span class="eyebrow">Kepada</span>
            <strong>{{ $purchaseOrder->customer->name }}</strong>
            <p>
                {{ $purchaseOrder->customer->address ?? '-' }}<br>
                {{ $purchaseOrder->customer->city ?? '' }}<br>
                PIC: {{ $purchaseOrder->customer->primaryContact?->name ?? '-' }} · {{ $purchaseOrder->customer->phone ?? '-' }}
            </p>
        </div>
        <div>
            <span class="eyebrow">Detail</span>
            <p>
                Tanggal PO: {{ $purchaseOrder->created_at?->translatedFormat('d F Y') ?? '-' }}<br>
                No. PO pelanggan: {{ $purchaseOrder->customer_po_number ?? '-' }}<br>
                Referensi quotation: {{ $purchaseOrder->quotation?->number ?? '-' }}<br>
                Kirim diminta: {{ $purchaseOrder->requested_delivery_at?->translatedFormat('d F Y') ?? '-' }}<br>
                Termin: {{ $purchaseOrder->payment_terms ?? '-' }} · {{ \App\Models\PurchaseOrder::PAYMENT_STATUSES[$purchaseOrder->payment_status] ?? $purchaseOrder->payment_status }}
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
            @forelse ($purchaseOrder->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td>{{ $qty($item->qty) }} {{ $item->unit }}</td>
                    <td class="num">{{ $rp($item->unit_price) }}</td>
                    <td class="num">{{ $rp($item->subtotal) }}</td>
                </tr>
            @empty
                <tr><td colspan="4">Belum ada item PO.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="totals">
        <div><span>Subtotal</span><strong>{{ $rp($purchaseOrder->subtotal) }}</strong></div>
        <div><span>Ongkos kirim</span><strong>{{ $rp($purchaseOrder->shipping) }}</strong></div>
        <div><span>PPN</span><strong>{{ $rp($purchaseOrder->tax) }}</strong></div>
        <div class="total"><span>Total</span><strong>{{ $rp($purchaseOrder->total) }}</strong></div>
    </div>

    @if ($deliveries->isNotEmpty())
        <div class="delivery-list">
            <h3>Jadwal pengiriman</h3>
            @foreach ($deliveries as $delivery)
                <div>
                    <span>{{ $delivery->scheduled_at?->translatedFormat('d F Y, H.i') ?? 'Belum dijadwalkan' }} · {{ $delivery->driver_name ?? 'Driver Saung Lele' }}</span>
                    <strong>{{ \App\Models\Delivery::STATUSES[$delivery->status] ?? $delivery->status }}</strong>
                </div>
            @endforeach
        </div>
    @endif

    @if ($purchaseOrder->notes)
        <div class="note-box">
            <strong>Catatan</strong>
            <p>{{ $purchaseOrder->notes }}</p>
        </div>
    @endif

    <div class="signatures">
        <div>
            <span>Disiapkan oleh,</span>
            <strong>{{ $purchaseOrder->creator?->name ?? 'Saung Lele' }}</strong>
            <em>Saung Lele</em>
        </div>
        <div>
            <span>Diterima oleh,</span>
            <strong>{{ $purchaseOrder->customer->name }}</strong>
            <em>{{ $purchaseOrder->customer->primaryContact?->name ?? 'PIC Pelanggan' }}</em>
        </div>
    </div>
@endsection
