<?php

namespace App\Http\Controllers;

use App\Models\BuybackCycle;
use App\Models\BuybackSampling;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BuybackController extends Controller
{
    public function index()
    {
        $cycles = BuybackCycle::with(['customer', 'samplings', 'seedPo'])
            ->orderByRaw("FIELD(status, 'ready', 'scheduled', 'near_harvest', 'growing', 'stocked', 'harvested', 'settled')")
            ->orderBy('estimated_harvest_at')
            ->get();

        $mapped = $cycles->map(fn (BuybackCycle $cycle) => $this->mapCycle($cycle));

        $estimatedBiomass = $cycles->sum(function (BuybackCycle $cycle) {
            $latest = $cycle->samplings->sortByDesc('sampled_at')->first();

            return $latest ? (float) $latest->estimated_biomass_kg : 0;
        });

        $featured = $cycles->sortByDesc(fn (BuybackCycle $cycle) => $cycle->samplings->count())->first();

        return Inertia::render('Buybacks/Index', [
            'cycles' => $mapped,
            'stats' => [
                'active' => $cycles->whereNotIn('status', ['settled'])->count(),
                'near_harvest' => $cycles->whereIn('status', ['near_harvest', 'ready', 'scheduled'])->count(),
                'estimated_biomass_kg' => round($estimatedBiomass, 1),
                'estimated_value' => round($estimatedBiomass * 22000),
                'average_sr' => round($cycles->map(fn ($cycle) => (float) ($cycle->samplings->sortByDesc('sampled_at')->first()?->estimated_sr ?? 0))->avg() ?? 0, 1),
            ],
            'featured' => $featured ? $this->mapCycle($featured, true) : null,
            'upcoming' => $mapped
                ->filter(fn ($cycle) => in_array($cycle['status'], ['near_harvest', 'ready', 'scheduled'], true))
                ->sortBy('estimated_harvest_at')
                ->values(),
            'customers' => Customer::where('segment', 'kolam')
                ->whereIn('status', ['active', 'attention', 'risk'])
                ->orderBy('name')
                ->get(['id', 'name', 'city']),
            'statusOptions' => collect(BuybackCycle::STATUSES)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
        ]);
    }

    public function storeCycle(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'stocked_at' => ['required', 'date'],
            'seed_qty' => ['required', 'integer', 'min:1'],
            'seed_size' => ['nullable', 'string', 'max:50'],
            'target_abw_g' => ['required', 'numeric', 'min:1'],
            'estimated_harvest_at' => ['required', 'date', 'after:stocked_at'],
            'notes' => ['nullable', 'string'],
        ]);

        BuybackCycle::create([
            ...$data,
            'status' => 'growing',
        ]);

        return back()->with('success', 'Siklus pembesaran baru dibuat.');
    }

    public function storeSampling(Request $request)
    {
        $data = $request->validate([
            'buyback_cycle_id' => ['required', 'exists:buyback_cycles,id'],
            'sampled_at' => ['required', 'date'],
            'sample_count' => ['required', 'integer', 'min:1'],
            'avg_weight_g' => ['required', 'numeric', 'min:0'],
            'estimated_sr' => ['required', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $cycle = BuybackCycle::findOrFail($data['buyback_cycle_id']);
        $biomass = round($cycle->seed_qty * ($data['estimated_sr'] / 100) * $data['avg_weight_g'] / 1000, 2);

        BuybackSampling::create([
            'buyback_cycle_id' => $cycle->id,
            'sampled_at' => $data['sampled_at'],
            'sample_count' => $data['sample_count'],
            'avg_weight_g' => $data['avg_weight_g'],
            'estimated_sr' => $data['estimated_sr'],
            'estimated_biomass_kg' => $biomass,
            'notes' => $data['notes'] ?? null,
        ]);

        if (! in_array($cycle->status, ['scheduled', 'harvested', 'settled'], true)) {
            if ($data['avg_weight_g'] >= $cycle->target_abw_g) {
                $cycle->status = 'ready';
            } elseif ($data['avg_weight_g'] >= $cycle->target_abw_g * 0.8) {
                $cycle->status = 'near_harvest';
            } else {
                $cycle->status = 'growing';
            }

            $cycle->save();
        }

        return back()->with('success', 'Sampling dicatat. Estimasi biomassa '.number_format($biomass, 2, ',', '.').' kg.');
    }

    public function schedule(Request $request)
    {
        $data = $request->validate([
            'buyback_cycle_id' => ['required', 'exists:buyback_cycles,id'],
            'estimated_harvest_at' => ['required', 'date'],
            'price_per_kg' => ['required', 'numeric', 'min:0'],
            'grade' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
        ]);

        $cycle = BuybackCycle::findOrFail($data['buyback_cycle_id']);
        $cycle->update([
            'status' => 'scheduled',
            'estimated_harvest_at' => $data['estimated_harvest_at'],
            'price_per_kg' => $data['price_per_kg'],
            'grade' => $data['grade'] ?? 'Grade A',
            'notes' => $data['notes'] ?? $cycle->notes,
        ]);

        return back()->with('success', 'Jadwal buyback disimpan.');
    }

    public function settle(Request $request)
    {
        $data = $request->validate([
            'buyback_cycle_id' => ['required', 'exists:buyback_cycles,id'],
            'actual_harvest_kg' => ['required', 'numeric', 'min:0.01'],
            'grade' => ['required', 'string', 'max:20'],
            'price_per_kg' => ['required', 'numeric', 'min:0'],
        ]);

        $cycle = BuybackCycle::findOrFail($data['buyback_cycle_id']);
        $total = round($data['actual_harvest_kg'] * $data['price_per_kg']);

        $cycle->update([
            'status' => 'settled',
            'actual_harvest_kg' => $data['actual_harvest_kg'],
            'grade' => $data['grade'],
            'price_per_kg' => $data['price_per_kg'],
            'settlement_total' => $total,
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Buyback diselesaikan. Total settlement Rp '.number_format($total, 0, ',', '.').'.');
    }

    private function mapCycle(BuybackCycle $cycle, bool $withSamplings = false): array
    {
        $samplings = $cycle->samplings->sortBy('sampled_at')->values();
        $latest = $samplings->sortByDesc('sampled_at')->first();
        $ageDays = $cycle->stocked_at ? $cycle->stocked_at->diffInDays(today()) : 0;
        $daysToHarvest = $cycle->estimated_harvest_at ? today()->diffInDays($cycle->estimated_harvest_at, false) : null;

        $data = [
            'id' => $cycle->id,
            'customer' => [
                'id' => $cycle->customer->id,
                'name' => $cycle->customer->name,
                'city' => $cycle->customer->city,
                'segment' => $cycle->customer->segment,
            ],
            'stocked_at' => optional($cycle->stocked_at)->toDateString(),
            'stocked_label' => optional($cycle->stocked_at)->translatedFormat('d M Y'),
            'seed_qty' => $cycle->seed_qty,
            'seed_size' => $cycle->seed_size,
            'target_abw_g' => (float) $cycle->target_abw_g,
            'estimated_harvest_at' => optional($cycle->estimated_harvest_at)->toDateString(),
            'estimated_harvest_label' => optional($cycle->estimated_harvest_at)->translatedFormat('d M Y'),
            'status' => $cycle->status,
            'status_label' => $cycle->status_label,
            'age_days' => $ageDays,
            'days_to_harvest' => $daysToHarvest,
            'latest_sampling' => $latest ? [
                'sampled_at' => optional($latest->sampled_at)->toDateString(),
                'sampled_label' => optional($latest->sampled_at)->translatedFormat('d M Y'),
                'avg_weight_g' => (float) $latest->avg_weight_g,
                'estimated_sr' => (float) $latest->estimated_sr,
                'estimated_biomass_kg' => (float) $latest->estimated_biomass_kg,
            ] : null,
            'actual_harvest_kg' => (float) ($cycle->actual_harvest_kg ?? 0),
            'grade' => $cycle->grade,
            'price_per_kg' => (float) ($cycle->price_per_kg ?? 0),
            'settlement_total' => (float) ($cycle->settlement_total ?? 0),
            'seed_po' => $cycle->seedPo ? $cycle->seedPo->number : null,
        ];

        if ($withSamplings) {
            $data['samplings'] = $samplings->map(fn (BuybackSampling $sampling) => [
                'id' => $sampling->id,
                'sampled_at' => optional($sampling->sampled_at)->toDateString(),
                'sampled_label' => optional($sampling->sampled_at)->translatedFormat('d M'),
                'avg_weight_g' => (float) $sampling->avg_weight_g,
                'estimated_sr' => (float) $sampling->estimated_sr,
                'estimated_biomass_kg' => (float) $sampling->estimated_biomass_kg,
            ]);
        }

        return $data;
    }
}
