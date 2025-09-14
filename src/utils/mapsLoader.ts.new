import { Loader } from "@googlemaps/js-api-loader";
import { createRobustApiKeyGetter } from './youwareEnvDiagnostics';
import { quickConfigureDomain } from './domainSpecificConfig';

// Enhanced YouWare platform detection with UUID subdomain support
function detectYouWarePlatform(): boolean {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  const isYouWareDomain = isYouWareComDomain(hostname) || 
                         isYouWareAppDomain(hostname) ||
                         isYouWareUUIDSubdomain(hostname);
  
  const isYouWarePath = pathname.includes('/editor/') || 
                       pathname.includes('/project/') ||
                       pathname.includes('/app/');
  
  return isYouWareDomain || isYouWarePath;
}

// YouWare domain detection helper functions
function isYouWareComDomain(hostname: string): boolean {
  return hostname.includes('youware.com') || hostname.endsWith('youware.com');
}

function isYouWareAppDomain(hostname: string): boolean {
  return hostname.includes('youware.app') || hostname.endsWith('youware.app');
}

function isYouWareUUIDSubdomain(hostname: string): boolean {
  // Pattern: UUID--TIMESTAMP--ID.app.yourware.app
  // Example: 2717717e-d5b0-431d-acef-f529239d0eae--1757757600--121841c0.app.yourware.app
  const uuidSubdomainPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}--\d+--[0-9a-f]+\.app\.yourware\.app$/i;
  
  // Also check for any subdomain ending with .app.yourware.app
  const generalSubdomainPattern = /\.app\.yourware\.app$/i;
  
  return uuidSubdomainPattern.test(hostname) || generalSubdomainPattern.test(hostname);
}

// Get detailed YouWare domain information
function getYouWareDomainInfo(): {
  domain: string;
  subdomain: string;
  path: string;
  isEditorPath: boolean;
  isProjectPath: boolean;
  expectedApiRestrictions: string[];
} {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  const isEditorPath = pathname.includes('/editor/');
  const isProjectPath = pathname.includes('/project/');
  
  let expectedRestrictions: string[] = [];
  
  if (isYouWareComDomain(hostname)) {
    expectedRestrictions = ['*.youware.com/*', 'youware.com/*', 'www.youware.com/*'];
  } else if (isYouWareUUIDSubdomain(hostname)) {
    expectedRestrictions = ['*.app.yourware.app/*', '*--*--*.app.yourware.app/*', '*.yourware.app/*'];
  } else if (isYouWareAppDomain(hostname)) {
    expectedRestrictions = ['*.youware.app/*', 'youware.app/*', '*.app.yourware.app/*'];
  }
  
  return {
    domain: hostname,
    subdomain: hostname.split('.')[0] || '',
    path: pathname,
    isEditorPath,
    isProjectPath,
    expectedApiRestrictions: expectedRestrictions
  };
}

// YouWare-compatible API key getter
const getRobustApiKey = createRobustApiKeyGetter(() => {});

