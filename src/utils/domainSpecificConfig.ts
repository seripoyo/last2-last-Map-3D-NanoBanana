/**
 * Domain-Specific Configuration for YouWare Platform
 * 
 * Handles the specific domain differences between:
 * - www.youware.com/editor/ (working domain)
 * - youware.app/project/ (failing domain)
 * 
 * This addresses the core issue where the same API key works on one domain
 * but fails on another due to domain restrictions in Google Cloud Console.
 */

import { DebugLog } from '../hooks/useDebugLogger';

export interface DomainConfig {
  domain: string;
  subdomain: string;
  path: string;
  pathType: 'editor' | 'project' | 'app' | 'other';
  isYouWare: boolean;
  expectedRestrictions: string[];
  fallbackMethods: string[];
  priority: number;
}

export interface DomainAnalysisResult {
  current: DomainConfig;
  issues: string[];
  recommendations: string[];
  apiKeyStrategy: 'window-global' | 'meta-tag' | 'env-fallback';
  debugInfo: any;
}

export class DomainSpecificConfigManager {
  private addLog?: (level: DebugLog['level'], category: string, message: string, data?: any) => void;
  
  constructor(addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  /**
   * Analyze current domain and provide specific configuration
   */
  analyzeDomain(): DomainAnalysisResult {
    const current = this.getCurrentDomainConfig();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    this.addLog?.('info', 'DomainSpecificConfig', 'Analyzing current domain configuration', current);
    
    // Check for known problematic domain combinations
    if (this.isYouWareUUIDSubdomain(current.domain)) {
      issues.push('UUID-based YouWare subdomain detected - requires specific API key restrictions');
      recommendations.push('CRITICAL: Add *.app.yourware.app/* to your Google Maps API key restrictions');
      recommendations.push('Also add *--*--*.app.yourware.app/* pattern to be comprehensive');
      recommendations.push('The complex subdomain pattern needs explicit allowlisting in Google Cloud Console');
    } else if (current.domain.includes('youware.app') && current.pathType === 'project') {
      issues.push('youware.app/project/ path has known API key domain restriction issues');
      recommendations.push('Ensure API key allows *.youware.app/* in HTTP referrer restrictions');
      recommendations.push('Add both youware.app/* and *.youware.app/* to be safe');
    }
    
    if (current.domain.includes('youware.com') && current.pathType === 'editor') {
      // This is the working combination
      recommendations.push('This is a known working domain/path combination');
      recommendations.push('If issues occur, copy configuration to youware.app domain');
    }
    
    // Determine best API key strategy based on domain
    let apiKeyStrategy: 'window-global' | 'meta-tag' | 'env-fallback' = 'window-global';
    
    if (current.isYouWare) {
      apiKeyStrategy = 'window-global'; // Most reliable for YouWare
      recommendations.push('Use window.__GOOGLE_MAPS_API_KEY__ for YouWare domains');
    } else {
      apiKeyStrategy = 'env-fallback'; // Standard Vite env for local development
    }
    
    return {
      current,
      issues,
      recommendations,
      apiKeyStrategy,
      debugInfo: {
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        protocol: window.location.protocol,
        fullUrl: window.location.href
      }
    };
  }

  /**
   * Get configuration for current domain
   */
  private getCurrentDomainConfig(): DomainConfig {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const fullDomain = hostname;
    const subdomain = hostname.split('.')[0] || '';
    
    // Determine path type
    let pathType: 'editor' | 'project' | 'app' | 'other' = 'other';
    if (pathname.includes('/editor/')) pathType = 'editor';
    else if (pathname.includes('/project/')) pathType = 'project';
    else if (pathname.includes('/app/')) pathType = 'app';
    
    // Enhanced YouWare detection for UUID-based subdomains
    // Patterns: UUID--TIMESTAMP--ID.app.yourware.app, *.youware.com, *.youware.app
    const isYouWare = this.isYouWareDomain(hostname) || pathType !== 'other';
    
    // Expected API restrictions based on domain
    let expectedRestrictions: string[] = [];
    let fallbackMethods: string[] = [];
    let priority = 50;
    
    if (this.isYouWareComDomain(hostname)) {
      expectedRestrictions = [
        '*.youware.com/*',
        'youware.com/*',
        'www.youware.com/*'
      ];
      fallbackMethods = ['window-global', 'meta-tag', 'window-env'];
      priority = 100; // High priority - known working domain
    } else if (this.isYouWareUUIDSubdomain(hostname)) {
      // Special handling for UUID-based subdomains like:
      // 2717717e-d5b0-431d-acef-f529239d0eae--1757757600--121841c0.app.yourware.app
      expectedRestrictions = [
        '*.app.yourware.app/*',
        '*--*--*.app.yourware.app/*',
        '*.yourware.app/*'
      ];
      fallbackMethods = ['window-global', 'meta-tag', 'localstorage'];
      priority = 95; // Very high priority - this is the actual deployment pattern
    } else if (this.isYouWareAppDomain(hostname)) {
      expectedRestrictions = [
        '*.youware.app/*',
        'youware.app/*',
        // Critical: UUID-based subdomain patterns
        '*.app.yourware.app/*',
        '*--*--*.app.yourware.app/*'
      ];
      fallbackMethods = ['window-global', 'meta-tag', 'localstorage'];
      priority = 90; // High priority but potentially problematic
    } else if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
      expectedRestrictions = [
        'localhost:*',
        '127.0.0.1:*',
        '192.168.*:*'
      ];
      fallbackMethods = ['vite-env', 'window-global'];
      priority = 30; // Lower priority for local development
    }
    
    return {
      domain: fullDomain,
      subdomain,
      path: pathname,
      pathType,
      isYouWare,
      expectedRestrictions,
      fallbackMethods,
      priority
    };
  }

