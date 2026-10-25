import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { formatRupiah, segmentBadgeClass, statusBadgeClass } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    invoices: any;
    filters: { q?: string; status?: string };
    stats: any;
};

const STATUS_OPTIONS = [
    { value: '', label: 'Semua status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Terkirim' },
    { value: 'paid', label: 'Lunas' },
    { value: 'overdue', label: 'Terlambat' },
    { value: 'cancelled', label: 'Dibatalkan' },
];

export default function InvoiceIndex({ invoices, filters, stats }: Props) {
    const [search, setSearch] = useState(filters.q ?? '');

    function apply(next: Record<string, string | undefined>) {
        router.get(route('invoices.index'), { q: search || undefined, status: filters.status, ...next }, { preserveState: true, replace: true });
    }

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        apply({ q: search || undefined });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Invoice" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Invoice</span>
                        </div>
                        <h1>Invoice</h1>
                        <p>{stats.total} invoice · {stats.unpaid} belum lunas · nilai tertagih {formatRupiah(stats.outstanding)}.</p>
                    </div>
                    <div className="page-actions">
                        <Link className="btn btn-secondary" href={route('purchase-orders.index')}>
                            <Icon name="package" /> Pesanan (PO)
                        </Link>
                        <Link className="btn btn-primary" href={route('invoices.create')}>
                            <Icon name="plus" /> Invoice Baru
                        </Link>
                    </div>
                </div>

                <div className="kpi-grid cols-4">
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-teal"><Icon name="invoice" /></span><span className="trend up">Total</span></div><div className="kpi-value">{stats.total}</div><div className="kpi-label">Semua invoice</div><div className="kpi-foot"><span>Draft sampai dibatalkan</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="clock" /></span><span className="trend up">Belum lunas</span></div><div className="kpi-value">{stats.unpaid}</div><div className="kpi-label">Menunggu pembayaran</div><div className="kpi-foot"><span>Perlu ditagih</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-red"><Icon name="alert" /></span><span className="trend up">Terlambat</span></div><div className="kpi-value">{stats.overdue}</div><div className="kpi-label">Lewat jatuh tempo</div><div className="kpi-foot"><span>Prioritas follow-up</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="cash" /></span><span className="trend up">Tertagih</span></div><div className="kpi-value">{formatRupiah(stats.outstanding)}</div><div className="kpi-label">Nilai belum dibayar</div><div className="kpi-foot"><span>Diterima {formatRupiah(stats.paid_value)}</span></div></div>
                </div>

                <section className="card">
                    <div className="toolbar">
                        <form className="search-field" onSubmit={submitSearch}>
                            <Icon name="search" />
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor invoice atau pelanggan..." />
                        </form>
                        <select className="select" value={filters.status ?? ''} onChange={(event) => apply({ status: event.target.value || undefined })}>
                            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <span className="text-xs muted" style={{ marginLeft: 'auto' }}>Menampilkan {invoices.from ?? 0}–{invoices.to ?? 0} dari {invoices.total} invoice</span>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Nomor</th><th>Pelanggan</th><th>Segmen</th><th>Tanggal</th><th>Jatuh tempo</th><th>Item</th><th className="num">Nilai</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody>
                                {invoices.data.map((invoice: any) => (
                                    <tr key={invoice.id}>
                                        <td><Link className="link-strong nowrap" href={route('invoices.show', invoice.id)}>{invoice.number}</Link><span className="sub">{invoice.purchase_order ? `PO ${invoice.purchase_order}` : 'Manual'}</span></td>
                                        <td>
                                            <div className="entity">
                                                <span className={`avatar avatar-sm ${invoice.customer.segment === 'mbg' ? 'mbg' : 'kolam'}`}>{invoice.customer.name.split(' ').map((part: string) => part[0]).slice(0, 2).join('')}</span>
                                                <div>
                                                    <Link className="link-strong" href={route('customers.show', invoice.customer.id)}>{invoice.customer.name}</Link>
                                                    <span className="sub">{invoice.items_count} item</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${segmentBadgeClass(invoice.customer.segment)}`}>{invoice.customer.segment_label}</span></td>
                                        <td>{invoice.issued_label}</td>
                                        <td>{invoice.due_label}{invoice.is_overdue && <span className="sub">Lewat jatuh tempo</span>}</td>
                                        <td>{invoice.items_count}</td>
                                        <td className="num">{formatRupiah(invoice.total)}{Number(invoice.down_payment) > 0 && <span className="sub">DP {formatRupiah(invoice.down_payment)} · Sisa {formatRupiah(invoice.remaining)}</span>}</td>
                                        <td><span className={`badge ${statusBadgeClass(invoice.status)}`}>{invoice.status_label}</span><span className="sub">{invoice.payment_status_label}</span></td>
                                        <td className="cell-actions">
                                            {invoice.can_edit && (
                                                <Link className="icon-btn sm" href={route('invoices.edit', invoice.id)} title="Edit invoice" aria-label="Edit invoice">
                                                    <Icon name="edit" />
                                                </Link>
                                            )}
                                            <Link className="icon-btn sm" href={route('invoices.show', invoice.id)} title="Buka invoice" aria-label="Buka invoice">
                                                <Icon name="chevron-right" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.data.length === 0 && (
                                    <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon"><Icon name="invoice" /></div><h3>Belum ada invoice</h3><p>Buat invoice pertama dari pelanggan atau dari PO.</p><Link className="btn btn-primary btn-sm" href={route('invoices.create')}><Icon name="plus" /> Invoice Baru</Link></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <span>Menampilkan {invoices.from ?? 0}–{invoices.to ?? 0} dari {invoices.total} invoice</span>
                        {invoices.last_page > 1 && (
                            <div className="pagination-pages">
                                {invoices.links.map((link: any, index: number) => {
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
