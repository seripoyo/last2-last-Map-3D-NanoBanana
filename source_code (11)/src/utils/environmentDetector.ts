/**
 * YouWare環境検出ユーティリティ
 * 本番環境、開発環境を自動判定し、適切なAPI設定を提供
 */

export interface EnvironmentConfig {
  isYouWareProduction: boolean;
  isYouWareEditor: boolean;
  isYouWareProject: boolean;
  isLocalDevelopment: boolean;
  apiBaseUrl: string;
  apiKey: string;
  corsMode: RequestMode;
  headers: Record<string, string>;
}

/**
 * 現在の環境を検出
 */
export function detectEnvironment(): EnvironmentConfig {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // YouWare本番環境の判定
  const isYouWareEditor = currentUrl.includes('youware.com/editor') ||
                         currentUrl.includes('www.youware.com/editor');

  const isYouWareProject = currentUrl.includes('youware.app/project');

  const isYouWareProduction = isYouWareEditor || isYouWareProject;

  const isLocalDevelopment = hostname === 'localhost' ||
                             hostname === '127.0.0.1' ||
                             hostname.startsWith('192.168.');

  // API設定の決定
  let apiBaseUrl: string;
  let apiKey: string;
  let corsMode: RequestMode = 'cors';
  let headers: Record<string, string> = {};

  if (isYouWareProduction) {
    // 本番YouWare環境
    apiBaseUrl = 'https://api.youware.com/public/v1/ai';
    apiKey = 'sk-YOUWARE';

    // 本番環境では追加のヘッダーが必要な場合がある
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-YouWare-Environment': 'production',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // 本番環境では特定のCORS設定が必要
    corsMode = 'cors';
  } else if (isLocalDevelopment) {
    // ローカル開発環境
    apiBaseUrl = 'https://api.youware.com/public/v1/ai';
    apiKey = 'sk-YOUWARE';

    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    corsMode = 'cors';
  } else {
    // その他の環境（デフォルト）
    apiBaseUrl = 'https://api.youware.com/public/v1/ai';
    apiKey = 'sk-YOUWARE';

    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    corsMode = 'cors';
  }

  const config: EnvironmentConfig = {
    isYouWareProduction,
    isYouWareEditor,
    isYouWareProject,
    isLocalDevelopment,
    apiBaseUrl,
    apiKey,
    corsMode,
    headers
  };

  // デバッグ情報をコンソールに出力
  console.log('🌍 Environment Detection:', {
    url: currentUrl,
    hostname,
    pathname,
    detected: isYouWareProduction ? 'YouWare Production' :
              isLocalDevelopment ? 'Local Development' :
              'Unknown Environment',
    config
  });

  return config;
}

/**
 * globalThis.ywConfigの存在確認と取得
 */
export function getYouWareConfig(): any {
  try {
    // YouWare環境ではglobalThis.ywConfigが利用可能
    if (typeof globalThis !== 'undefined' && globalThis.ywConfig) {
      console.log('✅ YouWare Config Found:', globalThis.ywConfig);
      return globalThis.ywConfig;
    }

    // window経由でも確認
    if (typeof window !== 'undefined' && (window as any).ywConfig) {
      console.log('✅ YouWare Config Found (via window):', (window as any).ywConfig);
      return (window as any).ywConfig;
    }

    console.log('⚠️ YouWare Config not found');
    return null;
  } catch (error) {
    console.error('❌ Error accessing YouWare Config:', error);
    return null;
  }
}

/**
 * AI設定の取得（環境に応じて適切な設定を返す）
 */
export function getAIConfig(scene?: string) {
  const ywConfig = getYouWareConfig();
  const env = detectEnvironment();

  // YouWare設定が存在する場合は優先的に使用
  if (ywConfig?.ai_config) {
    if (scene && ywConfig.ai_config[scene]) {
      return {
        ...ywConfig.ai_config[scene],
        apiBaseUrl: env.apiBaseUrl,
        headers: env.headers
      };
    }
    return {
      ...ywConfig.ai_config,
      apiBaseUrl: env.apiBaseUrl,
      headers: env.headers
    };
  }

  // フォールバック設定
  return {
    model: scene?.includes('image') ? 'gpt-image-1' : 'gpt-4',
    apiBaseUrl: env.apiBaseUrl,
    apiKey: env.apiKey,
    headers: env.headers,
    corsMode: env.corsMode
  };
}

/**
 * API呼び出しのラッパー（環境対応）
 */
export async function callYouWareAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const env = detectEnvironment();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${env.apiBaseUrl}${endpoint}`;

  const finalOptions: RequestInit = {
    ...options,
    mode: env.corsMode,
    credentials: env.isYouWareProduction ? 'include' : 'same-origin',
    headers: {
      ...env.headers,
      ...(options.headers || {})
    }
  };

  console.log('🚀 API Call:', {
    url: fullUrl,
    environment: env.isYouWareProduction ? 'Production' : 'Development',
    options: finalOptions
  });

  try {
    const response = await fetch(fullUrl, finalOptions);

    if (!response.ok) {
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Network Error:', error);
    throw error;
  }
}

/**
 * 環境情報の表示（デバッグ用）
 */
export function logEnvironmentInfo(): void {
  const env = detectEnvironment();
  const ywConfig = getYouWareConfig();

  console.group('🔍 Deep Debug System - Environment Info');
  console.log('Environment:', env);
  console.log('YouWare Config:', ywConfig);
  console.log('Window Location:', {
    href: window.location.href,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    protocol: window.location.protocol
  });
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.groupEnd();
}