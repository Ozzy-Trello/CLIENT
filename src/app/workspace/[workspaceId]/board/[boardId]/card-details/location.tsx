'use client';

import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

// Define the props for our component
interface LocationDisplayProps {
  coordinate: string;
  height?: number;
}

// Create a simple component without any TypeScript errors
const LocationDisplay: React.FC<LocationDisplayProps> = ({
  coordinate,
  height = 250
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [locationData, setLocationData] = useState<{
    display_name: string;
  } | null>(null);
  
  // Extract coordinates
  const coordinates = coordinate?.split("|") || [];
  const lat = coordinates.length > 0 ? parseFloat(coordinates[0]) : null;
  const lon = coordinates.length > 1 ? parseFloat(coordinates[1]) : null;
  
  // Function to fetch location name
  useEffect(() => {
    const fetchLocationName = async () => {
      if (!lat || !lon) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`,
          {
            headers: {
              'Accept-Language': 'en-US,en',
              'User-Agent': 'YourAppName/1.0',
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setLocationData(data);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocationName();
  }, [lat, lon]);
  
  // Dynamic import of the actual map component
  const MapWithNoSSR = dynamic(() => import('@/app/components/map/index'), {
    ssr: false,
    loading: () => (
      <div 
        className="flex justify-center items-center h-full w-full bg-gray-100"
        style={{ height: `${height}px` }}
      >
        <Spin tip="Loading map..." />
      </div>
    )
  });
  
  // Get formatted location name
  const getLocationName = () => {
    if (!locationData) return 'Location';
    return locationData.display_name.split(',')[0];
  };
  
  // Get full address
  const getFullAddress = () => {
    if (!locationData) return `${lat}, ${lon}`;
    return locationData.display_name;
  };
  
  if (!lat || !lon) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <EnvironmentOutlined className="text-xl" />
          <h1 className="text-xl font-bold mb-0">Location</h1>
        </div>
        <div className="ml-7 p-4 bg-gray-100">
          <p className="text-gray-500">No location data available</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-2">
        <EnvironmentOutlined className="text-xl" />
        <h1 className="text-xl font-bold mb-0">Location</h1>
      </div>
      
      <div className="ml-7">
        {/* Map container */}
        <div style={{ height: `${height}px` }}>
          <MapWithNoSSR latitude={lat} longitude={lon} />
        </div>
        
        {/* Location details */}
        <div className="p-4 bg-gray-100">
          <h4 className="font-medium text-lg mb-1">{getLocationName()}</h4>
          <p className="text-gray-600 text-sm mb-0">{getFullAddress()}</p>
        </div>
      </div>
    </div>
  );
};

export default LocationDisplay;