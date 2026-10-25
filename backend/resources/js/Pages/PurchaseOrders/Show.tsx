import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import {
    formatRupiah,
    statusBadgeClass,
    whatsappUrl,
} from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    order: any;
    steps: any[];
    statusOptions: { value: string; label: string }[];
};

export default function PurchaseOrderShow({ order, steps, statusOptions }: Props) {
    const [showStatus, setShowStatus] = useState(false);
    const [showDelivery, setShowDelivery] = useState(false);
    const [copied, setCopied] = useState(false);

    const statusForm = useForm({
        status: order.status,
        note: '',
    });

    const deliveryForm = useForm({
        driver_name: order.latest_delivery?.driver_name ?? '',
        driver_phone: order.latest_delivery?.driver_phone ?? '',
        vehicle: order.latest_delivery?.vehicle ?? '',
        scheduled_at: order.requested_delivery_at ? `${order.requested_delivery_at}T05:30` : '',
        notes: '',
    });

    function submitStatus(event: FormEvent) {
        event.preventDefault();
        statusForm.patch(route('purchase-orders.status', order.id), {
            preserveScroll: true,
            onSuccess: () => setShowStatus(false),
        });
    }

    function submitDelivery(event: FormEvent) {
        event.preventDefault();
        deliveryForm.post(route('purchase-orders.deliveries.store', order.id), {
            preserveScroll: true,
            onSuccess: () => setShowDelivery(false),
        });
    }

    function sendUpdate() {
        const message = `Bapak/Ibu ${order.customer.contact ?? order.customer.name}, update untuk PO ${order.number}: status saat ini ${order.status_label}. ${order.latest_delivery ? `Pengiriman dijadwalkan ${order.latest_delivery.scheduled_label} oleh ${order.latest_delivery.driver_name ?? 'tim Saung Lele'}.` : ''} Terima kasih.\n\nLihat PO: ${order.public_url}`;
        window.open(whatsappUrl(order.customer.phone, message), '_blank');
    }

    function copyPublicLink() {
        navigator.clipboard.writeText(order.public_url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        });
    }

    const checklist = [
        { label: 'PO dan harga dikonfirmasi', done: order.status !== 'received', meta: order.status === 'received' ? 'Perlu konfirmasi' : 'Sudah dikonfirmasi' },
        { label: 'Produksi / persiapan', done: ['production', 'ready', 'shipped', 'delivered', 'completed'].includes(order.status), meta: 'Panen, sortir, packing' },
        { label: 'QC & packing', done: ['ready', 'shipped', 'delivered', 'completed'].includes(order.status), meta: 'Pemeriksaan kualitas' },
        { label: 'Jadwal pengiriman', done: order.deliveries.length > 0, meta: order.latest_delivery?.scheduled_label ?? 'Belum dijadwalkan' },
        { label: 'Barang diterima pelanggan', done: ['delivered', 'completed'].includes(order.status), meta: order.status === 'completed' ? 'Selesai' : 'Menunggu' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={order.number} />

            <div className="content">
                <section className="po-banner mb-2">
                    <div className="po-banner-row">
                        <div>
                            <div className="breadcrumb">
                                <Link href={route('dashboard')}>Beranda</Link>
                                <Icon name="chevron-right" />
                                <Link href={route('purchase-orders.index')}>Pesanan (PO)</Link>
                                <Icon name="chevron-right" />
                                <span>{order.number}</span>
                            </div>
                            <h1>{order.number}</h1>
                            <p>{order.customer.name} · {order.items.map((item: any) => `${item.qty} ${item.unit} ${item.product ?? item.description}`).join(' + ')}</p>
                            <div className="po-meta">
                                <span><Icon name="package" /> PO customer: {order.customer_po_number ?? '-'}</span>
                                <span><Icon name="file" /> Quotation: {order.quotation?.number ?? '-'}</span>
                                <span><Icon name="calendar" /> Diterima {order.created_label}</span>
                                <span><Icon name="truck" /> Kirim {order.requested_delivery_label}</span>
                            </div>
                        </div>
                        <div className="page-actions">
                            <button className="btn btn-secondary" onClick={sendUpdate}><Icon name="whatsapp" /> Kirim update</button>
                            <button className="btn btn-secondary" onClick={copyPublicLink}><Icon name="link" /> {copied ? 'Link tersalin' : 'Salin link'}</button>
                            <Link className="btn btn-secondary" href={route('invoices.create', { purchase_order_id: order.id })}><Icon name="invoice" /> Buat invoice</Link>
                            <button className="btn btn-secondary" onClick={() => window.print()}><Icon name="clipboard" /> Surat jalan</button>
                            <button className="btn btn-primary" onClick={() => setShowStatus(true)}><Icon name="refresh" /> Update status</button>
                        </div>
                    </div>
                </section>

                <div className="row-between mb-2">
                    <div className="row">
                        <span className={`badge ${statusBadgeClass(order.status)}`} style={{ fontSize: 11, padding: '5px 11px' }}>{order.status_label}</span>
                        <span className="badge badge-neutral">{order.payment_status_label}</span>
                        <span className="chip"><Icon name="clock" /> Progres {order.progress}%</span>
                    </div>
                    <span className="text-xs muted">Nilai PO <strong style={{ color: 'var(--ink)', fontSize: 12 }}>{formatRupiah(order.total, false)}</strong></span>
                </div>

                <section className="card mb-2">
                    <div className="stepper">
                        {steps.map((step, index) => (
                            <div className={`step ${step.state === 'done' ? 'done' : step.state === 'active' ? 'active' : ''}`} key={step.status}>
                                <span className="step-dot">{step.state === 'done' ? <Icon name="check" /> : index + 1}</span>
                                <span className="step-label">{step.label}</span>
                                <span className="step-time">{step.time_label ?? 'Belum'}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="grid grid-2-1">
                    <div className="stack">
                        <section className="card">
                            <div className="card-head"><div><h2>Item pesanan</h2><p>{order.items.length} item · {order.quotation ? `sesuai quotation ${order.quotation.number}` : 'tanpa quotation'}</p></div><span className="badge badge-success">Stok tersedia</span></div>
                            <div className="table-wrap mt-2">
                                <table className="table table-compact">
                                    <thead><tr><th>Produk</th><th>Qty</th><th className="num">Harga</th><th className="num">Subtotal</th></tr></thead>
                                    <tbody>
                                        {order.items.map((item: any) => (
                                            <tr key={item.id}>
                                                <td><strong>{item.description}</strong><span className="sub">{item.fulfilled_qty > 0 ? `${item.fulfilled_qty} ${item.unit} terpenuhi` : 'Belum terpenuhi'}</span></td>
                                                <td>{item.qty} {item.unit}</td>
                                                <td className="num">{formatRupiah(item.unit_price, false)}</td>
                                                <td className="num">{formatRupiah(item.subtotal, false)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-foot"><div className="row-between text-sm"><span className="muted">Subtotal + ongkir + PPN</span><strong style={{ fontSize: 14 }}>{formatRupiah(order.total, false)}</strong></div></div>
                        </section>

                        <section className="card">
                            <div className="card-head"><div><h2>Riwayat progres</h2><p>Audit trail perubahan status PO</p></div></div>
                            <div className="timeline mt-2">
                                {order.history.map((entry: any) => (
                                    <div className="timeline-item" key={entry.id}>
                                        <span className={`timeline-dot ${entry.status === 'production' ? 'purple' : entry.status === 'delivered' || entry.status === 'completed' ? '' : 'blue'}`}><Icon name="check-circle" /></span>
                                        <div className="timeline-head"><strong>{entry.status_label}</strong><time>{entry.time_label} · {entry.changed_by}</time></div>
                                        <div className="timeline-body">{entry.note}</div>
                                    </div>
                                ))}
                                {order.history.length === 0 && <p className="text-sm muted">Belum ada riwayat.</p>}
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div><h2>Pengiriman</h2><p>{order.deliveries.length} jadwal · {order.latest_delivery?.status_label ?? 'Belum dijadwalkan'}</p></div>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowDelivery(true)}><Icon name="plus" /> Tambah jadwal</button>
                            </div>
                            <div className="card-body">
                                {order.latest_delivery ? (
                                    <div className="delivery-card">
                                        <span className="delivery-icon"><Icon name="truck" /></span>
                                        <div className="delivery-main">
                                            <strong>{order.latest_delivery.vehicle ?? 'Kendaraan belum ditentukan'} · {order.latest_delivery.driver_name ?? 'Driver belum ditugaskan'}</strong>
                                            <span>{order.latest_delivery.driver_phone ?? '-'} · {order.latest_delivery.scheduled_label} · {order.customer.address ?? '-'}</span>
                                            <div className="delivery-progress">
                                                <div className="progress amber"><i style={{ width: order.latest_delivery.status === 'delivered' ? '100%' : order.latest_delivery.status === 'in_transit' ? '90%' : '40%' }} /></div>
                                                <div className="delivery-labels"><span>Disiapkan</span><span>Berangkat</span><span>Dalam perjalanan</span><span>Diterima</span></div>
                                            </div>
                                        </div>
                                        <span className={`badge ${statusBadgeClass(order.latest_delivery.status)}`}>{order.latest_delivery.status_label}</span>
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: '20px 0' }}>
                                        <div className="empty-icon"><Icon name="truck" /></div>
                                        <h3>Belum ada jadwal pengiriman</h3>
                                        <p>Tambahkan driver dan jadwal agar pelanggan mendapat update.</p>
                                        <button className="btn btn-primary btn-sm" onClick={() => setShowDelivery(true)}><Icon name="plus" /> Tambah jadwal</button>
                                    </div>
                                )}

                                <div className="info-grid mt-2">
                                    <div className="info-item"><span>Alamat kirim</span><strong>{order.customer.address ?? '-'}</strong></div>
                                    <div className="info-item"><span>Penerima</span><strong>{order.customer.contact ?? '-'} · {order.customer.phone ?? '-'}</strong></div>
                                    <div className="info-item"><span>Termin</span><strong>{order.payment_terms ?? '-'}</strong></div>
                                    <div className="info-item"><span>Catatan</span><strong>{order.notes ?? '-'}</strong></div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="stack">
                        <section className="card">
                            <div className="card-head"><div><h2>Ringkasan</h2><p>Informasi komersial PO</p></div></div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item"><span>Nilai PO</span><strong>{formatRupiah(order.total, false)}</strong></div>
                                    <div className="info-item"><span>Pembayaran</span><strong>{order.payment_status_label}</strong></div>
                                    <div className="info-item"><span>Sales</span><strong>{order.sales ?? '-'}</strong></div>
                                    <div className="info-item"><span>Dibuat</span><strong>{order.created_label}</strong></div>
                                    <div className="info-item"><span>Quotation</span><strong>{order.quotation?.number ?? '-'}</strong></div>
                                    <div className="info-item"><span>Segmen</span><strong>{order.customer.segment_label}</strong></div>
                                </div>
                                <div className="divider" />
                                <div className="pref-list">
                                    <div className="pref-row"><span>Pelanggan</span><strong>{order.customer.name}</strong></div>
                                    <div className="pref-row"><span>Kota</span><strong>{order.customer.city ?? '-'}</strong></div>
                                    <div className="pref-row"><span>Termin</span><strong>{order.payment_terms ?? '-'}</strong></div>
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head"><div><h2>Checklist kesiapan</h2><p>{checklist.filter((item) => item.done).length} dari {checklist.length} selesai</p></div><span className="badge badge-warning">{Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100)}%</span></div>
                            <div className="card-body">
                                <div className="checklist">
                                    {checklist.map((item) => (
                                        <label className="check-item" key={item.label}>
                                            <input type="checkbox" checked={item.done} readOnly />
                                            <div><strong>{item.label}</strong><span>{item.meta}</span></div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head"><div><h2>Dokumen</h2><p>Dokumen terkait PO</p></div></div>
                            <div className="card-body">
                                <div className="doc-list">
                                    <div className="doc-item"><span className="doc-icon"><Icon name="file" /></span><div className="doc-main"><strong>PO Customer - {order.customer_po_number ?? order.number}.pdf</strong><span>Dokumen PO</span></div><Link className="icon-btn sm" href={route('purchase-orders.show', order.id)}><Icon name="eye" /></Link></div>
                                    {order.quotation && <div className="doc-item"><span className="doc-icon"><Icon name="file-check" /></span><div className="doc-main"><strong>Quotation {order.quotation.number}.pdf</strong><span>Referensi penawaran</span></div><Link className="icon-btn sm" href={route('quotations.show', order.quotation.id)}><Icon name="eye" /></Link></div>}
                                    {order.invoices?.map((invoice: any) => (
                                        <div className="doc-item" key={invoice.id}>
                                            <span className="doc-icon"><Icon name="invoice" /></span>
                                            <div className="doc-main"><strong>Invoice {invoice.number}</strong><span>{invoice.status_label} · jatuh tempo {invoice.due_label}</span></div>
                                            <Link className="icon-btn sm" href={route('invoices.show', invoice.id)}><Icon name="eye" /></Link>
                                        </div>
                                    ))}
                                    <div className="doc-item"><span className="doc-icon"><Icon name="truck" /></span><div className="doc-main"><strong>Surat Jalan {order.number}</strong><span>{order.latest_delivery?.status_label ?? 'Draft'}</span></div><button className="icon-btn sm" onClick={() => window.print()}><Icon name="eye" /></button></div>
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head"><div><h2>Aksi cepat</h2><p>Yang biasanya dibutuhkan</p></div></div>
                            <div className="card-body stack-sm">
                                <button className="btn btn-primary btn-block" onClick={() => setShowStatus(true)}><Icon name="refresh" /> Update status PO</button>
                                <button className="btn btn-secondary btn-block" onClick={() => setShowDelivery(true)}><Icon name="truck" /> Atur pengiriman</button>
                                <button className="btn btn-wa btn-block" onClick={sendUpdate}><Icon name="whatsapp" /> Kabari pelanggan</button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <CrmModal
                open={showStatus}
                onClose={() => setShowStatus(false)}
                title="Update status PO"
                description={`${order.number} · ${order.customer.name}`}
                footer={<><button className="btn btn-secondary" onClick={() => setShowStatus(false)}>Batal</button><button className="btn btn-primary" onClick={submitStatus} disabled={statusForm.processing}><Icon name="check" /> Simpan status</button></>}
            >
                <form onSubmit={submitStatus}>
                    <div className="field"><label>Status baru</label><select className="form-select" value={statusForm.data.status} onChange={(event) => statusForm.setData('status', event.target.value)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div className="field mt-2"><label>Catatan progres</label><textarea className="textarea" value={statusForm.data.note} onChange={(event) => statusForm.setData('note', event.target.value)} placeholder="Contoh: QC selesai, fillet sudah dikemas vacuum." /></div>
                    <div className="info-strip mt-2" style={{ fontSize: 10.5 }}><Icon name="alert-circle" /><span>Perubahan status tercatat di riwayat dan dapat dikirim ke pelanggan.</span></div>
                </form>
            </CrmModal>

            <CrmModal
                open={showDelivery}
                onClose={() => setShowDelivery(false)}
                title="Atur pengiriman"
                description={`${order.number} · ${order.customer.name}`}
                footer={<><button className="btn btn-secondary" onClick={() => setShowDelivery(false)}>Batal</button><button className="btn btn-primary" onClick={submitDelivery} disabled={deliveryForm.processing}><Icon name="check" /> Simpan jadwal</button></>}
            >
                <form onSubmit={submitDelivery}>
                    <div className="form-grid">
                        <div className="field"><label>Nama driver</label><input className="input" value={deliveryForm.data.driver_name} onChange={(event) => deliveryForm.setData('driver_name', event.target.value)} placeholder="Pak Yanto" /></div>
                        <div className="field"><label>Telepon driver</label><input className="input" value={deliveryForm.data.driver_phone} onChange={(event) => deliveryForm.setData('driver_phone', event.target.value)} placeholder="0812-xxxx-xxxx" /></div>
                        <div className="field"><label>Kendaraan</label><input className="input" value={deliveryForm.data.vehicle} onChange={(event) => deliveryForm.setData('vehicle', event.target.value)} placeholder="Pickup B 9123 XYZ" /></div>
                        <div className="field"><label>Jadwal berangkat</label><input className="input" type="datetime-local" value={deliveryForm.data.scheduled_at} onChange={(event) => deliveryForm.setData('scheduled_at', event.target.value)} /></div>
                    </div>
                    <div className="field mt-2"><label>Catatan</label><textarea className="textarea" value={deliveryForm.data.notes} onChange={(event) => deliveryForm.setData('notes', event.target.value)} /></div>
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}
