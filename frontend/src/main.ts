import './style.css';

import { SetIP, SetUsername, SetPassword, GetIP, GetUsername, OpenX } from '../wailsjs/go/main/App';

// ──────────────────────────────────────
// State
// ──────────────────────────────────────
type View = 'setup' | 'dashboard' | 'settings';

let currentView: View = 'setup';
let statusTimeout: ReturnType<typeof setTimeout> | null = null;

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
            <label class="form-label" for="setup-username">Username</label>
            <input
              class="form-input"
              id="setup-username"
              type="text"
              placeholder="Enter your username"
              required
            />
          </div>

          <div class="password-section">
            <div class="password-toggle-row">
              <div class="toggle-switch">
                <input type="checkbox" id="password-toggle" />
                <span class="toggle-slider"></span>
              </div>
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
                  placeholder="Enter your password"
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

  if (!ip || !username) {
    showStatus('setup-status', 'Please fill in all required fields.', 'error');
    return;
  }

  // Disable button & show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Connecting...';

  try {
    // Set IP (this pings to validate)
    await SetIP(ip);
    await SetUsername(username);
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
  try {
    ip = await GetIP();
    username = await GetUsername();
  } catch {
    // Fallback
  }

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
        <span>Connected as <strong>${escapeHtml(username)}</strong> @ <strong>${escapeHtml(ip)}</strong></span>
      </div>

      <div class="actions-grid">
        <button class="btn btn-action" id="btn-screen">
          <span class="action-icon">🖥️</span>
          <span class="action-label">Screen Share</span>
        </button>
        <button class="btn btn-action" id="btn-files">
          <span class="action-icon">📁</span>
          <span class="action-label">Open Files</span>
        </button>
      </div>

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
  try {
    ip = await GetIP();
    username = await GetUsername();
  } catch {
    // Fallback
  }

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
            <label class="form-label" for="settings-username">Username</label>
            <input
              class="form-input"
              id="settings-username"
              type="text"
              placeholder="Enter your username"
              value="${escapeHtml(username)}"
              required
            />
          </div>

          <div class="password-section">
            <div class="password-toggle-row">
              <div class="toggle-switch">
                <input type="checkbox" id="settings-password-toggle" />
                <span class="toggle-slider"></span>
              </div>
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
                  placeholder="Enter new password"
                />
              </div>
            </div>
          </div>

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

  if (!ip || !username) {
    showStatus('settings-status', 'IP and username are required.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    await SetIP(ip);
    await SetUsername(username);

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

  // Check if already configured (has an IP set)
  try {
    const existingIP = await GetIP();
    if (existingIP) {
      navigate('dashboard');
      return;
    }
  } catch {
    // Not configured yet
  }

  navigate('setup');
}

init();
