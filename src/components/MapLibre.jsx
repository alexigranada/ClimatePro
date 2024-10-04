import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';

// Datos de respaldo (asumimos que tienes múltiples conjuntos de datos para diferentes tiempos)
const fallbackData = {
  "temperature": {
    "2024-08-29 18:00:00": {
      "latitude": [4.300000190734863, 4.199999809265137, 4.099999904632568, 4.0, 3.9000000953674316, 3.799999952316284, 3.700000047683716, 3.5999999046325684, 3.5, 3.4000000953674316, 3.299999952316284, 3.200000047683716, 3.0999999046325684, 3.0],
      "longitude": [-77.5999984741211, -77.5, -77.4000015258789, -77.30000305175781, -77.19999694824219, -77.0999984741211, -77.0, -76.9000015258789, -76.80000305175781, -76.69999694824219, -76.5999984741211, -76.5, -76.4000015258789, -76.30000305175781, -76.19999694824219, -76.0999984741211, -76.0],
      "temperature": [
        // ... (los datos de temperatura que proporcionaste)
      ]
    },
  },
  "precipitation": {
    "2024-08-29 18:00:00": {
      "latitude": [4.300000190734863, 4.199999809265137, 4.099999904632568, 4.0, 3.9000000953674316, 3.799999952316284, 3.700000047683716, 3.5999999046325684, 3.5, 3.4000000953674316, 3.299999952316284, 3.200000047683716, 3.0999999046325684, 3.0],
      "longitude": [-77.5999984741211, -77.5, -77.4000015258789, -77.30000305175781, -77.19999694824219, -77.0999984741211, -77.0, -76.9000015258789, -76.80000305175781, -76.69999694824219, -76.5999984741211, -76.5, -76.4000015258789, -76.30000305175781, -76.19999694824219, -76.0999984741211, -76.0],
      "precipitation": [
        // ... (datos de precipitación simulados, deberías reemplazar esto con datos reales)
      ]
    },
  }
};

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-77.0);
  const [lat] = useState(4.0);
  const [zoom] = useState(7);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState("2024-08-29 18:00:00");
  const [dataType, setDataType] = useState("temperature");
  
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
    } catch (err) {
      setError(`Error initializing map: ${err.message}`);
      return;
    }

    map.current.on('load', updateDataLayer);

  }, [API_KEY, lng, lat, zoom]);

  useEffect(() => {
    if (map.current) {
      updateDataLayer();
    }
  }, [currentTime, dataType]);

  const fetchData = async (time, type) => {
    try {
      // En un escenario real, aquí harías una solicitud a tu API con el parámetro de tiempo y tipo
      const response = await fetch(`http://localhost:8000/api/${type}?time=${time}`);
      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
       const data = await response.json();
       console.log(data);
       return data;

      // Por ahora, usamos los datos de respaldo
      return fallbackData[type][time] || fallbackData[type]["2024-08-29 18:00:00"];
    } catch (error) {
      console.warn(`Error fetching ${type} data:`, error);
      return fallbackData[type]["2024-08-29 18:00:00"];
    }
  };

  const updateDataLayer = async () => {
    const data = await fetchData(currentTime, dataType);

    if (!data || !data.latitude || !data.longitude || !data[dataType]) {
      setError(`Invalid ${dataType} data structure`);
      return;
    }

    const features = [];
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < data.latitude.length; i++) {
      for (let j = 0; j < data.longitude.length; j++) {
        if (data[dataType][i] && data[dataType][i][j]) {
          const value = data[dataType][i][j];
          minValue = Math.min(minValue, value);
          maxValue = Math.max(maxValue, value);
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [data.longitude[j], data.latitude[i]]
            },
            properties: {
              value: value
            }
          });
        }
      }
    }

    // Ajustamos los puntos de la escala de colores para la precipitación
    const precipitationRange = maxValue - minValue;
    const colorStops = dataType === 'temperature' 
      ? [
          [minValue, '#0000FF'],
          [(minValue + maxValue) / 2, '#00FF00'],
          [maxValue, '#FF0000']
        ]
      : [
          [minValue, '#FFFF00'],
          [minValue + precipitationRange * 0.25, '#00FF00'],
          [minValue + precipitationRange * 0.5, '#00FFFF'],
          [minValue + precipitationRange * 0.75, '#0000FF'],
          [maxValue, '#FF00FF']
        ];

    if (map.current.getSource('data')) {
      map.current.getSource('data').setData({
        type: 'FeatureCollection',
        features: features
      });
      
      // Actualizamos la escala de colores
      map.current.setPaintProperty('data-layer', 'circle-color', [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        ...colorStops.flat()
      ]);
    } else {
      map.current.addSource('data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features
        }
      });

      map.current.addLayer({
        id: 'data-layer',
        type: 'circle',
        source: 'data',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            ...colorStops.flat()
          ]
        }
      });
    }

    // Actualizar la leyenda con los nuevos valores
    updateLegend(minValue, maxValue, colorStops);
  };

  const updateLegend = (minValue, maxValue, colorStops) => {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';
    const title = document.createElement('h4');
    title.textContent = dataType === 'temperature' ? 'Temperatura (K)' : 'Precipitación (mm)';
    legendContainer.appendChild(title);

    const gradient = document.createElement('div');
    gradient.style.background = `linear-gradient(to right, ${colorStops.map(stop => stop[1]).join(', ')})`;
    gradient.style.height = '20px';
    gradient.style.width = '100%';
    legendContainer.appendChild(gradient);

    const labels = document.createElement('div');
    labels.style.display = 'flex';
    labels.style.justifyContent = 'space-between';
    labels.innerHTML = colorStops.map(stop => `<span>${stop[0].toFixed(1)}</span>`).join('');
    legendContainer.appendChild(labels);
  };

  const changeTime = (hours) => {
    const date = new Date(currentTime);
    date.setHours(date.getHours() + hours);
    setCurrentTime(date.toISOString().slice(0, 19).replace('T', ' '));
  };

  const toggleDataType = () => {
    setDataType(prevType => prevType === 'temperature' ? 'precipitation' : 'temperature');
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="map-container">
      <div className="controls">
        <div className="time-controls">
          <button onClick={() => changeTime(-3)}>-3 horas</button>
          <span>{currentTime}</span>
          <button onClick={() => changeTime(3)}>+3 horas</button>
        </div>
        <button onClick={toggleDataType}>
          Mostrar {dataType === 'temperature' ? 'Precipitación' : 'Temperatura'}
        </button>
      </div>
      <div className="map-wrap">
        <div ref={mapContainer} className="map" />
        <div id="legend" className="legend"></div>
      </div>
    </div>
  );
}