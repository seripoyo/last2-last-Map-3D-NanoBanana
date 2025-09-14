/**
 * YouWare Deployment Validation Report Generator
 * 
 * Generates comprehensive reports for Google Maps API deployment validation
 * specifically for YouWare platform, focusing on issues beyond billing and domains.
 */

import { DebugLog } from '../hooks/useDebugLogger';
import { YouWareEnvDiagnostics, YouWareEnvDiagnosticResult } from './youwareEnvDiagnostics';
import { YouWareApiValidator, ApiKeyValidationResult } from './youwareApiValidator';
import { YouWarePlatformTester, PlatformConstraintTestResult } from './youwarePlatformTests';
import { YouWareConfigManager, YouWareConfigResult } from './youwareConfigMethods';

export interface ValidationReportResult {
  timestamp: string;
  platform: 'YouWare' | 'Local' | 'Other';
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  summary: {
    criticalIssues: number;
    warnings: number;
    recommendations: number;
    workingMethods: number;
  };
  diagnostics: {
    environment: YouWareEnvDiagnosticResult;
    apiValidation: ApiKeyValidationResult;
    platformConstraints: PlatformConstraintTestResult;
    configuration: YouWareConfigResult;
  };
  actionItems: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    issue: string;
    solution: string;
    code?: string;
  }>;
  successfulWorkarounds: string[];
  htmlReport: string;
  jsonReport: string;
}

export class YouWareValidationReporter {
  private addLog: (level: DebugLog['level'], category: string, message: string, data?: any) => void;
  
  constructor(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
  }

  /**
   * Generate comprehensive validation report
   */
  async generateFullReport(apiKey?: string): Promise<ValidationReportResult> {
    this.addLog('info', 'YouWareValidationReporter', 'Starting comprehensive validation report generation');

    const timestamp = new Date().toISOString();
    
    // Run all diagnostic tests in parallel
    const [envDiagnostics, apiValidation, platformTests, configResults] = await Promise.all([
      new YouWareEnvDiagnostics(this.addLog).diagnoseEnvironment(),
      new YouWareApiValidator(this.addLog).validateApiKey(apiKey),
      new YouWarePlatformTester(this.addLog).runPlatformTests(),
      new YouWareConfigManager(this.addLog).configureBestMethod(apiKey || '', undefined)
    ]);

    const result: ValidationReportResult = {
      timestamp,
      platform: this.detectPlatform(),
      overallStatus: 'FAIL',
      summary: {
        criticalIssues: 0,
        warnings: 0,
        recommendations: 0,
        workingMethods: 0
      },
      diagnostics: {
        environment: envDiagnostics,
        apiValidation: apiValidation,
        platformConstraints: platformTests,
        configuration: configResults
      },
      actionItems: [],
      successfulWorkarounds: [],
      htmlReport: '',
      jsonReport: ''
    };

    // Analyze results and generate action items
    this.analyzeResults(result);
    
    // Generate reports
    result.htmlReport = this.generateHtmlReport(result);
    result.jsonReport = JSON.stringify(result, null, 2);

    // Log summary
    this.addLog(
      result.overallStatus === 'PASS' ? 'info' : 'warn',
      'YouWareValidationReporter',
      `Validation report completed: ${result.overallStatus}`,
      {
        criticalIssues: result.summary.criticalIssues,
        warnings: result.summary.warnings,
        workingMethods: result.summary.workingMethods
      }
    );

    return result;
  }

  /**
   * Generate quick diagnostic report
   */
  async generateQuickReport(): Promise<{
    status: 'PASS' | 'FAIL' | 'WARNING';
    issues: string[];
    quickFixes: string[];
    detailedReportAvailable: boolean;
  }> {
    const envCheck = await new YouWareEnvDiagnostics(this.addLog).diagnoseEnvironment();
    const apiCheck = await new YouWareApiValidator(this.addLog).validateApiKey();

    const issues = [...envCheck.issues, ...apiCheck.errors];
    const quickFixes = [...envCheck.recommendations.slice(0, 3), ...apiCheck.recommendations.slice(0, 2)];

    return {
      status: issues.length === 0 ? 'PASS' : issues.length < 3 ? 'WARNING' : 'FAIL',
      issues: issues.slice(0, 5),
      quickFixes: quickFixes.slice(0, 5),
      detailedReportAvailable: true
    };
  }

