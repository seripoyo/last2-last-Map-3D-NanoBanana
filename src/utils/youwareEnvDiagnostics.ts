/**
 * YouWare Platform-Specific Environment Variable Diagnostics
 * 
 * Addresses the specific issue where:
 * - Billing and domains are confirmed working
 * - The problem is likely YouWare platform environment variable handling
 * - Need to test different ways YouWare exposes environment variables
 */

import { DebugLog } from '../hooks/useDebugLogger';

export interface YouWareEnvDiagnosticResult {
  platform: 'YouWare' | 'Local' | 'Other';
  environmentAccess: {
    viteMetaEnv: boolean;
    processEnv: boolean;
    windowEnv: boolean;
    metaAttributes: boolean;
    scriptAttributes: boolean;
  };
  apiKeyAccess: {
    viteApiKey: string | null;
    processApiKey: string | null;
    windowApiKey: string | null;
    metaApiKey: string | null;
    scriptApiKey: string | null;
  };
  issues: string[];
  recommendations: string[];
  debugInfo: any;
}

export class YouWareEnvDiagnostics {
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;

  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  /**
   * Comprehensive environment variable diagnostics for YouWare platform
   */
  async diagnoseEnvironment(): Promise<YouWareEnvDiagnosticResult> {
    this.addLog('info', 'YouWareEnvDiagnostics', 'Starting YouWare environment variable diagnostics');

    const result: YouWareEnvDiagnosticResult = {
      platform: this.detectPlatform(),
      environmentAccess: {
        viteMetaEnv: false,
        processEnv: false,
        windowEnv: false,
        metaAttributes: false,
        scriptAttributes: false,
      },
      apiKeyAccess: {
        viteApiKey: null,
        processApiKey: null,
        windowApiKey: null,
        metaApiKey: null,
        scriptApiKey: null,
      },
      issues: [],
      recommendations: [],
      debugInfo: {}
    };

    // Test 1: Vite import.meta.env access (standard method)
    try {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        result.environmentAccess.viteMetaEnv = true;
        result.apiKeyAccess.viteApiKey = metaEnv.VITE_GOOGLE_MAPS_API_KEY || null;
        result.debugInfo.viteEnv = {
          allViteVars: Object.keys(metaEnv).filter(key => key.startsWith('VITE_')),
          mode: metaEnv.MODE,
          base: metaEnv.BASE_URL,
          prod: metaEnv.PROD,
          dev: metaEnv.DEV
        };
      }
    } catch (error) {
      result.issues.push('Cannot access import.meta.env (unusual for Vite apps)');
      result.debugInfo.viteEnvError = (error as Error).message;
    }

    // Test 2: Process environment (might work in some YouWare configurations)
    try {
      if (typeof process !== 'undefined' && process.env) {
        result.environmentAccess.processEnv = true;
        result.apiKeyAccess.processApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || null;
        result.debugInfo.processEnv = {
          nodeEnv: process.env.NODE_ENV,
          viteVars: Object.keys(process.env).filter(key => key.startsWith('VITE_'))
        };
      }
    } catch (error) {
      // Expected in browser environments
      result.debugInfo.processEnvNote = 'process.env not available in browser (normal)';
    }

    // Test 3: Window-based environment (YouWare-specific)
    try {
      const windowEnv = (window as any).__ENV__ || (window as any).__VITE_ENV__ || (window as any).env;
      if (windowEnv) {
        result.environmentAccess.windowEnv = true;
        result.apiKeyAccess.windowApiKey = windowEnv.VITE_GOOGLE_MAPS_API_KEY || null;
        result.debugInfo.windowEnv = windowEnv;
      }
    } catch (error) {
      result.debugInfo.windowEnvError = (error as Error).message;
    }

