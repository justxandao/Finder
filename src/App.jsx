import React, { useEffect, useState } from 'react';
import useStore from './store/useStore';
import MapView from './components/MapView';
import RightSidebar from './components/RightSidebar';
import LeftSidebar from './components/LeftSidebar';
import SettingsDrawer from './components/SettingsDrawer';
import BiDashboard from './components/BiDashboard';
import RegisterModal from './components/RegisterModal';
import Login from './components/Login';
import PlacesDrawer from './components/PlacesDrawer';
import { supabase } from './supabaseClient';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const { 
    session, setSession, curFloor, showCoordsSetting, setSettingsDrawer, setBiDashboard, setPlacesDrawer, toggleSidebar,
    currentRegion, setRegion, isHomeToggleActive, toggleSetting, infos
  } = useStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Carregar sessão inicial (Login desativado temporariamente)
    setSession({ user: { id: 'dev-mode' } });
    setInitializing(false);

    // No need to unsubscribe since auth listener is removed
  }, [setSession]);

  useEffect(() => {
    if (!session) return; // Só carrega se estiver logado
    
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
  }, [session]);

  if (initializing) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Carregando...</div>;

  if (!session) {
    return <Login />;
  }

  return (
    <div id="app-container" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      <div id="toast-container" className="toast-container"></div>
      
      <button className="minimap-btn" data-tooltip="Configurações" onClick={() => setSettingsDrawer(true)} style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}><i className="fa-solid fa-gear"></i></button>
      <button className="minimap-btn" data-tooltip="Mostrar/Esconder Lista" onClick={toggleSidebar} style={{ position: 'absolute', top: 10, left: 45, zIndex: 1000 }}><i className="fa-solid fa-list-ul"></i></button>
      <button className="minimap-btn" data-tooltip="Painel de Estatísticas" onClick={() => setBiDashboard(true)} style={{ position: 'absolute', top: 10, left: 80, zIndex: 1000 }}><i className="fa-solid fa-chart-pie"></i></button>
      <button className="minimap-btn" data-tooltip="Atalhos Rápidos" onClick={() => setPlacesDrawer(true)} style={{ position: 'absolute', top: 10, left: 115, zIndex: 1000 }}><i className="fa-solid fa-map-location-dot"></i></button>
      
      <div className="top-center-panel" style={{ position: 'absolute', top: 10, left: 160, zIndex: 1000, display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}>
          <select className="minimap-select" style={{ minWidth: '90px' }} value={currentRegion} onChange={(e) => setRegion(e.target.value)}>
              <option value="kanto">Kanto</option>
              <option value="johto">Johto</option>
          </select>
          <div className="home-toggle" style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" id="home-toggle-checkbox" style={{ display: 'none' }} checked={isHomeToggleActive} onChange={(e) => toggleSetting('isHomeToggleActive', e.target.checked)} />
              <label htmlFor="home-toggle-checkbox" data-tooltip="Ativar Retorno Fixo"><i className="fa-solid fa-anchor"></i></label>
          </div>
      </div>
      
      {showCoordsSetting && (
        <div id="coords-display" className="minimap-coords" style={{ left: 15, top: 45 }}>
          {`(X, Y, ${curFloor})`}
        </div>
      )}

      <MapView />
      <RightSidebar />
      <LeftSidebar />
      <SettingsDrawer />
      <PlacesDrawer />
      <BiDashboard />
      <RegisterModal />
    </div>
  );
}

export default App;
