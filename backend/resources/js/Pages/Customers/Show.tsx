import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import UserAvatar from '@/Components/UserAvatar';
import {
    formatRupiah,
    healthBadgeClass,
    initials,
    segmentAvatarClass,
    segmentBadgeClass,
    statusBadgeClass,
    whatsappUrl,
} from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    customer: any;
    templates: any[];
    users: { id: number; name: string }[];
};

const TABS = [
    { key: 'overview', label: 'Ringkasan' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'quotations', label: 'Quotation' },
    { key: 'orders', label: 'PO' },
    { key: 'buyback', label: 'Buyback' },
    { key: 'documents', label: 'Dokumen' },
];

export default function CustomerShow({ customer, templates, users }: Props) {
    const [tab, setTab] = useState('overview');
    const contact = customer.contacts?.[0];
    const profile = customer.profile ?? {};
    const isAtRisk = customer.health_score < 60 || (customer.last_order_at && Date.now() - new Date(customer.last_order_at).getTime() > 30 * 86400000);

    const noteForm = useForm<any>({
        type: 'note',
        body: '',
        outcome: '',
        follow_up_title: '',
        follow_up_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        follow_up_time: '09:00',
        priority: 'normal',
        assigned_to: users[0]?.id ?? '',
    });

    const availableTemplates = templates.filter((template) => template.segment === 'all' || template.segment === customer.segment);

    function sendMessage(body: string, templateId?: number) {
        if (!customer.phone) return;
        window.open(whatsappUrl(customer.phone, body), '_blank');
        router.post(
            route('customers.messages.store', customer.id),
            { body, template_id: templateId ?? null },
            { preserveScroll: true },
        );
    }

    function sendGeneric() {
        const message = `Halo Bapak/Ibu ${contact?.name ?? customer.name}, kami dari Saung Lele. Kami ingin memastikan kebutuhan ${customer.segment === 'mbg' ? 'ikan siap masak dan fillet' : 'bibit lele'} Bapak/Ibu tetap terpenuhi. Apakah ada yang bisa kami bantu?`;
        sendMessage(message);
    }

    function submitNote(event: FormEvent) {
        event.preventDefault();
        noteForm.post(route('customers.interactions.store', customer.id), {
            preserveScroll: true,
            onSuccess: () => noteForm.reset('body', 'outcome', 'follow_up_title'),
        });
    }

    function completeFollowUp(id: number) {
        router.patch(route('follow-ups.complete', id), {}, { preserveScroll: true });
    }

    function snoozeFollowUp(id: number) {
        router.patch(route('follow-ups.snooze', id), {}, { preserveScroll: true });
    }

    const documents = [
        ...customer.quotations.map((quotation: any) => ({
            id: `q-${quotation.id}`,
            name: `Quotation ${quotation.number}.pdf`,
            meta: `${quotation.status_label} · ${formatRupiah(quotation.total)}`,
            href: route('quotations.show', quotation.id),
            icon: 'file',
        })),
        ...customer.purchase_orders.map((po: any) => ({
            id: `po-${po.id}`,
            name: `${po.number} · Dokumen PO`,
            meta: `${po.status_label} · ${formatRupiah(po.total)}`,
            href: route('purchase-orders.show', po.id),
            icon: 'package',
        })),
    ];

    return (
        <AuthenticatedLayout>
            <Head title={customer.name} />

            <div className="content">
                <div className="breadcrumb mb-2">
                    <Link href={route('dashboard')}>Beranda</Link>
                    <Icon name="chevron-right" />
                    <Link href={route('customers.index')}>Pelanggan</Link>
                    <Icon name="chevron-right" />
                    <span>{customer.name}</span>
                </div>

                <section className="profile-hero mb-2">
                    <div className="profile-main">
                        <span className={`avatar avatar-lg ${segmentAvatarClass(customer.segment)}`}>{initials(customer.name)}</span>
                        <div className="profile-info">
                            <div className="profile-name">
                                <h1>{customer.name}</h1>
                                <span className={`badge ${segmentBadgeClass(customer.segment)}`}>{customer.segment_label}</span>
                                <span className="badge badge-success">{customer.status_label}</span>
                                <span className={`badge ${healthBadgeClass(customer.health_score)}`}>
                                    <Icon name="alert" /> Health {customer.health_score}
                                </span>
                            </div>
                            <div className="profile-meta">
                                <span><Icon name="map-pin" /> {customer.city ?? '-'}</span>
                                <span><Icon name="user" /> {contact?.name ?? '-'} · {contact?.role ?? 'PIC'}</span>
                                <span><Icon name="phone" /> {customer.phone ?? '-'}</span>
                                <span><Icon name="user" /> Sales: {customer.owner ?? '-'}</span>
                                <span><Icon name="calendar" /> Pelanggan sejak {customer.created_label}</span>
                            </div>
                        </div>
                        <div className="profile-actions">
                            <button className="btn btn-wa" onClick={sendGeneric}><Icon name="whatsapp" /> WhatsApp</button>
                            <Link className="btn btn-secondary" href={route('quotations.index', { customer_id: customer.id })}><Icon name="file" /> Buat Quotation</Link>
                            <a className="btn btn-secondary" href="#noteForm"><Icon name="plus" /> Catat Follow-up</a>
                        </div>
                    </div>

                    <div className="profile-stats">
                        <div className="profile-stat"><strong>{formatRupiah(customer.lifetime_value)}</strong><span>Lifetime value</span></div>
                        <div className="profile-stat"><strong>{customer.stats.orders}</strong><span>Total order</span></div>
                        <div className="profile-stat"><strong>{customer.stats.completed_orders}×</strong><span>Order selesai</span></div>
                        <div className="profile-stat"><strong>{formatRupiah(customer.stats.average_order)}</strong><span>Rata-rata order</span></div>
                    </div>
                </section>

                {isAtRisk && (
                    <div className="alert alert-warning mb-2">
                        <Icon name="alert" />
                        <div>
                            <strong>{customer.last_order_label} tanpa order.</strong> Health score {customer.health_score} ({customer.health_label}). Prioritaskan follow-up dan win-back.
                        </div>
                        <button className="btn btn-amber btn-sm" onClick={() => setTab('timeline')}>Lihat timeline</button>
                    </div>
                )}

                <div className="grid grid-2-1">
                    <section className="card">
                        <div className="tabs">
                            {TABS.map((item) => (
                                <button key={item.key} className={`tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
                                    {item.label}
                                    {item.key === 'quotations' && <span className="count">{customer.quotations.length}</span>}
                                    {item.key === 'orders' && <span className="count">{customer.purchase_orders.length}</span>}
                                    {item.key === 'buyback' && <span className="count">{customer.buyback_cycles.length}</span>}
                                </button>
                            ))}
                        </div>

                        {tab === 'overview' && (
                            <div className="tab-panel active">
                                <div className="card-head">
                                    <div>
                                        <h2>Catat interaksi &amp; jadwalkan follow-up</h2>
                                        <p>Setiap catatan bisa menjadi pengingat. Tidak ada janji yang hilang.</p>
                                    </div>
                                </div>

                                <form className="card-body" id="noteForm" onSubmit={submitNote}>
                                    <div className="segmented mb-2">
                                        {[
                                            ['note', 'Catatan', 'edit'],
                                            ['call', 'Telepon', 'phone'],
                                            ['whatsapp', 'WhatsApp', 'whatsapp'],
                                            ['visit', 'Kunjungan', 'map-pin'],
                                        ].map(([value, label, icon]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={noteForm.data.type === value ? 'active' : ''}
                                                onClick={() => noteForm.setData('type', value)}
                                            >
                                                <Icon name={icon} /> {label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="field">
                                        <label>Apa yang terjadi?</label>
                                        <textarea
                                            className="textarea"
                                            value={noteForm.data.body}
                                            onChange={(event) => noteForm.setData('body', event.target.value)}
                                            placeholder="Contoh: PIC minta sample fillet ukuran 250 g. Mereka akan evaluasi untuk menu minggu depan."
                                        />
                                    </div>

                                    <div className="form-grid form-grid-3 mt-2">
                                        <div className="field">
                                            <label>Follow-up berikutnya</label>
                                            <input className="input" type="date" value={noteForm.data.follow_up_date} onChange={(event) => noteForm.setData('follow_up_date', event.target.value)} />
                                        </div>
                                        <div className="field">
                                            <label>Waktu</label>
                                            <input className="input" type="time" value={noteForm.data.follow_up_time} onChange={(event) => noteForm.setData('follow_up_time', event.target.value)} />
                                        </div>
                                        <div className="field">
                                            <label>Prioritas</label>
                                            <select className="form-select" value={noteForm.data.priority} onChange={(event) => noteForm.setData('priority', event.target.value)}>
                                                <option value="high">Tinggi</option>
                                                <option value="normal">Normal</option>
                                                <option value="low">Rendah</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-grid mt-2">
                                        <div className="field">
                                            <label>Judul follow-up (opsional)</label>
                                            <input className="input" value={noteForm.data.follow_up_title} onChange={(event) => noteForm.setData('follow_up_title', event.target.value)} placeholder="Otomatis dari catatan bila kosong" />
                                        </div>
                                        <div className="field">
                                            <label>Penanggung jawab</label>
                                            <select className="form-select" value={noteForm.data.assigned_to} onChange={(event) => noteForm.setData('assigned_to', event.target.value)}>
                                                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="row-between mt-2">
                                        <span className="form-note">Pengingat muncul di dashboard dan ditugaskan ke penanggung jawab.</span>
                                        <button className="btn btn-primary" type="submit" disabled={noteForm.processing}>
                                            <Icon name="calendar-check" /> Simpan &amp; ingatkan
                                        </button>
                                    </div>
                                </form>

                                <div className="divider" style={{ margin: 0 }} />

                                <div className="card-head" style={{ paddingTop: 16 }}>
                                    <div>
                                        <h2>Timeline terbaru</h2>
                                        <p>Semua interaksi, dokumen, dan perubahan status</p>
                                    </div>
                                    <button className="link" onClick={() => setTab('timeline')}>Lihat lengkap</button>
                                </div>

                                <div className="timeline mt-2">
                                    {customer.interactions.slice(0, 5).map((interaction: any) => (
                                        <TimelineItem key={interaction.id} interaction={interaction} />
                                    ))}
                                    {customer.interactions.length === 0 && <p className="text-sm muted" style={{ padding: '0 20px 20px' }}>Belum ada interaksi.</p>}
                                </div>
                            </div>
                        )}

                        {tab === 'timeline' && (
                            <div className="tab-panel active">
                                <div className="card-head">
                                    <div>
                                        <h2>Timeline lengkap</h2>
                                        <p>Riwayat hubungan dengan {customer.name}</p>
                                    </div>
                                </div>
                                <div className="timeline mt-2">
                                    {customer.interactions.map((interaction: any) => (
                                        <TimelineItem key={interaction.id} interaction={interaction} />
                                    ))}
                                    {customer.interactions.length === 0 && <p className="text-sm muted" style={{ padding: '0 20px 20px' }}>Belum ada interaksi.</p>}
                                </div>
                            </div>
                        )}

                        {tab === 'quotations' && (
                            <div className="tab-panel active">
                                <div className="card-head">
                                    <div><h2>Quotation pelanggan</h2><p>{customer.quotations.length} quotation</p></div>
                                    <Link className="btn btn-primary btn-sm" href={route('quotations.index')}><Icon name="plus" /> Quotation Baru</Link>
                                </div>
                                <div className="table-wrap mt-2">
                                    <table className="table">
                                        <thead><tr><th>Nomor</th><th>Tanggal</th><th>Item</th><th className="num">Nilai</th><th>Status</th><th>Berlaku s.d.</th><th /></tr></thead>
                                        <tbody>
                                            {customer.quotations.map((quotation: any) => (
                                                <tr key={quotation.id}>
                                                    <td><Link className="link-strong" href={route('quotations.show', quotation.id)}>{quotation.number}</Link></td>
                                                    <td>{quotation.issued_label}</td>
                                                    <td>{quotation.items_count} item<span className="sub">{quotation.items_summary}</span></td>
                                                    <td className="num">{formatRupiah(quotation.total)}</td>
                                                    <td><span className={`badge ${statusBadgeClass(quotation.status)}`}>{quotation.status_label}</span></td>
                                                    <td>{quotation.valid_label}</td>
                                                    <td className="cell-actions"><Link className="icon-btn sm" href={route('quotations.show', quotation.id)}><Icon name="chevron-right" /></Link></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {tab === 'orders' && (
                            <div className="tab-panel active">
                                <div className="card-head">
                                    <div><h2>PO pelanggan</h2><p>{customer.purchase_orders.length} pesanan</p></div>
                                    <Link className="btn btn-primary btn-sm" href={route('purchase-orders.create', { customer_id: customer.id })}><Icon name="plus" /> Terima PO</Link>
                                </div>
                                <div className="table-wrap mt-2">
                                    <table className="table">
                                        <thead><tr><th>No. PO</th><th>Item</th><th className="num">Nilai</th><th>Status</th><th>Kirim</th><th /></tr></thead>
                                        <tbody>
                                            {customer.purchase_orders.map((po: any) => (
                                                <tr key={po.id}>
                                                    <td><Link className="link-strong nowrap" href={route('purchase-orders.show', po.id)}>{po.number}</Link><span className="sub">{po.created_label}</span></td>
                                                    <td>{po.items_summary}</td>
                                                    <td className="num">{formatRupiah(po.total)}</td>
                                                    <td><span className={`badge ${statusBadgeClass(po.status)}`}>{po.status_label}</span></td>
                                                    <td>{po.requested_delivery_label}</td>
                                                    <td className="cell-actions"><Link className="icon-btn sm" href={route('purchase-orders.show', po.id)}><Icon name="chevron-right" /></Link></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {tab === 'buyback' && (
                            <div className="tab-panel active">
                                {customer.buyback_cycles.length > 0 ? (
                                    <>
                                        <div className="card-head">
                                            <div><h2>Siklus buyback</h2><p>{customer.buyback_cycles.length} siklus tercatat</p></div>
                                            <Link className="btn btn-secondary btn-sm" href={route('buybacks.index')}>Buka modul buyback</Link>
                                        </div>
                                        <div className="table-wrap mt-2">
                                            <table className="table">
                                                <thead><tr><th>Tebar</th><th>Bibit</th><th>Sampling terakhir</th><th>Estimasi panen</th><th>Status</th></tr></thead>
                                                <tbody>
                                                    {customer.buyback_cycles.map((cycle: any) => (
                                                        <tr key={cycle.id}>
                                                            <td>{cycle.stocked_label}</td>
                                                            <td>{cycle.seed_qty} ekor<span className="sub">{cycle.seed_size}</span></td>
                                                            <td>{cycle.latest_sampling ? `${cycle.latest_sampling.avg_weight_g} g` : '-'}<span className="sub">{cycle.latest_sampling ? `SR ${cycle.latest_sampling.estimated_sr}%` : 'Belum ada sampling'}</span></td>
                                                            <td>{cycle.estimated_harvest_label}</td>
                                                            <td><span className={`badge ${statusBadgeClass(cycle.status)}`}>{cycle.status_label}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon"><Icon name="sprout" /></div>
                                        <h3>Belum ada siklus buyback</h3>
                                        <p>Buyback berlaku untuk pelanggan segmen Kolam Pembesaran.</p>
                                        <Link className="btn btn-secondary btn-sm" href={route('buybacks.index')}>Lihat modul buyback</Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'documents' && (
                            <div className="tab-panel active">
                                <div className="card-head">
                                    <div><h2>Dokumen</h2><p>{documents.length} dokumen terkait</p></div>
                                </div>
                                <div className="card-body">
                                    {documents.length > 0 ? (
                                        <div className="doc-list">
                                            {documents.map((document) => (
                                                <div className="doc-item" key={document.id}>
                                                    <span className="doc-icon"><Icon name={document.icon} /></span>
                                                    <div className="doc-main"><strong>{document.name}</strong><span>{document.meta}</span></div>
                                                    <Link className="icon-btn sm" href={document.href}><Icon name="eye" /></Link>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state"><div className="empty-icon"><Icon name="file" /></div><h3>Belum ada dokumen</h3><p>Dokumen quotation dan PO akan muncul di sini.</p></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="stack">
                        <section className="card">
                            <div className="card-head">
                                <div><h2>Follow-up berikutnya</h2><p>{customer.next_follow_up ? 'Terjadwal' : 'Belum ada'}</p></div>
                                {customer.next_follow_up && <span className={`badge ${customer.next_follow_up.is_overdue ? 'badge-danger' : 'badge-warning'}`}>{customer.next_follow_up.is_overdue ? 'Terlambat' : 'Terjadwal'}</span>}
                            </div>
                            <div className="card-body">
                                {customer.next_follow_up ? (
                                    <>
                                        <div className="timeline-card" style={{ marginTop: 0 }}>
                                            <strong>{customer.next_follow_up.title}</strong>
                                            <div className="text-sm muted mt-1">{customer.next_follow_up.notes ?? 'Tindak lanjuti sesuai catatan terakhir.'}</div>
                                        </div>
                                        <div className="pref-list mt-2">
                                            <div className="pref-row"><span>Jatuh tempo</span><strong>{customer.next_follow_up.due_label}</strong></div>
                                            <div className="pref-row"><span>Penanggung jawab</span><strong className="row" style={{ gap: 6, justifyContent: 'flex-end' }}><UserAvatar user={{ name: customer.next_follow_up.assignee ?? 'Pengguna', role: customer.next_follow_up.assignee_role }} size="xs" /> {customer.next_follow_up.assignee ?? '-'}</strong></div>
                                            <div className="pref-row"><span>Prioritas</span><strong>{customer.next_follow_up.priority}</strong></div>
                                        </div>
                                        <div className="row mt-2">
                                            <button className="btn btn-primary btn-sm" onClick={() => completeFollowUp(customer.next_follow_up.id)}><Icon name="check" /> Selesaikan</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => snoozeFollowUp(customer.next_follow_up.id)}><Icon name="clock" /> Tunda</button>
                                            <button className="btn btn-wa btn-sm" onClick={sendGeneric}><Icon name="whatsapp" /> WA</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state" style={{ padding: '20px 0' }}>
                                        <div className="empty-icon"><Icon name="check-circle" /></div>
                                        <h3>Tidak ada follow-up</h3>
                                        <p>Catat interaksi untuk membuat pengingat berikutnya.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div><h2>Preferensi pelanggan</h2><p>Konteks untuk penawaran berikutnya</p></div>
                            </div>
                            <div className="card-body">
                                <div className="pref-list">
                                    {customer.segment === 'mbg' ? (
                                        <>
                                            <div className="pref-row"><span>Produk favorit</span><strong>{profile.preferred_products ?? '-'}</strong></div>
                                            <div className="pref-row"><span>Kapasitas dapur</span><strong>{profile.kitchen_capacity ? `${profile.kitchen_capacity} porsi/hari` : '-'}</strong></div>
                                            <div className="pref-row"><span>Jadwal kirim</span><strong>{profile.delivery_days ?? profile.delivery_window ?? '-'}</strong></div>
                                            <div className="pref-row"><span>Sertifikasi</span><strong>{profile.certifications ?? '-'}</strong></div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="pref-row"><span>Produk favorit</span><strong>{profile.preferred_products ?? '-'}</strong></div>
                                            <div className="pref-row"><span>Jumlah kolam</span><strong>{profile.pond_count ?? '-'}</strong></div>
                                            <div className="pref-row"><span>Luas kolam</span><strong>{profile.pond_area_m2 ? `${profile.pond_area_m2} m²` : '-'}</strong></div>
                                            <div className="pref-row"><span>Target ABW</span><strong>{profile.target_abw_g ? `${profile.target_abw_g} g` : '-'}</strong></div>
                                            <div className="pref-row"><span>Skema buyback</span><strong>{profile.buyback_agreement ?? '-'}</strong></div>
                                        </>
                                    )}
                                    <div className="pref-row"><span>Termin bayar</span><strong>{profile.payment_terms_days ?? 14} hari</strong></div>
                                    <div className="pref-row"><span>Alamat kirim</span><strong>{customer.address ?? '-'}</strong></div>
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div><h2>Kontak PIC</h2><p>{customer.contacts.length} kontak terdaftar</p></div>
                            </div>
                            <div className="card-body">
                                <div className="contact-list">
                                    {customer.contacts.map((item: any) => (
                                        <div className="contact" key={item.id}>
                                            <span className={`avatar avatar-sm ${segmentAvatarClass(customer.segment)}`}>{initials(item.name)}</span>
                                            <div className="contact-main"><strong>{item.name}</strong><span>{item.role} · {item.phone}</span></div>
                                            {item.phone && <a className="btn btn-wa btn-sm" href={whatsappUrl(item.phone, `Halo Bapak/Ibu ${item.name}, kami dari Saung Lele.`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" /></a>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div><h2>Template cepat</h2><p>Klik untuk membuka WhatsApp</p></div>
                            </div>
                            <div className="card-body">
                                <div className="quick-templates">
                                    {availableTemplates.slice(0, 6).map((template) => (
                                        <button className="quick-template" key={template.id} onClick={() => sendMessage(template.rendered_body, template.id)}>
                                            <Icon name="message" /> {template.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="template-note mt-2">
                                    <Icon name="whatsapp" />
                                    <span>Pesan tercatat ke timeline setelah dikirim. Template mengikuti segmen dan data pelanggan.</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function TimelineItem({ interaction }: { interaction: any }) {
    const icon = interaction.type === 'whatsapp' ? 'whatsapp' : interaction.type === 'call' ? 'phone' : interaction.type === 'visit' ? 'map-pin' : 'edit';
    const tone = interaction.type === 'whatsapp' ? '' : interaction.type === 'call' ? 'blue' : 'amber';

    return (
        <div className="timeline-item">
            <span className={`timeline-dot ${tone}`}><Icon name={icon} /></span>
            <div className="timeline-head">
                <strong>{interaction.type_label}</strong>
                <time>{interaction.time_label} · {interaction.created_by}</time>
            </div>
            <div className="timeline-body">{interaction.body}</div>
            {interaction.outcome && <div className="timeline-card"><strong>Hasil:</strong> {interaction.outcome}</div>}
        </div>
    );
}
