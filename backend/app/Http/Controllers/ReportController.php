<?php

namespace App\Http\Controllers;

use App\Models\BuybackCycle;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\PurchaseOrder;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index()
    {
        $totalCustomers = Customer::count();
        $activeCustomers = Customer::whereIn('status', ['active', 'attention', 'risk'])->count();
        $riskCustomers = Customer::where('health_score', '<', 60)->count();
        $churnCustomers = Customer::where('status', 'churn')->count();

        $repeatCustomerIds = PurchaseOrder::whereNotIn('status', ['cancelled'])
            ->select('customer_id')
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('customer_id');

        $repeatRate = $totalCustomers ? (int) round($repeatCustomerIds->count() / $totalCustomers * 100) : 0;

        $followUps = FollowUp::where('created_at', '>=', now()->subDays(30))->get();
        $complianceRate = $followUps->count() ? (int) round($followUps->where('status', 'done')->count() / $followUps->count() * 100) : 0;

        $deliveries = Delivery::where('status', 'delivered')->whereNotNull('scheduled_at')->whereNotNull('arrived_at')->get();
        $onTimeCount = $deliveries->filter(fn (Delivery $delivery) => $delivery->arrived_at->lte($delivery->scheduled_at->copy()->addHour()))->count();
        $onTimeRate = $deliveries->count() ? (int) round($onTimeCount / $deliveries->count() * 100) : 0;

        $repeatValue = PurchaseOrder::whereIn('status', ['delivered', 'completed'])
            ->whereIn('customer_id', $repeatCustomerIds)
            ->sum('total');

        $monthly = collect(range(5, 0))->map(function ($offset) {
            $month = now()->subMonths($offset);
            $orders = PurchaseOrder::whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->whereNotIn('status', ['cancelled'])
                ->get();
            $byCustomer = $orders->groupBy('customer_id');

            return [
                'label' => $month->locale('id')->translatedFormat('M'),
                'active' => $byCustomer->count(),
                'repeat' => $byCustomer->filter(fn ($orders) => $orders->count() > 1)->count(),
                'revenue' => (float) $orders->sum('total'),
            ];
        });

        $complianceByUser = FollowUp::with('assignee')
            ->where('created_at', '>=', now()->subDays(30))
            ->get()
            ->groupBy(fn (FollowUp $followUp) => $followUp->assignee?->name ?? 'Belum ditugaskan')
            ->map(fn ($items, $name) => [
                'name' => $name,
                'total' => $items->count(),
                'done' => $items->where('status', 'done')->count(),
                'rate' => $items->count() ? (int) round($items->where('status', 'done')->count() / $items->count() * 100) : 0,
            ])
            ->values();

        $sources = Lead::selectRaw("COALESCE(source, 'Lainnya') as source, COUNT(*) as total, SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won")
            ->groupBy('source')
            ->get()
            ->map(fn ($row) => [
                'source' => $row->source,
                'total' => (int) $row->total,
                'won' => (int) $row->won,
                'conversion' => $row->total ? (int) round($row->won / $row->total * 100) : 0,
            ]);

        $lost = Lead::where('stage', 'lost')->count();
        $lostReasons = Lead::where('stage', 'lost')
            ->selectRaw('lost_reason, COUNT(*) as total')
            ->groupBy('lost_reason')
            ->get()
            ->map(fn ($row) => [
                'label' => Lead::LOST_REASONS[$row->lost_reason] ?? ($row->lost_reason ?: 'Lainnya'),
                'count' => (int) $row->total,
                'percentage' => $lost ? (int) round($row->total / $lost * 100) : 0,
            ]);

        $segments = collect(['mbg', 'kolam'])->map(function ($segment) {
            $customers = Customer::where('segment', $segment);
            $total = (clone $customers)->count();
            $revenue = PurchaseOrder::whereHas('customer', fn ($query) => $query->where('segment', $segment))
                ->whereNotIn('status', ['cancelled'])
                ->sum('total');
            $repeat = PurchaseOrder::whereHas('customer', fn ($query) => $query->where('segment', $segment))
                ->whereNotIn('status', ['cancelled'])
                ->select('customer_id')
                ->groupBy('customer_id')
                ->havingRaw('COUNT(*) > 1')
                ->get()
                ->count();

            return [
                'key' => $segment,
                'label' => Customer::SEGMENTS[$segment],
                'customers' => $total,
                'revenue' => (float) $revenue,
                'repeat_rate' => $total ? (int) round($repeat / $total * 100) : 0,
                'risk' => (clone $customers)->where('health_score', '<', 60)->count(),
            ];
        })->values();

        $latestSamplings = BuybackCycle::with('samplings')->get()->map(fn ($cycle) => $cycle->samplings->sortByDesc('sampled_at')->first())->filter();
        $cycleDurations = BuybackCycle::whereNotNull('estimated_harvest_at')->get()->map(fn ($cycle) => $cycle->stocked_at?->diffInDays($cycle->estimated_harvest_at));

        $atRisk = Customer::where(function ($query) {
            $query->where('health_score', '<', 60)
                ->orWhere(function ($q) {
                    $q->whereNotNull('last_order_at')->where('last_order_at', '<', now()->subDays(60));
                });
        })
            ->orderBy('health_score')
            ->limit(5)
            ->get()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'segment' => $customer->segment,
                'segment_label' => $customer->segment_label,
                'health_score' => $customer->health_score,
                'last_order_label' => $customer->last_order_at?->diffForHumans() ?? 'Belum ada order',
                'lifetime_value' => (float) $customer->lifetime_value,
            ]);

        return Inertia::render('Reports/Index', [
            'kpis' => [
                'repeat_rate' => $repeatRate,
                'compliance_rate' => $complianceRate,
                'churn_rate' => $totalCustomers ? (int) round(($riskCustomers + $churnCustomers) / $totalCustomers * 100) : 0,
                'on_time_rate' => $onTimeRate,
                'repeat_value' => (float) $repeatValue,
                'total_customers' => $totalCustomers,
                'active_customers' => $activeCustomers,
                'risk_customers' => $riskCustomers,
                'on_time_count' => $onTimeCount,
                'delivery_count' => $deliveries->count(),
            ],
            'monthly' => $monthly,
            'compliance' => $complianceByUser,
            'sources' => $sources,
            'lostReasons' => $lostReasons,
            'segments' => $segments,
            'health' => [
                'aman' => Customer::where('health_score', '>=', 80)->count(),
                'attention' => Customer::whereBetween('health_score', [60, 79])->count(),
                'risk' => $riskCustomers,
                'average' => (int) round(Customer::avg('health_score') ?? 0),
            ],
            'onTime' => [
                'rate' => $onTimeRate,
                'count' => $onTimeCount,
                'total' => $deliveries->count(),
                'average_cycle_days' => round(PurchaseOrder::whereIn('status', ['delivered', 'completed'])->get()->avg(fn ($po) => $po->created_at && $po->requested_delivery_at ? abs($po->created_at->diffInDays($po->requested_delivery_at)) : 0) ?? 0, 1),
            ],
            'buyback' => [
                'average_sr' => round($latestSamplings->avg('estimated_sr') ?? 0, 1),
                'average_abw' => round($latestSamplings->avg('avg_weight_g') ?? 0, 1),
                'average_cycle_days' => round($cycleDurations->avg() ?? 0, 1),
                'settlement_total' => (float) BuybackCycle::sum('settlement_total'),
                'active_cycles' => BuybackCycle::where('status', '!=', 'settled')->count(),
            ],
            'atRisk' => $atRisk,
        ]);
    }
}
