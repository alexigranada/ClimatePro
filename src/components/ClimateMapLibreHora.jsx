import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import NavBar from './NavBar';

//Puntos de las estaciones
const puntos = [
  { nombre: "Unipacifico", coordenadas: [-76.9869, 3.8480] },
  { nombre: "La Cumbre", coordenadas: [-76.5647, 3.6451] },
  { nombre: "Farallones", coordenadas: [-76.6513, 3.4158] },
  { nombre: "La Diana", coordenadas: [-76.1855, 3.3138] },
  { nombre: "Siloe", coordenadas: [-76.5605, 3.4252] },
  { nombre: "Univalle", coordenadas: [-76.5338, 3.3777] },
  { nombre: "Aeropuerto", coordenadas: [-76.3822, 3.5327] }
];

// Define fixed scales and ranges for temperature and precipitation
const SCALES = {
  temperature: {
    min: 7, // 0°C in Kelvin 273.15
    max: 28, // 40°C in Kelvin - 5 313.15
    colorScale: [[0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 0, 0]]
  },
  precipitation: {
    min: 0,
    max: 0.0001, // 100mm as maximum precipitation
    colorScale: [[255, 255, 255], [0, 255, 255], [0, 0, 255], [128, 0, 255], [255, 0, 255]]
  }
};

