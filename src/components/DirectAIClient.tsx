import React, { useState, useCallback } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { detectEnvironment, callYouWareAPI, getAIConfig } from '../utils/environmentDetector';

interface DirectAITestResult {
  timestamp: string;
  test: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  duration?: number;
}

export function DirectAIClient() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<DirectAITestResult[]>([]);

  const addResult = useCallback((result: DirectAITestResult) => {
    setTestResults(prev => [...prev, result]);
  }, []);

  const runDirectAITest = useCallback(async () => {
    setIsRunning(true);
    setTestResults([]);

    const env = detectEnvironment();
    console.log('🚀 DIRECT AI CLIENT TEST - Environment:', env.isYouWareProduction ? 'Production' : 'Development');

    try {
      // Test 1: Direct API Authentication Test
      const authStartTime = Date.now();
      addResult({
        timestamp: new Date().toISOString(),
        test: 'Direct API Authentication',
        status: 'info',
        message: `Testing direct API authentication with nano-banana model in ${env.isYouWareProduction ? 'production' : 'development'} environment...`
      });

      const authResponse = await fetch('https://api.youware.com/public/v1/ai/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-YOUWARE'
        },
        body: JSON.stringify({
          model: 'nano-banana',
          prompt: 'DIRECT AI TEST: Generate a simple red square for authentication verification. This is a test prompt to verify nano-banana model access.',
          n: 1,
          response_format: 'b64_json'
        })
      });
      
      const authDuration = Date.now() - authStartTime;
      
      if (authResponse.ok) {
        try {
          const authData = await authResponse.json();
          addResult({
            timestamp: new Date().toISOString(),
            test: 'Direct API Authentication',
            status: 'success',
            message: `✅ AUTHENTICATION SUCCESS! nano-banana model responded correctly`,
            details: {
              status: authResponse.status,
              statusText: authResponse.statusText,
              hasImageData: !!(authData?.data?.[0]),
              imageFormat: authData?.data?.[0]?.b64_json ? 'base64' : authData?.data?.[0]?.url ? 'url' : 'unknown',
              responseKeys: Object.keys(authData || {}),
              headers: Object.fromEntries(authResponse.headers.entries())
            },
            duration: authDuration
          });
          
          // Test 2: Image Data Validation
          if (authData?.data?.[0]) {
            const imageData = authData.data[0];
            const hasValidImage = imageData.b64_json && imageData.b64_json.length > 100;
            
            addResult({
              timestamp: new Date().toISOString(),
              test: 'Image Generation Validation',
              status: hasValidImage ? 'success' : 'warning',
              message: hasValidImage ? 
                '✅ Valid image data received from nano-banana' : 
                '⚠️ Image data received but may be incomplete',
              details: {
                imageDataSize: imageData.b64_json?.length || 0,
                hasBase64: !!imageData.b64_json,
                hasUrl: !!imageData.url,
                imagePreview: imageData.b64_json ? 
                  `data:image/png;base64,${imageData.b64_json.substring(0, 100)}...` : 
                  'No base64 data'
              }
            });
          }
          
        } catch (dataError) {
          addResult({
            timestamp: new Date().toISOString(),
            test: 'Direct API Response Parsing',
            status: 'warning',
            message: `Response received but parsing failed: ${(dataError as Error).message}`,
            details: { error: dataError },
            duration: authDuration
          });
        }
        
      } else {
        // Authentication failed - detailed error analysis
        let errorDetails;
        try {
          const errorText = await authResponse.text();
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { rawError: errorText };
          }
        } catch {
          errorDetails = { message: 'Could not read error response' };
        }
        
        addResult({
          timestamp: new Date().toISOString(),
          test: 'Direct API Authentication',
          status: 'error',
          message: `❌ AUTHENTICATION FAILED: ${authResponse.status} ${authResponse.statusText}`,
          details: {
            status: authResponse.status,
            statusText: authResponse.statusText,
            errorDetails: errorDetails,
            headers: Object.fromEntries(authResponse.headers.entries()),
            possibleCauses: authResponse.status === 401 ? 
              ['MCP AI SDK tool not enabled', 'Invalid API key', 'Authentication token expired'] :
            authResponse.status === 403 ? 
              ['nano-banana model access denied', 'Quota exceeded', 'Account restrictions'] :
            authResponse.status === 404 ? 
              ['nano-banana model not found', 'API endpoint incorrect'] :
              ['Network issues', 'Server problems', 'Configuration errors']
          },
          duration: authDuration
        });
      }
      
      // Test 3: Alternative Direct Authentication Methods
      const altMethods = [
        { 
          name: 'OpenAI-Compatible Headers', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-YOUWARE',
            'OpenAI-Beta': 'assistants=v1'
          } 
        },
        { 
          name: 'YouWare-Specific Headers', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-YOUWARE',
            'X-YouWare-Client': 'direct-ai-client',
            'X-YouWare-Model': 'nano-banana'
          } 
        }
      ];
      
      for (const method of altMethods) {
        const altStartTime = Date.now();
        try {
          const altResponse = await fetch('https://api.youware.com/public/v1/ai/models', {
            method: 'GET',
            headers: method.headers
          });
          
          const altDuration = Date.now() - altStartTime;
          
          addResult({
            timestamp: new Date().toISOString(),
            test: `Alternative Auth: ${method.name}`,
            status: altResponse.ok ? 'success' : 'error',
            message: `${method.name}: ${altResponse.status} ${altResponse.statusText}`,
            details: {
              method: method.name,
              status: altResponse.status,
              headers: method.headers,
              responseHeaders: Object.fromEntries(altResponse.headers.entries())
            },
            duration: altDuration
          });
          
        } catch (altError) {
          addResult({
            timestamp: new Date().toISOString(),
            test: `Alternative Auth: ${method.name}`,
            status: 'error',
            message: `${method.name} failed: ${(altError as Error).message}`,
            details: { method: method.name, error: altError }
          });
        }
      }
      
      // Test 4: Environment and Configuration Analysis
      addResult({
        timestamp: new Date().toISOString(),
        test: 'Environment Analysis',
        status: 'info',
        message: 'Environment and configuration analysis completed',
        details: {
          ywConfigExists: typeof globalThis.ywConfig !== 'undefined',
          ywConfigAI: (globalThis.ywConfig as any)?.ai_config,
          currentURL: window.location.href,
          userAgent: navigator.userAgent,
          onlineStatus: navigator.onLine,
          timestamp: new Date().toISOString(),
          recommendation: authResponse?.ok ? 
            'DIRECT API ACCESS WORKING - AI SDK dependency issues identified' :
            'DIRECT API ACCESS FAILED - MCP configuration or authentication issues'
        }
      });
      
    } catch (globalError) {
      addResult({
        timestamp: new Date().toISOString(),
        test: 'Direct AI Client Test',
        status: 'error',
        message: `Test execution failed: ${(globalError as Error).message}`,
        details: { error: globalError }
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Zap className="h-8 w-8 text-orange-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Direct AI Client</h2>
            <p className="text-sm text-gray-600">AI SDK依存性をバイパスした直接API接続テスト</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={runDirectAITest}
          disabled={isRunning}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
        >
          <Zap className="h-5 w-5" />
          <span>
            {isRunning ? 'Direct AI テスト実行中...' : 'Direct AI 認証テスト開始'}
          </span>
        </button>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>Direct AI テスト結果</span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                {testResults.length} テスト実行済
              </span>
            </h3>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {testResults.map((result, index) => (
                <div 
                  key={index}
                  className={`border rounded-lg p-3 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {result.test}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {result.message}
                        </div>
                        {result.duration && (
                          <div className="text-xs text-gray-500 mt-1">
                            実行時間: {result.duration}ms
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        詳細を表示
                      </summary>
                      <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}