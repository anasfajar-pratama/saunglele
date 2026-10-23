import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { formatRupiah, segmentBadgeClass, statusBadgeClass } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    quotations: any;
    filters: { q?: string; status?: string };
    stats: any;
};

const STATUS_OPTIONS = [
    { value: '', label: 'Semua status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Terkirim' },
    { value: 'accepted', label: 'Diterima' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'expired', label: 'Kedaluwarsa' },
    { value: 'revised', label: 'Revisi' },
];

export default function QuotationHistory({ quotations, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.q ?? '');

    function apply(next: Record<string, string | undefined>) {
        router.get(route('quotations.history'), { q: search || undefined, status: filters.status, ...next }, { preserveState: true, replace: true });
    }

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        apply({ q: search || undefined });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Daftar Quotation" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Quotation</span>
                            <Icon name="chevron-right" />
                            <span>Daftar</span>
                        </div>
                        <h1>Daftar Quotation</h1>
                        <p>{stats.total} quotation · {stats.accepted} diterima · nilai diterima {formatRupiah(stats.value)}.</p>
                    </div>
                    <div className="page-actions">
                        <Link className="btn btn-secondary" href={route('master.index')}>
                            <Icon name="settings" /> Master Data
                        </Link>
                        <Link className="btn btn-primary" href={route('quotations.index')}>
                            <Icon name="plus" /> Quotation Baru
                        </Link>
                    </div>
                </div>

                <div className="kpi-grid cols-4">
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-teal"><Icon name="file" /></span><span className="trend up">Total</span></div><div className="kpi-value">{stats.total}</div><div className="kpi-label">Semua quotation</div><div className="kpi-foot"><span>Draft sampai selesai</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="send" /></span><span className="trend up">Terkirim</span></div><div className="kpi-value">{stats.sent}</div><div className="kpi-label">Menunggu respons</div><div className="kpi-foot"><span>Perlu follow-up</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-green"><Icon name="check-circle" /></span><span className="trend up">Diterima</span></div><div className="kpi-value">{stats.accepted}</div><div className="kpi-label">Siap menjadi PO</div><div className="kpi-foot"><span>Bisa dibuatkan PO</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="cash" /></span><span className="trend up">Nilai</span></div><div className="kpi-value">{formatRupiah(stats.value)}</div><div className="kpi-label">Nilai quotation diterima</div><div className="kpi-foot"><span>Akumulasi</span></div></div>
                </div>

                <section className="card">
                    <div className="toolbar">
                        <form className="search-field" onSubmit={submitSearch}>
                            <Icon name="search" />
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor quotation atau pelanggan..." />
                        </form>
                        <select className="select" value={filters.status ?? ''} onChange={(event) => apply({ status: event.target.value || undefined })}>
                            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <span className="text-xs muted" style={{ marginLeft: 'auto' }}>Menampilkan {quotations.from ?? 0}–{quotations.to ?? 0} dari {quotations.total} quotation</span>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Nomor</th><th>Pelanggan</th><th>Segmen</th><th>Tanggal</th><th>Berlaku s.d.</th><th>Item</th><th className="num">Nilai</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {quotations.data.map((quotation: any) => (
                                    <tr key={quotation.id}>
                                        <td><Link className="link-strong nowrap" href={route('quotations.show', quotation.id)}>{quotation.number}</Link></td>
                                        <td>
                                            <div className="entity">
                                                <span className={`avatar avatar-sm ${quotation.customer.segment === 'mbg' ? 'mbg' : 'kolam'}`}>{quotation.customer.name.split(' ').map((part: string) => part[0]).slice(0, 2).join('')}</span>
                                                <div>
                                                    <Link className="link-strong" href={route('customers.show', quotation.customer.id)}>{quotation.customer.name}</Link>
                                                    <span className="sub">{quotation.items_count} item</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${segmentBadgeClass(quotation.customer.segment)}`}>{quotation.customer.segment_label}</span></td>
                                        <td>{quotation.issued_label}</td>
                                        <td>{quotation.valid_label}</td>
                                        <td>{quotation.items_count}</td>
                                        <td className="num">{formatRupiah(quotation.total)}</td>
                                        <td><span className={`badge ${statusBadgeClass(quotation.status)}`}>{quotation.status_label}</span></td>
                                        <td className="cell-actions">
                                            {quotation.can_create_po && (
                                                <Link className="icon-btn sm" href={route('purchase-orders.create', { quotation_id: quotation.id })} title="Buat PO dari quotation" aria-label="Buat PO dari quotation">
                                                    <Icon name="package" />
                                                </Link>
                                            )}
                                            {quotation.can_edit && (
                                                <Link className="icon-btn sm" href={route('quotations.edit', quotation.id)} title="Edit quotation" aria-label="Edit quotation">
                                                    <Icon name="edit" />
                                                </Link>
                                            )}
                                            <Link className="icon-btn sm" href={route('quotations.show', quotation.id)} title="Buka quotation" aria-label="Buka quotation">
                                                <Icon name="chevron-right" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {quotations.data.length === 0 && (
                                    <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon"><Icon name="file" /></div><h3>Belum ada quotation</h3><p>Buat quotation pertama dari halaman builder.</p><Link className="btn btn-primary btn-sm" href={route('quotations.index')}><Icon name="plus" /> Quotation Baru</Link></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <span>Menampilkan {quotations.from ?? 0}–{quotations.to ?? 0} dari {quotations.total} quotation</span>
                        {quotations.last_page > 1 && (
                            <div className="pagination-pages">
                                {quotations.links.map((link: any, index: number) => {
                                    const isPrevious = /previous|sebelumnya/i.test(link.label);
                                    const isNext = /next|berikutnya/i.test(link.label);
                                    const label = isPrevious ? '‹' : isNext ? '›' : link.label;
                                    const ariaLabel = isPrevious ? 'Halaman sebelumnya' : isNext ? 'Halaman berikutnya' : `Halaman ${link.label}`;

                                    if (!link.url) {
                                        return <span className="page-btn muted" key={index} aria-label={ariaLabel}>{label}</span>;
                                    }

                                    return (
                                        <Link key={index} href={link.url} className={`page-btn ${link.active ? 'active' : ''}`} preserveScroll aria-label={ariaLabel}>
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
