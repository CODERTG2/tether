import {
  GetIP, Portscan, GetPorts, DeletePort, UpdatePortTitle
} from '../../wailsjs/go/main/App';
import {
  PortData, toggleTheme, showStatus, escapeHtml,
  cachedIP, setCachedIP, renderThemeToggle
} from '../state';
import { navigate } from '../router';

// ──────────────────────────────────────
// Shell / Loading
// ──────────────────────────────────────

export function renderPortscanLoading(): string {
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

export function attachPortscanLoadingListeners(forceRescan: boolean) {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-ps-back')?.addEventListener('click', () => {
    navigate('dashboard');
  });

  if (forceRescan) {
    startPortscan();
  } else {
    loadCachedOrScan();
  }
}

// ──────────────────────────────────────
// Scan Logic
// ──────────────────────────────────────

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
    setCachedIP(ip);
    const ports: PortData[] = await Portscan(ip);

    ports.sort((a, b) => a.portNum - b.portNum);
    renderPortResults(ports);
  } catch (err: unknown) {
    const loadingEl = document.getElementById('scan-loading');
    if (loadingEl) loadingEl.style.display = 'none';

    const message = err instanceof Error ? err.message : String(err);
    showStatus('portscan-status', `Scan failed: ${message}`, 'error');
  }
}

// ──────────────────────────────────────
// Results Rendering
// ──────────────────────────────────────

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
    <div class="port-table-wrap">
      <table class="port-table">
        <thead>
          <tr>
            <th class="th-icon"></th>
            <th class="th-port">Port</th>
            <th class="th-service">Service</th>
            <th class="th-source">Source</th>
            <th class="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          ${ports.map((port, index) => renderPortRow(port, index)).join('')}
        </tbody>
      </table>
    </div>
  `;

  attachPortRowListeners(ports);
}

// ──────────────────────────────────────
// Port Row Helpers
// ──────────────────────────────────────

function getPortIcon(port: PortData): string {
  if (port.faviconPath && port.faviconPath.length > 0) {
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
    <tr class="port-row" data-port="${port.portNum}" style="animation-delay: ${index * 30}ms;">
      <td class="td-icon">
        ${getPortIcon(port)}
      </td>
      <td class="td-port">
        <span class="port-number">${port.portNum}</span>
      </td>
      <td class="td-service">
        <span class="port-title" id="port-title-${port.portNum}">${escapeHtml(port.processTitle)}</span>
        <button class="port-edit-btn" data-edit-port="${port.portNum}" title="Edit title">✏️</button>
      </td>
      <td class="td-source">
        <span class="protocol-badge ${getProtocolBadgeClass(port.protocol)}">${getProtocolLabel(port.protocol)}</span>
      </td>
      <td class="td-actions">
        <button class="port-delete-btn" data-delete-port="${port.portNum}" title="Remove port">
          <span>✕</span>
        </button>
      </td>
    </tr>
  `;
}

// ──────────────────────────────────────
// Row Interactions
// ──────────────────────────────────────

function attachPortRowListeners(ports: PortData[]) {
  document.querySelectorAll('[data-edit-port]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const portNum = parseInt((e.currentTarget as HTMLElement).getAttribute('data-edit-port')!);
      startInlineEdit(portNum, ports);
    });
  });

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
      input.value = currentTitle;
      input.blur();
    }
  });
}
