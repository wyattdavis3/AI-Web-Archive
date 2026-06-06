import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

export interface PageData {
  url: string;
  title: string;
  html: string;
}

export interface ReadableArticle {
  title: string;
  content: string;
  byline: string | null;
  dir: string | null;
  excerpt: string | null;
  length: number;
  siteName: string | null;
}

export interface CaptureReport {
  url: string;
  title: string;
  captureTime: string;
  originalWordCount: number;
  exportedWordCount: number;
  retentionRate: number;
  hasContentLoss: boolean;
  imageCount: number;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export class ContentCapturer {
  capturePage(): PageData {
    return {
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML
    };
  }

  // ============ 第1层：Raw HTML ============
  // 保守策略：只删除明显无用的，保留所有正文
  exportToRawHTML(pageData: PageData): string {
    const rawClone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // 只删除这些明显的无用元素
    const removeOnly = ['script', 'style', 'noscript', 'iframe', 'object', 'embed'];
    removeOnly.forEach(selector => {
      try {
        rawClone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {}
    });

    // 尝试找到主要内容区域（如果找不到就用 body）
    const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.post', '.article'];
    let rawContent = (rawClone as any).body;
    for (const selector of contentSelectors) {
      const found = rawClone.querySelector(selector);
      if (found) {
        rawContent = found;
        break;
      }
    }

    // Raw HTML - 保留完整结构，只清理无用标签
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(document.title)}</title>
</head>
<body>
  <div class="meta">
    <h1>${escapeHtml(document.title)}</h1>
    <p>Source: ${pageData.url}</p>
    <p>Captured: ${new Date().toLocaleString()}</p>
  </div>
  ${rawContent.innerHTML}
</body>
</html>`;
  }

  // ============ 第2层：AI Markdown ============
  // Readability → Turndown，有 fallback
  exportToMarkdown(pageData: PageData, originalText: string): string {
    try {
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      let contentHtml = '';
      if (article && article.content && article.content.length > 100) {
        contentHtml = article.content;
      } else {
        // Readability 结果不好，fallback 到原始 body
        contentHtml = document.body.innerHTML;
      }

      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
      });
      const content = turndown.turndown(contentHtml);

      return `# ${document.title}

**Source:** ${pageData.url}
**Captured:** ${new Date().toLocaleString()}

---

${content}`;
    } catch (e) {
      // 出错时，fallback 到简单的文本
      return `# ${document.title}

**Source:** ${pageData.url}
**Captured:** ${new Date().toLocaleString()}

---

${originalText}`;
    }
  }

  // ============ 第3层：Plain TXT ============
  // 最保守，直接提取可见文本
  exportToText(pageData: PageData, originalText: string): string {
    return `${document.title}

Source: ${pageData.url}
Captured: ${new Date().toLocaleString()}

---

${originalText.replace(/\n{3,}/g, '\n\n').trim()}`;
  }

  generateCaptureReport(pageData: PageData, originalText: string, exportedText: string): CaptureReport {
    const originalWordCount = originalText.split(/\s+/).filter((w: string) => w.length > 0).length;
    const exportedWordCount = exportedText.split(/\s+/).filter((w: string) => w.length > 0).length;
    const retentionRate = originalWordCount > 0 ? Math.round((exportedWordCount / originalWordCount) * 100) : 100;
    const hasContentLoss = retentionRate < 80;
    const imageCount = document.body.querySelectorAll('img').length;

    return {
      url: pageData.url,
      title: pageData.title,
      captureTime: new Date().toISOString(),
      originalWordCount,
      exportedWordCount,
      retentionRate,
      hasContentLoss,
      imageCount
    };
  }
}

const capturer = new ContentCapturer();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'capture') {
    try {
      const pageData = capturer.capturePage();
      
      // 获取原始可见文本
      const originalText = document.body.innerText || document.body.textContent || '';
      
      // 导出
      const html = capturer.exportToRawHTML(pageData);
      const markdown = capturer.exportToMarkdown(pageData, originalText);
      const text = capturer.exportToText(pageData, originalText);
      
      // 报告（用 text 计算保留率）
      const report = capturer.generateCaptureReport(pageData, originalText, text);

      sendResponse({
        success: true,
        data: {
          pageData,
          article: {
            title: document.title,
            content: document.body.innerHTML,
            byline: null,
            dir: null,
            excerpt: null,
            length: originalText.length,
            siteName: null
          },
          report,
          html,
          markdown,
          text
        }
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  return true;
});
