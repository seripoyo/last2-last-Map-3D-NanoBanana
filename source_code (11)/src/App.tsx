import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Download, Building2, Box, Zap } from 'lucide-react';
import { DeepDebugSystem } from './components/DeepDebugSystem';
import { DeepDebugger } from './components/DeepDebugger';
import { DirectAIClient } from './components/DirectAIClient';
import { callYouWareAPI } from './utils/environmentDetector';

// Google Maps APIキー
const GOOGLE_MAPS_API_KEY = 'AIzaSyDUDTg2qpuIh3Yf0b80T0aViBmP2Dv1x7s';

interface PlaceData {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  placeId: string;
  types: string[];
}

interface ImageResult {
  url: string;
  type: 'isometric' | 'hologram' | 'line_drawing';
  isGenerating: boolean;
}

function App() {
  // 東京駅の情報を固定
  const [selectedPlace] = useState<PlaceData>({
    name: '東京駅',
    address: '日本、〒100-0005 東京都千代田区丸の内１丁目',
    location: {
      lat: 35.6812362,
      lng: 139.7671248
    },
    placeId: 'ChIJC3Cf2PuLGGARIKTCbdiwGkE',
    types: ['transit_station', 'train_station', 'point_of_interest', 'establishment']
  });
  
  const [imageResults, setImageResults] = useState<ImageResult[]>([
    { url: '', type: 'isometric', isGenerating: false },
    { url: '', type: 'hologram', isGenerating: false },
    { url: '', type: 'line_drawing', isGenerating: false }
  ]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Google Maps APIの初期化と3つの図面を自動生成
  useEffect(() => {
    const initializeMapAndGenerateImages = async () => {
      try {
        // Google Maps APIをロード
        if (!window.google) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }

        // マップを初期化（東京駅を中心に）
        if (mapRef.current && window.google) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: selectedPlace.location,
            zoom: 18,
            mapTypeId: 'satellite'
          });

          // 東京駅にマーカーを追加
          new google.maps.Marker({
            position: selectedPlace.location,
            map: mapInstanceRef.current,
            title: selectedPlace.name
          });
        }

        // 自動的に3つの図面を生成
        console.log('🎨 東京駅の3つの図面を自動生成開始');
        setTimeout(() => generateImage('isometric'), 1000);
        setTimeout(() => generateImage('hologram'), 2000);
        setTimeout(() => generateImage('line_drawing'), 3000);
        
      } catch (error) {
        console.error('Google Maps初期化エラー:', error);
      }
    };

    initializeMapAndGenerateImages();
  }, []);

  // 3つの図面を再生成
  const regenerateAllImages = () => {
    console.log('🔄 東京駅の3つの図面を再生成開始');
    generateImage('isometric');
    setTimeout(() => generateImage('hologram'), 1000);
    setTimeout(() => generateImage('line_drawing'), 2000);
  };

  // 画像生成
  const generateImage = async (type: 'isometric' | 'hologram' | 'line_drawing') => {

    const startTime = Date.now();
    console.log('🎨 画像生成開始:', { type, place: selectedPlace.name });

    // 生成状態を更新
    setImageResults(prev => prev.map(result => 
      result.type === type ? { ...result, isGenerating: true } : result
    ));

    try {
      // ywConfigが利用できない場合は手動で設定を定義
      let config = globalThis.ywConfig?.ai_config?.[`${type}_generator`];
      
      if (!config) {
        console.log('⚠️ globalThis.ywConfigが利用できないため、手動設定を使用します');
        const manualConfigs = {
          isometric_generator: {
            model: "nano-banana",
            temperature: 0.7,
            maxTokens: 4000,
            response_format: "b64_json",
            size: "1024x1024",
            prompt_template: (vars: any) => `Create a precise 3D isometric architectural drawing of ${vars.buildingType} from a 45° angle. Style: Minecraft HD-2D aesthetic. Include accurate dimensional measurements in millimeters (e.g., 18000 mm or 18.00 m). Add dimension lines like architectural CAD drawings. Show building width, height, road width based on ${vars.scale} from Google Maps. Add "ROOF ANGLE 45°" marking. Include north direction indicator in bottom right. No logos or imagery marks. Building only, focus on ${vars.address}. Dimensions: ${vars.dimensions}`
          },
          hologram_generator: {
            model: "nano-banana",
            temperature: 0.8,
            maxTokens: 4000,
            response_format: "b64_json",
            size: "1024x1024",
            prompt_template: (vars: any) => `Create a futuristic holographic projection of ${vars.buildingType} from a 45° angle. Show translucent, glowing architectural structure with blue-cyan hologram effect. Include precise dimensional measurements in millimeters visible as floating holographic text (e.g., 18000 mm, 18.00 m). Add dimension lines in glowing cyan. Show building measurements based on ${vars.scale}. Add "ROOF ANGLE 45°" holographic text. Include north indicator. No logos. Focus on ${vars.address}. Dimensions: ${vars.dimensions}`
          },
          line_drawing_generator: {
            model: "nano-banana",
            temperature: 0.5,
            maxTokens: 4000,
            response_format: "b64_json",
            size: "1024x1024",
            prompt_template: (vars: any) => `Create a precise black and white line drawing of ${vars.buildingType} from a 45° angle. Use ONLY black and white colors - no other colors allowed. Thick bold lines with strong shadows and hatching for 3D depth. Include accurate dimensional measurements in millimeters (e.g., 18000 mm or 18.00 m). Add architectural dimension lines. Show building measurements based on ${vars.scale}. Add "ROOF ANGLE 45°" text. Include north indicator in bottom right. No logos. Building focus on ${vars.address}. Dimensions: ${vars.dimensions}`
          }
        };
        config = manualConfigs[`${type}_generator` as keyof typeof manualConfigs];
      }
      
      if (!config) {
        throw new Error(`AI設定が見つかりません: ${type}_generator`);
      }

      // 東京駅の建物タイプ（駅舎建築）
      const buildingType = 'historical railway station building';

      // プロンプトテンプレートを実行
      const prompt = config.prompt_template({
        buildingType: buildingType,
        address: selectedPlace.address,
        scale: 'Google Maps satellite view scale',
        dimensions: `Building location: ${selectedPlace.location.lat}, ${selectedPlace.location.lng}`
      });

      console.log('🤖 AI API リクエスト:', {
        model: config.model,
        type: type,
        prompt: prompt.substring(0, 150) + '...',
        place: selectedPlace.name
      });

      const response = await callYouWareAPI('/images/generations', {
        method: 'POST',
        body: JSON.stringify({
          model: config.model,
          prompt: prompt,
          response_format: config.response_format,
          size: config.size
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ 画像生成リクエストエラー:', response.status, response.statusText, errorData);
        throw new Error(`画像生成リクエストが失敗しました: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 画像生成完了:', {
        type: type,
        model: config.model,
        place: selectedPlace.name,
        processingTime: `${Date.now() - startTime}ms`
      });

      if (data && data.data && data.data.length > 0) {
        const imageData = data.data[0];
        const imageUrl = imageData.b64_json
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        // 結果を更新
        setImageResults(prev => prev.map(result => 
          result.type === type ? { ...result, url: imageUrl, isGenerating: false } : result
        ));
      } else {
        throw new Error('無効な応答形式です');
      }
    } catch (error) {
      console.error('❌ 画像生成エラー:', {
        type: type,
        place: selectedPlace.name,
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      // エラー状態を更新
      setImageResults(prev => prev.map(result => 
        result.type === type ? { ...result, isGenerating: false } : result
      ));
      
      alert(`${type}画像の生成中にエラーが発生しました: ${error.message}`);
    }
  };

  // 画像をダウンロード
  const downloadImage = (imageUrl: string, type: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${selectedPlace?.name}_${type}_drawing.png`;
    link.click();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'isometric': return 'アイソメトリック';
      case 'hologram': return 'ホログラム';
      case 'line_drawing': return '線画';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'isometric': return <Box className="w-5 h-5" />;
      case 'hologram': return <Zap className="w-5 h-5" />;
      case 'line_drawing': return <Building2 className="w-5 h-5" />;
      default: return <Box className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Google Maps 3D建築図面ジェネレーター
          </h1>
          <p className="text-lg text-slate-600">
            Googleマップから場所を検索し、NanoBananaで精密な3D建築図面を生成
          </p>
        </header>

        {/* 東京駅情報セクション */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-blue-800">{selectedPlace.name}</div>
                <div className="text-sm text-blue-600">{selectedPlace.address}</div>
                <div className="text-xs text-blue-500 mt-1">
                  座標: {selectedPlace.location.lat.toFixed(6)}, {selectedPlace.location.lng.toFixed(6)}
                </div>
              </div>
              <button
                onClick={regenerateAllImages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4" />
                3つの図面を再生成
              </button>
            </div>
          </div>
        </div>

        {/* マップ表示 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">マップビュー</h2>
          <div
            ref={mapRef}
            className="w-full h-96 rounded-lg border border-slate-300"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* 画像生成セクション */}
        <div className="grid md:grid-cols-3 gap-6">
          {imageResults.map((result, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getTypeIcon(result.type)}
                  <h3 className="text-lg font-semibold text-slate-800">
                    {getTypeLabel(result.type)}図面
                  </h3>
                </div>
                
                <div className="aspect-square bg-slate-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {result.isGenerating ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">生成中...</p>
                    </div>
                  ) : result.url ? (
                    <img
                      src={result.url}
                      alt={`${getTypeLabel(result.type)}図面`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Building2 className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">画像が生成されます</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => generateImage(result.type)}
                    disabled={result.isGenerating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {result.isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        {getTypeIcon(result.type)}
                        図面生成
                      </>
                    )}
                  </button>
                  
                  {result.url && (
                    <button
                      onClick={() => downloadImage(result.url, result.type)}
                      className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      ダウンロード
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* 説明セクション */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">機能説明</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div>
              <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <Box className="w-4 h-4" />
                アイソメトリック図面
              </h3>
              <p>Minecraft HD-2Dスタイルの3Dアイソメトリック画像。45°角度から見た建物の立体図面で、寸法線付きの精密な設計図。</p>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                ホログラム図面
              </h3>
              <p>未来的なホログラフィック投影スタイル。青-シアンの光る効果で建築構造を表現し、浮遊する寸法テキスト付き。</p>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                線画図面
              </h3>
              <p>白黒のみを使用した精密な線画。太い線とハッチングで立体感を強調し、建築図面として使用可能な品質。</p>
            </div>
          </div>
        </div>

        {/* Deep Debug System - File Upload */}
        <div className="mt-8">
          <DeepDebugSystem />
        </div>

        {/* Deep Debug System - Diagnostics */}
        <div className="mt-8">
          <DeepDebugger />
        </div>

        {/* Direct AI Client Test */}
        <div className="mt-8">
          <DirectAIClient />
        </div>
      </div>
    </div>
  );
}

export default App;