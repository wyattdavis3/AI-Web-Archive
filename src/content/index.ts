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
  // 保守策略：保留完整 DOM，只删除 script 等执行性元素
  async exportToRawHTML(pageData: PageData): Promise<string> {
    // 深拷贝整个 document
    const rawClone = document.documentElement.cloneNode(true) as HTMLElement;

    // P0: 删除这些执行性/嵌入式元素和无用资源
    const removeSelectors = [
      // 执行性元素
      'script',
      'noscript',
      'iframe',
      'object',
      'embed',
      // 性能优化类 link
      'link[rel="modulepreload"]',
      'link[rel="preconnect"]',
      'link[rel="preload"]',
      'link[as="script"]',
      // 替代/备用资源
      'link[rel="alternate"]',
      'link[rel="alternate stylesheet"]',
      // 图标类（离线无用）
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
      'link[rel="manifest"]',
      'link[rel="mask-icon"]'
    ];
    removeSelectors.forEach(selector => {
      try {
        rawClone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {}
    });

    // P1: 处理 link[rel="stylesheet"]，尝试内联 CSS
    const stylePromises: Promise<void>[] = [];
    const linkElements = rawClone.querySelectorAll('link[rel="stylesheet"]');

    linkElements.forEach((link) => {
      const href = (link as HTMLLinkElement).href;
      if (!href) return;

      const promise = this.inlineStylesheet(href)
        .then((cssContent) => {
          if (cssContent) {
            // 创建 style 标签替换 link
            const styleEl = document.createElement('style');
            styleEl.textContent = cssContent;
            link.parentNode?.replaceChild(styleEl, link);
          } else {
            // fetch 失败，删除 link
            link.parentNode?.removeChild(link);
          }
        })
        .catch(() => {
          // 出错时删除 link
          link.parentNode?.removeChild(link);
        });

      stylePromises.push(promise);
    });

    // 等待所有 CSS 请求完成
    await Promise.all(stylePromises);

    // 获取 body 内容
    const bodyContent = (rawClone.querySelector('body') as HTMLElement)?.innerHTML || '';

    // 提取 head 中的 style 标签（这些是必须保留的）
    const headClone = rawClone.querySelector('head');
    const styleElements = headClone?.querySelectorAll('style') || [];
    const styleContent = Array.from(styleElements)
      .map(style => style.outerHTML)
      .join('\n');

    // 提取 canonical link（可选保留）
    const canonicalLink = headClone?.querySelector('link[rel="canonical"]');
    const canonicalHtml = canonicalLink ? canonicalLink.outerHTML : '';

    // ============ Theme Preservation ============
    // 提取原始 html/body 的主题属性和 computed style
    const htmlAttrs = this.extractElementAttributes(document.documentElement, [
      'class', 'style', 'data-theme', 'data-oled', 'data-chat-theme', 'data-contrast'
    ]);

    const bodyAttrs = this.extractElementAttributes(document.body, ['class', 'style']);

    // 提取 computed style
    const computedStyle = this.getThemeStyles();

    // 构建 theme preservation style
    const themeStyle = `<style id="ai-web-archive-theme">
/* AI Web Archive Theme Preservation */
html ${htmlAttrs.style ? `{ ${htmlAttrs.style} }` : ''}
html { ${computedStyle} }
body${bodyAttrs.class ? `.${bodyAttrs.class.replace(/\s+/g, '.')}` : ''} {
  ${computedStyle}
  ${bodyAttrs.style || ''}
}
</style>`;

    // 构建干净的 head - 只保留必要元素
    const cleanHead = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(document.title)}</title>
${canonicalHtml}
${styleContent}
${themeStyle}`;

    // 构建完整的 HTML - 保留原始 html/body 属性
    return `<!DOCTYPE html>
<html lang="${document.documentElement.lang || 'zh-CN'}"${htmlAttrs.class ? ` class="${htmlAttrs.class}"` : ''}${htmlAttrs['data-theme'] ? ` data-theme="${htmlAttrs['data-theme']}"` : ''}${htmlAttrs['data-oled'] ? ` data-oled="${htmlAttrs['data-oled']}"` : ''}${htmlAttrs['data-chat-theme'] ? ` data-chat-theme="${htmlAttrs['data-chat-theme']}"` : ''}${htmlAttrs['data-contrast'] ? ` data-contrast="${htmlAttrs['data-contrast']}"` : ''}${htmlAttrs.style && !htmlAttrs.style.includes('color-scheme') ? ` style="${htmlAttrs.style}"` : ''}>
<head>
${cleanHead}
</head>
<body${bodyAttrs.class ? ` class="${bodyAttrs.class}"` : ''}${bodyAttrs.style ? ` style="${bodyAttrs.style}"` : ''}>
  <div class="meta">
    <h1>${escapeHtml(document.title)}</h1>
    <p>Source: <a href="${escapeHtml(pageData.url)}" target="_blank">${escapeHtml(pageData.url)}</a></p>
    <p>Captured: ${new Date().toLocaleString()}</p>
    <p>Archived by <strong>AI Web Archive</strong></p>
  </div>
  ${bodyContent}
</body>
</html>`;
  }

  // 辅助函数：提取元素的指定属性
  private extractElementAttributes(el: Element, attrNames: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const attr of attrNames) {
      const value = el.getAttribute(attr);
      if (value) {
        result[attr] = value;
      }
    }
    return result;
  }

  // 辅助函数：提取主题相关 computed styles
  private getThemeStyles(): string {
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);

    const styles: string[] = [];

    // 背景色
    const bodyBg = bodyStyle.backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
      styles.push(`background-color: ${bodyBg}`);
    }

    // 前景色
    const bodyColor = bodyStyle.color;
    if (bodyColor && bodyColor !== 'rgba(0, 0, 0, 0)') {
      styles.push(`color: ${bodyColor}`);
    }

    // color-scheme
    const colorScheme = htmlStyle.colorScheme;
    if (colorScheme) {
      styles.push(`color-scheme: ${colorScheme}`);
    }

    // 字体
    const fontFamily = bodyStyle.fontFamily;
    if (fontFamily) {
      styles.push(`font-family: ${fontFamily}`);
    }

    // html 背景色（用于没有 body 背景时）
    const htmlBg = htmlStyle.backgroundColor;
    if (htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
      styles.push(`--html-bg: ${htmlBg}`);
    }

    return styles.join(';\n  ');
  }

  // 辅助函数：将相对路径转换为绝对 URL
  private resolveUrl(href: string, baseUrl: string): string {
    try {
      // 如果已经是绝对 URL，直接返回
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return href.startsWith('//') ? 'https:' + href : href;
      }
      // 相对路径，转换为绝对路径
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  // 辅助函数：内联单个 CSS 文件
  private async inlineStylesheet(href: string): Promise<string | null> {
    try {
      const absoluteUrl = this.resolveUrl(href, window.location.href);

      // 只请求同源 CSS，避免 CORS 问题
      const urlObj = new URL(absoluteUrl);
      if (urlObj.origin !== window.location.origin) {
        // 跨域 CSS 无法在 content script 中 fetch，返回 null 让调用者删除 link
        console.warn(`[AI Web Archive] Skipping cross-origin CSS: ${absoluteUrl}`);
        return null;
      }

      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        console.warn(`[AI Web Archive] Failed to fetch CSS: ${absoluteUrl}, status: ${response.status}`);
        return null;
      }

      const cssText = await response.text();
      console.log(`[AI Web Archive] Inlined CSS: ${absoluteUrl} (${cssText.length} bytes)`);
      return cssText;
    } catch (error) {
      console.warn(`[AI Web Archive] Error fetching CSS: ${href}`, error);
      return null;
    }
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
    // 使用 async 处理，因为 exportToRawHTML 现在是 async
    capturer.exportToRawHTML({ url: window.location.href, title: document.title, html: '' })
      .then(async (html) => {
        try {
          const pageData = {
            url: window.location.href,
            title: document.title,
            html: document.documentElement.outerHTML
          };

          // 获取原始可见文本
          const originalText = document.body.innerText || document.body.textContent || '';

          // 导出
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
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    // 返回 true 表示异步响应
    return true;
  }
  return true;
});
