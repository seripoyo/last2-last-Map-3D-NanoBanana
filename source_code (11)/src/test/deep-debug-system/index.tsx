/**
 * Deep Debug System - Standalone Module
 *
 * NanoBanana画像生成プロジェクト用の独立したDeep Debug System
 * 使用方法:
 * 1. このディレクトリ全体をプロジェクトのtestフォルダにコピー
 * 2. プロジェクトのApp.tsxに以下を追加:
 *    import { DeepDebugSystem } from './test/deep-debug-system';
 * 3. コンポーネント内で使用:
 *    <DeepDebugSystem />
 */

import React, { useState, useCallback, useEffect } from 'react';
import { DeepDebugPanel } from './components/DeepDebugPanel';
import { DirectAITestPanel } from './components/DirectAITestPanel';
import { useDebugStore } from './hooks/useDebugStore';
import { initializeDebugSystem } from './utils/debugSystemInitializer';
import './styles/debug-system.css';

export interface DeepDebugSystemProps {
  apiKey?: string;
  apiEndpoint?: string;
  enableAutoTest?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
}

export const DeepDebugSystem: React.FC<DeepDebugSystemProps> = ({
  apiKey = 'sk-YOUWARE',
  apiEndpoint = 'https://api.youware.com/public/v1',
  enableAutoTest = false,
  position = 'bottom-right',
  theme = 'dark'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'debug' | 'direct'>('debug');
  const { logs, addLog, clearLogs } = useDebugStore();

  // Initialize debug system on mount
  useEffect(() => {
    initializeDebugSystem({
      apiKey,
      apiEndpoint,
      onLog: addLog
    });

    if (enableAutoTest) {
      console.log('🚀 Deep Debug System: Auto-test enabled');
      runInitialTests();
    }
  }, [apiKey, apiEndpoint, enableAutoTest]);

  const runInitialTests = useCallback(async () => {
    addLog('info', 'Starting initial system tests...');

    // Test 1: Check ywConfig
    if ((window as any).ywConfig) {
      addLog('success', 'ywConfig detected', (window as any).ywConfig);
    } else {
      addLog('warning', 'ywConfig not found - some features may be limited');
    }

    // Test 2: Check NanoBanana configuration
    const nanoBananaConfig = (window as any).ywConfig?.ai_config;
    if (nanoBananaConfig) {
      const generators = Object.keys(nanoBananaConfig);
      addLog('success', `Found ${generators.length} AI generators`, generators);
    } else {
      addLog('error', 'NanoBanana configuration not found');
    }

    // Test 3: Check API connectivity
    try {
      const response = await fetch(`${apiEndpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        addLog('success', 'API connectivity test passed');
      } else {
        addLog('error', `API connectivity test failed: ${response.status}`);
      }
    } catch (error) {
      addLog('error', 'API connectivity test failed', error);
    }
  }, [apiKey, apiEndpoint, addLog]);

  const togglePanel = () => setIsExpanded(!isExpanded);

  return (
    <div className={`deep-debug-system deep-debug-${position} deep-debug-${theme}`}>
      {/* Floating Toggle Button */}
      <button
        className="deep-debug-toggle"
        onClick={togglePanel}
        title="Toggle Deep Debug System"
      >
        <span className="debug-icon">🐛</span>
        {logs.filter(l => l.level === 'error').length > 0 && (
          <span className="error-badge">
            {logs.filter(l => l.level === 'error').length}
          </span>
        )}
      </button>

      {/* Expandable Debug Panel */}
      {isExpanded && (
        <div className="deep-debug-panel">
          {/* Header */}
          <div className="debug-panel-header">
            <h3>🔬 Deep Debug System</h3>
            <div className="debug-panel-controls">
              <button onClick={clearLogs} title="Clear logs">🗑️</button>
              <button onClick={runInitialTests} title="Run tests">🔄</button>
              <button onClick={togglePanel} title="Close">✖️</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="debug-panel-tabs">
            <button
              className={activeTab === 'debug' ? 'active' : ''}
              onClick={() => setActiveTab('debug')}
            >
              Debug Logs
            </button>
            <button
              className={activeTab === 'direct' ? 'active' : ''}
              onClick={() => setActiveTab('direct')}
            >
              Direct AI Test
            </button>
          </div>

          {/* Content */}
          <div className="debug-panel-content">
            {activeTab === 'debug' && (
              <DeepDebugPanel logs={logs} onClear={clearLogs} />
            )}
            {activeTab === 'direct' && (
              <DirectAITestPanel
                apiKey={apiKey}
                apiEndpoint={apiEndpoint}
                onLog={addLog}
              />
            )}
          </div>

          {/* Footer */}
          <div className="debug-panel-footer">
            <span className="status-indicator">
              Status: <span className="status-badge">Active</span>
            </span>
            <span className="debug-version">v1.0.0</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Export all components for individual use
export { DeepDebugPanel } from './components/DeepDebugPanel';
export { DirectAITestPanel } from './components/DirectAITestPanel';
export { useDebugStore } from './hooks/useDebugStore';
export { initializeDebugSystem } from './utils/debugSystemInitializer';