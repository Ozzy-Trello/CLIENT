import React, { useState, useEffect, useRef } from "react";
import { Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import debounce from "lodash/debounce";

interface LocationSuggestion {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
  class: string;
  type: string;
  importance: number;
}

interface LocationData {
  description: string;
  lat: number;
  lon: number;
  osm_id: number;
  place_id: number;
}

interface LocationAutocompleteProps {
  onLocationSelect: (location: LocationData) => void;
  onCancel: () => void;
}

const predefinedLocations: LocationData[] = [
  {
    description: "Warungboto",
    lat: -7.8141977,
    lon: 110.3921338,
    osm_id: 0,
    place_id: 0,
  },
  {
    description: "Maguwo",
    lat: -7.7637222,
    lon: 110.4211807,
    osm_id: 0,
    place_id: 0,
  },
  {
    description: "Kabupaten",
    lat: -7.7642042,
    lon: 110.3446564,
    osm_id: 0,
    place_id: 0,
  },
];

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onLocationSelect,
  onCancel,
}) => {
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        (inputRef.current as any).focus();
      }
    }, 100);
  }, []);

  const debouncedSearch = useRef(
    debounce(async (searchText: string) => {
      if (searchText.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchText
          )}&countrycodes=id&limit=5`,
          {
            headers: {
              "Accept-Language": "en-US,en",
              "User-Agent": "Ozzy/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data: LocationSuggestion[] = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 800)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleSelectLocation = (
    location: LocationData | LocationSuggestion
  ) => {
    const isPredefined = "description" in location;
    const description = isPredefined
      ? location.description
      : location.display_name;

    onLocationSelect({
      description,
      lat: parseFloat(location.lat.toString()),
      lon: parseFloat(location.lon.toString()),
      osm_id: location.osm_id ?? 0,
      place_id: location.place_id ?? 0,
    });

    setQuery(description);
    onCancel();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="p-2 w-sm">
      <Input
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Search location"
        prefix={<SearchOutlined className="text-gray-400" />}
        suffix={isLoading ? <Spin size="small" /> : null}
        className="mb-4"
        allowClear
      />

      <div className="max-h-80 overflow-y-auto">
        {/* Show predefined options when no query yet */}
        {query.length < 2 &&
          predefinedLocations.map((location) => (
            <div
              key={location.description}
              onClick={() => handleSelectLocation(location)}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors"
            >
              {location.description} ({location.lat}, {location.lon})
            </div>
          ))}

        {/* Show search results from API */}
        {query.length >= 2 &&
          suggestions.map((location) => (
            <div
              key={location.place_id}
              onClick={() => handleSelectLocation(location)}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors"
            >
              {location.display_name}
            </div>
          ))}

        {query.length >= 2 && suggestions.length === 0 && !isLoading && (
          <div className="p-3 text-gray-500 text-center">
            No locations found.
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationAutocomplete;
