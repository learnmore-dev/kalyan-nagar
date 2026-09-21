import { User } from './types';

export const AUTH_STORAGE_KEY = 'trainer_monitoring_user';

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Fallback: parse cookie if available
    const match = document.cookie.match(new RegExp('(^| )trainer_user=([^;]+)'));
    if (match && match[2]) {
      const parsed = JSON.parse(decodeURIComponent(match[2]));
      return {
        id: parsed.id || 'usr_admin',
        username: parsed.username || (parsed.role === 'admin' ? 'admin' : 'trainer'),
        name: parsed.name || (parsed.role === 'admin' ? 'Institute Director' : 'Faculty Trainer'),
        email: parsed.email || (parsed.role === 'admin' ? 'admin@institute.edu' : 'trainer@institute.edu'),
        role: parsed.role || 'trainer',
        phone: parsed.phone || '+91 9876543210',
        designation: parsed.role === 'admin' ? 'Director / Management' : 'Faculty Trainer',
        created_at: new Date().toISOString(),
      };
    }
  } catch {
    // silent
  }

  // Default auto-login fallback as admin so admin dashboard opens directly
  const defaultAdminUser: User = {
    id: 'usr_admin',
    username: 'admin',
    name: 'Institute Director (Admin)',
    email: 'admin@institute.edu',
    role: 'admin',
    phone: '+91 98765 43210',
    designation: 'Director / Management',
    created_at: new Date().toISOString(),
  };
  setStoredUser(defaultAdminUser);
  return defaultAdminUser;
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  document.cookie = `trainer_user=${encodeURIComponent(JSON.stringify({ id: user.id, role: user.role, name: user.name }))}; path=/; max-age=604800`;
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = 'trainer_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
}
