import React, { useState, useEffect, useRef } from 'react';
import { Input, Spin, Modal, InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';

// Define TypeScript interfaces
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

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onLocationSelect,
  onCancel,
}) => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<InputRef>(null);

  useEffect(()   => {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
  }, []);

  // Create a debounced search function to prevent too many API calls
  const debouncedSearch = useRef(
    debounce(async (searchText: string) => {
      if (searchText.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // usage policy: max 1 request per second
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchText
          )}&countrycodes=id&limit=5`,
          {
            headers: {
              'Accept-Language': 'en-US,en',
              'User-Agent': 'Ozzy/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data: LocationSuggestion[] = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 800)
  ).current;

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);
    // Cancel debounced call on cleanup
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleSelectLocation = (location: LocationSuggestion) => {
    const formattedAddress = location.display_name;
    setQuery(formattedAddress);
    onLocationSelect({
      description: formattedAddress,
      lat: parseFloat(location.lat),
      lon: parseFloat(location.lon),
      osm_id: location.osm_id,
      place_id: location.place_id,
    });
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
        {suggestions.map((location) => (
          <div
            key={location.place_id}
            onClick={() => handleSelectLocation(location)}
            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 transition-colors"
          >
            {location.display_name}
          </div>
        ))}
        
        {suggestions.length === 0 && query.length > 1 && !isLoading && (
          <div className="p-3 text-gray-500 text-center">
            No locations found.
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationAutocomplete;