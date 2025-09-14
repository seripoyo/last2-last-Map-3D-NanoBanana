[Environment] Browser Environment Check
Environment check completed successfully
実行時間: 9ms
13:38:54
詳細を表示
{
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  "url": "https://479bb244-86a9-4058-994f-5829ed26450c--1757829600--6c676ba1.preview.yourware.so/",
  "platform": "Win32",
  "language": "ja-JP",
  "cookieEnabled": true,
  "onlineStatus": true,
  "windowWidth": 1508,
  "windowHeight": 793,
  "localStorage": true,
  "sessionStorage": true,
  "indexedDB": true,
  "webGL": true,
  "workers": true
}
[ywConfig] ywConfig Existence Check
ywConfig found in globalThis
13:38:54
詳細を表示
{
  "exists": true,
  "type": "object"
}
[ywConfig] ywConfig Structure Analysis
ywConfig contains keys: name, version, description, project_type, ai_config
13:38:54
詳細を表示
{
  "keys": [
    "name",
    "version",
    "description",
    "project_type",
    "ai_config"
  ],
  "hasAiConfig": true,
  "aiConfigKeys": [
    "isometric_generator",
    "hologram_generator",
    "line_art_generator"
  ],
  "fullStructure": {
    "name": "maps-to-cad-illustrator",
    "version": "0.0.0",
    "description": "Google Maps to CAD Isometric Illustration Generator",
    "project_type": "react",
    "ai_config": {
      "isometric_generator": {
        "model": "nano-banana",
        "response_format": "b64_json",
        "n": 1
      },
      "hologram_generator": {
        "model": "nano-banana",
        "response_format": "b64_json",
        "n": 1
      },
      "line_art_generator": {
        "model": "nano-banana",
        "response_format": "b64_json",
        "n": 1
      }
    }
  }
}
[ywConfig] AI Scene Configuration - isometric_generator
isometric_generator configured with model: nano-banana
13:38:54
詳細を表示
{
  "model": "nano-banana",
  "response_format": "b64_json",
  "n": 1
}
[ywConfig] AI Scene Configuration - hologram_generator
hologram_generator configured with model: nano-banana
13:38:54
詳細を表示
{
  "model": "nano-banana",
  "response_format": "b64_json",
  "n": 1
}
[ywConfig] AI Scene Configuration - line_art_generator
line_art_generator configured with model: nano-banana
13:38:54
詳細を表示
{
  "model": "nano-banana",
  "response_format": "b64_json",
  "n": 1
}
[AI SDK] AI SDK Package Detailed Analysis
All AI SDK packages successfully loaded
13:38:54
詳細を表示
{
  "aiSdkOpenai": {
    "available": true,
    "details": {
      "available": true,
      "moduleKeys": [
        "createOpenAI"
      ],
      "moduleType": "object",
      "hasDefault": false,
      "loadTime": 2,
      "loadMethod": "aiSdkLoader",
      "mainExports": {
        "hasCreateOpenAI": true
      }
    }
  },
  "ai": {
    "available": true,
    "details": {
      "available": true,
      "moduleKeys": [
        "generateText",
        "streamText"
      ],
      "moduleType": "object",
      "hasDefault": false,
      "loadTime": 0,
      "loadMethod": "aiSdkLoader",
      "mainExports": {
        "hasGenerateText": true,
        "hasStreamText": true,
        "hasGenerateObject": false
      }
    }
  },
  "zod": {
    "available": true,
    "details": {
      "available": true,
      "moduleKeys": [
        "z"
      ],
      "moduleType": "object",
      "hasDefault": false,
      "loadTime": 0,
      "loadMethod": "aiSdkLoader",
      "mainExports": {
        "hasZ": true,
        "hasZodObject": false
      }
    }
  }
}
[AI SDK] AI SDK Import Test
Successfully imported @ai-sdk/openai
13:38:54
詳細を表示
{
  "createOpenAI": "function",
  "functionAvailable": true,
  "moduleDetails": {
    "available": true,
    "moduleKeys": [
      "createOpenAI"
    ],
    "moduleType": "object",
    "hasDefault": false,
    "loadTime": 2,
    "loadMethod": "aiSdkLoader",
    "mainExports": {
      "hasCreateOpenAI": true
    }
  }
}
[AI SDK] OpenAI Client Creation - Standard Config
Successfully created OpenAI client with Standard Config
13:38:54
詳細を表示
{
  "clientType": "function",
  "config": {
    "name": "Standard Config",
    "baseURL": "https://api.youware.com/public/v1/ai",
    "apiKey": "sk-YOUWARE"
  },
  "clientMethods": [
    "length",
    "name",
    "prototype",
    "languageModel",
    "chat",
    "completion",
    "responses",
    "embedding",
    "textEmbedding",
    "textEmbeddingModel"
  ]
}[Authentication] YouWare Environment Authentication
Authentication failed: Failed to fetch
13:38:54
詳細を表示
{
  "error": {}
}
[API Endpoints] Models Endpoint
Models Endpoint failed: Failed to fetch
13:38:55
詳細を表示
{
  "endpoint": {
    "name": "Models Endpoint",
    "url": "https://api.youware.com/public/v1/ai/models",
    "method": "GET"
  },
  "error": {}
}
[API Endpoints] Image Generation Endpoint
Image Generation Endpoint: 401
13:38:55
詳細を表示
{
  "url": "https://api.youware.com/public/v1/ai/images/generations",
  "method": "POST",
  "status": 401,
  "statusText": "",
  "headers": {
    "content-length": "56",
    "content-type": "application/json",
    "x-yw-message": "Invalid credentials",
    "x-yw-request-id": "6e10cd0b-6a02-4cfa-8fc7-35b2f1c61e33",
    "x-yw-status": "40101"
  }
}
[API Endpoints] Health Check
Health Check failed: Failed to fetch
13:38:55
詳細を表示
{
  "endpoint": {
    "name": "Health Check",
    "url": "https://api.youware.com/health",
    "method": "GET"
  },
  "error": {}
}
[Model Tests] nano-banana Model Test
nano-banana model test: 401
13:38:56
詳細を表示
{
  "status": 401,
  "statusText": "",
  "headers": {
    "content-length": "56",
    "content-type": "application/json",
    "x-yw-message": "Invalid credentials",
    "x-yw-request-id": "59b995fb-d14e-41e4-a104-aefd5d46cc7a",
    "x-yw-status": "40101"
  }
}
[Model Tests] nano-banana Error Analysis
Detailed error response from nano-banana
13:38:56
詳細を表示
{
  "errorResponse": "{\"error\":{\"message\":\"Invalid credentials\",\"code\":40101}}",
  "parsedError": {
    "error": {
      "message": "Invalid credentials",
      "code": 40101
    }
  }
}