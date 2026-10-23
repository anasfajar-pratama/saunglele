<?php

namespace Database\Seeders;

use App\Models\QuotationTerm;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $terms = [
            [
                'name' => 'Standar Quotation',
                'body' => "Berlaku 7 hari sejak tanggal quotation.\nPembayaran 14 hari setelah invoice.\nPengiriman Selasa & Jumat, pukul 05.00–07.00.\nMinimum order 50 kg untuk produk konsumsi.\nHarga dapat berubah bila volume berubah.",
                'is_default' => true,
                'is_active' => true,
            ],
            [
                'name' => 'Pembayaran 7 Hari',
                'body' => "Berlaku 7 hari sejak tanggal quotation.\nPembayaran 7 hari setelah invoice.\nPengiriman sesuai jadwal yang disepakati.\nHarga belum termasuk ongkir bila di luar area layanan.",
                'is_default' => false,
                'is_active' => true,
            ],
            [
                'name' => 'Penawaran Bibit',
                'body' => "Berlaku 14 hari sejak tanggal quotation.\nPembayaran 7 hari setelah invoice.\nBibit dikirim sesuai ukuran dan jumlah yang disepakati.\nKlaim bibit mati maksimal 1×24 jam setelah diterima dengan bukti foto.\nKuota tebar mengikuti ketersediaan stok.",
                'is_default' => false,
                'is_active' => true,
            ],
        ];

        foreach ($terms as $term) {
            QuotationTerm::updateOrCreate(
                ['name' => $term['name']],
                $term
            );
        }
    }
}
