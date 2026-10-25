<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use App\Support\PublicDocumentLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_flow_and_short_public_link(): void
    {
        $user = User::factory()->create();
        $customer = $this->customer();

        $this->actingAs($user)
            ->get(route('invoices.create', ['customer_id' => $customer->id]))
            ->assertOk();

        $response = $this->actingAs($user)->post(route('invoices.store'), [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(14)->toDateString(),
            'shipping' => 10000,
            'tax_rate' => 0.11,
            'down_payment' => 50000,
            'terms' => 'Termin 14 hari.',
            'notes' => 'Tes invoice.',
            'items' => [
                [
                    'description' => 'Lele segar',
                    'qty' => 10,
                    'unit' => 'kg',
                    'unit_price' => 20000,
                    'discount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::firstOrFail();

        $response->assertRedirect(route('invoices.show', $invoice));
        $this->assertSame('INV-'.now()->format('ym').'-001', $invoice->number);
        $this->assertEqualsWithDelta(233100, (float) $invoice->total, 0.01);
        $this->assertEqualsWithDelta(50000, (float) $invoice->down_payment, 0.01);
        $this->assertEqualsWithDelta(50000, (float) $invoice->paid_amount, 0.01);
        $this->assertSame(1, $invoice->payments()->count());

        $this->actingAs($user)->get(route('invoices.index'))->assertOk();
        $this->actingAs($user)->get(route('invoices.show', $invoice))->assertOk();
        $this->actingAs($user)->get(route('customers.show', $customer))->assertOk();

        $url = PublicDocumentLink::invoice($invoice);
        $token = basename($url);

        $this->assertSame(20, strlen($token));
        $this->get(route('public.invoices.show', ['token' => $token]))
            ->assertOk()
            ->assertSee($invoice->number)
            ->assertSee('DP / uang muka');

        $this->actingAs($user)
            ->patch(route('invoices.status', $invoice), ['status' => 'paid'])
            ->assertRedirect();

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertEqualsWithDelta(233100, (float) $invoice->paid_amount, 0.01);
        $this->assertSame(2, $invoice->payments()->count());
    }

    public function test_payment_history_updates_status_and_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $customer = $this->customer();

        $this->actingAs($user)->post(route('invoices.store'), [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(14)->toDateString(),
            'shipping' => 10000,
            'tax_rate' => 0.11,
            'down_payment' => 0,
            'items' => [
                [
                    'description' => 'Lele segar',
                    'qty' => 10,
                    'unit' => 'kg',
                    'unit_price' => 20000,
                    'discount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::firstOrFail();

        $this->actingAs($user)->post(route('invoices.payments.store', $invoice), [
            'paid_at' => today()->toDateString(),
            'amount' => 100000,
            'method' => 'transfer',
            'reference' => 'TRF-001',
            'notes' => 'Cicilan pertama',
        ])->assertRedirect();

        $invoice->refresh();
        $this->assertEqualsWithDelta(100000, (float) $invoice->paid_amount, 0.01);
        $this->assertSame('partial', $invoice->payment_status);
        $this->assertSame(1, $invoice->payments()->count());

        $this->actingAs($user)->post(route('invoices.payments.store', $invoice), [
            'paid_at' => today()->toDateString(),
            'amount' => 999999,
            'method' => 'transfer',
        ])->assertSessionHasErrors('amount');

        $this->actingAs($user)
            ->patch(route('invoices.status', $invoice), ['status' => 'paid'])
            ->assertRedirect();

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertEqualsWithDelta(233100, (float) $invoice->paid_amount, 0.01);
        $this->assertSame(2, $invoice->payments()->count());

        $settlement = $invoice->payments()->where('type', 'settlement')->firstOrFail();

        $this->actingAs($user)
            ->delete(route('invoices.payments.destroy', ['invoice' => $invoice, 'payment' => $settlement]))
            ->assertRedirect();

        $invoice->refresh();
        $this->assertEqualsWithDelta(100000, (float) $invoice->paid_amount, 0.01);
        $this->assertSame('sent', $invoice->status);
    }

    public function test_invoice_can_be_created_without_tax(): void
    {
        $user = User::factory()->create();
        $customer = $this->customer();

        $this->actingAs($user)->post(route('invoices.store'), [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(14)->toDateString(),
            'shipping' => 10000,
            'tax_rate' => 0,
            'down_payment' => 0,
            'items' => [
                [
                    'description' => 'Lele segar',
                    'qty' => 10,
                    'unit' => 'kg',
                    'unit_price' => 20000,
                    'discount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::firstOrFail();

        $this->assertEqualsWithDelta(0, (float) $invoice->tax, 0.01);
        $this->assertEqualsWithDelta(210000, (float) $invoice->total, 0.01);
    }

    public function test_down_payment_cannot_exceed_total(): void
    {
        $user = User::factory()->create();
        $customer = $this->customer();

        $response = $this->actingAs($user)->post(route('invoices.store'), [
            'customer_id' => $customer->id,
            'due_at' => now()->addDays(14)->toDateString(),
            'shipping' => 0,
            'tax_rate' => 0,
            'down_payment' => 999999,
            'items' => [
                [
                    'description' => 'Lele segar',
                    'qty' => 1,
                    'unit' => 'kg',
                    'unit_price' => 10000,
                    'discount' => 0,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('down_payment');
        $this->assertSame(0, Invoice::count());
    }

    private function customer(): Customer
    {
        return Customer::create([
            'code' => 'CUST-001',
            'name' => 'Dapur Test',
            'segment' => 'mbg',
            'status' => 'active',
            'phone' => '08123456789',
            'health_score' => 80,
            'lifetime_value' => 0,
        ]);
    }
}
