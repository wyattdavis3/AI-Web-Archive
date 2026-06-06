export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  extra?: Record<string, any>;
}

// 检测是否在 Chrome 扩展环境中
const isExtensionEnvironment = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
};

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private inExtensionEnv: boolean;

  constructor() {
    this.inExtensionEnv = isExtensionEnvironment();
    this.loadFromStorage();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private safeStringify(obj: any): any {
    try {
      if (obj === undefined || obj === null) return undefined;
      
      // 尝试安全地序列化对象
      if (typeof obj === 'object') {
        // 为了避免循环引用问题，我们创建一个安全的副本
        const safeObj: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
              // 对于对象，我们尝试序列化
              try {
                safeObj[key] = JSON.parse(JSON.stringify(value));
              } catch {
                safeObj[key] = String(value);
              }
            } else {
              safeObj[key] = value;
            }
          }
        }
        return safeObj;
      }
      return obj;
    } catch {
      return String(obj);
    }
  }

  private addEntry(level: 'info' | 'warn' | 'error', message: string, extra?: Record<string, any>): void {
    const entry: LogEntry = {
      id: this.generateId(),
      time: new Date().toISOString(),
      level,
      message,
      extra: this.safeStringify(extra)
    };

    this.logs.unshift(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.saveToStorage();

    // 仍然输出到 console 方便开发调试
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}] ${message}`, extra || '');
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] ${message}`, extra || '');
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, extra || '');
    }
  }

  log(message: string, extra?: Record<string, any>): void {
    this.addEntry('info', message, extra);
  }

  warn(message: string, extra?: Record<string, any>): void {
    this.addEntry('warn', message, extra);
  }

  error(message: string, extra?: Record<string, any>): void {
    this.addEntry('error', message, extra);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  getLogsByLevel(level: 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLastError(): LogEntry | null {
    return this.getLogsByLevel('error')[0] || null;
  }

  clear(): void {
    this.logs = [];
    this.saveToStorage();
    console.log('Logs cleared');
  }

  private saveToStorage(): void {
    try {
      if (this.inExtensionEnv) {
        chrome.storage.local.set({ aiwa_logs: this.logs });
      } else {
        localStorage.setItem('aiwa_logs', JSON.stringify(this.logs));
      }
    } catch (e) {
      console.error('Failed to save logs to storage', e);
    }
  }

  private loadFromStorage(): void {
    try {
      if (this.inExtensionEnv) {
        chrome.storage.local.get('aiwa_logs', (result) => {
          if (result.aiwa_logs && Array.isArray(result.aiwa_logs)) {
            this.logs = result.aiwa_logs;
          }
        });
      } else {
        const savedLogs = localStorage.getItem('aiwa_logs');
        if (savedLogs) {
          this.logs = JSON.parse(savedLogs);
        }
      }
    } catch (e) {
      console.error('Failed to load logs from storage', e);
    }
  }

  generateDiagnosticReport(): any {
    const lastError = this.getLastError();
    const manifest = this.inExtensionEnv ? chrome.runtime.getManifest() : null;
    
    return {
      appVersion: manifest?.version || '1.0.0',
      manifestVersion: manifest?.manifest_version || 3,
      chromeVersion: navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || 'Unknown',
      time: new Date().toISOString(),
      environment: this.inExtensionEnv ? 'Chrome Extension' : 'Browser Preview',
      lastError: lastError ? {
        message: lastError.message,
        time: lastError.time,
        extra: lastError.extra
      } : null,
      logs: this.logs.slice(0, 50)
    };
  }

  exportToJSON(): string {
    const report = this.generateDiagnosticReport();
    return JSON.stringify(report, null, 2);
  }

  generateAIDiagnosticReport(): string {
    const report = this.generateDiagnosticReport();
    const lastError = report.lastError;
    
    let suggestions: string[] = [];
    
    if (lastError) {
      const errorMsg = lastError.message.toLowerCase();
      
      if (errorMsg.includes('receiving end') || errorMsg.includes('content script')) {
        suggestions.push('Content Script 注入失败，可能需要刷新页面');
        suggestions.push('检查页面是否在 chrome:// 或其他受限 URL 上');
      }
      
      if (errorMsg.includes('permission')) {
        suggestions.push('检查 manifest.json 中的权限配置');
        suggestions.push('确认 activeTab 和 scripting 权限已声明');
      }
      
      if (errorMsg.includes('storage')) {
        suggestions.push('检查 chrome.storage.local 是否可用');
        suggestions.push('验证浏览器存储权限');
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('检查网络连接状态');
      suggestions.push('验证 Chrome 版本兼容性');
      suggestions.push('尝试重新加载扩展');
    }
    
    let logsText = '';
    report.logs.forEach((log: LogEntry) => {
      logsText += `[${log.time}] [${log.level.toUpperCase()}] ${log.message}\n`;
      if (log.extra) {
        logsText += `  Extra: ${JSON.stringify(log.extra)}\n`;
      }
    });
    
    return `【问题】
最近错误：${lastError ? lastError.message : '无'}
${lastError ? `时间：${lastError.time}` : ''}

【运行环境】
Chrome: ${report.chromeVersion}
插件版本：${report.appVersion}
Manifest Version: ${report.manifestVersion}

【最近日志】
${logsText}

【建议排查方向】
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
  }
}

export const logger = new Logger();
