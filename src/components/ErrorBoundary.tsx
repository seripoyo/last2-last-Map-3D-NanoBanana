import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps API Error caught by ErrorBoundary:', error, errorInfo);
    
    // Handle specific Google Maps API errors
    if (error.message.includes('Google Maps') || error.message.includes('ApiTargetBlockedMapError')) {
      console.error('🗺️ Google Maps API configuration issue detected');
      console.error('Please ensure Places API is enabled in Google Cloud Console');
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
  const isGoogleMapsError = error?.message.includes('Google Maps') || 
                           error?.message.includes('ApiTargetBlockedMapError');

  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center p-6 max-w-md">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            🗺️
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {isGoogleMapsError ? 'マップサービスの設定エラー' : 'エラーが発生しました'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {isGoogleMapsError 
              ? 'Google Maps APIの設定に問題があります。Places APIが有効になっていることを確認してください。'
              : 'アプリケーションでエラーが発生しました。ページを再読み込みしてお試しください。'
            }
          </p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4A90E2] hover:bg-[#357ABD] text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ページを再読み込み
        </button>
        
        {isGoogleMapsError && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-left">
            <strong>開発者向け情報:</strong>
            <br />
            Google Cloud Consoleで以下を確認してください:
            <ul className="list-disc ml-4 mt-1">
              <li>Places APIが有効になっている</li>
              <li>APIキーにPlaces APIの権限がある</li>
              <li>APIキーの制限設定が正しい</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};