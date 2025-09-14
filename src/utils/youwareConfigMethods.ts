/**
 * Alternative API Configuration Methods for YouWare Platform
 * 
 * Provides multiple ways to configure Google Maps API for YouWare deployment,
 * since standard Vite environment variables may not work reliably on YouWare.
 */

import { DebugLog } from '../hooks/useDebugLogger';

export interface ConfigurationMethod {
  name: string;
  priority: number;
  description: string;
  setup: () => Promise<boolean>;
  test: () => Promise<{ success: boolean; apiKey?: string; error?: string }>;
  cleanup?: () => void;
}

export interface YouWareConfigResult {
  activeMethod: string | null;
  apiKey: string | null;
  mapId: string | null;
  methods: Array<{
    name: string;
    success: boolean;
    error?: string;
    apiKey?: string;
  }>;
  platformInfo: {
    isYouWare: boolean;
    hostname: string;
    protocol: string;
    buildMode: string;
  };
  recommendations: string[];
}

export class YouWareConfigManager {
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;
  private methods: ConfigurationMethod[] = [];

  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
    this.initializeMethods();
  }

  /**
   * Try all configuration methods and return the best working one
   */
  async configureBestMethod(apiKey: string, mapId?: string): Promise<YouWareConfigResult> {
    this.addLog('info', 'YouWareConfigManager', 'Starting alternative configuration method testing');

    const result: YouWareConfigResult = {
      activeMethod: null,
      apiKey: null,
      mapId: null,
      methods: [],
      platformInfo: {
        isYouWare: this.isYouWarePlatform(),
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        buildMode: (import.meta as any).env?.MODE || 'unknown'
      },
      recommendations: []
    };

    // Test all methods in priority order
    for (const method of this.methods.sort((a, b) => b.priority - a.priority)) {
      try {
        this.addLog('debug', 'YouWareConfigManager', `Testing method: ${method.name}`);
        
        // Setup the method
        await method.setup();
        
        // Test if it works
        const testResult = await method.test();
        
        result.methods.push({
          name: method.name,
          success: testResult.success,
          error: testResult.error,
          apiKey: testResult.apiKey
        });

        if (testResult.success && testResult.apiKey) {
          result.activeMethod = method.name;
          result.apiKey = testResult.apiKey;
          result.mapId = mapId || this.getMapIdFromSources();
          
          this.addLog('info', 'YouWareConfigManager', `Successfully configured using method: ${method.name}`);
          break;
        }
      } catch (error) {
        result.methods.push({
          name: method.name,
          success: false,
          error: (error as Error).message
        });
      }
    }

    this.generateRecommendations(result, apiKey);
    return result;
  }

  /**
   * Setup a specific configuration method
   */
  async setupMethod(methodName: string, apiKey: string, mapId?: string): Promise<boolean> {
    const method = this.methods.find(m => m.name === methodName);
    if (!method) {
      throw new Error(`Configuration method '${methodName}' not found`);
    }

    try {
      await method.setup();
      const testResult = await method.test();
      
      if (testResult.success) {
        this.addLog('info', 'YouWareConfigManager', `Method '${methodName}' setup successfully`);
        return true;
      } else {
        this.addLog('error', 'YouWareConfigManager', `Method '${methodName}' setup failed`, testResult.error);
        return false;
      }
    } catch (error) {
      this.addLog('error', 'YouWareConfigManager', `Method '${methodName}' setup error`, error);
      return false;
    }
  }

  /**
   * Get current API key from any available source
   */
  getCurrentApiKey(): string | null {
    const sources = [
      () => (window as any).__GOOGLE_MAPS_API_KEY__,
      () => (window as any).__ENV__?.VITE_GOOGLE_MAPS_API_KEY,
      () => (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY,
      () => document.querySelector('meta[name="google-maps-api-key"]')?.getAttribute('content'),
      () => document.querySelector('script[data-google-maps-api-key]')?.getAttribute('data-google-maps-api-key'),
      () => localStorage.getItem('GOOGLE_MAPS_API_KEY'),
      () => sessionStorage.getItem('GOOGLE_MAPS_API_KEY'),
    ];

    for (const source of sources) {
      try {
        const key = source();
        if (key && typeof key === 'string' && key.length > 10) {
          return key;
        }
      } catch {
        // Continue to next source
      }
    }

    return null;
  }

  private initializeMethods(): void {
    // Method 1: Window Global Variable (High Priority for YouWare)
    this.methods.push({
      name: 'window-global',
      priority: 100,
      description: 'Set API key as window global variable',
      setup: async () => {
        // This method is set up externally
        return true;
      },
      test: async () => {
        const apiKey = (window as any).__GOOGLE_MAPS_API_KEY__;
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'Window global not set'
        };
      }
    });

    // Method 2: Environment Object on Window (YouWare specific)
    this.methods.push({
      name: 'window-env',
      priority: 90,
      description: 'Set API key in window environment object',
      setup: async () => {
        // Create environment object if it doesn't exist
        if (!(window as any).__ENV__) {
          (window as any).__ENV__ = {};
        }
        return true;
      },
      test: async () => {
        const apiKey = (window as any).__ENV__?.VITE_GOOGLE_MAPS_API_KEY;
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'Window environment not set'
        };
      }
    });

    // Method 3: Meta Tag Configuration
    this.methods.push({
      name: 'meta-tag',
      priority: 80,
      description: 'Store API key in meta tag',
      setup: async () => {
        // Meta tag should be set externally or in HTML
        return true;
      },
      test: async () => {
        const metaTag = document.querySelector('meta[name="google-maps-api-key"]') as HTMLMetaElement;
        const apiKey = metaTag?.content;
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'Meta tag not found or empty'
        };
      }
    });

    // Method 4: Script Data Attribute
    this.methods.push({
      name: 'script-data',
      priority: 70,
      description: 'Store API key in script data attribute',
      setup: async () => {
        // Script should be set externally or in HTML
        return true;
      },
      test: async () => {
        const script = document.querySelector('script[data-google-maps-api-key]');
        const apiKey = script?.getAttribute('data-google-maps-api-key');
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'Script data attribute not found'
        };
      }
    });

    // Method 5: LocalStorage (Fallback)
    this.methods.push({
      name: 'localstorage',
      priority: 60,
      description: 'Store API key in localStorage',
      setup: async () => {
        // LocalStorage should be set externally
        return true;
      },
      test: async () => {
        const apiKey = localStorage.getItem('GOOGLE_MAPS_API_KEY');
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'LocalStorage key not found'
        };
      }
    });

    // Method 6: SessionStorage (Temporary)
    this.methods.push({
      name: 'sessionstorage',
      priority: 50,
      description: 'Store API key in sessionStorage',
      setup: async () => {
        // SessionStorage should be set externally
        return true;
      },
      test: async () => {
        const apiKey = sessionStorage.getItem('GOOGLE_MAPS_API_KEY');
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'SessionStorage key not found'
        };
      }
    });

    // Method 7: Standard Vite Environment (Lowest priority on YouWare)
    this.methods.push({
      name: 'vite-env',
      priority: 40,
      description: 'Standard Vite import.meta.env',
      setup: async () => {
        return true;
      },
      test: async () => {
        const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'Vite environment variable not set'
        };
      }
    });

    // Method 8: URL Parameter (For testing)
    this.methods.push({
      name: 'url-param',
      priority: 30,
      description: 'Get API key from URL parameter',
      setup: async () => {
        return true;
      },
      test: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('gmaps_key') || urlParams.get('api_key');
        return {
          success: !!(apiKey && apiKey.length > 10),
          apiKey: apiKey || undefined,
          error: apiKey ? undefined : 'URL parameter not found'
        };
      }
    });
  }

  private getMapIdFromSources(): string | null {
    const sources = [
      () => (window as any).__GOOGLE_MAPS_MAP_ID__,
      () => (window as any).__ENV__?.VITE_MAP_ID,
      () => (import.meta as any).env?.VITE_MAP_ID,
      () => document.querySelector('meta[name="google-maps-map-id"]')?.getAttribute('content'),
      () => document.querySelector('script[data-google-maps-map-id]')?.getAttribute('data-google-maps-map-id'),
      () => localStorage.getItem('GOOGLE_MAPS_MAP_ID'),
    ];

    for (const source of sources) {
      try {
        const mapId = source();
        if (mapId && typeof mapId === 'string' && mapId !== 'DEMO_MAP_ID') {
          return mapId;
        }
      } catch {
        // Continue to next source
      }
    }

    return 'DEMO_MAP_ID'; // Fallback
  }

  private isYouWarePlatform(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Enhanced YouWare detection for both domains and paths
    const isYouWareDomain = hostname.includes('youware.app') || 
                           hostname.includes('youware.com') ||
                           hostname.endsWith('youware.app') ||
                           hostname.endsWith('youware.com');
    
    const isYouWarePath = pathname.includes('/editor/') || 
                         pathname.includes('/project/') ||
                         pathname.includes('/app/');
    
    return isYouWareDomain || isYouWarePath;
  }

  private generateRecommendations(result: YouWareConfigResult, providedApiKey: string): void {
    if (result.activeMethod) {
      result.recommendations.push(`Successfully configured using '${result.activeMethod}' method`);
    } else {
      result.recommendations.push('No working configuration method found');
    }

    if (result.platformInfo.isYouWare) {
      result.recommendations.push('YouWare Platform Detected - Use these methods in order:');
      result.recommendations.push('1. Set window.__GOOGLE_MAPS_API_KEY__ = "your-api-key" in a script tag');
      result.recommendations.push('2. Add <meta name="google-maps-api-key" content="your-api-key"> to HTML head');
      result.recommendations.push('3. Store in localStorage before app loads');
    }

    const failedMethods = result.methods.filter(m => !m.success);
    if (failedMethods.length > 0) {
      result.recommendations.push(`Failed methods: ${failedMethods.map(m => m.name).join(', ')}`);
    }

    if (!result.apiKey) {
      result.recommendations.push('Consider using the setup helper functions to configure API key');
    }
  }
}