const DATA_SOURCES = {
    temperature: [
      { id: 'temp1', name: 'Temperatura SSP 1.19', endpoint: 'http://localhost:8000/api/temperature/' },
      { id: 'temp2', name: 'Temperatura SSP 2.45', endpoint: 'http://localhost:8000/api/temperature/?file=ssp245' },
      { id: 'temp3', name: 'Temperatura SSP 3.70', endpoint: 'http://localhost:8000/api/temperature/?file=ssp370' },
    ],
    precipitation: [
      { id: 'precip1', name: 'Precipitación SSP 1.19', endpoint: 'http://localhost:8000/api/precipitation' },
      { id: 'precip2', name: 'Precipitación SSP 2.45', endpoint: 'http://localhost:8000/api/precipitation/?file=ssp245' },
      { id: 'precip3', name: 'Precipitación SSP 3.70', endpoint: 'http://localhost:8000/api/precipitation/?file=ssp370' },
    ]
  };

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
        ctx.fillRect(lonIndex, latIndex, 1.5, 1.5);
      }
    });
  });

  return canvas.toDataURL();
};

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-77.28);
  const [lat] = useState(3.65);
  const [zoom] = useState(8.94);
  const [error, setError] = useState(null);
  const [activeLayer, setActiveLayer] = useState('temperature');
  const [canvasData, setCanvasData] = useState(null);
  const [showValueGrid, setShowValueGrid] = useState(true);
  const [expandedLayer, setExpandedLayer] = useState(null);
  const [activeSource, setActiveSource] = useState({
    temperature: DATA_SOURCES.temperature[0].id,
    precipitation: DATA_SOURCES.precipitation[0].id
  });

  // Modificamos la lógica de las horas válidas para incluir todas las horas
  const validHours = Array.from({length: 24}, (_, i) => i);

  const getNextValidHour = (currentHour) => {
    return (currentHour + 1) % 24;
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
    now.setMinutes(0, 0, 0); // Redondeamos a la hora actual
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

    /**GEOJSON VALLE */
    map.current.on('load', () => {
      map.current.addSource('Valle-geojson', {
        type: 'geojson',
        data: 'Data/Valle_Cauca_4326.geojson' // O un objeto GeoJSON inline
      });
  
      map.current.addLayer({
        id: 'miValle-geojson',
        type: 'line', //fill O 'line', 'circle', etc., dependiendo de tu GeoJSON
        source: 'Valle-geojson',
        paint: {
          'line-color': '#606060',
          'line-width': 1.5
        }
      });
    });

    /**GEOJSON Dagua */
    map.current.on('load', () => {
      map.current.addSource('Dagua-geojson', {
        type: 'geojson',
        data: 'Data/Cuenca_Dagua_4326.geojson' // O un objeto GeoJSON inline
      });
  
      map.current.addLayer({
        id: 'miDagua-geojson',
        type: 'line', //fill O 'line', 'circle', etc., dependiendo de tu GeoJSON
        source: 'Dagua-geojson',
        paint: {
          'line-color': '#404040',
          'line-width': 1
        }
      });
    });
    /**AÑADIR CAPA DE PUNTOS */
    // Añadir los puntos al mapa
    puntos.forEach((punto) => {
      // Crear un elemento div para el marcador
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = 'red';
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '50%';

      // Crear el popup
      const popup = new maplibregl.Popup({ offset: 25 })
        .setText(punto.nombre);

      // Crear y añadir el marcador
      new maplibregl.Marker(el)
        .setLngLat(punto.coordenadas)
        .setPopup(popup) // Establecer el popup
        .addTo(map.current);
    });

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
      const source = DATA_SOURCES[type].find(s => s.id === activeSource[type]);
      const response = await fetch(`${source.endpoint}?time=${encodeURIComponent(time)}`);
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
          'raster-opacity': 0.6
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

  /*const setLayer = (layerType) => {
    setActiveLayer(layerType);
  };

  const setSource = (layerType, sourceId) => {
    setActiveSource(prev => ({ ...prev, [layerType]: sourceId }));
    updateDataLayer(layerType);
  };*/

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

  const updateLegend = (dataType) => {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;
  
    const { min, max, colorScale } = SCALES[dataType];
  
    const gradientColors = colorScale.map((color, index) => {
      const percent = (index / (colorScale.length - 1)) * 100;
      return `rgb(${color.join(',')}) ${percent}%`;
    }).join(', ');
  
    legendContainer.innerHTML = `
      <h4>${dataType === 'temperature' ? '°C' : 'mm'}</h4>
      <div class="legend-gradient" style="background: linear-gradient(to top, ${gradientColors});">  
        <div class="legend-labels">
          <span>${max.toFixed(1)}</span>
          <span>${((min + max) / 2).toFixed(1)}</span>
          <span>${min.toFixed(1)}</span>
        </div>
      </div>
    `;
  };
  /**AÑADIENDO GEOJSON */

  /**FUNCIÓN CAMBIO DE HORA */
  const changeTime = useCallback((direction) => {
    setCurrentTime(prevTime => {
      const date = new Date(prevTime);
      if (direction === 'forward') {
        date.setHours(date.getHours() + 1);
      } else {
        date.setHours(date.getHours() - 1);
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
    if (expandedLayer === layerType) {
      setExpandedLayer(null);
    } else {
      setExpandedLayer(layerType);
      setActiveLayer(layerType);
    }
  };
  /*
  const setLayer = (layerType) => {
    setActiveLayer(layerType);
  };*/

  const setSource = (layerType, sourceId) => {
    setActiveSource(prev => ({ ...prev, [layerType]: sourceId }));
    updateDataLayer(layerType);
  };

  const handleDownload = async () => {
    try {
      const activeLayerType = activeLayer; // 'temperature' o 'precipitation'
      const activeSourceId = activeSource[activeLayerType];
      const activeSourceData = DATA_SOURCES[activeLayerType].find(source => source.id === activeSourceId);

      if (!activeSourceData) {
        throw new Error('No se encontró la fuente de datos activa');
      }

      const response = await fetch(`${activeSourceData.endpoint}?time=${encodeURIComponent(currentTime)}&download=nc`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeLayerType}_${activeSourceData.name}_${currentTime}.nc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const LayerControl = ({ type, icon, label }) => {
    const isExpanded = expandedLayer === type;
    return (
      <div className={`layer-control ${isExpanded ? 'expanded' : ''}`}>
        <button 
          className={`layer-button ${isExpanded ? 'active' : ''}`}
          onClick={() => setLayer(type)}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <h2>{label}</h2>
        </button>
        {isExpanded && (
          <div className="layer-details">
            <p>Escenarios:</p>
            <div className="source-buttons">
              {DATA_SOURCES[type].map(source => (
                <label key={source.id} className="toggle-switch">
                  <input
                    type="radio"
                    name={`${type}-source`}
                    checked={activeSource[type] === source.id}
                    onChange={() => setSource(type, source.id)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">{source.name}</span>
                </label>
              ))}
            </div>
            <p>Proyección desde 2024 a 2035</p>
            <button className='download-button' onClick={handleDownload}>
              <div className='download'>
              <p>Descargar archivo</p>
              <span className="material-symbols-outlined">download</span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };  

  // Función para formatear la fecha
  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    const dateFormatted = date.toLocaleDateString('es-ES', options).toLowerCase();
    const timeFormatted = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted} ${timeFormatted}`;
  };


  return (
    <div className="map-container">
      <div className="map-wrap">
        <div ref={mapContainer} className="map" />
        <NavBar></NavBar>
        <div id="legend" className="legend vertical"></div>

        {/**SIDEBAR */}
        <div className='side-bar'> 
        <div className='control-panel'>
          <h5>CONTROL DE PROYECCIONES CLIMÁTICAS</h5>
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
        <button className="time-button" onClick={() => changeTime('backward')}>-1h</button>
        <div className="current-time">
          <span>{formatDateTime(currentTime)}</span>
        </div>
        <button className="time-button" onClick={() => changeTime('forward')}>+1h</button>
        </div>
        </div>
      </div>
    </div>
  );
}