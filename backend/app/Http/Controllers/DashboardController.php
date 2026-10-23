<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\FollowUp;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\PurchaseOrder;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $today = today();

        $followUps = FollowUp::with(['customer', 'lead', 'assignee'])
            ->open()
            ->whereDate('due_at', '<=', $today)
            ->orderBy('due_at')
            ->get();

        $upcomingFollowUps = FollowUp::with(['customer', 'lead', 'assignee'])
            ->open()
            ->whereDate('due_at', '>', $today)
            ->orderBy('due_at')
            ->limit(5)
            ->get();

        $healthCounts = [
            'aman' => Customer::where('health_score', '>=', 80)->count(),
            'attention' => Customer::whereBetween('health_score', [60, 79])->count(),
            'risk' => Customer::where('health_score', '<', 60)->count(),
        ];

        $pipelineRows = Lead::active()
            ->selectRaw('stage, COUNT(*) as total, COALESCE(SUM(estimated_value), 0) as value')
            ->groupBy('stage')
            ->get()
            ->keyBy('stage');

        $pipeline = collect(Lead::STAGES)
            ->except(['won', 'lost', 'nurture'])
            ->map(fn ($label, $key) => [
                'key' => $key,
                'label' => $label,
                'count' => (int) ($pipelineRows[$key]->total ?? 0),
                'value' => (int) ($pipelineRows[$key]->value ?? 0),
            ])
            ->values();

        $openPosQuery = PurchaseOrder::whereNotIn('status', ['completed', 'cancelled']);

        $recentPos = PurchaseOrder::with(['customer', 'items.product'])
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (PurchaseOrder $po) => [
                'id' => $po->id,
                'number' => $po->number,
                'customer' => [
                    'id' => $po->customer->id,
                    'name' => $po->customer->name,
                    'segment' => $po->customer->segment,
                    'segment_label' => $po->customer->segment_label,
                ],
                'items_summary' => $po->items->map(fn ($item) => number_format((float) $item->qty, 0, ',', '.').' '.$item->unit.' '.(optional($item->product)->name ?? $item->description))->implode(' · '),
                'total' => (float) $po->total,
                'status' => $po->status,
                'status_label' => $po->status_label,
                'requested_delivery_at' => optional($po->requested_delivery_at)->toDateString(),
                'requested_delivery_label' => optional($po->requested_delivery_at)->translatedFormat('d M'),
                'progress' => $this->statusProgress($po->status),
            ]);

        $activities = Interaction::with(['customer', 'lead', 'creator'])
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Interaction $interaction) => [
                'id' => $interaction->id,
                'type' => $interaction->type,
                'title' => $this->interactionTitle($interaction->type),
                'body' => $interaction->body,
                'time' => $interaction->created_at->diffForHumans(),
                'actor' => $interaction->creator?->name ?? 'Admin',
                'customer' => $interaction->customer?->name ?? $interaction->lead?->name,
            ]);

        $repeatCustomerCount = PurchaseOrder::whereNotIn('status', ['cancelled'])
            ->select('customer_id')
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->count();

        $activeCustomers = Customer::whereIn('status', ['active', 'attention', 'risk'])->count();

        return Inertia::render('Dashboard', [
            'today' => now()->locale('id')->translatedFormat('l, j F Y'),
            'kpis' => [
                'followups_today' => FollowUp::open()->whereDate('due_at', '<=', $today)->count(),
                'followups_overdue' => FollowUp::open()->whereDate('due_at', '<', $today)->count(),
                'active_customers' => $activeCustomers,
                'pipeline_value' => (float) Lead::active()->sum('estimated_value'),
                'active_leads' => Lead::active()->count(),
                'open_pos' => $openPosQuery->count(),
                'ready_pos' => PurchaseOrder::where('status', 'ready')->count(),
                'repeat_rate' => $activeCustomers ? (int) round($repeatCustomerCount / $activeCustomers * 100) : 0,
                'mbg_customers' => Customer::where('segment', 'mbg')->count(),
                'kolam_customers' => Customer::where('segment', 'kolam')->count(),
            ],
            'followUps' => $followUps->map(fn (FollowUp $followUp) => $this->followUpData($followUp)),
            'upcomingFollowUps' => $upcomingFollowUps->map(fn (FollowUp $followUp) => $this->followUpData($followUp)),
            'health' => [
                'aman' => $healthCounts['aman'],
                'attention' => $healthCounts['attention'],
                'risk' => $healthCounts['risk'],
                'total' => array_sum($healthCounts),
                'average' => (int) round(Customer::avg('health_score') ?? 0),
            ],
            'pipeline' => $pipeline,
            'recentPos' => $recentPos,
            'segments' => [
                'mbg' => $this->segmentStats('mbg'),
                'kolam' => $this->segmentStats('kolam'),
            ],
            'activities' => $activities,
        ]);
    }

    private function followUpData(FollowUp $followUp): array
    {
        $customer = $followUp->customer;
        $lead = $followUp->lead;
        $isOverdue = $followUp->due_at && $followUp->due_at->lt(today());

        return [
            'id' => $followUp->id,
            'title' => $followUp->title,
            'due_at' => optional($followUp->due_at)->toIso8601String(),
            'due_label' => optional($followUp->due_at)->translatedFormat('d M, H.i'),
            'is_overdue' => $isOverdue,
            'priority' => $followUp->priority,
            'notes' => $followUp->notes,
            'assignee' => $followUp->assignee?->name ?? 'Belum ditugaskan',
            'assignee_role' => $followUp->assignee?->role,
            'customer' => $customer ? [
                'id' => $customer->id,
                'name' => $customer->name,
                'segment' => $customer->segment,
                'segment_label' => $customer->segment_label,
                'phone' => $customer->phone,
            ] : null,
            'lead' => $lead ? [
                'id' => $lead->id,
                'name' => $lead->name,
                'segment' => $lead->segment,
            ] : null,
            'name' => $customer?->name ?? $lead?->name ?? 'Follow-up',
            'segment' => $customer?->segment ?? $lead?->segment,
        ];
    }

    private function segmentStats(string $segment): array
    {
        $customers = Customer::where('segment', $segment);
        $totalCustomers = (clone $customers)->count();
        $revenue = PurchaseOrder::whereHas('customer', fn ($query) => $query->where('segment', $segment))
            ->whereNotIn('status', ['cancelled'])
            ->sum('total');
        $orders = PurchaseOrder::whereHas('customer', fn ($query) => $query->where('segment', $segment))
            ->whereNotIn('status', ['cancelled'])
            ->count();
        $repeat = PurchaseOrder::whereHas('customer', fn ($query) => $query->where('segment', $segment))
            ->whereNotIn('status', ['cancelled'])
            ->select('customer_id')
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->count();

        return [
            'label' => Customer::SEGMENTS[$segment],
            'customers' => $totalCustomers,
            'revenue' => (float) $revenue,
            'orders' => $orders,
            'aov' => $orders ? (float) round($revenue / $orders) : 0,
            'repeat_rate' => $totalCustomers ? (int) round($repeat / $totalCustomers * 100) : 0,
        ];
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

    private function interactionTitle(string $type): string
    {
        return [
            'note' => 'Catatan follow-up',
            'call' => 'Telepon',
            'whatsapp' => 'WhatsApp terkirim',
            'meeting' => 'Meeting',
            'visit' => 'Kunjungan',
        ][$type] ?? 'Interaksi';
    }
}
