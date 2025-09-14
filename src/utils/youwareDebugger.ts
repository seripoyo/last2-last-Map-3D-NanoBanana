import { DebugLog } from '../hooks/useDebugLogger';

// YouWare platform specific debugging utilities
export class YouWareDebugger {
  private logs: DebugLog[] = [];
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;

  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  // Environment validation specifically for YouWare vs Local
  async validateEnvironment(): Promise<{
    isValid: boolean;
    issues: string[];
    details: any;
  }> {
    const issues: string[] = [];
    const details: any = {
      environment: {},
      apis: {},
      network: {},
      dom: {}
    };

    try {
      this.addLog('info', 'YouWareDebugger', 'Starting comprehensive environment validation');

      // 1. Environment Detection
      const isYouWare = window.location.hostname.includes('youware.app');
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      details.environment = {
        platform: isYouWare ? 'YouWare' : isLocalhost ? 'Local' : 'Other',
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        port: window.location.port,
        fullUrl: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };

      // 2. Environment Variables Check
      const viteEnv = (import.meta as any).env || {};
      const apiKey = viteEnv.VITE_GOOGLE_MAPS_API_KEY;
      const mapId = viteEnv.VITE_MAP_ID;
      
      details.environment.viteEnv = {
        MODE: viteEnv.MODE,
        BASE_URL: viteEnv.BASE_URL,
        PROD: viteEnv.PROD,
        DEV: viteEnv.DEV,
        VITE_GOOGLE_MAPS_API_KEY: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT_SET',
        VITE_MAP_ID: mapId || 'NOT_SET',
        VITE_ENV: viteEnv.VITE_ENV || 'NOT_SET',
        allViteVars: Object.keys(viteEnv).filter(key => key.startsWith('VITE_'))
      };

      if (!apiKey) {
        issues.push('VITE_GOOGLE_MAPS_API_KEY is not set in environment variables');
      } else if (apiKey.length < 20) {
        issues.push('VITE_GOOGLE_MAPS_API_KEY appears to be invalid (too short)');
      }

      if (!mapId || mapId === 'DEMO_MAP_ID') {
        issues.push('VITE_MAP_ID is not properly configured (using demo ID)');
      }

      // 3. Google Maps API Library Check
      details.apis.googleMaps = {
        googleObjectExists: !!window.google,
        mapsObjectExists: !!(window.google && window.google.maps),
        placesLibraryExists: !!(window.google && window.google.maps && window.google.maps.places),
        markerLibraryExists: !!(window.google && window.google.maps && window.google.maps.marker),
        geometryLibraryExists: !!(window.google && window.google.maps && window.google.maps.geometry),
        librariesLoaded: window.google?.maps ? Object.keys(window.google.maps) : []
      };

      if (!window.google) {
        issues.push('Google Maps JavaScript API is not loaded');
      } else if (!window.google.maps) {
        issues.push('Google Maps core library is not available');
      }

      // 4. Network Connectivity Test
      try {
        const networkStart = performance.now();
        const response = await fetch('https://maps.googleapis.com/maps/api/js?key=test', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        const networkTime = performance.now() - networkStart;
        
        details.network.googleMapsReachable = {
          reachable: true,
          responseTime: Math.round(networkTime),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        details.network.googleMapsReachable = {
          reachable: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        };
        issues.push('Cannot reach Google Maps API servers (network issue)');
      }

      // 5. DOM and Script Loading Check
      const scriptTags = Array.from(document.querySelectorAll('script'));
      const googleMapsScripts = scriptTags.filter(script => 
        script.src && script.src.includes('maps.googleapis.com')
      );

      details.dom = {
        totalScripts: scriptTags.length,
        googleMapsScripts: googleMapsScripts.map(script => ({
          src: script.src,
          async: script.async,
          defer: script.defer,
          loaded: !script.onload
        })),
        documentReadyState: document.readyState,
        bodyExists: !!document.body,
        rootElementExists: !!document.getElementById('root')
      };

      if (googleMapsScripts.length === 0) {
        issues.push('No Google Maps API script tags found in DOM');
      }

      // 6. CORS and Security Checks (YouWare specific)
      if (isYouWare) {
        try {
          // Test if we can access the Google Maps API from YouWare domain
          const corsTest = await this.testCorsFromYouWare();
          details.apis.corsTest = corsTest;
          
          if (!corsTest.success) {
            issues.push('CORS issue detected with Google Maps API from YouWare domain');
          }
        } catch (error) {
          details.apis.corsTest = { success: false, error: (error as Error).message };
          issues.push('Failed to test CORS from YouWare domain');
        }
      }

      // 7. API Key Validation
      if (apiKey) {
        try {
          const apiKeyValidation = await this.validateApiKey(apiKey);
          details.apis.keyValidation = apiKeyValidation;
          
          if (!apiKeyValidation.valid) {
            issues.push(`API key validation failed: ${apiKeyValidation.error}`);
          }
        } catch (error) {
          details.apis.keyValidation = { valid: false, error: (error as Error).message };
          issues.push('Failed to validate API key');
        }
      }

      const result = {
        isValid: issues.length === 0,
        issues,
        details
      };

      this.addLog(
        issues.length === 0 ? 'info' : 'error',
        'YouWareDebugger',
        `Environment validation completed: ${issues.length} issues found`,
        result
      );

      return result;

    } catch (error) {
      const errorResult = {
        isValid: false,
        issues: [`Environment validation failed: ${(error as Error).message}`],
        details
      };

      this.addLog('error', 'YouWareDebugger', 'Environment validation failed', error);
      return errorResult;
    }
  }

  // Test CORS from YouWare domain
  private async testCorsFromYouWare(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Test if we can make a request to Google Maps API
      const testUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=test';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      return {
        success: response.status !== 0, // Status 0 usually indicates CORS issue
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          responsePreview: responseText.substring(0, 200)
        }
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }
      return { 
        success: false, 
        error: (error as Error).message,
        details: { errorType: (error as Error).name }
      };
    }
  }

  // Validate API key by testing a simple request
  private async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; details?: any }> {
    try {
      if (!window.google || !window.google.maps) {
        return { valid: false, error: 'Google Maps API not loaded' };
      }

      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        const startTime = performance.now();
        
        geocoder.geocode({ address: 'Tokyo, Japan' }, (results, status) => {
          const responseTime = performance.now() - startTime;
          
          if (status === google.maps.GeocoderStatus.OK) {
            resolve({
              valid: true,
              details: {
                status,
                responseTime: Math.round(responseTime),
                resultsCount: results?.length || 0
              }
            });
          } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
            resolve({
              valid: false,
              error: 'API key denied - check key validity and domain restrictions',
              details: { status, responseTime: Math.round(responseTime) }
            });
          } else {
            resolve({
              valid: false,
              error: `Geocoder error: ${status}`,
              details: { status, responseTime: Math.round(responseTime) }
            });
          }
        });
      });
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message,
        details: { errorType: (error as Error).name }
      };
    }
  }

  // Real-time API monitoring
  async startApiMonitoring(): Promise<void> {
    this.addLog('info', 'YouWareDebugger', 'Starting real-time API monitoring');

    // Monitor for Google Maps API script loading
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && 
                element.getAttribute('src')?.includes('maps.googleapis.com')) {
              this.addLog('info', 'API Monitor', 'Google Maps script detected in DOM', {
                src: element.getAttribute('src'),
                async: element.hasAttribute('async'),
                defer: element.hasAttribute('defer')
              });
            }
          }
        });
      });
    });

    observer.observe(document.head, { childList: true, subtree: true });

    // Monitor for window.google availability
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      checkCount++;
      
      if (window.google && window.google.maps) {
        this.addLog('info', 'API Monitor', 'Google Maps API became available', {
          checkCount,
          libraries: Object.keys(window.google.maps),
          timeElapsed: checkCount * 100
        });
        clearInterval(checkInterval);
        observer.disconnect();
      } else if (checkCount > 300) { // 30 seconds
        this.addLog('error', 'API Monitor', 'Google Maps API failed to load within timeout', {
          checkCount,
          timeElapsed: checkCount * 100
        });
        clearInterval(checkInterval);
        observer.disconnect();
      }
    }, 100);
  }

  // Test specific Google Maps functionality
  async testMapsFunctionality(): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];
    let success = true;

    try {
      this.addLog('info', 'YouWareDebugger', 'Testing Google Maps functionality');

      // Test 1: Basic Maps API
      if (window.google && window.google.maps) {
        results.push({
          test: 'Maps API Availability',
          success: true,
          details: 'Google Maps API is loaded and available'
        });
      } else {
        results.push({
          test: 'Maps API Availability',
          success: false,
          error: 'Google Maps API not available'
        });
        success = false;
      }

      // Test 2: Geocoder Service
      if (window.google && window.google.maps) {
        try {
          const geocoder = new google.maps.Geocoder();
          const geocodeResult = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: 'Tokyo, Japan' }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK) {
                resolve({ results, status });
              } else {
                reject(new Error(`Geocoder failed: ${status}`));
              }
            });
          });
          
          results.push({
            test: 'Geocoder Service',
            success: true,
            details: geocodeResult
          });
        } catch (error) {
          results.push({
            test: 'Geocoder Service',
            success: false,
            error: (error as Error).message
          });
          success = false;
        }
      }

      // Test 3: Places Service (if available)
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          const service = new google.maps.places.PlacesService(document.createElement('div'));
          results.push({
            test: 'Places Service',
            success: true,
            details: 'Places service initialized successfully'
          });
        } catch (error) {
          results.push({
            test: 'Places Service',
            success: false,
            error: (error as Error).message
          });
        }
      } else {
        results.push({
          test: 'Places Service',
          success: false,
          error: 'Places library not loaded'
        });
      }

      // Test 4: Map Creation
      if (window.google && window.google.maps) {
        try {
          const testDiv = document.createElement('div');
          testDiv.style.width = '100px';
          testDiv.style.height = '100px';
          document.body.appendChild(testDiv);

          const testMap = new google.maps.Map(testDiv, {
            center: { lat: 35.6762, lng: 139.6503 },
            zoom: 10
          });

          results.push({
            test: 'Map Creation',
            success: true,
            details: 'Test map created successfully'
          });

          document.body.removeChild(testDiv);
        } catch (error) {
          results.push({
            test: 'Map Creation',
            success: false,
            error: (error as Error).message
          });
          success = false;
        }
      }

      this.addLog(
        success ? 'info' : 'error',
        'YouWareDebugger',
        `Maps functionality test completed: ${results.filter(r => r.success).length}/${results.length} tests passed`,
        { results }
      );

      return { success, results };

    } catch (error) {
      this.addLog('error', 'YouWareDebugger', 'Maps functionality test failed', error);
      return {
        success: false,
        results: [{ test: 'Test Execution', success: false, error: (error as Error).message }]
      };
    }
  }

  // Generate comprehensive debug report
  generateDebugReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      platform: window.location.hostname.includes('youware.app') ? 'YouWare' : 'Local',
      url: window.location.href,
      userAgent: navigator.userAgent,
      environment: {
        viteEnv: (import.meta as any).env,
        googleMapsLoaded: !!(window.google && window.google.maps),
        documentReady: document.readyState
      }
    };

    return JSON.stringify(report, null, 2);
  }
}

// Utility function to create debugger instance
export function createYouWareDebugger(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): YouWareDebugger {
  return new YouWareDebugger(addLogFunction);
}