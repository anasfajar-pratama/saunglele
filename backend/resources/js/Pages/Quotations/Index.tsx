import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import {
    formatRupiah,
    initials,
    segmentAvatarClass,
    segmentBadgeClass,
    statusBadgeClass,
} from '@/lib/format';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Props = {
    customers: any[];
    products: any[];
    quotations: any[];
    nextNumber: string;
    selectedCustomerId: number;
    stats: any;
};

function todayPlus(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export default function QuotationsIndex({ customers, products, quotations, nextNumber, selectedCustomerId, stats }: Props) {
    const page = usePage<any>();
    const userName = page.props.auth?.user?.name ?? 'Sales';
    const [productTab, setProductTab] = useState<'mbg' | 'kolam'>('mbg');

    const initialCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0];
    const initialProduct = products.find((product) => product.category !== 'seed') ?? products[0];

    const form = useForm<any>({
        customer_id: initialCustomer?.id ?? '',
        valid_until: todayPlus(7),
        shipping: 150000,
        tax_rate: 0.11,
        terms: 'Berlaku 7 hari. Pembayaran 14 hari setelah invoice. Pengiriman Selasa & Jumat.',
        notes: 'Terima kasih atas kepercayaan Bapak/Ibu.',
        items: initialProduct
            ? [
                  {
                      product_id: initialProduct.id,
                      description: `${initialProduct.name} — ${initialProduct.size_grade}`,
                      qty: 1,
                      unit: initialProduct.unit,
                      unit_price: initialProduct.base_price,
                      discount: 0,
                  },
              ]
            : [],
    });

    const selectedCustomer = customers.find((customer) => String(customer.id) === String(form.data.customer_id)) ?? initialCustomer;

    useEffect(() => {
        if (selectedCustomer?.segment) {
            setProductTab(selectedCustomer.segment === 'kolam' ? 'kolam' : 'mbg');
        }
    }, [form.data.customer_id]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            if (productTab === 'kolam') return product.category === 'seed';
            return product.category !== 'seed';
        });
    }, [products, productTab]);

    const subtotal = form.data.items.reduce((sum: number, item: any) => sum + Number(item.qty || 0) * Number(item.unit_price || 0), 0);
    const discount = form.data.items.reduce((sum: number, item: any) => sum + Number(item.discount || 0), 0);
    const shipping = Number(form.data.shipping || 0);
    const taxRate = Number(form.data.tax_rate || 0);
    const taxable = Math.max(0, subtotal - discount + shipping);
    const tax = Math.round(taxable * taxRate);
    const total = taxable + tax;

    function addProduct(product: any) {
        form.setData('items', [
            ...form.data.items,
            {
                product_id: product.id,
                description: `${product.name} — ${product.size_grade}`,
                qty: 1,
                unit: product.unit,
                unit_price: product.base_price,
                discount: 0,
            },
        ]);
    }

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

    function removeItem(index: number) {
        const items = form.data.items.filter((_: any, itemIndex: number) => itemIndex !== index);
        form.setData('items', items.length ? items : [
            {
                product_id: '',
                description: '',
                qty: 1,
                unit: 'kg',
                unit_price: 0,
                discount: 0,
            },
        ]);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(route('quotations.store'));
    }

    function resetBuilder() {
        form.setData({
            customer_id: customers[0]?.id ?? '',
            valid_until: todayPlus(7),
            shipping: 150000,
            tax_rate: 0.11,
            terms: 'Berlaku 7 hari. Pembayaran 14 hari setelah invoice. Pengiriman Selasa & Jumat.',
            notes: 'Terima kasih atas kepercayaan Bapak/Ibu.',
            items: initialProduct
                ? [{ product_id: initialProduct.id, description: `${initialProduct.name} — ${initialProduct.size_grade}`, qty: 1, unit: initialProduct.unit, unit_price: initialProduct.base_price, discount: 0 }]
                : [],
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Quotation" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><span>Beranda</span><Icon name="chevron-right" /><span>Quotation</span></div>
                        <h1>Quotation</h1>
                        <p>Buat penawaran sesuai segmen. Nomor berikutnya: <strong>{nextNumber}</strong>.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary" onClick={resetBuilder}><Icon name="plus" /> Quotation Baru</button>
                        <Link className="btn btn-primary" href={route('quotations.index')}><Icon name="file" /> Daftar Quotation</Link>
                    </div>
                </div>

                <div className="quote-layout">
                    <div className="stack">
                        <section className="card">
                            <form onSubmit={submit}>
                                <div className="quote-customer">
                                    <span className={`avatar ${segmentAvatarClass(selectedCustomer?.segment)}`}>{initials(selectedCustomer?.name)}</span>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <select className="form-select" value={form.data.customer_id} onChange={(event) => form.setData('customer_id', event.target.value)}>
                                            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                                        </select>
                                        <span className="sub mt-1">{selectedCustomer?.city} · {selectedCustomer?.contact ?? 'PIC'} · {selectedCustomer?.phone}</span>
                                    </div>
                                    {selectedCustomer && <span className={`badge ${segmentBadgeClass(selectedCustomer.segment)}`}>{selectedCustomer.segment_label}</span>}
                                    <span className="badge badge-success">Termin {selectedCustomer?.payment_terms_days ?? 14} hari</span>
                                </div>

                                <div className="quote-meta">
                                    <div className="field"><span className="field-label">Nomor quotation</span><input className="input" value={nextNumber} readOnly /><span className="sub">Otomatis</span></div>
                                    <div className="field"><span className="field-label">Tanggal</span><input className="input" value={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} readOnly /><span className="sub">Hari ini</span></div>
                                    <div className="field"><span className="field-label">Berlaku sampai</span><input className="input" type="date" value={form.data.valid_until} onChange={(event) => form.setData('valid_until', event.target.value)} /><span className="sub">7 hari</span></div>
                                    <div className="field"><span className="field-label">Sales</span><input className="input" value={userName} readOnly /><span className="sub">Pemilik akun</span></div>
                                </div>

                                <div className="product-head">
                                    <div className="row-between">
                                        <span>Tambah produk cepat</span>
                                        <div className="segmented">
                                            <button type="button" className={productTab === 'mbg' ? 'active' : ''} onClick={() => setProductTab('mbg')}>Dapur MBG</button>
                                            <button type="button" className={productTab === 'kolam' ? 'active' : ''} onClick={() => setProductTab('kolam')}>Kolam Pembesaran</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="product-grid">
                                    {filteredProducts.map((product) => (
                                        <button type="button" className="product-card" key={product.id} onClick={() => addProduct(product)}>
                                            <strong>{product.name}</strong>
                                            <span>{product.size_grade} · per {product.unit}</span>
                                            <span className="price">{formatRupiah(product.base_price, false)} / {product.unit}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="table-wrap mt-2">
                                    <table className="line-table">
                                        <thead>
                                            <tr><th>Produk</th><th>Qty</th><th>Harga (Rp)</th><th>Diskon (Rp)</th><th style={{ textAlign: 'right' }}>Subtotal</th><th /></tr>
                                        </thead>
                                        <tbody>
                                            {form.data.items.map((item: any, index: number) => (
                                                <tr key={index}>
                                                    <td>
                                                        <select className="line-input product-select" value={item.product_id} onChange={(event) => updateItem(index, 'product_id', event.target.value)}>
                                                            <option value="">Pilih produk</option>
                                                            {products.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.size_grade}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <div className="row" style={{ flexWrap: 'nowrap', gap: 5 }}>
                                                            <input className="line-input qty qty-input" type="number" min="0.01" step="0.01" value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} />
                                                            <span className="text-xs muted qty-unit">{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td><input className="line-input money price-input" type="number" min="0" step="500" value={item.unit_price} onChange={(event) => updateItem(index, 'unit_price', event.target.value)} /></td>
                                                    <td><input className="line-input money discount-input" type="number" min="0" step="1000" value={item.discount} onChange={(event) => updateItem(index, 'discount', event.target.value)} /></td>
                                                    <td className="line-total">{formatRupiah(Number(item.qty || 0) * Number(item.unit_price || 0) - Number(item.discount || 0), false)}</td>
                                                    <td><button type="button" className="line-remove" onClick={() => removeItem(index)} aria-label="Hapus item"><Icon name="trash" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="quote-foot">
                                    <span className="text-xs muted">Klik produk di atas untuk menambah baris. Harga dan total dihitung otomatis.</span>
                                    <span className="text-xs muted" style={{ marginLeft: 'auto' }}>{form.data.items.length} item</span>
                                </div>

                                {Object.keys(form.errors).length > 0 && (
                                    <div className="card-body">
                                        <div className="alert alert-danger"><Icon name="alert-circle" /><span>Periksa kembali data quotation. Pastikan pelanggan, tanggal, dan item terisi.</span></div>
                                    </div>
                                )}

                                <div className="card-body" style={{ borderTop: '1px solid var(--line)' }}>
                                    <div className="form-grid">
                                        <div className="field"><label>Catatan untuk pelanggan</label><textarea className="textarea" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} style={{ minHeight: 78 }} /></div>
                                        <div className="field"><label>Syarat &amp; ketentuan</label><textarea className="textarea" value={form.data.terms} onChange={(event) => form.setData('terms', event.target.value)} style={{ minHeight: 78 }} /></div>
                                    </div>
                                </div>
                            </form>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div><h2>Quotation terbaru</h2><p>{stats.total} quotation · {stats.accepted} diterima</p></div>
                                <Link className="link" href={route('purchase-orders.create')}>Buat PO dari quotation</Link>
                            </div>
                            <div className="table-wrap mt-2">
                                <table className="table">
                                    <thead><tr><th>Nomor</th><th>Pelanggan</th><th>Segmen</th><th>Tanggal</th><th className="num">Nilai</th><th>Status</th><th>Berlaku s.d.</th><th /></tr></thead>
                                    <tbody>
                                        {quotations.map((quotation) => (
                                            <tr key={quotation.id}>
                                                <td><Link className="link-strong nowrap" href={route('quotations.show', quotation.id)}>{quotation.number}</Link></td>
                                                <td>{quotation.customer.name}<span className="sub">{quotation.items_count} item</span></td>
                                                <td><span className={`badge ${segmentBadgeClass(quotation.customer.segment)}`}>{quotation.customer.segment_label}</span></td>
                                                <td>{quotation.issued_label}</td>
                                                <td className="num">{formatRupiah(quotation.total)}</td>
                                                <td><span className={`badge ${statusBadgeClass(quotation.status)}`}>{quotation.status_label}</span></td>
                                                <td>{quotation.valid_label}</td>
                                                <td className="cell-actions"><Link className="icon-btn sm" href={route('quotations.show', quotation.id)}><Icon name="chevron-right" /></Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <aside className="summary">
                        <section className="card">
                            <div className="card-head">
                                <div><h2>Ringkasan quotation</h2><p>Perhitungan otomatis</p></div>
                                <span className="badge badge-neutral">Draft</span>
                            </div>
                            <div className="summary-body">
                                <div className="summary-row"><span>Subtotal</span><strong>{formatRupiah(subtotal, false)}</strong></div>
                                <div className="summary-row"><span>Diskon item</span><strong>- {formatRupiah(discount, false)}</strong></div>
                                <div className="summary-row"><span>Ongkir</span><input className="input" type="number" value={form.data.shipping} onChange={(event) => form.setData('shipping', event.target.value)} style={{ width: 120, padding: '4px 7px', textAlign: 'right', fontSize: 10.5 }} /></div>
                                <div className="summary-row"><span>PPN {Math.round(taxRate * 100)}%</span><strong>{formatRupiah(tax, false)}</strong></div>
                                <div className="summary-total"><span>Total</span><span>{formatRupiah(total, false)}</span></div>
                                <div className="form-note mt-2">Harga sudah termasuk kemasan. Pajak dihitung dari subtotal setelah diskon + ongkir.</div>
                            </div>
                            <div className="summary-actions">
                                <button className="btn btn-primary btn-block" onClick={submit} disabled={form.processing}><Icon name="check" /> Simpan quotation</button>
                                <button className="btn btn-wa btn-block" onClick={submit} disabled={form.processing}><Icon name="eye" /> Simpan &amp; lihat quotation</button>
                                <div className="row">
                                    <Link className="btn btn-secondary btn-sm" style={{ flex: 1 }} href={route('quotations.index')}><Icon name="eye" /> Daftar</Link>
                                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={resetBuilder}><Icon name="refresh" /> Reset</button>
                                </div>
                            </div>
                            <div className="quote-terms">
                                <h4>Syarat &amp; ketentuan</h4>
                                <ul>
                                    <li>Berlaku 7 hari sejak tanggal quotation.</li>
                                    <li>Pembayaran 14 hari setelah invoice.</li>
                                    <li>Pengiriman Selasa &amp; Jumat, pukul 05.00–07.00.</li>
                                    <li>Minimum order 50 kg untuk produk konsumsi.</li>
                                    <li>Harga dapat berubah bila volume berubah.</li>
                                </ul>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
