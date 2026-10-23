import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CrmModal from '@/Components/CrmModal';
import Icon from '@/Components/Icon';
import { formatNumber, formatRupiah, initials, statusBadgeClass } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type Props = {
    cycles: any[];
    stats: any;
    featured: any;
    upcoming: any[];
    customers: any[];
};

const FLOW = [
    { label: 'Bibit dikirim', keys: ['stocked', 'growing', 'sampling', 'near_harvest', 'ready', 'scheduled', 'harvested', 'settled'] },
    { label: 'Pembesaran', keys: ['growing', 'sampling', 'near_harvest', 'ready', 'scheduled', 'harvested', 'settled'] },
    { label: 'Sampling', keys: ['sampling', 'near_harvest', 'ready', 'scheduled', 'harvested', 'settled'] },
    { label: 'Mendekati panen', keys: ['near_harvest', 'ready', 'scheduled', 'harvested', 'settled'] },
    { label: 'Buyback', keys: ['scheduled', 'harvested', 'settled'] },
    { label: 'Pembayaran', keys: ['settled'] },
];

export default function BuybacksIndex({ cycles, stats, featured, upcoming, customers }: Props) {
    const [showCycle, setShowCycle] = useState(false);
    const [showSampling, setShowSampling] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);

    const cycleForm = useForm({
        customer_id: customers[0]?.id ?? '',
        stocked_at: new Date().toISOString().slice(0, 10),
        seed_qty: 10000,
        seed_size: '3–5 cm',
        target_abw_g: 200,
        estimated_harvest_at: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        notes: '',
    });

    const samplingForm = useForm({
        buyback_cycle_id: featured?.id ?? cycles[0]?.id ?? '',
        sampled_at: new Date().toISOString().slice(0, 10),
        sample_count: 30,
        avg_weight_g: featured?.latest_sampling?.avg_weight_g ?? 0,
        estimated_sr: featured?.latest_sampling?.estimated_sr ?? 85,
        notes: '',
    });

    const scheduleForm = useForm({
        buyback_cycle_id: featured?.id ?? cycles[0]?.id ?? '',
        estimated_harvest_at: featured?.estimated_harvest_at ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        price_per_kg: 22500,
        grade: 'Grade A',
        notes: '',
    });

    const chart = useMemo(() => {
        const samplings = featured?.samplings ?? [];
        if (samplings.length === 0) return null;

        const maxWeight = Math.max(featured?.target_abw_g ?? 0, ...samplings.map((sampling: any) => sampling.avg_weight_g), 100);
        const points = samplings.map((sampling: any, index: number) => {
            const x = 10 + (index / Math.max(1, samplings.length - 1)) * 276;
            const y = 105 - (sampling.avg_weight_g / maxWeight) * 90;
            return { x, y, ...sampling };
        });
        const targetY = 105 - ((featured?.target_abw_g ?? 0) / maxWeight) * 90;

        return { points, targetY, maxWeight };
    }, [featured]);

    function openSampling(cycleId?: number) {
        samplingForm.setData('buyback_cycle_id', cycleId ?? featured?.id ?? cycles[0]?.id ?? '');
        setShowSampling(true);
    }

    function openSchedule(cycleId?: number) {
        scheduleForm.setData('buyback_cycle_id', cycleId ?? featured?.id ?? cycles[0]?.id ?? '');
        setShowSchedule(true);
    }

    function submitCycle(event: FormEvent) {
        event.preventDefault();
        cycleForm.post(route('buybacks.cycles.store'), { onSuccess: () => setShowCycle(false) });
    }

    function submitSampling(event: FormEvent) {
        event.preventDefault();
        samplingForm.post(route('buybacks.sampling.store'), { onSuccess: () => setShowSampling(false) });
    }

    function submitSchedule(event: FormEvent) {
        event.preventDefault();
        scheduleForm.post(route('buybacks.schedule'), { onSuccess: () => setShowSchedule(false) });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Buyback Panen" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><span>Beranda</span><Icon name="chevron-right" /><span>Buyback Panen</span></div>
                        <h1>Buyback Panen</h1>
                        <p>Pantau mitra kolam dari tebar bibit sampai pembelian kembali hasil panen.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary" onClick={() => setShowCycle(true)}><Icon name="plus" /> Tambah Siklus</button>
                        <button className="btn btn-primary" onClick={() => openSchedule()}><Icon name="calendar-check" /> Jadwalkan Buyback</button>
                    </div>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-green"><Icon name="users" /></span><span className="trend up">Aktif</span></div><div className="kpi-value">{stats.active}</div><div className="kpi-label">Siklus berjalan</div><div className="kpi-foot"><span>{stats.near_harvest} mendekati panen</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-teal"><Icon name="refresh" /></span><span className="badge badge-info">Terpantau</span></div><div className="kpi-value">{stats.near_harvest}</div><div className="kpi-label">Siap / mendekati panen</div><div className="kpi-foot"><span>Butuh jadwal buyback</span></div></div>
                    <div className="kpi-card accent"><div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="fish" /></span><span className="trend up">Estimasi</span></div><div className="kpi-value">{formatNumber(stats.estimated_biomass_kg, 1)} kg</div><div className="kpi-label">Estimasi biomassa</div><div className="kpi-foot"><span>Dari sampling terakhir</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="cash" /></span><span className="trend up">Acuan</span></div><div className="kpi-value">{formatRupiah(stats.estimated_value)}</div><div className="kpi-label">Estimasi nilai buyback</div><div className="kpi-foot"><span>Harga acuan Rp 22.000/kg</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-purple"><Icon name="percent" /></span><span className="badge badge-success">Baik</span></div><div className="kpi-value">{formatNumber(stats.average_sr, 1)}%</div><div className="kpi-label">Survival rate rata-rata</div><div className="kpi-foot"><span>Target ≥ 85%</span></div></div>
                </div>

                <section className="card mb-2">
                    <div className="card-head"><div><h2>Alur buyback</h2><p>Dari bibit dikirim sampai pembayaran hasil panen</p></div><span className="badge badge-neutral">{featured?.status_label ?? 'Belum ada siklus'}</span></div>
                    <div className="flow-strip">
                        {FLOW.map((step, index) => {
                            const status = featured?.status;
                            const states = [
                                status ? 'done' : '',
                                ['sampling', 'near_harvest', 'ready', 'scheduled', 'harvested', 'settled'].includes(status) ? 'done' : status === 'growing' ? 'active' : '',
                                ['near_harvest', 'ready', 'scheduled', 'harvested', 'settled'].includes(status) ? 'done' : status === 'sampling' ? 'active' : '',
                                ['scheduled', 'harvested', 'settled'].includes(status) ? 'done' : ['near_harvest', 'ready'].includes(status) ? 'active' : '',
                                ['harvested', 'settled'].includes(status) ? 'done' : status === 'scheduled' ? 'active' : '',
                                status === 'settled' ? 'done' : status === 'harvested' ? 'active' : '',
                            ];
                            const state = states[index];
                            return <div className={`flow-step ${state}`} key={step.label}><span className="flow-num">{state === 'done' ? <Icon name="check" /> : index + 1}</span><span>{step.label}</span></div>;
                        })}
                    </div>
                </section>

                <section className="card mb-2">
                    <div className="card-head"><div><h2>Siklus pembesaran</h2><p>{cycles.length} siklus · {stats.near_harvest} mendekati panen</p></div><span className="badge badge-neutral">Data mitra</span></div>
                    <div className="table-wrap mt-2">
                        <table className="table">
                            <thead><tr><th>Mitra</th><th>Bibit &amp; tebar</th><th>Umur</th><th>Sampling terakhir</th><th>Estimasi panen</th><th>Status</th><th /></tr></thead>
                            <tbody>
                                {cycles.map((cycle) => (
                                    <tr key={cycle.id}>
                                        <td><div className="entity"><span className="avatar avatar-sm kolam">{initials(cycle.customer.name)}</span><div><strong>{cycle.customer.name}</strong><span className="sub">{cycle.customer.city}</span></div></div></td>
                                        <td>{formatNumber(cycle.seed_qty)} ekor<span className="sub">{cycle.seed_size} · {cycle.stocked_label}</span></td>
                                        <td>{cycle.age_days} hari<span className="sub">target {cycle.target_abw_g} g</span></td>
                                        <td>{cycle.latest_sampling ? `${formatNumber(cycle.latest_sampling.avg_weight_g, 1)} g` : '-'}<span className="sub">{cycle.latest_sampling ? `SR ${formatNumber(cycle.latest_sampling.estimated_sr, 1)}% · ${cycle.latest_sampling.estimated_biomass_kg} kg` : 'Belum ada sampling'}</span></td>
                                        <td>{cycle.estimated_harvest_label}<span className="sub">{cycle.days_to_harvest !== null ? `${cycle.days_to_harvest} hari lagi` : '-'}</span></td>
                                        <td><span className={`badge ${statusBadgeClass(cycle.status)}`}>{cycle.status_label}</span></td>
                                        <td className="cell-actions">
                                            <button className="icon-btn sm" onClick={() => openSampling(cycle.id)} aria-label="Catat sampling"><Icon name="activity" /></button>
                                            <button className="icon-btn sm" onClick={() => openSchedule(cycle.id)} aria-label="Jadwalkan buyback"><Icon name="calendar-check" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="grid grid-2-1">
                    <section className="card">
                        <div className="card-head"><div><h2>Siklus terpantau</h2><p>{featured?.customer.name ?? 'Belum ada siklus'} · {featured?.customer.city ?? '-'}</p></div>{featured && <span className={`badge ${statusBadgeClass(featured.status)}`}>{featured.status_label}</span>}</div>
                        <div className="card-body">
                            {featured ? (
                                <>
                                    <div className="cycle-hero">
                                        <div className="cycle-hero-top"><span className="avatar kolam">{initials(featured.customer.name)}</span><div><strong>{featured.customer.name}</strong><span>{formatNumber(featured.seed_qty)} ekor · tebar {featured.stocked_label}</span></div><span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{featured.seed_po ?? 'Tanpa PO'}</span></div>
                                        <div className="cycle-metrics">
                                            <div className="cycle-metric"><strong>{featured.latest_sampling ? `${formatNumber(featured.latest_sampling.avg_weight_g, 1)} g` : '-'}</strong><span>ABW saat ini</span></div>
                                            <div className="cycle-metric"><strong>{featured.latest_sampling ? `${formatNumber(featured.latest_sampling.estimated_sr, 1)}%` : '-'}</strong><span>Survival rate</span></div>
                                            <div className="cycle-metric"><strong>{featured.latest_sampling ? `${formatNumber(featured.latest_sampling.estimated_biomass_kg, 1)} kg` : '-'}</strong><span>Estimasi biomassa</span></div>
                                        </div>
                                        {chart && (
                                            <div className="sample-chart">
                                                <svg viewBox="0 0 300 120" role="img" aria-label="Grafik pertumbuhan ABW">
                                                    {[20, 50, 80, 105].map((y) => <line key={y} x1="10" y1={y} x2="290" y2={y} stroke="#e3e9e4" strokeWidth="1" />)}
                                                    <line x1="10" y1={chart.targetY} x2="290" y2={chart.targetY} stroke="#e9963e" strokeWidth="1.3" strokeDasharray="5 4" />
                                                    <polyline points={chart.points.map((point: any) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#0e7a6b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                                    {chart.points.map((point: any) => <circle key={point.id} cx={point.x} cy={point.y} r="3.2" fill="#0e7a6b" />)}
                                                    {chart.points.map((point: any) => <text key={`label-${point.id}`} x={point.x - 8} y="116" fontSize="7" fill="#94a39d" fontFamily="Plus Jakarta Sans, sans-serif">{point.sampled_label}</text>)}
                                                </svg>
                                                <div className="sample-legend"><span><i style={{ background: '#0e7a6b' }} /> ABW aktual</span><span><i style={{ background: '#e9963e' }} /> Target {featured.target_abw_g} g</span></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="timeline mt-2">
                                        {featured.samplings.map((sampling: any) => (
                                            <div className="timeline-item" key={sampling.id}>
                                                <span className="timeline-dot"><Icon name="activity" /></span>
                                                <div className="timeline-head"><strong>Sampling {formatNumber(sampling.avg_weight_g, 1)} g</strong><time>{sampling.sampled_label}</time></div>
                                                <div className="timeline-body">SR {formatNumber(sampling.estimated_sr, 1)}% · estimasi biomassa {formatNumber(sampling.estimated_biomass_kg, 1)} kg.</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="row mt-2">
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openSchedule(featured.id)}><Icon name="calendar-check" /> Jadwalkan buyback</button>
                                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openSampling(featured.id)}><Icon name="activity" /> Catat sampling</button>
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state"><div className="empty-icon"><Icon name="sprout" /></div><h3>Belum ada siklus</h3><p>Tambahkan siklus pembesaran mitra untuk mulai memantau.</p><button className="btn btn-primary btn-sm" onClick={() => setShowCycle(true)}>Tambah Siklus</button></div>
                            )}
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-head"><div><h2>Jadwal buyback terdekat</h2><p>{upcoming.length} jadwal</p></div><Link className="link" href={route('purchase-orders.index')}>Lihat PO</Link></div>
                        <div className="card-body stack-sm">
                            {upcoming.map((cycle) => (
                                <div className="delivery-card" key={cycle.id}>
                                    <span className="delivery-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="calendar" /></span>
                                    <div className="delivery-main">
                                        <strong>{cycle.estimated_harvest_label} · {cycle.customer.name}</strong>
                                        <span>{cycle.latest_sampling ? `${formatNumber(cycle.latest_sampling.estimated_biomass_kg, 1)} kg` : 'Belum ada sampling'} · {cycle.seed_qty} ekor</span>
                                        <div className="delivery-labels" style={{ marginTop: 6, fontSize: 9 }}><span>{cycle.status_label}</span><span>{cycle.days_to_harvest !== null ? `${cycle.days_to_harvest} hari lagi` : ''}</span></div>
                                    </div>
                                </div>
                            ))}
                            {upcoming.length === 0 && <div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-icon"><Icon name="calendar" /></div><h3>Belum ada jadwal</h3><p>Jadwalkan buyback saat ikan mendekati ukuran panen.</p></div>}
                        </div>
                    </section>
                </div>
            </div>

            <CrmModal open={showCycle} onClose={() => setShowCycle(false)} title="Tambah siklus pembesaran" description="Buat siklus baru untuk mitra kolam." large footer={<><button className="btn btn-secondary" onClick={() => setShowCycle(false)}>Batal</button><button className="btn btn-primary" onClick={submitCycle} disabled={cycleForm.processing}><Icon name="check" /> Simpan siklus</button></>}>
                <form onSubmit={submitCycle}>
                    <div className="form-grid">
                        <div className="field"><label>Mitra</label><select className="form-select" value={cycleForm.data.customer_id} onChange={(event) => cycleForm.setData('customer_id', event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
                        <div className="field"><label>Tanggal tebar</label><input className="input" type="date" value={cycleForm.data.stocked_at} onChange={(event) => cycleForm.setData('stocked_at', event.target.value)} /></div>
                        <div className="field"><label>Jumlah bibit (ekor)</label><input className="input" type="number" value={cycleForm.data.seed_qty} onChange={(event) => cycleForm.setData('seed_qty', Number(event.target.value))} /></div>
                        <div className="field"><label>Ukuran bibit</label><input className="input" value={cycleForm.data.seed_size} onChange={(event) => cycleForm.setData('seed_size', event.target.value)} /></div>
                        <div className="field"><label>Target ABW (g)</label><input className="input" type="number" value={cycleForm.data.target_abw_g} onChange={(event) => cycleForm.setData('target_abw_g', Number(event.target.value))} /></div>
                        <div className="field"><label>Estimasi panen</label><input className="input" type="date" value={cycleForm.data.estimated_harvest_at} onChange={(event) => cycleForm.setData('estimated_harvest_at', event.target.value)} /></div>
                    </div>
                    <div className="field mt-2"><label>Catatan</label><textarea className="textarea" value={cycleForm.data.notes} onChange={(event) => cycleForm.setData('notes', event.target.value)} /></div>
                </form>
            </CrmModal>

            <CrmModal open={showSampling} onClose={() => setShowSampling(false)} title="Catat sampling" description="Perbarui pertumbuhan dan estimasi biomassa." footer={<><button className="btn btn-secondary" onClick={() => setShowSampling(false)}>Batal</button><button className="btn btn-primary" onClick={submitSampling} disabled={samplingForm.processing}><Icon name="check" /> Simpan sampling</button></>}>
                <form onSubmit={submitSampling}>
                    <div className="field"><label>Siklus</label><select className="form-select" value={samplingForm.data.buyback_cycle_id} onChange={(event) => samplingForm.setData('buyback_cycle_id', event.target.value)}>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.customer.name} · {cycle.stocked_label}</option>)}</select></div>
                    <div className="form-grid mt-2">
                        <div className="field"><label>Tanggal sampling</label><input className="input" type="date" value={samplingForm.data.sampled_at} onChange={(event) => samplingForm.setData('sampled_at', event.target.value)} /></div>
                        <div className="field"><label>Jumlah sampel</label><input className="input" type="number" value={samplingForm.data.sample_count} onChange={(event) => samplingForm.setData('sample_count', Number(event.target.value))} /></div>
                        <div className="field"><label>ABW (gram)</label><input className="input" type="number" value={samplingForm.data.avg_weight_g} onChange={(event) => samplingForm.setData('avg_weight_g', Number(event.target.value))} /></div>
                        <div className="field"><label>Estimasi SR (%)</label><input className="input" type="number" value={samplingForm.data.estimated_sr} onChange={(event) => samplingForm.setData('estimated_sr', Number(event.target.value))} /></div>
                    </div>
                    <div className="field mt-2"><label>Catatan kondisi kolam</label><textarea className="textarea" value={samplingForm.data.notes} onChange={(event) => samplingForm.setData('notes', event.target.value)} /></div>
                </form>
            </CrmModal>

            <CrmModal open={showSchedule} onClose={() => setShowSchedule(false)} title="Jadwalkan buyback" description="Atur jadwal panen dan harga acuan." footer={<><button className="btn btn-secondary" onClick={() => setShowSchedule(false)}>Batal</button><button className="btn btn-primary" onClick={submitSchedule} disabled={scheduleForm.processing}><Icon name="check" /> Simpan jadwal</button></>}>
                <form onSubmit={submitSchedule}>
                    <div className="field"><label>Siklus</label><select className="form-select" value={scheduleForm.data.buyback_cycle_id} onChange={(event) => scheduleForm.setData('buyback_cycle_id', event.target.value)}>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.customer.name} · {cycle.stocked_label}</option>)}</select></div>
                    <div className="form-grid mt-2">
                        <div className="field"><label>Tanggal buyback</label><input className="input" type="date" value={scheduleForm.data.estimated_harvest_at} onChange={(event) => scheduleForm.setData('estimated_harvest_at', event.target.value)} /></div>
                        <div className="field"><label>Harga acuan / kg</label><input className="input" type="number" value={scheduleForm.data.price_per_kg} onChange={(event) => scheduleForm.setData('price_per_kg', Number(event.target.value))} /></div>
                        <div className="field"><label>Grade</label><select className="form-select" value={scheduleForm.data.grade} onChange={(event) => scheduleForm.setData('grade', event.target.value)}><option>Grade A</option><option>Grade A/B</option><option>Grade B</option></select></div>
                    </div>
                    <div className="field mt-2"><label>Catatan</label><textarea className="textarea" value={scheduleForm.data.notes} onChange={(event) => scheduleForm.setData('notes', event.target.value)} /></div>
                </form>
            </CrmModal>
        </AuthenticatedLayout>
    );
}
