<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_settings', function (Blueprint $table) {
            $table->id();
            $table->string('title')->default('Saung Lele Karawang');
            $table->string('subtitle')->default('Ternak dan Jual Beli Lele - Karawang');
            $table->string('logo_path')->nullable();
            $table->timestamps();
        });

        DB::table('document_settings')->insert([
            'title' => 'Saung Lele Karawang',
            'subtitle' => 'Ternak dan Jual Beli Lele - Karawang',
            'logo_path' => '/kebunkode.jpg',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('document_settings');
    }
};
