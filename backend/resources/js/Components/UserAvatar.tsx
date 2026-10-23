import Icon from '@/Components/Icon';

type Props = {
    user?: {
        name?: string;
        role?: string;
    } | null;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
};

const ROLE_TONES: Record<string, string> = {
    owner: 'owner',
    sales: 'sales',
    admin: 'admin',
    production: 'production',
    finance: 'finance',
};

export default function UserAvatar({ user, size = 'sm', className = '' }: Props) {
    const sizeClass = size === 'xs' ? 'avatar-xs' : size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
    const tone = ROLE_TONES[user?.role ?? ''] ?? 'sales';

    return (
        <span
            className={`avatar ${sizeClass} ${tone} ${className}`.trim()}
            title={user?.name ?? 'Pengguna'}
            aria-label={user?.name ?? 'Pengguna'}
        >
            <Icon name="user" />
        </span>
    );
}