  /**
   * Generate YouWare-specific deployment guide
   */
  generateDeploymentGuide(apiKey: string, mapId?: string): string {
    return `
# YouWare Google Maps API Deployment Guide

## Step 1: API Key Configuration

Add this script to your YouWare project's HTML head section:

\`\`\`html
<script>
  // Multiple configuration methods for maximum compatibility
  window.__GOOGLE_MAPS_API_KEY__ = "${apiKey}";
  ${mapId ? `window.__GOOGLE_MAPS_MAP_ID__ = "${mapId}";` : ''}
  
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.VITE_GOOGLE_MAPS_API_KEY = "${apiKey}";
  ${mapId ? `window.__ENV__.VITE_MAP_ID = "${mapId}";` : ''}
</script>
\`\`\`

## Step 2: Meta Tag Configuration

Add these meta tags to your HTML head:

\`\`\`html
<meta name="google-maps-api-key" content="${apiKey}">
${mapId ? `<meta name="google-maps-map-id" content="${mapId}">` : ''}
\`\`\`

## Step 3: Domain Configuration

Ensure your Google Cloud Console API key restrictions include:
- \`*.youware.app/*\`
- \`*.youware.com/*\`
- \`*.app.yourware.app/*\` (for UUID-based subdomains)
- Your specific YouWare domain

## Step 4: Verification

Use the built-in diagnostic tools to verify configuration:

\`\`\`javascript
import { quickYouWareEnvDiagnose } from './utils/youwareEnvDiagnostics';
import { quickValidateApiKey } from './utils/youwareApiValidator';

// Run diagnostics
const envResults = await quickYouWareEnvDiagnose(console.log);
const apiResults = await quickValidateApiKey();
\`\`\`

## Troubleshooting

If you still have issues:
1. Check browser developer console for specific error messages
2. Use the comprehensive validation report
3. Try the platform constraint tests
4. Consider using iframe embedding as fallback

## Support

This configuration addresses YouWare-specific environment variable handling issues.
Contact support if problems persist after following this guide.
`;
  }

