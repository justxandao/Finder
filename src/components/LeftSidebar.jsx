import React from 'react';
import useStore from '../store/useStore';
import { directions } from '../utils/geometry';

export default function LeftSidebar() {
    const { infos, setInfos, isSidebarOpen } = useStore();

    if (!isSidebarOpen) return null;

    const removeItem = (index) => {
        const newInfos = [...infos];
        newInfos.splice(index, 1);
        setInfos(newInfos);
    };

    return (
        <div id="list-sidebar" className="list-sidebar" style={{ left: 20, top: 100 }}>
            <div id="drag-handle-left" className="drag-handle" data-tooltip="Segure para arrastar">
                <i className="fa-solid fa-grip-lines"></i>
            </div>
            <div className="finder-list-area">
                <button className="clear-btn" onClick={() => setInfos([])} data-tooltip="Limpar Mapa e Lista">
                    <img src="imgs_finder/Clear.png" alt="Limpar" /> Limpar
                </button>
                <div id="pos-list">
                    {infos.map((info, index) => {
                        const isGreen = info.dist.max <= 30;
                        const isYellow = info.dist.max <= 500 && !isGreen;
                        const bgColor = isGreen ? 'rgba(34, 197, 94, 0.18)' : isYellow ? 'rgba(234, 179, 8, 0.18)' : 'rgba(239, 68, 68, 0.18)';
                        const borderColor = isGreen ? 'rgba(34, 197, 94, 0.5)' : isYellow ? 'rgba(234, 179, 8, 0.5)' : 'rgba(239, 68, 68, 0.5)';
                        const dirName = info.ang === -45 ? 'Center' : directions[info.ang];
                        return (
                            <div key={index} className="pos-item" style={{ backgroundColor: bgColor, borderColor }}>
                                <span style={{ flex: 1, fontSize: '12px' }}>{`${info.x}, ${info.y}, ${info.z}`}</span>
                                {/* Direction icon with small background chip */}
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '5px', padding: '2px 5px', marginRight: '4px'
                                }}>
                                    <img src={`imgs_finder/${dirName}.png`} style={{ width: '14px', height: '14px' }} alt="Dir" />
                                </span>
                                {/* Delete button chip */}
                                <span
                                    onClick={() => removeItem(index)}
                                    title="Remover"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                                        borderRadius: '5px', padding: '2px 5px', cursor: 'pointer'
                                    }}
                                >
                                    <img src="imgs_finder/Delete.png" style={{ width: '14px', height: '14px' }} alt="Delete" />
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
