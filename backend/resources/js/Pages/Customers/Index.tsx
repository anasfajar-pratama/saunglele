import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import {
    formatRupiah,
    healthBadgeClass,
    healthColor,
    initials,
    segmentAvatarClass,
    segmentBadgeClass,
    whatsappUrl,
} from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

type Props = {
    customers: any;
    filters: { q?: string; segment?: string; health?: string; status?: string };
    stats: { all: number; mbg: number; kolam: number; risk: number };
    owners: { id: number; name: string }[];
};

export default function CustomersIndex({ customers, filters, stats, owners }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState(filters.q ?? '');

    const form = useForm<any>({
        name: '',
        segment: 'mbg',
        phone: '',
        email: '',
        city: '',
        address: '',
        source: 'Referensi',
        owner_id: '',
        pic_name: '',
        pic_role: '',
        kitchen_capacity: '',
        delivery_window: '',
        certifications: '',
        pond_count: '',
        pond_area_m2: '',
        water_source: '',
        grow_out_capacity_kg: '',
        target_abw_g: '',
        preferred_products: '',
        payment_terms_days: 14,
        notes: '',
        follow_up_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    });

    useEffect(() => {
        if (window.location.hash === '#new') {
            setShowCreate(true);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    function applyFilter(next: Record<string, string | undefined>) {
        router.get(
            route('customers.index'),
            { q: search || undefined, segment: filters.segment, health: filters.health, ...next },
            { preserveState: true, replace: true },
        );
    }

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        applyFilter({ q: search || undefined });
    }

    function submitCreate(event: FormEvent) {
        event.preventDefault();
        form.post(route('customers.store'), {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Pelanggan" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Pelanggan</span>
                        </div>
                        <h1>Pelanggan</h1>
                        <p>{stats.all} pelanggan terdaftar. {stats.risk} berisiko churn.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary" onClick={() => window.alert('Import CSV/Excel dapat ditambahkan pada fase berikutnya.')}>
                            <Icon name="upload" /> Import
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            <Icon name="plus" /> Tambah Pelanggan
                        </button>
                    </div>
                </div>

                <div className="segment-summary">
                    <button className={`segment-pill ${!filters.segment && !filters.health ? 'active' : ''}`} onClick={() => applyFilter({ segment: undefined, health: undefined })}>
                        <span className="icon tone-teal"><Icon name="users" /></span>
                        <div><strong>{stats.all}</strong><span>Semua pelanggan</span></div>
                        <span className="chev"><Icon name="chevron-right" /></span>
                    </button>
                    <button className={`segment-pill ${filters.segment === 'mbg' ? 'active' : ''}`} onClick={() => applyFilter({ segment: 'mbg', health: undefined })}>
                        <span className="icon tone-blue"><Icon name="utensils" /></span>
                        <div><strong>{stats.mbg}</strong><span>Dapur MBG</span></div>
                        <span className="chev"><Icon name="chevron-right" /></span>
                    </button>
                    <button className={`segment-pill ${filters.segment === 'kolam' ? 'active' : ''}`} onClick={() => applyFilter({ segment: 'kolam', health: undefined })}>
                        <span className="icon tone-green"><Icon name="sprout" /></span>
                        <div><strong>{stats.kolam}</strong><span>Kolam pembesaran</span></div>
                        <span className="chev"><Icon name="chevron-right" /></span>
                    </button>
                    <button className={`segment-pill ${filters.health === 'berisiko' ? 'active' : ''}`} onClick={() => applyFilter({ health: 'berisiko', segment: undefined })}>
                        <span className="icon tone-red"><Icon name="alert" /></span>
                        <div><strong>{stats.risk}</strong><span>Berisiko churn</span></div>
                        <span className="chev"><Icon name="chevron-right" /></span>
                    </button>
                </div>

                {stats.risk > 0 && (
                    <div className="insight-banner">
                        <Icon name="alert" />
                        <span><strong>{stats.risk} pelanggan berisiko churn.</strong> Prioritaskan yang belum dihubungi lebih dari 30 hari.</span>
                        <button className="btn btn-amber btn-sm" onClick={() => applyFilter({ health: 'berisiko', segment: undefined })}>Lihat daftar berisiko</button>
                    </div>
                )}

                <section className="card">
                    <div className="toolbar">
                        <form className="search-field" onSubmit={submitSearch}>
                            <Icon name="search" />
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, PIC, atau kota..." />
                        </form>
                        <select className="select" value={filters.health ?? 'all'} onChange={(event) => applyFilter({ health: event.target.value === 'all' ? undefined : event.target.value })}>
                            <option value="all">Semua kesehatan</option>
                            <option value="aman">Aman</option>
                            <option value="perhatian">Perlu perhatian</option>
                            <option value="berisiko">Berisiko</option>
                        </select>
                        <span className="text-xs muted" style={{ marginLeft: 'auto' }}>
                            Menampilkan {customers.from ?? 0}–{customers.to ?? 0} dari {customers.total} pelanggan
                        </span>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Pelanggan</th>
                                    <th>Segmen</th>
                                    <th>PIC / WhatsApp</th>
                                    <th className="num">LTV</th>
                                    <th>Order terakhir</th>
                                    <th>Kesehatan</th>
                                    <th>Follow-up berikutnya</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.map((customer: any) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="entity">
                                                <span className={`avatar ${segmentAvatarClass(customer.segment)}`}>{initials(customer.name)}</span>
                                                <div>
                                                    <Link className="link-strong" href={route('customers.show', customer.id)}>{customer.name}</Link>
                                                    <span className="sub">{customer.code} · {customer.city ?? '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${segmentBadgeClass(customer.segment)}`}>{customer.segment_label}</span></td>
                                        <td>
                                            {customer.contact?.name ?? '-'}
                                            <span className="sub">{customer.contact?.phone ?? customer.phone ?? '-'}</span>
                                        </td>
                                        <td className="num">{formatRupiah(customer.lifetime_value)}</td>
                                        <td>{customer.last_order_label}</td>
                                        <td>
                                            <div className="health">
                                                <span className="health-bar"><i style={{ width: `${customer.health_score}%`, background: healthColor(customer.health_score) }} /></span>
                                                <span className="health-score">{customer.health_score}</span>
                                                <span className={`badge ${healthBadgeClass(customer.health_score)}`}>{customer.health_label}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {customer.next_follow_up ? (
                                                <span className={`chip ${customer.next_follow_up.is_overdue ? 'chip-danger' : 'chip-info'}`}>
                                                    <Icon name="clock" /> {customer.next_follow_up.due_label}
                                                </span>
                                            ) : (
                                                <span className="chip"><Icon name="calendar" /> Belum dijadwalkan</span>
                                            )}
                                        </td>
                                        <td className="cell-actions">
                                            {customer.phone && (
                                                <a className="btn btn-wa btn-sm" href={whatsappUrl(customer.phone, `Halo Bapak/Ibu ${customer.name}, kami dari Saung Lele.`)} target="_blank" rel="noreferrer">
                                                    <Icon name="whatsapp" />
                                                </a>
                                            )}
                                            <Link className="icon-btn sm" href={route('customers.show', customer.id)} aria-label="Detail pelanggan">
                                                <Icon name="chevron-right" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {customers.data.length === 0 && (
                                    <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon"><Icon name="users" /></div><h3>Belum ada pelanggan</h3><p>Tambahkan pelanggan pertama untuk mulai membangun hubungan.</p><button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Tambah Pelanggan</button></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <span>Menampilkan {customers.from ?? 0}–{customers.to ?? 0} dari {customers.total} pelanggan</span>
                        {customers.last_page > 1 && (
                            <div className="pagination-pages">
                                {customers.links.map((link: any, index: number) => {
                                    const isPrevious = /previous|sebelumnya/i.test(link.label);
                                    const isNext = /next|berikutnya/i.test(link.label);
                                    const label = isPrevious ? '‹' : isNext ? '›' : link.label;
                                    const ariaLabel = isPrevious ? 'Halaman sebelumnya' : isNext ? 'Halaman berikutnya' : `Halaman ${link.label}`;

                                    if (!link.url) {
                                        return <span className="page-btn muted" key={index} aria-label={ariaLabel}>{label}</span>;
                                    }

                                    return (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            className={`page-btn ${link.active ? 'active' : ''}`}
                                            preserveScroll
                                            aria-label={ariaLabel}
                                        >
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <CrmModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Tambah pelanggan baru"
                description="Simpan profil dan langsung jadwalkan follow-up pertama."
                large
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={submitCreate} disabled={form.processing}>
                            <Icon name="check" /> Simpan pelanggan
                        </button>
                    </>
                }
            >
                <form onSubmit={submitCreate}>
                    <div className="form-grid">
                        <Field label="Nama usaha / pelanggan" error={form.errors.name}>
                            <input className="input" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Contoh: Dapur MBG Nusantara 04" />
                        </Field>
                        <Field label="Segmen" error={form.errors.segment}>
                            <select className="form-select" value={form.data.segment} onChange={(event) => form.setData('segment', event.target.value)}>
                                <option value="mbg">Dapur MBG</option>
                                <option value="kolam">Kolam Pembesaran</option>
                            </select>
                        </Field>
                        <Field label="Nama PIC" error={form.errors.pic_name}>
                            <input className="input" value={form.data.pic_name} onChange={(event) => form.setData('pic_name', event.target.value)} placeholder="Nama penanggung jawab" />
                        </Field>
                        <Field label="Nomor WhatsApp" error={form.errors.phone}>
                            <input className="input" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} placeholder="08xx-xxxx-xxxx" />
                        </Field>
                        <Field label="Kota / kabupaten" error={form.errors.city}>
                            <input className="input" value={form.data.city} onChange={(event) => form.setData('city', event.target.value)} placeholder="Semarang" />
                        </Field>
                        <Field label="Sumber lead" error={form.errors.source}>
                            <select className="form-select" value={form.data.source} onChange={(event) => form.setData('source', event.target.value)}>
                                <option>Referensi</option>
                                <option>WhatsApp</option>
                                <option>Kunjungan lapangan</option>
                                <option>Instagram</option>
                                <option>Lainnya</option>
                            </select>
                        </Field>
                        <Field label="Pemilik akun" error={form.errors.owner_id}>
                            <select className="form-select" value={form.data.owner_id} onChange={(event) => form.setData('owner_id', event.target.value)}>
                                <option value="">Saya sendiri</option>
                                {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Termin pembayaran (hari)" error={form.errors.payment_terms_days}>
                            <input className="input" type="number" value={form.data.payment_terms_days} onChange={(event) => form.setData('payment_terms_days', event.target.value)} />
                        </Field>
                    </div>

                    <div className="divider" />

                    {form.data.segment === 'mbg' ? (
                        <div className="form-grid">
                            <Field label="Kapasitas dapur (porsi/hari)">
                                <input className="input" type="number" value={form.data.kitchen_capacity} onChange={(event) => form.setData('kitchen_capacity', event.target.value)} />
                            </Field>
                            <Field label="Jendela pengiriman">
                                <input className="input" value={form.data.delivery_window} onChange={(event) => form.setData('delivery_window', event.target.value)} placeholder="Selasa & Jumat, 05.00–07.00" />
                            </Field>
                            <Field label="Sertifikasi">
                                <input className="input" value={form.data.certifications} onChange={(event) => form.setData('certifications', event.target.value)} placeholder="Halal, NKV" />
                            </Field>
                            <Field label="Produk favorit">
                                <input className="input" value={form.data.preferred_products} onChange={(event) => form.setData('preferred_products', event.target.value)} placeholder="Fillet 250 g, siap masak" />
                            </Field>
                        </div>
                    ) : (
                        <div className="form-grid">
                            <Field label="Jumlah kolam">
                                <input className="input" type="number" value={form.data.pond_count} onChange={(event) => form.setData('pond_count', event.target.value)} />
                            </Field>
                            <Field label="Luas kolam (m²)">
                                <input className="input" type="number" value={form.data.pond_area_m2} onChange={(event) => form.setData('pond_area_m2', event.target.value)} />
                            </Field>
                            <Field label="Sumber air">
                                <input className="input" value={form.data.water_source} onChange={(event) => form.setData('water_source', event.target.value)} placeholder="Sungai, sumur, mata air" />
                            </Field>
                            <Field label="Target ABW (gram)">
                                <input className="input" type="number" value={form.data.target_abw_g} onChange={(event) => form.setData('target_abw_g', event.target.value)} />
                            </Field>
                            <Field label="Kapasitas tebar (kg)">
                                <input className="input" type="number" value={form.data.grow_out_capacity_kg} onChange={(event) => form.setData('grow_out_capacity_kg', event.target.value)} />
                            </Field>
                            <Field label="Produk favorit">
                                <input className="input" value={form.data.preferred_products} onChange={(event) => form.setData('preferred_products', event.target.value)} placeholder="Bibit 3–5 cm" />
                            </Field>
                        </div>
                    )}

                    <div className="form-grid mt-2">
                        <Field label="Alamat">
                            <input className="input" value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} placeholder="Alamat lengkap" />
                        </Field>
                        <Field label="Email (opsional)">
                            <input className="input" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} placeholder="email@contoh.com" />
                        </Field>
                    </div>

                    <div className="field mt-2">
                        <label>Catatan awal</label>
                        <textarea className="textarea" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Kebutuhan, volume, atau konteks penting..." />
                    </div>

                    <div className="field mt-2">
                        <label>Tanggal follow-up pertama</label>
                        <input className="input" type="date" value={form.data.follow_up_date} onChange={(event) => form.setData('follow_up_date', event.target.value)} />
                    </div>

                    {Object.keys(form.errors).length > 0 && (
                        <div className="alert alert-danger mt-2">
                            <Icon name="alert-circle" />
                            <span>Periksa kembali data yang wajib diisi.</span>
                        </div>
                    )}
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <div className="field">
            <label>{label}</label>
            {children}
            {error && <span className="form-note" style={{ color: 'var(--red)' }}>{error}</span>}
        </div>
    );
}
