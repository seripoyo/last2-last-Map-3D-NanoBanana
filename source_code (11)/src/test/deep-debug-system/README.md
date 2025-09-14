# 🔬 Deep Debug System for NanoBanana Projects

独立したDeep Debug Systemモジュール。NanoBanana画像生成に成功しているプロジェクトに簡単に統合できます。

## ✨ 特徴

- 🎨 **NanoBanana特化** - 3つのAIジェネレーター（isometric、hologram、line_art）のテスト
- 🔐 **認証テスト** - Bearer Token、API Key、OpenAI互換の認証方式をサポート
- 🌐 **ネットワーク監視** - AI APIリクエストを自動的に監視・記録
- 📊 **リアルタイムログ** - デバッグ情報をリアルタイムで表示
- 🎯 **直接AIテスト** - SDK無しでAPIを直接テスト
- 💾 **エクスポート機能** - デバッグログをJSONファイルとして保存

## 🚀 クイックスタート

### 1. ファイルをコピー

このディレクトリ全体（`test/deep-debug-system`）をプロジェクトにコピーします：

```bash
cp -r test/deep-debug-system /path/to/your/project/test/
```

### 2. プロジェクトに統合

#### 方法A: App.tsxに直接追加

```tsx
// App.tsx
import React from 'react';
import { DeepDebugSystem } from './test/deep-debug-system';

function App() {
  return (
    <div className="App">
      {/* 既存のコンポーネント */}

      {/* Deep Debug Systemを追加 */}
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
```

#### 方法B: 条件付きで表示（開発環境のみ）

```tsx
// App.tsx
import React from 'react';

// 開発環境でのみインポート
const DeepDebugSystem = import.meta.env.DEV
  ? React.lazy(() => import('./test/deep-debug-system'))
  : () => null;

function App() {
  return (
    <div className="App">
      {/* 既存のコンポーネント */}

      {/* 開発環境でのみ表示 */}
      {import.meta.env.DEV && (
        <React.Suspense fallback={null}>
          <DeepDebugSystem />
        </React.Suspense>
      )}
    </div>
  );
}
```

## 📋 設定オプション

| プロパティ | 型 | デフォルト値 | 説明 |
|----------|-----|------------|------|
| `apiKey` | string | `'sk-YOUWARE'` | YouWare APIキー |
| `apiEndpoint` | string | `'https://api.youware.com/public/v1'` | APIエンドポイント |
| `enableAutoTest` | boolean | `false` | 起動時に自動テストを実行 |
| `position` | string | `'bottom-right'` | パネルの表示位置 |
| `theme` | string | `'dark'` | テーマ（`'light'` or `'dark'`） |

### 表示位置のオプション
- `'top-right'` - 右上
- `'top-left'` - 左上
- `'bottom-right'` - 右下（デフォルト）
- `'bottom-left'` - 左下

## 🎯 使用例

### 基本的な使用

```tsx
<DeepDebugSystem />
```

### カスタム設定

```tsx
<DeepDebugSystem
  apiKey={process.env.REACT_APP_YOUWARE_KEY}
  apiEndpoint="https://api.youware.com/public/v1"
  enableAutoTest={true}
  position="top-right"
  theme="light"
/>
```

### プログラマティックな使用

```tsx
import { testNanoBananaGeneration } from './test/deep-debug-system/utils/debugSystemInitializer';

// NanoBanana画像生成をテスト
async function testGeneration() {
  try {
    const result = await testNanoBananaGeneration(
      'Tokyo Tower',
      'isometric_generator'
    );
    console.log('Generated image:', result);
  } catch (error) {
    console.error('Generation failed:', error);
  }
}
```

## 🔧 個別コンポーネントの使用

必要に応じて個別のコンポーネントも使用できます：

```tsx
import {
  DeepDebugPanel,
  DirectAITestPanel,
  useDebugStore
} from './test/deep-debug-system';

function MyComponent() {
  const { logs, addLog, clearLogs } = useDebugStore();

  return (
    <div>
      <DeepDebugPanel logs={logs} onClear={clearLogs} />
      <DirectAITestPanel
        apiKey="sk-YOUWARE"
        apiEndpoint="https://api.youware.com/public/v1"
        onLog={addLog}
      />
    </div>
  );
}
```

## 🧪 テスト機能

### 自動実行されるテスト

1. **ywConfig検出** - YouWare設定の存在確認
2. **NanoBanana設定** - AIジェネレーター設定の確認
3. **API接続性** - エンドポイントへの接続テスト

### 手動テスト

パネル内の「Direct AI Test」タブから：

- 🌐 **Test Connectivity** - API接続性テスト
- 🔐 **Test Auth** - 認証方式のテスト
- 🎨 **Test nano-banana** - 画像生成テスト
- 🚀 **Run All Tests** - 全テストを実行

## 📊 ログ機能

### ログレベル

- ℹ️ **INFO** - 一般的な情報
- ✅ **SUCCESS** - 成功した操作
- ⚠️ **WARNING** - 警告メッセージ
- ❌ **ERROR** - エラーメッセージ

### ログのエクスポート

「Export」ボタンをクリックすると、以下の形式でログをエクスポートできます：

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "logs": [...],
  "environment": {
    "userAgent": "...",
    "url": "...",
    "ywConfig": {...}
  }
}
```

## 🎨 カスタマイズ

### スタイルのカスタマイズ

`styles/debug-system.css`を編集してスタイルをカスタマイズできます：

```css
/* カスタムカラー */
.deep-debug-toggle {
  background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%);
}

/* カスタムサイズ */
.deep-debug-panel {
  width: 500px;
  max-height: 700px;
}
```

## 🚨 トラブルシューティング

### CSSが読み込まれない場合

プロジェクトのエントリーポイントでCSSをインポート：

```tsx
// main.tsx or index.tsx
import './test/deep-debug-system/styles/debug-system.css';
```

### TypeScriptエラーが出る場合

`tsconfig.json`にパスを追加：

```json
{
  "compilerOptions": {
    "paths": {
      "@debug/*": ["./test/deep-debug-system/*"]
    }
  }
}
```

### ビルドから除外したい場合

環境変数でコントロール：

```tsx
const shouldShowDebug = process.env.NODE_ENV === 'development'
  && process.env.REACT_APP_SHOW_DEBUG !== 'false';

{shouldShowDebug && <DeepDebugSystem />}
```

## 📦 必要な依存関係

このモジュールは以下のパッケージを使用します（既にプロジェクトにインストールされている前提）：

- React (^18.0.0)
- TypeScript

追加の依存関係は不要です！

## 🔄 更新履歴

### v1.0.0 (2024-01-15)
- 初回リリース
- NanoBanana画像生成テスト機能
- YouWare環境検出
- リアルタイムログ機能
- エクスポート機能

## 📝 ライセンス

このモジュールはプロジェクトのライセンスに従います。

## 🤝 サポート

問題や質問がある場合は、プロジェクトのイシュートラッカーで報告してください。

---

Made with 🔬 for NanoBanana developers