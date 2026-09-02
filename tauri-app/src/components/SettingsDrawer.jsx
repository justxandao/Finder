import React from 'react';
import useStore from '../store/useStore';

export default function SettingsDrawer() {
    const { 
        isSettingsDrawerOpen, setSettingsDrawer,
        showMapLocations, toggleSetting,
        labelsOpacitySetting, labelScopeSetting,
        showCoordsSetting, showSpawnsSetting, isHomeToggleActive
    } = useStore();

    if (!isSettingsDrawerOpen) return null;

    return (
        <>
            <div id="drawer-backdrop" className="drawer-backdrop active" onClick={() => setSettingsDrawer(false)}></div>
            <div id="settings-drawer" className="side-drawer left-drawer active">
                <div className="drawer-header">
                    <h3><i className="fa-solid fa-gear"></i> Configurações</h3>
                    <button className="drawer-close-btn" onClick={() => setSettingsDrawer(false)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="settings-content">
                    <div className="settings-group">
                        <div className="settings-group-title"><i className="fa-solid fa-font"></i> Nomes de Cidades & Ilhas</div>
                        
                        <div className="setting-item">
                            <div className="setting-info">
                                <span className="setting-label">Exibir Nomes no Mapa</span>
                                <span className="setting-desc">Mostrar cidades e ilhas no minimapa</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={showMapLocations} onChange={(e) => toggleSetting('showMapLocations', e.target.checked)} />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="setting-item slider-setting">
                            <div className="setting-info">
                                <span className="setting-label">Opacidade dos Nomes</span>
                                <span className="setting-desc">{labelsOpacitySetting}%</span>
                            </div>
                            <input type="range" min="20" max="100" value={labelsOpacitySetting} onChange={(e) => toggleSetting('labelsOpacitySetting', parseInt(e.target.value))} />
                        </div>

                        <div className="setting-item">
                            <div className="setting-info">
                                <span className="setting-label">Filtrar Exibição</span>
                                <span className="setting-desc">O que exibir no mapa</span>
                            </div>
                            <select className="minimap-select compact-select" value={labelScopeSetting} onChange={(e) => toggleSetting('labelScopeSetting', e.target.value)}>
                                <option value="both">Cidades & Ilhas</option>
                                <option value="cities">Apenas Cidades</option>
                            </select>
                        </div>
                    </div>

                    <div className="settings-group">
                        <div className="settings-group-title"><i className="fa-solid fa-sliders"></i> Interface & Mapa</div>
                        
                        <div className="setting-item">
                            <div className="setting-info">
                                <span className="setting-label">Coordenadas no Cursor</span>
                                <span className="setting-desc">Exibir X, Y, Z no topo</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={showCoordsSetting} onChange={(e) => toggleSetting('showCoordsSetting', e.target.checked)} />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        <div className="setting-item">
                            <div className="setting-info">
                                <span className="setting-label">Spawns Automáticos</span>
                                <span className="setting-desc">Mostrar ícones na área do radar</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={showSpawnsSetting} onChange={(e) => toggleSetting('showSpawnsSetting', e.target.checked)} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <div className="settings-footer">
                        <button className="action-btn restore-defaults-btn">
                            <i className="fa-solid fa-arrow-rotate-left"></i> Restaurar Padrões
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
