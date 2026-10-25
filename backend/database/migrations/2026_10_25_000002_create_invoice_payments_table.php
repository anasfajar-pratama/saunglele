<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('type')->default('installment')->index();
            $table->date('paid_at');
            $table->decimal('amount', 15, 2);
            $table->string('method')->default('transfer');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('invoices')->orderBy('id')->chunkById(100, function ($invoices) {
            foreach ($invoices as $invoice) {
                $downPayment = (float) $invoice->down_payment;
                $settlement = (float) $invoice->paid_amount;
                $total = (float) $invoice->total;
                $now = now();
                $date = fn ($value) => $value ? substr((string) $value, 0, 10) : now()->toDateString();
                $payments = [];

                if ($downPayment > 0) {
                    $payments[] = [
                        'invoice_id' => $invoice->id,
                        'type' => 'down_payment',
                        'paid_at' => $date($invoice->issued_at),
                        'amount' => $downPayment,
                        'method' => 'transfer',
                        'reference' => null,
                        'notes' => 'DP awal (migrasi data).',
                        'created_by' => $invoice->created_by,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($settlement > 0) {
                    $payments[] = [
                        'invoice_id' => $invoice->id,
                        'type' => 'settlement',
                        'paid_at' => $date($invoice->paid_at ?? $invoice->issued_at),
                        'amount' => $settlement,
                        'method' => 'transfer',
                        'reference' => null,
                        'notes' => 'Pelunasan (migrasi data).',
                        'created_by' => $invoice->created_by,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($invoice->status === 'paid' && ($downPayment + $settlement) < $total) {
                    $payments[] = [
                        'invoice_id' => $invoice->id,
                        'type' => 'settlement',
                        'paid_at' => $date($invoice->paid_at ?? $invoice->issued_at),
                        'amount' => max(0, $total - $downPayment - $settlement),
                        'method' => 'transfer',
                        'reference' => null,
                        'notes' => 'Penyesuaian pelunasan (migrasi data).',
                        'created_by' => $invoice->created_by,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($payments !== []) {
                    DB::table('invoice_payments')->insert($payments);
                }

                $newPaid = $invoice->status === 'paid'
                    ? max($downPayment + $settlement, $total)
                    : $downPayment + $settlement;

                DB::table('invoices')->where('id', $invoice->id)->update([
                    'paid_amount' => $newPaid,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
