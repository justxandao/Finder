import React from 'react';
import useStore from '../store/useStore';

export default function RegisterModal() {
    const { 
        isRegisterModalOpen, setRegisterModal,
        finderLevel, setFinderLevel,
        dungeonType, setDungeonType,
        infos, currentRegion
    } = useStore();

    if (!isRegisterModalOpen) return null;

    const handleRegister = () => {
        const history = JSON.parse(localStorage.getItem('finder_bi_history') || '[]');
        const newEntry = {
            timestamp: Date.now(),
            type: dungeonType,
            level: finderLevel,
            region: currentRegion,
            finders: infos.length,
            durationSeconds: 0 // TODO: tracker time
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
                <div className="bi-dashboard-modal" style={{ width: '350px', height: 'auto', padding: '20px' }}>
                    <div className="modal-header">
                        <div className="title-area">
                            <h3 style={{ display: 'flex', alignItems: 'center', margin: 0, color: '#f8fafc', fontSize: '18px' }}>
                                <img src="imgs_finder/chest.png" alt="Baú" style={{width:'24px', marginRight:'10px'}}/> Registrar Caça
                            </h3>
                        </div>
                        <button className="close-modal-btn" onClick={() => setRegisterModal(false)}>&times;</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.5)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Finders Usados</span>
                                <span style={{ color: '#38bdf8', fontSize: '24px', fontWeight: 'bold' }}>{infos.length}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tempo Decorrido</span>
                                <span style={{ color: '#38bdf8', fontSize: '24px', fontWeight: 'bold' }}>00:00</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

                        <button className="finish-btn" onClick={handleRegister} style={{ marginTop: '10px', width: '100%', height: '40px', fontSize: '16px' }}>
                            Confirmar Registro
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
