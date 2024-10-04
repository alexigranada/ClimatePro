import React, { useState } from 'react';
//import { Wind, Thermometer, Droplet, MapPin, Activity, Star, Tag, Grid } from 'lucide-react';
//import './Panel.css';

const Panel = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [dataType, setDataType] = useState("temperature");
  
  const [points, setPoints] = useState({
    spots: false,
    weatherStations: false,
    favorites: false,
    labels: false,
  });

  const toggleLayer = (layer) => {
    if (activeLayer === layer) {
      setActiveLayer(null);
      setShowGrid(false);
    } else {
      setActiveLayer(layer);
      setShowGrid(false);
    }
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  const togglePoint = (point) => {
    setPoints(prev => ({ ...prev, [point]: !prev[point] }));
  };

  const toggleDataType = () => {
    setDataType(prevType => prevType === 'temperature' ? 'precipitation' : 'temperature');
  };

  const renderLayerButton = (layer, icon, text) => (
    <div className="layer-button-container">
      <button
        className={`layer-button ${activeLayer === layer ? 'active' : ''}`}
        onClick={() => toggleLayer(layer)}
      >
        <span className="button-content">{icon} {text}</span>
      </button>
      {activeLayer === layer && (
        <div className="grid-option">
          <button
            className={`grid-button ${showGrid ? 'active' : ''}`}
            onClick={toggleGrid}
          >
            <span className="button-content"> Cuadrícula de valores</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="weather-layers-panel">
      <h2 className="panel-title">Capas de predicción</h2>
      <div className="layers-container">
        {/*{renderLayerButton('windSpeed', 'Velocidad del viento')}*/}
        {renderLayerButton('temperature',
                          <span class="material-symbols-outlined">thermostat</span>, 
                          'Temperatura')}
        {renderLayerButton('precipitation',
                          <span class="material-symbols-outlined">rainy</span>,
                          'Precipitación / 3h')}
      </div>

      <h2 className="panel-title">Puntos de interés</h2>
      <div className="points-container">
        <button
          className={`point-button ${points.spots ? 'active' : ''}`}
          onClick={() => togglePoint('spots')}
        >
          <span className="button-content"> Mostrar spots</span>
        </button>
        <button
          className={`point-button ${points.weatherStations ? 'active' : ''}`}
          onClick={() => togglePoint('weatherStations')}
        >
          <span className="button-content"> Estaciones meteorológicas</span>
        </button>
        <button
          className={`point-button ${points.favorites ? 'active' : ''}`}
          onClick={() => togglePoint('favorites')}
        >
          <span className="button-content"> Mostrar favoritos</span>
        </button>
        <button
          className={`point-button ${points.labels ? 'active' : ''}`}
          onClick={() => togglePoint('labels')}
        >
          <span className="button-content"> Mostrar etiquetas</span>
        </button>
      </div>
    </div>
  );
};

export default Panel;