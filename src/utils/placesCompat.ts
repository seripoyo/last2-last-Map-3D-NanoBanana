/**
 * 新旧Places APIの互換ラッパー
 * AutocompleteSuggestion/Placeが利用可能な場合は新APIを使用し、
 * そうでない場合は旧APIにフォールバックする
 */

export interface Suggestion {
  text: string;
  placeId?: string;
}

export interface PlaceDetail {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

/**
 * 予測候補を取得（新旧API互換）
 */
export async function fetchSuggestions(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken | null
): Promise<Suggestion[]> {
  const places = google.maps.places as any;

  // 新API（AutocompleteSuggestion）が利用可能な場合
  if (places.AutocompleteSuggestion) {
    try {
      const session = sessionToken || new places.AutocompleteSuggestionSession();
      const service = new places.AutocompleteSuggestion({ sessionToken: session });
      const response = await service.getSuggestions({ 
        input, 
        types: ["geocode", "establishment"] 
      });
      
      return response.suggestions.slice(0, 5).map((s: any) => ({
        text: s.formattedSuggestion || s.text,
        placeId: s.placeId
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('新API（AutocompleteSuggestion）エラー、旧APIにフォールバック:', error);
      }
    }
  }

  // 旧API（AutocompleteService）へのフォールバック
  const service = new places.AutocompleteService();
  return new Promise((resolve) => {
    const request: google.maps.places.AutocompletionRequest = {
      input,
      types: ["geocode", "establishment"],
      ...(sessionToken && { sessionToken })
    };

    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        resolve([]);
        return;
      }
      
      resolve(predictions.slice(0, 5).map(p => ({
        text: p.description,
        placeId: p.place_id
      })));
    });
  });
}

/**
 * 場所の詳細を取得（新旧API互換）
 */
export async function fetchPlaceDetail(
  placeId: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken | null
): Promise<PlaceDetail | null> {
  const places = google.maps.places as any;

  // 新API（Place）が利用可能な場合
  if (places.Place) {
    try {
      const place = new places.Place({ id: placeId });
      // 必要最小限のフィールドのみ取得
      await place.fetchFields({ 
        fields: ["location", "formattedAddress", "displayName"] 
      });
      
      const location = place.location;
      if (!location) return null;
      
      return {
        lat: location.lat(),
        lng: location.lng(),
        address: place.formattedAddress,
        name: place.displayName
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('新API（Place）エラー、旧APIにフォールバック:', error);
      }
    }
  }

  // 旧API（PlacesService.getDetails）へのフォールバック
  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement("div"));
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      fields: ["geometry", "formatted_address", "name"],
      ...(sessionToken && { sessionToken })
    };

    service.getDetails(request, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
        resolve(null);
        return;
      }
      
      resolve({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address,
        name: place.name
      });
    });
  });
}

/**
 * 住所から座標を取得（Geocoding API）
 */
export async function geocodeAddress(address: string): Promise<PlaceDetail | null> {
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]) {
        resolve(null);
        return;
      }
      
      const result = results[0];
      resolve({
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        address: result.formatted_address
      });
    });
  });
}