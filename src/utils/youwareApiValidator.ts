/**
 * YouWare Platform API Key Runtime Validation System
 * 
 * Provides real-time validation of Google Maps API keys specifically for YouWare platform,
 * addressing the issue where billing and domains are confirmed working but the API
 * still fails to load properly.
 */

import { DebugLog } from '../hooks/useDebugLogger';

export interface ApiKeyValidationResult {
  isValid: boolean;
  keySource: string;
  validationMethod: string;
  apiKey: string | null;
  errors: string[];
  warnings: string[];
  platformSpecific: {
    isYouWare: boolean;
    domainMatch: boolean;
    httpsRequired: boolean;
    corsIssues: boolean;
  };
  testResults: {
    keyFormatValid: boolean;
    domainAuthorized: boolean;
    apiEnabled: boolean;
    quotaAvailable: boolean;
    networkReachable: boolean;
  };
  recommendations: string[];
  debugInfo: any;
}

export class YouWareApiValidator {
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;

  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  /**
   * Comprehensive API key validation for YouWare platform
   */
  async validateApiKey(providedApiKey?: string): Promise<ApiKeyValidationResult> {
    this.addLog('info', 'YouWareApiValidator', 'Starting comprehensive API key validation for YouWare');

    const result: ApiKeyValidationResult = {
      isValid: false,
      keySource: 'none',
      validationMethod: 'comprehensive',
      apiKey: null,
      errors: [],
      warnings: [],
      platformSpecific: {
        isYouWare: this.isYouWarePlatform(),
        domainMatch: false,
        httpsRequired: false,
        corsIssues: false,
      },
      testResults: {
        keyFormatValid: false,
        domainAuthorized: false,
        apiEnabled: false,
        quotaAvailable: false,
        networkReachable: false,
      },
      recommendations: [],
      debugInfo: {}
    };

    // Step 1: Get API key from various sources
    const apiKey = await this.getApiKeyFromSources(providedApiKey);
    result.apiKey = apiKey;
    
    if (!apiKey) {
      result.errors.push('No API key found in any source');
      result.recommendations.push('Set VITE_GOOGLE_MAPS_API_KEY in environment variables');
      result.recommendations.push('For YouWare: Try alternative configuration methods');
      return result;
    }

    result.keySource = this.getApiKeySource(apiKey);

    // Step 2: Basic format validation
    result.testResults.keyFormatValid = this.validateKeyFormat(apiKey);
    if (!result.testResults.keyFormatValid) {
      result.errors.push('API key format is invalid');
    }

    // Step 3: Platform-specific checks
    await this.performPlatformSpecificChecks(result);

    // Step 4: Network connectivity test
    result.testResults.networkReachable = await this.testNetworkConnectivity();
    if (!result.testResults.networkReachable) {
      result.errors.push('Cannot reach Google Maps API servers');
    }

    // Step 5: API key authorization test
    if (result.testResults.keyFormatValid && result.testResults.networkReachable) {
      await this.testApiKeyAuthorization(apiKey, result);
    }

    // Step 6: Real API validation (if Google Maps is loaded)
    if (window.google && window.google.maps) {
      await this.testWithGoogleMapsApi(apiKey, result);
    }

    // Step 7: Generate recommendations
    this.generateRecommendations(result);

    // Determine overall validity
    result.isValid = this.determineOverallValidity(result);

    this.addLog(
      result.isValid ? 'info' : 'error',
      'YouWareApiValidator',
      `API key validation completed: ${result.isValid ? 'VALID' : 'INVALID'}`,
      result
    );

    return result;
  }

  /**
   * Real-time API monitoring for YouWare
   */
  async startRealTimeMonitoring(intervalMs: number = 30000): Promise<void> {
    this.addLog('info', 'YouWareApiValidator', 'Starting real-time API monitoring');

    const monitor = async () => {
      try {
        const result = await this.validateApiKey();
        
        if (!result.isValid) {
          this.addLog('warn', 'API Monitor', 'API validation failed', {
            errors: result.errors,
            recommendations: result.recommendations.slice(0, 3) // Top 3 recommendations
          });
        }

        // Check for specific YouWare issues
        if (result.platformSpecific.isYouWare) {
          if (!result.testResults.domainAuthorized) {
            this.addLog('error', 'API Monitor', 'YouWare domain authorization issue detected');
          }
          
          if (result.platformSpecific.corsIssues) {
            this.addLog('error', 'API Monitor', 'CORS issues detected on YouWare platform');
          }
        }

      } catch (error) {
        this.addLog('error', 'API Monitor', 'Real-time monitoring failed', error);
      }
    };

    // Initial check
    await monitor();

    // Set up interval monitoring
    setInterval(monitor, intervalMs);
  }

