/**
 * Deep Debug System Integration Example
 *
 * このファイルをApp.tsxにコピー＆ペーストして使用してください
 */

import React, { useState } from 'react';
import { DeepDebugSystem } from './test/deep-debug-system';

// Example 1: 基本的な統合
export function BasicIntegration() {
  return (
    <div>
      <h1>My NanoBanana App</h1>
      {/* アプリケーションのコンテンツ */}

      {/* Deep Debug Systemを追加 */}
      <DeepDebugSystem />
    </div>
  );
}

// Example 2: 開発環境のみで表示
export function DevelopmentOnlyIntegration() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div>
      <h1>My NanoBanana App</h1>
      {/* アプリケーションのコンテンツ */}

      {/* 開発環境でのみ表示 */}
      {isDevelopment && (
        <DeepDebugSystem
          enableAutoTest={true}
          position="bottom-right"
        />
      )}
    </div>
  );
}

// Example 3: トグル可能な統合
export function ToggleableIntegration() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div>
      <h1>My NanoBanana App</h1>

      {/* デバッグ表示トグルボタン */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999
        }}
      >
        {showDebug ? 'Hide' : 'Show'} Debug
      </button>

      {/* アプリケーションのコンテンツ */}

      {/* 条件付きでDebug Systemを表示 */}
      {showDebug && <DeepDebugSystem />}
    </div>
  );
}

// Example 4: カスタム設定での統合
export function CustomConfigIntegration() {
  // 環境変数から設定を読み込み
  const apiKey = process.env.REACT_APP_YOUWARE_API_KEY || 'sk-YOUWARE';
  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT || 'https://api.youware.com/public/v1';

  return (
    <div>
      <h1>My NanoBanana App</h1>
      {/* アプリケーションのコンテンツ */}

      {/* カスタム設定でDebug Systemを追加 */}
      <DeepDebugSystem
        apiKey={apiKey}
        apiEndpoint={apiEndpoint}
        enableAutoTest={true}
        position="top-right"
        theme="light"
      />
    </div>
  );
}

// Example 5: 既存のNanoBananaプロジェクトへの統合
export function NanoBananaProjectIntegration() {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // NanoBanana画像生成関数（既存のコード）
  const generateImage = async (type: string) => {
    console.log(`Generating ${type} image...`);
    setDebugLogs(prev => [...prev, `Started ${type} generation`]);

    // 既存の画像生成ロジック
    try {
      // ... your existing code ...
      setDebugLogs(prev => [...prev, `${type} generation successful`]);
    } catch (error) {
      setDebugLogs(prev => [...prev, `${type} generation failed: ${error}`]);
    }
  };

  return (
    <div>
      <h1>NanoBanana Image Generator</h1>

      {/* 画像生成ボタン */}
      <div>
        <button onClick={() => generateImage('isometric')}>
          Generate Isometric
        </button>
        <button onClick={() => generateImage('hologram')}>
          Generate Hologram
        </button>
        <button onClick={() => generateImage('line_art')}>
          Generate Line Art
        </button>
      </div>

      {/* Deep Debug Systemが自動的にログを監視 */}
      <DeepDebugSystem
        enableAutoTest={false}
        position="bottom-right"
        theme="dark"
      />
    </div>
  );
}

// Example 6: 遅延読み込み（パフォーマンス最適化）
export function LazyLoadedIntegration() {
  const [debugLoaded, setDebugLoaded] = useState(false);

  return (
    <div>
      <h1>My NanoBanana App</h1>

      {/* デバッグシステムを遅延読み込み */}
      {!debugLoaded && (
        <button
          onClick={() => setDebugLoaded(true)}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: '10px',
            background: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Load Debug System
        </button>
      )}

      {/* 読み込み後に表示 */}
      {debugLoaded && (
        <React.Suspense fallback={<div>Loading debug system...</div>}>
          <DeepDebugSystem />
        </React.Suspense>
      )}
    </div>
  );
}