<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DocumentSetting;
use App\Models\Invoice;
use App\Models\User;
use App\Support\DocumentBranding;
use App\Support\PublicDocumentLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class DocumentBrandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_document_branding_is_available(): void
    {
        $branding = DocumentBranding::current();

        $this->assertSame('Saung Lele Karawang', $branding['title']);
        $this->assertSame('Ternak dan Jual Beli Lele - Karawang', $branding['subtitle']);
        $this->assertSame('/kebunkode.jpg', $branding['logo_url']);
    }

    public function test_profile_can_update_document_branding(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.document.update'), [
                'title' => 'Saung Lele Karawang',
                'subtitle' => 'Ternak dan Jual Beli Lele - Karawang',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('document_settings', [
            'title' => 'Saung Lele Karawang',
            'subtitle' => 'Ternak dan Jual Beli Lele - Karawang',
        ]);

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertSee('Saung Lele Karawang');
    }

    public function test_profile_can_upload_document_logo(): void
    {
        $user = User::factory()->create();
        $logo = UploadedFile::fake()->image('logo.png', 200, 200);

        $this->actingAs($user)
            ->post(route('profile.document.update'), [
                'title' => 'Saung Lele Karawang',
                'subtitle' => 'Ternak dan Jual Beli Lele - Karawang',
                'logo' => $logo,
            ])
            ->assertRedirect();

        $setting = DocumentSetting::firstOrFail();
        $path = public_path(ltrim((string) $setting->logo_path, '/'));

        $this->assertStringStartsWith('/uploads/branding/', (string) $setting->logo_path);
        $this->assertFileExists($path);

        File::delete($path);
    }

    public function test_public_invoice_uses_document_branding(): void
    {
        DocumentSetting::firstOrFail()->update([
            'title' => 'Saung Lele Karawang',
            'subtitle' => 'Ternak dan Jual Beli Lele - Karawang',
        ]);

        $customer = Customer::create([
            'code' => 'CUST-001',
            'name' => 'Dapur Test',
            'segment' => 'mbg',
            'status' => 'active',
            'phone' => '08123456789',
            'health_score' => 80,
            'lifetime_value' => 0,
        ]);

        $invoice = Invoice::create([
            'number' => 'INV-TEST-BRAND',
            'customer_id' => $customer->id,
            'status' => 'draft',
            'issued_at' => today(),
            'due_at' => today()->addDays(14),
            'subtotal' => 100000,
            'total' => 100000,
        ]);

        $token = basename(PublicDocumentLink::invoice($invoice));

        $this->get(route('public.invoices.show', ['token' => $token]))
            ->assertOk()
            ->assertSee('Saung Lele Karawang')
            ->assertSee('Ternak dan Jual Beli Lele - Karawang');
    }
}
