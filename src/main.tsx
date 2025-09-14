import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { loadMapsLibraries } from "./utils/mapsLoader";

// ywConfig初期化関数
const initializeYwConfig = async () => {
  try {
    // 既に初期化済みの場合はスキップ
    if (globalThis.ywConfig) {
      console.log('✅ ywConfig already initialized:', {
        hasAiConfig: !!globalThis.ywConfig.ai_config,
        scenes: globalThis.ywConfig.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : []
      });
      return;
    }

    console.log('🔧 Initializing ywConfig from yw_manifest.json...');

    // yw_manifest.jsonを読み込み
    const response = await fetch('/yw_manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to load yw_manifest.json: ${response.status} ${response.statusText}`);
    }

    const manifestData = await response.json();

    // Template string functions を処理
    const processTemplateStrings = (obj: any): any => {
      if (typeof obj === 'string' && obj.includes('${')) {
        // Template string を関数に変換
        return (variables: Record<string, any>) => {
          return obj.replace(/\$\{(\w+)\}/g, (match, key) => {
            return variables[key] || match;
          });
        };
      } else if (Array.isArray(obj)) {
        return obj.map(processTemplateStrings);
      } else if (obj !== null && typeof obj === 'object') {
        const processed: any = {};
        for (const [key, value] of Object.entries(obj)) {
          processed[key] = processTemplateStrings(value);
        }
        return processed;
      }
      return obj;
    };

    // globalThis.ywConfigに設定
    globalThis.ywConfig = processTemplateStrings(manifestData);

    console.log('✅ ywConfig initialized successfully:', {
      name: globalThis.ywConfig.name,
      version: globalThis.ywConfig.version,
      hasAiConfig: !!globalThis.ywConfig.ai_config,
      aiScenes: globalThis.ywConfig.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : []
    });

    // 各AIシーンの設定を検証
    if (globalThis.ywConfig.ai_config) {
      for (const [sceneName, config] of Object.entries(globalThis.ywConfig.ai_config)) {
        console.log(`🎨 AI Scene "${sceneName}":`, {
          model: (config as any).model,
          hasPromptTemplate: typeof (config as any).prompt_template === 'function'
        });
      }
    }

  } catch (error) {
    console.error('❌ Failed to initialize ywConfig:', error);
    // エラーでも続行可能な状態にする
    globalThis.ywConfig = {
      name: 'fallback-config',
      ai_config: {}
    };
    throw error;
  }
};

const start = async () => {
  try {
    if (import.meta.env.DEV) {
      console.log('🚀 Starting application initialization...');
      console.log('🔧 Environment:', {
        mode: import.meta.env.MODE,
        host: window.location.hostname,
        protocol: window.location.protocol,
      });
    }

    // Step 1: ywConfigを初期化
    await initializeYwConfig();

    // Step 2: Google Maps APIを初期化
    await loadMapsLibraries();

    if (import.meta.env.DEV) {
      console.log('✅ Google Maps API ready, rendering React app...');
      console.log('🎯 Final ywConfig status:', {
        exists: !!globalThis.ywConfig,
        hasAiConfig: !!(globalThis.ywConfig?.ai_config),
        scenes: globalThis.ywConfig?.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : []
      });
    }

    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (err) {
    console.error('❌ Failed to initialize application:', err);
    const root = document.getElementById("root");
    if (root) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isYwConfigError = errorMessage.includes('yw_manifest.json');
      const isMapsError = errorMessage.includes('Maps');

      root.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
          <div style="text-align:center;padding:20px">
            <h1 style="color:#dc2626;">エラーが発生しました</h1>
            <p style="color:#666;margin:20px 0;">
              ${isYwConfigError ? 'AI設定ファイル(yw_manifest.json)の読み込みに失敗しました。' :
                isMapsError ? 'Google Maps APIの読み込みに失敗しました。' :
                'アプリケーションの初期化に失敗しました。'}
            </p>
            <p style="color:#999;font-size:12px;margin:10px 0;">${errorMessage}</p>
            <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer">再読み込み</button>
          </div>
        </div>
      `;
    }
  }
};

start();