    // Test 4: Meta tag attributes (YouWare might inject this way)
    try {
      const metaTags = Array.from(document.querySelectorAll('meta[name*="api"], meta[name*="google"], meta[name*="maps"]'));
      if (metaTags.length > 0) {
        result.environmentAccess.metaAttributes = true;
        const apiKeyMeta = document.querySelector('meta[name="google-maps-api-key"], meta[name="gmaps-api-key"], meta[name="vite-google-maps-api-key"]') as HTMLMetaElement;
        if (apiKeyMeta) {
          result.apiKeyAccess.metaApiKey = apiKeyMeta.content;
        }
        result.debugInfo.metaTags = metaTags.map(tag => ({
          name: tag.getAttribute('name'),
          content: tag.getAttribute('content')
        }));
      }
    } catch (error) {
      result.debugInfo.metaTagsError = (error as Error).message;
    }

    // Test 5: Script tag attributes (YouWare might embed API key in script)
    try {
      const scriptTags = Array.from(document.querySelectorAll('script[data-api-key], script[data-google-maps-key]'));
      if (scriptTags.length > 0) {
        result.environmentAccess.scriptAttributes = true;
        const apiKeyScript = scriptTags.find(script => 
          script.getAttribute('data-api-key') || script.getAttribute('data-google-maps-key')
        );
        if (apiKeyScript) {
          result.apiKeyAccess.scriptApiKey = 
            apiKeyScript.getAttribute('data-api-key') || 
            apiKeyScript.getAttribute('data-google-maps-key');
        }
        result.debugInfo.scriptTags = scriptTags.map(script => ({
          dataApiKey: script.getAttribute('data-api-key'),
          dataGoogleMapsKey: script.getAttribute('data-google-maps-key'),
          src: script.getAttribute('src')
        }));
      }
    } catch (error) {
      result.debugInfo.scriptTagsError = (error as Error).message;
    }

    // Test 6: Check for YouWare-specific global variables
    try {
      const youwareGlobals = (window as any).__YOUWARE__ || (window as any).YOUWARE || (window as any).__CONFIG__;
      if (youwareGlobals) {
        result.debugInfo.youwareGlobals = youwareGlobals;
        if (youwareGlobals.googleMapsApiKey || youwareGlobals.GOOGLE_MAPS_API_KEY) {
          result.apiKeyAccess.windowApiKey = youwareGlobals.googleMapsApiKey || youwareGlobals.GOOGLE_MAPS_API_KEY;
        }
      }
    } catch (error) {
      result.debugInfo.youwareGlobalsError = (error as Error).message;
    }

    // Analyze results and generate issues/recommendations
    this.analyzeResults(result);

