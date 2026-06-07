import { logger } from '../utils/logger';

interface CaptureData {
  pageData: {
    url: string;
    title: string;
    html: string;
  };
  article: {
    title: string;
    content: string;
    byline: string | null;
    dir: string | null;
    excerpt: string | null;
    length: number;
    siteName: string | null;
  };
  report: {
    url: string;
    title: string;
    captureTime: string;
    originalWordCount: number;
    exportedWordCount: number;
    retentionRate: number;
    hasContentLoss: boolean;
    imageCount: number;
  };
  html: string;
  markdown: string;
  text: string;
}

let captureData: CaptureData | null = null; // Stored for potential future use

function setupGlobalErrorHandlers(): void {
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Global error', {
      message: String(message),
      source,
      lineno,
      colno,
      stack: error?.stack
    });
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: String(event.reason),
      stack: (event.reason as Error)?.stack
    });
  });
}

function renderLoading() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">Capturing page...</div>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      <button id="btn-debug-center" style="color: #64748b; background: none; border: none; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
        🔧 Debug Center
      </button>
    </div>
  `;

  // 添加 Debug Center 按钮事件
  document.getElementById('btn-debug-center')?.addEventListener('click', openDebugCenter);
}

function renderContent(data: CaptureData) {
  const app = document.getElementById('app');
  if (!app) return;

  // 构建警告信息（如果有内容丢失）
  const warningHtml = data.report.hasContentLoss ? `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
      ⚠️ 可能丢失内容：导出保留率 ${data.report.retentionRate}%
    </div>
  ` : '';

  app.innerHTML = `
    <div class="header">
      <h1>AI Web Archive</h1>
      <p>Turn any webpage into AI-ready formats</p>
    </div>
    
    ${warningHtml}
    
    <div class="info-card">
      <div class="info-title">Title</div>
      <div class="info-value">${escapeHtml(data.report.title)}</div>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">${data.report.originalWordCount}</div>
          <div class="stat-label">words</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.report.retentionRate}%</div>
          <div class="stat-label">retention</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.report.imageCount}</div>
          <div class="stat-label">images</div>
        </div>
      </div>
    </div>
    
    <div class="buttons">
      <button class="btn btn-html" id="btn-html">HTML</button>
      <button class="btn btn-markdown" id="btn-markdown">Markdown</button>
      <button class="btn btn-txt" id="btn-txt">TXT</button>
      <button class="btn btn-all" id="btn-all">Download All</button>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      <button id="btn-debug-center" style="color: #64748b; background: none; border: none; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
        🔧 Debug Center
      </button>
    </div>
  `;

  // 添加 Debug Center 按钮事件
  document.getElementById('btn-debug-center')?.addEventListener('click', openDebugCenter);

  document.getElementById('btn-html')?.addEventListener('click', () => downloadHTML(data));
  document.getElementById('btn-markdown')?.addEventListener('click', () => downloadMarkdown(data));
  document.getElementById('btn-txt')?.addEventListener('click', () => downloadText(data));
  document.getElementById('btn-all')?.addEventListener('click', () => downloadAll(data));
}

function renderError(error: string) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="header">
      <h1>AI Web Archive</h1>
      <p>Turn any webpage into AI-ready formats</p>
    </div>
    
    <div class="info-card">
      <div class="info-title">Error</div>
      <div class="info-value" style="color: #ef4444;">${escapeHtml(error)}</div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      <button id="btn-debug-center" style="color: #ef4444; background: none; border: none; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; width: 100%;">
        🔧 Open Debug Center
      </button>
    </div>
  `;

  // 添加 Debug Center 按钮事件
  document.getElementById('btn-debug-center')?.addEventListener('click', openDebugCenter);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getSafeFilename(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50) || 'article';
}

function downloadHTML(data: CaptureData) {
  const filename = `${getSafeFilename(data.report.title)}.html`;
  downloadFile(data.html, filename, 'text/html');
}

function downloadMarkdown(data: CaptureData) {
  const filename = `${getSafeFilename(data.report.title)}.md`;
  downloadFile(data.markdown, filename, 'text/markdown');
}

function downloadText(data: CaptureData) {
  const filename = `${getSafeFilename(data.report.title)}.txt`;
  downloadFile(data.text, filename, 'text/plain');
}

function downloadJSON(data: CaptureData) {
  const filename = `${getSafeFilename(data.report.title)}-report.json`;
  downloadFile(JSON.stringify(data.report, null, 2), filename, 'application/json');
}

function downloadAll(data: CaptureData) {
  downloadHTML(data);
  setTimeout(() => downloadMarkdown(data), 200);
  setTimeout(() => downloadText(data), 400);
  setTimeout(() => downloadJSON(data), 600);
}

function downloadFile(content: string, filename: string, mimeType: string) {
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

async function capturePage() {
  logger.log('Starting page capture');
  renderLoading();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    logger.log('Active tab found', { tabId: tab.id, url: tab.url });

    if (!tab.id) {
      logger.error('No active tab found');
      renderError('No active tab found');
      return;
    }

    // 检查页面是否是允许的 URL
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('about:')) {
      logger.warn('Cannot capture restricted page type', { url: tab.url });
      renderError('Cannot capture this page type');
      return;
    }

    let response;
    try {
      logger.log('Sending capture message to content script');
      response = await chrome.tabs.sendMessage(tab.id, { action: 'capture' });
    } catch (sendError) {
      logger.warn('Content script not found, injecting it now', { error: sendError });
      // Content script 未找到，先注入它
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // 等待一下然后再发送消息
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.log('Content script injected, retrying capture');
      response = await chrome.tabs.sendMessage(tab.id, { action: 'capture' });
    }

    logger.log('Got result from content script', { hasResult: !!response });

    if (response && response.success && response.data) {
      logger.log('Capture successful', {
        title: response.data.report.title,
        originalWordCount: response.data.report.originalWordCount,
        imageCount: response.data.report.imageCount
      });
      captureData = response.data;
      renderContent(response.data);
    } else {
      logger.error('Capture failed', { error: response?.error });
      renderError(response?.error || 'Failed to capture page');
    }
  } catch (error) {
    logger.error('Capture failed with exception', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    renderError(error instanceof Error ? error.message : 'Failed to communicate with page');
  }
}

// 打开 Debug Center（在新标签页中）
function openDebugCenter() {
  // 获取当前扩展的 ID，构建 Debug Center 的完整 URL
  const debugUrl = chrome.runtime.getURL('debug.html');
  
  // 在新标签页中打开 Debug Center
  chrome.tabs.create({ url: debugUrl });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalErrorHandlers();
  logger.log('AI Web Archive loaded');
  capturePage();
});
