export interface AuthRoleUser {
    role?: string | null;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_admin?: boolean;
}

const USER_AVATAR_PALETTES = [
    { bg: '#DCECE5', text: '#004635' }, // forest green
    { bg: '#E5F0FA', text: '#1D6FA5' }, // sky blue
    { bg: '#FFDBBC', text: '#8F4A00' }, // warm amber
    { bg: '#ECE9FC', text: '#5A52B5' }, // indigo
    { bg: '#FFDBCF', text: '#974722' }, // terracotta
    { bg: '#E2F4EE', text: '#007A63' }, // teal
    { bg: '#FCE4EC', text: '#9C2758' }, // rose
    { bg: '#FFF3CD', text: '#7A5800' }, // ochre
    { bg: '#E3F2FD', text: '#155E92' }, // cerulean
    { bg: '#EDE7F6', text: '#4A2C82' }, // plum
];

function hashKey(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function isAdminUser(user: AuthRoleUser | null | undefined): boolean {
    if (!user) return false;
    if (user.is_admin || user.is_staff || user.is_superuser) return true;
    const normalized = (user.role || '').trim().toLowerCase();
    return (
        normalized === 'admin' ||
        normalized === 'super_admin' ||
        normalized === 'superadmin'
    );
}

export function getUserAvatarPalette(key?: string | number | null): {
    bg: string;
    text: string;
} {
    const normalized = String(key ?? '').trim().toLowerCase();
    if (!normalized) {
        return USER_AVATAR_PALETTES[0];
    }
    const index = hashKey(normalized) % USER_AVATAR_PALETTES.length;
    return USER_AVATAR_PALETTES[index];
}