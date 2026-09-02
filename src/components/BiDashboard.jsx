import React, { useState } from 'react';
import useStore from '../store/useStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export default function BiDashboard() {
    const { isBiDashboardOpen, setBiDashboard } = useStore();
    const [activeTab, setActiveTab] = useState('overview');

    if (!isBiDashboardOpen) return null;

    const handleExportCSV = async () => {
        try {
            const filePath = await save({
                filters: [{ name: 'CSV', extensions: ['csv'] }],
                defaultPath: 'historico_buscas.csv'
            });
            
            if (filePath) {
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
                
                await writeTextFile(filePath, header + rows);
                alert("Arquivo exportado com sucesso!");
            }
        } catch (e) {
            console.error("Erro ao salvar CSV:", e);
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
                                <p>Área para colar os logs do chat e contabilizar loot.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
