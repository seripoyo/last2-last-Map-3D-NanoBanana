import React, { useEffect, useRef, useState } from 'react';
import { Location } from '../types';

interface GoogleMapProps {
  center: Location;
  zoom?: number;
  className?: string;
  onMapLoad?: (map: google.maps.Map) => void;
}

export function GoogleMap({ center, zoom = 15, className = '', onMapLoad }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<any>(null);
  const squareRef = useRef<google.maps.Rectangle | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Map ID を必ず解決（env/metaで拾う）
  const resolvedMapId =
    import.meta.env?.VITE_MAP_ID ||
    (document.querySelector('meta[name="gmaps-map-id"]') as HTMLMetaElement | null)?.content ||
    'DEMO_MAP_ID';

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || !window.google?.maps) return;

      try {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          mapId: resolvedMapId,                // ★ 必ず指定
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          tilt: 0,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
          zoomControl: true,
          scaleControl: true,
        });
        mapInstanceRef.current = map;

        // AdvancedMarker → 旧Marker フォールバック
        try {
          const { AdvancedMarkerElement } =
            (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
          markerRef.current = new AdvancedMarkerElement({
            position: { lat: center.lat, lng: center.lng },
            map,
            title: center.address,
          }) as any;
        } catch {
          markerRef.current = new google.maps.Marker({
            position: { lat: center.lat, lng: center.lng },
            map,
            title: center.address,
          });
        }

        // 50m²矩形
        const s = 0.000449;
        const square = new google.maps.Rectangle({
          bounds: { north: center.lat + s / 2, south: center.lat - s / 2, east: center.lng + s / 2, west: center.lng - s / 2 },
          editable: false, draggable: false,
          fillColor: '#E67D1A', fillOpacity: 0.2,
          strokeColor: '#CC5C13', strokeOpacity: 0.8, strokeWeight: 2,
        });
        square.setMap(map);
        squareRef.current = square;

        setIsLoaded(true);
        onMapLoad?.(map);
      } catch (error) {
        console.error('❌ Map initialization error:', error);
      }
    };

    if (window.google?.maps) {
      initializeMap();
    } else {
      const t = setInterval(() => {
        if (window.google?.maps) {
          initializeMap();
          clearInterval(t);
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, [center.lat, center.lng, zoom, onMapLoad, resolvedMapId]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const newCenter = { lat: center.lat, lng: center.lng };

    map.setCenter(newCenter);
    map.setZoom(zoom);

    if (markerRef.current) {
      // AdvancedMarkerElement or Marker
      if ('position' in markerRef.current && typeof markerRef.current.position === 'object') {
        markerRef.current.position = newCenter;
        markerRef.current.title = center.address;
      } else if (markerRef.current.setPosition) {
        markerRef.current.setPosition(newCenter);
        markerRef.current.setTitle(center.address);
      }
    }

    // 矩形更新
    const s = 0.000449;
    const bounds = { north: center.lat + s / 2, south: center.lat - s / 2, east: center.lng + s / 2, west: center.lng - s / 2 };
    if (squareRef.current) squareRef.current.setMap(null);
    const square = new google.maps.Rectangle({
      bounds,
      editable: false, draggable: false,
      fillColor: '#E67D1A', fillOpacity: 0.2,
      strokeColor: '#CC5C13', strokeOpacity: 0.8, strokeWeight: 2,
    });
    square.setMap(map);
    squareRef.current = square;
  }, [center.lat, center.lng, center.address, zoom]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '300px' }} />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E67D1A] mx-auto mb-2"></div>
            <p className="text-sm text-[#8A3216]">マップを読み込み中...</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-[#411307]">
        50m²キャプチャ範囲
      </div>
    </div>
  );
}
