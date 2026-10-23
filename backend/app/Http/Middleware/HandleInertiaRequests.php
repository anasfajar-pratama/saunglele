<?php

namespace App\Http\Middleware;

use App\Models\BuybackCycle;
use App\Models\Customer;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'navCounts' => $user ? [
                'customers' => Customer::whereIn('status', ['active', 'attention', 'risk'])->count(),
                'leads' => Lead::active()->count(),
                'pos' => PurchaseOrder::whereNotIn('status', ['completed', 'cancelled'])->count(),
                'buybacks' => BuybackCycle::where('status', '!=', 'settled')->count(),
                'followups_today' => FollowUp::open()->whereDate('due_at', '<=', today())->count(),
                'followups_overdue' => FollowUp::open()->whereDate('due_at', '<', today())->count(),
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'todayLabel' => now()->locale('id')->translatedFormat('l, j F Y'),
        ];
    }
}
