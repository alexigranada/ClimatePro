import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import NavBar from './NavBar';

// Define fixed scales and ranges for temperature and precipitation
const SCALES = {
  temperature: {
    min: 291, // 0°C in Kelvin 273.15
    max: 299, // 40°C in Kelvin - 5 313.15
    colorScale: [[0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 0, 0]]
  },
  precipitation: {
    min: 0,
    max: 0.0001, // 100mm as maximum precipitation
    colorScale: [[255, 255, 255], [0, 255, 255], [0, 0, 255], [128, 0, 255], [255, 0, 255]]
  }
};

/*
const getColorForValue = (value, colorScale, min, max) => {
  const normalizedValue = (value - min) / (max - min);
  const index = Math.min(Math.floor(normalizedValue * (colorScale.length - 1)), colorScale.length - 2);
  const t = (normalizedValue - index / (colorScale.length - 1)) * (colorScale.length - 1);
  
  const color1 = colorScale[index];
  const color2 = colorScale[index + 1];
  
  const r = Math.round(color1[0] * (1 - t) + color2[0] * t);
  const g = Math.round(color1[1] * (1 - t) + color2[1] * t);
  const b = Math.round(color1[2] * (1 - t) + color2[2] * t);
  
  return `rgb(${r}, ${g}, ${b})`;
};*/

/*NEW*/
const getColorForValue = (value, colorScale, min, max) => {
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = Math.min(Math.floor(normalizedValue * (colorScale.length - 1)), colorScale.length - 2);
  const t = (normalizedValue - index / (colorScale.length - 1)) * (colorScale.length - 1);
  
  const color1 = colorScale[index];
  const color2 = colorScale[index + 1];
  
  const r = Math.round(color1[0] * (1 - t) + color2[0] * t);
  const g = Math.round(color1[1] * (1 - t) + color2[1] * t);
  const b = Math.round(color1[2] * (1 - t) + color2[2] * t);
  
  return `rgb(${r}, ${g}, ${b})`;
};

/*
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
      // Omitir valores de 0 para temperatura y -99 para precipitación
      if ((valueKey === 'temperature' && value !== 0) || (valueKey === 'precipitation' && value !== -99)) {
        ctx.fillStyle = getColorForValue(value, colorScale, min, max);
        ctx.fillRect(lonIndex, latIndex, 1, 1);
      }
    });
  });

  return canvas.toDataURL();
};*/

