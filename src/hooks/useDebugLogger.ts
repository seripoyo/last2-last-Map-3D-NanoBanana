import { useState, useEffect, useCallback, useRef } from 'react';

export interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  userAgent?: string;
  url?: string;
}

export interface ApiStatus {
  service: string;
  status: 'connected' | 'disconnected' | 'error' | 'loading';
  apiKey?: string;
  lastCheck: string;
  errorMessage?: string;
  responseTime?: number;
  details?: any;
}

const DEBUG_STORAGE_KEY = 'debug_logs';
const API_STATUS_KEY = 'api_status';
const MAX_LOGS = 1000; // 最大ログ数

export function useDebugLogger() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const logCountRef = useRef(0);

  // ログ初期化
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem(DEBUG_STORAGE_KEY);
      const savedApiStatus = localStorage.getItem(API_STATUS_KEY);
      
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        setLogs(parsedLogs);
        logCountRef.current = parsedLogs.length;
      }
      
      if (savedApiStatus) {
        setApiStatuses(JSON.parse(savedApiStatus));
      }
      
      // 環境詳細情報の収集
      const environmentInfo = {
        isYouWare: window.location.hostname.includes('youware.app'),
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        mode: (import.meta as any).env?.MODE,
        baseUrl: (import.meta as any).env?.BASE_URL,
        viteEnv: Object.keys((import.meta as any).env || {}).filter(key => key.startsWith('VITE_')),
        envVars: {
          VITE_GOOGLE_MAPS_API_KEY: (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ? 
            `${(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 8)}...` : 'Not set',
          VITE_MAP_ID: (import.meta as any).env?.VITE_MAP_ID || 'Not set',
          VITE_ENV: (import.meta as any).env?.VITE_ENV || 'Not set'
        }
      };
      
      // 初期ログ
      addLog('debug', 'DebugLogger', 'Debug logger initialized with enhanced YouWare diagnostics', {
        maxLogs: MAX_LOGS,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        environment: environmentInfo
      });

      // YouWareプラットフォーム検出ログ
      if (environmentInfo.isYouWare) {
        addLog('info', 'Platform', 'YouWare platform detected - enabling enhanced diagnostics', environmentInfo);
      } else {
        addLog('info', 'Platform', 'Local development environment detected', environmentInfo);
      }
    } catch (error) {
      console.error('Failed to initialize debug logger:', error);
      addLog('error', 'DebugLogger', 'Failed to initialize debug logger', error);
    }
  }, []);

  // ログ追加関数
  const addLog = useCallback((
    level: DebugLog['level'],
    category: string,
    message: string,
    data?: any
  ) => {
    const newLog: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      // 最大ログ数を超えた場合、古いログを削除
      const trimmedLogs = updatedLogs.length > MAX_LOGS 
        ? updatedLogs.slice(-MAX_LOGS) 
        : updatedLogs;
      
      try {
        localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(trimmedLogs));
      } catch (error) {
        console.error('Failed to save logs to localStorage:', error);
      }
      
      return trimmedLogs;
    });

    logCountRef.current++;
    
    // コンソールにも出力
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : 
                         level === 'debug' ? console.debug : console.log;
    consoleMethod(`[${category}] ${message}`, data || '');
  }, []);

  // APIステータス更新
  const updateApiStatus = useCallback((apiStatus: Partial<ApiStatus> & { service: string }) => {
    setApiStatuses(prevStatuses => {
      const updated = prevStatuses.filter(s => s.service !== apiStatus.service);
      const newStatus: ApiStatus = {
        status: 'connected',
        lastCheck: new Date().toISOString(),
        ...apiStatus
      };
      
      const updatedStatuses = [...updated, newStatus];
      
      try {
        localStorage.setItem(API_STATUS_KEY, JSON.stringify(updatedStatuses));
      } catch (error) {
        console.error('Failed to save API status:', error);
      }
      
      return updatedStatuses;
    });

    addLog('info', 'API', `API status updated: ${apiStatus.service}`, apiStatus);
  }, [addLog]);

  // ログクリア
  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(DEBUG_STORAGE_KEY);
    logCountRef.current = 0;
    addLog('info', 'DebugLogger', 'Logs cleared by user');
  }, [addLog]);

  // ログエクスポート
  const exportLogs = useCallback((format: 'json' | 'txt' = 'json') => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      apiStatuses,
      logs: logs.map(log => ({
        ...log,
        readableTime: new Date(log.timestamp).toLocaleString()
      })),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        platform: navigator.platform
      }
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      content = [
        '=== DEBUG LOGS EXPORT ===',
        `Export Date: ${exportData.exportDate}`,
        `Total Logs: ${exportData.totalLogs}`,
        `User Agent: ${exportData.systemInfo.userAgent}`,
        `URL: ${exportData.systemInfo.url}`,
        '',
        '=== API STATUSES ===',
        ...apiStatuses.map(api => 
          `${api.service}: ${api.status} (${api.lastCheck})${api.errorMessage ? ` - ${api.errorMessage}` : ''}`
        ),
        '',
        '=== LOGS ===',
        ...logs.map(log => 
          `[${log.readableTime}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''}`
        )
      ].join('\n');
      filename = `debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addLog('info', 'DebugLogger', `Logs exported as ${format.toUpperCase()}`, { filename, logCount: logs.length });
  }, [logs, apiStatuses, addLog]);

  // 統計情報
  const stats = {
    totalLogs: logs.length,
    errorCount: logs.filter(log => log.level === 'error').length,
    warningCount: logs.filter(log => log.level === 'warn').length,
    apiCount: apiStatuses.length,
    connectedApis: apiStatuses.filter(api => api.status === 'connected').length,
    lastLogTime: logs.length > 0 ? logs[logs.length - 1].timestamp : null
  };

  return {
    logs,
    apiStatuses,
    stats,
    addLog,
    updateApiStatus,
    clearLogs,
    exportLogs
  };
}