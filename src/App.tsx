import React, { useState, useCallback } from 'react';
import { GoogleMap } from './components/GoogleMap';
import { MapSearch } from './components/MapSearch';
import { PresetButtons } from './components/PresetButtons';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useMapCapture } from './hooks/useMapCapture';
import { GeneratedImages } from './types/index';
import { GenerationPanel } from './components/GenerationPanel';
import { DebugPanel } from './components/DebugPanel';
import { DeepDebugger } from './components/DeepDebugger';
import { DirectAIClient } from './components/DirectAIClient';

function App() {
  // デフォルトで自由の女神の位置を設定
  const defaultLocation = {
    lat: 40.6892,
    lng: -74.0445,
    address: "Statue of Liberty, New York, NY, USA"
  };
  
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(defaultLocation);
  const [mapZoom, setMapZoom] = useState<number>(18);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({
    cad: null,
    hologram: null,
    lineArt: null,
  });

  const { captureMapArea, isCapturing } = useMapCapture();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const handleLocationSelect = useCallback((location: {lat: number, lng: number, address: string}) => {
    console.log('📍 場所が選択されました:', location);
    setSelectedLocation(location);
    
    // 場所のタイプに応じてズームレベルを動的に設定
    const determineZoomLevel = (address: string): number => {
      const lowerAddress = address.toLowerCase();
      
      // 世界的なランドマーク - より広い視野
      const landmarks = ['tower', 'statue', 'bridge', 'palace', 'temple', 'cathedral', 'monument', 
                        'タワー', '塔', '寺', '神社', '城', '宮殿', 'コロッセオ', 'ビッグベン'];
      const isLandmark = landmarks.some(keyword => lowerAddress.includes(keyword));
      
      // 建物の詳細 - より近い視野
      const detailedBuildings = ['room', 'floor', 'apartment', 'suite', 'unit', 
                                 '号室', '階', 'マンション', 'ビル'];
      const isDetailedBuilding = detailedBuildings.some(keyword => lowerAddress.includes(keyword));
      
      if (isLandmark) {
        return 17; // ランドマークは少し引いた視点
      } else if (isDetailedBuilding) {
        return 20; // 建物の詳細は近い視点
      } else {
        return 18; // デフォルト
      }
    };
    
    const zoomLevel = determineZoomLevel(location.address);
    console.log('🔍 ズームレベルを設定:', zoomLevel);
    setMapZoom(zoomLevel);
    
    setMapImage(null);
    setGeneratedImages({ cad: null, hologram: null, lineArt: null });
  }, []);

  // 天才バックエンドエンジニア最終版 - 段階的検証後のNanoBanana実装
  const generateImageWithNanoBanana = useCallback(async (imageType: 'cad' | 'hologram' | 'lineArt', locationContext: string) => {
    const startTime = Date.now();

    console.log(`🎨 Starting ${imageType} image generation (Final Implementation):`, { imageType, locationContext: locationContext.substring(0, 100) + '...' });

    // YouWare MCP環境での設定確認
    console.log('🔧 ywConfig debug:', {
      hasYwConfig: !!globalThis.ywConfig,
      hasAiConfig: !!globalThis.ywConfig?.ai_config,
      aiConfigKeys: globalThis.ywConfig?.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : 'N/A'
    });

    const config = globalThis.ywConfig?.ai_config?.[`${imageType}_generator`] || globalThis.ywConfig?.ai_config?.[`${imageType === 'cad' ? 'isometric' : imageType}_generator`];
    if (!config) {
      console.error(`❌ API Error - ${imageType} config not found`, {
        requestedKey: `${imageType}_generator`,
        alternativeKey: `${imageType === 'cad' ? 'isometric' : imageType}_generator`,
        availableKeys: globalThis.ywConfig?.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : 'None'
      });
      throw new Error(`API Error - ${imageType} generator configuration not found`);
    }

    // プロンプトテンプレート関数を使用してプロンプト生成
    const prompt = config.prompt_template ? config.prompt_template({ locationContext }) : `Generate ${imageType} image for: ${locationContext}`;

    console.log('🤖 AI API Request (Image) - Final Implementation:', {
      model: config.model,
      scene: `${imageType}_generator`,
      prompt: prompt.substring(0, 150) + '...',
      fullPromptLength: prompt.length,
      parameters: {
        response_format: config.response_format || 'b64_json',
        n: config.n || 1
      }
    });

    try {
      // AI SDK準拠の実装 - DocumentationベースのBest Practice
      console.log('🤖 AI SDK Image Generation:', { 
        model: config.model, 
        prompt: prompt.substring(0, 100) + '...', 
        config: { n: config.n, response_format: config.response_format }
      });

      const response = await fetch('https://api.youware.com/public/v1/ai/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-YOUWARE'
        },
        body: JSON.stringify({
          model: config.model,
          prompt: prompt,
          response_format: config.response_format,
          size: config.size
        })
      });

      console.log('📥 AI API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.error('❌ API Error - Image generation failed:', {
          model: config.model,
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // 認証エラーの場合
        if (response.status === 401) {
          throw new Error(`API Error - Authentication failed: ${response.status}. YouWare MCP AI SDK tool may not be properly enabled.`);
        }
        
        throw new Error(`API Error - Image generation request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      console.log('✅ AI API Response (Image):', {
        model: config.model,
        scene: `${imageType}_generator`,
        responseFormat: config.response_format || 'b64_json',
        imagesGenerated: data.data ? data.data.length : 0,
        processingTime: `${Date.now() - startTime}ms`
      });

      if (data && data.data && data.data.length > 0) {
        const imageData = data.data[0];
        console.log('🖼️ Image Processing:', {
          hasB64Json: !!imageData.b64_json,
          hasUrl: !!imageData.url,
          b64JsonLength: imageData.b64_json ? imageData.b64_json.length : 0
        });

        const finalImageUrl = imageData.b64_json
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;
        
        console.log('🎯 Final Success - Image URL created:', {
          type: imageData.b64_json ? 'base64' : 'url',
          length: finalImageUrl.length,
          preview: finalImageUrl.substring(0, 100) + '...'
        });

        return finalImageUrl;
      } else {
        console.error('❌ API Error - Invalid response format:', {
          data,
          hasData: !!data.data,
          dataType: typeof data.data,
          fullResponse: data
        });
        throw new Error('API Error - Invalid response format - no image data received');
      }
    } catch (error) {
      console.error('❌ API Error - Image generation failed:', {
        model: config.model,
        scene: `${imageType}_generator`,
        error: (error as Error).message,
        processingTime: `${Date.now() - startTime}ms`
      });
      throw new Error(`API Error - Image generation failed: ${(error as Error).message}`);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedLocation) {
      return;
    }

    try {
      setIsGenerating(true);

      // Capture map area (50m² crop)
      console.log('🗺️ マップエリアをキャプチャ中:', selectedLocation);
      const startTime = performance.now();
      const capturedImage = await captureMapArea(selectedLocation);
      const captureTime = performance.now() - startTime;

      setMapImage(capturedImage);

      console.log('✅ マップエリアのキャプチャが完了しました。');

      // Generate location context for AI prompt
      const locationContext = `Location: ${selectedLocation.address}, Coordinates: ${selectedLocation.lat}, ${selectedLocation.lng}. Generate architectural 3D visualization from this Google Maps area focusing on building structures.`;

      // Generate 3D images sequentially using NanoBanana
      const steps: { key: 'cad' | 'hologram' | 'lineArt', name: string }[] = [
        { key: 'cad', name: 'isometric' },
        { key: 'hologram', name: 'hologram' }, 
        { key: 'lineArt', name: 'lineArt' }
      ];

      for (const step of steps) {
        setCurrentStep(step.key);
        
        try {
          console.log(`🚀 Generating ${step.name} image...`);
          const generatedImage = await generateImageWithNanoBanana(step.key, locationContext);
          
          setGeneratedImages(prev => ({
            ...prev,
            [step.key]: generatedImage
          }));
          
          console.log(`✅ ${step.name} image generated successfully`);
        } catch (error) {
          console.error(`❌ Failed to generate ${step.name} image:`, error);
          // Continue with next image type even if one fails
          setGeneratedImages(prev => ({
            ...prev,
            [step.key]: null
          }));
        }
      }

      console.log('✅ All image generation attempts completed');
    } catch (error) {
      console.error('❌ エラー:', error);
      alert('エラー: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
      setCurrentStep(null);
    }
  }, [selectedLocation, captureMapArea, generateImageWithNanoBanana]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF7EC] to-[#EEF5FF]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#411307] mb-2">
            Where do you want to make 3D drawings?
          </h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:custom-three-column gap-12">
          {/* Left Column */}
          <div className="space-y-6 lg:left-column">
            {/* Search Bar */}
            <MapSearch onLocationSelect={handleLocationSelect} />

            {/* Sample Buttons */}
            <PresetButtons onLocationSelect={handleLocationSelect} />
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:right-column">
            {/* Google Map - Horizontal Layout */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              {selectedLocation ? (
                <div>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <GoogleMap
                      center={selectedLocation}
                      zoom={mapZoom}
                      className="w-full h-64"
                    />
                  </div>
                  <p className="text-sm text-[#8A3216] mt-2">
                    Select: {selectedLocation.address}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">場所を選択してください</p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleGenerate}
                disabled={!selectedLocation || isCapturing || isGenerating}
                className="generate-button"
              >
                <span className="button-text">
                  {isCapturing 
                    ? 'マップをキャプチャ中...' 
                    : isGenerating 
                    ? `生成中... ${currentStep ? `(${currentStep})` : ''}` 
                    : 'Generate!'}
                </span>
                <div className="play-button">
                  <div className="play-triangle"></div>
                </div>
              </button>
              
              {/* Step 1: AI SDK Authentication Test - 天才バックエンドエンジニア完全修正版 */}
              <button
                onClick={async () => {
                  const startTime = Date.now();
                  console.log('🧪 Step 1: AI SDK Authentication Test - Genius Backend Engineer Complete Fix');
                  
                  try {
                    // Phase 1: Environment Validation
                    console.log('🔧 Phase 1: Environment Validation');
                    console.log('ywConfig availability:', {
                      hasYwConfig: !!globalThis.ywConfig,
                      hasAiConfig: !!globalThis.ywConfig?.ai_config,
                      configKeys: globalThis.ywConfig?.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : 'N/A'
                    });
                    
                    if (!globalThis.ywConfig?.ai_config) {
                      throw new Error('YouWare MCP AI SDK not properly initialized - globalThis.ywConfig.ai_config missing');
                    }
                    
                    // Phase 2: AI SDK Module Loading
                    console.log('📚 Phase 2: AI SDK Module Loading');
                    const { generateText } = await import('ai');
                    const { createOpenAI } = await import('@ai-sdk/openai');
                    console.log('✅ AI SDK modules loaded successfully');
                    
                    // Phase 3: OpenAI Client Initialization with Enhanced Configuration
                    console.log('🔧 Phase 3: OpenAI Client Initialization');
                    const openai = createOpenAI({
                      baseURL: 'https://api.youware.com/public/v1/ai',
                      apiKey: 'sk-YOUWARE'
                    });
                    console.log('✅ OpenAI client initialized with proper YouWare MCP configuration');
                    
                    // Phase 4: Test Configuration Creation
                    console.log('⚙️ Phase 4: Test Configuration');
                    const testConfig = {
                      model: 'gemini-2.5-flash', // Fast and reliable model for testing
                      temperature: 0.1, // Low temperature for consistent results
                      maxTokens: 100
                    };
                    
                    console.log('🤖 AI API Request (Step 1 Test):', {
                      model: testConfig.model,
                      purpose: 'Authentication verification',
                      prompt: 'Authentication test message',
                      parameters: {
                        temperature: testConfig.temperature,
                        maxTokens: testConfig.maxTokens
                      }
                    });
                    
                    // Phase 5: AI SDK generateText Call with Proper Error Handling
                    console.log('🚀 Phase 5: Executing generateText with full AI SDK integration');
                    const { text, finishReason, usage } = await generateText({
                      model: openai(testConfig.model),
                      prompt: 'Please respond with exactly: "YouWare AI SDK Authentication Success! All systems operational."',
                      temperature: testConfig.temperature,
                      maxTokens: testConfig.maxTokens
                    });
                    
                    // Phase 6: Success Validation and Logging
                    console.log('✅ AI API Response (Step 1 Success):', {
                      model: testConfig.model,
                      responseText: text,
                      finishReason: finishReason,
                      usage: usage,
                      responseLength: text.length,
                      processingTime: `${Date.now() - startTime}ms`,
                      authenticationStatus: 'VERIFIED'
                    });
                    
                    // Validate response content
                    if (text && text.trim().length > 0) {
                      alert('🎉 Step 1 SUCCESS!\n\nAI SDK認証動作確認済み\n\n応答: ' + text + '\n\n処理時間: ' + (Date.now() - startTime) + 'ms');
                      console.log('🎯 Step 1 Complete Success - AI SDK fully operational');
                    } else {
                      throw new Error('Empty response received - possible API communication issue');
                    }
                    
                  } catch (error) {
                    console.error('❌ Step 1 Failed - Complete Error Analysis:', {
                      errorMessage: (error as Error).message,
                      errorStack: (error as Error).stack,
                      processingTime: `${Date.now() - startTime}ms`,
                      environmentCheck: {
                        hasYwConfig: !!globalThis.ywConfig,
                        hasAiConfig: !!globalThis.ywConfig?.ai_config,
                        windowLocation: window.location.href
                      },
                      possibleCauses: [
                        'YouWare MCP AI SDK tool not enabled',
                        'Network connectivity issues',
                        'API endpoint configuration problems',
                        'Authentication token not properly injected'
                      ]
                    });
                    
                    // User-friendly error reporting
                    const errorType = (error as Error).message.includes('Invalid credentials') 
                      ? 'YouWare MCP認証エラー' 
                      : (error as Error).message.includes('fetch') 
                      ? 'ネットワーク接続エラー'
                      : 'AI SDK設定エラー';
                    
                    alert('❌ Step 1 失敗\n\nエラータイプ: ' + errorType + '\n詳細: ' + (error as Error).message + '\n\n診断: YouWare MCP AI SDKツールが正しく有効化されていない可能性があります。');
                  }
                }}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                🧪 Step 1: AI認証テスト (修正版)
              </button>
              
              {/* Step 2: Image Generation Test - 天才バックエンドエンジニア完全修正版 */}
              <button
                onClick={async () => {
                  const startTime = Date.now();
                  console.log('🧪 Step 2: Image Generation Test - Genius Backend Engineer Complete Fix');
                  
                  try {
                    // Phase 1: Environment and Configuration Validation
                    console.log('🔧 Phase 1: Image Generation Environment Validation');
                    console.log('ywConfig Image Settings:', {
                      hasYwConfig: !!globalThis.ywConfig,
                      hasAiConfig: !!globalThis.ywConfig?.ai_config,
                      hasImageConfig: !!globalThis.ywConfig?.ai_config?.isometric_generator,
                      availableGenerators: globalThis.ywConfig?.ai_config ? Object.keys(globalThis.ywConfig.ai_config) : 'N/A'
                    });
                    
                    if (!globalThis.ywConfig?.ai_config) {
                      throw new Error('YouWare MCP AI SDK not properly initialized for image generation');
                    }
                    
                    // Phase 2: Test Configuration Setup
                    console.log('⚙️ Phase 2: Image Generation Test Configuration');
                    const testConfig = {
                      model: 'gpt-image-1', // Stable and reliable model for testing
                      prompt: 'Simple test image: a bright red circle on pure white background, minimal design, clean and simple',
                      n: 1,
                      size: '1024x1024',
                      response_format: 'b64_json'
                    };
                    
                    console.log('🤖 AI API Request (Image Generation Test):', {
                      endpoint: 'https://api.youware.com/public/v1/ai/images/generations',
                      model: testConfig.model,
                      prompt: testConfig.prompt,
                      parameters: {
                        size: testConfig.size,
                        response_format: testConfig.response_format,
                        n: testConfig.n
                      },
                      purpose: 'Image generation authentication verification'
                    });
                    
                    // Phase 3: Image Generation API Request with Enhanced Error Handling
                    console.log('🎨 Phase 3: Executing Image Generation Request');
                    const response = await fetch('https://api.youware.com/public/v1/ai/images/generations', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer sk-YOUWARE',
                        'User-Agent': 'YouWare-MCP-Test/1.0'
                      },
                      body: JSON.stringify(testConfig)
                    });
                    
                    console.log('📥 API Response Analysis:', {
                      status: response.status,
                      statusText: response.statusText,
                      ok: response.ok,
                      headers: {
                        contentType: response.headers.get('content-type'),
                        contentLength: response.headers.get('content-length')
                      }
                    });
                    
                    // Phase 4: Response Validation and Processing
                    if (!response.ok) {
                      const errorText = await response.text();
                      let errorData = {};
                      try {
                        errorData = JSON.parse(errorText);
                      } catch (e) {
                        errorData = { raw: errorText };
                      }
                      
                      console.error('❌ API Error - Image Generation Request Failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorData,
                        fullErrorText: errorText
                      });
                      
                      throw new Error(`API Error - Status ${response.status}: ${errorText}`);
                    }
                    
                    // Phase 5: Success Response Processing
                    const data = await response.json();
                    console.log('✅ AI API Response (Image Generation Success):', {
                      model: testConfig.model,
                      responseStructure: {
                        hasData: !!data.data,
                        dataLength: data.data ? data.data.length : 0,
                        firstImageKeys: data.data && data.data[0] ? Object.keys(data.data[0]) : 'None'
                      },
                      processingTime: `${Date.now() - startTime}ms`,
                      imageGenerationStatus: 'VERIFIED'
                    });
                    
                    // Phase 6: Image Data Validation
                    if (data && data.data && data.data.length > 0) {
                      const imageData = data.data[0];
                      const hasImageContent = imageData.b64_json && imageData.b64_json.length > 0;
                      
                      console.log('🖼️ Image Content Validation:', {
                        hasB64Json: !!imageData.b64_json,
                        b64JsonLength: imageData.b64_json ? imageData.b64_json.length : 0,
                        hasUrl: !!imageData.url,
                        contentValid: hasImageContent
                      });
                      
                      if (hasImageContent) {
                        alert('🎉 Step 2 SUCCESS!\n\n画像生成動作確認済み\n\nモデル: gpt-image-1\n画像サイズ: ' + testConfig.size + '\n処理時間: ' + (Date.now() - startTime) + 'ms\n\n✅ YouWare MCP AI SDK画像生成機能正常動作');
                        console.log('🎯 Step 2 Complete Success - Image Generation fully operational');
                      } else {
                        throw new Error('Image generation succeeded but no valid image content received');
                      }
                    } else {
                      throw new Error('Invalid response format - no image data received');
                    }
                    
                  } catch (error) {
                    console.error('❌ Step 2 Failed - Complete Error Analysis:', {
                      errorMessage: (error as Error).message,
                      errorStack: (error as Error).stack,
                      processingTime: `${Date.now() - startTime}ms`,
                      testConfiguration: {
                        endpoint: 'https://api.youware.com/public/v1/ai/images/generations',
                        method: 'POST',
                        model: 'gpt-image-1'
                      },
                      possibleCauses: [
                        'YouWare MCP AI SDK tool not enabled for image generation',
                        'Image generation API endpoint issues',
                        'Model access restrictions',
                        'Authentication or authorization problems'
                      ]
                    });
                    
                    // User-friendly error reporting
                    const errorType = (error as Error).message.includes('401') 
                      ? 'YouWare MCP認証エラー' 
                      : (error as Error).message.includes('403')
                      ? 'アクセス権限エラー'
                      : (error as Error).message.includes('fetch') 
                      ? 'ネットワーク接続エラー'
                      : '画像生成APIエラー';
                    
                    alert('❌ Step 2 失敗\n\nエラータイプ: ' + errorType + '\n詳細: ' + (error as Error).message + '\n\n診断: YouWare MCP AI SDKの画像生成機能が正しく設定されていない可能性があります。');
                  }
                }}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                🧪 Step 2: 画像生成テスト (修正版)
              </button>
              
              {/* Step 3: NanoBanana Model Test - 天才バックエンドエンジニア完全修正版 */}
              <button
                onClick={async () => {
                  const startTime = Date.now();
                  console.log('🧪 Step 3: NanoBanana Model Test - Genius Backend Engineer Complete Fix');
                  
                  try {
                    // Phase 1: NanoBanana Configuration Validation
                    console.log('🔧 Phase 1: NanoBanana Configuration Validation');
                    const nanoBananaConfigs = ['isometric_generator', 'hologram_generator', 'line_art_generator'];
                    const configCheck = nanoBananaConfigs.map(configName => ({
                      name: configName,
                      exists: !!globalThis.ywConfig?.ai_config?.[configName],
                      model: globalThis.ywConfig?.ai_config?.[configName]?.model
                    }));
                    
                    console.log('NanoBanana Configurations Check:', configCheck);
                    
                    const isometricConfig = globalThis.ywConfig?.ai_config?.isometric_generator;
                    if (!isometricConfig) {
                      throw new Error('YouWare MCP NanoBanana configuration missing - isometric_generator not found');
                    }
                    
                    if (isometricConfig.model !== 'nano-banana') {
                      throw new Error(`Configuration error - Expected nano-banana model, got: ${isometricConfig.model}`);
                    }
                    
                    // Phase 2: Test Location Context Setup
                    console.log('🗺️ Phase 2: Test Location Context Setup');
                    const testLocationContext = 'Location: Statue of Liberty, New York, NY, USA. Coordinates: 40.6892, -74.0445. Generate architectural 3D visualization from this Google Maps area focusing on building structures for NanoBanana model testing.';
                    
                    console.log('Test Location Context:', {
                      locationContext: testLocationContext.substring(0, 150) + '...',
                      contextLength: testLocationContext.length,
                      imageType: 'cad (isometric)',
                      configModel: isometricConfig.model
                    });
                    
                    // Phase 3: Prompt Template Processing
                    console.log('📝 Phase 3: NanoBanana Prompt Template Processing');
                    const prompt = isometricConfig.prompt_template 
                      ? isometricConfig.prompt_template({ locationContext: testLocationContext })
                      : `Generate isometric image for: ${testLocationContext}`;
                    
                    console.log('🤖 AI API Request (NanoBanana Test):', {
                      model: isometricConfig.model,
                      scene: 'isometric_generator',
                      prompt: prompt.substring(0, 200) + '...',
                      fullPromptLength: prompt.length,
                      parameters: {
                        response_format: isometricConfig.response_format || 'b64_json',
                        n: isometricConfig.n || 1
                      },
                      purpose: 'NanoBanana model verification'
                    });
                    
                    // Phase 4: NanoBanana Image Generation Request
                    console.log('🍌 Phase 4: Executing NanoBanana Image Generation');
                    const requestBody = {
                      model: isometricConfig.model, // Should be 'nano-banana'
                      prompt: prompt,
                      n: isometricConfig.n || 1,
                      response_format: isometricConfig.response_format || 'b64_json'
                    };
                    
                    const response = await fetch('https://api.youware.com/public/v1/ai/images/generations', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer sk-YOUWARE',
                        'User-Agent': 'YouWare-MCP-NanoBanana-Test/1.0'
                      },
                      body: JSON.stringify(requestBody)
                    });
                    
                    console.log('📥 NanoBanana API Response Analysis:', {
                      status: response.status,
                      statusText: response.statusText,
                      ok: response.ok,
                      headers: {
                        contentType: response.headers.get('content-type'),
                        contentLength: response.headers.get('content-length')
                      }
                    });
                    
                    // Phase 5: Response Processing and Validation
                    if (!response.ok) {
                      const errorText = await response.text();
                      let errorData = {};
                      try {
                        errorData = JSON.parse(errorText);
                      } catch (e) {
                        errorData = { raw: errorText };
                      }
                      
                      console.error('❌ API Error - NanoBanana Request Failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorData,
                        fullErrorText: errorText,
                        modelUsed: isometricConfig.model
                      });
                      
                      throw new Error(`API Error - NanoBanana failed: Status ${response.status}: ${errorText}`);
                    }
                    
                    // Phase 6: Success Response Processing
                    const data = await response.json();
                    console.log('✅ AI API Response (NanoBanana Success):', {
                      model: isometricConfig.model,
                      scene: 'isometric_generator',
                      responseFormat: isometricConfig.response_format,
                      imagesGenerated: data.data ? data.data.length : 0,
                      processingTime: `${Date.now() - startTime}ms`,
                      nanoBananaStatus: 'VERIFIED'
                    });
                    
                    // Phase 7: Image Content Validation
                    if (data && data.data && data.data.length > 0) {
                      const imageData = data.data[0];
                      console.log('🖼️ NanoBanana Image Content Validation:', {
                        hasB64Json: !!imageData.b64_json,
                        hasUrl: !!imageData.url,
                        b64JsonLength: imageData.b64_json ? imageData.b64_json.length : 0,
                        urlValue: imageData.url || 'None'
                      });
                      
                      const finalImageUrl = imageData.b64_json
                        ? `data:image/png;base64,${imageData.b64_json}`
                        : imageData.url;
                      
                      if (finalImageUrl && finalImageUrl.length > 100) {
                        console.log('🎯 NanoBanana Success - Image URL created:', {
                          type: imageData.b64_json ? 'base64' : 'url',
                          length: finalImageUrl.length,
                          preview: finalImageUrl.substring(0, 100) + '...'
                        });
                        
                        alert('🎉 Step 3 SUCCESS!\n\nNanoBanana画像生成成功!\n\nモデル: nano-banana\n画像タイプ: 3D Isometric\n処理時間: ' + (Date.now() - startTime) + 'ms\n\n✅ YouWare MCP NanoBanana完全動作確認済み');
                        console.log('🎯 Step 3 Complete Success - NanoBanana Model fully operational');
                      } else {
                        throw new Error('NanoBanana generation succeeded but invalid image URL created');
                      }
                    } else {
                      throw new Error('Invalid NanoBanana response format - no image data received');
                    }
                    
                  } catch (error) {
                    console.error('❌ Step 3 Failed - Complete NanoBanana Error Analysis:', {
                      errorMessage: (error as Error).message,
                      errorStack: (error as Error).stack,
                      processingTime: `${Date.now() - startTime}ms`,
                      nanoBananaConfiguration: {
                        hasConfig: !!globalThis.ywConfig?.ai_config?.isometric_generator,
                        model: globalThis.ywConfig?.ai_config?.isometric_generator?.model,
                        endpoint: 'https://api.youware.com/public/v1/ai/images/generations'
                      },
                      possibleCauses: [
                        'YouWare MCP AI SDK tool not enabled for NanoBanana',
                        'NanoBanana model access restrictions or quota limits',
                        'Configuration mismatch in yw_manifest.json',
                        'YouWare platform NanoBanana integration issues'
                      ]
                    });
                    
                    // User-friendly error reporting
                    const errorType = (error as Error).message.includes('401') 
                      ? 'YouWare MCP認証エラー' 
                      : (error as Error).message.includes('403')
                      ? 'NanoBananaアクセス権限エラー'
                      : (error as Error).message.includes('404')
                      ? 'NanoBananaモデル未対応エラー'
                      : (error as Error).message.includes('fetch') 
                      ? 'ネットワーク接続エラー'
                      : 'NanoBanana API設定エラー';
                    
                    alert('❌ Step 3 失敗\n\nエラータイプ: ' + errorType + '\n詳細: ' + (error as Error).message + '\n\n診断: YouWare MCP環境でのNanoBananaモデルアクセスに問題があります。MCPツールの設定を確認してください。');
                  }
                }}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                🧪 Step 3: NanoBananaテスト (修正版)
              </button>
            </div>
          </div>
        </div>

        {/* Deep Debug System */}
        <div className="mb-8">
          <DeepDebugger />
        </div>

        {/* Direct AI Client - AI SDK Bypass Test */}
        <div className="mb-8">
          <DirectAIClient />
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 results-section">
          <GenerationPanel
            title="3D Isometric"
            subtitle="3Dアイソメトリック画像"
            image={generatedImages.cad}
            isLoading={isGenerating && currentStep === 'cad' && !generatedImages.cad}
            bgColor="bg-gradient-to-br from-[#a12a0b] to-[#e26300]"
            borderColor="border-[#e26300]"
          />
          
          <GenerationPanel
            title="3D Hologram"
            subtitle="3Dホログラム"
            image={generatedImages.hologram}
            isLoading={isGenerating && currentStep === 'hologram' && !generatedImages.hologram}
            bgColor="bg-gradient-to-br from-[#0e5153] to-[#06dbd7]"
            borderColor="border-[#06dbd7]"
          />
          
          <GenerationPanel
            title="3D line drawings"
            subtitle="3D線画"
            image={generatedImages.lineArt}
            isLoading={isGenerating && currentStep === 'lineArt' && !generatedImages.lineArt}
            bgColor="bg-gradient-to-br from-[#b5afab] to-[#544f4a]"
            borderColor="border-[#b5afab]"
          />
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
}

export default App;