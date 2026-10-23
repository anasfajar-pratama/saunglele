import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { formatRupiah, segmentBadgeClass } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Props = {
    customers: any[];
    products: any[];
    quotations: any[];
    nextNumber: string;
    selectedCustomerId: number;
};

function todayPlus(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export default function PurchaseOrderCreate({ customers, products, quotations, nextNumber, selectedCustomerId }: Props) {
    const [productTab, setProductTab] = useState<'mbg' | 'kolam'>('mbg');
    const firstProduct = products.find((product) => product.category !== 'seed') ?? products[0];
    const firstCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];

    const form = useForm<any>({
        customer_id: firstCustomer?.id ?? '',
        customer_po_number: '',
        quotation_id: '',
        requested_delivery_at: todayPlus(2),
        shipping: 0,
        tax_rate: 0.11,
        payment_terms: '14 hari',
        notes: '',
        items: firstProduct
            ? [{ product_id: firstProduct.id, description: `${firstProduct.name} — ${firstProduct.size_grade}`, qty: 1, unit: firstProduct.unit, unit_price: firstProduct.base_price }]
            : [],
    });

    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form.data.customer_id)) ?? firstCustomer;
    const customerQuotations = quotations.filter((quotation) => String(quotation.customer_id) === String(form.data.customer_id));

    useEffect(() => {
        if (selectedCustomer?.segment) {
            setProductTab(selectedCustomer.segment === 'kolam' ? 'kolam' : 'mbg');
        }
    }, [form.data.customer_id]);

    const filteredProducts = useMemo(() => products.filter((product) => {
        if (productTab === 'kolam') return product.category === 'seed';
        return product.category !== 'seed';
    }), [products, productTab]);

    const subtotal = form.data.items.reduce((sum: number, item: any) => sum + Number(item.qty || 0) * Number(item.unit_price || 0), 0);
    const shipping = Number(form.data.shipping || 0);
    const taxRate = Number(form.data.tax_rate || 0);
    const tax = Math.round((subtotal + shipping) * taxRate);
    const total = subtotal + shipping + tax;

    function updateItem(index: number, key: string, value: any) {
        const items = form.data.items.map((item: any, itemIndex: number) => {
            if (itemIndex !== index) return item;

            if (key === 'product_id') {
                const product = products.find((candidate) => String(candidate.id) === String(value));
                return {
                    ...item,
                    product_id: value,
                    description: product ? `${product.name} — ${product.size_grade}` : item.description,
                    unit: product?.unit ?? item.unit,
                    unit_price: product?.base_price ?? item.unit_price,
                };
            }

            return { ...item, [key]: value };
        });

        form.setData('items', items);
    }

    function addProduct(product: any) {
        form.setData('items', [
            ...form.data.items,
            { product_id: product.id, description: `${product.name} — ${product.size_grade}`, qty: 1, unit: product.unit, unit_price: product.base_price },
        ]);
    }

    function removeItem(index: number) {
        const items = form.data.items.filter((_: any, itemIndex: number) => itemIndex !== index);
        form.setData('items', items.length ? items : [{ product_id: '', description: '', qty: 1, unit: 'kg', unit_price: 0 }]);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('purchase-orders.store'));
    }

    return (
        <AuthenticatedLayout>
            <Head title="Terima PO" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><Link href={route('purchase-orders.index')}>Pesanan (PO)</Link><Icon name="chevron-right" /><span>Terima PO</span></div>
                        <h1>Terima PO Baru</h1>
                        <p>Nomor berikutnya: <strong>{nextNumber}</strong>. Validasi item dan jadwal sebelum disimpan.</p>
                    </div>
                    <div className="page-actions">
                        <Link className="btn btn-secondary" href={route('purchase-orders.index')}><Icon name="chevron-left" /> Kembali</Link>
                    </div>
                </div>

                <form onSubmit={submit}>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="alert alert-danger mb-2">
                            <Icon name="alert-circle" />
                            <span>{Object.values(form.errors).join(' ')}</span>
                        </div>
                    )}
                    <div className="grid grid-2-1">
                        <div className="stack">
                            <section className="card">
                                <div className="card-head"><div><h2>Informasi PO</h2><p>Data pelanggan dan referensi dokumen</p></div></div>
                                <div className="card-body">
                                    <div className="form-grid">
                                        <div className="field">
                                            <label>Pelanggan</label>
                                            <select className="form-select" value={form.data.customer_id} onChange={(event) => form.setData('customer_id', event.target.value)}>
                                                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                                            </select>
                                            {selectedCustomer && <div className="row mt-1"><span className={`badge ${segmentBadgeClass(selectedCustomer.segment)}`}>{selectedCustomer.segment_label}</span><span className="text-xs muted">{selectedCustomer.phone}</span></div>}
                                        </div>
                                        <div className="field"><label>No. PO customer</label><input className="input" value={form.data.customer_po_number} onChange={(event) => form.setData('customer_po_number', event.target.value)} placeholder="MBG/NUS/1025" /></div>
                                        <div className="field">
                                            <label>Referensi quotation</label>
                                            <select className="form-select" value={form.data.quotation_id} onChange={(event) => form.setData('quotation_id', event.target.value)}>
                                                <option value="">Tanpa quotation</option>
                                                {customerQuotations.map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.number} · {formatRupiah(quotation.total)}</option>)}
                                            </select>
                                        </div>
                                        <div className="field"><label>Tanggal kirim diminta</label><input className="input" type="date" value={form.data.requested_delivery_at} onChange={(event) => form.setData('requested_delivery_at', event.target.value)} /></div>
                                        <div className="field"><label>Termin pembayaran</label><input className="input" value={form.data.payment_terms} onChange={(event) => form.setData('payment_terms', event.target.value)} /></div>
                                        <div className="field"><label>Ongkir (Rp)</label><input className="input" type="number" value={form.data.shipping} onChange={(event) => form.setData('shipping', event.target.value)} /></div>
                                    </div>
                                    <div className="field mt-2"><label>Catatan</label><textarea className="textarea" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Instruksi khusus, jadwal, atau permintaan pelanggan..." style={{ minHeight: 80 }} /></div>
                                </div>
                            </section>

                            <section className="card">
                                <div className="card-head">
                                    <div><h2>Item pesanan</h2><p>Tambahkan produk dan jumlah yang dipesan</p></div>
                                    <div className="segmented">
                                        <button type="button" className={productTab === 'mbg' ? 'active' : ''} onClick={() => setProductTab('mbg')}>Dapur MBG</button>
                                        <button type="button" className={productTab === 'kolam' ? 'active' : ''} onClick={() => setProductTab('kolam')}>Kolam</button>
                                    </div>
                                </div>
                                <div className="product-grid" style={{ borderTop: '1px solid var(--line)' }}>
                                    {filteredProducts.map((product) => (
                                        <button type="button" className="product-card" key={product.id} onClick={() => addProduct(product)}>
                                            <strong>{product.name}</strong>
                                            <span>{product.size_grade} · per {product.unit}</span>
                                            <span className="price">{formatRupiah(product.base_price, false)} / {product.unit}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="table-wrap">
                                    <table className="line-table">
                                        <thead><tr><th>Produk</th><th>Qty</th><th>Harga (Rp)</th><th style={{ textAlign: 'right' }}>Subtotal</th><th /></tr></thead>
                                        <tbody>
                                            {form.data.items.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td>
                                                        <select className="line-input product-select" value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)}>
                                                            <option value="">Pilih produk</option>
                                                            {products.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.size_grade}</option>)}
                                                        </select>
                                                    </td>
                                                    <td><div className="row" style={{ flexWrap: 'nowrap', gap: 5 }}><input className="line-input qty qty-input" type="number" min="0.01" step="0.01" value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} /><span className="text-xs muted qty-unit">{item.unit}</span></div></td>
                                                    <td><input className="line-input money price-input" type="number" min="0" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} /></td>
                                                    <td className="line-total">{formatRupiah(Number(item.qty || 0) * Number(item.unit_price || 0), false)}</td>
                                                    <td><button type="button" className="line-remove" onClick={() => removeItem(index)}><Icon name="trash" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>

                        <aside className="summary">
                            <section className="card">
                                <div className="card-head"><div><h2>Ringkasan PO</h2><p>Perhitungan otomatis</p></div><span className="badge badge-neutral">Draft</span></div>
                                <div className="summary-body">
                                    <div className="summary-row"><span>Subtotal</span><strong>{formatRupiah(subtotal, false)}</strong></div>
                                    <div className="summary-row"><span>Ongkir</span><strong>{formatRupiah(shipping, false)}</strong></div>
                                    <div className="summary-row"><span>PPN {Math.round(taxRate * 100)}%</span><strong>{formatRupiah(tax, false)}</strong></div>
                                    <div className="summary-total"><span>Total</span><span>{formatRupiah(total, false)}</span></div>
                                    <div className="form-note mt-2">PO akan masuk status Diterima dan harus dikonfirmasi maksimal 4 jam kerja.</div>
                                </div>
                                <div className="summary-actions">
                                    <button className="btn btn-primary btn-block" type="submit" disabled={form.processing}><Icon name="check" /> Simpan PO</button>
                                    <Link className="btn btn-secondary btn-block" href={route('purchase-orders.index')}>Batal</Link>
                                </div>
                                <div className="quote-terms">
                                    <h4>Checklist</h4>
                                    <ul>
                                        <li>Validasi item dan harga terhadap quotation.</li>
                                        <li>Pastikan stok tersedia.</li>
                                        <li>Konfirmasi jadwal pengiriman.</li>
                                        <li>Hubungi pelanggan setelah PO dikonfirmasi.</li>
                                    </ul>
                                </div>
                            </section>
                        </aside>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
