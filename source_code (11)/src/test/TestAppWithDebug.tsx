/**
 * Test App with Deep Debug System
 * このファイルをApp.tsxの代わりに使用してテストできます
 */

import React from 'react';
import { DeepDebugSystem } from './deep-debug-system';

export function TestAppWithDebug() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🎨 NanoBanana Test App with Deep Debug System</h1>

      <div style={{ marginTop: '20px' }}>
        <h2>テスト手順:</h2>
        <ol>
          <li>右下の🐛ボタンをクリックしてDebug Panelを開く</li>
          <li>「Run tests」ボタン（🔄）でシステムテストを実行</li>
          <li>「Direct AI Test」タブでNanoBanana APIをテスト</li>
          <li>ログをエクスポートして結果を保存</li>
        </ol>
      </div>

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f3f4f6',
        borderRadius: '8px'
      }}>
        <h3>統合方法:</h3>
        <pre style={{ background: '#1f2937', color: '#10b981', padding: '15px', borderRadius: '6px' }}>
{`// App.tsx に追加
import { DeepDebugSystem } from './test/deep-debug-system';

function App() {
  return (
    <div>
      {/* 既存のコンポーネント */}
      <YourComponents />

      {/* Deep Debug System追加 */}
      <DeepDebugSystem
        enableAutoTest={true}
        position="bottom-right"
      />
    </div>
  );
}`}
        </pre>
      </div>

      {/* Deep Debug System - 自動テスト有効 */}
      <DeepDebugSystem
        apiKey="sk-YOUWARE"
        apiEndpoint="https://api.youware.com/public/v1"
        enableAutoTest={true}
        position="bottom-right"
        theme="dark"
      />
    </div>
  );
}

// デフォルトエクスポート
export default TestAppWithDebug;