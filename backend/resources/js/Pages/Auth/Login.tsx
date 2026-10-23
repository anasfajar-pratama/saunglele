import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const demoUsers = [
    { role: 'Pemilik', name: 'Saung Lele', email: 'owner@saunglele.test', password: 'password' },
    { role: 'Sales', name: 'Rizky', email: 'rizky@saunglele.test', password: 'password' },
    { role: 'Sales', name: 'Dina', email: 'dina@saunglele.test', password: 'password' },
    { role: 'Admin', name: 'Admin', email: 'admin@saunglele.test', password: 'password' },
    { role: 'Produksi', name: 'Wati', email: 'wati@saunglele.test', password: 'password' },
    { role: 'Keuangan', name: 'Keuangan', email: 'finance@saunglele.test', password: 'password' },
];

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    function applyDemo(user: (typeof demoUsers)[number]) {
        setData('email', user.email);
        setData('password', user.password);
    }

    return (
        <GuestLayout wide>
            <Head title="Masuk · Saung Lele CRM" />

            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                <div>
                    <div className="mb-6">
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Masuk ke Saung Lele CRM</h1>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                            Gunakan akun demo di samping untuk mencoba alur CRM, atau masuk dengan akun yang diberikan admin.
                        </p>
                    </div>

                    {status && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit}>
                        <div>
                            <InputLabel htmlFor="email" value="Email" />

                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                            />

                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div className="mt-4">
                            <InputLabel htmlFor="password" value="Password" />

                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />

                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div className="mt-4 block">
                            <label className="flex items-center">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData(
                                            'remember',
                                            (e.target.checked || false) as false,
                                        )
                                    }
                                />
                                <span className="ms-2 text-sm text-gray-600">
                                    Ingat saya
                                </span>
                            </label>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                >
                                    Lupa password?
                                </Link>
                            )}

                            <PrimaryButton className="ms-auto" disabled={processing}>
                                Masuk
                            </PrimaryButton>
                        </div>
                    </form>

                    <div className="mt-6 border-t border-gray-100 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Akses cepat</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <a
                                href="/dokumen/penawaran-saung-lele.html"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                                Surat Penawaran
                            </a>
                            <a
                                href="/dokumen/panduan-penggunaan.html"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                                Dokumen Penggunaan
                            </a>
                        </div>
                    </div>
                </div>

                <aside className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-extrabold text-gray-900">Akun demo</h2>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
                                Klik “Gunakan” untuk mengisi email dan password otomatis.
                            </p>
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                            Demo
                        </span>
                    </div>

                    <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
                        {demoUsers.map((user) => (
                            <div
                                key={user.email}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white px-3 py-2 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-gray-900">
                                        {user.role} · {user.name}
                                    </div>
                                    <div className="truncate text-[9.5px] text-gray-500">{user.email}</div>
                                    <div className="text-[9.5px] text-gray-400">Password: {user.password}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => applyDemo(user)}
                                    className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                    Gunakan
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">
                        <strong>Catatan demo:</strong> akun dan data ini hanya untuk evaluasi. Jangan gunakan data pelanggan asli.
                    </div>
                </aside>
            </div>
        </GuestLayout>
    );
}
