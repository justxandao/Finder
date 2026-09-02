import React, { useEffect, useState, useRef } from 'react';
import useStore from './store/useStore';
import MapView from './components/MapView';
import RightSidebar from './components/RightSidebar';
import LeftSidebar from './components/LeftSidebar';
import SettingsDrawer from './components/SettingsDrawer';
import BiDashboard from './components/BiDashboard';
import RegisterModal from './components/RegisterModal';
import AnchorModal from './components/AnchorModal';
import Login from './components/Login';
import PlacesDrawer from './components/PlacesDrawer';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Use ipcRenderer from Electron (available via nodeIntegration)
let ipcRenderer = null;
try {
  const { ipcRenderer: ipc } = window.require('electron');
  ipcRenderer = ipc;
} catch (e) {
  // Running in browser / dev outside electron
}

// Resolve base path for JSON files (file:// in production, / in dev)
function getBasePath() {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // In packaged Electron, __dirname of dist/index.html is dist/
    const url = new URL(window.location.href);
    return url.href.replace(/index\.html.*$/, '');
  }
  return '/';
}

function App() {
  const { 
    session, setSession, curFloor, showCoordsSetting, setSettingsDrawer, setBiDashboard, setPlacesDrawer, toggleSidebar,
    currentRegion, setRegion, isHomeToggleActive, toggleSetting, infos, curCoords, setAnchorModal
  } = useStore();
  const [initializing, setInitializing] = useState(true);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  // Timer state — tracks elapsed time since first finder in this session
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Start/reset timer when infos changes
  useEffect(() => {
    if (infos.length === 1 && !timerRef.current) {
      // First item added — start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    if (infos.length === 0) {
      // Cleared — reset
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsed(0);
      startTimeRef.current = null;
    }
  }, [infos.length]);

  // Expose elapsed + startTime to store for RegisterModal to use
  useEffect(() => {
    useStore.getState()._elapsedSeconds = elapsed;
  }, [elapsed]);

  useEffect(() => {
    // Bypass login
    setSession({ user: { id: 'dev-mode' } });
    setInitializing(false);
  }, [setSession]);

  useEffect(() => {
    if (!session) return;
    
    const base = getBasePath();

    fetch(`${base}locations.json`)
      .then(res => res.json())
      .then(data => useStore.getState().setLocations(data))
      .catch(err => console.error("Erro locations.json:", err));

    fetch(`${base}spawns.json`)
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

  const handleAlwaysOnTop = () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    if (ipcRenderer) ipcRenderer.send('toggle-always-on-top', next);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (initializing) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Carregando...</div>;

  if (!session) {
    return <Login />;
  }

  return (
    <div id="app-container" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      <div id="toast-container" className="toast-container"></div>
      
      {/* Top-left toolbar */}
      <button className="minimap-btn" data-tooltip="Configurações" onClick={() => setSettingsDrawer(true)} style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}><i className="fa-solid fa-gear"></i></button>
      <button className="minimap-btn" data-tooltip="Mostrar/Esconder Lista" onClick={toggleSidebar} style={{ position: 'absolute', top: 10, left: 45, zIndex: 1000 }}><i className="fa-solid fa-list-ul"></i></button>
      <button className="minimap-btn" data-tooltip="Painel de Estatísticas" onClick={() => setBiDashboard(true)} style={{ position: 'absolute', top: 10, left: 80, zIndex: 1000 }}><i className="fa-solid fa-chart-pie"></i></button>
      <button className="minimap-btn" data-tooltip="Atalhos Rápidos" onClick={() => setPlacesDrawer(true)} style={{ position: 'absolute', top: 10, left: 115, zIndex: 1000 }}><i className="fa-solid fa-map-location-dot"></i></button>
      
      {/* Top center: region + anchor + always-on-top + session stats */}
      <div className="top-center-panel" style={{ position: 'absolute', top: 10, left: 160, zIndex: 1000, display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)' }}>
          <select className="minimap-select" style={{ minWidth: '90px' }} value={currentRegion} onChange={(e) => setRegion(e.target.value)}>
              <option value="kanto">Kanto</option>
              <option value="johto">Johto</option>
          </select>
          <button
            onClick={() => setAnchorModal(true)}
            data-tooltip="Configurar Âncora (Retorno Fixo)"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px', padding: '2px 6px', cursor: 'pointer',
              color: isHomeToggleActive ? '#38bdf8' : '#94a3b8',
              fontSize: '13px', transition: 'color 0.2s'
            }}
          >
            <i className="fa-solid fa-anchor"></i>
          </button>

          {/* Always-on-top toggle — icon only, no box */}
          <button
            onClick={handleAlwaysOnTop}
            data-tooltip={alwaysOnTop ? 'Desativar Sempre no Topo' : 'Sempre no Topo'}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px', padding: '2px 6px', cursor: 'pointer',
              color: alwaysOnTop ? '#38bdf8' : '#94a3b8',
              fontSize: '13px', transition: 'color 0.2s'
            }}
          >
            <i className="fa-solid fa-thumbtack"></i>
          </button>

          {/* Session stats: finders count + timer */}
          {infos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: '#f59e0b' }}></i>
                <strong style={{ color: '#fbbf24' }}>{infos.length}</strong>
              </span>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-clock" style={{ color: '#a78bfa' }}></i>
                <strong style={{ color: '#c4b5fd' }}>{formatTime(elapsed)}</strong>
              </span>
            </div>
          )}
      </div>
      
      {showCoordsSetting && (
        <div id="coords-display" className="minimap-coords" style={{ left: 15, top: 45 }}>
          {`${curCoords.x}, ${curCoords.y}, ${curFloor}`}
        </div>
      )}

      <MapView />
      <RightSidebar elapsedSeconds={elapsed} />
      <LeftSidebar />
      <SettingsDrawer />
      <PlacesDrawer />
      <BiDashboard />
      <RegisterModal elapsedSeconds={elapsed} />
      <AnchorModal />
    </div>
  );
}

export default App;
