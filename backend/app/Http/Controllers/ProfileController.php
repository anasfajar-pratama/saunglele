<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Support\DocumentBranding;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    public function updateDocument(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['required', 'string', 'max:160'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $setting = DocumentBranding::setting();

        $setting->title = $data['title'];
        $setting->subtitle = $data['subtitle'];

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $directory = public_path('uploads/branding');

            if (! is_dir($directory)) {
                mkdir($directory, 0755, true);
            }

            $extension = strtolower($file->extension() ?: 'jpg');
            $filename = 'logo-'.now()->format('YmdHis').'-'.Str::random(8).'.'.$extension;
            $file->move($directory, $filename);

            $oldPath = $setting->logo_path;
            $setting->logo_path = '/uploads/branding/'.$filename;

            if ($oldPath && str_starts_with($oldPath, '/uploads/branding/')) {
                $oldFile = public_path(ltrim($oldPath, '/'));

                if (is_file($oldFile)) {
                    @unlink($oldFile);
                }
            }
        }

        $setting->save();

        return back()->with('success', 'Pengaturan dokumen berhasil diperbarui.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
