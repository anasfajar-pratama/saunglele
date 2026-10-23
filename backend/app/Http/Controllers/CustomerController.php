<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Customer;
use App\Models\CustomerProfile;
use App\Models\FollowUp;
use App\Models\Interaction;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::with(['owner', 'primaryContact'])->search($request->string('q')->toString());

        if ($segment = $request->string('segment')->toString()) {
            if (in_array($segment, ['mbg', 'kolam'], true)) {
                $query->where('segment', $segment);
            }
        }

        if ($health = $request->string('health')->toString()) {
            if ($health === 'aman') {
                $query->where('health_score', '>=', 80);
            } elseif ($health === 'perhatian') {
                $query->whereBetween('health_score', [60, 79]);
            } elseif ($health === 'berisiko') {
                $query->where('health_score', '<', 60);
            }
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $customers = $query->orderByDesc('lifetime_value')->paginate(12)->withQueryString();

        $customers->through(function (Customer $customer) {
            $nextFollowUp = $customer->followUps()
                ->where('status', 'open')
                ->orderBy('due_at')
                ->first();

            return [
                'id' => $customer->id,
                'code' => $customer->code,
                'name' => $customer->name,
                'segment' => $customer->segment,
                'segment_label' => $customer->segment_label,
                'status' => $customer->status,
                'status_label' => $customer->status_label,
                'city' => $customer->city,
                'phone' => $customer->phone,
                'health_score' => $customer->health_score,
                'health_label' => $this->healthLabel($customer->health_score),
                'lifetime_value' => (float) $customer->lifetime_value,
                'last_order_at' => optional($customer->last_order_at)->toIso8601String(),
                'last_order_label' => $customer->last_order_at?->diffForHumans() ?? 'Belum ada order',
                'owner' => $customer->owner?->name,
                'contact' => $customer->primaryContact ? [
                    'name' => $customer->primaryContact->name,
                    'role' => $customer->primaryContact->role,
                    'phone' => $customer->primaryContact->phone,
                ] : null,
                'next_follow_up' => $nextFollowUp ? [
                    'id' => $nextFollowUp->id,
                    'title' => $nextFollowUp->title,
                    'due_at' => optional($nextFollowUp->due_at)->toIso8601String(),
                    'due_label' => optional($nextFollowUp->due_at)->translatedFormat('d M, H.i'),
                    'is_overdue' => $nextFollowUp->due_at?->isPast() ?? false,
                ] : null,
            ];
        });

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => [
                'q' => $request->string('q')->toString(),
                'segment' => $request->string('segment')->toString(),
                'health' => $request->string('health')->toString(),
                'status' => $request->string('status')->toString(),
            ],
            'stats' => [
                'all' => Customer::count(),
                'mbg' => Customer::where('segment', 'mbg')->count(),
                'kolam' => Customer::where('segment', 'kolam')->count(),
                'risk' => Customer::where('health_score', '<', 60)->count(),
            ],
            'owners' => \App\Models\User::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'segment' => ['required', 'in:mbg,kolam'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'source' => ['nullable', 'string', 'max:100'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'pic_name' => ['required', 'string', 'max:120'],
            'pic_role' => ['nullable', 'string', 'max:120'],
            'kitchen_capacity' => ['nullable', 'integer', 'min:0'],
            'delivery_window' => ['nullable', 'string', 'max:120'],
            'certifications' => ['nullable', 'string', 'max:255'],
            'pond_count' => ['nullable', 'integer', 'min:0'],
            'pond_area_m2' => ['nullable', 'numeric', 'min:0'],
            'water_source' => ['nullable', 'string', 'max:120'],
            'grow_out_capacity_kg' => ['nullable', 'numeric', 'min:0'],
            'target_abw_g' => ['nullable', 'numeric', 'min:0'],
            'preferred_products' => ['nullable', 'string', 'max:255'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'notes' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
        ]);

        $nextId = ((int) Customer::max('id')) + 1;
        $customer = Customer::create([
            'code' => 'CUST-'.str_pad((string) $nextId, 3, '0', STR_PAD_LEFT),
            'name' => $data['name'],
            'segment' => $data['segment'],
            'status' => 'active',
            'source' => $data['source'] ?? 'Manual',
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'city' => $data['city'] ?? null,
            'address' => $data['address'] ?? null,
            'health_score' => 80,
            'lifetime_value' => 0,
            'last_order_at' => null,
            'notes' => $data['notes'] ?? null,
        ]);

        CustomerProfile::create([
            'customer_id' => $customer->id,
            'kitchen_capacity' => $data['kitchen_capacity'] ?? null,
            'delivery_window' => $data['delivery_window'] ?? null,
            'certifications' => $data['certifications'] ?? null,
            'pond_count' => $data['pond_count'] ?? null,
            'pond_area_m2' => $data['pond_area_m2'] ?? null,
            'water_source' => $data['water_source'] ?? null,
            'grow_out_capacity_kg' => $data['grow_out_capacity_kg'] ?? null,
            'target_abw_g' => $data['target_abw_g'] ?? null,
            'preferred_products' => $data['preferred_products'] ?? null,
            'payment_terms_days' => $data['payment_terms_days'] ?? 14,
        ]);

        Contact::create([
            'customer_id' => $customer->id,
            'name' => $data['pic_name'],
            'role' => $data['pic_role'] ?? 'PIC',
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'is_primary' => true,
            'wa_opt_in' => true,
        ]);

        Interaction::create([
            'customer_id' => $customer->id,
            'type' => 'note',
            'body' => $data['notes'] ?: 'Pelanggan baru ditambahkan ke CRM.',
            'outcome' => 'Pelanggan baru',
            'created_by' => $request->user()->id,
        ]);

        FollowUp::create([
            'customer_id' => $customer->id,
            'title' => 'Follow-up awal pelanggan baru',
            'due_at' => Carbon::parse($data['follow_up_date'] ?? now()->addDay()->toDateString())->setTime(9, 0),
            'priority' => 'normal',
            'status' => 'open',
            'assigned_to' => $data['owner_id'] ?? $request->user()->id,
            'notes' => 'Kenali kebutuhan dan tawarkan produk sesuai segmen.',
        ]);

        return redirect()->route('customers.show', $customer)->with('success', 'Pelanggan baru berhasil disimpan.');
    }

    public function show(Customer $customer)
    {
        $customer->load([
            'profile',
            'contacts',
            'owner',
            'interactions.creator',
            'followUps.assignee',
            'quotations.items',
            'purchaseOrders.items.product',
            'buybackCycles.samplings',
            'messages.template',
        ]);

        $nextFollowUp = $customer->followUps
            ->where('status', 'open')
            ->sortBy('due_at')
            ->first();

        $templates = MessageTemplate::where('is_active', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(fn (MessageTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'category' => $template->category,
                'category_label' => MessageTemplate::CATEGORIES[$template->category] ?? $template->category,
                'segment' => $template->segment,
                'body' => $template->body,
                'variables' => $template->variables ?? [],
                'rendered_body' => $this->renderTemplate($template->body, $customer),
            ]);

        $completedOrders = $customer->purchaseOrders->whereIn('status', ['delivered', 'completed']);
        $totalValue = (float) $customer->purchaseOrders->sum('total');
        $repeatCount = $customer->purchaseOrders->count();

        return Inertia::render('Customers/Show', [
            'customer' => [
                'id' => $customer->id,
                'code' => $customer->code,
                'name' => $customer->name,
                'segment' => $customer->segment,
                'segment_label' => $customer->segment_label,
                'status' => $customer->status,
                'status_label' => $customer->status_label,
                'source' => $customer->source,
                'owner_id' => $customer->owner_id,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'city' => $customer->city,
                'address' => $customer->address,
                'health_score' => $customer->health_score,
                'health_label' => $this->healthLabel($customer->health_score),
                'lifetime_value' => (float) $customer->lifetime_value,
                'last_order_at' => optional($customer->last_order_at)->toIso8601String(),
                'last_order_label' => $customer->last_order_at?->diffForHumans() ?? 'Belum ada order',
                'notes' => $customer->notes,
                'created_at' => $customer->created_at->toIso8601String(),
                'created_label' => $customer->created_at->translatedFormat('M Y'),
                'owner' => $customer->owner?->name,
                'profile' => $customer->profile,
                'contacts' => $customer->contacts,
                'stats' => [
                    'orders' => $customer->purchaseOrders->count(),
                    'completed_orders' => $completedOrders->count(),
                    'total_value' => $totalValue,
                    'average_order' => $repeatCount ? round($totalValue / $repeatCount) : 0,
                ],
                'next_follow_up' => $nextFollowUp ? $this->mapFollowUp($nextFollowUp) : null,
                'interactions' => $customer->interactions->map(fn (Interaction $interaction) => [
                    'id' => $interaction->id,
                    'type' => $interaction->type,
                    'type_label' => $this->interactionLabel($interaction->type),
                    'body' => $interaction->body,
                    'outcome' => $interaction->outcome,
                    'created_at' => $interaction->created_at->toIso8601String(),
                    'time_label' => $interaction->created_at->translatedFormat('d M Y, H.i'),
                    'created_by' => $interaction->creator?->name ?? 'Admin',
                ]),
                'follow_ups' => $customer->followUps->map(fn (FollowUp $followUp) => $this->mapFollowUp($followUp)),
                'quotations' => $customer->quotations->map(fn (Quotation $quotation) => [
                    'id' => $quotation->id,
                    'number' => $quotation->number,
                    'issued_at' => optional($quotation->issued_at)->toDateString(),
                    'issued_label' => optional($quotation->issued_at)->translatedFormat('d M Y'),
                    'valid_until' => optional($quotation->valid_until)->toDateString(),
                    'valid_label' => optional($quotation->valid_until)->translatedFormat('d M Y'),
                    'status' => $quotation->status,
                    'status_label' => $quotation->status_label,
                    'total' => (float) $quotation->total,
                    'items_count' => $quotation->items->count(),
                    'items_summary' => $quotation->items->map(fn ($item) => $item->description)->implode(', '),
                ]),
                'purchase_orders' => $customer->purchaseOrders->map(fn (PurchaseOrder $po) => $this->mapPurchaseOrder($po)),
                'buyback_cycles' => $customer->buybackCycles->map(fn ($cycle) => $this->mapBuybackCycle($cycle)),
                'messages' => $customer->messages->map(fn (Message $message) => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'status' => $message->status,
                    'sent_at' => optional($message->sent_at)->toIso8601String(),
                    'sent_label' => optional($message->sent_at)->translatedFormat('d M Y, H.i'),
                    'template' => $message->template?->name,
                ]),
            ],
            'templates' => $templates,
            'users' => \App\Models\User::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'segment' => ['required', 'in:mbg,kolam'],
            'status' => ['required', 'in:'.implode(',', array_keys(Customer::STATUSES))],
            'source' => ['nullable', 'string', 'max:100'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'pic_name' => ['required', 'string', 'max:120'],
            'pic_role' => ['nullable', 'string', 'max:120'],
            'kitchen_capacity' => ['nullable', 'integer', 'min:0'],
            'delivery_window' => ['nullable', 'string', 'max:120'],
            'certifications' => ['nullable', 'string', 'max:255'],
            'pond_count' => ['nullable', 'integer', 'min:0'],
            'pond_area_m2' => ['nullable', 'numeric', 'min:0'],
            'water_source' => ['nullable', 'string', 'max:120'],
            'grow_out_capacity_kg' => ['nullable', 'numeric', 'min:0'],
            'target_abw_g' => ['nullable', 'numeric', 'min:0'],
            'preferred_products' => ['nullable', 'string', 'max:255'],
            'delivery_days' => ['nullable', 'string', 'max:100'],
            'buyback_agreement' => ['nullable', 'string'],
            'payment_terms_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $customer->update([
            'name' => $data['name'],
            'segment' => $data['segment'],
            'status' => $data['status'],
            'source' => $data['source'] ?? $customer->source,
            'owner_id' => $data['owner_id'] ?? $customer->owner_id,
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'city' => $data['city'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $customer->profile()->updateOrCreate(
            ['customer_id' => $customer->id],
            [
                'kitchen_capacity' => $data['kitchen_capacity'] ?? null,
                'delivery_window' => $data['delivery_window'] ?? null,
                'certifications' => $data['certifications'] ?? null,
                'pond_count' => $data['pond_count'] ?? null,
                'pond_area_m2' => $data['pond_area_m2'] ?? null,
                'water_source' => $data['water_source'] ?? null,
                'grow_out_capacity_kg' => $data['grow_out_capacity_kg'] ?? null,
                'target_abw_g' => $data['target_abw_g'] ?? null,
                'preferred_products' => $data['preferred_products'] ?? null,
                'delivery_days' => $data['delivery_days'] ?? null,
                'buyback_agreement' => $data['buyback_agreement'] ?? null,
                'payment_terms_days' => $data['payment_terms_days'] ?? 14,
            ]
        );

        $contact = $customer->contacts()->where('is_primary', true)->first()
            ?? $customer->contacts()->first();

        if ($contact) {
            $contact->update([
                'name' => $data['pic_name'],
                'role' => $data['pic_role'] ?? 'PIC',
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
            ]);
        } else {
            Contact::create([
                'customer_id' => $customer->id,
                'name' => $data['pic_name'],
                'role' => $data['pic_role'] ?? 'PIC',
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'is_primary' => true,
                'wa_opt_in' => true,
            ]);
        }

        return back()->with('success', 'Profil pelanggan berhasil diperbarui.');
    }

    public function storeInteraction(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'type' => ['required', 'in:note,call,whatsapp,meeting,visit'],
            'body' => ['required', 'string'],
            'outcome' => ['nullable', 'string', 'max:255'],
            'follow_up_title' => ['nullable', 'string', 'max:255'],
            'follow_up_date' => ['nullable', 'date'],
            'follow_up_time' => ['nullable', 'date_format:H:i'],
            'priority' => ['nullable', 'in:low,normal,high'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        $interaction = Interaction::create([
            'customer_id' => $customer->id,
            'type' => $data['type'],
            'body' => $data['body'],
            'outcome' => $data['outcome'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        if (! empty($data['follow_up_date'])) {
            FollowUp::create([
                'customer_id' => $customer->id,
                'interaction_id' => $interaction->id,
                'title' => $data['follow_up_title'] ?: Str::limit($data['body'], 80),
                'due_at' => Carbon::parse($data['follow_up_date'].' '.($data['follow_up_time'] ?? '09:00')),
                'priority' => $data['priority'] ?? 'normal',
                'status' => 'open',
                'assigned_to' => $data['assigned_to'] ?? $request->user()->id,
                'notes' => $data['outcome'] ?? null,
            ]);
        }

        return back()->with('success', 'Catatan disimpan dan follow-up dijadwalkan.');
    }

    public function completeFollowUp(Request $request, FollowUp $followUp)
    {
        $data = $request->validate([
            'result' => ['nullable', 'string', 'max:2000'],
            'next_follow_up_date' => ['nullable', 'date'],
            'next_follow_up_time' => ['nullable', 'date_format:H:i'],
            'next_follow_up_title' => ['nullable', 'string', 'max:255'],
            'next_priority' => ['nullable', 'in:low,normal,high'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        $result = trim($data['result'] ?? '') ?: 'Follow-up diselesaikan.';

        $interaction = Interaction::create([
            'customer_id' => $followUp->customer_id,
            'type' => 'note',
            'body' => 'Follow-up selesai: '.$followUp->title,
            'outcome' => $result,
            'created_by' => $request->user()->id,
        ]);

        $followUp->update([
            'status' => 'done',
            'completed_at' => now(),
            'notes' => $result,
        ]);

        if (! empty($data['next_follow_up_date'])) {
            FollowUp::create([
                'customer_id' => $followUp->customer_id,
                'interaction_id' => $interaction->id,
                'title' => $data['next_follow_up_title'] ?: 'Tindak lanjut: '.$followUp->title,
                'due_at' => Carbon::parse($data['next_follow_up_date'].' '.($data['next_follow_up_time'] ?? '09:00')),
                'priority' => $data['next_priority'] ?? $followUp->priority,
                'status' => 'open',
                'assigned_to' => $data['assigned_to'] ?? $followUp->assigned_to ?? $request->user()->id,
                'notes' => $result,
            ]);
        }

        return back()->with('success', ! empty($data['next_follow_up_date'])
            ? 'Follow-up selesai, hasil dicatat ke timeline, dan follow-up berikutnya dijadwalkan.'
            : 'Follow-up selesai dan hasilnya dicatat ke timeline.');
    }

    public function snoozeFollowUp(Request $request, FollowUp $followUp)
    {
        $data = $request->validate([
            'result' => ['nullable', 'string', 'max:2000'],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
        ]);

        $result = trim($data['result'] ?? '') ?: 'Follow-up ditunda.';

        if (! empty($data['due_date'])) {
            $dueAt = Carbon::parse($data['due_date'].' '.($data['due_time'] ?? '09:00'));
        } else {
            $dueAt = ($followUp->due_at ?? now())->copy()->addDay();

            if (! empty($data['due_time'])) {
                $dueAt->setTimeFromTimeString($data['due_time']);
            }
        }

        $followUp->update([
            'due_at' => $dueAt,
            'notes' => $result,
        ]);

        Interaction::create([
            'customer_id' => $followUp->customer_id,
            'type' => 'note',
            'body' => 'Follow-up ditunda: '.$followUp->title,
            'outcome' => $result.' · Dijadwalkan ulang '.$dueAt->translatedFormat('d M Y, H.i'),
            'created_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Follow-up ditunda dan hasilnya dicatat ke timeline.');
    }

    public function storeMessage(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'template_id' => ['nullable', 'exists:message_templates,id'],
            'body' => ['required', 'string'],
        ]);

        Message::create([
            'customer_id' => $customer->id,
            'template_id' => $data['template_id'] ?? null,
            'channel' => 'whatsapp',
            'body' => $data['body'],
            'status' => 'sent',
            'sent_by' => $request->user()->id,
            'sent_at' => now(),
        ]);

        if (! empty($data['template_id'])) {
            MessageTemplate::where('id', $data['template_id'])->increment('usage_count');
        }

        return back()->with('success', 'Pesan dicatat ke timeline pelanggan.');
    }

    private function mapFollowUp(FollowUp $followUp): array
    {
        return [
            'id' => $followUp->id,
            'title' => $followUp->title,
            'due_at' => optional($followUp->due_at)->toIso8601String(),
            'due_label' => optional($followUp->due_at)->translatedFormat('d M Y, H.i'),
            'priority' => $followUp->priority,
            'status' => $followUp->status,
            'notes' => $followUp->notes,
            'assignee' => $followUp->assignee?->name,
            'assignee_role' => $followUp->assignee?->role,
            'assigned_to' => $followUp->assigned_to,
            'is_overdue' => $followUp->due_at?->isPast() ?? false,
        ];
    }

    private function mapPurchaseOrder(PurchaseOrder $po): array
    {
        return [
            'id' => $po->id,
            'number' => $po->number,
            'customer_po_number' => $po->customer_po_number,
            'total' => (float) $po->total,
            'status' => $po->status,
            'status_label' => $po->status_label,
            'requested_delivery_at' => optional($po->requested_delivery_at)->toDateString(),
            'requested_delivery_label' => optional($po->requested_delivery_at)->translatedFormat('d M Y'),
            'items_count' => $po->items->count(),
            'items_summary' => $po->items->map(fn ($item) => number_format((float) $item->qty, 0, ',', '.').' '.$item->unit.' '.(optional($item->product)->name ?? $item->description))->implode(' · '),
            'created_label' => $po->created_at->translatedFormat('d M Y'),
        ];
    }

    private function mapBuybackCycle($cycle): array
    {
        $latest = $cycle->samplings->sortByDesc('sampled_at')->first();
        $samplings = $cycle->samplings->sortBy('sampled_at')->map(fn ($sampling) => [
            'id' => $sampling->id,
            'sampled_at' => optional($sampling->sampled_at)->toDateString(),
            'sampled_label' => optional($sampling->sampled_at)->translatedFormat('d M Y'),
            'avg_weight_g' => (float) $sampling->avg_weight_g,
            'estimated_sr' => (float) $sampling->estimated_sr,
            'estimated_biomass_kg' => (float) $sampling->estimated_biomass_kg,
        ]);

        return [
            'id' => $cycle->id,
            'stocked_at' => optional($cycle->stocked_at)->toDateString(),
            'stocked_label' => optional($cycle->stocked_at)->translatedFormat('d M Y'),
            'seed_qty' => $cycle->seed_qty,
            'seed_size' => $cycle->seed_size,
            'target_abw_g' => (float) $cycle->target_abw_g,
            'estimated_harvest_at' => optional($cycle->estimated_harvest_at)->toDateString(),
            'estimated_harvest_label' => optional($cycle->estimated_harvest_at)->translatedFormat('d M Y'),
            'status' => $cycle->status,
            'status_label' => $cycle->status_label,
            'latest_sampling' => $latest ? [
                'avg_weight_g' => (float) $latest->avg_weight_g,
                'estimated_sr' => (float) $latest->estimated_sr,
                'estimated_biomass_kg' => (float) $latest->estimated_biomass_kg,
                'sampled_label' => optional($latest->sampled_at)->translatedFormat('d M Y'),
            ] : null,
            'samplings' => $samplings,
        ];
    }

    private function renderTemplate(string $body, Customer $customer): string
    {
        $latestQuotation = $customer->quotations->first();
        $latestPo = $customer->purchaseOrders->first();
        $contactName = $customer->primaryContact?->name ?? $customer->name;

        $replacements = [
            '{{nama}}' => $contactName,
            '{{nama_usaha}}' => $customer->name,
            '{{nama_sales}}' => auth()->user()?->name ?? 'Tim Saung Lele',
            '{{produk}}' => $customer->profile?->preferred_products ?? 'produk Saung Lele',
            '{{no_quotation}}' => $latestQuotation?->number ?? '-',
            '{{no_po}}' => $latestPo?->number ?? '-',
            '{{harga}}' => $latestPo ? 'Rp '.number_format((float) $latestPo->total, 0, ',', '.') : '-',
            '{{tanggal_kirim}}' => optional($latestPo?->requested_delivery_at)->translatedFormat('d F Y') ?? '-',
            '{{tanggal}}' => now()->addDays(7)->translatedFormat('d F Y'),
            '{{jam}}' => '06.00',
            '{{driver}}' => 'Tim Saung Lele',
            '{{qty}}' => $customer->profile?->preferred_products ?? '-',
            '{{link_quotation}}' => '-',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    private function healthLabel(int $score): string
    {
        if ($score >= 80) {
            return 'Aman';
        }

        if ($score >= 60) {
            return 'Perlu perhatian';
        }

        return 'Berisiko';
    }

    private function interactionLabel(string $type): string
    {
        return [
            'note' => 'Catatan',
            'call' => 'Telepon',
            'whatsapp' => 'WhatsApp',
            'meeting' => 'Meeting',
            'visit' => 'Kunjungan',
        ][$type] ?? 'Interaksi';
    }
}
