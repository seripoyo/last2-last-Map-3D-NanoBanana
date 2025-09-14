/**
 * YouWare Platform Constraint Testing Utilities
 * 
 * Tests for platform-specific constraints that might prevent Google Maps API
 * from working properly on YouWare, since billing and domains are confirmed working.
 */

import { DebugLog } from '../hooks/useDebugLogger';

export interface PlatformConstraintTestResult {
  platform: 'YouWare' | 'Local' | 'Other';
  constraints: {
    csp: { restricted: boolean; details: string; level: 'none' | 'basic' | 'strict' };
    cors: { restricted: boolean; details: string; allowedOrigins: string[] };
    networking: { restricted: boolean; details: string; blockedPorts: number[] };
    scriptLoading: { restricted: boolean; details: string; allowedSources: string[] };
    storage: { restricted: boolean; details: string; availableStorage: string[] };
    javascript: { restricted: boolean; details: string; restrictedFeatures: string[] };
  };
  apiSpecific: {
    googleMapsReachable: boolean;
    apiScriptLoadable: boolean;
    dynamicScriptInjection: boolean;
    iframeEmbedding: boolean;
  };
  recommendations: string[];
  workarounds: string[];
  debugInfo: any;
}

export class YouWarePlatformTester {
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;

  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  /**
   * Run comprehensive platform constraint tests
   */
  async runPlatformTests(): Promise<PlatformConstraintTestResult> {
    this.addLog('info', 'YouWarePlatformTester', 'Starting comprehensive platform constraint testing');

    const result: PlatformConstraintTestResult = {
      platform: this.detectPlatform(),
      constraints: {
        csp: { restricted: false, details: '', level: 'none' },
        cors: { restricted: false, details: '', allowedOrigins: [] },
        networking: { restricted: false, details: '', blockedPorts: [] },
        scriptLoading: { restricted: false, details: '', allowedSources: [] },
        storage: { restricted: false, details: '', availableStorage: [] },
        javascript: { restricted: false, details: '', restrictedFeatures: [] },
      },
      apiSpecific: {
        googleMapsReachable: false,
        apiScriptLoadable: false,
        dynamicScriptInjection: false,
        iframeEmbedding: false,
      },
      recommendations: [],
      workarounds: [],
      debugInfo: {}
    };

    // Run all tests in parallel for faster execution
    await Promise.all([
      this.testCSPConstraints(result),
      this.testCORSConstraints(result),
      this.testNetworkingConstraints(result),
      this.testScriptLoadingConstraints(result),
      this.testStorageConstraints(result),
      this.testJavaScriptConstraints(result),
      this.testGoogleMapsSpecific(result),
    ]);

    // Generate platform-specific recommendations
    this.generateRecommendations(result);

    this.addLog('info', 'YouWarePlatformTester', 'Platform constraint testing completed', result);
    return result;
  }

  /**
   * Test Content Security Policy restrictions
   */
  private async testCSPConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const cspTests = [
      { name: 'eval', test: () => eval('1+1') },
      { name: 'Function constructor', test: () => new Function('return 1')() },
      { name: 'inline script', test: () => { const script = document.createElement('script'); script.innerHTML = 'console.log("test")'; return true; } },
      { name: 'external script', test: () => { const script = document.createElement('script'); script.src = 'data:text/javascript,1'; return true; } },
    ];

    const restrictedFeatures = [];
    let cspLevel = 'none';

    for (const test of cspTests) {
      try {
        test.test();
      } catch (error) {
        restrictedFeatures.push(test.name);
        if (test.name === 'eval' || test.name === 'Function constructor') {
          cspLevel = 'strict';
        } else if (cspLevel === 'none') {
          cspLevel = 'basic';
        }
      }
    }

    result.constraints.csp = {
      restricted: restrictedFeatures.length > 0,
      details: restrictedFeatures.length > 0 ? 
        `CSP blocks: ${restrictedFeatures.join(', ')}` : 
        'No CSP restrictions detected',
      level: cspLevel as any
    };

