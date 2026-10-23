import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import { formatNumber, segmentBadgeClass } from '@/lib/format';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type Props = {
    templates: any[];
    categories: { key: string; label: string; count: number }[];
    total: number;
};

const CATEGORY_ICONS: Record<string, string> = {
    all: 'layers',
    followup: 'message',
    penawaran: 'sparkles',
    quotation: 'file',
    po: 'package',
    pengiriman: 'truck',
    buyback: 'refresh',
    pembayaran: 'cash',
    retensi: 'star',
    winback: 'trending-up',
};

const PREVIEW_VALUES: Record<string, string> = {
    '{{nama}}': 'Bapak Ahmad',
    '{{nama_usaha}}': 'Dapur MBG Nusantara 03',
    '{{nama_sales}}': 'Rizky',
    '{{produk}}': 'fillet lele 250 g',
    '{{no_quotation}}': 'QUO/2610/0142',
    '{{no_po}}': 'PO-2610-018',
    '{{harga}}': 'Rp 6.160.500',
    '{{tanggal_kirim}}': '23 Oktober 2026',
    '{{tanggal}}': '28 Oktober 2026',
    '{{jam}}': '06.00',
    '{{driver}}': 'Pak Yanto',
    '{{qty}}': '12.000 ekor',
};

export default function TemplatesIndex({ templates, categories, total }: Props) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(templates[0]?.id ?? null);
    const [showCreate, setShowCreate] = useState(false);
    const [copied, setCopied] = useState(false);

    const form = useForm<any>({
        name: '',
        category: 'followup',
        segment: 'all',
        body: '',
        variables: '{{nama}}, {{nama_usaha}}',
        is_active: true,
    });

    const filtered = useMemo(() => {
        return templates.filter((template) => {
            const categoryMatch = activeCategory === 'all' || template.category === activeCategory;
            const queryMatch = !search || `${template.name} ${template.body}`.toLowerCase().includes(search.toLowerCase());
            return categoryMatch && queryMatch;
        });
    }, [templates, activeCategory, search]);

    const selected = templates.find((template) => template.id === selectedId) ?? filtered[0] ?? templates[0] ?? null;
    const previewBody = selected ? renderPreview(selected.body) : '';
    const previewName = selected?.segment === 'kolam' ? 'Kolam Pak Harto' : 'Dapur MBG Nusantara 03';

    function submitCreate(event: FormEvent) {
        event.preventDefault();
        form.post(route('templates.store'), {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    }

    function copyTemplate(body: string) {
        navigator.clipboard?.writeText(body).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Template Pesan" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><span>Beranda</span><Icon name="chevron-right" /><span>Template Pesan</span></div>
                        <h1>Template Pesan</h1>
                        <p>{categories.length - 1} kategori · {total} template · pesan konsisten, tetap personal.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary" onClick={() => window.open('https://web.whatsapp.com', '_blank')}><Icon name="external" /> Buka WhatsApp</button>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" /> Template Baru</button>
                    </div>
                </div>

                <div className="info-strip mb-2" style={{ background: '#e8f5f1', borderColor: '#c4e8df', color: 'var(--brand-ink)' }}>
                    <Icon name="whatsapp" />
                    <span><strong>Mode klik-untuk-chat aktif.</strong> Pesan diisi otomatis dari template. Setelah dikirim, tandai “Terkirim” agar tercatat di timeline pelanggan.</span>
                </div>

                <div className="template-layout">
                    <aside className="card category-panel">
                        <div className="card-head" style={{ paddingBottom: 10 }}>
                            <div><h2>Kategori</h2><p>Pilih konteks pesan</p></div>
                        </div>
                        <div className="category-list">
                            {categories.map((category) => (
                                <button
                                    key={category.key}
                                    className={`category-item ${activeCategory === category.key ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(category.key)}
                                >
                                    <Icon name={CATEGORY_ICONS[category.key] ?? 'message'} />
                                    {category.label}
                                    <span className="count">{category.count}</span>
                                </button>
                            ))}
                        </div>
                        <div className="card-foot">
                            <div className="template-note"><Icon name="sparkles" /><span>Gunakan variabel seperti <span className="var-chip">{'{{nama}}'}</span> agar pesan tetap personal.</span></div>
                        </div>
                    </aside>

                    <section className="card">
                        <div className="card-head">
                            <div><h2>Daftar template</h2><p>{filtered.length} template ditampilkan · klik untuk pratinjau</p></div>
                            <div className="search-field" style={{ maxWidth: 190, minWidth: 150, height: 32 }}>
                                <Icon name="search" />
                                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari template..." />
                            </div>
                        </div>

                        <div className="template-list mt-2">
                            {filtered.map((template) => (
                                <article
                                    key={template.id}
                                    className={`template-item ${selected?.id === template.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedId(template.id)}
                                >
                                    <div className="template-title">
                                        <strong>{template.name}</strong>
                                        <span className={`badge ${segmentBadgeClass(template.segment)}`}>{template.segment_label}</span>
                                        <span className="badge badge-neutral">Dipakai {formatNumber(template.usage_count)}×</span>
                                    </div>
                                    <p>{template.body}</p>
                                    <div className="template-meta">
                                        {template.variables.map((variable: string) => <span className="var-chip" key={variable}>{variable}</span>)}
                                        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={(event) => { event.stopPropagation(); setSelectedId(template.id); copyTemplate(renderPreview(template.body)); }}>
                                            {copied && selected?.id === template.id ? 'Tersalin' : 'Gunakan'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                            {filtered.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon"><Icon name="message" /></div>
                                    <h3>Belum ada template di kategori ini</h3>
                                    <p>Tambahkan template baru agar tim bisa mengirim pesan dengan konsisten.</p>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Icon name="plus" /> Template Baru</button>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="stack">
                        <section className="card">
                            <div className="card-head">
                                <div><h2>Pratinjau WhatsApp</h2><p>{selected?.name ?? 'Pilih template'}</p></div>
                                <span className="badge badge-success">Online</span>
                            </div>
                            <div className="card-body">
                                <div className="phone">
                                    <div className="phone-screen">
                                        <div className="phone-head">
                                            <span className="avatar">{previewName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                                            <div><strong>{previewName}</strong><span>online</span></div>
                                            <button className="icon-btn" aria-label="Menu"><Icon name="more-horizontal" /></button>
                                        </div>
                                        <div className="phone-body">
                                            <span className="wa-date">Hari ini</span>
                                            <div className="wa-bubble">Selamat pagi, ada update untuk pesanan kami?</div>
                                            <div className="wa-bubble out">
                                                {previewBody}
                                                <span className="wa-time">09.05 <span className="tick">✓✓</span></span>
                                            </div>
                                        </div>
                                        <div className="phone-foot">
                                            <div className="phone-input">Ketik pesan...</div>
                                            <button className="phone-send" aria-label="Kirim"><Icon name="send" /></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="phone-vars">
                                    {selected?.variables.map((variable: string) => <span className="var-chip" key={variable}>{variable}</span>)}
                                </div>

                                <div className="field mt-2">
                                    <label>Pesan (pratinjau)</label>
                                    <textarea className="textarea" style={{ minHeight: 110 }} value={previewBody} readOnly />
                                </div>

                                <div className="stack-sm mt-2">
                                    <button className="btn btn-wa btn-block" onClick={() => copyTemplate(previewBody)}>
                                        <Icon name="copy" /> {copied ? 'Pesan tersalin' : 'Salin pesan'}
                                    </button>
                                    <div className="row">
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => window.open('https://web.whatsapp.com', '_blank')}><Icon name="external" /> Buka WhatsApp</button>
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowCreate(true)}><Icon name="plus" /> Template</button>
                                    </div>
                                </div>

                                <div className="template-note mt-2">
                                    <Icon name="alert-circle" />
                                    <span>Hanya kirim ke pelanggan yang sudah opt-in. Jam tenang 20.00–08.00. Semua pesan tercatat di timeline.</span>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            <CrmModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Template pesan baru"
                description="Buat pesan yang bisa dipakai ulang dengan variabel personal."
                large
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={submitCreate} disabled={form.processing}><Icon name="check" /> Simpan template</button>
                    </>
                }
            >
                <form onSubmit={submitCreate}>
                    <div className="form-grid">
                        <div className="field"><label>Nama template</label><input className="input" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Contoh: Follow-up quotation" /></div>
                        <div className="field"><label>Kategori</label><select className="form-select" value={form.data.category} onChange={(event) => form.setData('category', event.target.value)}>{categories.filter((category) => category.key !== 'all').map((category) => <option key={category.key} value={category.key}>{category.label}</option>)}</select></div>
                        <div className="field"><label>Segmen</label><select className="form-select" value={form.data.segment} onChange={(event) => form.setData('segment', event.target.value)}><option value="all">Semua segmen</option><option value="mbg">Dapur MBG</option><option value="kolam">Kolam Pembesaran</option></select></div>
                        <div className="field"><label>Status</label><select className="form-select" value={form.data.is_active ? 'active' : 'draft'} onChange={(event) => form.setData('is_active', event.target.value === 'active')}><option value="active">Aktif</option><option value="draft">Draft</option></select></div>
                    </div>
                    <div className="field mt-2"><label>Isi pesan</label><textarea className="textarea" style={{ minHeight: 130 }} value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} placeholder="Selamat pagi Bapak/Ibu {{nama}}, ..." /></div>
                    <div className="field mt-2"><label>Variabel (pisahkan dengan koma)</label><input className="input" value={form.data.variables} onChange={(event) => form.setData('variables', event.target.value)} /></div>
                    <div className="form-note mt-1">Variabel tersedia: {'{{nama}}'}, {'{{nama_usaha}}'}, {'{{produk}}'}, {'{{qty}}'}, {'{{harga}}'}, {'{{tanggal_kirim}}'}, {'{{no_po}}'}, {'{{no_quotation}}'}, {'{{nama_sales}}'}.</div>
                    {Object.keys(form.errors).length > 0 && <div className="alert alert-danger mt-2"><Icon name="alert-circle" /><span>Periksa kembali data template.</span></div>}
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}

function renderPreview(body: string): string {
    let result = body;
    Object.entries(PREVIEW_VALUES).forEach(([key, value]) => {
        result = result.split(key).join(value);
    });
    return result;
}
