import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import UserAvatar from '@/Components/UserAvatar';
import {
    formatRupiah,
    initials,
    segmentAvatarClass,
    segmentBadgeClass,
    statusBadgeClass,
    whatsappUrl,
} from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';

type Props = {
    today: string;
    kpis: {
        followups_today: number;
        followups_overdue: number;
        active_customers: number;
        pipeline_value: number;
        active_leads: number;
        open_pos: number;
        ready_pos: number;
        repeat_rate: number;
        mbg_customers: number;
        kolam_customers: number;
    };
    followUps: any[];
    upcomingFollowUps: any[];
    health: { aman: number; attention: number; risk: number; total: number; average: number };
    pipeline: any[];
    recentPos: any[];
    segments: {
        mbg: any;
        kolam: any;
    };
    activities: any[];
};

export default function Dashboard({ today, kpis, followUps, upcomingFollowUps, health, pipeline, recentPos, segments, activities }: Props) {
    const healthTotal = health.total || 1;
    const amanPct = Math.round((health.aman / healthTotal) * 100);
    const attentionPct = Math.round((health.attention / healthTotal) * 100);
    const maxPipeline = Math.max(...pipeline.map((stage) => stage.count), 1);

    function completeFollowUp(id: number) {
        router.patch(route('follow-ups.complete', id), {}, { preserveScroll: true });
    }

    function sendWhatsapp(followUp: any) {
        if (!followUp.customer?.phone) return;

        const message = `Halo Bapak/Ibu ${followUp.customer.name}, kami dari Saung Lele ingin menindaklanjuti ${followUp.title.toLowerCase()}. Apakah ada waktu untuk berdiskusi?`;
        window.open(whatsappUrl(followUp.customer.phone, message), '_blank');
        router.post(
            route('customers.messages.store', followUp.customer.id),
            { body: message },
            { preserveScroll: true },
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb">
                            <span>Beranda</span>
                            <Icon name="chevron-right" />
                            <span>Dashboard</span>
                        </div>
                        <h1>Dashboard</h1>
                        <p>{today} · {kpis.followups_today} follow-up menunggu, {kpis.followups_overdue} terlambat.</p>
                    </div>
                    <div className="page-actions">
                        <Link className="btn btn-secondary" href={route('reports.index')}>
                            <Icon name="download" /> Laporan
                        </Link>
                        <Link className="btn btn-primary" href={`${route('customers.index')}#new`}>
                            <Icon name="plus" /> Tambah Pelanggan
                        </Link>
                    </div>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card accent">
                        <div className="kpi-top">
                            <span className="kpi-icon tone-amber"><Icon name="clock" /></span>
                            <span className="badge badge-warning">{kpis.followups_overdue} terlambat</span>
                        </div>
                        <div className="kpi-value">{kpis.followups_today}</div>
                        <div className="kpi-label">Follow-up hari ini</div>
                        <div className="kpi-foot">
                            <span>Prioritas harian</span>
                            <span className="muted-2">·</span>
                            <a className="link" href="#followups">Lihat antrean</a>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-top">
                            <span className="kpi-icon tone-teal"><Icon name="users" /></span>
                            <span className="trend up">Aktif</span>
                        </div>
                        <div className="kpi-value">{kpis.active_customers}</div>
                        <div className="kpi-label">Pelanggan aktif</div>
                        <div className="kpi-foot">
                            <span>{kpis.mbg_customers} Dapur MBG</span>
                            <span className="muted-2">·</span>
                            <span>{kpis.kolam_customers} kolam</span>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-top">
                            <span className="kpi-icon tone-blue"><Icon name="target" /></span>
                            <span className="trend up">{kpis.active_leads} lead</span>
                        </div>
                        <div className="kpi-value">{formatRupiah(kpis.pipeline_value)}</div>
                        <div className="kpi-label">Nilai pipeline</div>
                        <div className="kpi-foot">
                            <span>Peluang aktif</span>
                            <span className="muted-2">·</span>
                            <Link className="link" href={route('leads.index')}>Buka pipeline</Link>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-top">
                            <span className="kpi-icon tone-purple"><Icon name="package" /></span>
                            <span className="badge badge-info">{kpis.ready_pos} siap</span>
                        </div>
                        <div className="kpi-value">{kpis.open_pos}</div>
                        <div className="kpi-label">PO berjalan</div>
                        <div className="kpi-foot">
                            <span>{kpis.ready_pos} siap kirim</span>
                            <span className="muted-2">·</span>
                            <Link className="link" href={route('purchase-orders.index')}>Lihat PO</Link>
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-top">
                            <span className="kpi-icon tone-green"><Icon name="trending-up" /></span>
                            <span className="trend up">Target 70%</span>
                        </div>
                        <div className="kpi-value">{kpis.repeat_rate}%</div>
                        <div className="kpi-label">Repeat order rate</div>
                        <div className="kpi-foot">
                            <span>Dari pelanggan aktif</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-2-1 mb-3">
                    <section className="card" id="followups">
                        <div className="card-head">
                            <div>
                                <h2>Follow-up hari ini</h2>
                                <p>{followUps.length} tugas · {upcomingFollowUps.length} mendatang</p>
                            </div>
                            <Link className="link" href={route('customers.index')}>Lihat semua</Link>
                        </div>

                        <div className="reminder-list mt-2">
                            {followUps.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon"><Icon name="check-circle" /></div>
                                    <h3>Tidak ada follow-up tertunda</h3>
                                    <p>Semua janji ke pelanggan sudah ditindaklanjuti. Kerja bagus.</p>
                                </div>
                            )}
                            {followUps.map((followUp) => (
                                <div className="reminder" key={followUp.id}>
                                    <button className="reminder-check" onClick={() => completeFollowUp(followUp.id)} aria-label="Tandai selesai">
                                        <Icon name="check" />
                                    </button>
                                    <div className="reminder-main">
                                        <div className="reminder-top">
                                            <strong>{followUp.name}</strong>
                                            <span className={`badge ${segmentBadgeClass(followUp.segment)}`}>
                                                {followUp.segment === 'mbg' ? 'Dapur MBG' : followUp.segment === 'kolam' ? 'Kolam Pembesaran' : 'Lead'}
                                            </span>
                                            <span className={`chip ${followUp.is_overdue ? 'chip-danger' : 'chip-info'}`}>
                                                <Icon name="clock" /> {followUp.is_overdue ? 'Terlambat · ' : ''}{followUp.due_label}
                                            </span>
                                        </div>
                                        <p>{followUp.title}{followUp.notes ? ` — ${followUp.notes}` : ''}</p>
                                        <div className="reminder-meta">
                                            <span><Icon name="calendar" /> {followUp.due_label}</span>
                                            <span className="row" style={{ gap: 4 }}>
                                                <UserAvatar user={{ name: followUp.assignee, role: followUp.assignee_role }} size="xs" />
                                                {followUp.assignee}
                                            </span>
                                        </div>
                                    </div>
                                    {followUp.customer ? (
                                        <button className="btn btn-wa btn-sm" onClick={() => sendWhatsapp(followUp)}>
                                            <Icon name="whatsapp" /> WA
                                        </button>
                                    ) : (
                                        <Link className="btn btn-secondary btn-sm" href={route('leads.index')}>
                                            <Icon name="target" /> Lead
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="stack">
                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>Kesehatan pelanggan</h2>
                                    <p>Recency, frekuensi, nilai, dan engagement</p>
                                </div>
                                <Link className="icon-btn sm" href={route('reports.index')} aria-label="Buka laporan">
                                    <Icon name="arrow-up-right" />
                                </Link>
                            </div>
                            <div className="donut-wrap">
                                <div
                                    className="donut"
                                    style={{
                                        background: `conic-gradient(var(--brand) 0 ${amanPct}%, var(--accent) ${amanPct}% ${amanPct + attentionPct}%, var(--red) ${amanPct + attentionPct}% 100%)`,
                                    }}
                                >
                                    <div className="donut-center">
                                        <strong>{amanPct}%</strong>
                                        <span>Aman</span>
                                    </div>
                                </div>
                                <div className="legend">
                                    <div className="legend-row"><span className="legend-dot" style={{ background: '#0e7a6b' }} /> Aman <strong>{health.aman}</strong></div>
                                    <div className="legend-row"><span className="legend-dot" style={{ background: '#e9963e' }} /> Perhatian <strong>{health.attention}</strong></div>
                                    <div className="legend-row"><span className="legend-dot" style={{ background: '#dc2626' }} /> Berisiko <strong>{health.risk}</strong></div>
                                    <div className="legend-row text-xs muted"><span className="legend-dot" style={{ background: '#cfe3dd' }} /> Rata-rata <strong>{health.average}</strong></div>
                                </div>
                            </div>
                            <div className="card-foot">
                                <div className="info-strip" style={{ background: '#fdf3e6', borderColor: '#fde68a' }}>
                                    <Icon name="alert" />
                                    <span><strong>{health.risk} pelanggan berisiko churn.</strong> Prioritaskan win-back.</span>
                                    <Link href={route('customers.index', { health: 'berisiko' })}>Lihat</Link>
                                </div>
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>Pipeline lead</h2>
                                    <p>{kpis.active_leads} lead · {formatRupiah(kpis.pipeline_value)}</p>
                                </div>
                                <Link className="link" href={route('leads.index')}>Detail</Link>
                            </div>
                            <div className="funnel">
                                {pipeline.map((stage) => (
                                    <div className="funnel-row" key={stage.key}>
                                        <span>{stage.label}</span>
                                        <div className="funnel-bar"><i style={{ width: `${Math.max(10, (stage.count / maxPipeline) * 100)}%` }} /></div>
                                        <strong>{stage.count}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>Akan datang</h2>
                                    <p>{upcomingFollowUps.length} follow-up berikutnya</p>
                                </div>
                                <Link className="icon-btn sm" href={route('customers.index')} aria-label="Buka pelanggan">
                                    <Icon name="calendar" />
                                </Link>
                            </div>
                            <div className="card-body">
                                {upcomingFollowUps.map((followUp) => (
                                    <div className="list-row" key={followUp.id}>
                                        <span className={`dot ${followUp.segment === 'mbg' ? 'blue' : 'green'}`} />
                                        <div className="list-row-main">
                                            <strong>
                                                {followUp.customer ? (
                                                    <Link className="link-strong" href={route('customers.show', followUp.customer.id)}>{followUp.name}</Link>
                                                ) : followUp.name}
                                            </strong>
                                            <span>{followUp.title} · {followUp.due_label}</span>
                                        </div>
                                        <span className="chip"><Icon name="user" /> {followUp.assignee}</span>
                                    </div>
                                ))}
                                {upcomingFollowUps.length === 0 && (
                                    <p className="text-sm muted">Tidak ada follow-up mendatang.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                <section className="card mb-3">
                    <div className="card-head">
                        <div>
                            <h2>PO dalam progres</h2>
                            <p>Dari PO diterima sampai barang diterima pelanggan</p>
                        </div>
                        <Link className="link" href={route('purchase-orders.index')}>Lihat semua PO</Link>
                    </div>
                    <div className="table-wrap mt-2">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No. PO</th>
                                    <th>Pelanggan</th>
                                    <th>Segmen</th>
                                    <th>Item</th>
                                    <th className="num">Nilai</th>
                                    <th>Status</th>
                                    <th>Progres</th>
                                    <th>Kirim</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {recentPos.map((po) => (
                                    <tr key={po.id}>
                                        <td>
                                            <Link className="link-strong nowrap" href={route('purchase-orders.show', po.id)}>{po.number}</Link>
                                            <span className="sub">PO customer: {po.customer_po_number ?? '-'}</span>
                                        </td>
                                        <td>
                                            <div className="entity">
                                                <span className={`avatar avatar-sm ${segmentAvatarClass(po.customer.segment)}`}>{initials(po.customer.name)}</span>
                                                <div><strong>{po.customer.name}</strong><span className="sub">{po.customer.segment_label}</span></div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${segmentBadgeClass(po.customer.segment)}`}>{po.customer.segment_label}</span></td>
                                        <td>{po.items_summary}</td>
                                        <td className="num">{formatRupiah(po.total)}</td>
                                        <td><span className={`badge ${statusBadgeClass(po.status)}`}>{po.status_label}</span></td>
                                        <td><div className="progress"><i style={{ width: `${po.progress}%` }} /></div></td>
                                        <td>{po.requested_delivery_label}</td>
                                        <td className="cell-actions">
                                            <Link className="icon-btn sm" href={route('purchase-orders.show', po.id)} aria-label="Buka PO">
                                                <Icon name="chevron-right" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {recentPos.length === 0 && (
                                    <tr><td colSpan={9}><div className="empty-state"><h3>Belum ada PO berjalan</h3></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="grid grid-3">
                    <SegmentCard segment={segments.mbg} tone="mbg" />
                    <SegmentCard segment={segments.kolam} tone="kolam" />
                    <section className="card">
                        <div className="card-head">
                            <div>
                                <h2>Aktivitas terbaru</h2>
                                <p>Interaksi yang tercatat di CRM</p>
                            </div>
                            <Link className="icon-btn sm" href={route('customers.index')} aria-label="Lihat pelanggan">
                                <Icon name="arrow-up-right" />
                            </Link>
                        </div>
                        <div className="timeline mt-2">
                            {activities.map((activity) => (
                                <div className="timeline-item" key={activity.id}>
                                    <span className={`timeline-dot ${activity.type === 'whatsapp' ? '' : activity.type === 'note' ? 'amber' : 'purple'}`}>
                                        <Icon name={activity.type === 'whatsapp' ? 'whatsapp' : activity.type === 'call' ? 'phone' : 'edit'} />
                                    </span>
                                    <div className="timeline-head"><strong>{activity.title}</strong><time>{activity.time}</time></div>
                                    <div className="timeline-body">{activity.body}</div>
                                </div>
                            ))}
                            {activities.length === 0 && <p className="text-sm muted">Belum ada aktivitas.</p>}
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function SegmentCard({ segment, tone }: { segment: any; tone: 'mbg' | 'kolam' }) {
    return (
        <div className="segment-card">
            <span className={`segment-icon ${tone}`}><Icon name={tone === 'mbg' ? 'utensils' : 'sprout'} /></span>
            <div style={{ flex: 1 }}>
                <span className="eyebrow">{segment.label}</span>
                <h3>{formatRupiah(segment.revenue)}</h3>
                <p>{segment.customers} pelanggan · {segment.repeat_rate}% repeat · AOV {formatRupiah(segment.aov)}</p>
                <div className="progress mt-2"><i style={{ width: `${Math.min(100, segment.repeat_rate + 18)}%` }} /></div>
                <div className="row-between text-xs mt-1"><span className="muted">Repeat order</span><strong>{segment.repeat_rate}%</strong></div>
                <div className="row-between text-xs mt-1"><span className="muted">Total order</span><strong>{segment.orders}</strong></div>
            </div>
        </div>
    );
}
