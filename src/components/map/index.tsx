'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Import Leaflet and create a custom icon
import L from 'leaflet';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  zoom = 14
}) => {
  // Create custom icon on first render
  React.useEffect(() => {
    // This approach avoids TypeScript errors by using a simple custom icon
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    // Set the icon directly on the marker options we'll use later
    setCustomIcon(icon);
  }, []);
  
  // State to hold our custom icon
  const [customIcon, setCustomIcon] = React.useState<L.Icon | null>(null);
  
  // Wait until icon is ready
  if (!customIcon) {
    return <div className="h-full w-full bg-gray-100"></div>;
  }
  
  return (
    <MapContainer 
      center={[latitude, longitude]} 
      zoom={zoom} 
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={customIcon} />
    </MapContainer>
  );
};

export default LeafletMap;