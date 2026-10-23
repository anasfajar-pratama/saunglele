import Icon from '@/Components/Icon';
import UserAvatar from '@/Components/UserAvatar';
import { Link, router, usePage } from '@inertiajs/react';
import { FormEvent, PropsWithChildren, ReactNode, useEffect, useState } from 'react';

type SharedProps = {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
    navCounts: {
        customers: number;
        leads: number;
        pos: number;
        buybacks: number;
        followups_today: number;
        followups_overdue: number;
    };
    flash: {
        success?: string;
        error?: string;
    };
    todayLabel: string;
};

type NavItem = {
    label: string;
    icon: string;
    href: string;
    active: string;
    badgeKey?: string;
};

const NAV: { label: string; items: NavItem[] }[] = [
    {
        label: 'Utama',
        items: [{ label: 'Dashboard', icon: 'dashboard', href: '/dashboard', active: 'dashboard' }],
    },
    {
        label: 'Pelanggan',
        items: [
            { label: 'Pelanggan', icon: 'users', href: '/customers', active: 'customers', badgeKey: 'customers' },
            { label: 'Pipeline Lead', icon: 'target', href: '/leads', active: 'leads', badgeKey: 'leads' },
        ],
    },
    {
        label: 'Komunikasi',
        items: [{ label: 'Template Pesan', icon: 'message', href: '/templates', active: 'templates' }],
    },
    {
        label: 'Penjualan',
        items: [
            { label: 'Quotation', icon: 'file', href: '/quotations', active: 'quotations' },
            { label: 'Pesanan (PO)', icon: 'package', href: '/purchase-orders', active: 'purchase-orders', badgeKey: 'pos' },
        ],
    },
    {
        label: 'Kemitraan',
        items: [{ label: 'Buyback Panen', icon: 'refresh', href: '/buybacks', active: 'buybacks', badgeKey: 'buybacks' }],
    },
    {
        label: 'Analitik',
        items: [{ label: 'Laporan', icon: 'chart', href: '/reports', active: 'reports' }],
    },
];

const ROLE_LABELS: Record<string, string> = {
    owner: 'Pemilik',
    sales: 'Sales',
    admin: 'Admin Operasional',
    production: 'Produksi',
    finance: 'Keuangan',
};

function isActive(path: string, key: string): boolean {
    if (key === 'dashboard') {
        return path === '/dashboard' || path === '/';
    }

    return path.startsWith(`/${key}`);
}

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const page = usePage<SharedProps>();
    const user = page.props.auth?.user;
    const counts = page.props.navCounts;
    const flash = page.props.flash;
    const path = page.url.split('?')[0];
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setToast({ message: flash.success, error: false });
        } else if (flash?.error) {
            setToast({ message: flash.error, error: true });
        }
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    function submitSearch(event: FormEvent) {
        event.preventDefault();
        router.get('/customers', { q: search }, { preserveState: true });
    }

    return (
        <div className="app">
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="brand">
                    <span className="brand-mark">
                        <Icon name="fish" />
                    </span>
                    <div>
                        <span className="brand-name">Saung Lele</span>
                        <span className="brand-sub">CRM Ternak &amp; Jual Beli</span>
                    </div>
                </div>

                <div className="workspace">
                    <span className="workspace-dot" />
                    <div>
                        <strong>Saung Lele</strong>
                        <span>Cabang Utama · Semarang</span>
                    </div>
                    <Icon name="chevron-down" />
                </div>

                {NAV.map((section) => (
                    <div className="nav-section" key={section.label}>
                        <div className="nav-label">{section.label}</div>
                        {section.items.map((item) => {
                            const badge = item.badgeKey ? counts?.[item.badgeKey as keyof typeof counts] : null;
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`nav-item ${isActive(path, item.active) ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon name={item.icon} />
                                    <span>{item.label}</span>
                                    {badge !== null && badge !== undefined && <span className="nav-badge">{badge}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}

                <div className="sidebar-foot">
                    <div className="sidebar-card">
                        <span className="sidebar-card-icon">
                            <Icon name="clock" />
                        </span>
                        <div>
                            <strong>{counts?.followups_today ?? 0} follow-up hari ini</strong>
                            <span>{counts?.followups_overdue ?? 0} sudah terlambat</span>
                            <Link href="/dashboard#followups">Lihat antrean</Link>
                        </div>
                    </div>

                    <div className="sidebar-user">
                        <UserAvatar user={user} size="sm" />
                        <div>
                            <strong>{user?.name ?? 'Saung Lele'}</strong>
                            <span>{ROLE_LABELS[user?.role ?? ''] ?? 'Pengguna'}</span>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="sidebar-logout"
                            title="Keluar"
                            aria-label="Keluar"
                        >
                            <Icon name="logout" />
                        </Link>
                    </div>
                </div>
            </aside>

            {sidebarOpen && <div className="sidebar-backdrop show" onClick={() => setSidebarOpen(false)} />}

            <main className="main">
                <header className="topbar">
                    <button
                        className="icon-btn mobile-menu"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Buka menu"
                    >
                        <Icon name="menu" />
                    </button>

                    <form className="topbar-search" onSubmit={submitSearch}>
                        <Icon name="search" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari pelanggan, PO, atau quotation..."
                            aria-label="Pencarian global"
                        />
                    </form>

                    <div className="topbar-actions">
                        <span className="topbar-date">
                            <Icon name="calendar" />
                            {page.props.todayLabel}
                        </span>
                        <button className="icon-btn has-dot" aria-label="Notifikasi">
                            <Icon name="bell" />
                        </button>
                        <div className="user-chip">
                            <UserAvatar user={user} size="sm" />
                            <div>
                                <strong>{user?.name ?? 'Saung Lele'}</strong>
                                <span>{ROLE_LABELS[user?.role ?? ''] ?? 'Pengguna'}</span>
                            </div>
                            <Link href="/profile" className="icon-btn sm" aria-label="Profil">
                                <Icon name="settings" />
                            </Link>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="icon-btn sm logout-btn"
                                title="Keluar"
                                aria-label="Keluar"
                            >
                                <Icon name="logout" />
                            </Link>
                        </div>
                    </div>
                </header>

                {header && (
                    <div className="content" style={{ paddingBottom: 0 }}>
                        <div className="page-head">
                            <div>
                                <h1>{header}</h1>
                            </div>
                        </div>
                    </div>
                )}

                {children}
            </main>

            {toast && (
                <div className={`toast ${toast ? 'show' : ''}`}>
                    <Icon name={toast.error ? 'alert-circle' : 'check-circle'} />
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
