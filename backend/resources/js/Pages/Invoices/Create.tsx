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
    purchaseOrders: any[];
    nextNumber: string;
    selectedCustomerId: number;
    selectedPurchaseOrderId: number;
    sourcePurchaseOrder?: any;
    editingInvoice?: any;
    defaultTerms: string;
};

function todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function addDays(base: string, days: number): string {
    const date = new Date(`${base}T00:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateInput(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InvoiceCreate({
    customers,
    products,
    purchaseOrders,
    nextNumber,
    selectedCustomerId,
    sourcePurchaseOrder,
    editingInvoice,
    defaultTerms,
}: Props) {
    const page = usePage<any>();
    const userName = page.props.auth?.user?.name ?? 'Sales';
    const editing = editingInvoice;

    const targetCustomerId = editing?.customer_id ?? sourcePurchaseOrder?.customer_id ?? selectedCustomerId;
    const initialCustomer = customers.find((customer) => customer.id === targetCustomerId) ?? customers[0];
    const initialProduct = products.find((product) => product.category !== 'seed') ?? products[0];
    const [productTab, setProductTab] = useState<'mbg' | 'kolam'>(initialCustomer?.segment === 'kolam' ? 'kolam' : 'mbg');
    const initialTaxRate = Number(editing?.tax_rate ?? sourcePurchaseOrder?.tax_rate ?? 0.11);
    const [taxEnabled, setTaxEnabled] = useState<boolean>(initialTaxRate > 0);
    const [taxPercent, setTaxPercent] = useState<number>(initialTaxRate > 0 ? Math.round(initialTaxRate * 100) : 11);

    const fallbackItem = { product_id: '', description: '', qty: 1, unit: 'kg', unit_price: 0, discount: 0 };
    const initialItems = editing?.items?.length
        ? editing.items
        : sourcePurchaseOrder?.items?.length
          ? sourcePurchaseOrder.items
          : initialProduct
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
            : [fallbackItem];

    const initialDueDays = sourcePurchaseOrder?.due_days ?? initialCustomer?.payment_terms_days ?? 14;

    const initialData = {
        customer_id: editing?.customer_id ?? sourcePurchaseOrder?.customer_id ?? initialCustomer?.id ?? '',
        purchase_order_id: editing?.purchase_order_id ?? sourcePurchaseOrder?.id ?? '',
        due_at: editing?.due_at ?? addDays(todayISO(), initialDueDays),
        shipping: editing?.shipping ?? sourcePurchaseOrder?.shipping ?? 150000,
        tax_rate: editing?.tax_rate ?? sourcePurchaseOrder?.tax_rate ?? 0.11,
        down_payment: editing?.down_payment ?? 0,
        terms: editing?.terms ?? defaultTerms,
        notes: editing?.notes ?? sourcePurchaseOrder?.notes ?? 'Terima kasih atas kepercayaan Bapak/Ibu.',
        items: initialItems,
    };

    const form = useForm<any>(initialData);

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
    const downPayment = Number(form.data.down_payment || 0);
    const remaining = Math.max(0, total - downPayment);

    function changeCustomer(value: string) {
        const customer = customers.find((candidate) => String(candidate.id) === String(value));
        const days = customer?.payment_terms_days ?? 14;

        form.setData({
            ...form.data,
            customer_id: value,
            purchase_order_id: '',
            due_at: addDays(todayISO(), days),
        });
    }

    function applyPurchaseOrder(value: string) {
        if (!value) {
            form.setData('purchase_order_id', '');
            return;
        }

        const purchaseOrder = purchaseOrders.find((candidate) => String(candidate.id) === String(value));
        if (!purchaseOrder) return;

        const rate = Number(purchaseOrder.tax_rate || 0);
        setTaxEnabled(rate > 0);
        setTaxPercent(rate > 0 ? Math.round(rate * 100) : 11);

        form.setData({
            ...form.data,
            purchase_order_id: purchaseOrder.id,
            customer_id: purchaseOrder.customer_id,
            due_at: addDays(todayISO(), purchaseOrder.due_days ?? 14),
            shipping: purchaseOrder.shipping,
            tax_rate: purchaseOrder.tax_rate,
            notes: purchaseOrder.notes ?? form.data.notes,
            items: purchaseOrder.items.length ? purchaseOrder.items : form.data.items,
        });
    }

    function toggleTax(enabled: boolean) {
        setTaxEnabled(enabled);
        form.setData('tax_rate', enabled ? (taxPercent || 11) / 100 : 0);
    }

    function changeTaxPercent(value: string) {
        const percent = Number(value || 0);
        setTaxPercent(percent);
        form.setData('tax_rate', percent / 100);
    }

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
        form.setData('items', items.length ? items : [fallbackItem]);
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        if (editing) {
            form.patch(route('invoices.update', editing.id));
            return;
        }

        form.post(route('invoices.store'));
    }

    function resetBuilder() {
        if (editing) {
            form.setData(initialData);
            setTaxEnabled(initialTaxRate > 0);
            setTaxPercent(initialTaxRate > 0 ? Math.round(initialTaxRate * 100) : 11);
            return;
        }

        setTaxEnabled(true);
        setTaxPercent(11);

        form.setData({
            customer_id: customers[0]?.id ?? '',
            purchase_order_id: '',
            due_at: addDays(todayISO(), customers[0]?.payment_terms_days ?? 14),
            shipping: 150000,
            tax_rate: 0.11,
            down_payment: 0,
            terms: defaultTerms,
            notes: 'Terima kasih atas kepercayaan Bapak/Ibu.',
            items: initialProduct
                ? [{ product_id: initialProduct.id, description: `${initialProduct.name} — ${initialProduct.size_grade}`, qty: 1, unit: initialProduct.unit, unit_price: initialProduct.base_price, discount: 0 }]
                : [fallbackItem],
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={editing ? 'Edit Invoice' : 'Invoice'} />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <Link href={route('invoices.index')}>Invoice</Link>
                            <Icon name="chevron-right" />
                            <span>{editing ? editing.number : 'Baru'}</span>
                        </div>
                        <h1>{editing ? 'Edit Invoice' : 'Invoice Baru'}</h1>
                        <p>{editing ? `Perbarui ${editing.number}. Perubahan akan menyimpan item dan total terbaru.` : `Terbitkan tagihan untuk pelanggan. Nomor berikutnya: ${nextNumber}.`}</p>
                    </div>
                    <div className="page-actions">
                        {editing ? (
                            <Link className="btn btn-secondary" href={route('invoices.show', editing.id)}>
                                <Icon name="chevron-left" /> Kembali
                            </Link>
                        ) : (
                            <Link className="btn btn-secondary" href={route('invoices.index')}>
                                <Icon name="list" /> Daftar Invoice
                            </Link>
                        )}
                        {editing && (
                            <Link className="btn btn-primary" href={route('invoices.show', editing.id)}>
                                <Icon name="invoice" /> Lihat Invoice
                            </Link>
                        )}
                    </div>
                </div>

                {editing && (
                    <div className="info-strip mb-2" style={{ background: 'var(--brand-soft)', borderColor: '#c4e8df', color: 'var(--brand-ink)' }}>
                        <Icon name="edit" />
                        <span>Mode edit <strong>{editing.number}</strong>. Invoice yang sudah lunas atau dibatalkan tidak dapat diedit.</span>
                    </div>
                )}

                <div className="quote-layout">
                    <div className="stack">
                        <section className="card">
                            <form onSubmit={submit}>
                                <div className="quote-customer">
                                    <span className={`avatar ${segmentAvatarClass(selectedCustomer?.segment)}`}>{initials(selectedCustomer?.name)}</span>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <select className="form-select" value={form.data.customer_id} onChange={(event) => changeCustomer(event.target.value)}>
                                            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                                        </select>
                                        <span className="sub mt-1">{selectedCustomer?.city} · {selectedCustomer?.contact ?? 'PIC'} · {selectedCustomer?.phone}</span>
                                    </div>
                                    {selectedCustomer && <span className={`badge ${segmentBadgeClass(selectedCustomer.segment)}`}>{selectedCustomer.segment_label}</span>}
                                    <span className="badge badge-success">Termin {selectedCustomer?.payment_terms_days ?? 14} hari</span>
                                </div>

                                <div className="quote-meta">
                                    <div className="field"><span className="field-label">Nomor invoice</span><input className="input" value={editing?.number ?? nextNumber} readOnly /><span className="sub">{editing ? 'Nomor tetap' : 'Otomatis'}</span></div>
                                    <div className="field"><span className="field-label">Tanggal</span><input className="input" value={formatDateInput(editing?.issued_at ?? todayISO())} readOnly /><span className="sub">{editing ? 'Tanggal invoice' : 'Hari ini'}</span></div>
                                    <div className="field"><span className="field-label">Jatuh tempo</span><input className="input" type="date" value={form.data.due_at} onChange={(event) => form.setData('due_at', event.target.value)} /><span className="sub">Batas pembayaran</span></div>
                                    <div className="field"><span className="field-label">Sales</span><input className="input" value={userName} readOnly /><span className="sub">Pemilik akun</span></div>
                                </div>

                                <div className="card-body" style={{ paddingTop: 0 }}>
                                    <div className="field">
                                        <label>Referensi PO (opsional)</label>
                                        <select className="form-select" value={form.data.purchase_order_id} onChange={(event) => applyPurchaseOrder(event.target.value)}>
                                            <option value="">Tanpa PO — isi item manual</option>
                                            {purchaseOrders.map((purchaseOrder) => (
                                                <option key={purchaseOrder.id} value={purchaseOrder.id}>
                                                    {purchaseOrder.number} · {purchaseOrder.customer}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="sub">Pilih PO untuk menyalin pelanggan, item, ongkir, pajak, dan termin.</span>
                                    </div>
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
                                                        <select className="line-input product-select" value={item.product_id ?? ''} onChange={(event) => updateItem(index, 'product_id', event.target.value)}>
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
                                                    <td><input className="line-input money discount-input" type="number" min="0" step="1000" value={item.discount ?? 0} onChange={(event) => updateItem(index, 'discount', event.target.value)} /></td>
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
                                        <div className="alert alert-danger"><Icon name="alert-circle" /><span>Periksa kembali data invoice. Pastikan pelanggan, tanggal jatuh tempo, dan item terisi.</span></div>
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
                    </div>

                    <aside className="summary">
                        <section className="card">
                            <div className="card-head">
                                <div><h2>Ringkasan invoice</h2><p>{editing ? 'Mode edit · perhitungan otomatis' : 'Perhitungan otomatis'}</p></div>
                                <span className={`badge ${editing ? statusBadgeClass(editing.status) : 'badge-neutral'}`}>{editing ? editing.status_label : 'Draft'}</span>
                            </div>
                            <div className="summary-body">
                                <div className="summary-row"><span>Subtotal</span><strong>{formatRupiah(subtotal, false)}</strong></div>
                                <div className="summary-row"><span>Diskon item</span><strong>- {formatRupiah(discount, false)}</strong></div>
                                <div className="summary-row"><span>Ongkir</span><input className="input" type="number" value={form.data.shipping} onChange={(event) => form.setData('shipping', event.target.value)} style={{ width: 120, padding: '4px 7px', textAlign: 'right', fontSize: 10.5 }} /></div>
                                <div className="summary-row">
                                    <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={taxEnabled} onChange={(event) => toggleTax(event.target.checked)} />
                                        <span>PPN</span>
                                    </label>
                                    {taxEnabled ? (
                                        <div className="row" style={{ gap: 4 }}>
                                            <input className="input" type="number" min="0" max="100" step="1" value={taxPercent} onChange={(event) => changeTaxPercent(event.target.value)} style={{ width: 56, padding: '4px 6px', textAlign: 'right', fontSize: 10.5 }} />
                                            <span className="text-xs muted">%</span>
                                            <strong>{formatRupiah(tax, false)}</strong>
                                        </div>
                                    ) : (
                                        <span className="text-xs muted">Nonaktif</span>
                                    )}
                                </div>
                                <div className="summary-total"><span>Total</span><span>{formatRupiah(total, false)}</span></div>
                                <div className="summary-row"><span>DP / uang muka</span><input className="input" type="number" min="0" value={form.data.down_payment} onChange={(event) => form.setData('down_payment', event.target.value)} style={{ width: 120, padding: '4px 7px', textAlign: 'right', fontSize: 10.5 }} /></div>
                                {form.errors.down_payment && <div className="form-note" style={{ color: 'var(--red)' }}>{form.errors.down_payment}</div>}
                                {downPayment > 0 && <div className="summary-row"><span>Sisa setelah DP</span><strong>{formatRupiah(remaining, false)}</strong></div>}
                                <div className="form-note mt-2">Jatuh tempo {formatDateInput(form.data.due_at)}. PPN dapat dinonaktifkan; DP mengurangi sisa tagihan.</div>
                            </div>
                            <div className="summary-actions">
                                <button className="btn btn-primary btn-block" onClick={submit} disabled={form.processing}><Icon name="check" /> {editing ? 'Update invoice' : 'Simpan invoice'}</button>
                                <button className="btn btn-wa btn-block" onClick={submit} disabled={form.processing}><Icon name="eye" /> {editing ? 'Update & lihat invoice' : 'Simpan & lihat invoice'}</button>
                                <div className="row">
                                    <Link className="btn btn-secondary btn-sm" style={{ flex: 1 }} href={route('invoices.index')}><Icon name="list" /> Daftar</Link>
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={resetBuilder}><Icon name="refresh" /> Reset</button>
                                </div>
                            </div>
                            <div className="quote-terms">
                                <h4>Catatan invoice</h4>
                                <ul>
                                    <li>Nomor invoice dibuat otomatis saat disimpan.</li>
                                    <li>Invoice draft bisa diedit sampai ditandai lunas.</li>
                                    <li>DP / uang muka mengurangi sisa tagihan yang harus dibayar.</li>
                                    <li>PPN bisa dinonaktifkan bila tagihan tidak memakai pajak.</li>
                                    <li>Link publik bisa dibagikan ke pelanggan setelah invoice disimpan.</li>
                                    <li>Centang PO sebagai referensi agar item dan termin tersalin.</li>
                                </ul>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
