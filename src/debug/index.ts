import { logger, LogEntry } from '../utils/logger';

// 检测是否在 Chrome 扩展环境中
const isExtensionEnvironment = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
};

function showNotification(message: string): void {
  const existing = document.querySelector('.copy-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('✅ Copied to clipboard!');
  } catch (error) {
    showNotification('❌ Failed to copy');
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderLogs(logs: LogEntry[]): void {
  const container = document.getElementById('logsContainer');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<p style="color: #64748b;">No logs yet</p>';
    return;
  }

  container.innerHTML = logs.slice(0, 50).map(log => {
    const levelClass = `log-${log.level}`;
    return `
      <div class="log-entry">
        <span class="log-time">${new Date(log.time).toLocaleString()}</span>
        <span class="${levelClass}">${log.level.toUpperCase()}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `;
  }).join('');
}

function updateUI(): void {
  const inExtensionEnv = isExtensionEnvironment();
  const manifest = inExtensionEnv ? chrome.runtime.getManifest() : null;
  const logs = logger.getLogs();
  const errors = logger.getLogsByLevel('error');
  const lastError = logger.getLastError();

  const logCountEl = document.getElementById('logCount');
  if (logCountEl) logCountEl.textContent = logs.length.toString();

  const errorCountEl = document.getElementById('errorCount');
  if (errorCountEl) errorCountEl.textContent = errors.length.toString();

  const appVersionEl = document.getElementById('appVersion');
  if (appVersionEl) appVersionEl.textContent = manifest?.version || '1.0.0';

  const chromeVersionEl = document.getElementById('chromeVersion');
  if (chromeVersionEl) {
    const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    chromeVersionEl.textContent = chromeMatch?.[1] || 'Unknown';
  }

  const manifestVersionEl = document.getElementById('manifestVersion');
  if (manifestVersionEl) manifestVersionEl.textContent = manifest?.manifest_version?.toString() || '3';

  const statusBadge = document.getElementById('statusBadge');
  if (statusBadge) {
    if (errors.length > 0) {
      statusBadge.textContent = 'Errors';
      statusBadge.className = 'status-badge status-error';
    } else {
      statusBadge.textContent = 'OK';
      statusBadge.className = 'status-badge status-ok';
    }
  }

  const lastErrorContainer = document.getElementById('lastErrorContainer');
  if (lastErrorContainer) {
    if (lastError) {
      lastErrorContainer.innerHTML = `
        <div class="error-box">
          <div class="error-title">${new Date(lastError.time).toLocaleString()}</div>
          <div class="error-message">${lastError.message}</div>
        </div>
      `;
    } else {
      lastErrorContainer.innerHTML = '<p style="color: #64748b; font-size: 14px;">No recent errors</p>';
    }
  }

  renderLogs(logs);
}

function setupEventListeners(): void {
  document.getElementById('btnCopyDiagnostic')?.addEventListener('click', () => {
    const report = logger.generateDiagnosticReport();
    copyToClipboard(JSON.stringify(report, null, 2));
  });

  document.getElementById('btnGenerateAIReport')?.addEventListener('click', () => {
    const report = logger.generateAIDiagnosticReport();
    copyToClipboard(report);
  });

  document.getElementById('btnExportLogs')?.addEventListener('click', () => {
    const report = logger.exportToJSON();
    downloadFile(report, 'debug-report.json', 'application/json');
    showNotification('✅ Logs exported!');
  });

  document.getElementById('btnClearLogs')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      logger.clear();
      updateUI();
      showNotification('✅ Logs cleared!');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  logger.log('Debug Center loaded');
  setupEventListeners();
  updateUI();
});
