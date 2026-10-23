<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\QuotationTerm;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MasterDataController extends Controller
{
    public function index()
    {
        return Inertia::render('Master/Index', [
            'products' => Product::orderBy('category')->orderBy('name')->get()->map(fn (Product $product) => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category,
                'category_label' => Product::CATEGORIES[$product->category] ?? $product->category,
                'size_grade' => $product->size_grade,
                'unit' => $product->unit,
                'base_price' => (float) $product->base_price,
                'is_active' => $product->is_active,
            ]),
            'terms' => QuotationTerm::orderByDesc('is_default')->latest()->get()->map(fn (QuotationTerm $term) => [
                'id' => $term->id,
                'name' => $term->name,
                'body' => $term->body,
                'is_default' => $term->is_default,
                'is_active' => $term->is_active,
            ]),
            'categories' => collect(Product::CATEGORIES)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values(),
        ]);
    }

    public function storeProduct(Request $request)
    {
        $data = $this->validateProduct($request);
        Product::create([...$data, 'is_active' => $request->boolean('is_active', true)]);

        return back()->with('success', 'Produk berhasil ditambahkan.');
    }

    public function updateProduct(Request $request, Product $product)
    {
        $data = $this->validateProduct($request, $product);
        $product->update([...$data, 'is_active' => $request->boolean('is_active', true)]);

        return back()->with('success', 'Produk berhasil diperbarui.');
    }

    public function storeTerm(Request $request)
    {
        $data = $this->validateTerm($request);
        $isDefault = $request->boolean('is_default');

        if ($isDefault) {
            QuotationTerm::query()->update(['is_default' => false]);
        }

        QuotationTerm::create([
            'name' => $data['name'],
            'body' => $data['body'],
            'is_default' => $isDefault,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Template syarat & ketentuan berhasil ditambahkan.');
    }

    public function updateTerm(Request $request, QuotationTerm $quotationTerm)
    {
        $data = $this->validateTerm($request);
        $isDefault = $request->boolean('is_default');

        if ($isDefault) {
            QuotationTerm::where('id', '!=', $quotationTerm->id)->update(['is_default' => false]);
        }

        $quotationTerm->update([
            'name' => $data['name'],
            'body' => $data['body'],
            'is_default' => $isDefault,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Template syarat & ketentuan berhasil diperbarui.');
    }

    private function validateProduct(Request $request, ?Product $product = null): array
    {
        return $request->validate([
            'sku' => ['required', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product?->id)],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'in:'.implode(',', array_keys(Product::CATEGORIES))],
            'size_grade' => ['nullable', 'string', 'max:100'],
            'unit' => ['required', 'in:kg,ekor'],
            'base_price' => ['required', 'numeric', 'min:0'],
        ]);
    }

    private function validateTerm(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);
    }
}
