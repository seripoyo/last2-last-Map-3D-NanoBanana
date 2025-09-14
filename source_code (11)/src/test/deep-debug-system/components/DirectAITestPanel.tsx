import React, { useState } from 'react';

interface DirectAITestPanelProps {
  apiKey: string;
  apiEndpoint: string;
  onLog: (level: string, message: string, details?: any) => void;
}

export const DirectAITestPanel: React.FC<DirectAITestPanelProps> = ({
  apiKey,
  apiEndpoint,
  onLog
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('nano-banana');

  const testNanoBanana = async () => {
    setIsLoading(true);
    onLog('info', 'Starting NanoBanana model test...');

    try {
      const response = await fetch(`${apiEndpoint}/ai/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: 'Test image generation: 3D isometric building',
          n: 1,
          response_format: 'b64_json'
        })
      });

      const result = {
        timestamp: new Date().toISOString(),
        model: selectedModel,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };

      if (response.ok) {
        const data = await response.json();
        result['response'] = data;
        onLog('success', `${selectedModel} test successful`, result);
        setTestResults(prev => [...prev, { ...result, success: true }]);
      } else {
        const errorText = await response.text();
        result['error'] = errorText;
        onLog('error', `${selectedModel} test failed: ${response.status}`, result);
        setTestResults(prev => [...prev, { ...result, success: false }]);
      }
    } catch (error) {
      onLog('error', `Network error during ${selectedModel} test`, error);
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        model: selectedModel,
        error: error,
        success: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthentication = async () => {
    setIsLoading(true);
    onLog('info', 'Testing authentication...');

    const authMethods = [
      { name: 'Bearer Token', header: { 'Authorization': `Bearer ${apiKey}` } },
      { name: 'API Key Header', header: { 'x-api-key': apiKey } },
      { name: 'OpenAI Compatible', header: { 'Authorization': `Bearer ${apiKey}` } }
    ];

    for (const method of authMethods) {
      try {
        const response = await fetch(`${apiEndpoint}/ai/models`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...method.header
          }
        });

        if (response.ok) {
          onLog('success', `Authentication method "${method.name}" successful`);
        } else {
          onLog('warning', `Authentication method "${method.name}" failed: ${response.status}`);
        }
      } catch (error) {
        onLog('error', `Authentication method "${method.name}" error`, error);
      }
    }

    setIsLoading(false);
  };

  const testConnectivity = async () => {
    setIsLoading(true);
    onLog('info', 'Testing API connectivity...');

    const endpoints = [
      { name: 'Health Check', url: '/health', method: 'GET' },
      { name: 'Models List', url: '/ai/models', method: 'GET' },
      { name: 'Image Generation', url: '/ai/images/generations', method: 'POST' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${apiEndpoint}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: endpoint.method === 'POST' ? JSON.stringify({
            model: 'nano-banana',
            prompt: 'connectivity test',
            n: 1
          }) : undefined
        });

        onLog(
          response.ok ? 'success' : 'warning',
          `Endpoint "${endpoint.name}" returned ${response.status}`,
          { url: `${apiEndpoint}${endpoint.url}`, status: response.status }
        );
      } catch (error) {
        onLog('error', `Endpoint "${endpoint.name}" failed`, error);
      }
    }

    setIsLoading(false);
  };

  const runAllTests = async () => {
    setTestResults([]);
    await testConnectivity();
    await testAuthentication();
    await testNanoBanana();
  };

  return (
    <div className="direct-ai-test-panel">
      <div className="test-controls">
        <div className="model-selector">
          <label>Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
          >
            <option value="nano-banana">nano-banana</option>
            <option value="dall-e-2">dall-e-2</option>
            <option value="dall-e-3">dall-e-3</option>
          </select>
        </div>

        <div className="test-buttons">
          <button
            onClick={testConnectivity}
            disabled={isLoading}
            className="test-btn"
          >
            🌐 Test Connectivity
          </button>
          <button
            onClick={testAuthentication}
            disabled={isLoading}
            className="test-btn"
          >
            🔐 Test Auth
          </button>
          <button
            onClick={testNanoBanana}
            disabled={isLoading}
            className="test-btn primary"
          >
            🎨 Test {selectedModel}
          </button>
          <button
            onClick={runAllTests}
            disabled={isLoading}
            className="test-btn secondary"
          >
            🚀 Run All Tests
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <span className="spinner">⚡</span>
          <span>Running tests...</span>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="test-results">
          <h4>Test Results:</h4>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`test-result ${result.success ? 'success' : 'failure'}`}
            >
              <div className="result-header">
                <span className="result-icon">
                  {result.success ? '✅' : '❌'}
                </span>
                <span className="result-model">{result.model}</span>
                <span className="result-status">
                  Status: {result.status || 'Error'}
                </span>
              </div>
              {result.error && (
                <div className="result-error">
                  Error: {JSON.stringify(result.error)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="api-info">
        <div className="info-item">
          <span className="info-label">Endpoint:</span>
          <code>{apiEndpoint}</code>
        </div>
        <div className="info-item">
          <span className="info-label">API Key:</span>
          <code>{apiKey.substring(0, 10)}...</code>
        </div>
      </div>
    </div>
  );
};