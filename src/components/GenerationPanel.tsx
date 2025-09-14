import React from 'react';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';

interface GenerationPanelProps {
  title: string;
  subtitle: string;
  image: string | null;
  isLoading: boolean;
  bgColor?: string;
  borderColor?: string;
}

export function GenerationPanel({
  title,
  subtitle,
  image,
  isLoading,
  bgColor = 'bg-white',
  borderColor = 'border-gray-200'
}: GenerationPanelProps) {
  
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);
  
  const handleDownload = async () => {
    if (!image) return;
    
    try {
      // Base64画像の場合は直接ダウンロード
      if (image.startsWith('data:image/')) {
        // Generate filename with current date-time and image type
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hour = String(currentDate.getHours()).padStart(2, '0');
        const minute = String(currentDate.getMinutes()).padStart(2, '0');
        
        let imageType = 'unknown';
        if (title.toLowerCase().includes('isometric')) {
          imageType = 'isometric';
        } else if (title.toLowerCase().includes('hologram')) {
          imageType = 'hologram';
        } else if (title.toLowerCase().includes('line')) {
          imageType = 'line_art';
        }
        
        const filename = `${year}-${month}-${day}-${hour}${minute}-${imageType}.png`;
        
        const link = document.createElement('a');
        link.href = image;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ Base64画像のダウンロード完了:', title, 'ファイル名:', filename);
      } else {
        // URL画像の場合はfetch後にダウンロード
        const response = await fetch(image);
        if (!response.ok) {
          throw new Error(`画像の取得に失敗: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Generate filename with current date-time and image type
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hour = String(currentDate.getHours()).padStart(2, '0');
        const minute = String(currentDate.getMinutes()).padStart(2, '0');
        
        let imageType = 'unknown';
        if (title.toLowerCase().includes('isometric')) {
          imageType = 'isometric';
        } else if (title.toLowerCase().includes('hologram')) {
          imageType = 'hologram';
        } else if (title.toLowerCase().includes('line')) {
          imageType = 'line_art';
        }
        
        const filename = `${year}-${month}-${day}-${hour}${minute}-${imageType}.png`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // メモリリークを防ぐためにURLを解放
        URL.revokeObjectURL(url);
        console.log('✅ URL画像のダウンロード完了:', title, 'ファイル名:', filename);
      }
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert(`ダウンロードに失敗しました: ${(error as Error).message}`);
    }
  };

  const handleImageLoad = () => {
    console.log('✅ 画像読み込み完了:', title);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('❌ 画像読み込みエラー:', title, event);
    setImageError(true);
    setImageLoaded(false);
  };

  // Reset image state when image prop changes with enhanced Base64 detection and timeout protection
  React.useEffect(() => {
    if (image) {
      setImageError(false);
      setImageLoaded(false);
      
      // Enhanced Base64 detection - check for proper data URI format
      const isBase64Image = image.startsWith('data:image/') && image.includes('base64,');
      const isValidUrl = image.startsWith('http://') || image.startsWith('https://');
      
      if (isBase64Image) {
        // Validate Base64 data integrity
        const base64Part = image.split('base64,')[1];
        if (base64Part && base64Part.length > 100) { // Minimum length check for valid image
          console.log('📸 Valid Base64 image detected - setting loaded state:', title);
          // Use a very short timeout to ensure proper rendering
          const quickLoadTimer = setTimeout(() => {
            setImageLoaded(true);
          }, 50);
          
          return () => clearTimeout(quickLoadTimer);
        } else {
          console.warn('⚠️ Invalid Base64 data detected:', title);
          setImageError(true);
          return;
        }
      } else if (isValidUrl) {
        // For URL images, set comprehensive timeout protection
        const forceLoadTimer = setTimeout(() => {
          if (imageRef.current && !imageError) {
            console.log('⚡ Image load timeout - forcing display state:', title);
            setImageLoaded(true);
          }
        }, 8000); // 8 seconds timeout for network images
        
        // Preload check - if image is already in browser cache, onLoad might not fire
        const preloadCheck = setTimeout(() => {
          if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
            console.log('🚀 Cached image detected - immediate display:', title);
            setImageLoaded(true);
          }
        }, 200);
        
        return () => {
          clearTimeout(forceLoadTimer);
          clearTimeout(preloadCheck);
        };
      } else {
        console.error('❌ Invalid image format detected:', image.substring(0, 100));
        setImageError(true);
      }
    } else {
      // Reset state when image is null
      setImageError(false);
      setImageLoaded(false);
    }
  }, [image, imageError, title]);

  return (
    <div className={`${bgColor} rounded-xl shadow-lg border-2 ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 ${bgColor.includes('gradient') ? 'text-white' : 'text-[#411307]'}`} 
           style={bgColor.includes('gradient') ? { 
             backgroundImage: bgColor.includes('from-[#a12a0b]') ? 'linear-gradient(to bottom right, #a12a0b, #e26300)' :
                             bgColor.includes('from-[#0e5153]') ? 'linear-gradient(to bottom right, #0e5153, #06dbd7)' :
                             bgColor.includes('from-[#b5afab]') ? 'linear-gradient(to bottom right, #b5afab, #544f4a)' : 
                             undefined,
             color: 'white'
           } : {}}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className={`text-sm ${bgColor.includes('gradient') ? 'text-white opacity-80' : 'text-[#8A3216]'}`}>
          {subtitle}
        </p>
      </div>

      {/* Content Area */}
      <div className="p-6 bg-white min-h-[300px] flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-[#E67D1A] animate-spin mx-auto mb-2" />
            <p className="text-sm text-[#8A3216]">生成中...</p>
          </div>
        ) : image ? (
          <div className="space-y-4 w-full">
            <div className="bg-gray-50 rounded-lg p-4">
              {imageError ? (
                <div className="text-center text-red-500 p-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-red-400" />
                  <p className="text-sm">画像の表示に失敗しました</p>
                  <p className="text-xs text-gray-500 mt-1">
                    画像が破損しているか、形式がサポートされていません
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {!imageLoaded && (
                    <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg transition-opacity duration-500 ${
                      imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}>
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 text-[#E67D1A] animate-spin mx-auto mb-2" />
                        <p className="text-xs text-gray-500">画像を読み込んでいます...</p>
                      </div>
                    </div>
                  )}
                  <img
                    ref={imageRef}
                    src={image}
                    alt={title}
                    className={`w-full h-auto rounded-lg shadow-md max-w-sm mx-auto transition-all duration-500 ease-in-out ${
                      imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                      // Ensure minimum dimensions and smooth transitions
                      minHeight: imageLoaded ? 'auto' : '200px',
                      // Prevent layout shift during loading
                      aspectRatio: imageLoaded ? 'auto' : '1',
                      // Smooth transition properties
                      transformOrigin: 'center',
                      // Force hardware acceleration for smooth transitions
                      willChange: imageLoaded ? 'auto' : 'opacity, transform'
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Download Button - only show if image loaded successfully */}
            {imageLoaded && !imageError && (
              <div className="text-center">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center space-x-2 bg-[#E67D1A] hover:bg-[#CC5C13] text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  <span>ダウンロード</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">Just a moment...</p>
          </div>
        )}
      </div>
    </div>
  );
}