  /**
   * Enhanced YouWare domain detection methods
   */
  private isYouWareDomain(hostname: string): boolean {
    return this.isYouWareComDomain(hostname) || 
           this.isYouWareAppDomain(hostname) || 
           this.isYouWareUUIDSubdomain(hostname);
  }

  private isYouWareComDomain(hostname: string): boolean {
    return hostname.includes('youware.com') || hostname.endsWith('youware.com');
  }

  private isYouWareAppDomain(hostname: string): boolean {
    return hostname.includes('youware.app') || hostname.endsWith('youware.app');
  }

  private isYouWareUUIDSubdomain(hostname: string): boolean {
    // Pattern: UUID--TIMESTAMP--ID.app.yourware.app
    // Example: 2717717e-d5b0-431d-acef-f529239d0eae--1757757600--121841c0.app.yourware.app
    const uuidSubdomainPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--\d+--[0-9a-f]+\.app\.yourware\.app$/i;
    
    // Also check for any subdomain ending with .app.yourware.app
    const generalSubdomainPattern = /\.app\.yourware\.app$/i;
    
    return uuidSubdomainPattern.test(hostname) || generalSubdomainPattern.test(hostname);
  }

  /**
   * Setup domain-specific API key configuration
   */
  setupDomainSpecificConfig(apiKey: string, mapId?: string): boolean {
    const config = this.getCurrentDomainConfig();
    
    this.addLog?.('info', 'DomainSpecificConfig', 'Setting up domain-specific configuration', {
      domain: config.domain,
      pathType: config.pathType,
      methods: config.fallbackMethods
    });
    
    let success = false;
    
    // Apply configuration methods in priority order for this domain
    for (const method of config.fallbackMethods) {
      try {
        switch (method) {
          case 'window-global':
            (window as any).__GOOGLE_MAPS_API_KEY__ = apiKey;
            if (mapId) (window as any).__GOOGLE_MAPS_MAP_ID__ = mapId;
            this.addLog?.('debug', 'DomainSpecificConfig', 'Set window global API key');
            success = true;
            break;
            
          case 'meta-tag':
            this.setupMetaTag(apiKey, mapId);
            this.addLog?.('debug', 'DomainSpecificConfig', 'Set meta tag API key');
            success = true;
            break;
            
          case 'window-env':
            if (!(window as any).__ENV__) (window as any).__ENV__ = {};
            (window as any).__ENV__.VITE_GOOGLE_MAPS_API_KEY = apiKey;
            if (mapId) (window as any).__ENV__.VITE_MAP_ID = mapId;
            this.addLog?.('debug', 'DomainSpecificConfig', 'Set window env API key');
            success = true;
            break;
            
          case 'localstorage':
            localStorage.setItem('GOOGLE_MAPS_API_KEY', apiKey);
            if (mapId) localStorage.setItem('GOOGLE_MAPS_MAP_ID', mapId);
            this.addLog?.('debug', 'DomainSpecificConfig', 'Set localStorage API key');
            success = true;
            break;
        }
      } catch (error) {
        this.addLog?.('warn', 'DomainSpecificConfig', `Failed to set ${method}`, error);
      }
    }
    
    return success;
  }

