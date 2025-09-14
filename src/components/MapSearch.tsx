import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Location, Place } from '../types';

interface MapSearchProps {
  onLocationSelect: (location: Location) => void;
}

export function MapSearch({ onLocationSelect }: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Services (new優先 / 旧フォールバック)
  const acSuggestionRef = useRef<any>(null);                       // google.maps.places.AutocompleteSuggestion
  const acSuggestionSessionRef = useRef<any>(null);                // google.maps.places.AutocompleteSuggestionSession
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placeNewCtorRef = useRef<any>(null);                       // google.maps.places.Place
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const logSearchError = useCallback((e: {
    service: string;
    status?: string;
    query?: string;
    details?: Record<string, any>;
    timestamp?: Date;
  }) => {
    const payload = {
      ...e,
      timestamp: e.timestamp || new Date(),
      ua: navigator.userAgent,
      href: location.href,
    };
    console.error('🔍 Search Service Error:', payload);

    // 画面表示はREQUEST_DENIEDのみ
    const RD =
      e.status === 'REQUEST_DENIED' ||
      e.status === (google.maps.places as any).PlacesServiceStatus?.REQUEST_DENIED ||
      e.status === google.maps.GeocoderStatus?.REQUEST_DENIED;

    if (RD) {
      setError('検索サービスの利用に失敗しました。APIキー設定（権限/リファラ）をご確認ください。');
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // === 初期化：Loaderが読み終わってから呼ばれる前提 ===
  useEffect(() => {
    let initialized = false;
    const init = () => {
      if (initialized) return;
      if (!window.google?.maps) return;

      try {
        initialized = true;

        // Geocoder
        geocoderRef.current = new google.maps.Geocoder();

        // NEW: AutocompleteSuggestion / Session
        const P: any = google.maps.places;
        if (P?.AutocompleteSuggestion && P?.AutocompleteSuggestionSession) {
          acSuggestionSessionRef.current = new P.AutocompleteSuggestionSession();
          acSuggestionRef.current = new P.AutocompleteSuggestion({
            sessionToken: acSuggestionSessionRef.current,
          });
        } else {
          // 旧: AutocompleteService
          autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }

        // NEW: Place（詳細取得用） or 旧: PlacesService
        if (P?.Place) {
          placeNewCtorRef.current = P.Place;
        } else {
          placesServiceRef.current = new google.maps.places.PlacesService(
            document.createElement('div')
          );
        }

        if (import.meta.env.DEV) {
          console.log('✅ Google Maps services initialized (new API preferred)');
        }
      } catch (err) {
        console.error('❌ Failed to init Google services:', err);
      }
    };

    if (window.google?.maps) {
      init();
    } else {
      const t = setInterval(() => {
        if (window.google?.maps) {
          init();
          clearInterval(t);
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, []);

  // 人気地（最終フォールバック）
  const popularPlaces = [
    { name: '東京タワー', address: '東京都港区芝公園4丁目2-8', lat: 35.6586, lng: 139.7454 },
    { name: '東京スカイツリー', address: '東京都墨田区押上1丁目1-2', lat: 35.7101, lng: 139.8107 },
    { name: '浅草寺', address: '東京都台東区浅草2丁目3-1', lat: 35.7148, lng: 139.7967 },
    { name: '渋谷スクランブル交差点', address: '東京都渋谷区道玄坂2丁目', lat: 35.6594, lng: 139.7006 },
    { name: '自由の女神', address: 'Liberty Island, New York, NY 10004, USA', lat: 40.6892, lng: -74.0445 },
  ];

  // ========= サジェスト =========
  const searchPlaces = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    clearError();

    try {
      const P: any = google.maps.places;

      // NEW: AutocompleteSuggestion
      if (acSuggestionRef.current) {
        const res = await acSuggestionRef.current.getSuggestions({
          input: q,
          types: ['geocode'],
        });
        const items: Place[] = (res?.suggestions || []).slice(0, 5).map((s: any, i: number) => ({
          place_id: s.placeId || `as_${i}_${Date.now()}`,
          description: s.formattedSuggestion || s.text || q,
          structured_formatting: undefined,
          geometry: undefined,
        }));
        setSuggestions(items);
        setIsSearching(false);
        return;
      }

      // 旧: AutocompleteService
      if (autocompleteServiceRef.current) {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: q,
            types: ['establishment', 'geocode'],
            sessionToken: sessionTokenRef.current!,
          },
          (preds, status) => {
            if (status === P.PlacesServiceStatus.OK && preds?.length) {
              const items: Place[] = preds.slice(0, 5).map((p, i) => ({
                place_id: p.place_id || `ac_${i}_${Date.now()}`,
                description: p.description,
                structured_formatting: p.structured_formatting,
                geometry: undefined,
              }));
              setSuggestions(items);
            } else if (status === P.PlacesServiceStatus.REQUEST_DENIED) {
              logSearchError({ service: 'places_autocomplete', status, query: q });
              fallbackToGeocoding(q);
            } else {
              fallbackToGeocoding(q);
            }
            setIsSearching(false);
          }
        );
        return;
      }

      // どちらも無い→Geocoder
      fallbackToGeocoding(q);
    } catch (e) {
      console.error('❌ searchPlaces error:', e);
      fallbackToGeocoding(q);
    }
  }, [clearError, logSearchError]);

  // ========= Geocoder フォールバック =========
  const fallbackToGeocoding = useCallback((q: string) => {
    if (!geocoderRef.current) {
      fallbackToStatic(q);
      setIsSearching(false);
      return;
    }
    geocoderRef.current.geocode({ address: q }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.length) {
        const items: Place[] = results.slice(0, 5).map((r, i) => ({
          place_id: `gc_${i}_${Date.now()}`,
          description: r.formatted_address || q,
          geometry: {
            location: {
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng(),
            },
          },
        }));
        setSuggestions(items);
      } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
        logSearchError({ service: 'geocoding', status, query: q });
        fallbackToStatic(q);
      } else {
        fallbackToStatic(q);
      }
      setIsSearching(false);
    });
  }, [logSearchError]);

  // ========= 静的フォールバック =========
  const fallbackToStatic = useCallback((q: string) => {
    const lc = q.toLowerCase();
    const hit = popularPlaces
      .map((p, i) => ({
        score:
          (p.name.toLowerCase().includes(lc) ? 2 : 0) +
          (p.address.toLowerCase().includes(lc) ? 1 : 0),
        p,
        i,
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => ({
        place_id: `static_${x.i}_${Date.now()}`,
        description: `${x.p.name} - ${x.p.address}`,
        geometry: { location: { lat: x.p.lat, lng: x.p.lng } },
      }));

    setSuggestions(hit.length ? hit as any : popularPlaces.slice(0, 5).map((p, i) => ({
      place_id: `static_default_${i}_${Date.now()}`,
      description: `${p.name} - ${p.address}`,
      geometry: { location: { lat: p.lat, lng: p.lng } },
    })) as any);
  }, []);

  // ========= 決定（詳細取得） =========
  const handlePlaceSelect = useCallback((pl: Place) => {
    // 既に座標あり（Geocoder/Static）
    if (pl.geometry?.location?.lat && pl.geometry.location.lng) {
      const loc: Location = {
        lat: pl.geometry.location.lat,
        lng: pl.geometry.location.lng,
        address: pl.description,
      };
      setQuery(loc.address);
      setShowSuggestions(false);
      setSuggestions([]);
      onLocationSelect(loc);
      return;
    }

    // NEW: Place
    if (pl.place_id && placeNewCtorRef.current) {
      setIsSearching(true);
      (async () => {
        try {
          const place = new placeNewCtorRef.current({ id: pl.place_id });
          await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
          const locObj = place.location;
          if (locObj) {
            const loc: Location = {
              lat: locObj.lat(),
              lng: locObj.lng(),
              address: place.formattedAddress || pl.description,
            };
            setQuery(loc.address);
            setShowSuggestions(false);
            setSuggestions([]);
            onLocationSelect(loc);
          } else {
            // 取得失敗→Geocoderへ
            handleGeocodeSearch(pl.description);
          }
        } catch (err) {
          console.warn('⚠️ Place(fetchFields) error:', err);
          handleGeocodeSearch(pl.description);
        } finally {
          setIsSearching(false);
        }
      })();
      return;
    }

    // 旧: PlacesService.getDetails
    if (pl.place_id && placesServiceRef.current) {
      setIsSearching(true);
      placesServiceRef.current.getDetails(
        {
          placeId: pl.place_id,
          fields: ['geometry', 'formatted_address', 'name'],
          sessionToken: sessionTokenRef.current || undefined,
        },
        (pd, status) => {
          const P: any = google.maps.places;
          if (status === P.PlacesServiceStatus.OK && pd?.geometry?.location) {
            const loc: Location = {
              lat: pd.geometry.location.lat(),
              lng: pd.geometry.location.lng(),
              address: pd.formatted_address || pl.description,
            };
            setQuery(loc.address);
            setShowSuggestions(false);
            setSuggestions([]);
            onLocationSelect(loc);
            // 課金最適化：セッショントークン更新
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          } else {
            if (status === P.PlacesServiceStatus.REQUEST_DENIED) {
              logSearchError({ service: 'places_details', status, query: pl.description });
            }
            handleGeocodeSearch(pl.description);
          }
          setIsSearching(false);
        }
      );
      return;
    }

    // 最終
    handleGeocodeSearch(pl.description);
  }, [onLocationSelect, logSearchError]);

  const handleGeocodeSearch = useCallback((address: string) => {
    if (!geocoderRef.current) {
      const fallback: Location = { lat: 35.6762, lng: 139.6503, address };
      setQuery(fallback.address);
      setShowSuggestions(false);
      setSuggestions([]);
      onLocationSelect(fallback);
      return;
    }
    setIsSearching(true);
    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.length) {
        const r = results[0];
        const loc: Location = {
          lat: r.geometry.location.lat(),
          lng: r.geometry.location.lng(),
          address: r.formatted_address || address,
        };
        setQuery(loc.address);
        setShowSuggestions(false);
        setSuggestions([]);
        onLocationSelect(loc);
      } else {
        if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
          console.error('🔐 Geocoder REQUEST_DENIED');
        }
        const p = popularPlaces[0];
        const loc: Location = { lat: p.lat, lng: p.lng, address };
        setQuery(loc.address);
        setShowSuggestions(false);
        setSuggestions([]);
        onLocationSelect(loc);
      }
      setIsSearching(false);
    });
  }, [onLocationSelect]);

  // 入力系
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setShowSuggestions(true);
    clearError();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim()) {
      debounceRef.current = setTimeout(() => searchPlaces(v), 300);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  return (
    <div className="search-form-container relative">
      <form className="search-form-1" onSubmit={(e) => e.preventDefault()}>
                <button
          type="submit"
          aria-label="Search"
          onClick={() => { if (query.trim()) { searchPlaces(query); setShowSuggestions(true); } }}
          disabled={isSearching}
        />
        <label>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Please enter the building name and address."
          />
        </label>

      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          {suggestions.slice(0, 5).map((p) => (
            <button
              key={p.place_id}
              onClick={() => handlePlaceSelect(p)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {p.description.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {p.description.split(',').slice(1).join(',').trim()}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="absolute z-10 mt-1 w-full bg-red-50 border border-red-200 rounded-lg shadow-lg p-3">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {showSuggestions && <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)} />}
    </div>
  );
}
