<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePayment;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\QuotationTerm;
use App\Support\PublicDocumentLink;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'items', 'purchaseOrder'])->latest('issued_at');

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search) {
                $builder->where('number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->string('status')->toString()) {
            if ($status === 'overdue') {
                $query->whereIn('status', ['sent', 'overdue'])
                    ->whereDate('due_at', '<', today())
                    ->whereRaw('(total - paid_amount) > 0');
            } elseif (array_key_exists($status, Invoice::STATUSES)) {
                $query->where('status', $status);
            }
        }

        $invoices = $query->paginate(15)->withQueryString();
        $invoices->through(fn (Invoice $invoice) => $this->mapInvoice($invoice));

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => [
                'q' => $request->string('q')->toString(),
                'status' => $request->string('status')->toString(),
            ],
            'stats' => [
                'total' => Invoice::count(),
                'unpaid' => Invoice::whereIn('status', ['draft', 'sent', 'overdue'])->count(),
                'overdue' => Invoice::whereIn('status', ['sent', 'overdue'])
                    ->whereDate('due_at', '<', today())
                    ->whereRaw('(total - paid_amount) > 0')
                    ->count(),
                'outstanding' => max(0, (float) Invoice::whereIn('status', ['draft', 'sent', 'overdue'])->sum('total')
                    - (float) Invoice::whereIn('status', ['draft', 'sent', 'overdue'])->sum('paid_amount')),
                'paid_value' => (float) Invoice::sum('paid_amount'),
            ],
        ]);
    }

    public function create(Request $request)
    {
        $sourcePurchaseOrder = null;

        if ($request->filled('purchase_order_id')) {
            $sourcePurchaseOrder = PurchaseOrder::with(['customer.profile', 'quotation', 'items.product'])
                ->find($request->integer('purchase_order_id'));
        }

        return Inertia::render('Invoices/Create', [
            ...$this->formData(),
            'selectedCustomerId' => $sourcePurchaseOrder?->customer_id ?? $request->integer('customer_id'),
            'selectedPurchaseOrderId' => $sourcePurchaseOrder?->id ?? $request->integer('purchase_order_id'),
            'sourcePurchaseOrder' => $sourcePurchaseOrder ? $this->mapPurchaseOrderSource($sourcePurchaseOrder) : null,
            'editingInvoice' => null,
        ]);
    }

    public function edit(Invoice $invoice)
    {
        if (in_array($invoice->status, ['paid', 'cancelled'], true)) {
            return redirect()
                ->route('invoices.show', $invoice)
                ->with('error', 'Invoice yang sudah lunas atau dibatalkan tidak dapat diedit.');
        }

        $invoice->load('items');

        return Inertia::render('Invoices/Create', [
            ...$this->formData(),
            'selectedCustomerId' => $invoice->customer_id,
            'selectedPurchaseOrderId' => $invoice->purchase_order_id,
            'sourcePurchaseOrder' => null,
            'editingInvoice' => $this->mapInvoiceForEdit($invoice),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);
        [$subtotal, $discount, $tax, $shipping, $total] = $this->calculate($data);

        if ((float) ($data['down_payment'] ?? 0) > $total) {
            throw ValidationException::withMessages([
                'down_payment' => 'DP tidak boleh melebihi total invoice.',
            ]);
        }

        $quotationId = null;

        if (! empty($data['purchase_order_id'])) {
            $purchaseOrder = PurchaseOrder::find($data['purchase_order_id']);

            if ($purchaseOrder && (int) $purchaseOrder->customer_id !== (int) $data['customer_id']) {
                throw ValidationException::withMessages([
                    'purchase_order_id' => 'PO tidak sesuai dengan pelanggan yang dipilih.',
                ]);
            }

            $quotationId = $purchaseOrder?->quotation_id;
        }

        $invoice = Invoice::create([
            'number' => $this->nextNumber(),
            'customer_id' => $data['customer_id'],
            'purchase_order_id' => $data['purchase_order_id'] ?? null,
            'quotation_id' => $quotationId,
            'status' => 'draft',
            'issued_at' => today(),
            'due_at' => $data['due_at'],
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'down_payment' => 0,
            'paid_amount' => 0,
            'terms' => $data['terms'] ?? 'Pembayaran paling lambat pada tanggal jatuh tempo. Mohon cantumkan nomor invoice pada berita transfer.',
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $this->createItems($invoice, $data['items']);

        $downPayment = (float) ($data['down_payment'] ?? 0);

        if ($downPayment > 0) {
            $invoice->payments()->create([
                'type' => 'down_payment',
                'paid_at' => today(),
                'amount' => $downPayment,
                'method' => 'transfer',
                'notes' => 'DP awal invoice.',
                'created_by' => $request->user()->id,
            ]);
        }

        $invoice->syncPaymentTotals();

        return redirect()->route('invoices.show', $invoice)->with('success', 'Invoice berhasil dibuat.');
    }

    public function update(Request $request, Invoice $invoice)
    {
        if (in_array($invoice->status, ['paid', 'cancelled'], true)) {
            return back()->with('error', 'Invoice yang sudah lunas atau dibatalkan tidak dapat diedit.');
        }

        $data = $this->validatePayload($request);
        [$subtotal, $discount, $tax, $shipping, $total] = $this->calculate($data);

        if ((float) ($data['down_payment'] ?? 0) > $total) {
            throw ValidationException::withMessages([
                'down_payment' => 'DP tidak boleh melebihi total invoice.',
            ]);
        }

        if ($total < (float) $invoice->paid_amount) {
            throw ValidationException::withMessages([
                'items' => 'Total invoice tidak boleh lebih kecil dari pembayaran yang sudah tercatat.',
            ]);
        }

        $quotationId = null;

        if (! empty($data['purchase_order_id'])) {
            $purchaseOrder = PurchaseOrder::find($data['purchase_order_id']);

            if ($purchaseOrder && (int) $purchaseOrder->customer_id !== (int) $data['customer_id']) {
                throw ValidationException::withMessages([
                    'purchase_order_id' => 'PO tidak sesuai dengan pelanggan yang dipilih.',
                ]);
            }

            $quotationId = $purchaseOrder?->quotation_id;
        }

        $invoice->update([
            'customer_id' => $data['customer_id'],
            'purchase_order_id' => $data['purchase_order_id'] ?? null,
            'quotation_id' => $quotationId,
            'due_at' => $data['due_at'],
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'terms' => $data['terms'] ?? $invoice->terms,
            'notes' => $data['notes'] ?? null,
        ]);

        $invoice->items()->delete();
        $this->createItems($invoice, $data['items']);
        $this->syncDownPayment($invoice, (float) ($data['down_payment'] ?? 0), $request->user()->id);
        $invoice->syncPaymentTotals();

        return redirect()->route('invoices.show', $invoice)->with('success', 'Invoice berhasil diperbarui.');
    }

    public function show(Invoice $invoice)
    {
        $invoice->load([
            'customer.primaryContact',
            'items.product',
            'purchaseOrder',
            'quotation',
            'creator',
            'payments.creator',
        ]);

        $totalPaid = (float) $invoice->paid_amount;
        $remaining = max(0, (float) $invoice->total - $totalPaid);
        $progress = (float) $invoice->total > 0
            ? min(100, (int) round(($totalPaid / (float) $invoice->total) * 100))
            : 0;

        return Inertia::render('Invoices/Show', [
            'invoice' => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'status' => $invoice->status,
                'status_label' => $invoice->status_label,
                'issued_at' => optional($invoice->issued_at)->toDateString(),
                'issued_label' => optional($invoice->issued_at)->translatedFormat('d F Y'),
                'due_at' => optional($invoice->due_at)->toDateString(),
                'due_label' => optional($invoice->due_at)->translatedFormat('d F Y'),
                'subtotal' => (float) $invoice->subtotal,
                'discount' => (float) $invoice->discount,
                'tax' => (float) $invoice->tax,
                'shipping' => (float) $invoice->shipping,
                'total' => (float) $invoice->total,
                'down_payment' => (float) $invoice->down_payment,
                'paid_amount' => $totalPaid,
                'remaining' => $remaining,
                'payment_status' => $invoice->payment_status,
                'payment_status_label' => $invoice->payment_status_label,
                'progress' => $progress,
                'terms' => $invoice->terms,
                'notes' => $invoice->notes,
                'sales' => $invoice->creator?->name,
                'public_url' => PublicDocumentLink::invoice($invoice),
                'can_edit' => ! in_array($invoice->status, ['paid', 'cancelled'], true),
                'is_overdue' => ! in_array($invoice->status, ['paid', 'cancelled'], true)
                    && $invoice->due_at
                    && $invoice->due_at->lt(today())
                    && $remaining > 0,
                'customer' => [
                    'id' => $invoice->customer->id,
                    'name' => $invoice->customer->name,
                    'address' => $invoice->customer->address,
                    'city' => $invoice->customer->city,
                    'phone' => $invoice->customer->phone,
                    'contact' => $invoice->customer->primaryContact?->name,
                ],
                'purchase_order' => $invoice->purchaseOrder ? [
                    'id' => $invoice->purchaseOrder->id,
                    'number' => $invoice->purchaseOrder->number,
                ] : null,
                'quotation' => $invoice->quotation ? [
                    'id' => $invoice->quotation->id,
                    'number' => $invoice->quotation->number,
                ] : null,
                'items' => $invoice->items->map(fn (InvoiceItem $item) => [
                    'id' => $item->id,
                    'description' => $item->description,
                    'qty' => (float) $item->qty,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'discount' => (float) $item->discount,
                    'subtotal' => (float) $item->subtotal,
                    'product' => $item->product?->name,
                ]),
                'payments' => $invoice->payments->map(fn (InvoicePayment $payment) => [
                    'id' => $payment->id,
                    'type' => $payment->type,
                    'type_label' => $payment->type_label,
                    'paid_at' => optional($payment->paid_at)->toDateString(),
                    'paid_label' => optional($payment->paid_at)->translatedFormat('d M Y'),
                    'amount' => (float) $payment->amount,
                    'method' => $payment->method,
                    'method_label' => $payment->method_label,
                    'reference' => $payment->reference,
                    'notes' => $payment->notes,
                    'created_by' => $payment->creator?->name,
                    'created_label' => optional($payment->created_at)->translatedFormat('d M Y, H.i'),
                ]),
            ],
            'paymentMethods' => collect(InvoicePayment::METHODS)
                ->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
                ->values(),
        ]);
    }

    public function updateStatus(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'status' => ['required', 'in:draft,sent,paid,overdue,cancelled'],
        ]);

        if ($invoice->status === 'cancelled' && $data['status'] !== 'cancelled') {
            return back()->with('error', 'Invoice yang sudah dibatalkan tidak dapat diubah statusnya.');
        }

        if ($data['status'] === 'paid') {
            $remaining = max(0, (float) $invoice->total - (float) $invoice->paid_amount);

            if ($remaining > 0) {
                $invoice->payments()->create([
                    'type' => 'settlement',
                    'paid_at' => today(),
                    'amount' => $remaining,
                    'method' => 'transfer',
                    'notes' => 'Pelunasan via tombol Tandai lunas.',
                    'created_by' => $request->user()->id,
                ]);
            }

            $invoice->syncPaymentTotals();

            return back()->with('success', 'Invoice ditandai lunas.');
        }

        if ((float) $invoice->total > 0 && (float) $invoice->paid_amount >= (float) $invoice->total) {
            return back()->with('error', 'Invoice sudah dibayar penuh. Hapus pembayaran terlebih dahulu jika ingin mengubah status.');
        }

        if ($data['status'] === 'cancelled' && (float) $invoice->paid_amount > 0) {
            return back()->with('error', 'Invoice yang sudah memiliki pembayaran tidak dapat dibatalkan. Hapus pembayaran terlebih dahulu.');
        }

        $invoice->update([
            'status' => $data['status'],
            'sent_at' => in_array($data['status'], ['sent', 'overdue'], true)
                ? ($invoice->sent_at ?? now())
                : $invoice->sent_at,
            'paid_at' => null,
        ]);

        return back()->with('success', 'Status invoice diperbarui menjadi '.($invoice->fresh()->status_label ?? $data['status']).'.');
    }

    public function storePayment(Request $request, Invoice $invoice)
    {
        if ($invoice->status === 'cancelled') {
            return back()->with('error', 'Invoice dibatalkan tidak dapat menerima pembayaran.');
        }

        $remaining = max(0, (float) $invoice->total - (float) $invoice->paid_amount);

        $data = $request->validate([
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.$remaining],
            'method' => ['required', 'in:'.implode(',', array_keys(InvoicePayment::METHODS))],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = (float) $data['amount'];

        $invoice->payments()->create([
            'type' => $amount >= $remaining ? 'settlement' : 'installment',
            'paid_at' => $data['paid_at'],
            'amount' => $amount,
            'method' => $data['method'],
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $invoice->syncPaymentTotals();

        return back()->with('success', 'Pembayaran berhasil dicatat.');
    }

    public function updatePayment(Request $request, Invoice $invoice, InvoicePayment $payment)
    {
        abort_unless((int) $payment->invoice_id === (int) $invoice->id, 404);

        if ($invoice->status === 'cancelled') {
            return back()->with('error', 'Invoice dibatalkan tidak dapat diubah pembayarannya.');
        }

        $maxAmount = max(0, (float) $invoice->total - (float) $invoice->paid_amount + (float) $payment->amount);

        $data = $request->validate([
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.$maxAmount],
            'method' => ['required', 'in:'.implode(',', array_keys(InvoicePayment::METHODS))],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $amount = (float) $data['amount'];
        $remainingBefore = max(0, (float) $invoice->total - ((float) $invoice->paid_amount - (float) $payment->amount));
        $type = $payment->type === 'down_payment'
            ? 'down_payment'
            : ($amount >= $remainingBefore ? 'settlement' : 'installment');

        $payment->update([
            'type' => $type,
            'paid_at' => $data['paid_at'],
            'amount' => $amount,
            'method' => $data['method'],
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $invoice->syncPaymentTotals();

        return back()->with('success', 'Pembayaran berhasil diperbarui.');
    }

    public function destroyPayment(Invoice $invoice, InvoicePayment $payment)
    {
        abort_unless((int) $payment->invoice_id === (int) $invoice->id, 404);

        if ($invoice->status === 'cancelled') {
            return back()->with('error', 'Invoice dibatalkan tidak dapat diubah pembayarannya.');
        }

        $payment->delete();
        $invoice->syncPaymentTotals();

        return back()->with('success', 'Pembayaran dihapus.');
    }

    private function syncDownPayment(Invoice $invoice, float $amount, ?int $userId): void
    {
        $payment = $invoice->payments()->where('type', 'down_payment')->first();

        if ($amount > 0) {
            if ($payment) {
                $payment->update(['amount' => $amount]);

                return;
            }

            $invoice->payments()->create([
                'type' => 'down_payment',
                'paid_at' => $invoice->issued_at ?? today(),
                'amount' => $amount,
                'method' => 'transfer',
                'notes' => 'DP awal invoice.',
                'created_by' => $userId,
            ]);

            return;
        }

        $payment?->delete();
    }

    private function formData(): array
    {
        return [
            'customers' => Customer::with(['primaryContact', 'profile'])
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
                    'contact' => $customer->primaryContact?->name,
                ]),
            'products' => Product::where('is_active', true)
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
                ]),
            'purchaseOrders' => PurchaseOrder::with(['customer', 'items'])
                ->latest()
                ->limit(30)
                ->get()
                ->map(fn (PurchaseOrder $purchaseOrder) => $this->mapPurchaseOrderSource($purchaseOrder)),
            'nextNumber' => $this->nextNumber(),
            'defaultTerms' => QuotationTerm::where('is_active', true)->where('is_default', true)->value('body')
                ?? 'Pembayaran paling lambat pada tanggal jatuh tempo. Mohon cantumkan nomor invoice pada berita transfer.',
        ];
    }

    private function mapPurchaseOrderSource(PurchaseOrder $purchaseOrder): array
    {
        $taxable = max(0, (float) $purchaseOrder->subtotal + (float) $purchaseOrder->shipping);
        $taxRate = $taxable > 0 ? round((float) $purchaseOrder->tax / $taxable, 4) : 0;
        $dueDays = (int) filter_var((string) $purchaseOrder->payment_terms, FILTER_SANITIZE_NUMBER_INT);

        return [
            'id' => $purchaseOrder->id,
            'number' => $purchaseOrder->number,
            'customer_id' => $purchaseOrder->customer_id,
            'customer' => $purchaseOrder->customer?->name,
            'total' => (float) $purchaseOrder->total,
            'shipping' => (float) $purchaseOrder->shipping,
            'tax_rate' => $taxRate,
            'due_days' => $dueDays > 0 ? $dueDays : 14,
            'notes' => 'Berdasarkan PO '.$purchaseOrder->number.'.',
            'items' => $purchaseOrder->items->map(fn (PurchaseOrderItem $item) => [
                'product_id' => $item->product_id,
                'description' => $item->description,
                'qty' => (float) $item->qty,
                'unit' => $item->unit,
                'unit_price' => (float) $item->unit_price,
                'discount' => 0,
            ])->values(),
        ];
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'due_at' => ['required', 'date'],
            'shipping' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'down_payment' => ['nullable', 'numeric', 'min:0'],
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

        return [$subtotal, $discount, $tax, $shipping, $total];
    }

    private function createItems(Invoice $invoice, array $items): void
    {
        foreach ($items as $item) {
            $lineSubtotal = max(0, ((float) $item['qty'] * (float) $item['unit_price']) - (float) ($item['discount'] ?? 0));

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
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
        $prefix = 'INV-'.now()->format('ym').'-';
        $last = Invoice::where('number', 'like', $prefix.'%')->orderByDesc('number')->value('number');
        $sequence = $last ? ((int) substr($last, -3)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    private function mapInvoice(Invoice $invoice): array
    {
        $isOverdue = ! in_array($invoice->status, ['paid', 'cancelled'], true)
            && $invoice->due_at
            && $invoice->due_at->lt(today())
            && ((float) $invoice->total - (float) $invoice->paid_amount) > 0;

        return [
            'id' => $invoice->id,
            'number' => $invoice->number,
            'customer' => [
                'id' => $invoice->customer->id,
                'name' => $invoice->customer->name,
                'segment' => $invoice->customer->segment,
                'segment_label' => $invoice->customer->segment_label,
            ],
            'purchase_order' => $invoice->purchaseOrder?->number,
            'issued_at' => optional($invoice->issued_at)->toDateString(),
            'issued_label' => optional($invoice->issued_at)->translatedFormat('d M Y'),
            'due_at' => optional($invoice->due_at)->toDateString(),
            'due_label' => optional($invoice->due_at)->translatedFormat('d M Y'),
            'status' => $invoice->status,
            'status_label' => $invoice->status_label,
            'total' => (float) $invoice->total,
            'down_payment' => (float) $invoice->down_payment,
            'paid_amount' => (float) $invoice->paid_amount,
            'remaining' => max(0, (float) $invoice->total - (float) $invoice->paid_amount),
            'payment_status' => $invoice->payment_status,
            'payment_status_label' => $invoice->payment_status_label,
            'items_count' => $invoice->items->count(),
            'items_summary' => $invoice->items->map(fn ($item) => $item->description)->implode(', '),
            'is_overdue' => $isOverdue,
            'can_edit' => ! in_array($invoice->status, ['paid', 'cancelled'], true),
        ];
    }

    private function mapInvoiceForEdit(Invoice $invoice): array
    {
        $taxable = max(0, (float) $invoice->subtotal - (float) $invoice->discount + (float) $invoice->shipping);
        $taxRate = $taxable > 0 ? round((float) $invoice->tax / $taxable, 4) : 0;

        return [
            'id' => $invoice->id,
            'number' => $invoice->number,
            'customer_id' => $invoice->customer_id,
            'purchase_order_id' => $invoice->purchase_order_id,
            'status' => $invoice->status,
            'status_label' => $invoice->status_label,
            'issued_at' => optional($invoice->issued_at)->toDateString(),
            'due_at' => optional($invoice->due_at)->toDateString(),
            'shipping' => (float) $invoice->shipping,
            'tax_rate' => $taxRate,
            'down_payment' => (float) $invoice->down_payment,
            'paid_amount' => (float) $invoice->paid_amount,
            'terms' => $invoice->terms,
            'notes' => $invoice->notes,
            'items' => $invoice->items->map(fn (InvoiceItem $item) => [
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