/**
 * Helper functions for easy setup
 */
export class YouWareConfigHelpers {
  /**
   * Setup API key using window global method (recommended for YouWare)
   */
  static setupWindowGlobal(apiKey: string, mapId?: string): void {
    (window as any).__GOOGLE_MAPS_API_KEY__ = apiKey;
    if (mapId) {
      (window as any).__GOOGLE_MAPS_MAP_ID__ = mapId;
    }
  }

  /**
   * Setup API key using window environment method
   */
  static setupWindowEnv(apiKey: string, mapId?: string): void {
    if (!(window as any).__ENV__) {
      (window as any).__ENV__ = {};
    }
    (window as any).__ENV__.VITE_GOOGLE_MAPS_API_KEY = apiKey;
    if (mapId) {
      (window as any).__ENV__.VITE_MAP_ID = mapId;
    }
  }

  /**
   * Setup API key using meta tag method
   */
  static setupMetaTag(apiKey: string, mapId?: string): void {
    // Create or update API key meta tag
    let metaTag = document.querySelector('meta[name="google-maps-api-key"]') as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'google-maps-api-key';
      document.head.appendChild(metaTag);
    }
    metaTag.content = apiKey;

    // Create or update Map ID meta tag
    if (mapId) {
      let mapIdMeta = document.querySelector('meta[name="google-maps-map-id"]') as HTMLMetaElement;
      if (!mapIdMeta) {
        mapIdMeta = document.createElement('meta');
        mapIdMeta.name = 'google-maps-map-id';
        document.head.appendChild(mapIdMeta);
      }
      mapIdMeta.content = mapId;
    }
  }

  /**
   * Setup API key using localStorage method
   */
  static setupLocalStorage(apiKey: string, mapId?: string): void {
    localStorage.setItem('GOOGLE_MAPS_API_KEY', apiKey);
    if (mapId) {
      localStorage.setItem('GOOGLE_MAPS_MAP_ID', mapId);
    }
  }

  /**
   * Setup all methods at once (comprehensive approach)
   */
  static setupAllMethods(apiKey: string, mapId?: string): void {
    this.setupWindowGlobal(apiKey, mapId);
    this.setupWindowEnv(apiKey, mapId);
    this.setupMetaTag(apiKey, mapId);
    this.setupLocalStorage(apiKey, mapId);
  }

  /**
   * Generate YouWare-specific configuration script
   */
  static generateYouWareScript(apiKey: string, mapId?: string): string {
    return `
<!-- YouWare Google Maps Configuration -->
<script>
  // Method 1: Window Global (Highest Priority)
  window.__GOOGLE_MAPS_API_KEY__ = "${apiKey}";
  ${mapId ? `window.__GOOGLE_MAPS_MAP_ID__ = "${mapId}";` : ''}
  
  // Method 2: Environment Object
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.VITE_GOOGLE_MAPS_API_KEY = "${apiKey}";
  ${mapId ? `window.__ENV__.VITE_MAP_ID = "${mapId}";` : ''}
  
  // Method 3: LocalStorage Fallback
  localStorage.setItem('GOOGLE_MAPS_API_KEY', "${apiKey}");
  ${mapId ? `localStorage.setItem('GOOGLE_MAPS_MAP_ID', "${mapId}");` : ''}
</script>

<!-- Method 4: Meta Tags -->
<meta name="google-maps-api-key" content="${apiKey}">
${mapId ? `<meta name="google-maps-map-id" content="${mapId}">` : ''}
`;
  }
}

/**
 * Quick configuration function
 */
export async function quickConfigureYouWare(
  apiKey: string, 
  mapId?: string,
  addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void
): Promise<YouWareConfigResult> {
  const manager = new YouWareConfigManager(addLogFunction || (() => {}));
  
  // Setup the most reliable methods first
  YouWareConfigHelpers.setupAllMethods(apiKey, mapId);
  
  // Test all methods
  return await manager.configureBestMethod(apiKey, mapId);
}

/**
 * Create config manager instance
 */
export function createConfigManager(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): YouWareConfigManager {
  return new YouWareConfigManager(addLogFunction);
}