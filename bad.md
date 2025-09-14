[Environment] Browser Environment Check
Environment check completed successfully
実行時間: 9ms
11:53:19
詳細を表示
[ywConfig] ywConfig Existence Check
ywConfig found in globalThis
11:53:19
詳細を表示
[ywConfig] ywConfig Structure Analysis
ywConfig contains keys: name, version, description, project_type, ai_config
11:53:19
詳細を表示
[ywConfig] AI Scene Configuration - isometric_generator
isometric_generator configured with model: nano-banana
11:53:19
詳細を表示
[ywConfig] AI Scene Configuration - hologram_generator
hologram_generator configured with model: nano-banana
11:53:19
詳細を表示
[ywConfig] AI Scene Configuration - line_art_generator
line_art_generator configured with model: nano-banana
11:53:19
詳細を表示
[AI SDK] AI SDK Package Detailed Analysis
All AI SDK packages successfully loaded
11:53:19
詳細を表示
[AI SDK] AI SDK Import Test
Successfully imported @ai-sdk/openai
11:53:19
詳細を表示
[AI SDK] OpenAI Client Creation - Standard Config
Successfully created OpenAI client with Standard Config
11:53:19
詳細を表示
[Network] API Domain Connectivity
API domain responded with status: 200
11:53:19
詳細を表示
[Model Tests] nano-banana Model Test
nano-banana model test: 401
11:53:21
詳細を表示
{
  "status": 401,
  "statusText": "",
  "headers": {
    "content-length": "56",
    "content-type": "application/json",
    "x-yw-message": "Invalid credentials",
    "x-yw-request-id": "3664b9b1-9139-42a1-b7f7-42cb9e94b04e",
    "x-yw-status": "40101"
  }
}
[Model Tests] nano-banana Error Analysis
Detailed error response from nano-banana
11:53:21
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