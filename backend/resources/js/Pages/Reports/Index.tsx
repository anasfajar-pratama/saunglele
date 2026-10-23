import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { formatNumber, formatRupiah, initials, segmentBadgeClass } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';

type Props = {
    kpis: any;
    monthly: any[];
    compliance: any[];
    sources: any[];
    lostReasons: any[];
    segments: any[];
    health: any;
    onTime: any;
    buyback: any;
    atRisk: any[];
};

export default function ReportsIndex({ kpis, monthly, compliance, sources, lostReasons, segments, health, onTime, buyback, atRisk }: Props) {
    const healthTotal = Math.max(1, health.aman + health.attention + health.risk);
    const amanPct = Math.round((health.aman / healthTotal) * 100);
    const attentionPct = Math.round((health.attention / healthTotal) * 100);
    const maxMonthly = Math.max(1, ...monthly.map((month) => Math.max(month.active, month.repeat)));
    const complianceMax = Math.max(100, ...compliance.map((item) => item.rate));

    return (
        <AuthenticatedLayout>
            <Head title="Laporan" />

            <div className="content">
                <div className="page-head">
                    <div>
                        <div className="breadcrumb"><span>Beranda</span><Icon name="chevron-right" /><span>Laporan</span></div>
                        <h1>Laporan</h1>
                        <p>Retensi, follow-up, pipeline, dan operasi dalam satu tampilan.</p>
                    </div>
                    <div className="page-actions">
                        <select className="select"><option>6 bulan terakhir</option><option>Bulan ini</option><option>90 hari terakhir</option></select>
                        <button className="btn btn-secondary" onClick={() => window.print()}><Icon name="download" /> Ekspor PDF</button>
                    </div>
                </div>

                <div className="report-hero">
                    <span className="kpi-icon tone-green" style={{ background: 'rgba(255,255,255,.14)', color: '#8ff0db' }}><Icon name="trending-up" /></span>
                    <div><strong>Retensi dan operasi dalam satu pandangan.</strong><span>Repeat order {kpis.repeat_rate}% · compliance {kpis.compliance_rate}% · on-time {kpis.on_time_rate}%.</span></div>
                    <Link className="btn btn-secondary btn-sm" href={route('customers.index', { health: 'berisiko' })}>Lihat pelanggan berisiko</Link>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-teal"><Icon name="refresh" /></span><span className="trend up">Retensi</span></div><div className="kpi-value">{kpis.repeat_rate}%</div><div className="kpi-label">Repeat order rate</div><div className="kpi-foot"><span>Target 70%</span></div></div>
                    <div className="kpi-card accent"><div className="kpi-top"><span className="kpi-icon tone-amber"><Icon name="calendar-check" /></span><span className="badge badge-warning">Target 95%</span></div><div className="kpi-value">{kpis.compliance_rate}%</div><div className="kpi-label">Follow-up compliance</div><div className="kpi-foot"><span>30 hari terakhir</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-red"><Icon name="alert" /></span><span className="trend up">Risiko</span></div><div className="kpi-value">{kpis.churn_rate}%</div><div className="kpi-label">Churn rate</div><div className="kpi-foot"><span>{kpis.risk_customers} pelanggan berisiko</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-blue"><Icon name="truck" /></span><span className="trend up">{kpis.on_time_count}/{kpis.delivery_count}</span></div><div className="kpi-value">{kpis.on_time_rate}%</div><div className="kpi-label">On-time delivery</div><div className="kpi-foot"><span>Pengiriman tepat waktu</span></div></div>
                    <div className="kpi-card"><div className="kpi-top"><span className="kpi-icon tone-green"><Icon name="cash" /></span><span className="trend up">Repeat</span></div><div className="kpi-value">{formatRupiah(kpis.repeat_value)}</div><div className="kpi-label">Nilai repeat order</div><div className="kpi-foot"><span>Dari pelanggan repeat</span></div></div>
                </div>

                <div className="grid grid-2-1 mb-2">
                    <section className="card">
                        <div className="card-head"><div><h2>Retensi &amp; repeat order</h2><p>6 bulan terakhir · pelanggan aktif vs repeat order</p></div><span className="badge badge-success">Tren</span></div>
                        <div className="bar-chart">
                            {monthly.map((month) => (
                                <div className="bar-col" key={month.label}>
                                    <div className="bar-pair">
                                        <span className="bar" style={{ height: `${Math.max(4, (month.active / maxMonthly) * 100)}%` }} title={`${month.active} pelanggan aktif`} />
                                        <span className="bar alt" style={{ height: `${Math.max(4, (month.repeat / maxMonthly) * 100)}%` }} title={`${month.repeat} repeat`} />
                                    </div>
                                    <span className="bar-label">{month.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="chart-legend"><span><i style={{ background: '#0e7a6b' }} /> Pelanggan aktif</span><span><i style={{ background: '#cfe3dd' }} /> Repeat order</span></div>
                    </section>

                    <section className="card">
                        <div className="card-head"><div><h2>Kesehatan pelanggan</h2><p>Skor gabungan recency, frequency, monetary, engagement</p></div><Link className="icon-btn sm" href={route('customers.index')}><Icon name="arrow-up-right" /></Link></div>
                        <div className="donut-wrap">
                            <div className="donut" style={{ background: `conic-gradient(var(--brand) 0 ${amanPct}%, var(--accent) ${amanPct}% ${amanPct + attentionPct}%, var(--red) ${amanPct + attentionPct}% 100%)` }}>
                                <div className="donut-center"><strong>{amanPct}%</strong><span>Aman</span></div>
                            </div>
                            <div className="legend">
                                <div className="legend-row"><span className="legend-dot" style={{ background: '#0e7a6b' }} /> Aman <strong>{health.aman}</strong></div>
                                <div className="legend-row"><span className="legend-dot" style={{ background: '#e9963e' }} /> Perhatian <strong>{health.attention}</strong></div>
                                <div className="legend-row"><span className="legend-dot" style={{ background: '#dc2626' }} /> Berisiko <strong>{health.risk}</strong></div>
                            </div>
                        </div>
                        <div className="card-foot"><div className="row-between text-xs"><span className="muted">Rata-rata skor</span><strong>{health.average} / 100</strong></div></div>
                    </section>
                </div>

                <div className="grid grid-3 mb-2">
                    <section className="card">
                        <div className="card-head"><div><h2>Kepatuhan follow-up</h2><p>Per sales · target 95%</p></div></div>
                        <div className="hbar-list">
                            {compliance.map((item) => (
                                <div className={`hbar ${item.rate >= 95 ? '' : item.rate >= 85 ? 'warn' : 'bad'}`} key={item.name}>
                                    <span>{item.name}</span>
                                    <div className="hbar-bar"><i style={{ width: `${(item.rate / complianceMax) * 100}%` }} /></div>
                                    <strong>{item.rate}%</strong>
                                </div>
                            ))}
                            {compliance.length === 0 && <p className="text-sm muted">Belum ada data follow-up 30 hari terakhir.</p>}
                        </div>
                    </section>

                    <section className="card">
                        <div className="card-head"><div><h2>Sumber lead &amp; konversi</h2><p>90 hari terakhir</p></div></div>
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

                    <section className="card">
                        <div className="card-head"><div><h2>Alasan kalah</h2><p>{lostReasons.reduce((sum, item) => sum + item.count, 0)} lead kalah</p></div></div>
                        <div className="hbar-list">
                            {lostReasons.map((reason) => (
                                <div className="hbar bad" key={reason.label}>
                                    <span>{reason.label}</span>
                                    <div className="hbar-bar"><i style={{ width: `${reason.percentage}%` }} /></div>
                                    <strong>{reason.percentage}%</strong>
                                </div>
                            ))}
                            {lostReasons.length === 0 && <p className="text-sm muted">Belum ada lead kalah.</p>}
                        </div>
                    </section>
                </div>

                <div className="grid grid-2-1 mb-2">
                    <section className="card">
                        <div className="card-head"><div><h2>On-time delivery</h2><p>Persentase pengiriman tepat waktu · {onTime.count} dari {onTime.total}</p></div><span className="badge badge-success">{onTime.rate}%</span></div>
                        <div className="bar-chart">
                            {monthly.map((month, index) => (
                                <div className="bar-col" key={month.label}>
                                    <span className="bar" style={{ height: `${Math.min(100, 82 + index * 2)}%` }} />
                                    <span className="bar-label">{month.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="card-foot"><div className="row-between text-xs"><span className="muted">Rata-rata cycle time PO</span><strong>{onTime.average_cycle_days} hari</strong></div></div>
                    </section>

                    <section className="card">
                        <div className="card-head"><div><h2>Performa buyback</h2><p>{buyback.active_cycles} siklus aktif</p></div><Link className="link" href={route('buybacks.index')}>Detail</Link></div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item"><span>Survival rate</span><strong>{formatNumber(buyback.average_sr, 1)}%</strong></div>
                                <div className="info-item"><span>ABW rata-rata</span><strong>{formatNumber(buyback.average_abw, 1)} g</strong></div>
                                <div className="info-item"><span>Durasi siklus</span><strong>{formatNumber(buyback.average_cycle_days, 0)} hari</strong></div>
                                <div className="info-item"><span>Settlement</span><strong>{formatRupiah(buyback.settlement_total)}</strong></div>
                            </div>
                            <div className="divider" />
                            <div className="pref-list">
                                <div className="pref-row"><span>Mitra berisiko</span><strong>{atRisk.length} pelanggan</strong></div>
                                <div className="pref-row"><span>Total settlement</span><strong>{formatRupiah(buyback.settlement_total)}</strong></div>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="card mb-2">
                    <div className="card-head"><div><h2>Performa segmen</h2><p>Revenue, pelanggan, repeat, dan risiko per segmen</p></div></div>
                    <div className="table-wrap mt-2">
                        <table className="table table-compact">
                            <thead><tr><th>Segmen</th><th className="num">Pelanggan</th><th className="num">Revenue</th><th className="num">Repeat</th><th className="num">Berisiko</th></tr></thead>
                            <tbody>
                                {segments.map((segment) => (
                                    <tr key={segment.key}>
                                        <td><span className={`badge ${segmentBadgeClass(segment.key)}`}>{segment.label}</span></td>
                                        <td className="num">{segment.customers}</td>
                                        <td className="num">{formatRupiah(segment.revenue)}</td>
                                        <td className="num">{segment.repeat_rate}%</td>
                                        <td className="num">{segment.risk}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card">
                    <div className="card-head"><div><h2>Pelanggan berisiko churn</h2><p>Prioritas win-back berdasarkan health score dan order terakhir</p></div><Link className="link" href={route('customers.index', { health: 'berisiko' })}>Lihat semua</Link></div>
                    <div className="table-wrap mt-2">
                        <table className="table table-compact">
                            <thead><tr><th>Pelanggan</th><th>Segmen</th><th>Health</th><th>Order terakhir</th><th className="num">Nilai historis</th><th>Aksi</th></tr></thead>
                            <tbody>
                                {atRisk.map((customer) => (
                                    <tr key={customer.id}>
                                        <td><div className="entity"><span className={`avatar avatar-sm ${customer.segment === 'mbg' ? 'mbg' : 'kolam'}`}>{initials(customer.name)}</span><div><strong>{customer.name}</strong><span className="sub">{customer.segment_label}</span></div></div></td>
                                        <td><span className={`badge ${segmentBadgeClass(customer.segment)}`}>{customer.segment_label}</span></td>
                                        <td><div className="health"><span className="health-bar"><i style={{ width: `${customer.health_score}%`, background: customer.health_score >= 60 ? 'var(--accent)' : 'var(--red)' }} /></span><span className="health-score">{customer.health_score}</span></div></td>
                                        <td>{customer.last_order_label}</td>
                                        <td className="num">{formatRupiah(customer.lifetime_value)}</td>
                                        <td className="cell-actions"><Link className="btn btn-amber btn-sm" href={route('customers.show', customer.id)}>Tangani</Link></td>
                                    </tr>
                                ))}
                                {atRisk.length === 0 && <tr><td colSpan={6}><div className="empty-state" style={{ padding: '20px 0' }}><h3>Tidak ada pelanggan berisiko</h3></div></td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
