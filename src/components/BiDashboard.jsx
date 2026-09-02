import React, { useState } from 'react';
import useStore from '../store/useStore';

export default function BiDashboard() {
    const { isBiDashboardOpen, setBiDashboard } = useStore();
    const [activeTab, setActiveTab] = useState('overview');

    if (!isBiDashboardOpen) return null;

    const handleExportCSV = () => {
        try {
            const history = JSON.parse(localStorage.getItem('finder_bi_history') || '[]');
            if (history.length === 0) {
                alert("Nenhum dado para exportar.");
                return;
            }
            // Generate CSV
            const header = "Data,Tipo,Regiao,Finders,Duracao(s)\n";
            const rows = history.map(h => {
                const date = new Date(h.timestamp).toLocaleString();
                return `"${date}","${h.type}","${h.region}",${h.finders},${h.durationSeconds}`;
            }).join('\n');
            
            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "historico_buscas.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
        } catch (e) {
            console.error("Erro ao exportar CSV:", e);
            alert("Erro ao exportar CSV.");
        }
    };

    return (
        <>
            <div id="drawer-backdrop" className="drawer-backdrop active" onClick={() => setBiDashboard(false)}></div>
            <div id="bi-modal-overlay" className="custom-modal-overlay visible">
                <div className="bi-dashboard-modal">
                    <div className="modal-header">
                        <div className="title-area">
                            <h3><i className="fa-solid fa-chart-pie" style={{ color: '#38bdf8' }}></i> Painel de Estatísticas & BI</h3>
                            <span className="badge-subtitle">Métricas de Caça e Contador de Loot</span>
                        </div>
                        <div className="header-right">
                            <button className="action-btn" onClick={handleExportCSV} style={{ marginRight: '10px' }}>
                                <i className="fa-solid fa-download"></i> Exportar CSV
                            </button>
                            <button className="close-modal-btn" onClick={() => setBiDashboard(false)}>&times;</button>
                        </div>
                    </div>

                    <div className="bi-tabs-nav">
                        <button className={`bi-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                            <i className="fa-solid fa-chart-simple"></i> Visão Geral & Métricas
                        </button>
                        <button className={`bi-tab-btn ${activeTab === 'loot' ? 'active' : ''}`} onClick={() => setActiveTab('loot')}>
                            <img src="imgs_finder/gold coin.png" className="tab-loot-img" alt="Loot" /> Contador de Loot
                        </button>
                    </div>
                    
                    <div className="bi-dashboard-content">
                        {activeTab === 'overview' && (
                            <div className="bi-tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                                <h3>Visão Geral</h3>
                                <p>Os dados do histórico são carregados do localStorage e exibidos aqui.</p>
                            </div>
                        )}
                        {activeTab === 'loot' && (
                            <div className="bi-tab-pane active" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                                <h3>Contador de Loot</h3>
                                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Cole abaixo as mensagens do sistema para extrair as quantidades de loot.</p>
                                <textarea 
                                    style={{ width: '100%', height: '100px', background: 'rgba(15, 23, 42, 0.5)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '10px', resize: 'vertical' }}
                                    placeholder="Ex: You obtained 2x Mystic Fragment.&#10;You received 1x Gold Coin."
                                    onChange={(e) => {
                                        const text = e.target.value;
                                        const parseItem = (itemName) => {
                                            const regex = new RegExp(`(?:(\\d+)\\s*x\\s*)?${itemName}|${itemName}(?:\\s*x\\s*(\\d+))?`, 'gi');
                                            let total = 0;
                                            let match;
                                            while ((match = regex.exec(text)) !== null) {
                                                const count = parseInt(match[1] || match[2] || "1", 10);
                                                total += count;
                                            }
                                            return total;
                                        };
                                        const mFrag = parseItem("mystic fragment");
                                        const gCoin = parseItem("gold coin");
                                        const gBar = parseItem("gold bar");
                                        
                                        // Update UI
                                        const mFragEl = document.getElementById('loot-mystic');
                                        if (mFragEl) mFragEl.innerText = mFrag;
                                        const gCoinEl = document.getElementById('loot-coin');
                                        if (gCoinEl) gCoinEl.innerText = gCoin;
                                        const gBarEl = document.getElementById('loot-bar');
                                        if (gBarEl) gBarEl.innerText = gBar;
                                    }}
                                ></textarea>
                                
                                <div className="loot-results" style={{ display: 'flex', gap: '30px', marginTop: '10px', justifyContent: 'center' }}>
                                    <div className="loot-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src="imgs_finder/mystic fragment.png" alt="Mystic Fragment" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                                        <span id="loot-mystic" style={{ fontWeight: 'bold', fontSize: '20px', marginTop: '8px', color: '#f8fafc' }}>0</span>
                                    </div>
                                    <div className="loot-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src="imgs_finder/gold coin.png" alt="Gold Coin" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                                        <span id="loot-coin" style={{ fontWeight: 'bold', fontSize: '20px', marginTop: '8px', color: '#f8fafc' }}>0</span>
                                    </div>
                                    <div className="loot-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src="imgs_finder/gold bar.png" alt="Gold Bar" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                                        <span id="loot-bar" style={{ fontWeight: 'bold', fontSize: '20px', marginTop: '8px', color: '#f8fafc' }}>0</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
