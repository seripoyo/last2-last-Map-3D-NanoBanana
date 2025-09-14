/**
 * Debug System Initializer
 * Initializes and configures the Deep Debug System
 */

interface DebugSystemConfig {
  apiKey: string;
  apiEndpoint: string;
  onLog: (level: string, message: string, details?: any) => void;
}

export const initializeDebugSystem = (config: DebugSystemConfig) => {
  const { apiKey, apiEndpoint, onLog } = config;

  // Store config globally for access
  (window as any).__deepDebugConfig = {
    apiKey,
    apiEndpoint,
    initialized: true,
    version: '1.0.0'
  };

  // Override console methods to capture logs
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  // Intercept console logs
  console.log = (...args) => {
    originalConsole.log(...args);
    if (args[0]?.toString().includes('[NanoBanana]') ||
        args[0]?.toString().includes('AI') ||
        args[0]?.toString().includes('YouWare')) {
      onLog('info', args[0], args.slice(1));
    }
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    if (args[0]?.toString().includes('API') ||
        args[0]?.toString().includes('Error') ||
        args[0]?.toString().includes('Failed')) {
      onLog('error', args[0], args.slice(1));
    }
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    onLog('warning', args[0], args.slice(1));
  };

  // Monitor network requests
  monitorNetworkRequests(config);

  // Check for YouWare environment
  checkYouWareEnvironment(onLog);

  onLog('success', 'Deep Debug System initialized', {
    apiEndpoint,
    version: '1.0.0',
    features: ['Console Interception', 'Network Monitoring', 'YouWare Detection']
  });
};

/**
 * Monitor network requests to AI endpoints
 */
const monitorNetworkRequests = (config: DebugSystemConfig) => {
  const { apiEndpoint, onLog } = config;

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const urlString = url.toString();

    // Check if this is an AI API request
    if (urlString.includes('youware') ||
        urlString.includes('/ai/') ||
        urlString.includes('nano-banana')) {

      const startTime = Date.now();
      onLog('info', `🌐 API Request: ${urlString}`, {
        method: options?.method || 'GET',
        headers: options?.headers
      });

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        onLog(
          response.ok ? 'success' : 'error',
          `API Response: ${response.status} (${duration}ms)`,
          {
            url: urlString,
            status: response.status,
            duration,
            headers: Object.fromEntries(response.headers.entries())
          }
        );

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        onLog('error', `API Request Failed (${duration}ms)`, {
          url: urlString,
          error
        });
        throw error;
      }
    }

    return originalFetch(...args);
  };
};

/**
 * Check for YouWare-specific environment configurations
 */
const checkYouWareEnvironment = (onLog: Function) => {
  const checks = {
    ywConfig: !!(window as any).ywConfig,
    ywSdk: !!(window as any).ywSdk,
    aiSdk: !!(window as any).aiSdk,
    nanoBananaConfig: !!(window as any).ywConfig?.ai_config?.isometric_generator,
    hologramConfig: !!(window as any).ywConfig?.ai_config?.hologram_generator,
    lineArtConfig: !!(window as any).ywConfig?.ai_config?.line_art_generator
  };

  const availableFeatures = Object.entries(checks)
    .filter(([_, available]) => available)
    .map(([feature]) => feature);

  if (availableFeatures.length > 0) {
    onLog('success', `YouWare features detected: ${availableFeatures.join(', ')}`, checks);
  } else {
    onLog('warning', 'No YouWare features detected', checks);
  }

  return checks;
};

/**
 * Test NanoBanana image generation
 */
export const testNanoBananaGeneration = async (
  prompt: string,
  generatorType: 'isometric_generator' | 'hologram_generator' | 'line_art_generator'
) => {
  const config = (window as any).__deepDebugConfig;
  if (!config) {
    throw new Error('Debug system not initialized');
  }

  const generatorConfig = (window as any).ywConfig?.ai_config?.[generatorType];
  if (!generatorConfig) {
    throw new Error(`Generator config not found: ${generatorType}`);
  }

  const response = await fetch(`${config.apiEndpoint}/ai/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: generatorConfig.model || 'nano-banana',
      prompt: typeof generatorConfig.prompt_template === 'function'
        ? generatorConfig.prompt_template({ locationContext: prompt })
        : prompt,
      n: generatorConfig.n || 1,
      response_format: generatorConfig.response_format || 'b64_json'
    })
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.status}`);
  }

  return await response.json();
};