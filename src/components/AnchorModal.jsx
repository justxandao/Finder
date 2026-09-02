import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';

export default function AnchorModal() {
    const { 
        isAnchorModalOpen, setAnchorModal, 
        homePoints, setHomePoints,
        isHomeToggleActive, toggleSetting, curFloor
    } = useStore();

    const [inputX, setInputX] = useState('');
    const [inputY, setInputY] = useState('');
    const [inputZ, setInputZ] = useState('');

    useEffect(() => {
        if (isAnchorModalOpen) {
            if (homePoints && homePoints.length > 0) {
                setInputX(homePoints[0].x.toString());
                setInputY(homePoints[0].y.toString());
                setInputZ(homePoints[0].z.toString());
            } else {
                setInputZ(curFloor.toString());
            }
        }
    }, [isAnchorModalOpen, homePoints, curFloor]);

    if (!isAnchorModalOpen) return null;

    const handleSave = () => {
        const x = parseInt(inputX, 10);
        const y = parseInt(inputY, 10);
        const z = parseInt(inputZ, 10);

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            alert("As coordenadas devem ser numéricas!");
            return;
        }

        setHomePoints([{ x, y, z }]);
        toggleSetting('finderHomeToggle', true);
        setAnchorModal(false);
    };

    const handleClear = () => {
        setHomePoints([]);
        toggleSetting('finderHomeToggle', false);
        setAnchorModal(false);
    };

    return (
        <>
            <div className="drawer-backdrop active" onClick={() => setAnchorModal(false)}></div>
            <div className="custom-modal-overlay visible" style={{ zIndex: 3000 }}>
                <div className="custom-modal" style={{ width: '280px', gap: '20px' }}>
                    <div className="modal-header" style={{ marginBottom: 0 }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-anchor" style={{ color: '#38bdf8' }}></i> Retorno Fixo (Âncora)
                        </h3>
                        <button className="close-modal-btn" onClick={() => setAnchorModal(false)}>&times;</button>
                    </div>

                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Defina uma coordenada base. Ao usar este recurso, o finder fará os cálculos assumindo que você retorna para esta coordenada após cada encontro.
                    </p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>X</label>
                            <input type="number" value={inputX} onChange={e => setInputX(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Y</label>
                            <input type="number" value={inputY} onChange={e => setInputY(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Z</label>
                            <input type="number" value={inputZ} onChange={e => setInputZ(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Status: </span>
                        <div className="home-toggle" style={{ display: 'flex', alignItems: 'center', transform: 'scale(0.9)', transformOrigin: 'left center' }}>
                            <input type="checkbox" id="modal-home-toggle" style={{ display: 'none' }} checked={isHomeToggleActive} onChange={(e) => toggleSetting('finderHomeToggle', e.target.checked)} />
                            <label htmlFor="modal-home-toggle" data-tooltip="Ligar/Desligar"><i className="fa-solid fa-anchor"></i></label>
                        </div>
                        <span style={{ fontSize: '12px', color: isHomeToggleActive ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                            {isHomeToggleActive ? 'Ativado' : 'Desativado'}
                        </span>
                    </div>

                    <div className="custom-modal-buttons">
                        <button className="modal-btn cancel" onClick={handleClear} style={{ fontSize: '12px' }}>Limpar</button>
                        <button className="modal-btn confirm" onClick={handleSave} style={{ fontSize: '12px' }}>Salvar</button>
                    </div>
                </div>
            </div>
        </>
    );
}
