<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Invoice;
use App\Models\PoStatusHistory;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Quotation;
use App\Support\PublicDocumentLink;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['customer', 'items', 'deliveries']);

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($builder) use ($search) {
                $builder->where('number', 'like', "%{$search}%")
                    ->orWhere('customer_po_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->string('status')->toString()) {
            if (array_key_exists($status, PurchaseOrder::STATUSES)) {
                $query->where('status', $status);
            }
        }

        if ($segment = $request->string('segment')->toString()) {
            if (in_array($segment, ['mbg', 'kolam'], true)) {
                $query->whereHas('customer', fn ($q) => $q->where('segment', $segment));
            }
        }

        $orders = $query->latest()->paginate(12)->withQueryString();

        $orders->through(fn (PurchaseOrder $po) => $this->mapOrder($po));

        $statusCounts = collect(array_keys(PurchaseOrder::STATUSES))
            ->mapWithKeys(fn ($status) => [$status => PurchaseOrder::where('status', $status)->count()]);

        $todayDeliveries = Delivery::with(['purchaseOrder.customer'])
            ->whereDate('scheduled_at', today())
            ->orderBy('scheduled_at')
            ->get()
            ->map(fn (Delivery $delivery) => [
                'id' => $delivery->id,
                'number' => $delivery->number,
                'status' => $delivery->status,
                'status_label' => Delivery::STATUSES[$delivery->status] ?? $delivery->status,
                'scheduled_at' => optional($delivery->scheduled_at)->toIso8601String(),
                'scheduled_label' => optional($delivery->scheduled_at)->translatedFormat('H.i'),
                'driver_name' => $delivery->driver_name,
                'driver_phone' => $delivery->driver_phone,
                'vehicle' => $delivery->vehicle,
                'purchase_order' => [
                    'id' => $delivery->purchaseOrder->id,
                    'number' => $delivery->purchaseOrder->number,
                    'customer' => $delivery->purchaseOrder->customer->name,
                    'segment' => $delivery->purchaseOrder->customer->segment,
                ],
            ]);

        return Inertia::render('PurchaseOrders/Index', [
            'orders' => $orders,
            'filters' => [
                'q' => $request->string('q')->toString(),
                'status' => $request->string('status')->toString(),
                'segment' => $request->string('segment')->toString(),
            ],
            'stats' => [
                'total' => PurchaseOrder::count(),
                'received' => PurchaseOrder::where('status', 'received')->count(),
                'in_process' => PurchaseOrder::whereIn('status', ['confirmed', 'production', 'ready'])->count(),
                'ready' => PurchaseOrder::where('status', 'ready')->count(),
                'shipped' => PurchaseOrder::where('status', 'shipped')->count(),
                'completed' => PurchaseOrder::whereIn('status', ['delivered', 'completed'])->count(),
                'overdue' => PurchaseOrder::whereNotIn('status', ['delivered', 'completed', 'cancelled'])
                    ->whereDate('requested_delivery_at', '<', today())
                    ->count(),
            ],
            'statusCounts' => $statusCounts,
            'statusOptions' => collect(PurchaseOrder::STATUSES)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
            'todayDeliveries' => $todayDeliveries,
        ]);
    }

    public function create(Request $request)
    {
        $sourceQuotation = null;

        if ($request->filled('quotation_id')) {
            $sourceQuotation = Quotation::with(['customer.profile', 'items'])
                ->find($request->integer('quotation_id'));
        }

        return Inertia::render('PurchaseOrders/Create', [
            'selectedCustomerId' => $sourceQuotation?->customer_id ?? $request->integer('customer_id'),
            'selectedQuotationId' => $sourceQuotation?->id ?? $request->integer('quotation_id'),
            'sourceQuotation' => $sourceQuotation ? $this->mapQuotationSource($sourceQuotation) : null,
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
                    'address' => $customer->address,
                    'payment_terms_days' => $customer->profile?->payment_terms_days ?? 14,
                ]),
            'products' => Product::where('is_active', true)->orderBy('category')->get()->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category,
                'category_label' => Product::CATEGORIES[$product->category] ?? $product->category,
                'size_grade' => $product->size_grade,
                'unit' => $product->unit,
                'base_price' => (float) $product->base_price,
            ]),
            'quotations' => Quotation::with(['customer.profile', 'items'])
                ->whereIn('status', ['sent', 'accepted', 'revised'])
                ->latest('issued_at')
                ->get()
                ->map(fn (Quotation $quotation) => $this->mapQuotationSource($quotation)),
            'nextNumber' => $this->nextNumber(),
        ]);
    }

    private function mapQuotationSource(Quotation $quotation): array
    {
        $taxable = max(0, (float) $quotation->subtotal - (float) $quotation->discount + (float) $quotation->shipping);
        $taxRate = $taxable > 0 ? round((float) $quotation->tax / $taxable, 4) : 0;
        $paymentTermsDays = $quotation->customer?->profile?->payment_terms_days ?? 14;

        return [
            'id' => $quotation->id,
            'number' => $quotation->number,
            'customer_id' => $quotation->customer_id,
            'customer' => $quotation->customer?->name,
            'total' => (float) $quotation->total,
            'shipping' => (float) $quotation->shipping,
            'tax_rate' => $taxRate,
            'payment_terms' => $paymentTermsDays.' hari',
            'notes' => 'Berdasarkan quotation '.$quotation->number.'.',
            'items' => $quotation->items->map(function ($item) {
                $qty = (float) $item->qty;
                $effectiveUnitPrice = $qty > 0
                    ? round((($qty * (float) $item->unit_price) - (float) $item->discount) / $qty, 2)
                    : (float) $item->unit_price;

                return [
                    'product_id' => $item->product_id,
                    'description' => $item->description,
                    'qty' => $qty,
                    'unit' => $item->unit,
                    'unit_price' => $effectiveUnitPrice,
                ];
            })->values(),
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'customer_po_number' => ['nullable', 'string', 'max:100'],
            'quotation_id' => ['nullable', 'exists:quotations,id'],
            'requested_delivery_at' => ['required', 'date'],
            'shipping' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'payment_terms' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['required', 'string', 'max:20'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $subtotal = collect($data['items'])->sum(fn ($item) => (float) $item['qty'] * (float) $item['unit_price']);
        $shipping = (float) ($data['shipping'] ?? 0);
        $taxRate = (float) ($data['tax_rate'] ?? 0);
        $tax = round(($subtotal + $shipping) * $taxRate);
        $total = $subtotal + $shipping + $tax;

        if (! empty($data['quotation_id'])) {
            $quotation = Quotation::find($data['quotation_id']);

            if ($quotation && (int) $quotation->customer_id !== (int) $data['customer_id']) {
                throw ValidationException::withMessages([
                    'quotation_id' => 'Quotation tidak sesuai dengan pelanggan yang dipilih.',
                ]);
            }
        }

        $po = PurchaseOrder::create([
            'number' => $this->nextNumber(),
            'customer_po_number' => $data['customer_po_number'] ?? null,
            'customer_id' => $data['customer_id'],
            'quotation_id' => $data['quotation_id'] ?? null,
            'type' => 'sale',
            'status' => 'received',
            'requested_delivery_at' => $data['requested_delivery_at'],
            'subtotal' => $subtotal,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => $total,
            'payment_terms' => $data['payment_terms'] ?? '14 hari',
            'payment_status' => 'unpaid',
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        foreach ($data['items'] as $item) {
            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'],
                'qty' => $item['qty'],
                'unit' => $item['unit'],
                'unit_price' => $item['unit_price'],
                'fulfilled_qty' => 0,
                'subtotal' => (float) $item['qty'] * (float) $item['unit_price'],
            ]);
        }

        PoStatusHistory::create([
            'purchase_order_id' => $po->id,
            'status' => 'received',
            'note' => 'PO diterima dan masuk antrean konfirmasi.',
            'changed_by' => $request->user()->id,
        ]);

        return redirect()->route('purchase-orders.show', $po)->with('success', 'PO baru diterima dan masuk antrean konfirmasi.');
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load([
            'customer.primaryContact',
            'quotation',
            'items.product',
            'statusHistory.changedBy',
            'deliveries',
            'invoices',
            'creator',
        ]);

        $statusOrder = ['received', 'confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'];
        $currentIndex = array_search($purchaseOrder->status, $statusOrder, true);
        $history = $purchaseOrder->statusHistory->keyBy('status');

        $steps = collect($statusOrder)->map(function ($status, $index) use ($currentIndex, $history) {
            $entry = $history[$status] ?? null;

            return [
                'status' => $status,
                'label' => PurchaseOrder::STATUSES[$status],
                'state' => $currentIndex === false ? 'pending' : ($index < $currentIndex ? 'done' : ($index === $currentIndex ? 'active' : 'pending')),
                'timestamp' => optional($entry?->created_at)->toIso8601String(),
                'time_label' => optional($entry?->created_at)->translatedFormat('d M, H.i'),
            ];
        });

        $latestDelivery = $purchaseOrder->deliveries->sortByDesc('scheduled_at')->first();

        return Inertia::render('PurchaseOrders/Show', [
            'order' => [
                'id' => $purchaseOrder->id,
                'number' => $purchaseOrder->number,
                'customer_po_number' => $purchaseOrder->customer_po_number,
                'status' => $purchaseOrder->status,
                'status_label' => $purchaseOrder->status_label,
                'type' => $purchaseOrder->type,
                'requested_delivery_at' => optional($purchaseOrder->requested_delivery_at)->toDateString(),
                'requested_delivery_label' => optional($purchaseOrder->requested_delivery_at)->translatedFormat('d M Y'),
                'confirmed_at' => optional($purchaseOrder->confirmed_at)->toIso8601String(),
                'subtotal' => (float) $purchaseOrder->subtotal,
                'tax' => (float) $purchaseOrder->tax,
                'shipping' => (float) $purchaseOrder->shipping,
                'total' => (float) $purchaseOrder->total,
                'payment_terms' => $purchaseOrder->payment_terms,
                'payment_status' => $purchaseOrder->payment_status,
                'payment_status_label' => PurchaseOrder::PAYMENT_STATUSES[$purchaseOrder->payment_status] ?? $purchaseOrder->payment_status,
                'notes' => $purchaseOrder->notes,
                'created_label' => $purchaseOrder->created_at->translatedFormat('d M Y'),
                'sales' => $purchaseOrder->creator?->name,
                'public_url' => PublicDocumentLink::purchaseOrder($purchaseOrder),
                'progress' => $this->statusProgress($purchaseOrder->status),
                'customer' => [
                    'id' => $purchaseOrder->customer->id,
                    'name' => $purchaseOrder->customer->name,
                    'segment' => $purchaseOrder->customer->segment,
                    'segment_label' => $purchaseOrder->customer->segment_label,
                    'phone' => $purchaseOrder->customer->phone,
                    'address' => $purchaseOrder->customer->address,
                    'city' => $purchaseOrder->customer->city,
                    'contact' => $purchaseOrder->customer->primaryContact?->name,
                ],
                'quotation' => $purchaseOrder->quotation ? [
                    'id' => $purchaseOrder->quotation->id,
                    'number' => $purchaseOrder->quotation->number,
                ] : null,
                'items' => $purchaseOrder->items->map(fn (PurchaseOrderItem $item) => [
                    'id' => $item->id,
                    'description' => $item->description,
                    'qty' => (float) $item->qty,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'fulfilled_qty' => (float) $item->fulfilled_qty,
                    'subtotal' => (float) $item->subtotal,
                    'product' => $item->product?->name,
                ]),
                'history' => $purchaseOrder->statusHistory->map(fn (PoStatusHistory $entry) => [
                    'id' => $entry->id,
                    'status' => $entry->status,
                    'status_label' => PurchaseOrder::STATUSES[$entry->status] ?? $entry->status,
                    'note' => $entry->note,
                    'changed_by' => $entry->changedBy?->name ?? 'Sistem',
                    'time_label' => $entry->created_at->translatedFormat('d M Y, H.i'),
                ]),
                'deliveries' => $purchaseOrder->deliveries->map(fn (Delivery $delivery) => [
                    'id' => $delivery->id,
                    'number' => $delivery->number,
                    'driver_name' => $delivery->driver_name,
                    'driver_phone' => $delivery->driver_phone,
                    'vehicle' => $delivery->vehicle,
                    'scheduled_at' => optional($delivery->scheduled_at)->toIso8601String(),
                    'scheduled_label' => optional($delivery->scheduled_at)->translatedFormat('d M Y, H.i'),
                    'arrived_at' => optional($delivery->arrived_at)->toIso8601String(),
                    'receiver_name' => $delivery->receiver_name,
                    'status' => $delivery->status,
                    'status_label' => Delivery::STATUSES[$delivery->status] ?? $delivery->status,
                    'notes' => $delivery->notes,
                ]),
                'invoices' => $purchaseOrder->invoices->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'status' => $invoice->status,
                    'status_label' => $invoice->status_label,
                    'total' => (float) $invoice->total,
                    'issued_label' => optional($invoice->issued_at)->translatedFormat('d M Y'),
                    'due_label' => optional($invoice->due_at)->translatedFormat('d M Y'),
                ]),
                'latest_delivery' => $latestDelivery ? [
                    'id' => $latestDelivery->id,
                    'driver_name' => $latestDelivery->driver_name,
                    'driver_phone' => $latestDelivery->driver_phone,
                    'vehicle' => $latestDelivery->vehicle,
                    'scheduled_label' => optional($latestDelivery->scheduled_at)->translatedFormat('d M Y, H.i'),
                    'status' => $latestDelivery->status,
                    'status_label' => Delivery::STATUSES[$latestDelivery->status] ?? $latestDelivery->status,
                ] : null,
            ],
            'steps' => $steps,
            'statusOptions' => collect(PurchaseOrder::STATUSES)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
        ]);
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'status' => ['required', 'in:received,confirmed,production,ready,shipped,delivered,completed,cancelled'],
            'note' => ['nullable', 'string'],
        ]);

        $purchaseOrder->update([
            'status' => $data['status'],
            'confirmed_at' => $data['status'] === 'confirmed' ? ($purchaseOrder->confirmed_at ?? now()) : $purchaseOrder->confirmed_at,
        ]);

        PoStatusHistory::create([
            'purchase_order_id' => $purchaseOrder->id,
            'status' => $data['status'],
            'note' => $data['note'] ?? 'Status diperbarui menjadi '.$purchaseOrder->status_label.'.',
            'changed_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Status PO diperbarui menjadi '.$purchaseOrder->status_label.'.');
    }

    public function storeDelivery(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'driver_name' => ['required', 'string', 'max:120'],
            'driver_phone' => ['nullable', 'string', 'max:30'],
            'vehicle' => ['nullable', 'string', 'max:100'],
            'scheduled_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $delivery = Delivery::create([
            'purchase_order_id' => $purchaseOrder->id,
            'number' => $this->nextDeliveryNumber($purchaseOrder),
            'driver_name' => $data['driver_name'],
            'driver_phone' => $data['driver_phone'] ?? null,
            'vehicle' => $data['vehicle'] ?? null,
            'scheduled_at' => $data['scheduled_at'],
            'status' => 'scheduled',
            'notes' => $data['notes'] ?? null,
        ]);

        return back()->with('success', 'Jadwal pengiriman '.$delivery->number.' dibuat.');
    }

    private function mapOrder(PurchaseOrder $po): array
    {
        $isOverdue = $po->requested_delivery_at
            && $po->requested_delivery_at->lt(today())
            && ! in_array($po->status, ['delivered', 'completed', 'cancelled'], true);

        return [
            'id' => $po->id,
            'number' => $po->number,
            'customer_po_number' => $po->customer_po_number,
            'customer' => [
                'id' => $po->customer->id,
                'name' => $po->customer->name,
                'segment' => $po->customer->segment,
                'segment_label' => $po->customer->segment_label,
                'city' => $po->customer->city,
            ],
            'items_summary' => $po->items->map(fn ($item) => number_format((float) $item->qty, 0, ',', '.').' '.$item->unit.' '.(optional($item->product)->name ?? $item->description))->implode(' · '),
            'total' => (float) $po->total,
            'status' => $po->status,
            'status_label' => $po->status_label,
            'requested_delivery_at' => optional($po->requested_delivery_at)->toDateString(),
            'requested_delivery_label' => optional($po->requested_delivery_at)->translatedFormat('d M'),
            'progress' => $this->statusProgress($po->status),
            'is_overdue' => $isOverdue,
            'payment_status' => $po->payment_status,
            'payment_status_label' => PurchaseOrder::PAYMENT_STATUSES[$po->payment_status] ?? $po->payment_status,
            'created_label' => $po->created_at->translatedFormat('d M Y'),
            'latest_delivery' => $po->deliveries->sortByDesc('scheduled_at')->first() ? [
                'status' => $po->deliveries->sortByDesc('scheduled_at')->first()->status,
                'status_label' => Delivery::STATUSES[$po->deliveries->sortByDesc('scheduled_at')->first()->status] ?? null,
            ] : null,
        ];
    }

    private function nextNumber(): string
    {
        $prefix = 'PO-'.now()->format('ym').'-';
        $last = PurchaseOrder::where('number', 'like', $prefix.'%')->orderByDesc('number')->value('number');
        $sequence = $last ? ((int) substr($last, -3)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    private function nextDeliveryNumber(PurchaseOrder $purchaseOrder): string
    {
        $base = 'SJ-'.Str::after($purchaseOrder->number, 'PO-');
        $number = $base;
        $suffix = 2;

        while (Delivery::where('number', $number)->exists()) {
            $number = $base.'-'.$suffix;
            $suffix++;
        }

        return $number;
    }

    private function statusProgress(string $status): int
    {
        return [
            'received' => 10,
            'confirmed' => 30,
            'production' => 45,
            'ready' => 75,
            'shipped' => 90,
            'delivered' => 100,
            'completed' => 100,
            'cancelled' => 0,
        ][$status] ?? 0;
    }
}
