import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { formatRupiah, statusBadgeClass, whatsappUrl } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    quotation: any;
};

export default function QuotationShow({ quotation }: Props) {
    const [copied, setCopied] = useState(false);

    function updateStatus(status: string) {
        router.patch(route('quotations.status', quotation.id), { status }, { preserveScroll: true });
    }

    function sendWhatsapp() {
        const message = `Halo Bapak/Ibu ${quotation.customer.contact ?? quotation.customer.name}, quotation ${quotation.number} dari Saung Lele dengan total ${formatRupiah(quotation.total, false)} sudah kami siapkan. Berlaku sampai ${quotation.valid_label}. Apakah ada yang ingin disesuaikan?\n\nLihat quotation: ${quotation.public_url}`;
        window.open(whatsappUrl(quotation.customer.phone, message), '_blank');
    }

    function copyPublicLink() {
        navigator.clipboard.writeText(quotation.public_url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Quotation ${quotation.number}`} />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <Link href={route('dashboard')}>Beranda</Link>
                            <Icon name="chevron-right" />
                            <Link href={route('quotations.history')}>Quotation</Link>
                            <Icon name="chevron-right" />
                            <span>{quotation.number}</span>
                        </div>
                        <h1>Quotation {quotation.number}</h1>
                        <p>{quotation.customer.name} · {quotation.issued_label} · berlaku sampai {quotation.valid_label}.</p>
                    </div>
                    <div className="page-actions">
                        {quotation.can_edit && (
                            <Link className="btn btn-secondary" href={route('quotations.edit', quotation.id)}>
                                <Icon name="edit" /> Edit Quotation
                            </Link>
                        )}
                        {quotation.status === 'draft' && <button className="btn btn-secondary" onClick={() => updateStatus('sent')}><Icon name="send" /> Tandai terkirim</button>}
                        {quotation.status !== 'accepted' && <button className="btn btn-primary" onClick={() => updateStatus('accepted')}><Icon name="check" /> Tandai diterima</button>}
                        <button className="btn btn-wa" onClick={sendWhatsapp}><Icon name="whatsapp" /> Kirim WhatsApp</button>
                        <button className="btn btn-secondary" onClick={() => window.print()}><Icon name="download" /> Cetak</button>
                        <button className="btn btn-secondary" onClick={copyPublicLink}><Icon name="link" /> {copied ? 'Link tersalin' : 'Salin link'}</button>
                    </div>
                </div>

                <div className="row mb-2">
                    <span className={`badge ${statusBadgeClass(quotation.status)}`} style={{ fontSize: 11, padding: '5px 11px' }}>{quotation.status_label}</span>
                    {quotation.status === 'accepted' && <span className="chip chip-success"><Icon name="check-circle" /> Siap dibuatkan PO</span>}
                    {quotation.can_create_po && (
                        <Link className="btn btn-secondary btn-sm" href={route('purchase-orders.create', { quotation_id: quotation.id })}>
                            <Icon name="package" /> Buat PO dari quotation ini
                        </Link>
                    )}
                </div>

                <div className="doc-preview">
                    <div className="doc-preview-head">
                        <div className="doc-brand">
                            <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}><Icon name="fish" /></span>
                            <div><strong>Saung Lele</strong><span>Ternak &amp; Jual Beli Lele · Semarang</span></div>
                        </div>
                        <div className="doc-title"><strong>QUOTATION</strong><span>{quotation.number}</span></div>
                    </div>

                    <div className="doc-meta-grid">
                        <div>
                            <span className="eyebrow">Kepada</span>
                            <strong>{quotation.customer.name}</strong>
                            <p>{quotation.customer.address ?? '-'}<br />{quotation.customer.city ?? ''}<br />PIC: {quotation.customer.contact ?? '-'} · {quotation.customer.phone ?? '-'}</p>
                        </div>
                        <div>
                            <span className="eyebrow">Detail</span>
                            <p>Tanggal: {quotation.issued_label}<br />Berlaku sampai: {quotation.valid_label}<br />Sales: {quotation.sales ?? '-'}</p>
                        </div>
                    </div>

                    <table className="doc-table">
                        <thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            {quotation.items.map((item: any) => (
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
                        <div><span>Subtotal</span><strong>{formatRupiah(quotation.subtotal, false)}</strong></div>
                        {quotation.discount > 0 && <div><span>Diskon</span><strong>- {formatRupiah(quotation.discount, false)}</strong></div>}
                        <div><span>Ongkir</span><strong>{formatRupiah(quotation.shipping, false)}</strong></div>
                        <div><span>PPN</span><strong>{formatRupiah(quotation.tax, false)}</strong></div>
                        <div className="total"><span>Total</span><strong>{formatRupiah(quotation.total, false)}</strong></div>
                    </div>

                    {quotation.notes && <div className="doc-terms"><strong>Catatan</strong><p>{quotation.notes}</p></div>}
                    <div className="doc-terms"><strong>Syarat &amp; ketentuan</strong><p>{quotation.terms}</p></div>

                    <div className="doc-sign">
                        <div><span>Hormat kami,</span><strong>{quotation.sales ?? 'Saung Lele'}</strong><span>Sales Saung Lele</span></div>
                        <div><span>Disetujui oleh,</span><strong>________________</strong><span>{quotation.customer.name}</span></div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