  /**
   * Create domain-specific meta tags
   */
  private setupMetaTag(apiKey: string, mapId?: string): void {
    // API Key meta tag
    let apiKeyMeta = document.querySelector('meta[name="google-maps-api-key"]') as HTMLMetaElement;
    if (!apiKeyMeta) {
      apiKeyMeta = document.createElement('meta');
      apiKeyMeta.name = 'google-maps-api-key';
      document.head.appendChild(apiKeyMeta);
    }
    apiKeyMeta.content = apiKey;
    
    // Domain-specific meta tag for debugging
    let domainMeta = document.querySelector('meta[name="youware-domain-config"]') as HTMLMetaElement;
    if (!domainMeta) {
      domainMeta = document.createElement('meta');
      domainMeta.name = 'youware-domain-config';
      document.head.appendChild(domainMeta);
    }
    domainMeta.content = JSON.stringify({
      domain: window.location.hostname,
      path: window.location.pathname,
      timestamp: Date.now()
    });
    
    // Map ID meta tag
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
   * Generate domain-specific diagnostic report
   */
  generateDomainDiagnosticReport(): string {
    const analysis = this.analyzeDomain();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>YouWare Domain Diagnostic Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .issue { background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 10px 0; }
        .recommendation { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 10px; margin: 10px 0; }
        .code { background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; }
        .success { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 YouWare Domain Diagnostic Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Domain: ${analysis.current.domain} | Path Type: ${analysis.current.pathType}</p>
    </div>
    
    <div class="section">
        <h2>🌐 Current Domain Configuration</h2>
        <p><strong>Full Domain:</strong> ${analysis.current.domain}</p>
        <p><strong>Subdomain:</strong> ${analysis.current.subdomain}</p>
        <p><strong>Path:</strong> ${analysis.current.path}</p>
        <p><strong>Path Type:</strong> ${analysis.current.pathType}</p>
        <p><strong>Is YouWare:</strong> ${analysis.current.isYouWare ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Priority:</strong> ${analysis.current.priority}/100</p>
    </div>
    
    <div class="section">
        <h2>🚨 Identified Issues</h2>
        ${analysis.issues.length === 0 ? 
          '<div class="success">No issues detected with current domain configuration.</div>' :
          analysis.issues.map(issue => `<div class="issue">❌ ${issue}</div>`).join('')
        }
    </div>
    
    <div class="section">
        <h2>💡 Recommendations</h2>
        ${analysis.recommendations.map(rec => `<div class="recommendation">💡 ${rec}</div>`).join('')}
    </div>
    
    <div class="section">
        <h2>🔑 Required API Key Restrictions</h2>
        <p>Add these HTTP referrer restrictions to your Google Maps API key:</p>
        <div class="code">
${analysis.current.expectedRestrictions.map(restriction => `${restriction}`).join('<br>')}
        </div>
        <p><strong>Google Cloud Console URL:</strong> <a href="https://console.cloud.google.com/apis/credentials" target="_blank">https://console.cloud.google.com/apis/credentials</a></p>
    </div>
    
    <div class="section">
        <h2>⚙️ Recommended Configuration Strategy</h2>
        <p><strong>Primary Method:</strong> ${analysis.apiKeyStrategy}</p>
        <p><strong>Fallback Methods:</strong> ${analysis.current.fallbackMethods.join(', ')}</p>
        
        <h3>Setup Script:</h3>
        <div class="code">
&lt;script&gt;<br>
  // Primary: Window Global Method<br>
  window.__GOOGLE_MAPS_API_KEY__ = "YOUR_API_KEY_HERE";<br>
  window.__GOOGLE_MAPS_MAP_ID__ = "YOUR_MAP_ID_HERE";<br><br>
  
  // Fallback: Environment Object<br>
  window.__ENV__ = window.__ENV__ || {};<br>
  window.__ENV__.VITE_GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";<br>
&lt;/script&gt;<br><br>

&lt;!-- Meta Tag Fallback --&gt;<br>
&lt;meta name="google-maps-api-key" content="YOUR_API_KEY_HERE"&gt;<br>
&lt;meta name="google-maps-map-id" content="YOUR_MAP_ID_HERE"&gt;
        </div>
    </div>
    
    <div class="section">
        <h2>🔍 Debug Information</h2>
        <div class="code">
${Object.entries(analysis.debugInfo).map(([key, value]) => `${key}: ${value}`).join('<br>')}
        </div>
    </div>
    
    <div class="section">
        <h2>📞 Need Help?</h2>
        <p>If you're still experiencing issues after following these recommendations:</p>
        <ol>
            <li>Verify all API key restrictions are correctly set</li>
            <li>Wait 1-2 minutes for Google Cloud changes to take effect</li>
            <li>Clear browser cache and reload</li>
            <li>Check browser console for specific error messages</li>
        </ol>
    </div>
</body>
</html>`;
  }
}

/**
 * Quick domain configuration function
 */
export function quickConfigureDomain(
  apiKey: string, 
  mapId?: string,
  addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void
): DomainAnalysisResult {
  const manager = new DomainSpecificConfigManager(addLogFunction);
  const analysis = manager.analyzeDomain();
  
  // Apply configuration
  const success = manager.setupDomainSpecificConfig(apiKey, mapId);
  
  if (success) {
    analysis.recommendations.unshift('✅ Domain-specific configuration applied successfully');
  } else {
    analysis.issues.push('❌ Failed to apply domain-specific configuration');
  }
  
  return analysis;
}

/**
 * Export domain configuration manager creator
 */
export function createDomainConfigManager(addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void): DomainSpecificConfigManager {
  return new DomainSpecificConfigManager(addLogFunction);
}