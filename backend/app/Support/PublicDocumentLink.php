<?php

namespace App\Support;

use App\Models\Invoice;
use App\Models\PublicLink;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class PublicDocumentLink
{
    private const TTL_DAYS = 30;

    private const TOKEN_LENGTH = 20;

    private const ROUTES = [
        'quotation' => 'public.quotations.show',
        'purchase-order' => 'public.purchase-orders.show',
        'invoice' => 'public.invoices.show',
    ];

    public static function quotation(Quotation $quotation): string
    {
        return self::make('quotation', $quotation->id);
    }

    public static function purchaseOrder(PurchaseOrder $purchaseOrder): string
    {
        return self::make('purchase-order', $purchaseOrder->id);
    }

    public static function invoice(Invoice $invoice): string
    {
        return self::make('invoice', $invoice->id);
    }

    /**
     * @return array{type: string, id: int, expires_at: int}
     */
    public static function decode(string $token, string $expectedType): array
    {
        $link = PublicLink::where('token', $token)
            ->where('type', $expectedType)
            ->first();

        if ($link) {
            if ($link->expires_at->isPast()) {
                abort(404);
            }

            return [
                'type' => $link->type,
                'id' => (int) $link->document_id,
                'expires_at' => $link->expires_at->getTimestamp(),
            ];
        }

        return self::decodeLegacy($token, $expectedType);
    }

    /**
     * @return array{type: string, id: int, expires_at: int}
     */
    private static function decodeLegacy(string $token, string $expectedType): array
    {
        $normalized = strtr($token, '-_', '+/');
        $padding = strlen($normalized) % 4;

        if ($padding > 0) {
            $normalized .= str_repeat('=', 4 - $padding);
        }

        try {
            $encrypted = base64_decode($normalized, true);

            if ($encrypted === false) {
                abort(404);
            }

            $payload = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            abort(404);
        }

        if (($payload['type'] ?? null) !== $expectedType
            || ! isset($payload['id'], $payload['expires_at'])
            || (int) $payload['expires_at'] < now()->getTimestamp()) {
            abort(404);
        }

        return [
            'type' => (string) $payload['type'],
            'id' => (int) $payload['id'],
            'expires_at' => (int) $payload['expires_at'],
        ];
    }

    private static function make(string $type, int $id): string
    {
        $link = PublicLink::firstOrNew([
            'type' => $type,
            'document_id' => $id,
        ]);

        if (! $link->exists || $link->expires_at->isPast()) {
            $link->token = self::freshToken();
            $link->expires_at = now()->addDays(self::TTL_DAYS);
            $link->save();
        }

        return route(self::ROUTES[$type], ['token' => $link->token]);
    }

    private static function freshToken(): string
    {
        do {
            $token = Str::random(self::TOKEN_LENGTH);
        } while (PublicLink::where('token', $token)->exists());

        return $token;
    }
}
