import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import { formatRupiah, statusBadgeClass, whatsappUrl } from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    invoice: any;
    paymentMethods: { value: string; label: string }[];
};

function todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function InvoiceShow({ invoice, paymentMethods }: Props) {
    const [copied, setCopied] = useState(false);
    const [paymentModal, setPaymentModal] = useState<{ mode: 'create' | 'edit'; payment?: any } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

    const isPaid = invoice.status === 'paid';
    const isCancelled = invoice.status === 'cancelled';
    const downPayment = Number(invoice.down_payment ?? 0);
    const paidAmount = Number(invoice.paid_amount ?? 0);
    const remaining = Number(invoice.remaining ?? Math.max(0, Number(invoice.total) - paidAmount));
    const otherPaid = Math.max(0, paidAmount - downPayment);
    const isSettled = remaining <= 0;
    const progress = Number(
        invoice.progress ??
            (Number(invoice.total) > 0 ? Math.min(100, Math.round((paidAmount / Number(invoice.total)) * 100)) : 0),
    );
    const paymentBadgeClass =
        invoice.payment_status === 'paid' ? 'badge-success' : invoice.payment_status === 'partial' ? 'badge-warning' : 'badge-neutral';

    const paymentMax =
        paymentModal?.mode === 'edit' && paymentModal.payment
            ? Math.max(0, Number(invoice.total) - paidAmount + Number(paymentModal.payment.amount))
            : remaining;

    const paymentForm = useForm<any>({
        paid_at: todayISO(),
        amount: remaining,
        method: 'transfer',
        reference: '',
        notes: '',
    });

    function updateStatus(status: string) {
        router.patch(route('invoices.status', invoice.id), { status }, { preserveScroll: true });
    }

    function sendWhatsapp() {
        const payment = paidAmount > 0
            ? `total ${formatRupiah(invoice.total, false)}, sudah dibayar ${formatRupiah(paidAmount, false)}, sisa ${formatRupiah(remaining, false)}`
            : `total ${formatRupiah(invoice.total, false)}`;
        const message = `Halo Bapak/Ibu ${invoice.customer.contact ?? invoice.customer.name}, invoice ${invoice.number} dari Saung Lele dengan ${payment} telah kami terbitkan. Jatuh tempo ${invoice.due_label}.${invoice.purchase_order ? ` Referensi PO ${invoice.purchase_order.number}.` : ''} Mohon cantumkan nomor invoice pada berita transfer.\n\nLihat invoice: ${invoice.public_url}`;
        window.open(whatsappUrl(invoice.customer.phone, message), '_blank');
    }

    function copyPublicLink() {
        navigator.clipboard.writeText(invoice.public_url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        });
    }

    function openCreatePayment() {
        if (remaining <= 0 || isCancelled) return;

        paymentForm.setData({
            paid_at: todayISO(),
            amount: remaining,
            method: 'transfer',
            reference: '',
            notes: '',
        });
        paymentForm.clearErrors();
        setPaymentModal({ mode: 'create' });
    }

    function openEditPayment(payment: any) {
        paymentForm.setData({
            paid_at: payment.paid_at ?? todayISO(),
            amount: Number(payment.amount),
            method: payment.method ?? 'transfer',
            reference: payment.reference ?? '',
            notes: payment.notes ?? '',
        });
        paymentForm.clearErrors();
        setPaymentModal({ mode: 'edit', payment });
    }

    function submitPayment(event: FormEvent) {
        event.preventDefault();

        if (paymentModal?.mode === 'edit' && paymentModal.payment) {
            paymentForm.patch(
                route('invoices.payments.update', { invoice: invoice.id, payment: paymentModal.payment.id }),
                {
                    preserveScroll: true,
                    onSuccess: () => setPaymentModal(null),
                },
            );

            return;
        }

        paymentForm.post(route('invoices.payments.store', invoice.id), {
            preserveScroll: true,
            onSuccess: () => setPaymentModal(null),
        });
    }

    function deletePayment() {
        if (!deleteTarget) return;

        router.delete(route('invoices.payments.destroy', { invoice: invoice.id, payment: deleteTarget.id }), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Invoice ${invoice.number}`} />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <Link href={route('dashboard')}>Beranda</Link>
                            <Icon name="chevron-right" />
                            <Link href={route('invoices.index')}>Invoice</Link>
                            <Icon name="chevron-right" />
                            <span>{invoice.number}</span>
                        </div>
                        <h1>Invoice {invoice.number}</h1>
                        <p>{invoice.customer.name} · {invoice.issued_label} · jatuh tempo {invoice.due_label}.</p>
                    </div>
                    <div className="page-actions">
                        {invoice.can_edit && (
                            <Link className="btn btn-secondary" href={route('invoices.edit', invoice.id)}>
                                <Icon name="edit" /> Edit Invoice
                            </Link>
                        )}
                        {invoice.status === 'draft' && <button className="btn btn-secondary" onClick={() => updateStatus('sent')}><Icon name="send" /> Tandai terkirim</button>}
                        {!isPaid && !isCancelled && remaining > 0 && <button className="btn btn-primary" onClick={() => updateStatus('paid')}><Icon name="check" /> Tandai lunas</button>}
                        {!isPaid && !isCancelled && paidAmount <= 0 && <button className="btn btn-secondary" onClick={() => updateStatus('cancelled')}><Icon name="x" /> Batalkan</button>}
                        <button className="btn btn-wa" onClick={sendWhatsapp}><Icon name="whatsapp" /> Kirim WhatsApp</button>
                        <button className="btn btn-secondary" onClick={() => window.print()}><Icon name="download" /> Cetak</button>
                        <button className="btn btn-secondary" onClick={copyPublicLink}><Icon name="link" /> {copied ? 'Link tersalin' : 'Salin link'}</button>
                    </div>
                </div>

                <div className="row mb-2">
                    <span className={`badge ${statusBadgeClass(invoice.status)}`} style={{ fontSize: 11, padding: '5px 11px' }}>{invoice.status_label}</span>
                    <span className={`badge ${paymentBadgeClass}`}>{invoice.payment_status_label}</span>
                    <span className="chip"><Icon name="clock" /> Jatuh tempo {invoice.due_label}</span>
                    {downPayment > 0 && <span className="chip"><Icon name="cash" /> DP {formatRupiah(downPayment, false)}</span>}
                    {!isSettled && !isCancelled && <span className="chip"><Icon name="cash" /> Sisa {formatRupiah(remaining, false)}</span>}
                    {invoice.is_overdue && <span className="chip chip-danger"><Icon name="alert" /> Lewat jatuh tempo</span>}
                    {invoice.purchase_order && (
                        <Link className="chip" href={route('purchase-orders.show', invoice.purchase_order.id)}>
                            <Icon name="package" /> PO {invoice.purchase_order.number}
                        </Link>
                    )}
                    {invoice.quotation && (
                        <Link className="chip" href={route('quotations.show', invoice.quotation.id)}>
                            <Icon name="file" /> Quotation {invoice.quotation.number}
                        </Link>
                    )}
                    <span className="text-xs muted">Total <strong style={{ color: 'var(--ink)', fontSize: 12 }}>{formatRupiah(invoice.total, false)}</strong></span>
                </div>

                <div className="doc-preview">
                    <div className="doc-preview-head">
                        <div className="doc-brand">
                            <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}><Icon name="fish" /></span>
                            <div><strong>Saung Lele</strong><span>Ternak &amp; Jual Beli Lele · Semarang</span></div>
                        </div>
                        <div className="doc-title"><strong>INVOICE</strong><span>{invoice.number}</span></div>
                    </div>

                    <div className="doc-meta-grid">
                        <div>
                            <span className="eyebrow">Ditagihkan kepada</span>
                            <strong>{invoice.customer.name}</strong>
                            <p>{invoice.customer.address ?? '-'}<br />{invoice.customer.city ?? ''}<br />PIC: {invoice.customer.contact ?? '-'} · {invoice.customer.phone ?? '-'}</p>
                        </div>
                        <div>
                            <span className="eyebrow">Detail</span>
                            <p>Tanggal: {invoice.issued_label}<br />Jatuh tempo: {invoice.due_label}<br />PO: {invoice.purchase_order?.number ?? '-'}<br />Sales: {invoice.sales ?? '-'}</p>
                        </div>
                    </div>

                    <table className="doc-table">
                        <thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            {invoice.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td>{item.description}</td>
                                    <td>{item.qty} {item.unit}</td>
                                    <td>{formatRupiah(item.unit_price, false)}</td>
                                    <td>{formatRupiah(item.subtotal, false)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="doc-totals">
                        <div><span>Subtotal</span><strong>{formatRupiah(invoice.subtotal, false)}</strong></div>
                        {invoice.discount > 0 && <div><span>Diskon</span><strong>- {formatRupiah(invoice.discount, false)}</strong></div>}
                        <div><span>Ongkir</span><strong>{formatRupiah(invoice.shipping, false)}</strong></div>
                        {invoice.tax > 0 && <div><span>PPN</span><strong>{formatRupiah(invoice.tax, false)}</strong></div>}
                        <div className="total"><span>Total</span><strong>{formatRupiah(invoice.total, false)}</strong></div>
                        {downPayment > 0 && <div><span>DP / uang muka</span><strong>- {formatRupiah(downPayment, false)}</strong></div>}
                        {otherPaid > 0 && <div><span>Pembayaran</span><strong>- {formatRupiah(otherPaid, false)}</strong></div>}
                        {!isSettled && <div><span>Sisa tagihan</span><strong>{formatRupiah(remaining, false)}</strong></div>}
                    </div>

                    {isPaid && (
                        <div className="doc-terms"><strong>Status pembayaran</strong><p>Invoice ini sudah lunas. Terima kasih atas pembayaran Bapak/Ibu.</p></div>
                    )}
                    {!isPaid && isSettled && !isCancelled && (
                        <div className="doc-terms"><strong>Status pembayaran</strong><p>Tidak ada sisa tagihan. Seluruh pembayaran sudah tercatat.</p></div>
                    )}
                    {invoice.notes && <div className="doc-terms"><strong>Catatan</strong><p>{invoice.notes}</p></div>}
                    {invoice.terms && <div className="doc-terms"><strong>Syarat &amp; ketentuan</strong><p>{invoice.terms}</p></div>}

                    <div className="doc-sign">
                        <div><span>Hormat kami,</span><strong>{invoice.sales ?? 'Saung Lele'}</strong><span>Saung Lele</span></div>
                        <div><span>Diterima oleh,</span><strong>________________</strong><span>{invoice.customer.name}</span></div>
                    </div>
                </div>

                <div className="grid grid-2-1 mt-2">
                    <section className="card">
                        <div className="card-head">
                            <div><h2>Riwayat pembayaran</h2><p>{invoice.payments.length} pembayaran · {invoice.payment_status_label}</p></div>
                            <button className="btn btn-primary btn-sm" onClick={openCreatePayment} disabled={remaining <= 0 || isCancelled}>
                                <Icon name="plus" /> Catat pembayaran
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="progress mb-2"><i style={{ width: `${progress}%` }} /></div>
                            <div className="row-between text-xs muted mb-2">
                                <span>Terbayar {formatRupiah(paidAmount, false)}</span>
                                <span>{progress}% dari {formatRupiah(invoice.total, false)}</span>
                            </div>

                            {invoice.payments.length > 0 ? (
                                <div className="table-wrap">
                                    <table className="table table-compact">
                                        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Metode</th><th className="num">Jumlah</th><th /></tr></thead>
                                        <tbody>
                                            {invoice.payments.map((payment: any) => (
                                                <tr key={payment.id}>
                                                    <td>{payment.paid_label}<span className="sub">{payment.created_by ? `Dicatat ${payment.created_by}` : 'Pembayaran manual'}</span></td>
                                                    <td>{payment.type_label}{payment.reference && <span className="sub">Ref. {payment.reference}</span>}</td>
                                                    <td>{payment.method_label}{payment.notes && <span className="sub">{payment.notes}</span>}</td>
                                                    <td className="num">{formatRupiah(payment.amount, false)}</td>
                                                    <td className="cell-actions">
                                                        {!isCancelled && (
                                                            <>
                                                                <button className="icon-btn sm" onClick={() => openEditPayment(payment)} title="Edit pembayaran" aria-label="Edit pembayaran">
                                                                    <Icon name="edit" />
                                                                </button>
                                                                <button className="icon-btn sm" onClick={() => setDeleteTarget(payment)} title="Hapus pembayaran" aria-label="Hapus pembayaran">
                                                                    <Icon name="trash" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: '20px 0' }}>
                                    <div className="empty-icon"><Icon name="cash" /></div>
                                    <h3>Belum ada pembayaran</h3>
                                    <p>Catat DP, cicilan, atau pelunasan agar sisa tagihan selalu akurat.</p>
                                    <button className="btn btn-primary btn-sm" onClick={openCreatePayment} disabled={remaining <= 0 || isCancelled}>
                                        <Icon name="plus" /> Catat pembayaran
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="stack">
                        <section className="card">
                            <div className="card-head">
                                <div><h2>Ringkasan pembayaran</h2><p>Status tagihan invoice</p></div>
                                <span className={`badge ${paymentBadgeClass}`}>{invoice.payment_status_label}</span>
                            </div>
                            <div className="card-body">
                                <div className="info-grid">
                                    <div className="info-item"><span>Total invoice</span><strong>{formatRupiah(invoice.total, false)}</strong></div>
                                    <div className="info-item"><span>DP awal</span><strong>{formatRupiah(downPayment, false)}</strong></div>
                                    <div className="info-item"><span>Total dibayar</span><strong>{formatRupiah(paidAmount, false)}</strong></div>
                                    <div className="info-item"><span>Sisa tagihan</span><strong>{formatRupiah(remaining, false)}</strong></div>
                                    <div className="info-item"><span>Pembayaran lain</span><strong>{formatRupiah(otherPaid, false)}</strong></div>
                                    <div className="info-item"><span>Jatuh tempo</span><strong>{invoice.due_label}</strong></div>
                                </div>
                                <div className="divider" />
                                <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                                <div className="text-xs muted mt-1">{progress}% terbayar</div>
                                <div className="summary-actions mt-2">
                                    <button className="btn btn-primary btn-block" onClick={openCreatePayment} disabled={remaining <= 0 || isCancelled}>
                                        <Icon name="plus" /> Catat pembayaran
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <CrmModal
                open={!!paymentModal}
                onClose={() => setPaymentModal(null)}
                title={paymentModal?.mode === 'edit' ? 'Edit pembayaran' : 'Catat pembayaran'}
                description={`${invoice.number} · sisa tagihan ${formatRupiah(remaining, false)}`}
                footer={
                    <>
                        <button className="btn btn-secondary" type="button" onClick={() => setPaymentModal(null)}>Batal</button>
                        <button className="btn btn-primary" type="submit" form="paymentForm" disabled={paymentForm.processing}>
                            <Icon name="check" /> {paymentModal?.mode === 'edit' ? 'Simpan perubahan' : 'Simpan pembayaran'}
                        </button>
                    </>
                }
            >
                <form id="paymentForm" onSubmit={submitPayment}>
                    {Object.keys(paymentForm.errors).length > 0 && (
                        <div className="alert alert-danger mb-2">
                            <Icon name="alert-circle" />
                            <span>Periksa kembali data pembayaran. Pastikan tanggal dan jumlah terisi.</span>
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="field">
                            <label>Tanggal pembayaran</label>
                            <input className="input" type="date" value={paymentForm.data.paid_at} onChange={(event) => paymentForm.setData('paid_at', event.target.value)} />
                        </div>
                        <div className="field">
                            <label>Jumlah (Rp)</label>
                            <input className="input" type="number" min="0.01" max={paymentMax} step="any" value={paymentForm.data.amount} onChange={(event) => paymentForm.setData('amount', event.target.value)} />
                            <span className="sub">Maksimal {formatRupiah(paymentMax, false)}</span>
                            {paymentForm.errors.amount && <span className="sub" style={{ color: 'var(--red)' }}>{paymentForm.errors.amount}</span>}
                        </div>
                        <div className="field">
                            <label>Metode</label>
                            <select className="form-select" value={paymentForm.data.method} onChange={(event) => paymentForm.setData('method', event.target.value)}>
                                {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>No. referensi (opsional)</label>
                            <input className="input" value={paymentForm.data.reference} onChange={(event) => paymentForm.setData('reference', event.target.value)} placeholder="Contoh: TRF-20261025-001" />
                        </div>
                    </div>

                    <div className="field mt-2">
                        <label>Catatan (opsional)</label>
                        <textarea className="textarea" value={paymentForm.data.notes} onChange={(event) => paymentForm.setData('notes', event.target.value)} placeholder="Contoh: transfer BCA, atas nama Dapur Sehat." />
                    </div>

                    <div className="info-strip mt-2" style={{ fontSize: 10.5 }}>
                        <Icon name="alert-circle" />
                        <span>Jenis pembayaran ditentukan otomatis: DP awal, pembayaran sebagian, atau pelunasan bila menutup sisa tagihan.</span>
                    </div>
                </form>
            </CrmModal>

            <CrmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Hapus pembayaran"
                description={deleteTarget ? `${deleteTarget.type_label} · ${formatRupiah(deleteTarget.amount, false)} · ${deleteTarget.paid_label}` : ''}
                footer={
                    <>
                        <button className="btn btn-secondary" type="button" onClick={() => setDeleteTarget(null)}>Batal</button>
                        <button className="btn btn-danger" type="button" onClick={deletePayment}>
                            <Icon name="trash" /> Hapus pembayaran
                        </button>
                    </>
                }
            >
                <p className="text-sm">Pembayaran yang dihapus akan mengubah sisa tagihan dan status pembayaran invoice. Tindakan ini tidak dapat dibatalkan.</p>
            </CrmModal>
        </AuthenticatedLayout>
    );
}