  /**
   * Test API key with different YouWare configurations
   */
  async testYouWareConfigurations(apiKey: string): Promise<{
    configurations: Array<{
      name: string;
      success: boolean;
      error?: string;
      response?: any;
    }>;
    bestConfiguration: string | null;
  }> {
    const configurations = [
      { name: 'Standard Referrer', test: () => this.testWithReferrer(apiKey, window.location.origin) },
      { name: 'YouWare Wildcard', test: () => this.testWithReferrer(apiKey, '*.youware.app') },
      { name: 'HTTPS Only', test: () => this.testWithReferrer(apiKey, window.location.origin, true) },
      { name: 'No Referrer', test: () => this.testWithReferrer(apiKey, '') },
      { name: 'Direct API Call', test: () => this.testDirectApiCall(apiKey) },
    ];

    const results = [];
    let bestConfiguration = null;

    for (const config of configurations) {
      try {
        this.addLog('debug', 'YouWareApiValidator', `Testing configuration: ${config.name}`);
        const response = await config.test();
        results.push({
          name: config.name,
          success: true,
          response
        });
        
        if (!bestConfiguration) {
          bestConfiguration = config.name;
        }
      } catch (error) {
        results.push({
          name: config.name,
          success: false,
          error: (error as Error).message
        });
      }
    }

    this.addLog('info', 'YouWareApiValidator', 'YouWare configuration testing completed', {
      results,
      bestConfiguration
    });

    return { configurations: results, bestConfiguration };
  }

