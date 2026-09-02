import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../store/useStore';

export default function BiDashboard() {
    const { isBiDashboardOpen, setBiDashboard } = useStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (isBiDashboardOpen) {
            try {
                const data = JSON.parse(localStorage.getItem('finder_bi_history') || '[]');
                setHistory(data);
            } catch (e) {
                setHistory([]);
            }
        }
    }, [isBiDashboardOpen]);

    const stats = useMemo(() => {
        const total = history.length;
        if (total === 0) return null;

        let totalDuration = 0;
        let totalFinders = 0;
        const levels = { S: 0, A: 0, B: 0, C: 0, D: 0, E: 0 };
        const types = { Normal: 0, Fragment: 0 };
        const regions = { kanto: 0, johto: 0 };

        history.forEach(h => {
            totalDuration += h.durationSeconds || 0;
            totalFinders += h.finders || 0;
            if (h.level && levels[h.level] !== undefined) levels[h.level]++;
            if (h.type) {
                const t = h.type.includes('Fragment') ? 'Fragment' : 'Normal';
                types[t]++;
            }
            if (h.region) regions[h.region]++;
        });

        const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
        const avgFinders = total > 0 ? (totalFinders / total).toFixed(1) : 0;

        const formatTime = (secs) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            return `${h}h ${m}m`;
        };

        const parseItem = (text, itemName) => {
            if (!text) return 0;
            const regex = new RegExp(`(?:(\\d+)\\s*x\\s*)?${itemName}|${itemName}(?:\\s*x\\s*(\\d+))?`, 'gi');
            let total = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const count = parseInt(match[1] || match[2] || "1", 10);
                total += count;
            }
            return total;
        };

        let totalMystic = 0;
        let totalCoin = 0;
        let totalBar = 0;

        history.forEach(h => {
            if (h.lootText) {
                totalMystic += parseItem(h.lootText, "mystic fragment");
                totalCoin += parseItem(h.lootText, "gold coin");
                totalBar += parseItem(h.lootText, "gold bar");
            }
        });

        return {
            total,
            totalDurationText: formatTime(totalDuration),
            avgDurationText: `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`,
            totalFinders,
            avgFinders,
            levels,
            types,
            regions,
            loot: { mystic: totalMystic, coin: totalCoin, bar: totalBar }
        };
    }, [history]);

    if (!isBiDashboardOpen) return null;

    const handleExportCSV = () => {
        try {
            if (history.length === 0) {
                alert("Nenhum dado para exportar.");
                return;
            }
            const header = "Data,Nível,Tipo,Região,Finders,Duração(s)\n";
            const rows = history.map(h => {
                const date = new Date(h.timestamp).toLocaleString();
                return `"${date}","${h.level || ''}","${h.type || ''}","${h.region || ''}",${h.finders || 0},${h.durationSeconds || 0}`;
            }).join('\n');
            
            const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "historico_buscas.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Erro ao exportar CSV:", e);
            alert("Erro ao exportar CSV.");
        }
    };

    const clearHistory = () => {
        if (window.confirm("Tem certeza que deseja apagar todo o histórico de buscas?")) {
            localStorage.removeItem('finder_bi_history');
            setHistory([]);
        }
    };

    return (
        <>
            <div className="drawer-backdrop active" onClick={() => setBiDashboard(false)}></div>
            <div className="custom-modal-overlay visible">
                <div className="custom-modal" style={{ width: '600px', maxWidth: '95vw', padding: '0', overflow: 'hidden' }}>
                    
                    <div className="modal-header" style={{ padding: '20px 20px 0 20px', marginBottom: '10px' }}>
                        <div className="title-area">
                            <h3 style={{ margin: 0 }}><i className="fa-solid fa-chart-pie" style={{ color: '#38bdf8' }}></i> Painel de Análise (BI)</h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Métricas detalhadas das suas caçadas</span>
                        </div>
                        <div className="header-right" style={{ display: 'flex', gap: '10px' }}>
                            <button className="action-btn" onClick={handleExportCSV} style={{ padding: '6px 10px', fontSize: '12px' }}>
                                <i className="fa-solid fa-download"></i> CSV
                            </button>
                            <button className="close-modal-btn" onClick={() => setBiDashboard(false)}>&times;</button>
                        </div>
                    </div>

                    <div className="bi-tabs-nav" style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px' }}>
                        <button className={`bi-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ background: 'none', border: 'none', color: activeTab === 'overview' ? '#38bdf8' : '#94a3b8', padding: '12px 20px', cursor: 'pointer', borderBottom: activeTab === 'overview' ? '2px solid #38bdf8' : '2px solid transparent', fontWeight: 600 }}>
                            <i className="fa-solid fa-chart-simple"></i> Resumo
                        </button>
                        <button className={`bi-tab-btn ${activeTab === 'loot' ? 'active' : ''}`} onClick={() => setActiveTab('loot')} style={{ background: 'none', border: 'none', color: activeTab === 'loot' ? '#fbbf24' : '#94a3b8', padding: '12px 20px', cursor: 'pointer', borderBottom: activeTab === 'loot' ? '2px solid #fbbf24' : '2px solid transparent', fontWeight: 600 }}>
                            <i className="fa-solid fa-coins"></i> Contador de Loot
                        </button>
                    </div>
                    
                    <div className="bi-dashboard-content" style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                        {activeTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {!stats ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                        <i className="fa-solid fa-box-open" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}></i>
                                        <p>Nenhum dado registrado. Comece a caçar!</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* KPI Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Total de Buscas</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{stats.total}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Total Finders</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>{stats.totalFinders}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Média Finders/Busca</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>{stats.avgFinders}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Tempo Total (Horas)</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a78bfa', marginTop: '4px' }}>{stats.totalDurationText}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            {/* Left Column: Levels */}
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#cbd5e1' }}>Distribuição por Nível</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {['S', 'A', 'B', 'C', 'D', 'E'].map(lvl => {
                                                        const count = stats.levels[lvl];
                                                        const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                                        return (
                                                            <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ width: '20px', fontWeight: 'bold', color: '#f8fafc', fontSize: '12px' }}>{lvl}</span>
                                                                <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${pct}%`, height: '100%', background: '#38bdf8', borderRadius: '4px' }}></div>
                                                                </div>
                                                                <span style={{ width: '30px', textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>{count}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Right Column: Types & Regions */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1' }}>Tipo de Dungeon</h4>
                                                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f8fafc' }}>{stats.types.Normal}</div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Normal</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{stats.types.Fragment}</div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fragment</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1' }}>Média de Tempo</h4>
                                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a78bfa', textAlign: 'center' }}>
                                                        <i className="fa-regular fa-clock"></i> {stats.avgDurationText}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', marginTop: '10px' }}>
                                            <button onClick={clearHistory} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                                                Limpar Histórico
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'loot' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
                                    Loot total registrado a partir das caçadas em seu histórico.
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <img src="imgs_finder/mystic fragment.png" alt="Mystic Fragment" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Mystic Fragment</div>
                                        <span id="loot-mystic" style={{ fontWeight: 'bold', fontSize: '28px', color: '#f8fafc' }}>{stats?.loot.mystic || 0}</span>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <img src="imgs_finder/gold coin.png" alt="Gold Coin" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gold Coin</div>
                                        <span id="loot-coin" style={{ fontWeight: 'bold', fontSize: '28px', color: '#fbbf24' }}>{stats?.loot.coin || 0}</span>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <img src="imgs_finder/gold bar.png" alt="Gold Bar" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gold Bar</div>
                                        <span id="loot-bar" style={{ fontWeight: 'bold', fontSize: '28px', color: '#fbbf24' }}>{stats?.loot.bar || 0}</span>
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
