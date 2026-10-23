<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::with(['primaryContact', 'profile'])
            ->whereIn('status', ['active', 'attention', 'risk'])
            ->orderBy('name')
            ->get()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'segment' => $customer->segment,
                'segment_label' => $customer->segment_label,
                'phone' => $customer->phone,
                'city' => $customer->city,
                'address' => $customer->address,
                'payment_terms_days' => $customer->profile?->payment_terms_days ?? 14,
                'preferred_products' => $customer->profile?->preferred_products,
                'contact' => $customer->primaryContact?->name,
            ]);

        $products = Product::where('is_active', true)
            ->orderBy('category')
            ->orderBy('base_price')
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category,
                'category_label' => Product::CATEGORIES[$product->category] ?? $product->category,
                'size_grade' => $product->size_grade,
                'unit' => $product->unit,
                'base_price' => (float) $product->base_price,
            ]);

        $quotations = Quotation::with(['customer', 'items'])
            ->latest('issued_at')
            ->limit(12)
            ->get()
            ->map(fn (Quotation $quotation) => $this->mapQuotation($quotation));

        return Inertia::render('Quotations/Index', [
            'customers' => $customers,
            'products' => $products,
            'quotations' => $quotations,
            'nextNumber' => $this->nextNumber(),
            'selectedCustomerId' => $request->integer('customer_id'),
            'stats' => [
                'total' => Quotation::count(),
                'sent' => Quotation::where('status', 'sent')->count(),
                'accepted' => Quotation::where('status', 'accepted')->count(),
                'value' => (float) Quotation::where('status', 'accepted')->sum('total'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'valid_until' => ['required', 'date', 'after_or_equal:today'],
            'shipping' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'terms' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['required', 'string', 'max:20'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $subtotal = 0;
        $discount = 0;

        foreach ($data['items'] as $item) {
            $line = (float) $item['qty'] * (float) $item['unit_price'];
            $subtotal += $line;
            $discount += (float) ($item['discount'] ?? 0);
        }

        $shipping = (float) ($data['shipping'] ?? 0);
        $taxRate = (float) ($data['tax_rate'] ?? 0);
        $taxable = max(0, $subtotal - $discount + $shipping);
        $tax = round($taxable * $taxRate);
        $total = $taxable + $tax;

        $quotation = Quotation::create([
            'number' => $this->nextNumber(),
            'customer_id' => $data['customer_id'],
            'status' => 'draft',
            'issued_at' => today(),
            'valid_until' => $data['valid_until'],
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'terms' => $data['terms'] ?? 'Berlaku 7 hari. Pembayaran 14 hari setelah invoice. Pengiriman Selasa & Jumat.',
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        foreach ($data['items'] as $item) {
            $lineSubtotal = max(0, ((float) $item['qty'] * (float) $item['unit_price']) - (float) ($item['discount'] ?? 0));

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'],
                'qty' => $item['qty'],
                'unit' => $item['unit'],
                'unit_price' => $item['unit_price'],
                'discount' => $item['discount'] ?? 0,
                'subtotal' => $lineSubtotal,
            ]);
        }

        return redirect()->route('quotations.show', $quotation)->with('success', 'Quotation berhasil dibuat.');
    }

    public function show(Quotation $quotation)
    {
        $quotation->load(['customer.primaryContact', 'items.product', 'creator']);

        return Inertia::render('Quotations/Show', [
            'quotation' => [
                'id' => $quotation->id,
                'number' => $quotation->number,
                'status' => $quotation->status,
                'status_label' => $quotation->status_label,
                'issued_at' => optional($quotation->issued_at)->toDateString(),
                'issued_label' => optional($quotation->issued_at)->translatedFormat('d F Y'),
                'valid_until' => optional($quotation->valid_until)->toDateString(),
                'valid_label' => optional($quotation->valid_until)->translatedFormat('d F Y'),
                'subtotal' => (float) $quotation->subtotal,
                'discount' => (float) $quotation->discount,
                'tax' => (float) $quotation->tax,
                'shipping' => (float) $quotation->shipping,
                'total' => (float) $quotation->total,
                'terms' => $quotation->terms,
                'notes' => $quotation->notes,
                'sales' => $quotation->creator?->name,
                'customer' => [
                    'id' => $quotation->customer->id,
                    'name' => $quotation->customer->name,
                    'address' => $quotation->customer->address,
                    'city' => $quotation->customer->city,
                    'phone' => $quotation->customer->phone,
                    'contact' => $quotation->customer->primaryContact?->name,
                ],
                'items' => $quotation->items->map(fn (QuotationItem $item) => [
                    'id' => $item->id,
                    'description' => $item->description,
                    'qty' => (float) $item->qty,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'discount' => (float) $item->discount,
                    'subtotal' => (float) $item->subtotal,
                    'product' => $item->product?->name,
                ]),
            ],
        ]);
    }

    public function updateStatus(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,sent,accepted,rejected,expired,revised'],
        ]);

        $quotation->update([
            'status' => $data['status'],
            'sent_at' => in_array($data['status'], ['sent', 'accepted'], true) ? ($quotation->sent_at ?? now()) : $quotation->sent_at,
            'accepted_at' => $data['status'] === 'accepted' ? now() : $quotation->accepted_at,
        ]);

        return back()->with('success', 'Status quotation diperbarui.');
    }

    private function nextNumber(): string
    {
        $prefix = 'QUO/'.now()->format('ym').'/';
        $last = Quotation::where('number', 'like', $prefix.'%')->orderByDesc('number')->value('number');
        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    private function mapQuotation(Quotation $quotation): array
    {
        return [
            'id' => $quotation->id,
            'number' => $quotation->number,
            'customer' => [
                'id' => $quotation->customer->id,
                'name' => $quotation->customer->name,
                'segment' => $quotation->customer->segment,
                'segment_label' => $quotation->customer->segment_label,
            ],
            'issued_at' => optional($quotation->issued_at)->toDateString(),
            'issued_label' => optional($quotation->issued_at)->translatedFormat('d M Y'),
            'valid_until' => optional($quotation->valid_until)->toDateString(),
            'valid_label' => optional($quotation->valid_until)->translatedFormat('d M Y'),
            'status' => $quotation->status,
            'status_label' => $quotation->status_label,
            'total' => (float) $quotation->total,
            'items_count' => $quotation->items->count(),
            'items_summary' => $quotation->items->map(fn ($item) => $item->description)->implode(', '),
        ];
    }
}
