import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { useToast } from './Toast';

export default function AnchorModal() {
    const showToast = useToast();
    const { 
        isAnchorModalOpen, setAnchorModal, 
        homePoints, setHomePoints,
        isHomeToggleActive, toggleSetting, curFloor
    } = useStore();

    const [coordsInput, setCoordsInput] = useState('');

    useEffect(() => {
        if (isAnchorModalOpen) {
            if (homePoints && homePoints.length > 0) {
                setCoordsInput(`${homePoints[0].x}, ${homePoints[0].y}, ${homePoints[0].z}`);
            } else {
                setCoordsInput(`0, 0, ${curFloor}`);
            }
        }
    }, [isAnchorModalOpen, homePoints, curFloor]);

    if (!isAnchorModalOpen) return null;

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setCoordsInput(text);
            showToast("Coordenadas coladas!", "success");
        } catch (err) {
            showToast("Não foi possível colar da área de transferência.", "error");
        }
    };

    const handleSave = () => {
        const parts = coordsInput.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (parts.length < 2) {
            showToast("Formato inválido. Use: X, Y, Z", "error");
            return;
        }
        
        const x = parts[0];
        const y = parts[1];
        const z = parts[2] !== undefined ? parts[2] : curFloor;

        setHomePoints([{ x, y, z }]);
        toggleSetting('finderHomeToggle', true);
        setAnchorModal(false);
        showToast("Âncora salva com sucesso!", "success");
    };

    const handleCancel = () => {
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

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Coordenadas (X, Y, Z)</label>
                            <input 
                                type="text" 
                                value={coordsInput} 
                                onChange={e => setCoordsInput(e.target.value)} 
                                style={{ width: '100%', boxSizing: 'border-box', height: '32px' }} 
                                placeholder="123, 456, 7" 
                            />
                        </div>
                        <button 
                            onClick={handlePaste} 
                            style={{ 
                                height: '32px', padding: '0 12px', background: 'rgba(56, 189, 248, 0.15)', 
                                border: '1px solid rgba(56,189,248,0.4)', borderRadius: '6px', 
                                color: '#38bdf8', cursor: 'pointer', fontSize: '13px' 
                            }}
                            data-tooltip="Colar da área de transferência"
                        >
                            <i className="fa-solid fa-paste"></i>
                        </button>
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
                        <button className="modal-btn cancel" onClick={handleCancel} style={{ fontSize: '12px' }}>Cancelar</button>
                        <button className="modal-btn confirm" onClick={handleSave} style={{ fontSize: '12px' }}>Salvar</button>
                    </div>
                </div>
            </div>
        </>
    );
}
