import './style.css';

import {
  SetConfig, SetPassword, DeletePassword,
  GetIP, GetUsername, GetPassword, OpenX,
  Portscan, GetPorts, DeletePort, UpdatePortTitle
} from '../wailsjs/go/main/App';

// ──────────────────────────────────────
// State
// ──────────────────────────────────────
type View = 'setup' | 'dashboard' | 'settings' | 'portscan';

let currentView: View = 'setup';
let statusTimeout: ReturnType<typeof setTimeout> | null = null;
let cachedIP: string = '';

// ──────────────────────────────────────
// Theme
// ──────────────────────────────────────
function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('tether-theme') as 'dark' | 'light') || 'dark';
}

function setTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tether-theme', theme);
}

function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  renderThemeToggle();
}

function renderThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
}

// ──────────────────────────────────────
// Router
// ──────────────────────────────────────
async function navigate(view: View) {
  currentView = view;
  const app = document.getElementById('app')!;

  switch (view) {
    case 'setup':
      app.innerHTML = renderSetup();
      attachSetupListeners();
      break;
    case 'dashboard':
      app.innerHTML = await renderDashboard();
      attachDashboardListeners();
      break;
    case 'settings':
      app.innerHTML = await renderSettings();
      attachSettingsListeners();
      break;
    case 'portscan':
      app.innerHTML = renderPortscanLoading();
      attachPortscanLoadingListeners(false);
      break;
  }

  renderThemeToggle();
}

// ──────────────────────────────────────
// Setup View
// ──────────────────────────────────────
function renderSetup(): string {
  return `
    <div class="bg-orbs"></div>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>

    <div class="view">
      <div class="card">
        <div class="logo-section">
          <div class="logo-icon">🔗</div>
          <h1>Tether</h1>
          <p>Connect to your home server</p>
        </div>

        <form id="setup-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="setup-ip">Server Address</label>
            <input
              class="form-input"
              id="setup-ip"
              type="text"
              placeholder="192.168.1.100 or myserver.local"
              required
            />
            <div class="form-hint">IPv4 address or .local hostname</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="setup-username">Username <span style="color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0;">(optional)</span></label>
            <input
              class="form-input"
              id="setup-username"
              type="text"
              placeholder="Enter your username"
            />
          </div>

          <div class="password-section">
            <div class="password-toggle-row">
              <label class="toggle-switch">
                <input type="checkbox" id="password-toggle" />
                <span class="toggle-slider"></span>
              </label>
              <label for="password-toggle">Save password</label>
            </div>

            <div id="password-area" style="display: none;">
              <div class="password-disclosure">
                <p>
                  <span class="warning-icon">⚠️</span>
                  <strong>Only recommended if you are the sole user of this computer.</strong>
                  Your password is passed directly in the connection URL, which means it can
                  appear in process listings (<code>ps</code>). If others share this machine,
                  they could see it. You can still connect without saving it — macOS will
                  prompt you each time.
                </p>
              </div>

              <div class="form-group mb-0">
                <label class="form-label" for="setup-password">Password</label>
                <input
                  class="form-input"
                  id="setup-password"
                  type="password"
                  placeholder="Enter your password (min. 4 characters)"
                />
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" id="setup-submit">
            Connect
          </button>

          <div id="setup-status"></div>
        </form>
      </div>
    </div>
  `;
}

function attachSetupListeners() {
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Password toggle
  const toggle = document.getElementById('password-toggle') as HTMLInputElement;
  const area = document.getElementById('password-area')!;
  toggle.addEventListener('change', () => {
    area.style.display = toggle.checked ? 'block' : 'none';
    if (toggle.checked) {
      area.style.animation = 'fadeIn 300ms ease-out';
    }
  });

  // Form submit
  const form = document.getElementById('setup-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSetup();
  });
}

