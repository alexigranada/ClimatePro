/*import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import Map from './components/Map';
import WeatherMap from './components/WeatherMap';
import ClimateMap from './components/ClimateMap';
import ClimateMapLibre from './components/ClimateMapLibreHora';
import MapClimate from './components/MapLibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import Panel from './components/Panel';

function App() {

    return (
      <div className="App">
        <ClimateMapLibre></ClimateMapLibre>
      </div>
    )
}

export default App */


import './App.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import ClimateMapLibre from './components/ClimateMapLibreHora';
import DescripcionPage from './paginas/descripcion';
import APIPage from './paginas/api';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';

function App() {
  return (
    <BrowserRouter basename="/ClimatePro">
      <NavBar />
      <Routes>
        {/* Aquí usamos ClimateMapLibre como "Home" */}
        <Route path="/" element={<ClimateMapLibre />} />
        <Route path="/descripcion" element={<DescripcionPage />} />
        <Route path="/api" element={<APIPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;