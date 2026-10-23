import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import {
    formatRupiah,
    initials,
    segmentAvatarClass,
    segmentBadgeClass,
    statusBadgeClass,
} from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    orders: any;
    filters: { q?: string; status?: string; segment?: string };
    stats: any;
    statusCounts: Record<string, number>;
    statusOptions: { value: string; label: string }[];
    todayDeliveries: any[];
};

const STATUS_TABS = [
    { key: 'all', label: 'Semua' },
    { key: 'received', label: 'Diterima' },
    { key: 'confirmed', label: 'Dikonfirmasi' },
    { key: 'production', label: 'Produksi' },
    { key: 'ready', label: 'Siap kirim' },
    { key: 'shipped', label: 'Dikirim' },
    { key: 'completed', label: 'Selesai' },
];

export default function PurchaseOrdersIndex({ orders, filters, stats, statusCounts, todayDeliveries }: Props) {
    const [search, setSearch] = useState(filters.q ?? '');

    function apply(next: Record<string, string | undefined>) {
        router.get(route('purchase-orders.index'), { q: search || undefined, status: filters.status, segment: filters.segment, ...next }, { preserveState: true, replace: true });
    }

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        apply({ q: search || undefined });
    }

    const actionNeeded = orders.data.filter((po: any) => po.is_overdue || po.status === 'received');

    return (
        <AuthenticatedLayout>
            <Head title="Pesanan (PO)" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><span>Beranda</span><Icon name="chevron-right" /><span>Pesanan (PO)</span></div>
                        <h1>Pesanan (PO)</h1>
                        <p>Terima PO, pantau produksi, QC, pengiriman, hingga diterima pelanggan.</p>
                    </div>
                    <div className="page-actions">
                        <Link className="btn btn-secondary" href={route('reports.index')}><Icon name="download" /> Laporan</Link>
                        <Link className="btn btn-primary" href={route('purchase-orders.create')}><Icon name="plus" /> Terima PO</Link>
                    </div>
                </div>

                <div className="kpi-grid cols-4">
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="inbox" /></span><span className="badge badge-info">Baru</span></div>
                        <div className="kpi-value">{stats.received}</div>
                        <div className="kpi-label">PO perlu dikonfirmasi</div>
                        <div className="kpi-foot"><span>SLA &lt; 4 jam kerja</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-purple"><Icon name="package" /></span><span className="trend up">{stats.in_process}</span></div>
                        <div className="kpi-value">{stats.in_process}</div>
                        <div className="kpi-label">PO diproses</div>
                        <div className="kpi-foot"><span>{stats.ready} siap kirim · {stats.shipped} dikirim</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="truck" /></span><span className="badge badge-warning">Hari ini</span></div>
                        <div className="kpi-value">{todayDeliveries.length}</div>
                        <div className="kpi-label">Pengiriman hari ini</div>
                        <div className="kpi-foot"><span>Pantau antrean di bawah</span></div>
                    </div>
                    <div className="kpi-card accent">
                        <div className="kpi-top"><span className="kpi-icon tone-red"><Icon name="alert" /></span><span className="badge badge-danger">Perlu tindakan</span></div>
                        <div className="kpi-value">{stats.overdue}</div>
                        <div className="kpi-label">PO terlambat</div>
                        <div className="kpi-foot"><span>Berdasarkan tanggal kirim</span></div>
                    </div>
                </div>

                <section className="card mb-3">
                    <div className="tabs">
                        {STATUS_TABS.map((tab) => (
                            <button key={tab.key} className={`tab ${(filters.status || 'all') === tab.key ? 'active' : ''}`} onClick={() => apply({ status: tab.key === 'all' ? undefined : tab.key })}>
                                {tab.label}
                                <span className="count">{tab.key === 'all' ? stats.total : (statusCounts[tab.key] ?? 0)}</span>
                            </button>
                        ))}
                    </div>

                    <div className="toolbar">
                        <form className="search-field" onSubmit={submitSearch}>
                            <Icon name="search" />
                            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor PO atau pelanggan..." />
                        </form>
                        <select className="select" value={filters.segment ?? 'all'} onChange={(event) => apply({ segment: event.target.value === 'all' ? undefined : event.target.value })}>
                            <option value="all">Semua segmen</option>
                            <option value="mbg">Dapur MBG</option>
                            <option value="kolam">Kolam Pembesaran</option>
                        </select>
                        <span className="text-xs muted" style={{ marginLeft: 'auto' }}>{orders.total} PO · {stats.overdue} terlambat</span>
                    </div>

                    <div className="table-wrap">
                        <table className="table po-table">
                            <thead><tr><th>No. PO</th><th>Pelanggan</th><th>Segmen</th><th>Item</th><th className="num">Nilai</th><th>Status</th><th>Progres</th><th>Kirim</th><th /></tr></thead>
                            <tbody>
                                {orders.data.map((po: any) => (
                                    <tr key={po.id}>
                                        <td><Link className="link-strong nowrap" href={route('purchase-orders.show', po.id)}>{po.number}</Link><span className="sub">PO customer: {po.customer_po_number ?? '-'}</span></td>
                                        <td><div className="entity"><span className={`avatar avatar-sm ${segmentAvatarClass(po.customer.segment)}`}>{initials(po.customer.name)}</span><div><strong>{po.customer.name}</strong><span className="sub">{po.customer.city ?? '-'}</span></div></div></td>
                                        <td><span className={`badge ${segmentBadgeClass(po.customer.segment)}`}>{po.customer.segment_label}</span></td>
                                        <td>{po.items_summary}</td>
                                        <td className="num">{formatRupiah(po.total)}</td>
                                        <td><span className={`badge ${statusBadgeClass(po.is_overdue ? 'late' : po.status)}`}>{po.is_overdue ? 'Terlambat' : po.status_label}</span></td>
                                        <td><div className="progress"><i style={{ width: `${po.progress}%` }} /></div></td>
                                        <td className={po.is_overdue ? 'nowrap' : ''} style={po.is_overdue ? { color: 'var(--red)', fontWeight: 700 } : {}}>{po.requested_delivery_label}</td>
                                        <td className="cell-actions"><Link className="icon-btn sm" href={route('purchase-orders.show', po.id)}><Icon name="chevron-right" /></Link></td>
                                    </tr>
                                ))}
                                {orders.data.length === 0 && <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon"><Icon name="package" /></div><h3>Tidak ada PO</h3><p>PO yang sesuai filter akan muncul di sini.</p></div></td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="pagination">
                        <span>Menampilkan {orders.from ?? 0}–{orders.to ?? 0} dari {orders.total} PO</span>
                        {orders.last_page > 1 && (
                            <div className="pagination-pages">
                                {orders.links.map((link: any, index: number) => {
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

                <div className="grid grid-1-1">
                    <section className="card">
                        <div className="card-head">
                            <div><h2>Antrean pengiriman hari ini</h2><p>{todayDeliveries.length} pengiriman terjadwal</p></div>
                            <Link className="link" href={route('purchase-orders.index')}>Buka jadwal</Link>
                        </div>
                        <div className="card-body stack-sm">
                            {todayDeliveries.map((delivery) => (
                                <div className="delivery-card" key={delivery.id}>
                                    <span className="delivery-icon"><Icon name="truck" /></span>
                                    <div className="delivery-main">
                                        <strong>{delivery.purchase_order.number} · {delivery.purchase_order.customer}</strong>
                                        <span>{delivery.driver_name ?? 'Driver belum ditugaskan'} · {delivery.scheduled_label} · {delivery.vehicle ?? '-'}</span>
                                        <div className="delivery-progress">
                                            <div className={`progress ${delivery.status === 'in_transit' ? '' : 'amber'}`}><i style={{ width: delivery.status === 'delivered' ? '100%' : delivery.status === 'in_transit' ? '90%' : '50%' }} /></div>
                                            <div className="delivery-labels"><span>Disiapkan</span><span>Berangkat</span><span>Diterima</span></div>
                                        </div>
                                    </div>
                                    <span className={`badge ${statusBadgeClass(delivery.status)}`}>{delivery.status_label}</span>
                                </div>
                            ))}
                            {todayDeliveries.length === 0 && <div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-icon"><Icon name="truck" /></div><h3>Tidak ada pengiriman hari ini</h3><p>Jadwal pengiriman akan muncul di sini.</p></div>}
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-head">
                            <div><h2>PO perlu tindakan</h2><p>Prioritas berdasarkan SLA dan tanggal kirim</p></div>
                            <span className="badge badge-danger">{stats.overdue} terlambat</span>
                        </div>
                        <div className="card-body">
                            {actionNeeded.map((po: any) => (
                                <div className="list-row" key={po.id}>
                                    <span className={`dot ${po.is_overdue ? 'red' : 'amber'}`} />
                                    <div className="list-row-main">
                                        <strong>{po.number} · {po.customer.name}</strong>
                                        <span>{po.is_overdue ? 'Terlambat' : 'Baru masuk'} · {po.items_summary}</span>
                                    </div>
                                    <Link className="btn btn-secondary btn-sm" href={route('purchase-orders.show', po.id)}>Tinjau</Link>
                                </div>
                            ))}
                            {actionNeeded.length === 0 && <div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-icon"><Icon name="check-circle" /></div><h3>Tidak ada PO mendesak</h3><p>Semua PO berjalan sesuai jadwal.</p></div>}
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
