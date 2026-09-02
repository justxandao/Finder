import React, { useEffect } from 'react';
import useStore from './store/useStore';
import MapView from './components/MapView';
import RightSidebar from './components/RightSidebar';
import LeftSidebar from './components/LeftSidebar';
import SettingsDrawer from './components/SettingsDrawer';
import PlacesDrawer from './components/PlacesDrawer';
import BiDashboard from './components/BiDashboard';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const { curFloor, showCoordsSetting, setSettingsDrawer, setBiDashboard, setPlacesDrawer, toggleSidebar } = useStore();

  useEffect(() => {
    fetch('/locations.json')
      .then(res => res.json())
      .then(data => useStore.getState().setLocations(data))
      .catch(err => console.error("Erro locations.json:", err));

    fetch('/spawns.json')
      .then(res => res.json())
      .then(data => {
        const spawns = { kanto: [], johto: [] };
        for (const pokemonName in data) {
          const pokemonData = data[pokemonName];
          ['kanto', 'johto'].forEach(region => {
            const regionCap = region.charAt(0).toUpperCase() + region.slice(1);
            const locs = (pokemonData.locations_raw && (pokemonData.locations_raw[regionCap] || pokemonData.locations_raw[region])) ||
                         (pokemonData.spawns && Array.isArray(pokemonData.spawns[regionCap]) && pokemonData.spawns[regionCap]) ||
                         (pokemonData.spawns && Array.isArray(pokemonData.spawns[region]) && pokemonData.spawns[region]);
            if (locs && Array.isArray(locs)) {
              locs.forEach(c => spawns[region].push({ x: c[0], y: c[1], z: c[2], pokemon: pokemonName }));
            }
          });
        }
        useStore.getState().setSpawns(spawns);
      })
      .catch(err => console.error("Erro spawns.json:", err));
  }, []);

  return (
    <div id="app-container" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      <div id="toast-container" className="toast-container"></div>
      
      <button className="minimap-btn" data-tooltip="Configurações" onClick={() => setSettingsDrawer(true)} style={{ position: 'absolute', top: 15, left: 10, zIndex: 1000 }}><i className="fa-solid fa-gear"></i></button>
      <button className="minimap-btn" data-tooltip="Mostrar/Esconder Lista" onClick={toggleSidebar} style={{ position: 'absolute', top: 15, left: 55, zIndex: 1000 }}><i className="fa-solid fa-list-ul"></i></button>
      <button className="minimap-btn" data-tooltip="Painel de Estatísticas" onClick={() => setBiDashboard(true)} style={{ position: 'absolute', top: 15, left: 100, zIndex: 1000 }}><i className="fa-solid fa-chart-pie"></i></button>
      <button className="minimap-btn" data-tooltip="Atalhos Rápidos" onClick={() => setPlacesDrawer(true)} style={{ position: 'absolute', top: 15, left: 145, zIndex: 1000 }}><i className="fa-solid fa-map-location-dot"></i></button>
      
      {showCoordsSetting && (
        <div id="coords-display" className="minimap-coords" style={{ left: 190 }}>
          {`(X, Y, ${curFloor})`}
        </div>
      )}

      <MapView />
      <RightSidebar />
      <LeftSidebar />
      <SettingsDrawer />
      <PlacesDrawer />
      <BiDashboard />
    </div>
  );
}

export default App;
