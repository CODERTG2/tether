import { SetConfig, SetPassword } from '../../wailsjs/go/main/App';
import { toggleTheme, showStatus, escapeHtml } from '../state';
import { navigate } from '../router';

export function renderSetup(): string {
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

export function attachSetupListeners() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  const toggle = document.getElementById('password-toggle') as HTMLInputElement;
  const area = document.getElementById('password-area')!;
  toggle.addEventListener('change', () => {
    area.style.display = toggle.checked ? 'block' : 'none';
    if (toggle.checked) {
      area.style.animation = 'fadeIn 300ms ease-out';
    }
  });

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

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Connecting...';

  try {
    await SetConfig(ip, username);

    if (password) {
      await SetPassword(password);
    }

    showStatus('setup-status', 'Connected successfully!', 'success');
    setTimeout(() => navigate('dashboard'), 600);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showStatus('setup-status', message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Connect';
  }
}
