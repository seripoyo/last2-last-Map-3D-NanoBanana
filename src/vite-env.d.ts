/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

// Youware platform global objects
declare global {
  interface Window {
    aiSdk?: Record<string, any>;
    ywConfig?: Record<string, any>;
    ywSdk?: Record<string, any>;
  }
  
  // globalThis型定義を追加
  var ywConfig: any;
}

export {};