    this.addLog('info', 'YouWareEnvDiagnostics', 'Environment diagnostics completed', result);
    return result;
  }

  /**
   * Test multiple API key injection methods for YouWare
   */
  async testYouWareApiKeyInjection(apiKey: string): Promise<{
    success: boolean;
    methods: Array<{ method: string; success: boolean; error?: string }>;
  }> {
    this.addLog('info', 'YouWareEnvDiagnostics', 'Testing API key injection methods for YouWare');

    const methods: Array<{ method: string; success: boolean; error?: string }> = [];

    // Method 1: Direct window global
    try {
      (window as any).__GOOGLE_MAPS_API_KEY__ = apiKey;
      methods.push({ method: 'window.__GOOGLE_MAPS_API_KEY__', success: true });
    } catch (error) {
      methods.push({ method: 'window.__GOOGLE_MAPS_API_KEY__', success: false, error: (error as Error).message });
    }

    // Method 2: Environment object on window
    try {
      (window as any).__ENV__ = { 
        ...(window as any).__ENV__, 
        VITE_GOOGLE_MAPS_API_KEY: apiKey 
      };
      methods.push({ method: 'window.__ENV__.VITE_GOOGLE_MAPS_API_KEY', success: true });
    } catch (error) {
      methods.push({ method: 'window.__ENV__.VITE_GOOGLE_MAPS_API_KEY', success: false, error: (error as Error).message });
    }

    // Method 3: Meta tag injection
    try {
      let metaTag = document.querySelector('meta[name="google-maps-api-key"]') as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'google-maps-api-key';
        document.head.appendChild(metaTag);
      }
      metaTag.content = apiKey;
      methods.push({ method: 'meta[name="google-maps-api-key"]', success: true });
    } catch (error) {
      methods.push({ method: 'meta[name="google-maps-api-key"]', success: false, error: (error as Error).message });
    }

    // Method 4: Script data attribute
    try {
      let scriptTag = document.querySelector('script[data-google-maps-api-key]') as HTMLScriptElement;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('data-google-maps-api-key', apiKey);
        document.head.appendChild(scriptTag);
      } else {
        scriptTag.setAttribute('data-google-maps-api-key', apiKey);
      }
      methods.push({ method: 'script[data-google-maps-api-key]', success: true });
    } catch (error) {
      methods.push({ method: 'script[data-google-maps-api-key]', success: false, error: (error as Error).message });
    }

    // Method 5: LocalStorage (fallback)
    try {
      localStorage.setItem('GOOGLE_MAPS_API_KEY', apiKey);
      methods.push({ method: 'localStorage.GOOGLE_MAPS_API_KEY', success: true });
    } catch (error) {
      methods.push({ method: 'localStorage.GOOGLE_MAPS_API_KEY', success: false, error: (error as Error).message });
    }

    const successCount = methods.filter(m => m.success).length;
    this.addLog('info', 'YouWareEnvDiagnostics', `API key injection test completed: ${successCount}/${methods.length} methods successful`, { methods });

    return {
      success: successCount > 0,
      methods
    };
  }

  /**
   * Create a YouWare-compatible API key accessor
   */
  createYouWareApiKeyAccessor(): () => string | null {
    return () => {
      // Try multiple sources in order of preference
      const sources = [
        // Standard Vite
        () => (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY,
        // YouWare window globals
        () => (window as any).__GOOGLE_MAPS_API_KEY__,
        () => (window as any).__ENV__?.VITE_GOOGLE_MAPS_API_KEY,
        () => (window as any).YOUWARE?.googleMapsApiKey,
        () => (window as any).__CONFIG__?.GOOGLE_MAPS_API_KEY,
        // Meta tags
        () => document.querySelector('meta[name="google-maps-api-key"]')?.getAttribute('content'),
        () => document.querySelector('meta[name="gmaps-api-key"]')?.getAttribute('content'),
        // Script data attributes
        () => document.querySelector('script[data-google-maps-api-key]')?.getAttribute('data-google-maps-api-key'),
        // LocalStorage fallback
        () => localStorage.getItem('GOOGLE_MAPS_API_KEY'),
        // Fallback to hardcoded demo key
        () => 'AIzaSyB9ZWlR7NRnN0znuLZuNKfaimKuUaMmHNc'
      ];

      for (const source of sources) {
        try {
          const apiKey = source();
          if (apiKey && typeof apiKey === 'string' && apiKey.length > 10) {
            this.addLog('debug', 'YouWareEnvDiagnostics', 'API key found via source', { 
              sourceIndex: sources.indexOf(source),
              keyLength: apiKey.length 
            });
            return apiKey;
          }
        } catch (error) {
          // Continue to next source
        }
      }

      this.addLog('warn', 'YouWareEnvDiagnostics', 'No valid API key found in any source');
      return null;
    };
  }

  /**
   * Test YouWare platform constraints
   */
  async testYouWarePlatformConstraints(): Promise<{
    csp: { restricted: boolean; details?: string };
    cors: { restricted: boolean; details?: string };
    networking: { restricted: boolean; details?: string };
    scriptLoading: { restricted: boolean; details?: string };
  }> {
    const results = {
      csp: { restricted: false },
      cors: { restricted: false },
      networking: { restricted: false },
      scriptLoading: { restricted: false }
    };

    // Test CSP restrictions
    try {
      eval('console.log("CSP test")'); // This will fail if strict CSP
      results.csp = { restricted: false, details: 'eval() allowed' };
    } catch (error) {
      results.csp = { restricted: true, details: 'eval() blocked by CSP - may affect Maps API' };
    }

    // Test CORS
    try {
      await fetch('https://maps.googleapis.com/maps/api/js?key=test', { method: 'HEAD', mode: 'no-cors' });
      results.cors = { restricted: false, details: 'Can reach Google Maps API' };
    } catch (error) {
      results.cors = { restricted: true, details: `CORS error: ${(error as Error).message}` };
    }

    // Test script loading
    try {
      const testScript = document.createElement('script');
      testScript.src = 'data:text/javascript,console.log("test")';
      document.head.appendChild(testScript);
      document.head.removeChild(testScript);
      results.scriptLoading = { restricted: false, details: 'Dynamic script loading allowed' };
    } catch (error) {
      results.scriptLoading = { restricted: true, details: `Script loading restricted: ${(error as Error).message}` };
    }

    return results;
  }

  private detectPlatform(): 'YouWare' | 'Local' | 'Other' {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Enhanced YouWare detection including UUID-based subdomains
    const isYouWareComDomain = hostname.includes('youware.com') || hostname.endsWith('youware.com');
    const isYouWareAppDomain = hostname.includes('youware.app') || hostname.endsWith('youware.app');
    const isYouWareUUIDSubdomain = this.isYouWareUUIDSubdomain(hostname);
    const isYouWareDomain = isYouWareComDomain || isYouWareAppDomain || isYouWareUUIDSubdomain;
    
    const isYouWarePath = pathname.includes('/editor/') || 
                         pathname.includes('/project/') ||
                         pathname.includes('/app/');
    
    if (isYouWareDomain || isYouWarePath) {
      this.addLog('debug', 'YouWareEnvDiagnostics', 'YouWare platform detected', {
        hostname,
        pathname,
        isYouWareDomain,
        isYouWarePath
      });
      return 'YouWare';
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'Local';
    }
    
    return 'Other';
  }

  private isYouWareUUIDSubdomain(hostname: string): boolean {
    // Pattern: UUID--TIMESTAMP--ID.app.yourware.app
    const uuidSubdomainPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--\d+--[0-9a-f]+\.app\.yourware\.app$/i;
    const generalSubdomainPattern = /\.app\.yourware\.app$/i;
    
    return uuidSubdomainPattern.test(hostname) || generalSubdomainPattern.test(hostname);
  }

  private analyzeResults(result: YouWareEnvDiagnosticResult): void {
    const { environmentAccess, apiKeyAccess, platform } = result;

    // Check if any API key was found
    const hasApiKey = Object.values(apiKeyAccess).some(key => key && key.length > 10);
    
    if (!hasApiKey) {
      result.issues.push('No valid Google Maps API key found in any environment source');
      
      if (platform === 'YouWare') {
        result.recommendations.push('YouWare Platform: Try setting API key via multiple methods (see test results)');
        result.recommendations.push('Check if YouWare requires specific configuration format');
        result.recommendations.push('Verify API key is included in build process');
      }
    }

    // Check environment access
    if (!environmentAccess.viteMetaEnv) {
      result.issues.push('Standard Vite environment variables not accessible');
      result.recommendations.push('Check Vite configuration and build process');
    }

    // Platform-specific recommendations
    if (platform === 'YouWare') {
      result.recommendations.push('Use the createYouWareApiKeyAccessor() for robust API key access');
      result.recommendations.push('Test API key injection methods with testYouWareApiKeyInjection()');
      result.recommendations.push('Verify YouWare build includes environment variables');
    }

    // Check for partial access
    const accessMethods = Object.values(environmentAccess).filter(Boolean).length;
    if (accessMethods > 0 && accessMethods < 3) {
      result.issues.push('Limited environment variable access - may indicate platform restrictions');
    }
  }
}

/**
 * Quick diagnostic function for immediate use
 */
export async function quickYouWareEnvDiagnose(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): Promise<YouWareEnvDiagnosticResult> {
  const diagnostics = new YouWareEnvDiagnostics(addLogFunction);
  return await diagnostics.diagnoseEnvironment();
}

/**
 * Utility to create a robust API key getter for YouWare
 */
export function createRobustApiKeyGetter(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): () => string | null {
  const diagnostics = new YouWareEnvDiagnostics(addLogFunction);
  return diagnostics.createYouWareApiKeyAccessor();
}