export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeneratedImages {
  cad: string | null;
  hologram: string | null;
  lineArt: string | null;
}

export interface Place {
  place_id: string;
  description: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}