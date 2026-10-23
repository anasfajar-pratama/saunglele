export function formatRupiah(value: number | string | null | undefined, compact = true): string {
    const number = Number(value ?? 0);

    if (!compact) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(number);
    }

    const abs = Math.abs(number);
    if (abs >= 1_000_000_000) {
        return `Rp ${(number / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
    }
    if (abs >= 1_000_000) {
        const digits = abs % 1_000_000 === 0 ? 0 : 2;
        return `Rp ${(number / 1_000_000).toFixed(digits).replace('.', ',')} jt`;
    }
    if (abs >= 1_000) {
        return `Rp ${(number / 1_000).toFixed(0).replace('.', ',')} rb`;
    }

    return `Rp ${new Intl.NumberFormat('id-ID').format(number)}`;
}

export function formatNumber(value: number | string | null | undefined, digits = 0): string {
    return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: digits,
    }).format(Number(value ?? 0));
}

export function formatDate(value?: string | null, withTime = false): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
}

export function statusBadgeClass(status?: string | null): string {
    return (
        {
            received: 'status-new',
            new: 'status-new',
            confirmed: 'status-confirmed',
            contacted: 'status-confirmed',
            production: 'status-production',
            sample_survey: 'status-production',
            ready: 'status-ready',
            quoted: 'status-ready',
            shipped: 'status-shipped',
            negotiation: 'status-shipped',
            delivered: 'status-done',
            completed: 'status-done',
            won: 'status-done',
            draft: 'badge-neutral',
            sent: 'status-shipped',
            accepted: 'status-done',
            rejected: 'status-late',
            expired: 'status-late',
            lost: 'status-late',
            late: 'status-late',
            cancelled: 'status-cancelled',
            scheduled: 'status-production',
            loading: 'status-ready',
            in_transit: 'status-shipped',
            growing: 'status-confirmed',
            near_harvest: 'status-ready',
            settled: 'status-done',
            harvest: 'status-done',
            unpaid: 'badge-neutral',
            partial: 'status-ready',
            paid: 'status-done',
            overdue: 'status-late',
        } as Record<string, string>
    )[status ?? ''] ?? 'badge-neutral';
}

export function segmentBadgeClass(segment?: string | null): string {
    return segment === 'mbg' ? 'badge-mbg' : segment === 'kolam' ? 'badge-kolam' : 'badge-neutral';
}

export function segmentAvatarClass(segment?: string | null): string {
    return segment === 'mbg' ? 'mbg' : segment === 'kolam' ? 'kolam' : '';
}

export function healthColor(score: number): string {
    if (score >= 80) return 'var(--green)';
    if (score >= 60) return 'var(--accent)';
    return 'var(--red)';
}

export function healthBadgeClass(score: number): string {
    if (score >= 80) return 'badge-success';
    if (score >= 60) return 'badge-warning';
    return 'badge-danger';
}

export function initials(name?: string | null): string {
    if (!name) return 'SL';

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export function whatsappUrl(phone?: string | null, message?: string | null): string {
    const cleanPhone = (phone ?? '').replace(/[^\d]/g, '').replace(/^0/, '62');
    const text = encodeURIComponent(message ?? '');

    return `https://wa.me/${cleanPhone}?text=${text}`;
}
