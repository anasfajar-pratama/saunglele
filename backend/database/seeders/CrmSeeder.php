<?php

namespace Database\Seeders;

use App\Models\BuybackCycle;
use App\Models\BuybackSampling;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\CustomerProfile;
use App\Models\Delivery;
use App\Models\FollowUp;
use App\Models\Interaction;
use App\Models\Lead;
use App\Models\Message;
use App\Models\MessageTemplate;
use App\Models\PoStatusHistory;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CrmSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $today = Carbon::parse('2026-10-21 08:00:00');

            $owner = $this->user('Saung Lele', 'owner@saunglele.test', 'owner', '0812-9000-0001');
            $rizky = $this->user('Rizky', 'rizky@saunglele.test', 'sales', '0812-9000-0002');
            $dina = $this->user('Dina', 'dina@saunglele.test', 'sales', '0812-9000-0003');
            $admin = $this->user('Admin', 'admin@saunglele.test', 'admin', '0812-9000-0004');
            $wati = $this->user('Wati', 'wati@saunglele.test', 'production', '0812-9000-0005');
            $finance = $this->user('Keuangan', 'finance@saunglele.test', 'finance', '0812-9000-0006');

            $products = $this->products();
            $templates = $this->templates();

            $customers = $this->customers($today, $rizky, $dina, $admin);

            $this->leads($today, $rizky, $dina);
            $this->followUps($today, $customers, $rizky, $dina, $admin);
            $this->historicalFollowUps($today, $customers, $rizky, $dina, $admin);
            $this->interactions($today, $customers, $rizky, $dina, $admin);
            $this->messages($today, $customers, $templates, $rizky);

            $quotations = $this->quotations($today, $customers, $products, $rizky);
            $pos = $this->purchaseOrders($today, $customers, $products, $quotations, $admin, $wati);

            $historical = $this->historicalSeedPos($today, $customers, $products, $admin);
            $pos = array_merge($pos, $historical);

            $this->buybackCycles($today, $customers, $pos);

            $this->command->info('CRM demo data seeded.');
            $this->command->info('Login: owner@saunglele.test / password');
            $this->command->info('Sales: rizky@saunglele.test / password');
        });
    }

    private function user(string $name, string $email, string $role, string $phone): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password'),
            'role' => $role,
            'phone' => $phone,
        ]);

        $user->email_verified_at = now();
        $user->save();

        return $user;
    }

    private function products(): array
    {
        $rows = [
            ['LELE-MASAK-250', 'Lele Siap Masak Bersih', 'consumption', '250–300 g/ekor', 'kg', 26000],
            ['FILLET-200', 'Fillet Lele', 'fillet', '200–250 g/pcs', 'kg', 48000],
            ['LELE-PREMIUM-300', 'Lele Siap Masak Premium', 'consumption', '300–400 g/ekor', 'kg', 29000],
            ['BIBIT-2-3', 'Bibit Lele 2–3 cm', 'seed', '2–3 cm', 'ekor', 350],
            ['BIBIT-3-5', 'Bibit Lele 3–5 cm', 'seed', '3–5 cm', 'ekor', 550],
            ['BIBIT-5-7', 'Bibit Lele 5–7 cm', 'seed', '5–7 cm', 'ekor', 800],
        ];

        $products = [];
        foreach ($rows as [$sku, $name, $category, $grade, $unit, $price]) {
            $products[$sku] = Product::create([
                'sku' => $sku,
                'name' => $name,
                'category' => $category,
                'size_grade' => $grade,
                'unit' => $unit,
                'base_price' => $price,
                'is_active' => true,
            ]);
        }

        return $products;
    }

    private function templates(): array
    {
        $rows = [
            [
                'name' => 'Follow-up quotation',
                'category' => 'followup',
                'segment' => 'mbg',
                'body' => 'Selamat pagi Bapak/Ibu {{nama}}, saya {{nama_sales}} dari Saung Lele. Quotation {{no_quotation}} untuk {{produk}} sudah saya kirimkan. Apakah ada yang ingin disesuaikan sebelum kami siapkan jadwal kirim? Terima kasih.',
                'variables' => ['nama', 'nama_sales', 'no_quotation', 'produk'],
                'usage_count' => 42,
            ],
            [
                'name' => 'Follow-up setelah sample',
                'category' => 'followup',
                'segment' => 'mbg',
                'body' => 'Selamat pagi Bapak/Ibu {{nama}}, sample {{produk}} sudah kami kirim. Bagaimana hasil evaluasinya untuk menu {{nama_usaha}}? Kami siap menyesuaikan ukuran atau volume.',
                'variables' => ['nama', 'produk', 'nama_usaha'],
                'usage_count' => 18,
            ],
            [
                'name' => 'Follow-up mingguan mitra kolam',
                'category' => 'followup',
                'segment' => 'kolam',
                'body' => 'Halo Bapak {{nama}}, bagaimana kondisi kolam di {{nama_usaha}}? Kami ingin memastikan pertumbuhan ikan tetap sesuai target. Apakah bisa sampling bersama minggu ini?',
                'variables' => ['nama', 'nama_usaha'],
                'usage_count' => 26,
            ],
            [
                'name' => 'Penawaran bibit siklus baru',
                'category' => 'penawaran',
                'segment' => 'kolam',
                'body' => 'Halo Bapak {{nama}}, untuk siklus berikutnya kami siapkan bibit lele {{qty}} dengan harga {{harga}}. Minimal 10.000 ekor. Apakah Bapak ingin mengunci kuota untuk tebar bulan depan?',
                'variables' => ['nama', 'qty', 'harga'],
                'usage_count' => 14,
            ],
            [
                'name' => 'Quotation terkirim',
                'category' => 'quotation',
                'segment' => 'mbg',
                'body' => 'Selamat pagi Bapak/Ibu {{nama}}, quotation {{no_quotation}} sudah kami kirim. Total {{harga}} untuk {{produk}}. Berlaku sampai {{tanggal}}. Apakah sudah sesuai?',
                'variables' => ['nama', 'no_quotation', 'harga', 'produk', 'tanggal'],
                'usage_count' => 31,
            ],
            [
                'name' => 'Konfirmasi PO diterima',
                'category' => 'po',
                'segment' => 'all',
                'body' => 'Terima kasih Bapak/Ibu {{nama}}, PO {{no_po}} sudah kami terima dan konfirmasi. Pesanan {{produk}} dijadwalkan kirim {{tanggal_kirim}}. Tim kami akan mengupdate progresnya.',
                'variables' => ['nama', 'no_po', 'produk', 'tanggal_kirim'],
                'usage_count' => 27,
            ],
            [
                'name' => 'Update pengiriman',
                'category' => 'pengiriman',
                'segment' => 'mbg',
                'body' => 'Bapak/Ibu {{nama}}, pesanan {{no_po}} sedang dalam perjalanan. Estimasi tiba pukul {{jam}}. Driver: {{driver}}. Mohon siapkan tim penerima.',
                'variables' => ['nama', 'no_po', 'jam', 'driver'],
                'usage_count' => 38,
            ],
            [
                'name' => 'Jadwal buyback',
                'category' => 'buyback',
                'segment' => 'kolam',
                'body' => 'Halo Bapak {{nama}}, berdasarkan sampling terakhir, ikan di kolam sudah mendekati ukuran panen. Kami ingin menjadwalkan buyback pada {{tanggal}}. Apakah hari itu cocok? Kami akan bawa tim timbang dan grading.',
                'variables' => ['nama', 'tanggal'],
                'usage_count' => 12,
            ],
            [
                'name' => 'Konfirmasi pembayaran',
                'category' => 'pembayaran',
                'segment' => 'all',
                'body' => 'Terima kasih Bapak/Ibu {{nama}}, pembayaran untuk {{no_po}} sebesar {{harga}} sudah kami terima. Invoice akan kami kirimkan sebagai bukti.',
                'variables' => ['nama', 'no_po', 'harga'],
                'usage_count' => 9,
            ],
            [
                'name' => 'Ucapan terima kasih',
                'category' => 'retensi',
                'segment' => 'all',
                'body' => 'Terima kasih Bapak/Ibu {{nama}} sudah menjadi mitra Saung Lele. Kami senang bisa mendukung kebutuhan {{nama_usaha}}. Jika ada kebutuhan mendadak, tim kami siap membantu.',
                'variables' => ['nama', 'nama_usaha'],
                'usage_count' => 20,
            ],
            [
                'name' => 'Win-back 60 hari',
                'category' => 'winback',
                'segment' => 'all',
                'body' => 'Halo Bapak/Ibu {{nama}}, sudah 60 hari sejak order terakhir. Kami ingin memastikan kebutuhan {{produk}} masih berjalan. Apakah ada menu atau siklus baru yang bisa kami bantu?',
                'variables' => ['nama', 'produk'],
                'usage_count' => 8,
            ],
        ];

        $templates = [];
        foreach ($rows as $row) {
            $templates[$row['name']] = MessageTemplate::create([...$row, 'is_active' => true]);
        }

        return $templates;
    }

    private function customers(Carbon $today, User $rizky, User $dina, User $admin): array
    {
        $rows = [
            [
                'code' => 'CUST-001',
                'name' => 'Dapur MBG Nusantara 03',
                'segment' => 'mbg',
                'status' => 'attention',
                'source' => 'Referensi',
                'owner_id' => $rizky->id,
                'phone' => '0812-3456-7890',
                'email' => 'nusantara03@example.test',
                'city' => 'Semarang',
                'address' => 'Jl. Nusantara Raya No. 12, Semarang',
                'health_score' => 58,
                'lifetime_value' => 42600000,
                'last_order_at' => $today->copy()->subDays(34),
                'notes' => 'Pola order 2x per minggu. Sedang mengevaluasi sample fillet 250 g.',
                'profile' => [
                    'kitchen_capacity' => 1000,
                    'delivery_window' => 'Selasa & Jumat, 05.00–07.00',
                    'certifications' => 'Halal, NKV',
                    'payment_terms_days' => 14,
                    'preferred_products' => 'Fillet 250 g, ikan siap masak',
                    'delivery_days' => 'Selasa, Jumat',
                ],
                'contact' => ['Ahmad Fauzi', 'Kepala Dapur', '0812-3456-7890'],
                'second_contact' => ['Rina Wati', 'Admin & Pembelian', '0812-3456-7891'],
            ],
            [
                'code' => 'CUST-002',
                'name' => 'SPPG Kec. Tembalang',
                'segment' => 'mbg',
                'status' => 'active',
                'source' => 'Referensi',
                'owner_id' => $rizky->id,
                'phone' => '0813-2211-8899',
                'city' => 'Semarang',
                'address' => 'Jl. Tembalang Raya No. 8, Semarang',
                'health_score' => 88,
                'lifetime_value' => 28400000,
                'last_order_at' => $today->copy()->subDays(2),
                'profile' => [
                    'kitchen_capacity' => 1200,
                    'delivery_window' => 'Setiap hari, 05.00–06.30',
                    'certifications' => 'Halal, NKV',
                    'payment_terms_days' => 14,
                    'preferred_products' => 'Ikan siap masak 250–300 g',
                    'delivery_days' => 'Senin–Sabtu',
                ],
                'contact' => ['Nur Aini', 'Kepala SPPG', '0813-2211-8899'],
            ],
            [
                'code' => 'CUST-003',
                'name' => 'Dapur MBG Ceria Banyumanik',
                'segment' => 'mbg',
                'status' => 'active',
                'source' => 'WhatsApp',
                'owner_id' => $rizky->id,
                'phone' => '0812-9988-7766',
                'city' => 'Semarang',
                'address' => 'Jl. Banyumanik No. 21, Semarang',
                'health_score' => 84,
                'lifetime_value' => 19800000,
                'last_order_at' => $today->copy()->subDays(5),
                'profile' => [
                    'kitchen_capacity' => 800,
                    'delivery_window' => 'Selasa & Jumat, 05.30–07.00',
                    'certifications' => 'Halal',
                    'payment_terms_days' => 14,
                    'preferred_products' => 'Fillet dan siap masak',
                    'delivery_days' => 'Selasa, Jumat',
                ],
                'contact' => ['Rina Wati', 'Admin Dapur', '0812-9988-7766'],
            ],
            [
                'code' => 'CUST-004',
                'name' => 'SPPG Pedurungan',
                'segment' => 'mbg',
                'status' => 'attention',
                'source' => 'Kunjungan lapangan',
                'owner_id' => $dina->id,
                'phone' => '0813-5566-7788',
                'city' => 'Semarang',
                'address' => 'Jl. Pedurungan Tengah No. 5, Semarang',
                'health_score' => 61,
                'lifetime_value' => 24700000,
                'last_order_at' => $today->copy()->subDays(41),
                'profile' => [
                    'kitchen_capacity' => 900,
                    'delivery_window' => 'Rabu & Sabtu, 05.00–07.00',
                    'certifications' => 'Halal, NKV',
                    'payment_terms_days' => 14,
                    'preferred_products' => 'Ikan siap masak',
                    'delivery_days' => 'Rabu, Sabtu',
                ],
                'contact' => ['Yuliana Sari', 'Kepala Dapur', '0813-5566-7788'],
            ],
            [
                'code' => 'CUST-005',
                'name' => 'Dapur MBG Sehat Mandiri',
                'segment' => 'mbg',
                'status' => 'attention',
                'source' => 'Referensi',
                'owner_id' => $admin->id,
                'phone' => '0812-1010-2020',
                'city' => 'Kendal',
                'address' => 'Jl. Raya Kendal No. 33, Kendal',
                'health_score' => 72,
                'lifetime_value' => 16400000,
                'last_order_at' => $today->copy()->subDays(22),
                'profile' => [
                    'kitchen_capacity' => 700,
                    'delivery_window' => 'Kamis, 05.30–07.00',
                    'certifications' => 'Halal',
                    'payment_terms_days' => 14,
                    'preferred_products' => 'Ikan siap masak',
                    'delivery_days' => 'Kamis',
                ],
                'contact' => ['Siti Aminah', 'Kepala Dapur', '0812-1010-2020'],
            ],
            [
                'code' => 'CUST-006',
                'name' => 'Kolam Pak Harto',
                'segment' => 'kolam',
                'status' => 'active',
                'source' => 'Referensi',
                'owner_id' => $dina->id,
                'phone' => '0857-1122-3344',
                'city' => 'Ungaran',
                'address' => 'Desa Bergas, Ungaran',
                'health_score' => 76,
                'lifetime_value' => 36100000,
                'last_order_at' => $today->copy()->subDays(12),
                'notes' => 'Mitra aktif, 6 kolam. Target ABW 180 g.',
                'profile' => [
                    'pond_area_m2' => 2400,
                    'pond_count' => 6,
                    'water_source' => 'Sungai',
                    'grow_out_capacity_kg' => 2000,
                    'target_abw_g' => 180,
                    'buyback_agreement' => 'Harga pasar grade A/B, transport ditanggung Saung Lele.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 3–5 cm',
                    'delivery_days' => 'Rabu',
                ],
                'contact' => ['Harto Wijaya', 'Pemilik Kolam', '0857-1122-3344'],
            ],
            [
                'code' => 'CUST-007',
                'name' => 'Kelompok Tani Mina Jaya',
                'segment' => 'kolam',
                'status' => 'active',
                'source' => 'WhatsApp',
                'owner_id' => $dina->id,
                'phone' => '0856-4433-2211',
                'city' => 'Demak',
                'address' => 'Desa Mijen, Demak',
                'health_score' => 69,
                'lifetime_value' => 31200000,
                'last_order_at' => $today->copy()->subDays(18),
                'profile' => [
                    'pond_area_m2' => 5600,
                    'pond_count' => 14,
                    'water_source' => 'Sungai dan sumur',
                    'grow_out_capacity_kg' => 5000,
                    'target_abw_g' => 200,
                    'buyback_agreement' => 'Buyback per siklus, harga acuan pasar grade A.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 5–7 cm',
                    'delivery_days' => 'Sabtu',
                ],
                'contact' => ['Sugeng Riyadi', 'Ketua Kelompok', '0856-4433-2211'],
            ],
            [
                'code' => 'CUST-008',
                'name' => 'Kolam Bu Endang',
                'segment' => 'kolam',
                'status' => 'active',
                'source' => 'Referensi',
                'owner_id' => $dina->id,
                'phone' => '0858-7788-9900',
                'city' => 'Salatiga',
                'address' => 'Desa Tingkir, Salatiga',
                'health_score' => 91,
                'lifetime_value' => 22500000,
                'last_order_at' => $today->copy()->subDays(9),
                'profile' => [
                    'pond_area_m2' => 1800,
                    'pond_count' => 6,
                    'water_source' => 'Mata air',
                    'grow_out_capacity_kg' => 1500,
                    'target_abw_g' => 180,
                    'buyback_agreement' => 'Harga pasar grade A/B.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 3–5 cm',
                    'delivery_days' => 'Senin',
                ],
                'contact' => ['Endang Lestari', 'Pemilik Kolam', '0858-7788-9900'],
            ],
            [
                'code' => 'CUST-009',
                'name' => 'Barokah Fish Farm',
                'segment' => 'kolam',
                'status' => 'risk',
                'source' => 'Instagram',
                'owner_id' => $admin->id,
                'phone' => '0857-9090-1122',
                'city' => 'Kendal',
                'address' => 'Desa Kaliwungu, Kendal',
                'health_score' => 48,
                'lifetime_value' => 18900000,
                'last_order_at' => $today->copy()->subDays(63),
                'notes' => 'Sampling terakhir menunjukkan SR 79%. Perlu kunjungan lapangan.',
                'profile' => [
                    'pond_area_m2' => 3200,
                    'pond_count' => 8,
                    'water_source' => 'Sumur bor',
                    'grow_out_capacity_kg' => 2500,
                    'target_abw_g' => 200,
                    'buyback_agreement' => 'Buyback grade A/B, transport ditanggung mitra.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 2–3 cm',
                    'delivery_days' => 'Kamis',
                ],
                'contact' => ['Imam Barokah', 'Pemilik', '0857-9090-1122'],
            ],
            [
                'code' => 'CUST-010',
                'name' => 'Tani Lele Makmur',
                'segment' => 'kolam',
                'status' => 'active',
                'source' => 'WhatsApp',
                'owner_id' => $dina->id,
                'phone' => '0856-3434-5656',
                'city' => 'Boyolali',
                'address' => 'Desa Mojosongo, Boyolali',
                'health_score' => 83,
                'lifetime_value' => 12800000,
                'last_order_at' => $today->copy()->subDays(7),
                'profile' => [
                    'pond_area_m2' => 1500,
                    'pond_count' => 5,
                    'water_source' => 'Sungai',
                    'grow_out_capacity_kg' => 1200,
                    'target_abw_g' => 200,
                    'buyback_agreement' => 'Harga pasar grade A/B.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 3–5 cm',
                    'delivery_days' => 'Selasa',
                ],
                'contact' => ['Joko Purnomo', 'Pemilik Kolam', '0856-3434-5656'],
            ],
            [
                'code' => 'CUST-011',
                'name' => 'Kolam Mas Budi',
                'segment' => 'kolam',
                'status' => 'active',
                'source' => 'Referensi',
                'owner_id' => $dina->id,
                'phone' => '0857-1212-3434',
                'city' => 'Genuk',
                'address' => 'Desa Genuk, Semarang',
                'health_score' => 80,
                'lifetime_value' => 15500000,
                'last_order_at' => $today->copy()->subDays(15),
                'profile' => [
                    'pond_area_m2' => 1200,
                    'pond_count' => 4,
                    'water_source' => 'Sumur bor',
                    'grow_out_capacity_kg' => 1000,
                    'target_abw_g' => 200,
                    'buyback_agreement' => 'Harga pasar grade A/B.',
                    'payment_terms_days' => 7,
                    'preferred_products' => 'Bibit 3–5 cm',
                    'delivery_days' => 'Rabu',
                ],
                'contact' => ['Budi Santoso', 'Pemilik Kolam', '0857-1212-3434'],
            ],
        ];

        $customers = [];
        $index = 0;
        foreach ($rows as $row) {
            $profile = $row['profile'];
            $contact = $row['contact'];
            $secondContact = $row['second_contact'] ?? null;

            unset($row['profile'], $row['contact'], $row['second_contact']);

            $customer = Customer::create($row);
            $createdAt = $today->copy()->subMonths(1 + ($index % 10))->setTime(9, 0);
            DB::table('customers')->where('id', $customer->id)->update([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $index++;
            CustomerProfile::create([...$profile, 'customer_id' => $customer->id]);
            Contact::create([
                'customer_id' => $customer->id,
                'name' => $contact[0],
                'role' => $contact[1],
                'phone' => $contact[2],
                'is_primary' => true,
                'wa_opt_in' => true,
            ]);

            if ($secondContact) {
                Contact::create([
                    'customer_id' => $customer->id,
                    'name' => $secondContact[0],
                    'role' => $secondContact[1],
                    'phone' => $secondContact[2],
                    'is_primary' => false,
                    'wa_opt_in' => true,
                ]);
            }

            $customers[$row['code']] = $customer;
        }

        return $customers;
    }

    private function leads(Carbon $today, User $rizky, User $dina): void
    {
        $rows = [
            ['Dapur MBG Ngaliyan', 'mbg', 'Referensi', 'new', 7200000, $rizky, '0812-1111-0001', 'Semarang', $today->copy()->setTime(14, 0), null, 'Dapur baru, 900 porsi/hari.'],
            ['Kolam Bu Rini', 'kolam', 'WhatsApp', 'new', 5400000, $dina, '0857-1111-0002', 'Salatiga', $today->copy()->addDay()->setTime(10, 0), null, 'Punya 3 kolam, butuh bibit 3–5 cm.'],
            ['SPPG Mijen', 'mbg', 'Referensi', 'contacted', 9600000, $rizky, '0813-1111-0003', 'Semarang', $today->copy()->subDay()->setTime(9, 0), null, 'Sudah kontak, minta sample fillet.'],
            ['Dapur MBG Tlogosari', 'mbg', 'WhatsApp', 'contacted', 3400000, $rizky, '0812-1111-0004', 'Semarang', $today->copy()->addDays(2)->setTime(11, 0), null, 'Volume kecil, 700 porsi/hari.'],
            ['Dapur MBG Pedurungan', 'mbg', 'Referensi', 'sample_survey', 12400000, $rizky, '0813-1111-0005', 'Semarang', $today->copy()->addDay()->setTime(9, 30), null, 'Sample fillet dikirim 20 Okt.'],
            ['Kolam Pak Slamet', 'kolam', 'Kunjungan lapangan', 'sample_survey', 6200000, $dina, '0856-1111-0006', 'Boyolali', $today->copy()->addDays(2)->setTime(13, 0), null, 'Survey 6 kolam, butuh 12.000 bibit.'],
            ['Dapur MBG Nusantara 04', 'mbg', 'Referensi', 'quoted', 10800000, $rizky, '0812-1111-0007', 'Semarang', $today->copy()->setTime(11, 0), null, 'Quotation terkirim, follow-up H+2.'],
            ['Kelompok Tani Sido Makmur', 'kolam', 'WhatsApp', 'quoted', 8400000, $dina, '0856-1111-0008', 'Demak', $today->copy()->setTime(16, 0), null, '18 anggota, penawaran bibit 3–5 cm.'],
            ['SPPG Ungaran', 'mbg', 'Referensi', 'negotiation', 9600000, $rizky, '0813-1111-0009', 'Ungaran', $today->copy()->addDay()->setTime(10, 0), null, 'Negosiasi harga fillet volume 150 kg.'],
            ['Kolam Barokah Baru', 'kolam', 'WhatsApp', 'negotiation', 4900000, $dina, '0857-1111-0010', 'Kendal', $today->copy()->addDay()->setTime(15, 0), null, 'Minta harga khusus bibit 5–7 cm.'],
            ['Dapur MBG Genuk', 'mbg', 'Kunjungan lapangan', 'lost', 6500000, $rizky, '0812-1111-0011', 'Semarang', null, 'harga', 'Kalah karena harga kompetitor lebih rendah.'],
            ['Kolam Tlogosari', 'kolam', 'Instagram', 'lost', 4200000, $dina, '0856-1111-0012', 'Semarang', null, 'lokasi', 'Terlalu jauh dari jangkauan pengiriman.'],
            ['Dapur MBG Banyumanik Lama', 'mbg', 'Referensi', 'won', 5200000, $rizky, '0812-1111-0013', 'Semarang', null, null, 'Repeat order setelah evaluasi sample.'],
            ['Kolam Pak Suroto', 'kolam', 'WhatsApp', 'won', 4800000, $dina, '0857-1111-0014', 'Ungaran', null, null, 'Mulai siklus bibit 3–5 cm.'],
            ['SPPG Genuk', 'mbg', 'Referensi', 'won', 8400000, $rizky, '0813-1111-0015', 'Semarang', null, null, 'PO pertama 200 kg siap masak.'],
            ['Kolam Bu Siti', 'kolam', 'WhatsApp', 'won', 3600000, $dina, '0856-1111-0016', 'Demak', null, null, 'Bibit 5–7 cm untuk 3 kolam.'],
            ['Dapur MBG Ungaran', 'mbg', 'Instagram', 'won', 6200000, $rizky, '0812-1111-0017', 'Ungaran', null, null, 'Repeat order fillet.'],
        ];

        foreach ($rows as [$name, $segment, $source, $stage, $value, $owner, $phone, $city, $next, $lost, $notes]) {
            Lead::create([
                'name' => $name,
                'segment' => $segment,
                'source' => $source,
                'stage' => $stage,
                'estimated_value' => $value,
                'owner_id' => $owner->id,
                'phone' => $phone,
                'city' => $city,
                'next_follow_up_at' => $next,
                'lost_reason' => $lost,
                'notes' => $notes,
            ]);
        }
    }

    private function followUps(Carbon $today, array $customers, User $rizky, User $dina, User $admin): void
    {
        $rows = [
            ['CUST-001', 'Konfirmasi kebutuhan fillet minggu depan', $today->copy()->subDays(2)->setTime(9, 0), 'high', $rizky, 'Minta spesifikasi ukuran 250 g dan jadwal kirim.'],
            ['CUST-002', 'Kirim quotation revisi volume 200 kg', $today->copy()->setTime(9, 0), 'normal', $rizky, 'Perubahan volume dari 150 kg menjadi 200 kg.'],
            ['CUST-006', 'Sampling H-60 dan cek ABW/SR', $today->copy()->setTime(10, 30), 'high', $dina, 'Siapkan jadwal buyback bila ABW mendekati target.'],
            ['CUST-007', 'Follow-up penawaran bibit siklus berikutnya', $today->copy()->setTime(13, 0), 'normal', $dina, 'Tawarkan 12.000 ekor bibit 3–5 cm.'],
            ['CUST-003', 'Cek kepuasan pengiriman & tawarkan jadwal rutin', $today->copy()->addDay()->setTime(8, 30), 'normal', $rizky, 'Tawarkan jadwal 2x per minggu.'],
            ['CUST-005', 'Konfirmasi jadwal kirim PO-2610-013', $today->copy()->subDay()->setTime(9, 0), 'high', $admin, 'PO sudah siap kirim, driver belum ditugaskan.'],
            ['CUST-009', 'Win-back: tanyakan kondisi kolam dan kebutuhan bibit', $today->copy()->subDays(5)->setTime(10, 0), 'high', $dina, 'Terakhir dihubungi 63 hari lalu.'],
            ['CUST-008', 'Jadwalkan sampling H-45', $today->copy()->addDays(3)->setTime(10, 0), 'normal', $dina, 'Cek pertumbuhan dan kualitas air.'],
            ['CUST-011', 'Konfirmasi jadwal buyback 23 Oktober', $today->copy()->addDay()->setTime(9, 0), 'high', $dina, 'Tim timbang dan harga acuan.'],
            ['CUST-010', 'Follow-up kualitas bibit', $today->copy()->addDays(4)->setTime(10, 0), 'low', $dina, 'Tanyakan SR dan pertumbuhan awal.'],
        ];

        foreach ($rows as [$code, $title, $due, $priority, $assignee, $notes]) {
            FollowUp::create([
                'customer_id' => $customers[$code]->id,
                'title' => $title,
                'due_at' => $due,
                'priority' => $priority,
                'status' => 'open',
                'assigned_to' => $assignee->id,
                'notes' => $notes,
            ]);
        }
    }

    private function historicalFollowUps(Carbon $today, array $customers, User $rizky, User $dina, User $admin): void
    {
        $customerList = array_values($customers);
        $assignees = [$rizky, $dina, $admin];

        for ($i = 0; $i < 90; $i++) {
            $customer = $customerList[$i % count($customerList)];
            $createdAt = $today->copy()->subDays($i % 29)->setTime(8 + ($i % 8), ($i * 7) % 60);
            $completedAt = $createdAt->copy()->addHours(2);

            FollowUp::forceCreate([
                'customer_id' => $customer->id,
                'title' => 'Follow-up rutin '.$customer->name,
                'due_at' => $createdAt->copy()->addDay()->setTime(9, 0),
                'priority' => $i % 5 === 0 ? 'high' : 'normal',
                'status' => 'done',
                'assigned_to' => $assignees[$i % count($assignees)]->id,
                'completed_at' => $completedAt,
                'notes' => 'Follow-up rutin terselesaikan.',
                'created_at' => $createdAt,
                'updated_at' => $completedAt,
            ]);
        }
    }

    private function interactions(Carbon $today, array $customers, User $rizky, User $dina, User $admin): void
    {
        $rows = [
            ['CUST-001', 'note', 'PIC minta sample fillet 250 g untuk evaluasi menu. Janji kirim sample Selasa, 20 Okt.', 'Sample dijanjikan 20 Okt', $today->copy()->subDays(2)->setTime(14, 20), $rizky],
            ['CUST-001', 'whatsapp', 'Template konfirmasi jadwal kirim dikirim. Pelanggan membaca dan membalas "OK, Selasa pagi ya".', 'Dibalas OK', $today->copy()->subDays(4)->setTime(9, 5), $rizky],
            ['CUST-001', 'note', 'PO-2610-011 selesai. 120 kg fillet + 80 kg siap masak diterima.', 'Diterima', $today->copy()->subDays(7)->setTime(16, 40), $admin],
            ['CUST-001', 'note', 'Quotation QUO/2610/0132 diterima via WhatsApp, dilanjutkan menjadi PO.', 'Lanjut PO', $today->copy()->subDays(11)->setTime(11, 12), $rizky],
            ['CUST-001', 'call', 'Evaluasi kualitas fillet. Pelanggan meminta harga khusus untuk volume 150 kg/minggu.', 'Minta harga volume', $today->copy()->subDays(19)->setTime(10, 30), $rizky],
            ['CUST-006', 'note', 'Sampling H-60: ABW 168 g, SR 88%. Ikan mendekati ukuran panen.', 'Jadwalkan buyback', $today->setTime(10, 30), $dina],
            ['CUST-006', 'note', 'Sampling H-60: ABW 118 g, SR 89%.', 'Pertumbuhan baik', $today->copy()->subDays(10)->setTime(10, 0), $dina],
            ['CUST-002', 'whatsapp', 'Quotation QUO/2610/0141 dikirim dan dibalas "Akan kami cek dulu".', 'Menunggu', $today->copy()->subDay()->setTime(14, 0), $rizky],
            ['CUST-009', 'call', 'Menelepon mitra. Kolam masih berjalan, tetapi sampling terakhir 2 Okt.', 'Perlu kunjungan', $today->copy()->subDays(12)->setTime(11, 0), $dina],
        ];

        foreach ($rows as [$code, $type, $body, $outcome, $at, $user]) {
            Interaction::forceCreate([
                'customer_id' => $customers[$code]->id,
                'type' => $type,
                'body' => $body,
                'outcome' => $outcome,
                'created_by' => $user->id,
                'created_at' => $at,
                'updated_at' => $at,
            ]);
        }
    }

    private function messages(Carbon $today, array $customers, array $templates, User $rizky): void
    {
        Message::create([
            'customer_id' => $customers['CUST-001']->id,
            'template_id' => $templates['Follow-up quotation']->id,
            'body' => 'Selamat pagi Bapak Ahmad, quotation QUO/2610/0142 untuk fillet lele 250 g sudah saya kirimkan. Apakah ada yang ingin disesuaikan?',
            'status' => 'sent',
            'sent_by' => $rizky->id,
            'sent_at' => $today->copy()->subDays(4)->setTime(9, 5),
        ]);

        Message::create([
            'customer_id' => $customers['CUST-006']->id,
            'template_id' => $templates['Jadwal buyback']->id,
            'body' => 'Halo Pak Harto, berdasarkan sampling terakhir, ikan di kolam sudah mendekati ukuran panen. Kami ingin menjadwalkan buyback pada 12 November.',
            'status' => 'delivered',
            'sent_by' => $rizky->id,
            'sent_at' => $today->copy()->subDay()->setTime(8, 30),
        ]);
    }

    private function quotations(Carbon $today, array $customers, array $products, User $rizky): array
    {
        $rows = [
            [
                'number' => 'QUO/2610/0142',
                'customer' => 'CUST-001',
                'status' => 'sent',
                'issued_at' => $today->copy()->startOfDay(),
                'valid_until' => $today->copy()->addDays(7)->startOfDay(),
                'shipping' => 150000,
                'tax_rate' => 0.11,
                'notes' => 'Terima kasih atas kepercayaan Bapak Ahmad.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 80, 'price' => 48000],
                    ['product' => 'LELE-MASAK-250', 'qty' => 60, 'price' => 26000],
                ],
            ],
            [
                'number' => 'QUO/2610/0141',
                'customer' => 'CUST-002',
                'status' => 'sent',
                'issued_at' => $today->copy()->subDay()->startOfDay(),
                'valid_until' => $today->copy()->addDays(6)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'notes' => 'Harga sudah termasuk pajak.',
                'items' => [
                    ['product' => 'LELE-MASAK-250', 'qty' => 200, 'price' => 26000],
                ],
            ],
            [
                'number' => 'QUO/2610/0140',
                'customer' => 'CUST-006',
                'status' => 'accepted',
                'issued_at' => $today->copy()->subDays(2)->startOfDay(),
                'valid_until' => $today->copy()->addDays(12)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'notes' => 'Kuota bibit siklus berikutnya.',
                'items' => [
                    ['product' => 'BIBIT-3-5', 'qty' => 12000, 'price' => 550],
                ],
            ],
            [
                'number' => 'QUO/2610/0139',
                'customer' => 'CUST-004',
                'status' => 'sent',
                'issued_at' => $today->copy()->subDays(3)->startOfDay(),
                'valid_until' => $today->copy()->addDays(4)->startOfDay(),
                'shipping' => 200000,
                'tax_rate' => 0,
                'notes' => 'Penawaran khusus volume 300 kg.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 200, 'price' => 48000],
                    ['product' => 'LELE-MASAK-250', 'qty' => 100, 'price' => 26000],
                ],
            ],
            [
                'number' => 'QUO/2610/0138',
                'customer' => 'CUST-007',
                'status' => 'expired',
                'issued_at' => $today->copy()->subDays(4)->startOfDay(),
                'valid_until' => $today->copy()->addDays(3)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'notes' => 'Penawaran bibit 5–7 cm.',
                'items' => [
                    ['product' => 'BIBIT-5-7', 'qty' => 8000, 'price' => 800],
                ],
            ],
            [
                'number' => 'QUO/2610/0132',
                'customer' => 'CUST-001',
                'status' => 'accepted',
                'issued_at' => $today->copy()->subDays(11)->startOfDay(),
                'valid_until' => $today->copy()->subDays(4)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'notes' => 'Quotation yang menjadi PO-2610-011.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 120, 'price' => 48000],
                    ['product' => 'LELE-MASAK-250', 'qty' => 80, 'price' => 26000],
                ],
            ],
        ];

        $created = [];
        foreach ($rows as $row) {
            $items = $row['items'];
            unset($row['items']);

            $subtotal = 0;
            foreach ($items as $item) {
                $subtotal += $item['qty'] * $item['price'];
            }

            $tax = (int) round(($subtotal + $row['shipping']) * $row['tax_rate']);
            $total = $subtotal + $row['shipping'] + $tax;

            $quotation = Quotation::create([
                'number' => $row['number'],
                'customer_id' => $customers[$row['customer']]->id,
                'status' => $row['status'],
                'issued_at' => $row['issued_at'],
                'valid_until' => $row['valid_until'],
                'subtotal' => $subtotal,
                'discount' => 0,
                'tax' => $tax,
                'shipping' => $row['shipping'],
                'total' => $total,
                'terms' => 'Berlaku sesuai tanggal. Pembayaran 14 hari setelah invoice. Pengiriman Selasa & Jumat.',
                'notes' => $row['notes'],
                'created_by' => $rizky->id,
                'sent_at' => $row['status'] !== 'draft' ? $row['issued_at']->copy()->setTime(9, 0) : null,
                'accepted_at' => $row['status'] === 'accepted' ? $row['issued_at']->copy()->addDay()->setTime(14, 0) : null,
            ]);

            foreach ($items as $item) {
                $product = $products[$item['product']];
                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $product->id,
                    'description' => $product->name.' — '.$product->size_grade,
                    'qty' => $item['qty'],
                    'unit' => $product->unit,
                    'unit_price' => $item['price'],
                    'discount' => 0,
                    'subtotal' => $item['qty'] * $item['price'],
                ]);
            }

            $created[$row['number']] = $quotation;
        }

        return $created;
    }

    private function purchaseOrders(Carbon $today, array $customers, array $products, array $quotations, User $admin, User $wati): array
    {
        $rows = [
            [
                'number' => 'PO-2610-018',
                'customer_po_number' => 'MBG/NUS/1024',
                'customer' => 'CUST-001',
                'quotation' => 'QUO/2610/0142',
                'status' => 'production',
                'requested_delivery_at' => $today->copy()->addDays(2)->startOfDay(),
                'shipping' => 150000,
                'tax_rate' => 0.11,
                'payment_terms' => '14 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Kirim sebelum pukul 07.00.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 80, 'price' => 48000],
                    ['product' => 'LELE-MASAK-250', 'qty' => 60, 'price' => 26000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO customer diterima via WhatsApp.', 'at' => $today->copy()->subDay()->setTime(8, 12), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Stok dan harga dikonfirmasi. Pelanggan meminta kirim sebelum 07.00.', 'at' => $today->copy()->subDay()->setTime(9, 5), 'by' => $admin],
                    ['status' => 'production', 'note' => 'Panen 140 kg, sortir grade A. Fillet mulai diproses.', 'at' => $today->setTime(7, 40), 'by' => $wati],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->addDays(2)->setTime(5, 30),
                    'driver_name' => 'Pak Yanto',
                    'driver_phone' => '0812-7777-1212',
                    'vehicle' => 'Pickup B 9123 XYZ',
                    'status' => 'scheduled',
                ],
            ],
            [
                'number' => 'PO-2610-017',
                'customer_po_number' => 'SPPG/TMB/091',
                'customer' => 'CUST-002',
                'quotation' => 'QUO/2610/0141',
                'status' => 'ready',
                'requested_delivery_at' => $today->copy()->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '14 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Tiba sebelum jam 07.00.',
                'items' => [
                    ['product' => 'LELE-MASAK-250', 'qty' => 200, 'price' => 26000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO diterima.', 'at' => $today->copy()->subDays(2)->setTime(8, 0), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Stok tersedia.', 'at' => $today->copy()->subDays(2)->setTime(9, 0), 'by' => $admin],
                    ['status' => 'production', 'note' => 'Panen dan sortir selesai.', 'at' => $today->copy()->subDay()->setTime(7, 0), 'by' => $wati],
                    ['status' => 'ready', 'note' => 'QC selesai, siap dimuat.', 'at' => $today->setTime(5, 0), 'by' => $wati],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->setTime(5, 30),
                    'driver_name' => 'Pak Yanto',
                    'driver_phone' => '0812-7777-1212',
                    'vehicle' => 'Pickup B 9123 XYZ',
                    'status' => 'loading',
                ],
            ],
            [
                'number' => 'PO-2610-016',
                'customer_po_number' => 'PH/BB/1021',
                'customer' => 'CUST-006',
                'quotation' => 'QUO/2610/0140',
                'status' => 'confirmed',
                'requested_delivery_at' => $today->copy()->addDay()->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '7 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Bibit 3–5 cm, grading pagi.',
                'items' => [
                    ['product' => 'BIBIT-3-5', 'qty' => 12000, 'price' => 550],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO bibit diterima.', 'at' => $today->copy()->subDay()->setTime(10, 0), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Kuota bibit tersedia.', 'at' => $today->copy()->subDay()->setTime(11, 0), 'by' => $admin],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->addDay()->setTime(6, 0),
                    'driver_name' => 'Pak Slamet',
                    'driver_phone' => '0812-7777-3434',
                    'vehicle' => 'Pickup B 8899 KL',
                    'status' => 'scheduled',
                ],
            ],
            [
                'number' => 'PO-2610-015',
                'customer_po_number' => 'CB/SPPG/088',
                'customer' => 'CUST-003',
                'quotation' => null,
                'status' => 'received',
                'requested_delivery_at' => $today->copy()->addDays(3)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '14 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Konfirmasi stok fillet.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 100, 'price' => 48000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO baru masuk.', 'at' => $today->copy()->subMinutes(50), 'by' => $admin],
                ],
            ],
            [
                'number' => 'PO-2610-014',
                'customer_po_number' => 'MJ/MM/080',
                'customer' => 'CUST-007',
                'quotation' => 'QUO/2610/0138',
                'status' => 'shipped',
                'requested_delivery_at' => $today->copy()->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '7 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Bibit 5–7 cm, 8.000 ekor.',
                'items' => [
                    ['product' => 'BIBIT-5-7', 'qty' => 8000, 'price' => 800],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO diterima.', 'at' => $today->copy()->subDays(2)->setTime(8, 0), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Stok bibit siap.', 'at' => $today->copy()->subDays(2)->setTime(9, 0), 'by' => $admin],
                    ['status' => 'production', 'note' => 'Grading bibit.', 'at' => $today->copy()->subDay()->setTime(6, 0), 'by' => $wati],
                    ['status' => 'ready', 'note' => 'Siap dimuat.', 'at' => $today->setTime(6, 30), 'by' => $wati],
                    ['status' => 'shipped', 'note' => 'Berangkat menuju Demak.', 'at' => $today->setTime(7, 0), 'by' => $admin],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->setTime(7, 0),
                    'departed_at' => $today->copy()->setTime(7, 0),
                    'driver_name' => 'Pak Slamet',
                    'driver_phone' => '0812-7777-3434',
                    'vehicle' => 'Pickup B 8899 KL',
                    'status' => 'in_transit',
                ],
            ],
            [
                'number' => 'PO-2610-013',
                'customer_po_number' => 'MBG/SM/077',
                'customer' => 'CUST-005',
                'quotation' => null,
                'status' => 'ready',
                'requested_delivery_at' => $today->copy()->subDay()->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '14 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Terlambat 1 hari. Driver belum ditugaskan.',
                'items' => [
                    ['product' => 'LELE-MASAK-250', 'qty' => 120, 'price' => 26000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO diterima.', 'at' => $today->copy()->subDays(3)->setTime(8, 0), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Stok tersedia.', 'at' => $today->copy()->subDays(3)->setTime(9, 0), 'by' => $admin],
                    ['status' => 'production', 'note' => 'Produksi selesai.', 'at' => $today->copy()->subDay()->setTime(7, 0), 'by' => $wati],
                    ['status' => 'ready', 'note' => 'Sudah QC, menunggu driver.', 'at' => $today->copy()->subDay()->setTime(10, 0), 'by' => $wati],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->subDay()->setTime(5, 30),
                    'status' => 'scheduled',
                ],
            ],
            [
                'number' => 'PO-2610-012',
                'customer_po_number' => 'SPPG/PDG/065',
                'customer' => 'CUST-004',
                'quotation' => 'QUO/2610/0139',
                'status' => 'received',
                'requested_delivery_at' => $today->copy()->addDays(4)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '14 hari',
                'payment_status' => 'unpaid',
                'notes' => 'Perlu konfirmasi jadwal kirim.',
                'items' => [
                    ['product' => 'LELE-MASAK-250', 'qty' => 150, 'price' => 26000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO baru masuk 2 jam lalu.', 'at' => $today->copy()->subHours(2), 'by' => $admin],
                ],
            ],
            [
                'number' => 'PO-2610-011',
                'customer_po_number' => 'MBG/NUS/1018',
                'customer' => 'CUST-001',
                'quotation' => 'QUO/2610/0132',
                'status' => 'completed',
                'requested_delivery_at' => $today->copy()->subDays(7)->startOfDay(),
                'shipping' => 0,
                'tax_rate' => 0,
                'payment_terms' => '14 hari',
                'payment_status' => 'paid',
                'notes' => 'Selesai dan sudah dibayar.',
                'items' => [
                    ['product' => 'FILLET-200', 'qty' => 120, 'price' => 48000],
                    ['product' => 'LELE-MASAK-250', 'qty' => 80, 'price' => 26000],
                ],
                'history' => [
                    ['status' => 'received', 'note' => 'PO diterima.', 'at' => $today->copy()->subDays(10)->setTime(8, 0), 'by' => $admin],
                    ['status' => 'confirmed', 'note' => 'Dikonfirmasi.', 'at' => $today->copy()->subDays(10)->setTime(9, 0), 'by' => $admin],
                    ['status' => 'production', 'note' => 'Produksi.', 'at' => $today->copy()->subDays(9)->setTime(7, 0), 'by' => $wati],
                    ['status' => 'ready', 'note' => 'Siap kirim.', 'at' => $today->copy()->subDays(8)->setTime(7, 0), 'by' => $wati],
                    ['status' => 'shipped', 'note' => 'Dikirim.', 'at' => $today->copy()->subDays(7)->setTime(5, 30), 'by' => $admin],
                    ['status' => 'delivered', 'note' => 'Diterima pelanggan.', 'at' => $today->copy()->subDays(7)->setTime(6, 30), 'by' => $admin],
                    ['status' => 'completed', 'note' => 'Invoice dan pembayaran selesai.', 'at' => $today->copy()->subDays(4)->setTime(10, 0), 'by' => $admin],
                ],
                'delivery' => [
                    'scheduled_at' => $today->copy()->subDays(7)->setTime(5, 30),
                    'departed_at' => $today->copy()->subDays(7)->setTime(5, 30),
                    'arrived_at' => $today->copy()->subDays(7)->setTime(6, 30),
                    'driver_name' => 'Pak Yanto',
                    'driver_phone' => '0812-7777-1212',
                    'vehicle' => 'Pickup B 9123 XYZ',
                    'receiver_name' => 'Ahmad Fauzi',
                    'status' => 'delivered',
                ],
            ],
        ];

        $created = [];
        foreach ($rows as $row) {
            $customerCode = $row['customer'];
            $quotationNumber = $row['quotation'];
            $items = $row['items'];
            $history = $row['history'];
            $delivery = $row['delivery'] ?? null;
            unset($row['items'], $row['history'], $row['delivery'], $row['customer'], $row['quotation']);

            $subtotal = 0;
            foreach ($items as $item) {
                $subtotal += $item['qty'] * $item['price'];
            }

            $tax = (int) round(($subtotal + $row['shipping']) * $row['tax_rate']);
            $total = $subtotal + $row['shipping'] + $tax;

            $po = PurchaseOrder::create([
                'number' => $row['number'],
                'customer_po_number' => $row['customer_po_number'],
                'customer_id' => $customers[$customerCode]->id,
                'quotation_id' => $quotationNumber ? $quotations[$quotationNumber]->id : null,
                'type' => 'sale',
                'status' => $row['status'],
                'requested_delivery_at' => $row['requested_delivery_at'],
                'confirmed_at' => in_array($row['status'], ['confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'], true) ? $today->copy()->subDay()->setTime(9, 0) : null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $row['shipping'],
                'total' => $total,
                'payment_terms' => $row['payment_terms'],
                'payment_status' => $row['payment_status'],
                'notes' => $row['notes'],
                'created_by' => $admin->id,
            ]);

            foreach ($items as $item) {
                $product = $products[$item['product']];
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id' => $product->id,
                    'description' => $product->name.' — '.$product->size_grade,
                    'qty' => $item['qty'],
                    'unit' => $product->unit,
                    'unit_price' => $item['price'],
                    'fulfilled_qty' => $row['status'] === 'completed' ? $item['qty'] : 0,
                    'subtotal' => $item['qty'] * $item['price'],
                ]);
            }

            foreach ($history as $entry) {
                PoStatusHistory::forceCreate([
                    'purchase_order_id' => $po->id,
                    'status' => $entry['status'],
                    'note' => $entry['note'],
                    'changed_by' => $entry['by']->id,
                    'created_at' => $entry['at'],
                    'updated_at' => $entry['at'],
                ]);
            }

            if ($delivery) {
                Delivery::create([
                    'purchase_order_id' => $po->id,
                    'number' => 'SJ-'.str_replace('PO-', '', $po->number),
                    'driver_name' => $delivery['driver_name'] ?? null,
                    'driver_phone' => $delivery['driver_phone'] ?? null,
                    'vehicle' => $delivery['vehicle'] ?? null,
                    'scheduled_at' => $delivery['scheduled_at'] ?? null,
                    'departed_at' => $delivery['departed_at'] ?? null,
                    'arrived_at' => $delivery['arrived_at'] ?? null,
                    'receiver_name' => $delivery['receiver_name'] ?? null,
                    'status' => $delivery['status'],
                    'notes' => $delivery['notes'] ?? null,
                ]);
            }

            $createdAt = $row['requested_delivery_at']->copy()->subDays(2)->setTime(8, 0);
            if ($createdAt->isFuture()) {
                $createdAt = now()->subDays(1 + ($po->id % 20))->setTime(8, 0);
            }

            DB::table('purchase_orders')->where('id', $po->id)->update([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $created[$po->number] = $po;
        }

        return $created;
    }

    private function historicalSeedPos(Carbon $today, array $customers, array $products, User $admin): array
    {
        $rows = [
            ['PO-2605-001', 'CUST-001', 'FILLET-200', 80, 48000, '2026-05-15'],
            ['PO-2605-002', 'CUST-006', 'BIBIT-3-5', 12000, 550, '2026-05-20'],
            ['PO-2606-001', 'CUST-002', 'LELE-MASAK-250', 150, 26000, '2026-06-10'],
            ['PO-2606-002', 'CUST-007', 'BIBIT-5-7', 8000, 800, '2026-06-18'],
            ['PO-2608-001', 'CUST-006', 'BIBIT-3-5', 12000, 550, '2026-08-12'],
            ['PO-2608-002', 'CUST-007', 'BIBIT-5-7', 8000, 800, '2026-08-02'],
            ['PO-2609-003', 'CUST-008', 'BIBIT-3-5', 15000, 550, '2026-09-05'],
            ['PO-2609-004', 'CUST-009', 'BIBIT-2-3', 10000, 350, '2026-09-18'],
            ['PO-2609-005', 'CUST-010', 'BIBIT-3-5', 6000, 550, '2026-09-28'],
            ['PO-2607-006', 'CUST-011', 'BIBIT-3-5', 9000, 550, '2026-07-20'],
        ];

        $created = [];

        foreach ($rows as [$number, $customerCode, $sku, $qty, $price, $date]) {
            $deliveredAt = Carbon::parse($date.' 06:00:00');
            $product = $products[$sku];
            $total = $qty * $price;

            $po = PurchaseOrder::create([
                'number' => $number,
                'customer_po_number' => 'BIBIT/'.$customerCode.'/'.$deliveredAt->format('md'),
                'customer_id' => $customers[$customerCode]->id,
                'type' => 'sale',
                'status' => 'completed',
                'requested_delivery_at' => $deliveredAt->copy()->startOfDay(),
                'confirmed_at' => $deliveredAt->copy()->subDay()->setTime(9, 0),
                'subtotal' => $total,
                'tax' => 0,
                'shipping' => 0,
                'total' => $total,
                'payment_terms' => '7 hari',
                'payment_status' => 'paid',
                'notes' => 'PO bibit historis untuk siklus buyback.',
                'created_by' => $admin->id,
            ]);

            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'product_id' => $product->id,
                'description' => $product->name.' — '.$product->size_grade,
                'qty' => $qty,
                'unit' => $product->unit,
                'unit_price' => $price,
                'fulfilled_qty' => $qty,
                'subtotal' => $total,
            ]);

            foreach (['received', 'confirmed', 'production', 'ready', 'shipped', 'delivered', 'completed'] as $index => $status) {
                PoStatusHistory::forceCreate([
                    'purchase_order_id' => $po->id,
                    'status' => $status,
                    'note' => 'Status historis.',
                    'changed_by' => $admin->id,
                    'created_at' => $deliveredAt->copy()->subDays(3 - min($index, 3)),
                    'updated_at' => $deliveredAt->copy()->subDays(3 - min($index, 3)),
                ]);
            }

            Delivery::create([
                'purchase_order_id' => $po->id,
                'number' => 'SJ-'.str_replace('PO-', '', $number),
                'driver_name' => 'Pak Slamet',
                'driver_phone' => '0812-7777-3434',
                'vehicle' => 'Pickup B 8899 KL',
                'scheduled_at' => $deliveredAt,
                'departed_at' => $deliveredAt,
                'arrived_at' => $deliveredAt->copy()->addHour(),
                'receiver_name' => $customers[$customerCode]->primaryContact?->name,
                'status' => 'delivered',
            ]);

            $createdAt = $deliveredAt->copy()->subDays(3);
            DB::table('purchase_orders')->where('id', $po->id)->update([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);

            $created[$number] = $po;
        }

        return $created;
    }

    private function buybackCycles(Carbon $today, array $customers, array $pos): void
    {
        $seedPoMap = [
            'CUST-006' => 'PO-2608-001',
            'CUST-007' => 'PO-2608-002',
            'CUST-008' => 'PO-2609-003',
            'CUST-009' => 'PO-2609-004',
            'CUST-010' => 'PO-2609-005',
            'CUST-011' => 'PO-2607-006',
        ];

        $rows = [
            [
                'customer' => 'CUST-006',
                'stocked_at' => '2026-08-12',
                'seed_qty' => 12000,
                'seed_size' => '3–5 cm',
                'target_abw_g' => 180,
                'estimated_harvest_at' => '2026-11-12',
                'status' => 'near_harvest',
                'samplings' => [
                    ['2026-09-11', 30, 42, 90],
                    ['2026-10-11', 30, 118, 89],
                    ['2026-10-21', 30, 168, 88],
                ],
            ],
            [
                'customer' => 'CUST-007',
                'stocked_at' => '2026-08-02',
                'seed_qty' => 8000,
                'seed_size' => '5–7 cm',
                'target_abw_g' => 200,
                'estimated_harvest_at' => '2026-10-25',
                'status' => 'ready',
                'samplings' => [
                    ['2026-10-19', 30, 205, 84],
                ],
            ],
            [
                'customer' => 'CUST-008',
                'stocked_at' => '2026-09-05',
                'seed_qty' => 15000,
                'seed_size' => '3–5 cm',
                'target_abw_g' => 180,
                'estimated_harvest_at' => '2026-11-20',
                'status' => 'growing',
                'samplings' => [
                    ['2026-10-18', 30, 92, 91],
                ],
            ],
            [
                'customer' => 'CUST-009',
                'stocked_at' => '2026-09-18',
                'seed_qty' => 10000,
                'seed_size' => '2–3 cm',
                'target_abw_g' => 200,
                'estimated_harvest_at' => '2026-12-15',
                'status' => 'growing',
                'samplings' => [
                    ['2026-10-02', 30, 48, 79],
                ],
            ],
            [
                'customer' => 'CUST-010',
                'stocked_at' => '2026-09-28',
                'seed_qty' => 6000,
                'seed_size' => '3–5 cm',
                'target_abw_g' => 200,
                'estimated_harvest_at' => '2026-12-10',
                'status' => 'growing',
                'samplings' => [
                    ['2026-10-15', 30, 31, 93],
                ],
            ],
            [
                'customer' => 'CUST-011',
                'stocked_at' => '2026-07-20',
                'seed_qty' => 9000,
                'seed_size' => '3–5 cm',
                'target_abw_g' => 200,
                'estimated_harvest_at' => '2026-10-23',
                'status' => 'scheduled',
                'samplings' => [
                    ['2026-10-18', 30, 220, 86],
                ],
            ],
        ];

        foreach ($rows as $row) {
            $customerCode = $row['customer'];
            $samplings = $row['samplings'];
            unset($row['samplings'], $row['customer']);

            $cycle = BuybackCycle::create([
                ...$row,
                'customer_id' => $customers[$customerCode]->id,
                'seed_po_id' => isset($seedPoMap[$customerCode]) ? ($pos[$seedPoMap[$customerCode]]->id ?? null) : null,
                'notes' => 'Siklus pembesaran mitra.',
            ]);

            foreach ($samplings as [$date, $count, $abw, $sr]) {
                BuybackSampling::create([
                    'buyback_cycle_id' => $cycle->id,
                    'sampled_at' => $date,
                    'sample_count' => $count,
                    'avg_weight_g' => $abw,
                    'estimated_sr' => $sr,
                    'estimated_biomass_kg' => round($cycle->seed_qty * ($sr / 100) * $abw / 1000, 2),
                    'notes' => 'Sampling rutin.',
                ]);
            }
        }
    }
}
