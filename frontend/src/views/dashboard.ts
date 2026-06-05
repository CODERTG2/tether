import { GetIP, GetUsername, GetPassword, OpenX } from '../../wailsjs/go/main/App';
import { toggleTheme, showStatus, escapeHtml, setCachedIP } from '../state';
import { navigate } from '../router';

export async function renderDashboard(): Promise<string> {
  let ip = '';
  let username = '';
  let hasPassword = false;
  try {
    ip = await GetIP();
    setCachedIP(ip);
  } catch {
    // Fallback — config not set yet
  }
  username = await GetUsername();
  const pwd = await GetPassword();
  hasPassword = pwd.length > 0;

  return `
    <div class="bg-orbs"></div>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>

    <div class="view">
      <div class="dashboard-header">
        <div class="title-group">
          <div class="mini-logo">🔗</div>
          <h2>Tether</h2>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="btn-settings" title="Settings">⚙️</button>
        </div>
      </div>

      <div class="connection-info">
        <span class="dot"></span>
        <span>${username ? `Connected as <strong>${escapeHtml(username)}</strong> @ ` : 'Connected to '}<strong>${escapeHtml(ip)}</strong></span>
      </div>

      <div class="actions-grid">
        <button class="btn btn-action" id="btn-screen" ${!hasPassword ? 'title="macOS will prompt for password"' : ''}>
          <span class="action-icon">🖥️</span>
          <span class="action-label">Screen Share</span>
        </button>
        <button class="btn btn-action" id="btn-files" ${!hasPassword ? 'title="macOS will prompt for password"' : ''}>
          <span class="action-icon">📁</span>
          <span class="action-label">Open Files</span>
        </button>
      </div>

      <button class="btn btn-secondary" id="btn-portscan">
        <span class="action-icon">🔍</span>
        <span>Scan Ports</span>
      </button>

      <div id="dashboard-status"></div>
    </div>
  `;
}

export function attachDashboardListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    navigate('settings');
  });

  document.getElementById('btn-screen')?.addEventListener('click', async () => {
    await handleAction('screen', 'Screen Share');
  });

  document.getElementById('btn-files')?.addEventListener('click', async () => {
    await handleAction('file', 'File Browser');
  });

  document.getElementById('btn-portscan')?.addEventListener('click', () => {
    navigate('portscan');
  });
}

async function handleAction(action: string, label: string) {
  showStatus('dashboard-status', `Opening ${label}...`, 'loading');

  try {
    await OpenX(action);
    showStatus('dashboard-status', `${label} opened!`, 'success');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showStatus('dashboard-status', `Failed to open ${label}: ${message}`, 'error');
  }
}