    result.debugInfo.cspTests = {
      restrictedFeatures,
      cspHeaders: this.getCSPHeaders(),
      metaCSP: this.getMetaCSP()
    };
  }

  /**
   * Test CORS constraints
   */
  private async testCORSConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const corsTests = [
      { origin: 'https://maps.googleapis.com', name: 'Google Maps API' },
      { origin: 'https://maps.google.com', name: 'Google Maps' },
      { origin: 'https://www.google.com', name: 'Google' },
      { origin: 'https://api.example.com', name: 'Generic API' },
    ];

    const corsResults = [];
    const allowedOrigins = [];

    for (const test of corsTests) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${test.origin}/`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        allowedOrigins.push(test.origin);
        corsResults.push({ ...test, allowed: true });
      } catch (error) {
        corsResults.push({ ...test, allowed: false, error: (error as Error).message });
      }
    }

    const restrictedCount = corsResults.filter(r => !r.allowed).length;

    result.constraints.cors = {
      restricted: restrictedCount > corsResults.length / 2,
      details: `${corsResults.length - restrictedCount}/${corsResults.length} origins reachable`,
      allowedOrigins
    };

    result.debugInfo.corsTests = corsResults;
  }

  /**
   * Test networking constraints
   */
  private async testNetworkingConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const portTests = [
      { port: 443, name: 'HTTPS' },
      { port: 80, name: 'HTTP' },
      { port: 8080, name: 'Alt HTTP' },
      { port: 3000, name: 'Dev Server' },
    ];

    const blockedPorts = [];
    const networkResults = [];

    // Test if we can make requests to different ports (indirectly)
    for (const test of portTests) {
      try {
        const testUrl = `${window.location.protocol}//${window.location.hostname}:${test.port}/`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        await fetch(testUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        networkResults.push({ ...test, accessible: true });
      } catch (error) {
        blockedPorts.push(test.port);
        networkResults.push({ ...test, accessible: false, error: (error as Error).message });
      }
    }

    result.constraints.networking = {
      restricted: blockedPorts.length > 0,
      details: blockedPorts.length > 0 ? 
        `Ports ${blockedPorts.join(', ')} may be blocked` : 
        'All tested ports accessible',
      blockedPorts
    };

    result.debugInfo.networkingTests = networkResults;
  }

  /**
   * Test script loading constraints
   */
  private async testScriptLoadingConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const scriptTests = [
      {
        name: 'inline script',
        test: () => {
          const script = document.createElement('script');
          script.innerHTML = 'window.__testInlineScript = true;';
          document.head.appendChild(script);
          document.head.removeChild(script);
          return !!(window as any).__testInlineScript;
        }
      },
      {
        name: 'data URL script',
        test: async () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'data:text/javascript,window.__testDataScript = true;';
            script.onload = () => resolve(!!(window as any).__testDataScript);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
            setTimeout(() => { document.head.removeChild(script); resolve(false); }, 1000);
          });
        }
      },
      {
        name: 'external CDN script',
        test: async () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js';
            script.onload = () => { document.head.removeChild(script); resolve(true); };
            script.onerror = () => { document.head.removeChild(script); resolve(false); };
            document.head.appendChild(script);
            setTimeout(() => { 
              if (script.parentNode) document.head.removeChild(script); 
              resolve(false); 
            }, 3000);
          });
        }
      }
    ];

    const scriptResults = [];
    const allowedSources = [];

    for (const test of scriptTests) {
      try {
        const result = await test.test();
        if (result) {
          allowedSources.push(test.name);
        }
        scriptResults.push({ name: test.name, allowed: result });
      } catch (error) {
        scriptResults.push({ name: test.name, allowed: false, error: (error as Error).message });
      }
    }

    const blockedCount = scriptResults.filter(r => !r.allowed).length;

    result.constraints.scriptLoading = {
      restricted: blockedCount > 0,
      details: blockedCount > 0 ? 
        `${blockedCount} script loading methods blocked` : 
        'All script loading methods work',
      allowedSources
    };

    result.debugInfo.scriptLoadingTests = scriptResults;
  }

  /**
   * Test storage constraints
   */
  private async testStorageConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const storageTests = [
      {
        name: 'localStorage',
        test: () => {
          localStorage.setItem('__test', 'test');
          const value = localStorage.getItem('__test');
          localStorage.removeItem('__test');
          return value === 'test';
        }
      },
      {
        name: 'sessionStorage',
        test: () => {
          sessionStorage.setItem('__test', 'test');
          const value = sessionStorage.getItem('__test');
          sessionStorage.removeItem('__test');
          return value === 'test';
        }
      },
      {
        name: 'cookies',
        test: () => {
          document.cookie = '__test=test; path=/';
          const hasValue = document.cookie.includes('__test=test');
          document.cookie = '__test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
          return hasValue;
        }
      },
      {
        name: 'IndexedDB',
        test: async () => {
          return new Promise((resolve) => {
            try {
              const request = indexedDB.open('__test', 1);
              request.onsuccess = () => { 
                request.result.close();
                indexedDB.deleteDatabase('__test');
                resolve(true); 
              };
              request.onerror = () => resolve(false);
            } catch {
              resolve(false);
            }
          });
        }
      }
    ];

    const storageResults = [];
    const availableStorage = [];

    for (const test of storageTests) {
      try {
        const available = await test.test();
        if (available) {
          availableStorage.push(test.name);
        }
        storageResults.push({ name: test.name, available });
      } catch (error) {
        storageResults.push({ name: test.name, available: false, error: (error as Error).message });
      }
    }

    result.constraints.storage = {
      restricted: availableStorage.length < storageTests.length,
      details: `${availableStorage.length}/${storageTests.length} storage methods available`,
      availableStorage
    };

    result.debugInfo.storageTests = storageResults;
  }

  /**
   * Test JavaScript feature constraints
   */
  private async testJavaScriptConstraints(result: PlatformConstraintTestResult): Promise<void> {
    const jsTests = [
      { name: 'setTimeout', test: () => { setTimeout(() => {}, 1); return true; } },
      { name: 'setInterval', test: () => { const id = setInterval(() => {}, 1000); clearInterval(id); return true; } },
      { name: 'Promise', test: () => { new Promise(() => {}); return true; } },
      { name: 'async/await', test: async () => { await Promise.resolve(); return true; } },
      { name: 'fetch', test: () => { return typeof fetch === 'function'; } },
      { name: 'WebSocket', test: () => { return typeof WebSocket === 'function'; } },
      { name: 'Worker', test: () => { return typeof Worker === 'function'; } },
      { name: 'postMessage', test: () => { return typeof window.postMessage === 'function'; } },
    ];

    const jsResults = [];
    const restrictedFeatures = [];

    for (const test of jsTests) {
      try {
        const works = await test.test();
        if (!works) {
          restrictedFeatures.push(test.name);
        }
        jsResults.push({ name: test.name, available: works });
      } catch (error) {
        restrictedFeatures.push(test.name);
        jsResults.push({ name: test.name, available: false, error: (error as Error).message });
      }
    }

    result.constraints.javascript = {
      restricted: restrictedFeatures.length > 0,
      details: restrictedFeatures.length > 0 ? 
        `Restricted features: ${restrictedFeatures.join(', ')}` : 
        'All JavaScript features available',
      restrictedFeatures
    };

    result.debugInfo.javascriptTests = jsResults;
  }

  /**
   * Test Google Maps API specific constraints
   */
  private async testGoogleMapsSpecific(result: PlatformConstraintTestResult): Promise<void> {
    // Test 1: Can we reach Google Maps API servers?
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://maps.googleapis.com/maps/api/js?key=test', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      result.apiSpecific.googleMapsReachable = true;
    } catch (error) {
      result.apiSpecific.googleMapsReachable = false;
      result.debugInfo.googleMapsReachabilityError = (error as Error).message;
    }

    // Test 2: Can we load the Google Maps API script?
    try {
      result.apiSpecific.apiScriptLoadable = await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=test&callback=__testCallback';
        
        (window as any).__testCallback = () => {
          resolve(true);
          delete (window as any).__testCallback;
          if (script.parentNode) script.parentNode.removeChild(script);
        };

        script.onerror = () => {
          resolve(false);
          delete (window as any).__testCallback;
          if (script.parentNode) script.parentNode.removeChild(script);
        };

        setTimeout(() => {
          resolve(false);
          delete (window as any).__testCallback;
          if (script.parentNode) script.parentNode.removeChild(script);
        }, 5000);

        document.head.appendChild(script);
      });
    } catch (error) {
      result.apiSpecific.apiScriptLoadable = false;
      result.debugInfo.scriptLoadError = (error as Error).message;
    }

    // Test 3: Can we inject scripts dynamically?
    try {
      const testScript = document.createElement('script');
      testScript.innerHTML = 'window.__dynamicScriptTest = true;';
      document.head.appendChild(testScript);
      result.apiSpecific.dynamicScriptInjection = !!(window as any).__dynamicScriptTest;
      document.head.removeChild(testScript);
      delete (window as any).__dynamicScriptTest;
    } catch (error) {
      result.apiSpecific.dynamicScriptInjection = false;
      result.debugInfo.dynamicScriptError = (error as Error).message;
    }

    // Test 4: Can we create iframes for Google Maps embedding?
    try {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.3732!2d-74.0445!3d40.6892!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        result.apiSpecific.iframeEmbedding = iframe.contentWindow !== null;
        document.body.removeChild(iframe);
      }, 1000);

      result.apiSpecific.iframeEmbedding = true;
    } catch (error) {
      result.apiSpecific.iframeEmbedding = false;
      result.debugInfo.iframeError = (error as Error).message;
    }
  }

  private detectPlatform(): 'YouWare' | 'Local' | 'Other' {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Enhanced YouWare detection including UUID-based subdomains
    const isYouWareComDomain = this.isYouWareComDomain(hostname);
    const isYouWareAppDomain = this.isYouWareAppDomain(hostname);
    const isYouWareUUIDSubdomain = this.isYouWareUUIDSubdomain(hostname);
    const isYouWareDomain = isYouWareComDomain || isYouWareAppDomain || isYouWareUUIDSubdomain;
    
    const isYouWarePath = pathname.includes('/editor/') || 
                         pathname.includes('/project/') ||
                         pathname.includes('/app/');
    
    if (isYouWareDomain || isYouWarePath) {
      this.addLog('debug', 'YouWarePlatformTester', 'YouWare platform detected', {
        hostname,
        pathname,
        isYouWareComDomain,
        isYouWareAppDomain,
        isYouWareUUIDSubdomain,
        isYouWarePath,
        detectionMethod: isYouWareUUIDSubdomain ? 'UUID-subdomain' : 
                        isYouWareComDomain ? 'youware.com-domain' :
                        isYouWareAppDomain ? 'youware.app-domain' : 'path-based'
      });
      return 'YouWare';
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return 'Local';
    }
    
    return 'Other';
  }

  /**
   * YouWare domain detection helper methods (matching domainSpecificConfig.ts)
   */
  private isYouWareComDomain(hostname: string): boolean {
    return hostname.includes('youware.com') || hostname.endsWith('youware.com');
  }

  private isYouWareAppDomain(hostname: string): boolean {
    return hostname.includes('youware.app') || hostname.endsWith('youware.app');
  }

  private isYouWareUUIDSubdomain(hostname: string): boolean {
    // Pattern: UUID--TIMESTAMP--ID.app.yourware.app
    // Example: 2717717e-d5b0-431d-acef-f529239d0eae--1757757600--121841c0.app.yourware.app
    const uuidSubdomainPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--\\d+--[0-9a-f]+\\.app\\.yourware\\.app$/i;
    
    // Also check for any subdomain ending with .app.yourware.app
    const generalSubdomainPattern = /\\.app\\.yourware\\.app$/i;
    
    return uuidSubdomainPattern.test(hostname) || generalSubdomainPattern.test(hostname);
  }

  private getCSPHeaders(): string[] {
    try {
      // Try to get CSP from HTTP headers (won't work directly, but we can check meta tags)
      const metaCSP = Array.from(document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]'))
        .map(meta => meta.getAttribute('content'))
        .filter(Boolean) as string[];
      return metaCSP;
    } catch {
      return [];
    }
  }

  private getMetaCSP(): string[] {
    try {
      return Array.from(document.querySelectorAll('meta[http-equiv*="security"], meta[name*="csp"]'))
        .map(meta => meta.getAttribute('content'))
        .filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  private generateRecommendations(result: PlatformConstraintTestResult): void {
    const { platform, constraints, apiSpecific } = result;

    // CSP recommendations
    if (constraints.csp.restricted) {
      if (constraints.csp.level === 'strict') {
        result.recommendations.push('Strict CSP detected: Consider using nonce-based script loading for Google Maps');
        result.workarounds.push('Use iframe embedding instead of JavaScript API');
      } else {
        result.recommendations.push('CSP restrictions detected: Add Google Maps domains to CSP allowlist');
      }
    }

    // CORS recommendations
    if (constraints.cors.restricted) {
      result.recommendations.push('CORS restrictions detected: Verify network connectivity to Google services');
      if (platform === 'YouWare') {
        result.workarounds.push('Use server-side proxy for Google Maps API calls');
      }
    }

    // Script loading recommendations
    if (constraints.scriptLoading.restricted) {
      result.recommendations.push('Script loading restricted: Use alternative Google Maps loading methods');
      result.workarounds.push('Preload Google Maps API in HTML instead of dynamic loading');
    }

    // API-specific recommendations
    if (!apiSpecific.googleMapsReachable) {
      result.recommendations.push('Cannot reach Google Maps API: Check network and firewall settings');
    }

    if (!apiSpecific.apiScriptLoadable) {
      result.recommendations.push('Google Maps API script loading failed: Try alternative loading methods');
      result.workarounds.push('Use the Embed API instead of JavaScript API');
    }

    if (!apiSpecific.dynamicScriptInjection) {
      result.recommendations.push('Dynamic script injection blocked: Include Google Maps script in HTML head');
    }

    // Platform-specific recommendations
    if (platform === 'YouWare') {
      result.recommendations.push('YouWare Platform: Test with multiple environment variable injection methods');
      result.recommendations.push('YouWare Platform: Consider using meta tag configuration');
      
      if (constraints.storage.restricted) {
        result.workarounds.push('Use URL parameters for API key instead of storage');
      }
    }

    // General workarounds
    if (Object.values(constraints).some(c => c.restricted)) {
      result.workarounds.push('Consider using Google Maps Embed API as fallback');
      result.workarounds.push('Implement server-side rendering for maps');
      result.workarounds.push('Use static map images as fallback');
    }
  }
}

/**
 * Quick platform test function
 */
export async function quickPlatformTest(addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void): Promise<PlatformConstraintTestResult> {
  const tester = new YouWarePlatformTester(addLogFunction || (() => {}));
  return await tester.runPlatformTests();
}

/**
 * Create platform tester instance
 */
export function createPlatformTester(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): YouWarePlatformTester {
  return new YouWarePlatformTester(addLogFunction);
}