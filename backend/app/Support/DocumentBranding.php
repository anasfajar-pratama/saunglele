<?php

namespace App\Support;

use App\Models\DocumentSetting;

class DocumentBranding
{
    public const DEFAULT_TITLE = 'Saung Lele Karawang';

    public const DEFAULT_SUBTITLE = 'Ternak dan Jual Beli Lele - Karawang';

    public const DEFAULT_LOGO = '/kebunkode.jpg';

    /**
     * @return array{title: string, subtitle: string, logo_url: string}
     */
    public static function current(): array
    {
        $setting = self::setting();

        return [
            'title' => $setting->title ?: self::DEFAULT_TITLE,
            'subtitle' => $setting->subtitle ?: self::DEFAULT_SUBTITLE,
            'logo_url' => $setting->logo_path ?: self::DEFAULT_LOGO,
        ];
    }

    public static function setting(): DocumentSetting
    {
        return DocumentSetting::query()->firstOrCreate([], [
            'title' => self::DEFAULT_TITLE,
            'subtitle' => self::DEFAULT_SUBTITLE,
            'logo_path' => self::DEFAULT_LOGO,
        ]);
    }
}