// YouWare-compatible Map ID getter
function getRobustMapId(): string {
  const sources = [
    () => (window as any).__GOOGLE_MAPS_MAP_ID__,
    () => (window as any).__ENV__?.VITE_MAP_ID,
    () => (import.meta as any).env?.VITE_MAP_ID,
    () => document.querySelector('meta[name="google-maps-map-id"]')?.getAttribute('content'),
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

// Map IDの設定（YouWare対応版）
export const MAP_ID = getRobustMapId();

// Google Maps APIローダーの設定（YouWare対応版）
export const mapsLoader = new Loader({
  apiKey: getRobustApiKey() || 'AIzaSyB9ZWlR7NRnN0znuLZuNKfaimKuUaMmHNc',
  version: "weekly",
  libraries: ["places", "marker", "maps"],
  mapIds: [MAP_ID]
});

// 必要なライブラリを読み込む関数
export async function loadMapsLibraries() {
  try {
    // デバッグモードまたは開発環境でログ出力
    const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV;
    
    if (debugMode) {
      console.log('🚀 Loading Google Maps libraries...');
      const currentApiKey = getRobustApiKey();
      const currentMapId = getRobustMapId();
      
      // Apply domain-specific configuration if we have an API key
      if (currentApiKey) {
        console.log('🔧 Applying domain-specific configuration...');
        const domainConfig = quickConfigureDomain(currentApiKey, currentMapId, (level, category, message, data) => {
          if (debugMode) console.log(`[${level.toUpperCase()}] ${category}: ${message}`, data);
        });
        
        if (domainConfig.issues.length > 0) {
          console.warn('⚠️ Domain configuration issues detected:');
          domainConfig.issues.forEach(issue => console.warn(`  - ${issue}`));
        }
        
        console.log('💡 Domain recommendations:');
        domainConfig.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
      console.log('🔧 Configuration:', {
        apiKey: currentApiKey ? currentApiKey.substring(0, 20) + '...' : 'Not found',
        apiKeySource: currentApiKey ? 'Found via robust getter' : 'Using fallback',
        mapId: currentMapId,
        domain: window.location.hostname,
        path: window.location.pathname,
        isHttps: window.location.protocol === 'https:',
        isYouWare: detectYouWarePlatform(),
        youWareDomain: getYouWareDomainInfo(),
        viteEnvAvailable: !!(import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY,
        windowGlobalAvailable: !!(window as any).__GOOGLE_MAPS_API_KEY__
      });
    }
    
    // 必要なライブラリを順次読み込み
    await mapsLoader.importLibrary("maps");
    await mapsLoader.importLibrary("marker");
    await mapsLoader.importLibrary("places");
    
    if (debugMode) {
      console.log('✅ Google Maps libraries loaded successfully');
      console.log('📦 Available services:', {
        maps: !!window.google?.maps,
        places: !!window.google?.maps?.places,
        marker: !!window.google?.maps?.marker,
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load Google Maps libraries:', error);
    
    // Enhanced error reporting
    if (error instanceof Error) {
      if (error.message.includes('RefererNotAllowedMapError')) {
        console.error('🚨 DOMAIN RESTRICTION ERROR: API Key does not allow this domain');
        console.error('💡 This is likely the ROOT CAUSE of your issue!');
        console.error('🔧 Current domain:', window.location.hostname);
        console.error('📍 Current path:', window.location.pathname);
        console.error('🌐 YouWare domains require BOTH to be added to API restrictions:');
        console.error('   - *.youware.com/* (for www.youware.com/editor/...)');
        console.error('   - *.youware.app/* (for youware.app/project/...)');
        console.error('   - *.app.yourware.app/* (for UUID-based subdomains like UUID--TIMESTAMP--ID.app.yourware.app)');
        console.error('💡 Fix: Add BOTH domains to API Key HTTP referrer restrictions');
        console.error('🔗 Go to: https://console.cloud.google.com/apis/credentials');
        
        // Specific guidance based on current domain
        const domainInfo = getYouWareDomainInfo();
        console.group('🛠️ DOMAIN RESTRICTION FIX STEPS:');
        console.log('1. Open Google Cloud Console: https://console.cloud.google.com/apis/credentials');
        console.log('2. Find your API key and click on it');
        console.log('3. Under "Application restrictions" > "HTTP referrers"');
        console.log('4. Add these referrer restrictions:');
        domainInfo.expectedApiRestrictions.forEach((restriction, index) => {
          console.log(`   ${index + 1}. ${restriction}`);
        });
        console.log('5. Save the changes');
        console.log('6. Wait 1-2 minutes for changes to take effect');
        console.log('\nCurrent domain details:');
        console.log(`   Domain: ${domainInfo.domain}`);
        console.log(`   Path: ${domainInfo.path}`);
        console.log(`   Is Editor Path: ${domainInfo.isEditorPath}`);
        console.log(`   Is Project Path: ${domainInfo.isProjectPath}`);
        console.groupEnd();
      } else if (error.message.includes('InvalidKeyMapError')) {
        console.error('🚨 INVALID API KEY ERROR: API Key is invalid or disabled');
        console.error('💡 Fix: Check API Key in Google Cloud Console');
        const currentApiKey = getRobustApiKey();
        console.error('Current API Key source:', currentApiKey ? 'Found' : 'Using fallback');
        console.error('Check these locations:');
        console.error('  - window.__GOOGLE_MAPS_API_KEY__');
        console.error('  - import.meta.env.VITE_GOOGLE_MAPS_API_KEY');
        console.error('  - Meta tag: google-maps-api-key');
      } else if (error.message.includes('RequestDeniedMapError')) {
        console.error('🚨 REQUEST DENIED ERROR: API request was denied');
        console.error('💡 Fix: Enable Maps JavaScript API in Google Cloud Console');
        console.error('🔗 Go to: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com');
        console.error('Make sure these APIs are enabled:');
        console.error('  - Maps JavaScript API');
        console.error('  - Places API');
        console.error('  - Maps Embed API (if using embedded maps)');
      }
    }
    
    throw error;
  }
}

// Google Mapsが読み込まれているかチェック
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google && window.google.maps);
}

// 新しいセッショントークンを生成
export function createSessionToken(): google.maps.places.AutocompleteSessionToken | null {
  if (!isGoogleMapsLoaded()) return null;
  return new window.google.maps.places.AutocompleteSessionToken();
}