import React, { useEffect, useRef, useState } from 'react';

// Central map defaults (San Francisco)
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

// Helper to map severity to marker hex colors
const SEVERITY_COLORS = {
  Critical: '#dc2626', // Red
  High: '#ea580c',     // Orange
  Medium: '#eab308',   // Yellow
  Low: '#16a34a',      // Green
};

export default function MapContainer({
  reports = [],
  onPinSelect = null,
  selectedLocation = null,
  height = '400px',
  interactive = false,
  zoom = 13,
  center = DEFAULT_CENTER,
  onMarkerClick = null
}) {
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('loading'); // 'google', 'leaflet', 'loading', 'error'
  const [mapInstance, setMapInstance] = useState(null);
  const [googleMarkers, setGoogleMarkers] = useState([]);
  const [leafletMarkers, setLeafletMarkers] = useState([]);

  // Geolocation detector API key
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isGoogleMapsConfigured = googleApiKey && googleApiKey !== 'your_google_maps_api_key_here';

  useEffect(() => {
    if (isGoogleMapsConfigured) {
      loadGoogleMaps();
    } else {
      loadLeaflet();
    }
    // Cleanup
    return () => {
      // Clean up maps if necessary
    };
  }, []);

  // ------------------------------------------
  // GOOGLE MAPS LOADER
  // ------------------------------------------
  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapType('google');
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapType('google');
      script.onerror = () => {
        console.warn("Failed to load Google Maps script. Falling back to Leaflet.");
        loadLeaflet();
      };
      document.head.appendChild(script);
    } else {
      // Script exists but not finished loading
      const interval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(interval);
          setMapType('google');
        }
      }, 100);
    }
  };

  // ------------------------------------------
  // LEAFLET MAPS LOADER
  // ------------------------------------------
  const loadLeaflet = () => {
    // Check if scripts already loaded
    if (window.L) {
      setMapType('leaflet');
      return;
    }

    // Add Leaflet CSS
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    const scriptId = 'leaflet-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setMapType('leaflet');
      script.onerror = () => {
        setMapType('error');
      };
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          setMapType('leaflet');
        }
      }, 100);
    }
  };

  // ------------------------------------------
  // INITIALIZE GOOGLE MAP INSTANCE
  // ------------------------------------------
  useEffect(() => {
    if (mapType !== 'google' || !mapRef.current) return;

    const initialCenter = selectedLocation || center;
    const map = new window.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    setMapInstance(map);

    // Click handler for pinning location in interactive mode
    if (interactive && onPinSelect) {
      map.addListener('click', (e) => {
        const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        onPinSelect(coords);
      });
    }
  }, [mapType]);

  // ------------------------------------------
  // INITIALIZE LEAFLET MAP INSTANCE
  // ------------------------------------------
  useEffect(() => {
    if (mapType !== 'leaflet' || !mapRef.current) return;

    const initialCenter = selectedLocation || center;
    const map = window.L.map(mapRef.current).setView([initialCenter.lat, initialCenter.lng], zoom);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    setMapInstance(map);

    if (interactive && onPinSelect) {
      map.on('click', (e) => {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
        onPinSelect(coords);
      });
    }

    return () => {
      map.remove();
    };
  }, [mapType]);

  // ------------------------------------------
  // SYNC MAP MARKERS (GOOGLE / LEAFLET)
  // ------------------------------------------
  useEffect(() => {
    if (!mapInstance) return;

    if (mapType === 'google') {
      // Clear old markers
      googleMarkers.forEach(m => {
        if (m && m.setMap) {
          m.setMap(null);
        }
      });
      const newMarkers = [];

      // 1. Add current selection pin
      if (selectedLocation) {
        const lat = parseFloat(selectedLocation.lat);
        const lng = parseFloat(selectedLocation.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const m = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            title: 'Selected Location',
            icon: {
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#4f46e5',
              fillOpacity: 1.0,
              strokeWeight: 2,
              strokeColor: '#ffffff'
            }
          });
          newMarkers.push(m);
        }
      }

      // 2. Add reports markers
      reports.forEach(report => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const color = SEVERITY_COLORS[report.severity] || '#6366f1';
        const m = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance,
          title: report.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });

        // Add info window popup
        const infowindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
              <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 14px;">${report.title}</h4>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">${report.category} • <span style="color: ${color}; font-weight:600">${report.severity}</span></p>
              <div style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">
                <div>👥 Volunteers: <b>${report.volunteers ? report.volunteers.length : 0} joined</b></div>
                <div>⚡ Difficulty: <b>${report.difficulty || 'Medium'}</b></div>
                <div>📍 Status: <span style="font-weight: 600; color: #4f46e5;">${report.status}</span></div>
              </div>
              <a href="/problems/${report.id}" style="color: #4f46e5; text-decoration: none; font-size: 12px; font-weight: 500;">View Action Board →</a>
            </div>
          `
        });

        m.addListener('click', () => {
          infowindow.open(mapInstance, m);
          if (onMarkerClick) onMarkerClick(report);
        });

        newMarkers.push(m);
      });

      setGoogleMarkers(newMarkers);

      // Pan to selected location if it updates
      if (selectedLocation) {
        const lat = parseFloat(selectedLocation.lat);
        const lng = parseFloat(selectedLocation.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          mapInstance.panTo({ lat, lng });
        }
      }

    } else if (mapType === 'leaflet') {
      // Clear old layers
      leafletMarkers.forEach(m => m.remove());
      const newMarkers = [];

      // 1. Add current selection pin
      if (selectedLocation) {
        // Simple colored circle marker for selected location
        const m = window.L.circleMarker([selectedLocation.lat, selectedLocation.lng], {
          radius: 10,
          fillColor: '#4f46e5',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(mapInstance);
        m.bindPopup('<b>Your Pin</b><br/>Selected location for issue.');
        newMarkers.push(m);
        mapInstance.panTo([selectedLocation.lat, selectedLocation.lng]);
      }

      // 2. Add reports markers
      reports.forEach(report => {
        const color = SEVERITY_COLORS[report.severity] || '#6366f1';
        
        // Simple colored circle marker
        const m = window.L.circleMarker([report.latitude, report.longitude], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(mapInstance);

        const popupContent = `
          <div style="font-family: system-ui; min-width: 170px;">
            <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600;">${report.title}</h4>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #666;">${report.category} • <span style="color: ${color}; font-weight:600">${report.severity}</span></p>
            <div style="margin: 0 0 8px 0; font-size: 10px; color: #444; line-height: 1.4;">
              <div>👥 Volunteers: <b>${report.volunteers ? report.volunteers.length : 0} joined</b></div>
              <div>⚡ Difficulty: <b>${report.difficulty || 'Medium'}</b></div>
              <div>📍 Status: <span style="font-weight: 600; color: #4f46e5;">${report.status}</span></div>
            </div>
            <a href="/problems/${report.id}" style="font-size: 11px; color: #4f46e5; text-decoration: none; font-weight: 600;">View Action Board</a>
          </div>
        `;
        
        m.bindPopup(popupContent);
        m.on('click', () => {
          if (onMarkerClick) onMarkerClick(report);
        });
        newMarkers.push(m);
      });

      setLeafletMarkers(newMarkers);
    }
  }, [reports, selectedLocation, mapInstance]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
      {mapType === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 z-10">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-slate-500">Initializing Interactive Map...</p>
        </div>
      )}

      {mapType === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 z-10 p-4 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Map Loading Failed</p>
          <p className="text-xs text-slate-500">Check internet connectivity or console logs for script issues.</p>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapRef} style={{ height }} className="w-full" />

      {/* Badge indicating map provider */}
      <div className="absolute bottom-2 left-2 z-[999] px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-600 shadow border border-slate-200 pointer-events-none dark:bg-slate-850 dark:border-slate-850 dark:text-slate-300">
        {mapType === 'google' ? 'Google Maps Mode' : mapType === 'leaflet' ? 'Leaflet fallback (Mock Mode)' : 'Loading'}
      </div>
    </div>
  );
}
