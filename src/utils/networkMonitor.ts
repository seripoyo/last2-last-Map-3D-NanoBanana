// Network Request Monitor for Google Maps API debugging

interface NetworkLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  isGoogleMapsRequest: boolean;
}

export class NetworkMonitor {
  private originalFetch: typeof window.fetch;
  private originalXHR: typeof XMLHttpRequest;
  private logs: NetworkLog[] = [];
  private addLog: (level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, data?: any) => void;

  constructor(addLogFunction: (level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, data?: any) => void) {
    this.addLog = addLogFunction;
    this.originalFetch = window.fetch;
    this.originalXHR = XMLHttpRequest;
  }

  // Start monitoring network requests
  startMonitoring(): void {
    this.addLog('info', 'NetworkMonitor', 'Starting network request monitoring');

    // Monitor fetch requests
    window.fetch = this.createFetchInterceptor();

    // Monitor XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, method: string, url: string | URL, ...args: any[]) {
      const urlString = typeof url === 'string' ? url : url.toString();
      (this as any)._networkMonitor = {
        method,
        url: urlString,
        startTime: performance.now(),
        requestHeaders: {}
      };
      return originalOpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(this: XMLHttpRequest, name: string, value: string) {
      if ((this as any)._networkMonitor) {
        (this as any)._networkMonitor.requestHeaders[name] = value;
      }
      return originalSetRequestHeader.apply(this, [name, value]);
    };

    const networkMonitorInstance = this;

    XMLHttpRequest.prototype.send = function(this: XMLHttpRequest, body?: any) {
      const monitor = (this as any)._networkMonitor;
      if (monitor) {
        monitor.requestBody = body;
        monitor.startTime = performance.now();

        const xhr = this;

        this.addEventListener('loadend', function() {
          const duration = performance.now() - monitor.startTime;
          const isGoogleMapsRequest = networkMonitorInstance.isGoogleMapsUrl(monitor.url);

          const responseHeaders: Record<string, string> = {};
          const responseHeaderString = xhr.getAllResponseHeaders();
          if (responseHeaderString) {
            responseHeaderString.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          const log: NetworkLog = {
            id: `xhr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            method: monitor.method,
            url: monitor.url,
            status: xhr.status,
            statusText: xhr.statusText,
            duration: Math.round(duration),
            requestHeaders: monitor.requestHeaders,
            responseHeaders,
            requestBody: monitor.requestBody,
            responseBody: xhr.responseText ? xhr.responseText.substring(0, 1000) : undefined,
            isGoogleMapsRequest
          };

          networkMonitorInstance.logNetworkRequest(log);
        });

        this.addEventListener('error', function() {
          const duration = performance.now() - monitor.startTime;
          const log: NetworkLog = {
            id: `xhr-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            method: monitor.method,
            url: monitor.url,
            duration: Math.round(duration),
            error: 'Network error occurred',
            isGoogleMapsRequest: networkMonitorInstance.isGoogleMapsUrl(monitor.url)
          };

          networkMonitorInstance.logNetworkRequest(log);
        });
      }

      return originalSend.apply(this, [body]);
    };
  }

  // Create fetch interceptor
  private createFetchInterceptor() {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || 'GET';
      const startTime = performance.now();
      const isGoogleMapsRequest = this.isGoogleMapsUrl(url);

      const requestHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            requestHeaders[key] = value;
          });
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            requestHeaders[key] = value;
          });
        }
      }

      try {
        const response = await this.originalFetch(input, init);
        const duration = performance.now() - startTime;

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Clone response to read body without consuming original
        const responseClone = response.clone();
        let responseBody: string | undefined;
        try {
          const text = await responseClone.text();
          responseBody = text.substring(0, 1000); // Limit to first 1000 chars
        } catch (e) {
          responseBody = 'Could not read response body';
        }

        const log: NetworkLog = {
          id: `fetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          duration: Math.round(duration),
          requestHeaders,
          responseHeaders,
          requestBody: init?.body,
          responseBody,
          isGoogleMapsRequest
        };

        this.logNetworkRequest(log);
        return response;

      } catch (error) {
        const duration = performance.now() - startTime;
        const log: NetworkLog = {
          id: `fetch-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          method,
          url,
          duration: Math.round(duration),
          error: (error as Error).message,
          requestHeaders,
          requestBody: init?.body,
          isGoogleMapsRequest
        };

        this.logNetworkRequest(log);
        throw error;
      }
    };
  }

  // Check if URL is related to Google Maps
  private isGoogleMapsUrl(url: string): boolean {
    const googleMapsPatterns = [
      'maps.googleapis.com',
      'maps.google.com',
      'mts0.googleapis.com',
      'mts1.googleapis.com',
      'mts2.googleapis.com',
      'mts3.googleapis.com',
      'mt0.googleapis.com',
      'mt1.googleapis.com',
      'mt2.googleapis.com',
      'mt3.googleapis.com',
      'khms0.googleapis.com',
      'khms1.googleapis.com',
      'khms2.googleapis.com',
      'khms3.googleapis.com'
    ];

    return googleMapsPatterns.some(pattern => url.includes(pattern));
  }

  // Log network request
  private logNetworkRequest(log: NetworkLog): void {
    this.logs.push(log);

    // Limit logs to prevent memory issues
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-250);
    }

    const level = log.error ? 'error' : log.status && log.status >= 400 ? 'warn' : 'info';
    const category = log.isGoogleMapsRequest ? 'Google Maps API' : 'Network';
    
    const message = `${log.method} ${log.url} ${log.status ? `(${log.status})` : ''} ${log.duration}ms`;
    
    const logData = {
      id: log.id,
      method: log.method,
      url: log.url,
      status: log.status,
      duration: log.duration,
      isGoogleMapsRequest: log.isGoogleMapsRequest,
      error: log.error,
      requestHeaders: log.requestHeaders,
      responseHeaders: log.responseHeaders
    };

    this.addLog(level, category, message, logData);

    // Special handling for Google Maps API errors
    if (log.isGoogleMapsRequest && (log.error || (log.status && log.status >= 400))) {
      this.analyzeGoogleMapsError(log);
    }
  }

  // Analyze Google Maps API specific errors
  private analyzeGoogleMapsError(log: NetworkLog): void {
    let errorMessage = 'Google Maps API request failed';
    const recommendations: string[] = [];

    if (log.status === 403) {
      errorMessage = 'Google Maps API access denied (403)';
      recommendations.push('Check API key validity and permissions');
      recommendations.push('Verify domain restrictions in Google Cloud Console');
      recommendations.push('Ensure required APIs are enabled');
    } else if (log.status === 401) {
      errorMessage = 'Google Maps API authentication failed (401)';
      recommendations.push('Check if API key is correctly set');
      recommendations.push('Verify API key has not expired');
    } else if (log.status === 429) {
      errorMessage = 'Google Maps API quota exceeded (429)';
      recommendations.push('Check API quota limits in Google Cloud Console');
      recommendations.push('Consider implementing request caching');
    } else if (log.status === 400) {
      errorMessage = 'Google Maps API bad request (400)';
      recommendations.push('Check request parameters and format');
      recommendations.push('Verify required parameters are included');
    } else if (log.error) {
      errorMessage = `Google Maps API network error: ${log.error}`;
      recommendations.push('Check network connectivity');
      recommendations.push('Verify CORS settings if running from browser');
    }

    this.addLog('error', 'Google Maps Analysis', errorMessage, {
      originalLog: log,
      recommendations
    });
  }

  // Get all network logs
  getNetworkLogs(): NetworkLog[] {
    return [...this.logs];
  }

  // Get Google Maps specific logs
  getGoogleMapsLogs(): NetworkLog[] {
    return this.logs.filter(log => log.isGoogleMapsRequest);
  }

  // Get error logs
  getErrorLogs(): NetworkLog[] {
    return this.logs.filter(log => log.error || (log.status && log.status >= 400));
  }

  // Clear network logs
  clearLogs(): void {
    this.logs = [];
    this.addLog('info', 'NetworkMonitor', 'Network logs cleared');
  }

  // Stop monitoring and restore original functions
  stopMonitoring(): void {
    window.fetch = this.originalFetch;
    // Note: XMLHttpRequest prototype methods cannot be easily restored
    // without keeping references to original methods per instance
    this.addLog('info', 'NetworkMonitor', 'Network monitoring stopped');
  }

  // Generate network report
  generateReport(): {
    summary: any;
    googleMapsRequests: NetworkLog[];
    errors: NetworkLog[];
    allLogs: NetworkLog[];
  } {
    const googleMapsLogs = this.getGoogleMapsLogs();
    const errorLogs = this.getErrorLogs();

    const summary = {
      totalRequests: this.logs.length,
      googleMapsRequests: googleMapsLogs.length,
      errorRequests: errorLogs.length,
      averageResponseTime: this.logs.length > 0 
        ? Math.round(this.logs.reduce((sum, log) => sum + log.duration, 0) / this.logs.length)
        : 0,
      statusCodes: this.logs.reduce((acc: Record<number, number>, log) => {
        if (log.status) {
          acc[log.status] = (acc[log.status] || 0) + 1;
        }
        return acc;
      }, {}),
      domains: [...new Set(this.logs.map(log => {
        try {
          return new URL(log.url).hostname;
        } catch {
          return 'invalid-url';
        }
      }))]
    };

    return {
      summary,
      googleMapsRequests: googleMapsLogs,
      errors: errorLogs,
      allLogs: this.logs
    };
  }
}

// Utility function to create network monitor
export function createNetworkMonitor(addLogFunction: (level: 'info' | 'warn' | 'error' | 'debug', category: string, message: string, data?: any) => void): NetworkMonitor {
  return new NetworkMonitor(addLogFunction);
}