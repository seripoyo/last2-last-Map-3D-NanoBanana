import React, { useMemo } from 'react';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface DeepDebugPanelProps {
  logs: DebugLog[];
  onClear: () => void;
}

export const DeepDebugPanel: React.FC<DeepDebugPanelProps> = ({ logs, onClear }) => {
  const filteredLogs = useMemo(() => {
    return [...logs].reverse(); // Show newest first
  }, [logs]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return '#3b82f6';
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const exportLogs = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      logs: logs,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        ywConfig: (window as any).ywConfig
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="deep-debug-logs">
      <div className="log-controls">
        <span className="log-count">
          {logs.length} logs
        </span>
        <div className="log-actions">
          <button onClick={exportLogs} className="export-btn">
            📥 Export
          </button>
          <button onClick={onClear} className="clear-btn">
            Clear All
          </button>
        </div>
      </div>

      <div className="log-list">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">
            <p>No debug logs yet.</p>
            <p className="hint">Run tests or interact with the system to see logs.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`log-entry log-${log.level}`}
              style={{ borderLeftColor: getLevelColor(log.level) }}
            >
              <div className="log-header">
                <span className="log-icon">{getLevelIcon(log.level)}</span>
                <span className="log-time">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="log-level" style={{ color: getLevelColor(log.level) }}>
                  {log.level.toUpperCase()}
                </span>
              </div>
              <div className="log-message">{log.message}</div>
              {log.details && (
                <details className="log-details">
                  <summary>View Details</summary>
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};