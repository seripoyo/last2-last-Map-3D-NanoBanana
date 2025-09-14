import { useState, useCallback, useEffect } from 'react';
import { Bug, Download, Play, X, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface DebugInfo {
  timestamp: string;
  environment: {
    host: string;
    protocol: string;
    userAgent: string;
    screenResolution: string;
    timeZone: string;
  };
  authentication: {
    currentToken: string | null;
    tokenSource: string;
    ywConfigStatus: {
      exists: boolean;
      hasAiConfig: boolean;
      availableScenes: string[];
      configuredModels: Record<string, string>;
    };
    envVariables: Record<string, any>;
  };
  apiTests: {
    youwareApi: {
      endpoint: string;
      status: 'pending' | 'success' | 'error';
      statusCode?: number;
      message?: string;
      responseHeaders?: Record<string, string>;
      latency?: number;
    };
    googleMaps: {
      placesApiStatus: boolean;
      geocodingApiStatus: boolean;
      mapsJsApiStatus: boolean;
      apiKey: string;
    };
    nanoBanana: {
      modelAvailable: boolean;
      endpoint: string;
      expectedAuth: string;
    };
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Check if debug mode should be enabled
function isDebugEnabled(): boolean {
  // ALWAYS ENABLED BY DEFAULT IN ALL SITUATIONS
  // Users can still hide it using the toggle button or Ctrl+Shift+D

  // Check if user explicitly disabled it via localStorage
  if (localStorage.getItem('debugMode') === 'false') {
    return false;
  }

  // Otherwise, always enable debug mode
  return true;
}

// Check which environment we're running in
function getEnvironmentType(): string {
  const host = window.location.hostname;
  const pathname = window.location.pathname;

  if (host.includes('youware.app') && pathname.startsWith('/project')) {
    return 'YouWare App Project';
  }
  if (host.includes('youware.com') && pathname.startsWith('/editor')) {
    return 'YouWare Editor';
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'Local Development';
  }
  if (host.includes('youware')) {
    return 'YouWare Platform';
  }
  return 'Production';
}

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(isDebugEnabled);
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Toggle debug mode visibility
  const toggleDebugMode = useCallback(() => {
    const newState = !isVisible;
    setIsVisible(newState);
    // Store the opposite - if visible is false, store 'false' to disable
    localStorage.setItem('debugMode', newState.toString());

    if (!newState) {
      setIsOpen(false);
    }
  }, [isVisible]);

  // Keyboard shortcut for debug mode (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebugMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebugMode]);

  // Check for debug mode changes via URL
  useEffect(() => {
    const checkDebugParam = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('debug') === 'true' && !isVisible) {
        setIsVisible(true);
      }
    };

    // Check on mount and when URL changes
    checkDebugParam();
    window.addEventListener('popstate', checkDebugParam);

    return () => window.removeEventListener('popstate', checkDebugParam);
  }, [isVisible]);

  const runDebugTests = useCallback(async () => {
    setIsRunning(true);
    const info: DebugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        host: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        environmentType: getEnvironmentType(),
        pathname: window.location.pathname,
        origin: window.location.origin,
      } as any,
      authentication: {
        currentToken: null,
        tokenSource: 'not configured',
        ywConfigStatus: {
          exists: false,
          hasAiConfig: false,
          availableScenes: [],
          configuredModels: {},
        },
        envVariables: {},
      },
      apiTests: {
        youwareApi: {
          endpoint: 'https://api.youware.com/public/v1/ai/images/edits',
          status: 'pending',
        },
        googleMaps: {
          placesApiStatus: false,
          geocodingApiStatus: false,
          mapsJsApiStatus: false,
          apiKey: 'Not checked',
        },
        nanoBanana: {
          modelAvailable: false,
          endpoint: 'https://api.youware.com/public/v1/ai/images/edits',
          expectedAuth: 'Bearer token required',
        },
      },
      errors: [],
      warnings: [],
      recommendations: [],
    };

    // Check ywConfig
    if (globalThis.ywConfig) {
      info.authentication.ywConfigStatus.exists = true;
      if (globalThis.ywConfig.ai_config) {
        info.authentication.ywConfigStatus.hasAiConfig = true;
        info.authentication.ywConfigStatus.availableScenes = Object.keys(globalThis.ywConfig.ai_config);

        for (const [scene, config] of Object.entries(globalThis.ywConfig.ai_config)) {
          info.authentication.ywConfigStatus.configuredModels[scene] = (config as any).model || 'unknown';
        }
      }
    } else {
      info.errors.push('globalThis.ywConfig is not initialized');
    }

    // Check current authentication token
    const checkCurrentAuth = () => {
      // Check for hardcoded token
      const hardcodedToken = 'sk-YOUWARE';
      info.authentication.currentToken = `Bearer ${hardcodedToken}`;
      info.authentication.tokenSource = 'Hardcoded in useImageGeneration.ts:234';
      info.warnings.push('Using hardcoded token "sk-YOUWARE" which is likely invalid for production');

      // Check for environment variables
      if (import.meta.env.VITE_YOUWARE_API_KEY) {
        info.authentication.envVariables.VITE_YOUWARE_API_KEY = import.meta.env.VITE_YOUWARE_API_KEY;
        info.recommendations.push('Found VITE_YOUWARE_API_KEY in environment variables - consider using this instead of hardcoded token');
      }

      // Check for YouWare MCP authentication
      if (typeof window !== 'undefined' && (window as any).ywAuth) {
        info.authentication.envVariables.ywAuth = (window as any).ywAuth;
        info.recommendations.push('Found window.ywAuth - this might be the correct authentication method for YouWare MCP');
      }

      // Check for YouWare-specific environment
      const envType = getEnvironmentType();
      if (envType.includes('YouWare')) {
        info.recommendations.push(`Running in ${envType} environment - authentication should be handled automatically by the platform`);
      }
    };

    checkCurrentAuth();

    // Test YouWare API
    try {
      const testYouwareApi = async () => {
        const startTime = Date.now();

        // Create a minimal test request
        const formData = new FormData();
        formData.append('model', 'nano-banana');
        formData.append('prompt', 'Test connection');
        formData.append('response_format', 'b64_json');

        // Create a dummy image for testing
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, 10, 10);
        }

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png');
        });

        formData.append('image', new File([blob], 'test.png', { type: 'image/png' }));

        try {
          const response = await fetch('https://api.youware.com/public/v1/ai/images/edits', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hardcodedToken}`,
            },
            body: formData,
          });

          const latency = Date.now() - startTime;

          info.apiTests.youwareApi.status = response.ok ? 'success' : 'error';
          info.apiTests.youwareApi.statusCode = response.status;
          info.apiTests.youwareApi.latency = latency;

          // Collect response headers
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          info.apiTests.youwareApi.responseHeaders = headers;

          if (!response.ok) {
            const errorText = await response.text();
            try {
              const errorData = JSON.parse(errorText);
              info.apiTests.youwareApi.message = errorData.error?.message || errorText;

              // Analyze the error
              if (response.status === 401) {
                info.errors.push('401 Unauthorized: The API key "sk-YOUWARE" is invalid');
                info.recommendations.push('You need a valid YouWare API key. This should be obtained from your YouWare project settings.');
                info.recommendations.push('For YouWare MCP projects, authentication is usually handled automatically through the MCP context.');
              } else if (response.status === 403) {
                info.errors.push('403 Forbidden: Access denied to the API');
                info.recommendations.push('Check if your API key has the necessary permissions for image generation.');
              }
            } catch {
              info.apiTests.youwareApi.message = errorText;
            }
          } else {
            info.apiTests.youwareApi.message = 'Connection successful';
          }
        } catch (error) {
          info.apiTests.youwareApi.status = 'error';
          info.apiTests.youwareApi.message = error instanceof Error ? error.message : 'Network error';
          info.errors.push(`Failed to connect to YouWare API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      await testYouwareApi();
    } catch (error) {
      info.errors.push(`YouWare API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check Google Maps APIs
    if (typeof google !== 'undefined' && google.maps) {
      info.apiTests.googleMaps.mapsJsApiStatus = true;

      if (google.maps.places) {
        info.apiTests.googleMaps.placesApiStatus = true;
      }

      // Check for API key
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src.includes('maps.googleapis.com')) {
          const keyMatch = src.match(/key=([^&]+)/);
          if (keyMatch) {
            info.apiTests.googleMaps.apiKey = keyMatch[1].substring(0, 10) + '...';
          }
        }
      }
    } else {
      info.errors.push('Google Maps API not loaded');
    }

    // Check NanoBanana model availability
    if (info.authentication.ywConfigStatus.configuredModels) {
      info.apiTests.nanoBanana.modelAvailable = Object.values(info.authentication.ywConfigStatus.configuredModels)
        .some(model => model === 'nano-banana');
    }

    // Add final recommendations based on findings
    if (info.errors.length === 0 && info.apiTests.youwareApi.status === 'success') {
      info.recommendations.push('All systems operational - API connections are working correctly');
    } else {
      if (info.apiTests.youwareApi.statusCode === 401) {
        info.recommendations.push('IMPORTANT: For production deployment on YouWare:');
        info.recommendations.push('1. Remove the hardcoded "sk-YOUWARE" token from useImageGeneration.ts');
        info.recommendations.push('2. YouWare MCP should automatically inject authentication through the runtime context');
        info.recommendations.push('3. Consider using environment variables for local development (VITE_YOUWARE_API_KEY)');
        info.recommendations.push('4. Check if your YouWare project has the necessary AI capabilities enabled');
      }
    }

    setDebugInfo(info);
    setIsRunning(false);
  }, []);

  const downloadDebugReport = useCallback(() => {
    if (!debugInfo) return;

    const report = {
      ...debugInfo,
      recommendations: [
        '=== AUTHENTICATION SOLUTION ===',
        'The current implementation uses a hardcoded token "sk-YOUWARE" which is invalid.',
        '',
        'FOR PRODUCTION (YouWare MCP):',
        '1. Remove hardcoded authentication from useImageGeneration.ts line 234',
        '2. YouWare MCP runtime should provide authentication automatically',
        '3. Check with YouWare documentation for proper MCP authentication flow',
        '',
        'FOR LOCAL DEVELOPMENT:',
        '1. Set VITE_YOUWARE_API_KEY in your .env file',
        '2. Update useImageGeneration.ts to use: import.meta.env.VITE_YOUWARE_API_KEY',
        '',
        ...debugInfo.recommendations,
      ],
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [debugInfo]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Don't render anything if debug mode is disabled
  if (!isVisible) {
    // Show a small indicator that debug mode is available
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={toggleDebugMode}
          className="bg-gray-200 text-gray-500 p-1 rounded opacity-30 hover:opacity-100 transition-opacity"
          title="Enable Debug Mode (Ctrl+Shift+D)"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Debug Button */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Open Debug Panel"
        >
          <Bug className="w-5 h-5" />
        </button>
        <button
          onClick={toggleDebugMode}
          className="bg-gray-600 text-white p-2 rounded-full shadow-lg hover:bg-gray-500 transition-colors text-xs"
          title="Hide Debug Mode (Ctrl+Shift+D)"
        >
          <Eye className="w-3 h-3" />
        </button>
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  Debug Panel - YouWare Authentication & API Status
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Environment: {getEnvironmentType()} | Host: {window.location.hostname}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {!debugInfo ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Click "Run Debug Tests" to analyze authentication and API connections
                  </p>
                  <button
                    onClick={runDebugTests}
                    disabled={isRunning}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-4 h-4" />
                    {isRunning ? 'Running Tests...' : 'Run Debug Tests'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Authentication Status */}
                  <div>
                    <h3 className="font-semibold mb-2">Authentication Status</h3>
                    <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Current Token:</span>{' '}
                        <code className="bg-gray-200 px-1 rounded">{debugInfo.authentication.currentToken}</code>
                      </div>
                      <div>
                        <span className="font-medium">Token Source:</span>{' '}
                        <span className="text-orange-600">{debugInfo.authentication.tokenSource}</span>
                      </div>
                      <div>
                        <span className="font-medium">Environment Type:</span>{' '}
                        <span className="text-blue-600">{debugInfo.environment.environmentType}</span>
                      </div>
                      <div>
                        <span className="font-medium">ywConfig Status:</span>{' '}
                        {debugInfo.authentication.ywConfigStatus.exists ? (
                          <span className="text-green-600">Loaded</span>
                        ) : (
                          <span className="text-red-600">Not Loaded</span>
                        )}
                      </div>
                      {debugInfo.authentication.ywConfigStatus.availableScenes.length > 0 && (
                        <div>
                          <span className="font-medium">AI Scenes:</span>{' '}
                          {debugInfo.authentication.ywConfigStatus.availableScenes.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Tests */}
                  <div>
                    <h3 className="font-semibold mb-2">API Connection Tests</h3>
                    <div className="space-y-2">
                      {/* YouWare API */}
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(debugInfo.apiTests.youwareApi.status)}
                          <span className="font-medium">YouWare API</span>
                          {debugInfo.apiTests.youwareApi.statusCode && (
                            <span className={`text-sm ${debugInfo.apiTests.youwareApi.statusCode === 401 ? 'text-red-600' : ''}`}>
                              (Status: {debugInfo.apiTests.youwareApi.statusCode})
                            </span>
                          )}
                        </div>
                        {debugInfo.apiTests.youwareApi.message && (
                          <div className="text-sm text-gray-600 ml-6">
                            {debugInfo.apiTests.youwareApi.message}
                          </div>
                        )}
                        {debugInfo.apiTests.youwareApi.latency && (
                          <div className="text-sm text-gray-500 ml-6">
                            Latency: {debugInfo.apiTests.youwareApi.latency}ms
                          </div>
                        )}
                      </div>

                      {/* Google Maps */}
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          {debugInfo.apiTests.googleMaps.mapsJsApiStatus ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">Google Maps API</span>
                        </div>
                        <div className="text-sm text-gray-600 ml-6 space-y-1">
                          <div>Maps JS: {debugInfo.apiTests.googleMaps.mapsJsApiStatus ? '✓' : '✗'}</div>
                          <div>Places API: {debugInfo.apiTests.googleMaps.placesApiStatus ? '✓' : '✗'}</div>
                          <div>API Key: {debugInfo.apiTests.googleMaps.apiKey}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {debugInfo.errors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-red-600">Errors</h3>
                      <div className="bg-red-50 p-3 rounded space-y-1">
                        {debugInfo.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            • {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {debugInfo.warnings.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-orange-600">Warnings</h3>
                      <div className="bg-orange-50 p-3 rounded space-y-1">
                        {debugInfo.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-orange-700">
                            • {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {debugInfo.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-blue-600">Recommendations</h3>
                      <div className="bg-blue-50 p-3 rounded space-y-1">
                        {debugInfo.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-blue-700">
                            • {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {debugInfo && (
              <div className="p-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Report generated: {new Date(debugInfo.timestamp).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runDebugTests}
                    disabled={isRunning}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Re-run Tests
                  </button>
                  <button
                    onClick={downloadDebugReport}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}