<?php

use App\Http\Controllers\BuybackController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\MessageTemplateController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicDocumentController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

Route::get('/share/quotation/{token}', [PublicDocumentController::class, 'quotation'])
    ->middleware('throttle:60,1')
    ->name('public.quotations.show');
Route::get('/share/po/{token}', [PublicDocumentController::class, 'purchaseOrder'])
    ->middleware('throttle:60,1')
    ->name('public.purchase-orders.show');
Route::get('/share/invoice/{token}', [PublicDocumentController::class, 'invoice'])
    ->middleware('throttle:60,1')
    ->name('public.invoices.show');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::patch('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::post('/customers/{customer}/interactions', [CustomerController::class, 'storeInteraction'])->name('customers.interactions.store');
    Route::post('/customers/{customer}/messages', [CustomerController::class, 'storeMessage'])->name('customers.messages.store');
    Route::patch('/follow-ups/{followUp}/complete', [CustomerController::class, 'completeFollowUp'])->name('follow-ups.complete');
    Route::patch('/follow-ups/{followUp}/snooze', [CustomerController::class, 'snoozeFollowUp'])->name('follow-ups.snooze');

    Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
    Route::post('/leads', [LeadController::class, 'store'])->name('leads.store');
    Route::patch('/leads/{lead}/stage', [LeadController::class, 'updateStage'])->name('leads.stage');

    Route::get('/templates', [MessageTemplateController::class, 'index'])->name('templates.index');
    Route::post('/templates', [MessageTemplateController::class, 'store'])->name('templates.store');
    Route::patch('/templates/{template}', [MessageTemplateController::class, 'update'])->name('templates.update');

    Route::get('/quotations', [QuotationController::class, 'index'])->name('quotations.index');
    Route::post('/quotations', [QuotationController::class, 'store'])->name('quotations.store');
    Route::get('/quotations/history', [QuotationController::class, 'history'])->name('quotations.history');
    Route::get('/quotations/{quotation}/edit', [QuotationController::class, 'edit'])->name('quotations.edit');
    Route::patch('/quotations/{quotation}', [QuotationController::class, 'update'])->name('quotations.update');
    Route::get('/quotations/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
    Route::patch('/quotations/{quotation}/status', [QuotationController::class, 'updateStatus'])->name('quotations.status');

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::get('/purchase-orders/create', [PurchaseOrderController::class, 'create'])->name('purchase-orders.create');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
    Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->name('purchase-orders.show');
    Route::patch('/purchase-orders/{purchaseOrder}/status', [PurchaseOrderController::class, 'updateStatus'])->name('purchase-orders.status');
    Route::post('/purchase-orders/{purchaseOrder}/deliveries', [PurchaseOrderController::class, 'storeDelivery'])->name('purchase-orders.deliveries.store');

    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::get('/invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
    Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::get('/invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
    Route::patch('/invoices/{invoice}/status', [InvoiceController::class, 'updateStatus'])->name('invoices.status');
    Route::post('/invoices/{invoice}/payments', [InvoiceController::class, 'storePayment'])->name('invoices.payments.store');
    Route::patch('/invoices/{invoice}/payments/{payment}', [InvoiceController::class, 'updatePayment'])->name('invoices.payments.update');
    Route::delete('/invoices/{invoice}/payments/{payment}', [InvoiceController::class, 'destroyPayment'])->name('invoices.payments.destroy');
    Route::patch('/invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');

    Route::get('/buybacks', [BuybackController::class, 'index'])->name('buybacks.index');
    Route::post('/buybacks/cycles', [BuybackController::class, 'storeCycle'])->name('buybacks.cycles.store');
    Route::post('/buybacks/sampling', [BuybackController::class, 'storeSampling'])->name('buybacks.sampling.store');
    Route::post('/buybacks/schedule', [BuybackController::class, 'schedule'])->name('buybacks.schedule');
    Route::post('/buybacks/settle', [BuybackController::class, 'settle'])->name('buybacks.settle');

    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');

    Route::get('/master', [MasterDataController::class, 'index'])->name('master.index');
    Route::post('/master/products', [MasterDataController::class, 'storeProduct'])->name('master.products.store');
    Route::patch('/master/products/{product}', [MasterDataController::class, 'updateProduct'])->name('master.products.update');
    Route::post('/master/terms', [MasterDataController::class, 'storeTerm'])->name('master.terms.store');
    Route::patch('/master/terms/{quotationTerm}', [MasterDataController::class, 'updateTerm'])->name('master.terms.update');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile/document', [ProfileController::class, 'updateDocument'])->name('profile.document.update');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
