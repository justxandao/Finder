import React, { useState } from 'react';
import useStore from '../store/useStore';
import { useToast } from './Toast';

export default function RegisterModal({ elapsedSeconds = 0 }) {
    const showToast = useToast();
    const { 
        isRegisterModalOpen, setRegisterModal,
        finderLevel, setFinderLevel,
        infos, currentRegion
    } = useStore();

    const [lootText, setLootText] = useState('');

    if (!isRegisterModalOpen) return null;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handlePasteLoot = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setLootText(text);
            showToast("Loot colado!", "success");
        } catch (e) {
            showToast("Erro ao colar", "error");
        }
    };

    const handleRegister = () => {
        const history = JSON.parse(localStorage.getItem('finder_bi_history') || '[]');
        
        // Detect fragment from loot
        const hasFragment = lootText.toLowerCase().includes('mystic fragment');
        const type = hasFragment ? 'Fragment' : 'Normal';

        const newEntry = {
            timestamp: Date.now(),
            type: type,
            level: finderLevel,
            region: currentRegion,
            finders: infos.length,
            durationSeconds: elapsedSeconds,
            lootText: lootText
        };
        history.push(newEntry);
        localStorage.setItem('finder_bi_history', JSON.stringify(history));
        
        // Reset state
        useStore.getState().setInfos([]);
        setLootText('');
        setRegisterModal(false);
        showToast(`Caçada registrada com sucesso!`, 'success');
    };

    return (
        <>
            <div className="drawer-backdrop active" onClick={() => setRegisterModal(false)}></div>
            <div className="custom-modal-overlay visible" style={{ zIndex: 3000 }}>
                <div style={{ background: '#111827', width: '380px', borderRadius: '12px', padding: '24px', color: '#f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <i className="fa-solid fa-location-dot" style={{ fontSize: '20px' }}></i>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Registrar Finder</h2>
                    </div>

                    {/* Finder Level */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '15px' }}>
                        <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.2, width: '70px' }}>Qual Finder<br/>foi usado?</span>
                        <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'space-between' }}>
                            {['E', 'D', 'C', 'B', 'A', 'S'].map(lvl => (
                                <button 
                                    key={lvl}
                                    onClick={() => setFinderLevel(lvl)}
                                    style={{
                                        background: finderLevel === lvl ? 'rgba(234, 179, 8, 0.15)' : '#1f2937',
                                        border: finderLevel === lvl ? '1px solid #eab308' : '1px solid #374151',
                                        color: finderLevel === lvl ? '#eab308' : '#94a3b8',
                                        borderRadius: '8px', width: '36px', height: '36px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        {/* Finders Gastos */}
                        <div style={{ background: '#1f2937', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #374151' }}>
                            <i className="fa-solid fa-satellite-dish" style={{ color: '#94a3b8', fontSize: '20px' }}></i>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>FINDERS GASTOS</div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', lineHeight: 1, marginTop: '2px' }}>{infos.length}</div>
                            </div>
                        </div>

                        {/* Tempo Decorrido */}
                        <div style={{ background: '#1f2937', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #374151' }}>
                            <i className="fa-regular fa-clock" style={{ color: '#94a3b8', fontSize: '20px' }}></i>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>TEMPO DECORRIDO</div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', lineHeight: 1, marginTop: '2px' }}>{formatTime(elapsedSeconds)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Loot Input */}
                    <div style={{ background: '#1f2937', borderRadius: '8px', padding: '12px', border: '1px dashed #374151', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <img src="imgs_finder/gold bar.png" alt="Loot" style={{ width: '16px' }} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1' }}>Loot do Chat (Opcional):</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                value={lootText}
                                onChange={e => setLootText(e.target.value)}
                                placeholder="Ex: Você recebeu 6 gold bars..."
                                style={{
                                    flex: 1, background: '#111827', border: '1px solid #374151', 
                                    borderRadius: '6px', color: '#94a3b8', padding: '8px 12px',
                                    fontSize: '12px', outline: 'none'
                                }}
                            />
                            <button 
                                onClick={handlePasteLoot}
                                style={{
                                    background: '#374151', border: 'none', borderRadius: '6px',
                                    width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#f8fafc', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#4b5563'}
                                onMouseOut={e => e.currentTarget.style.background = '#374151'}
                            >
                                <i className="fa-solid fa-paste"></i>
                            </button>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                        <button 
                            onClick={() => setRegisterModal(false)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleRegister}
                            style={{
                                background: '#10b981', border: 'none', borderRadius: '6px',
                                color: '#fff', fontWeight: 'bold', fontSize: '14px', padding: '10px 20px',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#059669'}
                            onMouseOut={e => e.currentTarget.style.background = '#10b981'}
                        >
                            <i className="fa-solid fa-check"></i> Salvar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
