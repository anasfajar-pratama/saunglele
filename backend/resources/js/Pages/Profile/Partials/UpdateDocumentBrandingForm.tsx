import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

type Branding = {
    title: string;
    subtitle: string;
    logo_url: string;
};

export default function UpdateDocumentBrandingForm({ className = '' }: { className?: string }) {
    const page = usePage<any>();
    const branding: Branding = page.props.documentBranding ?? {
        title: 'Saung Lele Karawang',
        subtitle: 'Ternak dan Jual Beli Lele - Karawang',
        logo_url: '/kebunkode.jpg',
    };

    const { data, setData, post, errors, processing, recentlySuccessful, reset } = useForm<{
        title: string;
        subtitle: string;
        logo: File | null;
    }>({
        title: branding.title,
        subtitle: branding.subtitle,
        logo: null,
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (logoPreview) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const previewLogo = logoPreview ?? branding.logo_url;

    function handleLogoChange(file: File | null) {
        setData('logo', file);
        setLogoPreview(file ? URL.createObjectURL(file) : null);
    }

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        post(route('profile.document.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('logo');
                setLogoPreview(null);
            },
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Pengaturan Dokumen</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Judul, sub judul, dan logo ini tampil di dokumen PO, quotation, dan invoice.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="document_title" value="Judul dokumen" />
                    <TextInput
                        id="document_title"
                        className="mt-1 block w-full"
                        value={data.title}
                        onChange={(event) => setData('title', event.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.title} />
                </div>

                <div>
                    <InputLabel htmlFor="document_subtitle" value="Sub judul" />
                    <TextInput
                        id="document_subtitle"
                        className="mt-1 block w-full"
                        value={data.subtitle}
                        onChange={(event) => setData('subtitle', event.target.value)}
                        required
                    />
                    <InputError className="mt-2" message={errors.subtitle} />
                </div>

                <div>
                    <InputLabel htmlFor="document_logo" value="Logo dokumen" />
                    <div className="mt-2 flex items-center gap-4">
                        <img
                            src={previewLogo}
                            alt={branding.title}
                            className="h-14 w-14 rounded-xl border border-gray-200 bg-white object-cover"
                        />
                        <input
                            id="document_logo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Format JPG, PNG, atau WEBP. Maksimal 2 MB.</p>
                    <InputError className="mt-2" message={errors.logo} />
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pratinjau</p>
                    <div className="mt-2 flex items-center gap-3">
                        <img
                            src={previewLogo}
                            alt={branding.title}
                            className="h-10 w-10 rounded-lg border border-gray-200 bg-white object-cover"
                        />
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{data.title || branding.title}</p>
                            <p className="text-xs text-gray-500">{data.subtitle || branding.subtitle}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Simpan pengaturan</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600">Tersimpan.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