async function handleSetup() {
  const ipInput = document.getElementById('setup-ip') as HTMLInputElement;
  const usernameInput = document.getElementById('setup-username') as HTMLInputElement;
  const passwordInput = document.getElementById('setup-password') as HTMLInputElement | null;
  const passwordToggle = document.getElementById('password-toggle') as HTMLInputElement;
  const submitBtn = document.getElementById('setup-submit') as HTMLButtonElement;

  const ip = ipInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordToggle.checked && passwordInput ? passwordInput.value : '';

  if (!ip) {
    showStatus('setup-status', 'Server address is required.', 'error');
    return;
  }

  // Disable button & show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Connecting...';

  try {
    // SetConfig validates the IP (pings it) and username, then persists to disk
    await SetConfig(ip, username);

    // Save password to macOS Keychain if provided
    if (password) {
      await SetPassword(password);
    }

    showStatus('setup-status', 'Connected successfully!', 'success');

    // Navigate to dashboard after a beat
    setTimeout(() => navigate('dashboard'), 600);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showStatus('setup-status', message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Connect';
  }
}

// ──────────────────────────────────────
// Dashboard View
// ──────────────────────────────────────
async function renderDashboard(): Promise<string> {
  let ip = '';
  let username = '';
  let hasPassword = false;
  try {
    ip = await GetIP();
    cachedIP = ip;
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

function attachDashboardListeners() {
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

// ──────────────────────────────────────
// Settings View
// ──────────────────────────────────────
async function renderSettings(): Promise<string> {
  let ip = '';
  let username = '';
  let hasPassword = false;
  try {
    ip = await GetIP();
  } catch {
    // Fallback
  }
  username = await GetUsername();
  const pwd = await GetPassword();
  hasPassword = pwd.length > 0;

  return `
    <div class="bg-orbs"></div>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>

    <div class="view">
      <div class="card">
        <div class="settings-top">
          <button class="btn-icon" id="btn-back" title="Back">←</button>
          <h2>Settings</h2>
        </div>

        <form id="settings-form" autocomplete="off">
          <div class="form-group">
            <label class="form-label" for="settings-ip">Server Address</label>
            <input
              class="form-input"
              id="settings-ip"
              type="text"
              placeholder="192.168.1.100 or myserver.local"
              value="${escapeHtml(ip)}"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="settings-username">Username <span style="color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0;">(optional)</span></label>
            <input
              class="form-input"
              id="settings-username"
              type="text"
              placeholder="Enter your username"
              value="${escapeHtml(username)}"
            />
          </div>

          <div class="password-section">
            <div class="password-toggle-row">
              <label class="toggle-switch">
                <input type="checkbox" id="settings-password-toggle" />
                <span class="toggle-slider"></span>
              </label>
              <label for="settings-password-toggle">Update password</label>
            </div>

            <div id="settings-password-area" style="display: none;">
              <div class="password-disclosure">
                <p>
                  <span class="warning-icon">⚠️</span>
                  <strong>Only recommended if you are the sole user of this computer.</strong>
                  Your password appears in process listings when connecting. If others share
                  this machine, leave this off — macOS will prompt you instead.
                </p>
              </div>

              <div class="form-group mb-0">
                <label class="form-label" for="settings-password">New Password</label>
                <input
                  class="form-input"
                  id="settings-password"
                  type="password"
                  placeholder="Enter new password (min. 4 characters)"
                />
              </div>
            </div>
          </div>

          ${hasPassword ? `
          <div class="delete-password-section">
            <button type="button" class="btn btn-danger" id="btn-delete-password">
              🗑️ Delete Saved Password
            </button>
            <div class="form-hint" style="margin-top: 8px; text-align: center;">Remove password from macOS Keychain</div>
          </div>
          ` : ''}

          <button type="submit" class="btn btn-primary" id="settings-submit">
            Save Changes
          </button>

          <div id="settings-status"></div>
        </form>
      </div>
    </div>
  `;
}

function attachSettingsListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-back')?.addEventListener('click', () => {
    navigate('dashboard');
  });

  // Password toggle
  const toggle = document.getElementById('settings-password-toggle') as HTMLInputElement;
  const area = document.getElementById('settings-password-area')!;
  toggle.addEventListener('change', () => {
    area.style.display = toggle.checked ? 'block' : 'none';
    if (toggle.checked) {
      area.style.animation = 'fadeIn 300ms ease-out';
    }
  });

  // Delete password
  document.getElementById('btn-delete-password')?.addEventListener('click', async () => {
    try {
      await DeletePassword();
      showStatus('settings-status', 'Password deleted from Keychain.', 'success');
      // Re-render settings to remove the delete button
      setTimeout(() => navigate('settings'), 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus('settings-status', message, 'error');
    }
  });

  // Form submit
  const form = document.getElementById('settings-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSettings();
  });
}

async function handleSettings() {
  const ipInput = document.getElementById('settings-ip') as HTMLInputElement;
  const usernameInput = document.getElementById('settings-username') as HTMLInputElement;
  const passwordInput = document.getElementById('settings-password') as HTMLInputElement | null;
  const passwordToggle = document.getElementById('settings-password-toggle') as HTMLInputElement;
  const submitBtn = document.getElementById('settings-submit') as HTMLButtonElement;

  const ip = ipInput.value.trim();
  const username = usernameInput.value.trim();

  if (!ip) {
    showStatus('settings-status', 'Server address is required.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    // SetConfig validates and persists IP + username to config file
    await SetConfig(ip, username);

    // Save password to macOS Keychain if toggled on
    if (passwordToggle.checked && passwordInput) {
      await SetPassword(passwordInput.value);
    }

    showStatus('settings-status', 'Settings saved!', 'success');

    setTimeout(() => navigate('dashboard'), 600);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showStatus('settings-status', message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Changes';
  }
}

// ──────────────────────────────────────
// Port Scan View
// ──────────────────────────────────────

interface PortData {
  portNum: number;
  processTitle: string;
  faviconPath: string;
  protocol: string;
}

function renderPortscanLoading(): string {
  return `
    <div class="bg-orbs"></div>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>

    <div class="view view-wide">
      <div class="portscan-header">
        <div class="title-group">
          <button class="btn-icon" id="btn-ps-back" title="Back">←</button>
          <h2>Port Scanner</h2>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="btn-ps-refresh" title="Refresh" disabled>🔄</button>
        </div>
      </div>

      <div class="scan-loading-container" id="scan-loading">
        <div class="radar-container">
          <div class="radar-ring radar-ring-1"></div>
          <div class="radar-ring radar-ring-2"></div>
          <div class="radar-ring radar-ring-3"></div>
          <div class="radar-dot">🔍</div>
        </div>
        <div class="scan-loading-text">
          <h3>Scanning all 65,535 ports...</h3>
          <p>This may take a moment</p>
        </div>
      </div>

      <div id="portscan-results" style="display: none;"></div>
      <div id="portscan-status"></div>
    </div>
  `;
}

function attachPortscanLoadingListeners(forceRescan: boolean) {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-ps-back')?.addEventListener('click', () => {
    navigate('dashboard');
  });

  if (forceRescan) {
    // User clicked refresh — always do a fresh scan
    startPortscan();
  } else {
    // Try loading cached ports first
    loadCachedOrScan();
  }
}

async function loadCachedOrScan() {
  try {
    const cached: PortData[] = await GetPorts();
    if (cached && cached.length > 0) {
      cached.sort((a, b) => a.portNum - b.portNum);
      renderPortResults(cached);
      return;
    }
  } catch {
    // No cached ports — fall through to scan
  }
  startPortscan();
}

async function startPortscan() {
  try {
    const ip = cachedIP || await GetIP();
    cachedIP = ip;
    const ports: PortData[] = await Portscan(ip);

    // Sort by port number
    ports.sort((a, b) => a.portNum - b.portNum);

    renderPortResults(ports);
  } catch (err: unknown) {
    const loadingEl = document.getElementById('scan-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    const message = err instanceof Error ? err.message : String(err);
    showStatus('portscan-status', `Scan failed: ${message}`, 'error');
  }
}

function renderPortResults(ports: PortData[]) {
  const loadingEl = document.getElementById('scan-loading');
  if (loadingEl) loadingEl.style.display = 'none';

  const resultsEl = document.getElementById('portscan-results');
  if (!resultsEl) return;

  // Enable refresh button
  const refreshBtn = document.getElementById('btn-ps-refresh');
  if (refreshBtn) {
    refreshBtn.removeAttribute('disabled');
    refreshBtn.addEventListener('click', () => {
      const app = document.getElementById('app')!;
      app.innerHTML = renderPortscanLoading();
      attachPortscanLoadingListeners(true);
      renderThemeToggle();
    });
  }

  if (ports.length === 0) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📡</div>
        <h3>No open ports found</h3>
        <p>The server didn't respond on any ports. Make sure it's online and reachable.</p>
      </div>
    `;
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `
    <div class="port-summary">
      <span class="port-count">${ports.length}</span> open port${ports.length !== 1 ? 's' : ''} found on <strong>${escapeHtml(cachedIP)}</strong>
    </div>
    <div class="port-list">
      ${ports.map((port, index) => renderPortRow(port, index)).join('')}
    </div>
  `;

  // Attach row listeners
  attachPortRowListeners(ports);
}

function getPortIcon(port: PortData): string {
  if (port.faviconPath && port.faviconPath.length > 0) {
    // Build full favicon URL
    let faviconUrl = port.faviconPath;
    if (faviconUrl.startsWith('/')) {
      faviconUrl = `http://${cachedIP}:${port.portNum}${faviconUrl}`;
    } else if (!faviconUrl.startsWith('http')) {
      faviconUrl = `http://${cachedIP}:${port.portNum}/${faviconUrl}`;
    }
    return `<img class="port-favicon" src="${escapeHtml(faviconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span class="port-emoji-fallback" style="display:none;">🌐</span>`;
  }

  if (port.protocol === 'http') return '<span class="port-emoji">🌐</span>';
  if (port.protocol === 'banner') return '<span class="port-emoji">📡</span>';
  if (port.processTitle === 'Unknown') return '<span class="port-emoji">❓</span>';

  // Map protocol — known services
  return '<span class="port-emoji">⚙️</span>';
}

