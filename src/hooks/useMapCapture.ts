import { useState, useCallback } from 'react';
import { Location } from '../types';

export function useMapCapture() {
  const [isCapturing, setIsCapturing] = useState(false);

  // Generate a procedural map image based on location coordinates
  const generateProceduralMapImage = useCallback((location: Location): string => {
    console.log('🎨 Generating procedural map image for:', location);
    
    // Create a canvas for procedural generation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = 640;
    canvas.height = 640;
    
    // Generate a unique seed based on coordinates
    const seed = Math.abs(Math.floor(location.lat * 1000000) + Math.floor(location.lng * 1000000));
    
    // Simple PRNG for consistent results
    let prngState = seed;
    const prng = () => {
      prngState = (prngState * 16807) % 2147483647;
      return prngState / 2147483647;
    };
    
    // Draw base terrain
    const gradient = ctx.createRadialGradient(320, 320, 0, 320, 320, 320);
    gradient.addColorStop(0, '#8FBC8F'); // Center - light green
    gradient.addColorStop(0.7, '#228B22'); // Edge - darker green
    gradient.addColorStop(1, '#006400'); // Outer - dark green
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 640);
    
    // Add some procedural features based on location
    const features = Math.floor(prng() * 8) + 5; // 5-12 features
    
    for (let i = 0; i < features; i++) {
      const x = prng() * 640;
      const y = prng() * 640;
      const size = prng() * 40 + 10;
      
      // Vary features based on coordinate patterns
      const featureType = prng();
      
      if (featureType < 0.3) {
        // Roads/paths
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = size / 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (prng() - 0.5) * 200, y + (prng() - 0.5) * 200);
        ctx.stroke();
      } else if (featureType < 0.6) {
        // Buildings/structures
        ctx.fillStyle = `hsl(${Math.floor(prng() * 60) + 200}, 50%, ${Math.floor(prng() * 30) + 40}%)`;
        ctx.fillRect(x - size/2, y - size/2, size, size);
      } else {
        // Natural features (trees, water)
        ctx.fillStyle = featureType < 0.8 ? '#228B22' : '#4169E1';
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Add location marker in center
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(320, 320, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Add 50m² indicator frame
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 3;
    ctx.strokeRect(270, 270, 100, 100);
    
    // Add coordinate text
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.fillText(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`, 10, 25);
    ctx.fillText(location.address.substring(0, 40), 10, 615);
    
    return canvas.toDataURL('image/png');
  }, []);

  const captureMapArea = useCallback(async (location: Location): Promise<string> => {
    setIsCapturing(true);
    
    try {
      console.log('🎯 Capturing map area for coordinates:', location);

      // Try Google Static Maps API first
      try {
        const size = '640x640';
        const zoom = 20;
        const mapType = 'satellite';
        
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
          `center=${location.lat},${location.lng}&` +
          `zoom=${zoom}&` +
          `size=${size}&` +
          `maptype=${mapType}&` +
          `key=AIzaSyDUDTg2qpuIh3Yf0b80T0aViBmP2Dv1x7s&` +
          `scale=2`;

        console.log('📸 Trying Google Static Maps API...');

        const response = await fetch(staticMapUrl);
        if (response.ok) {
          const blob = await response.blob();
          
          const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          console.log('✅ Google Static Maps capture successful');
          return base64Image;
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (apiError) {
        console.warn('⚠️ Google Static Maps API failed, using procedural generation:', apiError);
        
        // Fallback to procedural generation
        const proceduralImage = generateProceduralMapImage(location);
        console.log('✅ Procedural map generation successful');
        return proceduralImage;
      }

    } catch (error) {
      console.error('❌ All map capture methods failed:', error);
      
      // Final fallback - simple colored rectangle with location info
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 640;
      canvas.height = 640;
      
      ctx.fillStyle = '#4A90E2';
      ctx.fillRect(0, 0, 640, 640);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Map Capture', 320, 280);
      ctx.fillText(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`, 320, 320);
      
      ctx.font = '16px Arial';
      const addressLines = location.address.match(/.{1,30}/g) || [location.address];
      addressLines.forEach((line, index) => {
        ctx.fillText(line, 320, 360 + (index * 20));
      });
      
      return canvas.toDataURL('image/png');
    } finally {
      setIsCapturing(false);
    }
  }, [generateProceduralMapImage]);

  return {
    captureMapArea,
    isCapturing
  };
}