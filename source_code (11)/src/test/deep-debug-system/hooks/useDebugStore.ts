import { useState, useCallback } from 'react';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export const useDebugStore = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const addLog = useCallback((
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    details?: any
  ) => {
    const newLog: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      details
    };

    setLogs(prev => [...prev, newLog]);

    // Also log to console for debugging
    const consoleMethod = level === 'error' ? 'error' :
                         level === 'warning' ? 'warn' :
                         level === 'success' ? 'log' : 'info';
    console[consoleMethod](`[Deep Debug] ${message}`, details);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    console.log('[Deep Debug] Logs cleared');
  }, []);

  const exportLogs = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      logs,
      stats: {
        total: logs.length,
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warning').length,
        success: logs.filter(l => l.level === 'success').length,
        info: logs.filter(l => l.level === 'info').length
      }
    };
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    exportLogs
  };
};