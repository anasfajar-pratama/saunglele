import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import { formatRupiah, statusBadgeClass } from '@/lib/format';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    products: any[];
    terms: any[];
    categories: { value: string; label: string }[];
};

export default function MasterIndex({ products, terms, categories }: Props) {
    const [tab, setTab] = useState<'products' | 'terms'>('products');
    const [showProduct, setShowProduct] = useState(false);
    const [showTerm, setShowTerm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [editingTerm, setEditingTerm] = useState<any>(null);

    const productForm = useForm<any>({
        sku: '',
        name: '',
        category: 'consumption',
        size_grade: '',
        unit: 'kg',
        base_price: '',
        is_active: true,
    });

    const termForm = useForm<any>({
        name: '',
        body: '',
        is_default: false,
        is_active: true,
    });

    function openProduct(product?: any) {
        setEditingProduct(product ?? null);
        productForm.setData(product ? {
            sku: product.sku ?? '',
            name: product.name ?? '',
            category: product.category ?? 'consumption',
            size_grade: product.size_grade ?? '',
            unit: product.unit ?? 'kg',
            base_price: product.base_price ?? '',
            is_active: !!product.is_active,
        } : {
            sku: '',
            name: '',
            category: 'consumption',
            size_grade: '',
            unit: 'kg',
            base_price: '',
            is_active: true,
        });
        setShowProduct(true);
    }

    function openTerm(term?: any) {
        setEditingTerm(term ?? null);
        termForm.setData(term ? {
            name: term.name ?? '',
            body: term.body ?? '',
            is_default: !!term.is_default,
            is_active: !!term.is_active,
        } : {
            name: '',
            body: '',
            is_default: false,
            is_active: true,
        });
        setShowTerm(true);
    }

    function submitProduct(event: { preventDefault: () => void }) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => setShowProduct(false),
        };

        if (editingProduct) {
            productForm.patch(route('master.products.update', editingProduct.id), options);
        } else {
            productForm.post(route('master.products.store'), options);
        }
    }

    function submitTerm(event: { preventDefault: () => void }) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => setShowTerm(false),
        };

        if (editingTerm) {
            termForm.patch(route('master.terms.update', editingTerm.id), options);
        } else {
            termForm.post(route('master.terms.store'), options);
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title="Master Data" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Master Data</span>
                        </div>
                        <h1>Master Data</h1>
                        <p>Kelola produk cepat dan template syarat &amp; ketentuan untuk quotation.</p>
                    </div>
                    <div className="page-actions">
                        <LinkToQuotation />
                        <button className="btn btn-primary" onClick={() => tab === 'products' ? openProduct() : openTerm()}>
                            <Icon name="plus" /> {tab === 'products' ? 'Tambah Produk' : 'Tambah Template'}
                        </button>
                    </div>
                </div>

                <div className="segment-summary" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div className="segment-pill active">
                        <span className="icon tone-teal"><Icon name="package" /></span>
                        <div><strong>{products.length}</strong><span>Produk cepat</span></div>
                    </div>
                    <div className="segment-pill">
                        <span className="icon tone-blue"><Icon name="file" /></span>
                        <div><strong>{terms.length}</strong><span>Template syarat</span></div>
                    </div>
                    <div className="segment-pill">
                        <span className="icon tone-green"><Icon name="star" /></span>
                        <div><strong>{terms.filter((term) => term.is_default).length}</strong><span>Template default</span></div>
                    </div>
                </div>

                <section className="card">
                    <div className="tabs">
                        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
                            Produk Cepat <span className="count">{products.length}</span>
                        </button>
                        <button className={`tab ${tab === 'terms' ? 'active' : ''}`} onClick={() => setTab('terms')}>
                            Syarat &amp; Ketentuan <span className="count">{terms.length}</span>
                        </button>
                    </div>

                    {tab === 'products' && (
                        <>
                            <div className="card-head" style={{ paddingBottom: 0 }}>
                                <div>
                                    <h2>Produk cepat</h2>
                                    <p>Produk ini muncul sebagai kartu pilihan di builder quotation dan PO.</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={() => openProduct()}>
                                    <Icon name="plus" /> Tambah
                                </button>
                            </div>
                            <div className="table-wrap mt-2">
                                <table className="table">
                                    <thead><tr><th>SKU</th><th>Produk</th><th>Kategori</th><th>Grade / ukuran</th><th>Satuan</th><th className="num">Harga dasar</th><th>Status</th><th /></tr></thead>
                                    <tbody>
                                        {products.map((product) => (
                                            <tr key={product.id}>
                                                <td><span className="text-xs muted">{product.sku}</span></td>
                                                <td><strong>{product.name}</strong></td>
                                                <td><span className="badge badge-neutral">{product.category_label}</span></td>
                                                <td>{product.size_grade ?? '-'}</td>
                                                <td>{product.unit}</td>
                                                <td className="num">{formatRupiah(product.base_price, false)}</td>
                                                <td><span className={`badge ${product.is_active ? 'badge-success' : 'badge-neutral'}`}>{product.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                                                <td className="cell-actions">
                                                    <button className="icon-btn sm" onClick={() => openProduct(product)} title="Edit produk" aria-label="Edit produk">
                                                        <Icon name="edit" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {products.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon"><Icon name="package" /></div><h3>Belum ada produk</h3><p>Tambahkan produk cepat pertama.</p><button className="btn btn-primary btn-sm" onClick={() => openProduct()}>Tambah Produk</button></div></td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {tab === 'terms' && (
                        <>
                            <div className="card-head" style={{ paddingBottom: 0 }}>
                                <div>
                                    <h2>Template syarat &amp; ketentuan</h2>
                                    <p>Template default akan otomatis dipakai pada quotation baru.</p>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={() => openTerm()}>
                                    <Icon name="plus" /> Tambah
                                </button>
                            </div>
                            <div className="card-body grid grid-1-1">
                                {terms.map((term) => (
                                    <div className="template-item" key={term.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
                                        <div className="template-title">
                                            <strong>{term.name}</strong>
                                            {term.is_default && <span className="badge badge-success">Default</span>}
                                            <span className={`badge ${term.is_active ? 'badge-info' : 'badge-neutral'}`}>{term.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                            <button className="icon-btn sm" style={{ marginLeft: 'auto' }} onClick={() => openTerm(term)} title="Edit template" aria-label="Edit template">
                                                <Icon name="edit" />
                                            </button>
                                        </div>
                                        <p style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>{term.body}</p>
                                    </div>
                                ))}
                                {terms.length === 0 && <div className="empty-state"><div className="empty-icon"><Icon name="file" /></div><h3>Belum ada template</h3><p>Tambahkan template syarat &amp; ketentuan.</p><button className="btn btn-primary btn-sm" onClick={() => openTerm()}>Tambah Template</button></div>}
                            </div>
                        </>
                    )}
                </section>
            </div>

            <CrmModal
                open={showProduct}
                onClose={() => setShowProduct(false)}
                title={editingProduct ? 'Edit produk cepat' : 'Tambah produk cepat'}
                description="Produk akan muncul di katalog quotation dan PO."
                large
                footer={
                    <>
                        <button className="btn btn-secondary" type="button" onClick={() => setShowProduct(false)}>Batal</button>
                        <button className="btn btn-primary" type="button" onClick={submitProduct} disabled={productForm.processing}><Icon name="check" /> Simpan produk</button>
                    </>
                }
            >
                <form id="productForm" onSubmit={submitProduct}>
                    {Object.keys(productForm.errors).length > 0 && <div className="alert alert-danger mb-2"><Icon name="alert-circle" /><span>Periksa kembali data produk.</span></div>}
                    <div className="form-grid">
                        <div className="field"><label>SKU</label><input className="input" value={productForm.data.sku} onChange={(event) => productForm.setData('sku', event.target.value.toUpperCase())} placeholder="FILLET-200" /></div>
                        <div className="field"><label>Nama produk</label><input className="input" value={productForm.data.name} onChange={(event) => productForm.setData('name', event.target.value)} placeholder="Fillet Lele" /></div>
                        <div className="field"><label>Kategori</label><select className="form-select" value={productForm.data.category} onChange={(event) => productForm.setData('category', event.target.value)}>{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                        <div className="field"><label>Grade / ukuran</label><input className="input" value={productForm.data.size_grade} onChange={(event) => productForm.setData('size_grade', event.target.value)} placeholder="200–250 g/pcs" /></div>
                        <div className="field"><label>Satuan</label><select className="form-select" value={productForm.data.unit} onChange={(event) => productForm.setData('unit', event.target.value)}><option value="kg">kg</option><option value="ekor">ekor</option></select></div>
                        <div className="field"><label>Harga dasar</label><input className="input" type="number" value={productForm.data.base_price} onChange={(event) => productForm.setData('base_price', event.target.value)} placeholder="48000" /></div>
                    </div>
                    <label className="check-row mt-2"><input type="checkbox" checked={productForm.data.is_active} onChange={(event) => productForm.setData('is_active', event.target.checked)} /><span>Aktif dan tampil di katalog</span></label>
                </form>
            </CrmModal>

            <CrmModal
                open={showTerm}
                onClose={() => setShowTerm(false)}
                title={editingTerm ? 'Edit template syarat' : 'Tambah template syarat'}
                description="Template default otomatis dipakai saat membuat quotation baru."
                large
                footer={
                    <>
                        <button className="btn btn-secondary" type="button" onClick={() => setShowTerm(false)}>Batal</button>
                        <button className="btn btn-primary" type="button" onClick={submitTerm} disabled={termForm.processing}><Icon name="check" /> Simpan template</button>
                    </>
                }
            >
                <form id="termForm" onSubmit={submitTerm}>
                    {Object.keys(termForm.errors).length > 0 && <div className="alert alert-danger mb-2"><Icon name="alert-circle" /><span>Periksa kembali template.</span></div>}
                    <div className="field"><label>Nama template</label><input className="input" value={termForm.data.name} onChange={(event) => termForm.setData('name', event.target.value)} placeholder="Standar Quotation" /></div>
                    <div className="field mt-2"><label>Isi syarat & ketentuan</label><textarea className="textarea" style={{ minHeight: 170 }} value={termForm.data.body} onChange={(event) => termForm.setData('body', event.target.value)} placeholder="Berlaku 7 hari...&#10;Pembayaran 14 hari..." /></div>
                    <div className="row mt-2">
                        <label className="check-row"><input type="checkbox" checked={termForm.data.is_default} onChange={(event) => termForm.setData('is_default', event.target.checked)} /><span>Jadikan template default</span></label>
                        <label className="check-row"><input type="checkbox" checked={termForm.data.is_active} onChange={(event) => termForm.setData('is_active', event.target.checked)} /><span>Aktif</span></label>
                    </div>
                    <div className="template-note mt-2"><Icon name="alert-circle" /><span>Jika dijadikan default, template lain otomatis tidak default.</span></div>
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}

function LinkToQuotation() {
    return (
        <a className="btn btn-secondary" href="/quotations/history">
            <Icon name="file" /> Daftar Quotation
        </a>
    );
}