  private async getApiKeyFromSources(providedKey?: string): Promise<string | null> {
    const sources = [
      // Provided key has highest priority
      () => providedKey,
      // Standard Vite environment
      () => (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY,
      // YouWare-specific globals
      () => (window as any).__GOOGLE_MAPS_API_KEY__,
      () => (window as any).__ENV__?.VITE_GOOGLE_MAPS_API_KEY,
      () => (window as any).YOUWARE?.googleMapsApiKey,
      // Meta tags
      () => document.querySelector('meta[name="google-maps-api-key"]')?.getAttribute('content'),
      // LocalStorage
      () => localStorage.getItem('GOOGLE_MAPS_API_KEY'),
      // Script attributes
      () => document.querySelector('script[data-google-maps-api-key]')?.getAttribute('data-google-maps-api-key'),
    ];

    for (let i = 0; i < sources.length; i++) {
      try {
        const key = sources[i]();
        if (key && typeof key === 'string' && key.length > 10) {
          this.addLog('debug', 'YouWareApiValidator', `API key found from source ${i}`, { sourceIndex: i });
          return key;
        }
      } catch (error) {
        // Continue to next source
      }
    }

    return null;
  }

  private getApiKeySource(apiKey: string): string {
    try {
      if ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY === apiKey) return 'import.meta.env';
      if ((window as any).__GOOGLE_MAPS_API_KEY__ === apiKey) return 'window.__GOOGLE_MAPS_API_KEY__';
      if ((window as any).__ENV__?.VITE_GOOGLE_MAPS_API_KEY === apiKey) return 'window.__ENV__';
      if (localStorage.getItem('GOOGLE_MAPS_API_KEY') === apiKey) return 'localStorage';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private validateKeyFormat(apiKey: string): boolean {
    // Google Maps API keys typically start with "AIzaSy" and are 39 characters long
    if (!apiKey || typeof apiKey !== 'string') return false;
    if (apiKey.length !== 39) return false;
    if (!apiKey.startsWith('AIzaSy')) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) return false;
    return true;
  }

  private isYouWarePlatform(): boolean {
    return window.location.hostname.includes('youware.app') || 
           window.location.hostname.includes('youware.com');
  }

  private async performPlatformSpecificChecks(result: ApiKeyValidationResult): Promise<void> {
    result.platformSpecific.httpsRequired = window.location.protocol === 'https:';
    
    if (result.platformSpecific.isYouWare) {
      // YouWare specific domain checks
      const validDomains = [
        '*.youware.app',
        '*.youware.com',
        window.location.hostname
      ];
      
      result.debugInfo.youwareChecks = {
        currentDomain: window.location.hostname,
        validDomains,
        protocol: window.location.protocol
      };

      // Check for common YouWare issues
      if (!result.platformSpecific.httpsRequired) {
        result.warnings.push('YouWare requires HTTPS for Google Maps API');
      }

      // Test CORS
      try {
        await fetch('https://maps.googleapis.com/maps/api/js?key=test', { 
          method: 'HEAD', 
          mode: 'no-cors' 
        });
      } catch (error) {
        result.platformSpecific.corsIssues = true;
        result.warnings.push('CORS issues detected on YouWare platform');
      }
    }
  }

  private async testNetworkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://maps.googleapis.com/maps/api/js?key=test', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async testApiKeyAuthorization(apiKey: string, result: ApiKeyValidationResult): Promise<void> {
    try {
      // Test with a simple Geocoding API request
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=${apiKey}`;
      
      const response = await fetch(testUrl);
      const data = await response.json();

      result.debugInfo.authorizationTest = {
        status: response.status,
        response: data
      };

      if (data.status === 'OK') {
        result.testResults.domainAuthorized = true;
        result.testResults.apiEnabled = true;
        result.testResults.quotaAvailable = true;
      } else if (data.status === 'REQUEST_DENIED') {
        result.errors.push(`API key authorization failed: ${data.error_message || 'Request denied'}`);
        if (data.error_message?.includes('referer')) {
          result.errors.push('Domain restriction issue: Add your domain to API key restrictions');
          result.platformSpecific.domainMatch = false;
        }
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        result.testResults.domainAuthorized = true;
        result.testResults.apiEnabled = true;
        result.testResults.quotaAvailable = false;
        result.warnings.push('API quota exceeded');
      }

    } catch (error) {
      result.errors.push(`Authorization test failed: ${(error as Error).message}`);
    }
  }

  private async testWithGoogleMapsApi(apiKey: string, result: ApiKeyValidationResult): Promise<void> {
    try {
      if (!window.google || !window.google.maps) {
        result.warnings.push('Google Maps API not loaded for real-time testing');
        return;
      }

      // Test Geocoder service
      const geocoder = new google.maps.Geocoder();
      
      await new Promise<void>((resolve, reject) => {
        geocoder.geocode({ address: 'Tokyo, Japan' }, (results, status) => {
          result.debugInfo.geocoderTest = { status, resultsCount: results?.length || 0 };

          if (status === google.maps.GeocoderStatus.OK) {
            result.testResults.apiEnabled = true;
            result.testResults.domainAuthorized = true;
            resolve();
          } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
            result.errors.push('Google Maps API: Request denied - check API key and domain restrictions');
            reject(new Error('Request denied'));
          } else {
            result.warnings.push(`Google Maps API geocoder status: ${status}`);
            resolve();
          }
        });
      });

    } catch (error) {
      result.warnings.push(`Google Maps API test failed: ${(error as Error).message}`);
    }
  }

  private async testWithReferrer(apiKey: string, referrer: string, httpsOnly: boolean = false): Promise<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=${apiKey}`;
    
    const headers: HeadersInit = {};
    if (referrer) {
      headers['Referer'] = referrer;
    }

    const response = await fetch(url, { headers });
    return await response.json();
  }

  private async testDirectApiCall(apiKey: string): Promise<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Tokyo&key=${apiKey}`;
    const response = await fetch(url);
    return await response.json();
  }

  private generateRecommendations(result: ApiKeyValidationResult): void {
    const { errors, warnings, platformSpecific, testResults } = result;

    if (errors.length === 0 && warnings.length === 0) {
      result.recommendations.push('API key validation passed - configuration looks good');
      return;
    }

    // API key format issues
    if (!testResults.keyFormatValid) {
      result.recommendations.push('Verify API key format: should be 39 characters starting with "AIzaSy"');
      result.recommendations.push('Generate new API key at: https://console.cloud.google.com/apis/credentials');
    }

    // Domain authorization issues
    if (!testResults.domainAuthorized) {
      if (platformSpecific.isYouWare) {
        result.recommendations.push('Add "*.youware.app/*" to API key HTTP referrer restrictions');
        result.recommendations.push('Add "*.youware.com/*" to API key HTTP referrer restrictions');
      } else {
        result.recommendations.push(`Add "${window.location.hostname}/*" to API key HTTP referrer restrictions`);
      }
    }

    // API enabled issues
    if (!testResults.apiEnabled) {
      result.recommendations.push('Enable Maps JavaScript API in Google Cloud Console');
      result.recommendations.push('Enable Geocoding API in Google Cloud Console');
      result.recommendations.push('Enable Places API in Google Cloud Console');
    }

    // Network issues
    if (!testResults.networkReachable) {
      result.recommendations.push('Check internet connectivity');
      result.recommendations.push('Verify firewall/proxy settings allow Google Maps API');
    }

    // Platform specific
    if (platformSpecific.isYouWare) {
      result.recommendations.push('Use YouWare-specific environment variable configuration');
      result.recommendations.push('Test with alternative API key injection methods');
      
      if (platformSpecific.corsIssues) {
        result.recommendations.push('Configure CORS settings for YouWare platform');
      }
    }

    // Quota issues
    if (!testResults.quotaAvailable) {
      result.recommendations.push('Check API quota usage in Google Cloud Console');
      result.recommendations.push('Increase quota limits if necessary');
    }
  }

  private determineOverallValidity(result: ApiKeyValidationResult): boolean {
    const { testResults, errors } = result;
    
    // Must have valid key format and no critical errors
    if (!testResults.keyFormatValid || errors.length > 0) {
      return false;
    }

    // Must be reachable
    if (!testResults.networkReachable) {
      return false;
    }

    // Either domain authorized OR API enabled (some tests might fail but API works)
    return testResults.domainAuthorized || testResults.apiEnabled;
  }
}

/**
 * Quick validation function for immediate use
 */
export async function quickValidateApiKey(
  apiKey?: string,
  addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void
): Promise<ApiKeyValidationResult> {
  const validator = new YouWareApiValidator(addLogFunction || (() => {}));
  return await validator.validateApiKey(apiKey);
}

/**
 * Create a validator instance for reuse
 */
export function createApiValidator(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): YouWareApiValidator {
  return new YouWareApiValidator(addLogFunction);
}