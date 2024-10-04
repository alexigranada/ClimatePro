import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Map from './components/Map'
import WeatherMap from './components/WeatherMap'
import ClimateMap from './components/ClimateMap'
import ClimateMapLibre from './components/ClimateMapLibreHora'
import MapClimate from './components/MapLibre'
import 'maplibre-gl/dist/maplibre-gl.css';
import Panel from './components/Panel'

function App() {

    return (
      <div className="App">
        <ClimateMapLibre></ClimateMapLibre>
      </div>
    )
}

export default App
