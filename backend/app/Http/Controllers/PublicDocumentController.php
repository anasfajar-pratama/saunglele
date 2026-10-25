<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Support\PublicDocumentLink;
use Carbon\Carbon;
use Illuminate\Contracts\View\View;

class PublicDocumentController extends Controller
{
    public function quotation(string $token): View
    {
        $payload = PublicDocumentLink::decode($token, 'quotation');

        $quotation = Quotation::with(['customer.primaryContact', 'items.product', 'creator'])
            ->findOrFail($payload['id']);

        return view('public.quotation', [
            'quotation' => $quotation,
            'expiresAt' => Carbon::createFromTimestamp($payload['expires_at']),
        ]);
    }

    public function purchaseOrder(string $token): View
    {
        $payload = PublicDocumentLink::decode($token, 'purchase-order');

        $purchaseOrder = PurchaseOrder::with(['customer.primaryContact', 'quotation', 'items.product', 'deliveries'])
            ->findOrFail($payload['id']);

        return view('public.purchase-order', [
            'purchaseOrder' => $purchaseOrder,
            'expiresAt' => Carbon::createFromTimestamp($payload['expires_at']),
        ]);
    }

    public function invoice(string $token): View
    {
        $payload = PublicDocumentLink::decode($token, 'invoice');

        $invoice = Invoice::with(['customer.primaryContact', 'purchaseOrder', 'quotation', 'items.product', 'creator', 'payments'])
            ->findOrFail($payload['id']);

        return view('public.invoice', [
            'invoice' => $invoice,
            'expiresAt' => Carbon::createFromTimestamp($payload['expires_at']),
        ]);
    }
}