function getProtocolBadgeClass(protocol: string): string {
  switch (protocol) {
    case 'http': return 'badge-http';
    case 'banner': return 'badge-banner';
    case 'map': return 'badge-map';
    default: return 'badge-map';
  }
}

function getProtocolLabel(protocol: string): string {
  switch (protocol) {
    case 'http': return 'HTTP';
    case 'banner': return 'Banner';
    case 'map': return 'Known';
    default: return protocol;
  }
}

function renderPortRow(port: PortData, index: number): string {
  return `
    <div class="port-row" data-port="${port.portNum}" style="animation-delay: ${index * 30}ms;">
      <div class="port-icon-cell">
        ${getPortIcon(port)}
      </div>
      <div class="port-info-cell">
        <div class="port-title-row">
          <span class="port-title" id="port-title-${port.portNum}">${escapeHtml(port.processTitle)}</span>
          <button class="port-edit-btn" data-edit-port="${port.portNum}" title="Edit title">✏️</button>
        </div>
        <div class="port-meta">
          <span class="port-number">:${port.portNum}</span>
          <span class="protocol-badge ${getProtocolBadgeClass(port.protocol)}">${getProtocolLabel(port.protocol)}</span>
        </div>
      </div>
      <div class="port-actions-cell">
        <button class="port-delete-btn" data-delete-port="${port.portNum}" title="Remove port">
          <span>✕</span>
        </button>
      </div>
    </div>
  `;
}

