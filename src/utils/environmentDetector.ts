/**
 * YouWare環境検出ユーティリティ
 * 本番環境、プレビュー環境、開発環境を自動判定し、適切なAPI設定を提供
 */

export interface EnvironmentConfig {
  isYouWareProduction: boolean;
  isYouWareEditor: boolean;
  isYouWareProject: boolean;
  isYouWarePreview: boolean;
  isLocalDevelopment: boolean;
  apiBaseUrl: string;
  apiKey: string;
  corsMode: RequestMode;
  headers: Record<string, string>;
}

/**
 * 現在の環境を検出（YouWareプレビュー環境対応版）
 */
export function detectEnvironment(): EnvironmentConfig {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // YouWare本番環境の判定
  const isYouWareEditor = currentUrl.includes('youware.com/editor') ||
                         currentUrl.includes('www.youware.com/editor');

  const isYouWareProject = currentUrl.includes('youware.app/project');

  // YouWareプレビュー環境の判定（改善版）
  const isYouWarePreview = hostname.includes('.preview.yourware.so') ||
                          hostname.includes('.preview.youware.so') ||
                          hostname.includes('yourware.so') ||
                          hostname.includes('youware.so') ||
                          // UUIDパターンマッチング
                          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(hostname);

  const isYouWareProduction = isYouWareEditor || isYouWareProject || isYouWarePreview;

  const isLocalDevelopment = hostname === 'localhost' ||
                             hostname === '127.0.0.1' ||
                             hostname.startsWith('192.168.');

  // API設定の決定
  let apiBaseUrl: string;
  let apiKey: string;
  let corsMode: RequestMode = 'cors';
  let headers: Record<string, string> = {};

  if (isYouWareProduction) {
    // 本番/プレビューYouWare環境
    apiBaseUrl = 'https://api.youware.com/public/v1/ai';
    apiKey = 'sk-YOUWARE';

    // 本番環境では追加のヘッダーが必要な場合がある
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    // CORS設定
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
    isYouWarePreview,
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
    detected: isYouWareProduction ?
              (isYouWarePreview ? 'YouWare Preview' : 'YouWare Production') :
              isLocalDevelopment ? 'Local Development' :
              'Unknown Environment',
    config
  });

  return config;
}

/**
 * globalThis.ywConfigの存在確認と取得（line_art_generator対応）
 */
export function getYouWareConfig(): any {
  try {
    // YouWare環境ではglobalThis.ywConfigが利用可能
    if (typeof globalThis !== 'undefined' && globalThis.ywConfig) {
      const config = globalThis.ywConfig;

      // line_art_generatorが存在しない場合は補完
      if (config.ai_config && !config.ai_config.line_art_generator) {
        console.log('⚠️ line_art_generator not found, creating fallback');
        config.ai_config.line_art_generator = {
          model: 'nano-banana',
          prompt_template: (params: any) =>
            `Generate a black and white line drawing from a 45° angle: ${params.locationContext}`,
          response_format: 'b64_json',
          n: 1
        };
      }

      console.log('✅ YouWare Config Found:', config);
      return config;
    }

    // window経由でも確認
    if (typeof window !== 'undefined' && (window as any).ywConfig) {
      const config = (window as any).ywConfig;

      // line_art_generatorが存在しない場合は補完
      if (config.ai_config && !config.ai_config.line_art_generator) {
        console.log('⚠️ line_art_generator not found, creating fallback');
        config.ai_config.line_art_generator = {
          model: 'nano-banana',
          prompt_template: (params: any) =>
            `Generate a black and white line drawing from a 45° angle: ${params.locationContext}`,
          response_format: 'b64_json',
          n: 1
        };
      }

      console.log('✅ YouWare Config Found (via window):', config);
      return config;
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
 * source_code (11)の成功パターンをベースに修正
 */
export async function callYouWareAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // シンプルにAPIエンドポイントを構築
  const apiBaseUrl = 'https://api.youware.com/public/v1/ai';
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint}`;

  // source_code (11)と同じヘッダー設定
  const finalOptions: RequestInit = {
    ...options,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-YOUWARE',
      ...(options.headers || {})
    }
  };

  console.log('🚀 API Call:', {
    url: fullUrl,
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