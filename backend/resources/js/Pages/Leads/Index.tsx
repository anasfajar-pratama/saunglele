import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import { formatRupiah, initials, segmentBadgeClass, whatsappUrl } from '@/lib/format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

type Props = {
    stages: any[];
    stats: any;
    lostReasons: any[];
    sources: any[];
    owners: { id: number; name: string }[];
    stageOptions: { value: string; label: string }[];
};

export default function LeadsIndex({ stages, stats, lostReasons, sources, owners, stageOptions }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [segmentFilter, setSegmentFilter] = useState<'all' | 'mbg' | 'kolam'>('all');

    const form = useForm<any>({
        name: '',
        segment: 'mbg',
        source: 'Referensi',
        estimated_value: '',
        owner_id: '',
        phone: '',
        city: '',
        next_follow_up_at: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        notes: '',
    });

    const filteredStages = stages.map((stage) => {
        const leads = stage.leads.filter((lead: any) => segmentFilter === 'all' || lead.segment === segmentFilter);

        return {
            ...stage,
            leads,
            count: leads.length,
            value: leads.reduce((sum: number, lead: any) => sum + lead.estimated_value, 0),
        };
    });

    function submitCreate(event: FormEvent) {
        event.preventDefault();
        form.post(route('leads.store'), {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    }

    function moveStage(leadId: number, stage: string) {
        router.patch(route('leads.stage', leadId), { stage }, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Pipeline Lead" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Pipeline Lead</span>
                        </div>
                        <h1>Pipeline Lead</h1>
                        <p>{stats.active} lead aktif · {formatRupiah(stats.pipeline_value)} · {stats.overdue_followups} follow-up terlambat.</p>
                    </div>
                    <div className="page-actions">
                        <div className="segmented">
                            <button className={segmentFilter === 'all' ? 'active' : ''} onClick={() => setSegmentFilter('all')}>Semua</button>
                            <button className={segmentFilter === 'mbg' ? 'active' : ''} onClick={() => setSegmentFilter('mbg')}>Dapur MBG</button>
                            <button className={segmentFilter === 'kolam' ? 'active' : ''} onClick={() => setSegmentFilter('kolam')}>Kolam</button>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" /> Tambah Lead</button>
                    </div>
                </div>

                <div className="kpi-grid cols-4">
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="target" /></span><span className="trend up">Aktif</span></div>
                        <div className="kpi-value">{stats.active}</div>
                        <div className="kpi-label">Lead aktif</div>
                        <div className="kpi-foot"><span>{stages.length} tahap pipeline</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-teal"><Icon name="cash" /></span><span className="trend up">Peluang</span></div>
                        <div className="kpi-value">{formatRupiah(stats.pipeline_value)}</div>
                        <div className="kpi-label">Nilai pipeline</div>
                        <div className="kpi-foot"><span>Estimasi dari lead aktif</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-top"><span className="kpi-icon tone-green"><Icon name="trending-up" /></span><span className="trend up">{stats.won} menang</span></div>
                        <div className="kpi-value">{stats.win_rate}%</div>
                        <div className="kpi-label">Win rate</div>
                        <div className="kpi-foot"><span>{stats.lost} lead kalah</span></div>
                    </div>
                    <div className="kpi-card accent">
                        <div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="clock" /></span><span className="badge badge-warning">{stats.overdue_followups} terlambat</span></div>
                        <div className="kpi-value">{stats.overdue_followups}</div>
                        <div className="kpi-label">Follow-up terlambat</div>
                        <div className="kpi-foot"><span>Perlu tindakan hari ini</span></div>
                    </div>
                </div>

                {stats.overdue_followups > 0 && (
                    <div className="insight-banner">
                        <Icon name="alert" />
                        <span><strong>{stats.overdue_followups} lead punya follow-up terlambat.</strong> Hubungi sebelum peluangnya hilang.</span>
                    </div>
                )}

                <div className="row-between mb-1">
                    <span className="text-xs muted">Geser board ke kanan untuk melihat seluruh tahap →</span>
                    <span className="text-xs muted">{filteredStages.length} tahap · {filteredStages.reduce((sum, stage) => sum + stage.leads.length, 0)} lead</span>
                </div>

                <div className="kanban mb-3">
                    {filteredStages.map((stage) => (
                        <div className="kanban-col" key={stage.key}>
                            <div className="kanban-head">
                                <h3>{stage.label}</h3>
                                <span className="kanban-count">{stage.count}</span>
                                <span className="kanban-value">{formatRupiah(stage.value)}</span>
                            </div>
                            <div className="kanban-list">
                                {stage.leads.map((lead: any) => (
                                    <article className="lead-card" key={lead.id}>
                                        <div className="lead-top">
                                            <span className={`badge ${segmentBadgeClass(lead.segment)}`}>{lead.segment_label}</span>
                                            <span className="avatar avatar-xs">{initials(lead.owner ?? 'SL')}</span>
                                        </div>
                                        <h4>{lead.name}</h4>
                                        <p className="sub"><Icon name="map-pin" /> {lead.city ?? '-'} · {lead.source ?? 'Manual'}</p>
                                        <div className="lead-value">{formatRupiah(lead.estimated_value)} <span>estimasi</span></div>
                                        <div className="lead-foot">
                                            <span className={`chip ${lead.is_overdue ? 'chip-danger' : 'chip-info'}`}>
                                                <Icon name="clock" /> {lead.next_follow_up_label ?? 'Belum dijadwalkan'}
                                            </span>
                                            {lead.phone && (
                                                <a className="icon-btn sm" href={whatsappUrl(lead.phone, `Halo Bapak/Ibu ${lead.name}, kami dari Saung Lele.`)} target="_blank" rel="noreferrer" aria-label="WhatsApp lead">
                                                    <Icon name="whatsapp" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="mt-2">
                                            <select className="select" style={{ height: 30, fontSize: 10.5, width: '100%' }} value={lead.stage} onChange={(event) => moveStage(lead.id, event.target.value)}>
                                                {stageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                            </select>
                                        </div>
                                    </article>
                                ))}
                                {stage.leads.length === 0 && <button className="lead-add" onClick={() => setShowCreate(true)}><Icon name="plus" /> Tambah lead</button>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-1-1">
                    <section className="card">
                        <div className="card-head">
                            <div><h2>Alasan kalah</h2><p>{stats.lost} lead kalah</p></div>
                            <span className="badge badge-neutral">Semua waktu</span>
                        </div>
                        <div className="hbar-list">
                            {lostReasons.map((reason) => (
                                <div className="hbar bad" key={reason.key}>
                                    <span>{reason.label}</span>
                                    <div className="hbar-bar"><i style={{ width: `${reason.percentage}%` }} /></div>
                                    <strong>{reason.percentage}%</strong>
                                </div>
                            ))}
                            {lostReasons.length === 0 && <p className="text-sm muted">Belum ada lead kalah.</p>}
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-head">
                            <div><h2>Sumber lead &amp; konversi</h2><p>Performa sumber lead</p></div>
                            <Link className="link" href={route('reports.index')}>Laporan</Link>
                        </div>
                        <div className="hbar-list">
                            {sources.map((source) => (
                                <div className="hbar" key={source.source}>
                                    <span>{source.source}</span>
                                    <div className="hbar-bar"><i style={{ width: `${Math.max(8, source.conversion)}%` }} /></div>
                                    <strong>{source.conversion}%</strong>
                                </div>
                            ))}
                            {sources.length === 0 && <p className="text-sm muted">Belum ada data sumber lead.</p>}
                        </div>
                    </section>
                </div>
            </div>

            <CrmModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Tambah lead baru"
                description="Setiap lead wajib punya next action agar tidak menggantung."
                large
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
                        <button className="btn btn-primary" onClick={submitCreate} disabled={form.processing}><Icon name="plus" /> Simpan lead</button>
                    </>
                }
            >
                <form onSubmit={submitCreate}>
                    <div className="form-grid">
                        <div className="field"><label>Nama lead / usaha</label><input className="input" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Contoh: Dapur MBG Ngaliyan" /></div>
                        <div className="field"><label>Segmen</label><select className="form-select" value={form.data.segment} onChange={(event) => form.setData('segment', event.target.value)}><option value="mbg">Dapur MBG</option><option value="kolam">Kolam Pembesaran</option></select></div>
                        <div className="field"><label>WhatsApp</label><input className="input" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} placeholder="08xx-xxxx-xxxx" /></div>
                        <div className="field"><label>Kota</label><input className="input" value={form.data.city} onChange={(event) => form.setData('city', event.target.value)} placeholder="Semarang" /></div>
                        <div className="field"><label>Sumber</label><select className="form-select" value={form.data.source} onChange={(event) => form.setData('source', event.target.value)}><option>Referensi</option><option>WhatsApp</option><option>Kunjungan lapangan</option><option>Instagram</option></select></div>
                        <div className="field"><label>Estimasi nilai</label><input className="input" type="number" value={form.data.estimated_value} onChange={(event) => form.setData('estimated_value', event.target.value)} placeholder="7200000" /></div>
                        <div className="field"><label>Follow-up pertama</label><input className="input" type="date" value={form.data.next_follow_up_at} onChange={(event) => form.setData('next_follow_up_at', event.target.value)} /></div>
                        <div className="field"><label>Penanggung jawab</label><select className="form-select" value={form.data.owner_id} onChange={(event) => form.setData('owner_id', event.target.value)}><option value="">Saya sendiri</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></div>
                    </div>
                    <div className="field mt-2"><label>Catatan kebutuhan</label><textarea className="textarea" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Kebutuhan awal, volume, atau konteks penting..." /></div>
                    {Object.keys(form.errors).length > 0 && <div className="alert alert-danger mt-2"><Icon name="alert-circle" /><span>Periksa kembali data lead.</span></div>}
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}