const generateOverlay = (data, valueKey) => {
  if (!data || !data[valueKey] || !Array.isArray(data[valueKey])) {
    console.error(`Invalid data structure for overlay generation. Missing ${valueKey} array:`, data);
    return null;
  }

  const { latitude, longitude } = data;
  const { min, max, colorScale } = SCALES[valueKey];

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
      if ((valueKey === 'temperature' && value !== 0) || (valueKey === 'precipitation' && value !== -99)) {
        ctx.fillStyle = getColorForValue(value, colorScale, min, max);
        ctx.fillRect(lonIndex, latIndex, 1, 1);
      }
    });
  });

  return canvas.toDataURL();
};

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-77.36);
  const [lat] = useState(3.65);
  const [zoom] = useState(8.95);
  const [error, setError] = useState(null);
  const [activeLayer, setActiveLayer] = useState('temperature');
  const [canvasData, setCanvasData] = useState(null);
  const [showValueGrid, setShowValueGrid] = useState(true);

  const validHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const getNextValidHour = (currentHour) => {
    return validHours.find(hour => hour > currentHour) || validHours[0];
  };

  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:00:00`;
  };

  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const nextValidHour = getNextValidHour(currentHour);
    
    if (nextValidHour <= currentHour) {
      now.setDate(now.getDate() + 1); // Move to next day if we've wrapped around
    }
    now.setHours(nextValidHour, 0, 0, 0);
    
    console.log("Hora actual:", now.toLocaleString());
    console.log("Próxima hora válida seleccionada:", now.toLocaleString());
    
    return formatDateToString(now);
  });
  
  const API_KEY = 'W5lV2tLMxZAza9GGxomX';

  useEffect(() => {
    if (map.current) return;
    
    if (!API_KEY) {
      setError('MapTiler API key is missing. Please check your environment variables.');
      return;
    }

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`,
        center: [lng, lat],
        zoom: zoom
      });

      map.current.on('load', () => {
        updateDataLayer('temperature');
      });
    } catch (err) {
      setError(`Error initializing map: ${err.message}`);
    }
  }, [API_KEY, lng, lat, zoom]);

  useEffect(() => {
    if (map.current && map.current.loaded()) {
      updateDataLayer(activeLayer);
    }
  }, [currentTime, activeLayer]);

  useEffect(() => {
    if (map.current && map.current.loaded()) {
      toggleValueGrid();
    }
  }, [showValueGrid]);

  const fetchData = async (time, type) => {
    try {
      const response = await fetch(`http://localhost:8000/api/${type}?time=${encodeURIComponent(time)}`);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
       const data = await response.json();
       console.log(data);
       return data;
    } catch (error) {
      console.warn(`Error fetching ${type} data:`, error);
      return null;
    }
  };

  /*
  const updateDataLayer = async (dataType) => {
    try {
      const data = await fetchData(currentTime, dataType);

      if (!data || !data.latitude || !data.longitude || !data[dataType]) {
        throw new Error(`Invalid data structure for ${dataType}`);
      }

      const values = data[dataType].flat().filter(v => 
        (dataType === 'temperature' && v !== 0) || 
        (dataType === 'precipitation' && v !== -99)
      );
      
      if (values.length === 0) {
        throw new Error('No valid data points found after filtering');
      }

      const min = Math.min(...values);
      const max = Math.max(...values);

      const colorScale = dataType === 'temperature'
        ? [[0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 0, 0]]
        : [[255, 255, 255], [0, 255, 255], [0, 0, 255], [128, 0, 255], [255, 0, 255]];

      const overlayImage = generateOverlay(data, colorScale, min, max, dataType);

      if (!overlayImage) {
        throw new Error('Failed to generate overlay image');
      }

      setCanvasData(data[dataType]);

      // Remove existing layer and source if they exist
      removeDataLayer('temperature');
      removeDataLayer('precipitation');

      map.current.addSource(`${dataType}-source`, {
        type: 'image',
        url: overlayImage,
        coordinates: [
          [data.longitude[0], data.latitude[0]],
          [data.longitude[data.longitude.length - 1], data.latitude[0]],
          [data.longitude[data.longitude.length - 1], data.latitude[data.latitude.length - 1]],
          [data.longitude[0], data.latitude[data.latitude.length - 1]]
        ]
      });

      map.current.addLayer({
        id: `${dataType}-layer`,
        type: 'raster',
        source: `${dataType}-source`,
        paint: {
          'raster-opacity': 0.7
        }
      });

      updateLegend(dataType, min, max, colorScale);
      
      if (showValueGrid) {
        addValueGrid(data);
      }
    } catch (error) {
      console.error(`Error updating ${dataType} layer:`, error);
      setError(`Error updating ${dataType} layer: ${error.message}`);
    }
  };*/

  const updateDataLayer = async (dataType) => {
    try {
      const data = await fetchData(currentTime, dataType);
  
      if (!data || !data.latitude || !data.longitude || !data[dataType]) {
        throw new Error(`Invalid data structure for ${dataType}`);
      }
  
      const overlayImage = generateOverlay(data, dataType);
  
      if (!overlayImage) {
        throw new Error('Failed to generate overlay image');
      }
  
      setCanvasData(data[dataType]);
  
      // Remove existing layer and source if they exist
      removeDataLayer('temperature');
      removeDataLayer('precipitation');
  
      map.current.addSource(`${dataType}-source`, {
        type: 'image',
        url: overlayImage,
        coordinates: [
          [data.longitude[0], data.latitude[0]],
          [data.longitude[data.longitude.length - 1], data.latitude[0]],
          [data.longitude[data.longitude.length - 1], data.latitude[data.latitude.length - 1]],
          [data.longitude[0], data.latitude[data.latitude.length - 1]]
        ]
      });
  
      map.current.addLayer({
        id: `${dataType}-layer`,
        type: 'raster',
        source: `${dataType}-source`,
        paint: {
          'raster-opacity': 0.7
        }
      });
  
      updateLegend(dataType);
      
      if (showValueGrid) {
        addValueGrid(data);
      }
    } catch (error) {
      console.error(`Error updating ${dataType} layer:`, error);
      setError(`Error updating ${dataType} layer: ${error.message}`);
    }
  };

  const removeDataLayer = (dataType) => {
    if (map.current.getLayer(`${dataType}-layer`)) map.current.removeLayer(`${dataType}-layer`);
    if (map.current.getSource(`${dataType}-source`)) map.current.removeSource(`${dataType}-source`);
    if (map.current.getLayer('value-grid-layer')) map.current.removeLayer('value-grid-layer');
    if (map.current.getSource('value-grid-source')) map.current.removeSource('value-grid-source');
  };

  const addValueGrid = (data) => {
    if (!map.current || !data || !data[activeLayer]) return;

    const features = [];
    const values = data[activeLayer];
    const latitudes = data.latitude;
    const longitudes = data.longitude;

    // Calcula el tamaño de paso para obtener el centro de cada celda NUEVO
    const latStep = (latitudes[1] - latitudes[0]) / 2;
    const lonStep = (longitudes[1] - longitudes[0]) / 2;

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const value = values[i][j];
        if ((activeLayer === 'temperature' && value !== 0) || (activeLayer === 'precipitation' && value !== -99)) {
           // Usa el centro de la celda en lugar de las coordenadas de las esquinas
          const centerLat = latitudes[i] + latStep;
          const centerLon = longitudes[j] + lonStep;
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              //coordinates: [longitudes[j], latitudes[i]]
              coordinates: [centerLon, centerLat]
            },
            properties: {
              value: value.toFixed(1)
            }
          });
        }
      }
    }

    if (map.current.getSource('value-grid-source')) {
      map.current.getSource('value-grid-source').setData({
        type: 'FeatureCollection',
        features: features
      });
    } else {
      map.current.addSource('value-grid-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features
        }
      });

      map.current.addLayer({
        id: 'value-grid-layer',
        type: 'symbol',
        source: 'value-grid-source',
        layout: {
          'text-field': ['get', 'value'],
          'text-size': 13
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#ffffff',
          'text-halo-width': 0.05
        }
      });
    }
  };

  const toggleValueGrid = () => {
    if (map.current.getLayer('value-grid-layer')) {
      map.current.setLayoutProperty(
        'value-grid-layer',
        'visibility',
        showValueGrid ? 'visible' : 'none'
      );
    } else if (showValueGrid) {
      addValueGrid({ [activeLayer]: canvasData, latitude: map.current.getBounds()._sw.lat, longitude: map.current.getBounds()._sw.lng });
    }
  };

  /*
  const updateLegend = (dataType, min, max, colorScale) => {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;

    const gradientColors = colorScale.map((color, index) => {
      const percent = (index / (colorScale.length - 1)) * 100;
      return `rgb(${color.join(',')}) ${percent}%`;
    }).join(', ');

    legendContainer.innerHTML = `
      <h4>${dataType === 'temperature' ? '°K' : 'mm'}</h4>
      <div class="legend-gradient" style="background: linear-gradient(to top, ${gradientColors});">  
        <div class="legend-labels">
          <span>${max.toFixed(1)}</span>
          <span>${((min + max) / 2).toFixed(1)}</span>
          <span>${min.toFixed(1)}</span>
        </div>
      </div>
    `;
  };*/
  const updateLegend = (dataType) => {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;
  
    const { min, max, colorScale } = SCALES[dataType];
  
    const gradientColors = colorScale.map((color, index) => {
      const percent = (index / (colorScale.length - 1)) * 100;
      return `rgb(${color.join(',')}) ${percent}%`;
    }).join(', ');
  
    legendContainer.innerHTML = `
      <h4>${dataType === 'temperature' ? '°K' : 'mm'}</h4>
      <div class="legend-gradient" style="background: linear-gradient(to top, ${gradientColors});">  
        <div class="legend-labels">
          <span>${max.toFixed(1)}</span>
          <span>${((min + max) / 2).toFixed(1)}</span>
          <span>${min.toFixed(1)}</span>
        </div>
      </div>
    `;
  };

  /**FUNCIÓN CAMBIO DE FECHA */
  const changeTime = useCallback((direction) => {
    setCurrentTime(prevTime => {
      const date = new Date(prevTime);
      const currentIndex = validHours.indexOf(date.getHours());
      let newIndex;
      
      if (direction === 'forward') {
        newIndex = (currentIndex + 1) % validHours.length;
      } else {
        newIndex = (currentIndex - 1 + validHours.length) % validHours.length;
      }

      const newHour = validHours[newIndex];
      date.setHours(newHour);

      if (direction === 'forward' && newHour < validHours[currentIndex]) {
        date.setDate(date.getDate() + 1);
      } else if (direction === 'backward' && newHour > validHours[currentIndex]) {
        date.setDate(date.getDate() - 1);
      }

      const newTime = formatDateToString(date);
      console.log(`Tiempo cambiado de ${prevTime} a ${newTime}`);
      return newTime;
    });
  }, []);

  useEffect(() => {
    console.log("currentTime actualizado:", currentTime);
  }, [currentTime]); 

  const setLayer = (layerType) => {
    setActiveLayer(layerType);
  };

  const handleDownload = () => {
    if (canvasData) {
      const link = document.createElement('a');
      link.href = canvasData;
      link.download = `${activeLayer}_${currentTime}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const LayerControl = ({ type, icon, label }) => {
    const isActive = activeLayer === type;
    return (
      <div className={`layer-control ${isActive ? 'active' : ''}`}>
        <button 
          className="layer-button"
          onClick={() => setLayer(type)}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <div>{label}</div>
        </button>
        {isActive && (
          <div className="layer-details">
            <p>Proyección desde 2024 a 2035 {/*canvasData ? 'Disponibles' : 'No disponibles'*/}</p>
            <button onClick={handleDownload}>Descargar archivo</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="map-container">
      <div className="map-wrap">
        <div ref={mapContainer} className="map" />
        <NavBar></NavBar>
        <div id="legend" className="legend vertical"></div>
        <div className='side-bar'> 
          <div className='control-panel'>
            <h5>CONTROL DE PROYECCIONES</h5>
            <div className='panel-variable'>
              <LayerControl type="temperature" icon="thermostat" label="Temperatura" />
              <LayerControl type="precipitation" icon="rainy" label="Precipitación" />
            </div>
            <div className="value-grid-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showValueGrid}
                  onChange={() => setShowValueGrid(!showValueGrid)}
                />
                Cuadrícula de valores
              </label>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="time-controls">
            <button onClick={() => changeTime('backward')}>-3 horas</button>
            <span>{currentTime}</span>
            <button onClick={() => changeTime('forward')}>+3 horas</button>
          </div>
        </div>
      </div>
    </div>
  );
}