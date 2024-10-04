import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TEMPERATURE_API_URL = 'http://127.0.0.1:8000/api/temperature/';
const PRECIPITATION_API_URL = 'http://127.0.0.1:8000/api/precipitation/';

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

const fetchData = async (url, time) => {
  try {
    const formattedTime = formatTimeForAPI(time);
    const response = await fetch(`${url}?time=${encodeURIComponent(formattedTime)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

// Temperature constants and functions
const MIN_TEMP = 290; // 16.85°C
const MAX_TEMP = 300; // 26.85°C
const TEMP_COLOR_SCALE = [
  { value: 290, color: '#0000FF' }, // Blue (Cold)
  { value: 293, color: '#00FFFF' }, // Cyan
  { value: 295, color: '#00FF00' }, // Green
  { value: 297, color: '#FFFF00' }, // Yellow
  { value: 300, color: '#FF0000' }  // Red (Hot)
];

// Precipitation constants and functions
const MIN_PRECIP = 30; //0 mm
const MAX_PRECIP = 50; //50 mm
const PRECIP_COLOR_SCALE = [
  { value: 30, color: '#FFFFFF' },   // White (No precipitation)
  { value: 34, color: '#A6F28F' },  // Light Green
  { value: 38, color: '#3CB371' },  // Medium Sea Green
  { value: 42, color: '#1E90FF' },  // Dodger Blue
  { value: 46, color: '#4169E1' },  // Royal Blue
  { value: 50, color: '#000080' }   // Navy (Heavy precipitation)
];

/** 
 const PRECIP_COLOR_SCALE = [
  { value: 0, color: '#FFFFFF' },   // White (No precipitation)
  { value: 10, color: '#A6F28F' },  // Light Green
  { value: 20, color: '#3CB371' },  // Medium Sea Green
  { value: 30, color: '#1E90FF' },  // Dodger Blue
  { value: 40, color: '#4169E1' },  // Royal Blue
  { value: 50, color: '#000080' }   // Navy (Heavy precipitation)
];
*/

const getColorForValue = (value, colorScale, min, max) => {
  if (value <= min) return colorScale[0].color;
  if (value >= max) return colorScale[colorScale.length - 1].color;

  for (let i = 1; i < colorScale.length; i++) {
    if (value <= colorScale[i].value) {
      const lowColor = colorScale[i - 1];
      const highColor = colorScale[i];
      const ratio = (value - lowColor.value) / (highColor.value - lowColor.value);
      return interpolateColor(lowColor.color, highColor.color, ratio);
    }
  }
  return colorScale[colorScale.length - 1].color;
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

const Legend = ({ colorScale, min, max, unit }) => {
  const gradientStyle = {
    background: `linear-gradient(to top, ${colorScale.map(c => c.color).join(', ')})`,
    width: '20px',
    height: '200px',
    marginRight: '10px'
  };

  const valueLabels = [max, ...colorScale.map(c => c.value).reverse(), min];

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
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>{unit}</h4>
        {valueLabels.map((value, index) => (
          <div key={index} style={{ fontSize: '12px' }}>
            {value.toFixed(unit === 'Temperature (K)' ? 0 : 1)}
            {unit === 'Temperature (K)' && ` (${(value - 273.15).toFixed(1)}°C)`}
          </div>
        ))}
      </div>
    </div>
  );
};

const WeatherMap = () => {
  const [temperatureData, setTemperatureData] = useState(null);
  const [precipitationData, setPrecipitationData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState('temperature');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const tempData = await fetchData(TEMPERATURE_API_URL, currentTime);
        const precipData = await fetchData(PRECIPITATION_API_URL, currentTime);
        console.log("Temperature data:", tempData);
        console.log("Precipitation data:", precipData);
        setTemperatureData(tempData);
        setPrecipitationData(precipData);
      } catch (err) {
        setError('Failed to load weather data. Please try again later.');
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentTime]);

  const generateOverlay = (data, colorScale, min, max, valueKey) => {
    if (!data || !data[valueKey] || !Array.isArray(data[valueKey])) {
      console.error(`Invalid data structure for overlay generation. Missing ${valueKey} array:`, data);
      return null;
    }

    const { latitude, longitude } = data;

    if (!Array.isArray(latitude) || !Array.isArray(longitude)) {
      console.error("Invalid data structure: latitude or longitude is not an array");
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = longitude.length;
    canvas.height = latitude.length;
    const ctx = canvas.getContext('2d');

    data[valueKey].forEach((row, latIndex) => {
      if (!Array.isArray(row)) {
        console.error(`Invalid row data at index ${latIndex}:`, row);
        return;
      }
      row.forEach((value, lonIndex) => {
        if (value !== 0 && value !== null && value !== undefined) {
          ctx.fillStyle = getColorForValue(value, colorScale, min, max);
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

  const getBounds = (data) => {
    if (!data || !data.latitude || !data.longitude) return [[-90, -180], [90, 180]];
    const { latitude, longitude } = data;
    return [
      [Math.min(...latitude), Math.min(...longitude)],
      [Math.max(...latitude), Math.max(...longitude)]
    ];
  };

  const getDataRange = (data, valueKey) => {
    if (!data || !data[valueKey]) return [0, 0];
    const validValues = data[valueKey].flat().filter(value => value !== 0 && value !== null && value !== undefined);
    return [Math.min(...validValues), Math.max(...validValues)];
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 border rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Weather Map</h2>
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
      <div className="mb-4">
        <label className="mr-4">
          <input
            type="radio"
            value="temperature"
            checked={activeLayer === 'temperature'}
            onChange={() => setActiveLayer('temperature')}
          /> Temperature
        </label>
        <label>
          <input
            type="radio"
            value="precipitation"
            checked={activeLayer === 'precipitation'}
            onChange={() => setActiveLayer('precipitation')}
          /> Precipitation
        </label>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && temperatureData && precipitationData && (
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
            <LayersControl position="topright">
              <LayersControl.Overlay checked={activeLayer === 'temperature'} name="Temperature">
                <ImageOverlay
                  bounds={getBounds(temperatureData)}
                  url={generateOverlay(temperatureData, TEMP_COLOR_SCALE, MIN_TEMP, MAX_TEMP, 'temperature')}
                  opacity={0.7}
                />
              </LayersControl.Overlay>
              <LayersControl.Overlay checked={activeLayer === 'precipitation'} name="Precipitation">
                <ImageOverlay
                  bounds={getBounds(precipitationData)}
                  url={generateOverlay(precipitationData, PRECIP_COLOR_SCALE, MIN_PRECIP, MAX_PRECIP, 'precipitation')}
                  opacity={0.7}
                />
              </LayersControl.Overlay>
            </LayersControl>
            <Legend 
              colorScale={activeLayer === 'temperature' ? TEMP_COLOR_SCALE : PRECIP_COLOR_SCALE}
              min={activeLayer === 'temperature' ? MIN_TEMP : MIN_PRECIP}
              max={activeLayer === 'temperature' ? MAX_TEMP : MAX_PRECIP}
              unit={activeLayer === 'temperature' ? 'Temperature (K)' : 'Precipitation (mm)'}
            />
          </MapContainer>
        </div>
      )}
      <p className="mt-2">Current API request time: {formatTimeForAPI(currentTime)}</p>
      {temperatureData && precipitationData && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Data Summary:</h3>
          <p>Time: {temperatureData.time || 'N/A'}</p>
          <p>Latitude range: {temperatureData.latitude ? `${Math.min(...temperatureData.latitude).toFixed(2)} to ${Math.max(...temperatureData.latitude).toFixed(2)}` : 'N/A'}</p>
          <p>Longitude range: {temperatureData.longitude ? `${Math.min(...temperatureData.longitude).toFixed(2)} to ${Math.max(...temperatureData.longitude).toFixed(2)}` : 'N/A'}</p>
          <p>Temperature range: {getDataRange(temperatureData, 'temperature')[0].toFixed(2)}K to {getDataRange(temperatureData, 'temperature')[1].toFixed(2)}K</p>
          <p>Precipitation range: {getDataRange(precipitationData, 'precipitation')[0].toFixed(2)}mm to {getDataRange(precipitationData, 'precipitation')[1].toFixed(2)}mm</p>
        </div>
      )}
    </div>
  );
};

export default WeatherMap;