// ──────────────────────────────────────
// Types
// ──────────────────────────────────────
export type View = 'setup' | 'dashboard' | 'settings' | 'portscan';

export interface PortData {
  portNum: number;
  processTitle: string;
  faviconPath: string;
  protocol: string;
}

// ──────────────────────────────────────
// State
// ──────────────────────────────────────
export let currentView: View = 'setup';
export let statusTimeout: ReturnType<typeof setTimeout> | null = null;
export let cachedIP: string = '';

export function setCurrentView(view: View) {
  currentView = view;
}

export function setStatusTimeout(timeout: ReturnType<typeof setTimeout> | null) {
  statusTimeout = timeout;
}

export function setCachedIP(ip: string) {
  cachedIP = ip;
}

// ──────────────────────────────────────
// Theme
// ──────────────────────────────────────
export function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('tether-theme') as 'dark' | 'light') || 'dark';
}

export function setTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tether-theme', theme);
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  renderThemeToggle();
}

export function renderThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────
export function showStatus(containerId: string, message: string, type: 'success' | 'error' | 'loading') {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (statusTimeout) clearTimeout(statusTimeout);

  el.innerHTML = `<div class="status-bar ${type}">${escapeHtml(message)}</div>`;

  if (type !== 'loading') {
    setStatusTimeout(setTimeout(() => {
      el.innerHTML = '';
    }, 5000));
  }
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
