<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Customer;
use App\Models\CustomerProfile;
use App\Models\FollowUp;
use App\Models\Interaction;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeadController extends Controller
{
    public function index()
    {
        $leads = Lead::with('owner')->orderByDesc('estimated_value')->get();

        $stages = collect(Lead::STAGES)
            ->only(['new', 'contacted', 'sample_survey', 'quoted', 'negotiation'])
            ->map(function ($label, $key) use ($leads) {
                $stageLeads = $leads->where('stage', $key)->values();

                return [
                    'key' => $key,
                    'label' => $label,
                    'count' => $stageLeads->count(),
                    'value' => (float) $stageLeads->sum('estimated_value'),
                    'leads' => $stageLeads->map(fn (Lead $lead) => $this->mapLead($lead))->values(),
                ];
            })
            ->values();

        $won = Lead::where('stage', 'won')->count();
        $lost = Lead::where('stage', 'lost')->count();

        $lostReasons = Lead::where('stage', 'lost')
            ->selectRaw('lost_reason, COUNT(*) as total')
            ->groupBy('lost_reason')
            ->get()
            ->map(fn ($row) => [
                'key' => $row->lost_reason,
                'label' => Lead::LOST_REASONS[$row->lost_reason] ?? ($row->lost_reason ?: 'Lainnya'),
                'count' => (int) $row->total,
                'percentage' => $lost ? (int) round($row->total / $lost * 100) : 0,
            ]);

        $sources = Lead::selectRaw("COALESCE(source, 'Lainnya') as source, COUNT(*) as total, SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won")
            ->groupBy('source')
            ->get()
            ->map(fn ($row) => [
                'source' => $row->source,
                'total' => (int) $row->total,
                'won' => (int) $row->won,
                'conversion' => $row->total ? (int) round($row->won / $row->total * 100) : 0,
            ]);

        return Inertia::render('Leads/Index', [
            'stages' => $stages,
            'stats' => [
                'active' => $leads->whereNotIn('stage', ['won', 'lost'])->count(),
                'pipeline_value' => (float) $leads->whereNotIn('stage', ['won', 'lost'])->sum('estimated_value'),
                'win_rate' => ($won + $lost) ? (int) round($won / ($won + $lost) * 100) : 0,
                'won' => $won,
                'lost' => $lost,
                'overdue_followups' => Lead::active()->whereNotNull('next_follow_up_at')->where('next_follow_up_at', '<', now())->count(),
            ],
            'lostReasons' => $lostReasons,
            'sources' => $sources,
            'owners' => \App\Models\User::orderBy('name')->get(['id', 'name']),
            'stageOptions' => collect(Lead::STAGES)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'segment' => ['required', 'in:mbg,kolam'],
            'source' => ['nullable', 'string', 'max:100'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'phone' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:100'],
            'next_follow_up_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $lead = Lead::create([
            'name' => $data['name'],
            'segment' => $data['segment'],
            'source' => $data['source'] ?? 'Manual',
            'stage' => 'new',
            'estimated_value' => $data['estimated_value'] ?? 0,
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
            'phone' => $data['phone'] ?? null,
            'city' => $data['city'] ?? null,
            'next_follow_up_at' => $data['next_follow_up_at'] ?? now()->addDay(),
            'notes' => $data['notes'] ?? null,
        ]);

        FollowUp::create([
            'lead_id' => $lead->id,
            'title' => 'Kontak awal lead '.$lead->name,
            'due_at' => Carbon::parse($data['next_follow_up_at'] ?? now()->addDay())->setTime(9, 0),
            'priority' => 'high',
            'status' => 'open',
            'assigned_to' => $lead->owner_id,
        ]);

        return back()->with('success', 'Lead baru ditambahkan ke pipeline.');
    }

    public function updateStage(Request $request, Lead $lead)
    {
        $data = $request->validate([
            'stage' => ['required', 'in:new,contacted,sample_survey,quoted,negotiation,won,lost,nurture'],
            'lost_reason' => ['nullable', 'string', 'max:100'],
        ]);

        if ($data['stage'] === 'won' && ! $lead->converted_customer_id) {
            $nextId = ((int) Customer::max('id')) + 1;
            $customer = Customer::create([
                'code' => 'CUST-'.str_pad((string) $nextId, 3, '0', STR_PAD_LEFT),
                'name' => $lead->name,
                'segment' => $lead->segment,
                'status' => 'active',
                'source' => $lead->source,
                'owner_id' => $lead->owner_id,
                'phone' => $lead->phone,
                'city' => $lead->city,
                'health_score' => 85,
                'lifetime_value' => 0,
                'notes' => $lead->notes,
            ]);

            Contact::create([
                'customer_id' => $customer->id,
                'name' => $lead->name,
                'role' => 'PIC',
                'phone' => $lead->phone,
                'is_primary' => true,
                'wa_opt_in' => true,
            ]);

            CustomerProfile::create([
                'customer_id' => $customer->id,
                'payment_terms_days' => 14,
            ]);

            Interaction::create([
                'customer_id' => $customer->id,
                'type' => 'note',
                'body' => 'Pelanggan dibuat dari konversi lead '.$lead->name.'.',
                'outcome' => 'Lead menang',
                'created_by' => $request->user()->id,
            ]);

            $lead->converted_customer_id = $customer->id;
        }

        $lead->stage = $data['stage'];
        $lead->lost_reason = $data['stage'] === 'lost' ? ($data['lost_reason'] ?? 'lainnya') : null;
        $lead->next_follow_up_at = in_array($data['stage'], ['won', 'lost'], true) ? null : $lead->next_follow_up_at;
        $lead->save();

        return back()->with('success', 'Tahap lead diperbarui.');
    }

    private function mapLead(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'name' => $lead->name,
            'segment' => $lead->segment,
            'segment_label' => Customer::SEGMENTS[$lead->segment] ?? $lead->segment,
            'source' => $lead->source,
            'stage' => $lead->stage,
            'stage_label' => $lead->stage_label,
            'estimated_value' => (float) $lead->estimated_value,
            'owner' => $lead->owner?->name,
            'owner_id' => $lead->owner_id,
            'phone' => $lead->phone,
            'city' => $lead->city,
            'next_follow_up_at' => optional($lead->next_follow_up_at)->toIso8601String(),
            'next_follow_up_label' => optional($lead->next_follow_up_at)->translatedFormat('d M, H.i'),
            'is_overdue' => $lead->next_follow_up_at?->isPast() ?? false,
            'notes' => $lead->notes,
            'lost_reason' => $lead->lost_reason,
        ];
    }
}
