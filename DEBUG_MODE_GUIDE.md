# Debug Mode Guide

## 🐛 デバッグモードについて

このアプリケーションには、API認証状況や接続テストを行うためのデバッグパネルが組み込まれています。

## ✅ デフォルト設定

**デバッグモードは全ての環境でデフォルトで有効になっています。**

- 本番環境: ✅ 有効
- 開発環境: ✅ 有効
- YouWare環境: ✅ 有効
- その他の環境: ✅ 有効

## 🔒 デバッグモードの無効化方法

デバッグモードを非表示にする場合：

### 方法1: キーボードショートカット
`Ctrl + Shift + D` を押すことで、デバッグモードの表示/非表示を切り替えられます。

### 方法2: デバッグパネルの目のアイコン
デバッグパネル上の目のアイコンをクリックして非表示にできます。

### 方法3: LocalStorage（永続的に無効化）
ブラウザのコンソールで以下を実行：
```javascript
localStorage.setItem('debugMode', 'false');
location.reload();
```

再度有効化する場合：
```javascript
localStorage.removeItem('debugMode');
location.reload();
```

## 🔓 デバッグモードの有効化方法（無効化している場合）

### 方法1: URLパラメータ（推奨）
アプリケーションのURLに `?debug=true` を追加します：

```
https://youware.app/project/your-project?debug=true
https://www.youware.com/editor/your-app?debug=true
http://localhost:5173?debug=true
```

### 方法2: キーボードショートカット
`Ctrl + Shift + D` を押すことで、デバッグモードの表示/非表示を切り替えられます。

### 方法3: LocalStorage
ブラウザのコンソールで以下を実行：
```javascript
localStorage.setItem('debugMode', 'true');
location.reload();
```

無効化する場合：
```javascript
localStorage.removeItem('debugMode');
location.reload();
```

## 🎯 デバッグパネルの使い方

### 1. デバッグボタンの表示
- **有効時**: 左下に虫アイコン（🐛）が表示されます
- **無効時**: 左下に小さな目のアイコン（👁）が薄く表示されます

### 2. デバッグパネルを開く
虫アイコンをクリックしてパネルを開きます。

### 3. テストを実行
「Run Debug Tests」ボタンをクリックして以下の項目をテスト：
- **認証状況**: 現在使用中のAPIキーとその取得元
- **YouWare API接続**: APIエンドポイントへの接続テスト
- **Google Maps API**: Maps APIの読み込み状況
- **環境情報**: 実行環境の詳細情報

### 4. 結果の確認
- 🟢 **緑**: 正常
- 🔴 **赤**: エラー
- 🟡 **黄**: 警告
- 🔵 **青**: 推奨事項

### 5. レポートのダウンロード
「Download Report」ボタンで詳細なJSONレポートをダウンロードできます。

## 🔍 環境の自動検出

デバッグパネルは実行環境を自動的に検出し、以下のように分類します：

| 環境タイプ | URL例 | 説明 |
|-----------|------|------|
| YouWare App Project | `youware.app/project/*` | YouWareアプリプロジェクト |
| YouWare Editor | `youware.com/editor/*` | YouWareエディター |
| Local Development | `localhost:*` | ローカル開発環境 |
| YouWare Platform | `*.youware.com` | その他のYouWare環境 |
| Production | その他 | 一般的な本番環境 |

## 🔒 セキュリティ

- デバッグモードは診断目的でのみ使用してください
- APIキーなどの機密情報は部分的にマスクされます
- 本番環境では必要な場合のみ有効化してください

## 💡 トラブルシューティング

### デバッグボタンが表示されない場合

1. URLに `?debug=true` を追加
2. `Ctrl + Shift + D` を押す
3. ブラウザのコンソールで以下を実行：
   ```javascript
   // デバッグモードの状態を確認
   console.log('Debug mode:', localStorage.getItem('debugMode'));
   console.log('Current host:', window.location.hostname);
   ```

### 401 Unauthorized エラーの場合

デバッグパネルで以下を確認：
1. 現在のAPIキーとその取得元
2. 環境タイプ（YouWare環境かどうか）
3. 推奨事項セクションの指示に従う

## 📝 詳細情報

詳しい認証設定については [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) を参照してください。