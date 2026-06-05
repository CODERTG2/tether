import {
  SetConfig, SetPassword, DeletePassword,
  GetIP, GetUsername, GetPassword
} from '../../wailsjs/go/main/App';
import { toggleTheme, showStatus, escapeHtml } from '../state';
import { navigate } from '../router';

export async function renderSettings(): Promise<string> {
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

export function attachSettingsListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-back')?.addEventListener('click', () => {
    navigate('dashboard');
  });

  const toggle = document.getElementById('settings-password-toggle') as HTMLInputElement;
  const area = document.getElementById('settings-password-area')!;
  toggle.addEventListener('change', () => {
    area.style.display = toggle.checked ? 'block' : 'none';
    if (toggle.checked) {
      area.style.animation = 'fadeIn 300ms ease-out';
    }
  });

  document.getElementById('btn-delete-password')?.addEventListener('click', async () => {
    try {
      await DeletePassword();
      showStatus('settings-status', 'Password deleted from Keychain.', 'success');
      setTimeout(() => navigate('settings'), 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showStatus('settings-status', message, 'error');
    }
  });

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
    await SetConfig(ip, username);

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
