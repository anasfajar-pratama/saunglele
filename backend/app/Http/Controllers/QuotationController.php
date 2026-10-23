<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\QuotationTerm;
use App\Support\PublicDocumentLink;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Quotations/Index', $this->pageData($request));
    }

    public function edit(Quotation $quotation)
    {
        $quotation->load('items');

        if ($quotation->status === 'accepted' || $quotation->purchaseOrder()->exists()) {
            return redirect()
                ->route('quotations.show', $quotation)
                ->with('error', 'Quotation yang sudah diterima atau dipakai PO tidak dapat diedit. Buat quotation revisi baru.');
        }

        $data = $this->pageData(request());
        $data['editingQuotation'] = $this->mapQuotationForEdit($quotation);

        return Inertia::render('Quotations/Index', $data);
    }

    public function history(Request $request)
    {
        $query = Quotation::with(['customer', 'items', 'purchaseOrder'])->latest('issued_at');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search) {
                $builder->where('number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->string('status')->toString()) {
            if (array_key_exists($status, Quotation::STATUSES)) {
                $query->where('status', $status);
            }
        }

        $quotations = $query->paginate(15)->withQueryString();
        $quotations->through(fn (Quotation $quotation) => $this->mapQuotation($quotation));

        return Inertia::render('Quotations/History', [
            'quotations' => $quotations,
            'filters' => [
                'q' => $request->string('q')->toString(),
                'status' => $request->string('status')->toString(),
            ],
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
        $data = $this->validatePayload($request);
        [$subtotal, $discount, $tax, $total, $shipping] = $this->calculate($data);

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

        $this->createItems($quotation, $data['items']);

        return redirect()->route('quotations.show', $quotation)->with('success', 'Quotation berhasil dibuat.');
    }

    public function update(Request $request, Quotation $quotation)
    {
        if ($quotation->status === 'accepted' || $quotation->purchaseOrder()->exists()) {
            return back()->with('error', 'Quotation yang sudah diterima atau dipakai PO tidak dapat diedit. Buat quotation revisi baru.');
        }

        $data = $this->validatePayload($request);
        [$subtotal, $discount, $tax, $total, $shipping] = $this->calculate($data);

        $quotation->update([
            'customer_id' => $data['customer_id'],
            'status' => $quotation->status === 'draft' ? 'draft' : 'revised',
            'valid_until' => $data['valid_until'],
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'terms' => $data['terms'] ?? $quotation->terms,
            'notes' => $data['notes'] ?? null,
        ]);

        $quotation->items()->delete();
        $this->createItems($quotation, $data['items']);

        return redirect()->route('quotations.show', $quotation)->with('success', 'Quotation berhasil diperbarui.');
    }

    public function show(Quotation $quotation)
    {
        $quotation->load(['customer.primaryContact', 'items.product', 'creator', 'purchaseOrder']);

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
                'public_url' => PublicDocumentLink::quotation($quotation),
                'can_edit' => $quotation->status !== 'accepted' && ! $quotation->purchaseOrder,
                'can_create_po' => in_array($quotation->status, ['sent', 'accepted', 'revised'], true),
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

    private function pageData(Request $request): array
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

        $quotations = Quotation::with(['customer', 'items', 'purchaseOrder'])
            ->latest('issued_at')
            ->limit(12)
            ->get()
            ->map(fn (Quotation $quotation) => $this->mapQuotation($quotation));

        return [
            'customers' => $customers,
            'products' => $products,
            'quotations' => $quotations,
            'nextNumber' => $this->nextNumber(),
            'selectedCustomerId' => $request->integer('customer_id'),
            'defaultTerms' => QuotationTerm::where('is_active', true)->where('is_default', true)->value('body')
                ?? 'Berlaku 7 hari. Pembayaran 14 hari setelah invoice. Pengiriman Selasa & Jumat.',
            'stats' => [
                'total' => Quotation::count(),
                'sent' => Quotation::where('status', 'sent')->count(),
                'accepted' => Quotation::where('status', 'accepted')->count(),
                'value' => (float) Quotation::where('status', 'accepted')->sum('total'),
            ],
        ];
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'valid_until' => ['required', 'date'],
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
    }

    private function calculate(array $data): array
    {
        $subtotal = 0;
        $discount = 0;

        foreach ($data['items'] as $item) {
            $subtotal += (float) $item['qty'] * (float) $item['unit_price'];
            $discount += (float) ($item['discount'] ?? 0);
        }

        $shipping = (float) ($data['shipping'] ?? 0);
        $taxRate = (float) ($data['tax_rate'] ?? 0);
        $taxable = max(0, $subtotal - $discount + $shipping);
        $tax = round($taxable * $taxRate);
        $total = $taxable + $tax;

        return [$subtotal, $discount, $tax, $total, $shipping];
    }

    private function createItems(Quotation $quotation, array $items): void
    {
        foreach ($items as $item) {
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
            'can_edit' => $quotation->status !== 'accepted' && ! $quotation->purchaseOrder,
            'can_create_po' => in_array($quotation->status, ['sent', 'accepted', 'revised'], true),
        ];
    }

    private function mapQuotationForEdit(Quotation $quotation): array
    {
        $taxable = max(0, (float) $quotation->subtotal - (float) $quotation->discount + (float) $quotation->shipping);
        $taxRate = $taxable > 0 ? round((float) $quotation->tax / $taxable, 4) : 0;

        return [
            'id' => $quotation->id,
            'number' => $quotation->number,
            'customer_id' => $quotation->customer_id,
            'status' => $quotation->status,
            'status_label' => $quotation->status_label,
            'issued_at' => optional($quotation->issued_at)->toDateString(),
            'valid_until' => optional($quotation->valid_until)->toDateString(),
            'shipping' => (float) $quotation->shipping,
            'tax_rate' => $taxRate,
            'terms' => $quotation->terms,
            'notes' => $quotation->notes,
            'items' => $quotation->items->map(fn (QuotationItem $item) => [
                'product_id' => $item->product_id,
                'description' => $item->description,
                'qty' => (float) $item->qty,
                'unit' => $item->unit,
                'unit_price' => (float) $item->unit_price,
                'discount' => (float) $item->discount,
            ]),
        ];
    }
}
