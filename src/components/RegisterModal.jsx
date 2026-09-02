import React from 'react';
import useStore from '../store/useStore';

export default function RegisterModal({ elapsedSeconds = 0 }) {
    const { 
        isRegisterModalOpen, setRegisterModal,
        finderLevel, setFinderLevel,
        dungeonType, setDungeonType,
        infos, currentRegion
    } = useStore();

    if (!isRegisterModalOpen) return null;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleRegister = () => {
        const history = JSON.parse(localStorage.getItem('finder_bi_history') || '[]');
        const newEntry = {
            timestamp: Date.now(),
            type: dungeonType,
            level: finderLevel,
            region: currentRegion,
            finders: infos.length,
            durationSeconds: elapsedSeconds
        };
        history.push(newEntry);
        localStorage.setItem('finder_bi_history', JSON.stringify(history));
        
        // Reset state
        useStore.getState().setInfos([]);
        useStore.getState().setDungeonType('Normal');
        setRegisterModal(false);
    };

    return (
        <>
            <div className="drawer-backdrop active" onClick={() => setRegisterModal(false)}></div>
            <div className="custom-modal-overlay visible" style={{ zIndex: 3000 }}>
                <div className="bi-dashboard-modal" style={{ width: '340px', height: 'auto', padding: '20px' }}>
                    <div className="modal-header">
                        <div className="title-area">
                            <h3 style={{ display: 'flex', alignItems: 'center', margin: 0, color: '#f8fafc', fontSize: '17px' }}>
                                <img src="imgs_finder/chest.png" alt="Baú" style={{width:'22px', marginRight:'10px'}}/> Registrar Caça
                            </h3>
                        </div>
                        <button className="close-modal-btn" onClick={() => setRegisterModal(false)}>&times;</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
                        
                        {/* Session summary */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.5)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Finders Usados</span>
                                <span style={{ color: '#fbbf24', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{infos.length}</span>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tempo Decorrido</span>
                                <span style={{ color: '#c4b5fd', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{formatTime(elapsedSeconds)}</span>
                            </div>
                        </div>

                        {/* Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: '#f8fafc', fontSize: '13px' }}>Nível do Finder</label>
                                <select className="minimap-select" style={{ width: '130px', padding: '6px' }} value={finderLevel} onChange={(e) => setFinderLevel(e.target.value)}>
                                    <option value="E">E</option>
                                    <option value="D">D</option>
                                    <option value="C">C</option>
                                    <option value="B">B</option>
                                    <option value="A">A</option>
                                    <option value="S">S</option>
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: '#f8fafc', fontSize: '13px' }}>Tipo de Dungeon</label>
                                <select className="minimap-select" style={{ width: '130px', padding: '6px' }} value={dungeonType} onChange={(e) => setDungeonType(e.target.value)}>
                                    <option value="Normal">Normal</option>
                                    <option value="Fragmento">Fragmento</option>
                                </select>
                            </div>
                        </div>

                        <button className="finish-btn" onClick={handleRegister} style={{ marginTop: '4px', width: '100%', height: '40px', fontSize: '15px' }}>
                            <img src="imgs_finder/chest.png" className="btn-chest-img" alt="Baú" /> Registrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
