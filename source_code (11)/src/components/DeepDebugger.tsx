import React, { useState, useCallback } from 'react';
import { Download, Bug, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { loadAISdkPackages, isAISdkAvailable } from '../utils/aiSdkLoader';
import { detectEnvironment, callYouWareAPI, getAIConfig, logEnvironmentInfo } from '../utils/environmentDetector';

interface DebugResult {
  timestamp: string;
  category: string;
  test: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  duration?: number;
}

interface DeepDebugReport {
  timestamp: string;
  sessionId: string;
  environment: {
    userAgent: string;
    url: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    onlineStatus: boolean;
  };
  ywConfig: {
    exists: boolean;
    structure?: any;
    aiConfig?: any;
    errors?: string[];
  };
  aiSdk: {
    packages: any;
    connectivity: any[];
    authentication: any[];
    models: any[];
  };
  network: {
    tests: any[];
    timing: any;
  };
  errors: DebugResult[];
  warnings: DebugResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}

export function DeepDebugger() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const [debugReport, setDebugReport] = useState<DeepDebugReport | null>(null);
  const [progress, setProgress] = useState(0);

  const addResult = useCallback((result: DebugResult) => {
    setDebugResults(prev => [...prev, result]);
  }, []);

  const runDeepDebug = useCallback(async () => {
    setIsDebugging(true);
    setDebugResults([]);
    setProgress(0);

    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('🔍 DEEP DEBUG SESSION STARTED:', sessionId);

    // 環境情報を最初にログ出力
    logEnvironmentInfo();
    const env = detectEnvironment();
    console.log('🌍 Running in environment:', env.isYouWareProduction ? 'YouWare Production' : 'Development');
    
    try {
      // 1. Environment Check
      setProgress(10);
      const environmentResult = await runEnvironmentCheck();
      addResult(environmentResult);
      
      // 2. ywConfig Deep Inspection
      setProgress(20);
      const ywConfigResults = await runYwConfigInspection();
      ywConfigResults.forEach(addResult);
      
      // 3. AI SDK Package Inspection
      setProgress(30);
      const aiSdkResults = await runAiSdkInspection();
      aiSdkResults.forEach(addResult);
      
      // 4. Network Connectivity Tests
      setProgress(40);
      const networkResults = await runNetworkTests();
      networkResults.forEach(addResult);
      
      // 5. Authentication Deep Dive
      setProgress(60);
      const authResults = await runAuthenticationDeepDive();
      authResults.forEach(addResult);
      
      // 6. API Endpoint Tests
      setProgress(80);
      const apiResults = await runApiEndpointTests();
      apiResults.forEach(addResult);
      
      // 7. Model-Specific Tests
      setProgress(90);
      const modelResults = await runModelSpecificTests();
      modelResults.forEach(addResult);
      
      // Generate comprehensive report
      setProgress(100);
      const report = await generateComprehensiveReport(sessionId, startTime);
      setDebugReport(report);
      
      console.log('🎯 DEEP DEBUG COMPLETED:', {
        sessionId,
        duration: Date.now() - startTime,
        totalTests: debugResults.length,
        reportGenerated: !!report
      });
      
    } catch (error) {
      console.error('❌ Deep Debug Failed:', error);
      addResult({
        timestamp: new Date().toISOString(),
        category: 'System',
        test: 'Deep Debug Execution',
        status: 'error',
        message: `Deep debug execution failed: ${(error as Error).message}`,
        details: { error: error }
      });
    } finally {
      setIsDebugging(false);
    }
  }, [debugResults]);

  const runEnvironmentCheck = async (): Promise<DebugResult> => {
    const startTime = Date.now();
    try {
      const env = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof Storage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        webGL: !!document.createElement('canvas').getContext('webgl'),
        workers: typeof Worker !== 'undefined'
      };
      
      console.log('🌍 Environment Check:', env);
      
      return {
        timestamp: new Date().toISOString(),
        category: 'Environment',
        test: 'Browser Environment Check',
        status: 'success',
        message: 'Environment check completed successfully',
        details: env,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        category: 'Environment',
        test: 'Browser Environment Check',
        status: 'error',
        message: `Environment check failed: ${(error as Error).message}`,
        details: { error },
        duration: Date.now() - startTime
      };
    }
  };

  const runYwConfigInspection = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    const startTime = Date.now();
    
    try {
      // Check if ywConfig exists
      const ywConfigExists = typeof globalThis.ywConfig !== 'undefined';
      results.push({
        timestamp: new Date().toISOString(),
        category: 'ywConfig',
        test: 'ywConfig Existence Check',
        status: ywConfigExists ? 'success' : 'error',
        message: ywConfigExists ? 'ywConfig found in globalThis' : 'ywConfig not found in globalThis',
        details: { exists: ywConfigExists, type: typeof globalThis.ywConfig }
      });
      
      if (ywConfigExists) {
        // Deep inspection of ywConfig structure
        const config = globalThis.ywConfig;
        const configStructure = {
          keys: Object.keys(config || {}),
          hasAiConfig: !!(config as any)?.ai_config,
          aiConfigKeys: (config as any)?.ai_config ? Object.keys((config as any).ai_config) : [],
          fullStructure: JSON.parse(JSON.stringify(config, null, 2))
        };
        
        results.push({
          timestamp: new Date().toISOString(),
          category: 'ywConfig',
          test: 'ywConfig Structure Analysis',
          status: 'info',
          message: `ywConfig contains keys: ${configStructure.keys.join(', ')}`,
          details: configStructure
        });
        
        // Check AI config specifically
        if (configStructure.hasAiConfig) {
          const aiConfig = (config as any).ai_config;
          
          // Check each AI scene
          ['isometric_generator', 'hologram_generator', 'line_art_generator'].forEach(scene => {
            const sceneConfig = aiConfig[scene];
            results.push({
              timestamp: new Date().toISOString(),
              category: 'ywConfig',
              test: `AI Scene Configuration - ${scene}`,
              status: sceneConfig ? 'success' : 'error',
              message: sceneConfig ? 
                `${scene} configured with model: ${sceneConfig.model}` : 
                `${scene} configuration missing`,
              details: sceneConfig
            });
          });
        }
      }
      
      console.log('🔧 ywConfig Inspection Results:', results);
      return results;
      
    } catch (error) {
      results.push({
        timestamp: new Date().toISOString(),
        category: 'ywConfig',
        test: 'ywConfig Inspection',
        status: 'error',
        message: `ywConfig inspection failed: ${(error as Error).message}`,
        details: { error },
        duration: Date.now() - startTime
      });
      return results;
    }
  };

  const runAiSdkInspection = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    
    try {
      // Check AI SDK packages with detailed analysis
      console.log('🔍 Starting AI SDK Package Analysis...');
      const packageResults = {
        aiSdkOpenai: await checkPackage('@ai-sdk/openai'),
        ai: await checkPackage('ai'),
        zod: await checkPackage('zod')
      };
      
      const allPackagesAvailable = packageResults.aiSdkOpenai.available && 
                                  packageResults.ai.available && 
                                  packageResults.zod.available;
      
      results.push({
        timestamp: new Date().toISOString(),
        category: 'AI SDK',
        test: 'AI SDK Package Detailed Analysis',
        status: allPackagesAvailable ? 'success' : 'error',
        message: allPackagesAvailable ? 
          'All AI SDK packages successfully loaded' : 
          `Package loading issues detected: ${Object.entries(packageResults)
            .filter(([_, result]) => !result.available)
            .map(([name]) => name)
            .join(', ')}`,
        details: packageResults
      });
      
      // Enhanced AI SDK Import and Client Testing
      if (packageResults.aiSdkOpenai.available) {
        try {
          console.log('🔧 Testing @ai-sdk/openai import and client creation...');
          const { createOpenAI } = await import('@ai-sdk/openai');
          
          results.push({
            timestamp: new Date().toISOString(),
            category: 'AI SDK',
            test: 'AI SDK Import Test',
            status: 'success',
            message: 'Successfully imported @ai-sdk/openai',
            details: { 
              createOpenAI: typeof createOpenAI,
              functionAvailable: typeof createOpenAI === 'function',
              moduleDetails: packageResults.aiSdkOpenai.details
            }
          });
          
          // Test client creation with multiple configurations
          const clientConfigs = [
            { name: 'Standard Config', baseURL: 'https://api.youware.com/public/v1/ai', apiKey: 'sk-YOUWARE' },
            { name: 'Alternative Config', baseURL: 'https://api.youware.com/public/v1/ai/', apiKey: 'sk-YOUWARE' }
          ];
          
          for (const config of clientConfigs) {
            try {
              const openaiClient = createOpenAI({
                baseURL: config.baseURL,
                apiKey: config.apiKey
              });
              
              results.push({
                timestamp: new Date().toISOString(),
                category: 'AI SDK',
                test: `OpenAI Client Creation - ${config.name}`,
                status: 'success',
                message: `Successfully created OpenAI client with ${config.name}`,
                details: { 
                  clientType: typeof openaiClient,
                  config: config,
                  clientMethods: Object.getOwnPropertyNames(openaiClient).slice(0, 10)
                }
              });
              break; // Success, no need to try other configs
              
            } catch (clientError) {
              results.push({
                timestamp: new Date().toISOString(),
                category: 'AI SDK',
                test: `OpenAI Client Creation - ${config.name}`,
                status: 'error',
                message: `Failed to create OpenAI client with ${config.name}: ${(clientError as Error).message}`,
                details: { 
                  error: clientError,
                  config: config,
                  errorStack: (clientError as Error).stack?.substring(0, 300)
                }
              });
            }
          }
          
        } catch (importError) {
          results.push({
            timestamp: new Date().toISOString(),
            category: 'AI SDK',
            test: 'AI SDK Import Test',
            status: 'error',
            message: `Failed to import AI SDK despite package availability: ${(importError as Error).message}`,
            details: { 
              error: importError,
              packageDetails: packageResults.aiSdkOpenai.details,
              errorStack: (importError as Error).stack?.substring(0, 300)
            }
          });
        }
      } else {
        results.push({
          timestamp: new Date().toISOString(),
          category: 'AI SDK',
          test: 'AI SDK Import Test',
          status: 'error',
          message: '@ai-sdk/openai package not available - cannot test import',
          details: { packageResult: packageResults.aiSdkOpenai }
        });
      }
      
    } catch (error) {
      results.push({
        timestamp: new Date().toISOString(),
        category: 'AI SDK',
        test: 'AI SDK Inspection',
        status: 'error',
        message: `AI SDK inspection failed: ${(error as Error).message}`,
        details: { error }
      });
    }
    
    return results;
  };

  const runNetworkTests = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    const env = detectEnvironment();

    // Basic connectivity test using environment-aware API call
    try {
      const connectivityTest = await callYouWareAPI('/health', {
        method: 'GET'
      });
      
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Network',
        test: 'API Domain Connectivity',
        status: connectivityTest.ok ? 'success' : 'warning',
        message: `API domain responded with status: ${connectivityTest.status}`,
        details: { 
          status: connectivityTest.status, 
          statusText: connectivityTest.statusText,
          headers: Object.fromEntries(connectivityTest.headers.entries())
        }
      });
      
    } catch (networkError) {
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Network',
        test: 'API Domain Connectivity',
        status: 'error',
        message: `Network connectivity test failed: ${(networkError as Error).message}`,
        details: { error: networkError }
      });
    }
    
    // CORS test using environment-aware API call
    try {
      const corsTest = await callYouWareAPI('/models', {
        method: 'GET'
      });
      
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Network',
        test: 'CORS Configuration Test',
        status: corsTest.ok ? 'success' : 'warning',
        message: `CORS test completed with status: ${corsTest.status}`,
        details: { 
          status: corsTest.status,
          statusText: corsTest.statusText,
          corsEnabled: true
        }
      });
      
    } catch (corsError) {
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Network',
        test: 'CORS Configuration Test',
        status: 'error',
        message: `CORS test failed: ${(corsError as Error).message}`,
        details: { error: corsError }
      });
    }
    
    return results;
  };

  const runAuthenticationDeepDive = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    
    // Test different authentication methods
    const authMethods = [
      { name: 'Bearer Token', headers: { 'Authorization': 'Bearer sk-YOUWARE' } },
      { name: 'API Key Header', headers: { 'X-API-Key': 'sk-YOUWARE' } },
      { name: 'OpenAI Compatible', headers: { 'Authorization': 'Bearer sk-YOUWARE', 'Content-Type': 'application/json' } }
    ];
    
    for (const method of authMethods) {
      try {
        const authTest = await fetch('https://api.youware.com/public/v1/ai/models', {
          method: 'GET',
          headers: method.headers
        });
        
        results.push({
          timestamp: new Date().toISOString(),
          category: 'Authentication',
          test: `Auth Method: ${method.name}`,
          status: authTest.ok ? 'success' : 'error',
          message: `${method.name} authentication: ${authTest.status} ${authTest.statusText}`,
          details: { 
            method: method.name,
            status: authTest.status,
            headers: method.headers,
            responseHeaders: Object.fromEntries(authTest.headers.entries())
          }
        });
        
        if (authTest.ok) {
          try {
            const responseData = await authTest.json();
            results.push({
              timestamp: new Date().toISOString(),
              category: 'Authentication',
              test: `${method.name} Response Data`,
              status: 'info',
              message: `Successfully parsed response data`,
              details: responseData
            });
          } catch (parseError) {
            results.push({
              timestamp: new Date().toISOString(),
              category: 'Authentication',
              test: `${method.name} Response Parsing`,
              status: 'warning',
              message: `Failed to parse response: ${(parseError as Error).message}`,
              details: { error: parseError }
            });
          }
        }
        
      } catch (authError) {
        results.push({
          timestamp: new Date().toISOString(),
          category: 'Authentication',
          test: `Auth Method: ${method.name}`,
          status: 'error',
          message: `${method.name} failed: ${(authError as Error).message}`,
          details: { method: method.name, error: authError }
        });
      }
    }
    
    return results;
  };

  const runApiEndpointTests = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    
    const endpoints = [
      { name: 'Models Endpoint', url: 'https://api.youware.com/public/v1/ai/models', method: 'GET' },
      { name: 'Image Generation Endpoint', url: 'https://api.youware.com/public/v1/ai/images/generations', method: 'POST' },
      { name: 'Health Check', url: 'https://api.youware.com/health', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const testRequest = endpoint.method === 'POST' ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-YOUWARE'
          },
          body: JSON.stringify({
            model: 'nano-banana',
            prompt: 'Test connection prompt',
            n: 1,
            response_format: 'b64_json'
          })
        } : {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer sk-YOUWARE'
          }
        };
        
        const response = await fetch(endpoint.url, testRequest);
        
        results.push({
          timestamp: new Date().toISOString(),
          category: 'API Endpoints',
          test: endpoint.name,
          status: response.ok ? 'success' : 'error',
          message: `${endpoint.name}: ${response.status} ${response.statusText}`,
          details: {
            url: endpoint.url,
            method: endpoint.method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          }
        });
        
        // Try to read response
        if (response.ok) {
          try {
            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }
            
            results.push({
              timestamp: new Date().toISOString(),
              category: 'API Endpoints',
              test: `${endpoint.name} Response`,
              status: 'info',
              message: `Response received and parsed`,
              details: { 
                responseSize: responseText.length,
                responsePreview: responseText.substring(0, 500),
                parsedData: typeof responseData === 'object' ? Object.keys(responseData) : typeof responseData
              }
            });
          } catch (responseError) {
            results.push({
              timestamp: new Date().toISOString(),
              category: 'API Endpoints',
              test: `${endpoint.name} Response Reading`,
              status: 'warning',
              message: `Failed to read response: ${(responseError as Error).message}`,
              details: { error: responseError }
            });
          }
        }
        
      } catch (endpointError) {
        results.push({
          timestamp: new Date().toISOString(),
          category: 'API Endpoints',
          test: endpoint.name,
          status: 'error',
          message: `${endpoint.name} failed: ${(endpointError as Error).message}`,
          details: { endpoint, error: endpointError }
        });
      }
    }
    
    return results;
  };

  const runModelSpecificTests = async (): Promise<DebugResult[]> => {
    const results: DebugResult[] = [];
    
    // Test nano-banana model specifically
    try {
      const nanoBananaTest = await fetch('https://api.youware.com/public/v1/ai/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-YOUWARE'
        },
        body: JSON.stringify({
          model: 'nano-banana',
          prompt: 'Deep debug test - create a simple red square',
          n: 1,
          response_format: 'b64_json'
        })
      });
      
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Model Tests',
        test: 'nano-banana Model Test',
        status: nanoBananaTest.ok ? 'success' : 'error',
        message: `nano-banana model test: ${nanoBananaTest.status} ${nanoBananaTest.statusText}`,
        details: {
          status: nanoBananaTest.status,
          statusText: nanoBananaTest.statusText,
          headers: Object.fromEntries(nanoBananaTest.headers.entries())
        }
      });
      
      if (!nanoBananaTest.ok) {
        try {
          const errorResponse = await nanoBananaTest.text();
          results.push({
            timestamp: new Date().toISOString(),
            category: 'Model Tests',
            test: 'nano-banana Error Analysis',
            status: 'error',
            message: 'Detailed error response from nano-banana',
            details: { 
              errorResponse,
              parsedError: (() => {
                try {
                  return JSON.parse(errorResponse);
                } catch {
                  return errorResponse;
                }
              })()
            }
          });
        } catch (errorParseError) {
          results.push({
            timestamp: new Date().toISOString(),
            category: 'Model Tests',
            test: 'nano-banana Error Reading',
            status: 'warning',
            message: `Could not read error response: ${(errorParseError as Error).message}`,
            details: { error: errorParseError }
          });
        }
      }
      
    } catch (modelError) {
      results.push({
        timestamp: new Date().toISOString(),
        category: 'Model Tests',
        test: 'nano-banana Model Test',
        status: 'error',
        message: `nano-banana test failed: ${(modelError as Error).message}`,
        details: { error: modelError }
      });
    }
    
    return results;
  };

  const checkPackage = async (packageName: string): Promise<{available: boolean, details: any}> => {
    const startTime = Date.now();
    try {
      console.log(`🔍 Checking package: ${packageName}`);

      let module: any;
      let loadMethod = 'unknown';

      // Use AI SDK loader for AI packages
      if (packageName === '@ai-sdk/openai' || packageName === 'ai' || packageName === 'zod') {
        const packages = await loadAISdkPackages();
        const packageKey = packageName === '@ai-sdk/openai' ? 'openai' : packageName;
        module = packages[packageKey as keyof typeof packages];
        loadMethod = 'aiSdkLoader';

        if (!module) {
          // Fallback to dynamic import if loader fails
          try {
            module = await import(/* @vite-ignore */ packageName);
            loadMethod = 'dynamicImport';
          } catch (importError) {
            throw new Error(`Failed to load ${packageName} via AI SDK loader and dynamic import`);
          }
        }
      } else {
        // Use dynamic import for other packages
        module = await import(/* @vite-ignore */ packageName);
        loadMethod = 'dynamicImport';
      }

      const details = {
        available: true,
        moduleKeys: Object.keys(module || {}),
        moduleType: typeof module,
        hasDefault: !!module?.default,
        loadTime: Date.now() - startTime,
        loadMethod,
        mainExports: packageName === '@ai-sdk/openai' ? {
          hasCreateOpenAI: typeof module?.createOpenAI === 'function'
        } : packageName === 'ai' ? {
          hasGenerateText: typeof module?.generateText === 'function',
          hasStreamText: typeof module?.streamText === 'function',
          hasGenerateObject: typeof module?.generateObject === 'function'
        } : packageName === 'zod' ? {
          hasZ: !!module?.z,
          hasZodObject: typeof module?.z?.object === 'function'
        } : {}
      };

      console.log(`✅ Package ${packageName} loaded successfully via ${loadMethod}:`, details);
      return { available: true, details };
      
    } catch (error) {
      const details = {
        available: false,
        error: (error as Error).message,
        errorType: (error as Error).name,
        loadTime: Date.now() - startTime,
        stack: (error as Error).stack?.substring(0, 500)
      };
      
      console.error(`❌ Package ${packageName} failed to load:`, details);
      return { available: false, details };
    }
  };

  const generateComprehensiveReport = async (sessionId: string, startTime: number): Promise<DeepDebugReport> => {
    const errors = debugResults.filter(r => r.status === 'error');
    const warnings = debugResults.filter(r => r.status === 'warning');
    const successes = debugResults.filter(r => r.status === 'success');
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze critical issues
    if (errors.some(e => e.category === 'ywConfig' && e.test.includes('Existence'))) {
      criticalIssues.push('ywConfig not found in globalThis - core configuration missing');
      recommendations.push('Verify yw_manifest.json exists and is properly formatted');
    }
    
    if (errors.some(e => e.category === 'Authentication')) {
      criticalIssues.push('Authentication failures detected with YouWare MCP AI SDK');
      recommendations.push('Check MCP tool enablement status in YouWare platform');
    }
    
    if (errors.some(e => e.category === 'Model Tests' && e.test.includes('nano-banana'))) {
      criticalIssues.push('nano-banana model access denied or unavailable');
      recommendations.push('Verify MCP AI SDK tool is properly enabled and has nano-banana model access');
    }
    
    if (errors.some(e => e.category === 'Network')) {
      criticalIssues.push('Network connectivity issues to YouWare API endpoints');
      recommendations.push('Check internet connection and firewall settings');
    }
    
    const report: DeepDebugReport = {
      timestamp: new Date().toISOString(),
      sessionId,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine
      },
      ywConfig: {
        exists: typeof globalThis.ywConfig !== 'undefined',
        structure: globalThis.ywConfig ? Object.keys(globalThis.ywConfig) : undefined,
        aiConfig: (globalThis.ywConfig as any)?.ai_config,
        errors: errors.filter(e => e.category === 'ywConfig').map(e => e.message)
      },
      aiSdk: {
        packages: {
          aiSdkOpenai: debugResults.find(r => r.test === 'AI SDK Package Availability')?.details?.aiSdkOpenai || false,
          ai: debugResults.find(r => r.test === 'AI SDK Package Availability')?.details?.ai || false,
          zod: debugResults.find(r => r.test === 'AI SDK Package Availability')?.details?.zod || false
        },
        connectivity: debugResults.filter(r => r.category === 'Network'),
        authentication: debugResults.filter(r => r.category === 'Authentication'),
        models: debugResults.filter(r => r.category === 'Model Tests')
      },
      network: {
        tests: debugResults.filter(r => r.category === 'Network'),
        timing: {
          totalDuration: Date.now() - startTime,
          averageResponseTime: debugResults.filter(r => r.duration).reduce((sum, r) => sum + (r.duration || 0), 0) / debugResults.filter(r => r.duration).length
        }
      },
      errors,
      warnings,
      summary: {
        totalTests: debugResults.length,
        passed: successes.length,
        failed: errors.length,
        warnings: warnings.length,
        criticalIssues,
        recommendations
      }
    };
    
    console.log('📊 COMPREHENSIVE DEBUG REPORT GENERATED:', report);
    return report;
  };

  const downloadReport = useCallback(() => {
    if (!debugReport) return;
    
    const reportJson = JSON.stringify(debugReport, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const currentDate = new Date();
    const dateString = currentDate.toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `youware-deep-debug-report-${dateString}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('📥 Debug report downloaded:', filename);
  }, [debugReport]);

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
          <Bug className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Deep Debug System</h2>
            <p className="text-sm text-gray-600">天才バックエンドエンジニア式包括診断システム</p>
          </div>
        </div>
        
        {debugReport && (
          <button
            onClick={downloadReport}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>レポートダウンロード</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <button
          onClick={runDeepDebug}
          disabled={isDebugging}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
        >
          <Zap className="h-5 w-5" />
          <span>
            {isDebugging ? '深掘りデバッグ実行中...' : 'ステップ1エラー深掘りデバッグ開始'}
          </span>
        </button>

        {isDebugging && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">診断進捗</span>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {debugResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>診断結果</span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                {debugResults.length} テスト実行済
              </span>
            </h3>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {debugResults.map((result, index) => (
                <div 
                  key={index}
                  className={`border rounded-lg p-3 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          [{result.category}] {result.test}
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

        {debugReport && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">診断サマリー</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{debugReport.summary.passed}</div>
                <div className="text-sm text-gray-600">成功</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{debugReport.summary.failed}</div>
                <div className="text-sm text-gray-600">失敗</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{debugReport.summary.warnings}</div>
                <div className="text-sm text-gray-600">警告</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{debugReport.summary.totalTests}</div>
                <div className="text-sm text-gray-600">総テスト</div>
              </div>
            </div>

            {debugReport.summary.criticalIssues.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-red-700 mb-2">🚨 重要な問題</h4>
                <ul className="list-disc list-inside space-y-1">
                  {debugReport.summary.criticalIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {debugReport.summary.recommendations.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-blue-700 mb-2">💡 推奨事項</h4>
                <ul className="list-disc list-inside space-y-1">
                  {debugReport.summary.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-600">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}