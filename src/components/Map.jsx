import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = 'http://127.0.0.1:8000/api/temperature/';

const formatTimeForAPI = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const formatTimeForDisplay = (date) => {
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

const fetchTemperatureData = async (time) => {
  try {
    const formattedTime = formatTimeForAPI(time);
    const response = await fetch(`${API_URL}?time=${encodeURIComponent(formattedTime)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching temperature data:", error);
    throw error;
  }
};

const MIN_TEMP = 290; // 16.85°C
const MAX_TEMP = 300; // 26.85°C
const COLOR_SCALE = [
  { temp: 290, color: '#0000FF' }, // Blue (Cold)
  { temp: 293, color: '#00FFFF' }, // Cyan
  { temp: 295, color: '#00FF00' }, // Green
  { temp: 297, color: '#FFFF00' }, // Yellow
  { temp: 300, color: '#FF0000' }  // Red (Hot)
];

const getColorForTemperature = (temp) => {
  if (temp <= MIN_TEMP) return COLOR_SCALE[0].color;
  if (temp >= MAX_TEMP) return COLOR_SCALE[COLOR_SCALE.length - 1].color;

  for (let i = 1; i < COLOR_SCALE.length; i++) {
    if (temp <= COLOR_SCALE[i].temp) {
      const lowColor = COLOR_SCALE[i - 1];
      const highColor = COLOR_SCALE[i];
      const ratio = (temp - lowColor.temp) / (highColor.temp - lowColor.temp);
      return interpolateColor(lowColor.color, highColor.color, ratio);
    }
  }
  return COLOR_SCALE[COLOR_SCALE.length - 1].color;
};

const interpolateColor = (color1, color2, ratio) => {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const Legend = () => {
  const gradientStyle = {
    background: `linear-gradient(to top, ${COLOR_SCALE.map(c => c.color).join(', ')})`,
    width: '20px',
    height: '200px',
    marginRight: '10px'
  };

const temperatureLabels = [MAX_TEMP, ...COLOR_SCALE.map(c => c.temp).reverse(), MIN_TEMP];

  return (
    <div className="legend" style={{ 
      position: 'absolute', 
      top: '20px', 
      right: '10px', 
      backgroundColor: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      zIndex: 1000,
      display: 'flex'
    }}>
      <div style={gradientStyle}></div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {temperatureLabels.map((temp, index) => (
          <div key={index} style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '5px' }}>{temp.toFixed(0)}K</span>
            <span>({(temp - 273.15).toFixed(1)}°C)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Map = () => {
  const [temperatureData, setTemperatureData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTemperatureData(currentTime);
        setTemperatureData(data);
      } catch (err) {
        setError('Failed to load temperature data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentTime]);

  const generateTemperatureOverlay = () => {
    if (!temperatureData) return null;

    const { latitude, longitude, temperature } = temperatureData;

    const canvas = document.createElement('canvas');
    canvas.width = longitude.length;
    canvas.height = latitude.length;
    const ctx = canvas.getContext('2d');

    temperature.forEach((row, latIndex) => {
      row.forEach((temp, lonIndex) => {
        if (temp !== 0) {
          ctx.fillStyle = getColorForTemperature(temp);
          ctx.fillRect(lonIndex, latIndex, 1, 1);
        }
      });
    });

    return canvas.toDataURL();
  };

  const changeTime = (hours) => {
    const newTime = new Date(currentTime.getTime() + hours * 3600000);
    setCurrentTime(newTime);
  };

  const getBounds = () => {
    if (!temperatureData) return [[-90, -180], [90, 180]];
    const { latitude, longitude } = temperatureData;
    return [
      [Math.min(...latitude), Math.min(...longitude)],
      [Math.max(...latitude), Math.max(...longitude)]
    ];
  };

  const getTemperatureRange = () => {
    if (!temperatureData) return [0, 0];
    const validTemps = temperatureData.temperature.flat().filter(temp => temp !== 0);
    return [Math.min(...validTemps), Math.max(...validTemps)];
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 border rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Temperature Map</h2>
      <div className="mb-4 flex items-center justify-between">
        <button 
          onClick={() => changeTime(-3)} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          ← 3 hours
        </button>
        <span className="text-lg font-semibold">{formatTimeForDisplay(currentTime)}</span>
        <button 
          onClick={() => changeTime(3)} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          3 hours →
        </button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && temperatureData && (
        <div className="mb-4 relative">
          <MapContainer 
            center={[
              (temperatureData.latitude[0] + temperatureData.latitude[temperatureData.latitude.length - 1]) / 2,
              (temperatureData.longitude[0] + temperatureData.longitude[temperatureData.longitude.length - 1]) / 2
            ]} 
            zoom={8} 
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ImageOverlay
              bounds={getBounds()}
              url={generateTemperatureOverlay()}
              opacity={0.7}
            />
            <Legend />
          </MapContainer>
        </div>
      )}
      <p className="mt-2">Current API request time: {formatTimeForAPI(currentTime)}</p>
      {temperatureData && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Data Summary:</h3>
          <p>Time: {temperatureData.time}</p>
          <p>Latitude range: {Math.min(...temperatureData.latitude).toFixed(2)} to {Math.max(...temperatureData.latitude).toFixed(2)}</p>
          <p>Longitude range: {Math.min(...temperatureData.longitude).toFixed(2)} to {Math.max(...temperatureData.longitude).toFixed(2)}</p>
          <p>Temperature range (excluding 0 values): {getTemperatureRange()[0].toFixed(2)}K to {getTemperatureRange()[1].toFixed(2)}K</p>
        </div>
      )}
    </div>
  );
};

export default Map;