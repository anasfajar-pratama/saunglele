<?php

namespace App\Support;

use App\Models\PurchaseOrder;
use App\Models\Quotation;
use Illuminate\Support\Facades\Crypt;

class PublicDocumentLink
{
    private const TTL_DAYS = 30;

    public static function quotation(Quotation $quotation): string
    {
        return self::make('quotation', $quotation->id);
    }

    public static function purchaseOrder(PurchaseOrder $purchaseOrder): string
    {
        return self::make('purchase-order', $purchaseOrder->id);
    }

    /**
     * @return array{type: string, id: int, expires_at: int}
     */
    public static function decode(string $token, string $expectedType): array
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
        $payload = json_encode([
            'type' => $type,
            'id' => $id,
            'expires_at' => now()->addDays(self::TTL_DAYS)->getTimestamp(),
        ], JSON_THROW_ON_ERROR);

        $token = rtrim(strtr(base64_encode(Crypt::encryptString($payload)), '+/', '-_'), '=');

        return route($type === 'quotation' ? 'public.quotations.show' : 'public.purchase-orders.show', [
            'token' => $token,
        ]);
    }
}