function attachPortRowListeners(ports: PortData[]) {
  // Edit buttons
  document.querySelectorAll('[data-edit-port]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const portNum = parseInt((e.currentTarget as HTMLElement).getAttribute('data-edit-port')!);
      startInlineEdit(portNum, ports);
    });
  });

  // Delete buttons
  document.querySelectorAll('[data-delete-port]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const portNum = parseInt((e.currentTarget as HTMLElement).getAttribute('data-delete-port')!);
      const row = document.querySelector(`.port-row[data-port="${portNum}"]`) as HTMLElement;

      if (row) {
        row.classList.add('port-row-removing');
        await new Promise(r => setTimeout(r, 300));
      }

      try {
        const updated: PortData[] = await DeletePort(portNum);
        updated.sort((a, b) => a.portNum - b.portNum);
        renderPortResults(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus('portscan-status', message, 'error');
      }
    });
  });
}

function startInlineEdit(portNum: number, ports: PortData[]) {
  const titleEl = document.getElementById(`port-title-${portNum}`);
  const editBtn = document.querySelector(`[data-edit-port="${portNum}"]`) as HTMLElement;
  if (!titleEl) return;

  const currentTitle = ports.find(p => p.portNum === portNum)?.processTitle || '';

  // Replace title span with an input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'port-edit-input';
  input.value = currentTitle;
  input.id = `port-edit-input-${portNum}`;

  titleEl.replaceWith(input);
  if (editBtn) editBtn.style.display = 'none';
  input.focus();
  input.select();

  const save = async () => {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== currentTitle) {
      try {
        const updated: PortData[] = await UpdatePortTitle(portNum, newTitle);
        updated.sort((a, b) => a.portNum - b.portNum);
        renderPortResults(updated);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus('portscan-status', message, 'error');
      }
    } else {
      // Restore original title
      const span = document.createElement('span');
      span.className = 'port-title';
      span.id = `port-title-${portNum}`;
      span.textContent = currentTitle;
      input.replaceWith(span);
      if (editBtn) editBtn.style.display = '';
    }
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      input.value = currentTitle; // Reset value so save() restores
      input.blur();
    }
  });
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────
function showStatus(containerId: string, message: string, type: 'success' | 'error' | 'loading') {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (statusTimeout) clearTimeout(statusTimeout);

  el.innerHTML = `<div class="status-bar ${type}">${escapeHtml(message)}</div>`;

  if (type !== 'loading') {
    statusTimeout = setTimeout(() => {
      el.innerHTML = '';
    }, 5000);
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ──────────────────────────────────────
// Init
// ──────────────────────────────────────
async function init() {
  setTheme(getTheme());

  // Check if already configured (has a config file with an IP set)
  try {
    const existingIP = await GetIP();
    if (existingIP) {
      cachedIP = existingIP;
      navigate('dashboard');
      return;
    }
  } catch {
    // Not configured yet
  }

  navigate('setup');
}

init();
