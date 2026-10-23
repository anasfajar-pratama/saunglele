<?php

namespace App\Http\Controllers;

use App\Models\MessageTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MessageTemplateController extends Controller
{
    public function index()
    {
        $templates = MessageTemplate::orderBy('category')->orderBy('name')->get();

        $categories = collect([
            ['key' => 'all', 'label' => 'Semua', 'count' => $templates->count()],
        ])->merge(
            collect(MessageTemplate::CATEGORIES)
                ->map(fn ($label, $key) => [
                    'key' => $key,
                    'label' => $label,
                    'count' => $templates->where('category', $key)->count(),
                ])
                ->values()
        );

        return Inertia::render('Templates/Index', [
            'templates' => $templates->map(fn (MessageTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'category' => $template->category,
                'category_label' => MessageTemplate::CATEGORIES[$template->category] ?? $template->category,
                'segment' => $template->segment,
                'segment_label' => $template->segment === 'all' ? 'Semua segmen' : (['mbg' => 'Dapur MBG', 'kolam' => 'Kolam Pembesaran'][$template->segment] ?? $template->segment),
                'body' => $template->body,
                'variables' => $template->variables ?? [],
                'usage_count' => $template->usage_count,
                'is_active' => $template->is_active,
            ]),
            'categories' => $categories,
            'total' => $templates->count(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        MessageTemplate::create($data);

        return back()->with('success', 'Template pesan baru disimpan.');
    }

    public function update(Request $request, MessageTemplate $template)
    {
        $data = $this->validated($request);

        $template->update($data);

        return back()->with('success', 'Template pesan diperbarui.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:'.implode(',', array_keys(MessageTemplate::CATEGORIES))],
            'segment' => ['required', 'in:all,mbg,kolam'],
            'body' => ['required', 'string'],
            'variables' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $variables = collect(explode(',', $data['variables'] ?? ''))
            ->map(fn ($variable) => trim($variable))
            ->filter()
            ->values()
            ->all();

        return [
            'name' => $data['name'],
            'category' => $data['category'],
            'segment' => $data['segment'],
            'body' => $data['body'],
            'variables' => $variables,
            'is_active' => $request->boolean('is_active', true),
        ];
    }
}
