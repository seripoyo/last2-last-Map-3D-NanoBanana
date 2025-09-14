import React from 'react';
import { MapPin } from 'lucide-react';
import { Location } from '../types';

interface PresetButtonsProps {
  onLocationSelect: (location: Location) => void;
}

const presetLocations = [
  {
    name: "Liberty Enlightening the World",
    nameJa: "アメリカ：自由の女神",
    location: {
      lat: 40.6892,
      lng: -74.0445,
      address: "Statue of Liberty, New York, NY, USA"
    }
  },
  {
    name: " Piazza San Marco：Venice",
    nameJa: "ベネチア：サンマルコ広場",
    location: {
      lat: 45.4342,
      lng: 12.3380,
      address: "Piazza San Marco, Venice, Italy"
    }
  },
  {
    name: "Taj Mahal:India",
    nameJa: "インド：タージマハル",
    location: {
      lat: 25.378576,
      lng: 175.426513,
      address: "Taj Mahal:India"
    }
  },
  {
    name: "Sensoji Temple：Japan ",
    nameJa: "日本：浅草の浅草寺",
    location: {
      lat: 35.7148,
      lng: 139.7967,
      address: "Sensoji Temple, Asakusa, Tokyo, Japan"
    }
  }
];

export function PresetButtons({ onLocationSelect }: PresetButtonsProps) {
  const handlePresetClick = (preset: typeof presetLocations[0]) => {
    console.log('📍 プリセット場所が選択されました:', preset.nameJa);
    onLocationSelect(preset.location);
  };

  return (
    <div className="space-y-4">
      {presetLocations.map((preset, index) => (
        <button
          key={index}
          onClick={() => handlePresetClick(preset)}
          className="liberty-button w-full"
        >
          <span className="button-text">{preset.name}</span>
          <div className="play-button">
            <div className="play-triangle"></div>
          </div>
        </button>
      ))}
    </div>
  );
}