  private detectPlatform(): 'YouWare' | 'Local' | 'Other' {
    const hostname = window.location.hostname;
    
    // Enhanced YouWare detection with UUID subdomain support
    const isYouWareComDomain = hostname.includes('youware.com') || hostname.endsWith('youware.com');
    const isYouWareAppDomain = hostname.includes('youware.app') || hostname.endsWith('youware.app');
    const isYouWareUUIDSubdomain = this.isYouWareUUIDSubdomain(hostname);
    
    if (isYouWareComDomain || isYouWareAppDomain || isYouWareUUIDSubdomain) {
      return 'YouWare';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
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

  private analyzeResults(result: ValidationReportResult): void {
    const { diagnostics } = result;

    // Environment Analysis
    if (diagnostics.environment.issues.length > 0) {
      diagnostics.environment.issues.forEach(issue => {
        result.actionItems.push({
          priority: 'HIGH',
          category: 'Environment Variables',
          issue,
          solution: this.getSolutionForEnvironmentIssue(issue),
          code: this.getCodeForEnvironmentIssue(issue)
        });
      });
      result.summary.criticalIssues += diagnostics.environment.issues.length;
    }

    // API Validation Analysis
    if (!diagnostics.apiValidation.isValid) {
      diagnostics.apiValidation.errors.forEach(error => {
        result.actionItems.push({
          priority: 'HIGH',
          category: 'API Key Validation',
          issue: error,
          solution: this.getSolutionForApiError(error),
          code: this.getCodeForApiError(error)
        });
      });
      result.summary.criticalIssues += diagnostics.apiValidation.errors.length;
    }

    // Platform Constraints Analysis
    const constraintIssues = Object.entries(diagnostics.platformConstraints.constraints)
      .filter(([_, constraint]) => constraint.restricted)
      .length;
    
    if (constraintIssues > 0) {
      result.actionItems.push({
        priority: 'MEDIUM',
        category: 'Platform Constraints',
        issue: `${constraintIssues} platform constraints detected`,
        solution: 'Use alternative loading methods or iframe embedding',
        code: this.getCodeForPlatformConstraints()
      });
      result.summary.warnings += constraintIssues;
    }

    // Configuration Analysis
    if (diagnostics.configuration.activeMethod) {
      result.successfulWorkarounds.push(`Configuration method: ${diagnostics.configuration.activeMethod}`);
      result.summary.workingMethods++;
    } else {
      result.actionItems.push({
        priority: 'HIGH',
        category: 'Configuration',
        issue: 'No working configuration method found',
        solution: 'Use multiple configuration methods simultaneously',
        code: this.getCodeForConfigurationFallback()
      });
      result.summary.criticalIssues++;
    }

    // Determine overall status
    if (result.summary.criticalIssues === 0) {
      result.overallStatus = result.summary.warnings > 0 ? 'WARNING' : 'PASS';
    } else {
      result.overallStatus = 'FAIL';
    }

    // Count recommendations
    result.summary.recommendations = result.actionItems.length;
  }

  private getSolutionForEnvironmentIssue(issue: string): string {
    if (issue.includes('VITE_GOOGLE_MAPS_API_KEY')) {
      return 'Set API key using multiple methods: window global, meta tag, and localStorage';
    }
    if (issue.includes('import.meta.env')) {
      return 'Use alternative configuration methods for YouWare platform';
    }
    return 'Check environment variable configuration';
  }

  private getCodeForEnvironmentIssue(issue: string): string {
    if (issue.includes('VITE_GOOGLE_MAPS_API_KEY')) {
      return `
// Set API key using multiple methods
window.__GOOGLE_MAPS_API_KEY__ = "your-api-key";
localStorage.setItem('GOOGLE_MAPS_API_KEY', 'your-api-key');
`;
    }
    return '';
  }

  private getSolutionForApiError(error: string): string {
    if (error.includes('format')) {
      return 'Generate a new API key from Google Cloud Console';
    }
    if (error.includes('domain') || error.includes('referrer')) {
      return 'Add YouWare domains to API key restrictions';
    }
    if (error.includes('quota')) {
      return 'Check API usage and increase quotas if needed';
    }
    return 'Verify API key configuration in Google Cloud Console';
  }

  private getCodeForApiError(error: string): string {
    if (error.includes('domain')) {
      return `
// Add these domains to your API key restrictions:
// *.youware.app/*
// *.youware.com/*
// *.app.yourware.app/* (for UUID-based subdomains)
// your-specific-domain.youware.app/*
`;
    }
    return '';
  }

  private getCodeForPlatformConstraints(): string {
    return `
// Fallback iframe embedding for constrained platforms
const mapContainer = document.getElementById('map');
if (window.google && window.google.maps) {
  // Use JavaScript API
  initializeGoogleMap();
} else {
  // Fallback to iframe embed
  mapContainer.innerHTML = \`
    <iframe 
      src="https://www.google.com/maps/embed?pb=!1m18!1m12..."
      style="width: 100%; height: 100%; border: 0;"
      loading="lazy">
    </iframe>
  \`;
}
`;
  }

  private getCodeForConfigurationFallback(): string {
    return `
// Multi-method API key configuration
function configureApiKey(apiKey) {
  // Method 1: Window global
  window.__GOOGLE_MAPS_API_KEY__ = apiKey;
  
  // Method 2: Environment object
  window.__ENV__ = window.__ENV__ || {};
  window.__ENV__.VITE_GOOGLE_MAPS_API_KEY = apiKey;
  
  // Method 3: LocalStorage
  localStorage.setItem('GOOGLE_MAPS_API_KEY', apiKey);
  
  // Method 4: Meta tag
  let meta = document.querySelector('meta[name="google-maps-api-key"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'google-maps-api-key';
    document.head.appendChild(meta);
  }
  meta.content = apiKey;
}
`;
  }

  private generateHtmlReport(result: ValidationReportResult): string {
    const statusColor = result.overallStatus === 'PASS' ? '#10B981' : 
                       result.overallStatus === 'WARNING' ? '#F59E0B' : '#EF4444';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>YouWare Google Maps API Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; background: ${statusColor}; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .critical { border-left: 4px solid #EF4444; }
        .warning { border-left: 4px solid #F59E0B; }
        .success { border-left: 4px solid #10B981; }
        .code { background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: 'Monaco', monospace; font-size: 12px; overflow-x: auto; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .metric { text-align: center; padding: 10px; }
        .metric-value { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>YouWare Google Maps API Validation Report</h1>
        <p>Generated: ${result.timestamp}</p>
        <p>Platform: ${result.platform} | Status: <span class="status">${result.overallStatus}</span></p>
    </div>

    <div class="grid">
        <div class="metric">
            <div class="metric-value" style="color: #EF4444">${result.summary.criticalIssues}</div>
            <div>Critical Issues</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #F59E0B">${result.summary.warnings}</div>
            <div>Warnings</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #10B981">${result.summary.workingMethods}</div>
            <div>Working Methods</div>
        </div>
        <div class="metric">
            <div class="metric-value" style="color: #6366F1">${result.summary.recommendations}</div>
            <div>Recommendations</div>
        </div>
    </div>

    <div class="section">
        <h2>Action Items</h2>
        ${result.actionItems.map(item => `
            <div class="section ${item.priority === 'HIGH' ? 'critical' : item.priority === 'MEDIUM' ? 'warning' : 'info'}">
                <h3>[${item.priority}] ${item.category}</h3>
                <p><strong>Issue:</strong> ${item.issue}</p>
                <p><strong>Solution:</strong> ${item.solution}</p>
                ${item.code ? `<div class="code">${item.code.trim()}</div>` : ''}
            </div>
        `).join('')}
    </div>

    <div class="section success">
        <h2>Successful Workarounds</h2>
        <ul>
            ${result.successfulWorkarounds.map(workaround => `<li>${workaround}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>Environment Diagnostics</h2>
        <p><strong>API Key Source:</strong> ${result.diagnostics.apiValidation.keySource}</p>
        <p><strong>Vite Environment Access:</strong> ${result.diagnostics.environment.environmentAccess.viteMetaEnv ? '✅' : '❌'}</p>
        <p><strong>Window Environment Access:</strong> ${result.diagnostics.environment.environmentAccess.windowEnv ? '✅' : '❌'}</p>
        <p><strong>Meta Tag Access:</strong> ${result.diagnostics.environment.environmentAccess.metaAttributes ? '✅' : '❌'}</p>
    </div>

    <div class="section">
        <h2>Platform Constraints</h2>
        <p><strong>CSP Restrictions:</strong> ${result.diagnostics.platformConstraints.constraints.csp.restricted ? '⚠️ Yes' : '✅ No'}</p>
        <p><strong>CORS Issues:</strong> ${result.diagnostics.platformConstraints.constraints.cors.restricted ? '⚠️ Yes' : '✅ No'}</p>
        <p><strong>Script Loading:</strong> ${result.diagnostics.platformConstraints.constraints.scriptLoading.restricted ? '⚠️ Restricted' : '✅ Allowed'}</p>
        <p><strong>Google Maps Reachable:</strong> ${result.diagnostics.platformConstraints.apiSpecific.googleMapsReachable ? '✅ Yes' : '❌ No'}</p>
    </div>

    <div class="section">
        <h2>Technical Details</h2>
        <div class="code">${JSON.stringify(result.diagnostics, null, 2)}</div>
    </div>
</body>
</html>
    `.trim();
  }
}

/**
 * Quick validation report function
 */
export async function generateQuickValidationReport(
  apiKey?: string,
  addLogFunction?: (level: DebugLog['level'], category: string, message: string, data?: any) => void
): Promise<ValidationReportResult> {
  const reporter = new YouWareValidationReporter(addLogFunction || (() => {}));
  return await reporter.generateFullReport(apiKey);
}

/**
 * Generate deployment guide
 */
export function generateYouWareDeploymentGuide(apiKey: string, mapId?: string): string {
  const reporter = new YouWareValidationReporter(() => {});
  return reporter.generateDeploymentGuide(apiKey, mapId);
}

/**
 * Create reporter instance
 */
export function createValidationReporter(addLogFunction: (level: DebugLog['level'], category: string, message: string, data?: any) => void): YouWareValidationReporter {
  return new YouWareValidationReporter(addLogFunction);
}