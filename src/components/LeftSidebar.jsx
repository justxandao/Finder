import React from 'react';
import useStore from '../store/useStore';
import useDraggable from '../hooks/useDraggable';

const angleToIcon = {
    '-45': 'fa-location-crosshairs',
    '0': 'fa-arrow-right',
    '45': 'fa-arrow-down-right',
    '90': 'fa-arrow-down',
    '135': 'fa-arrow-down-left',
    '180': 'fa-arrow-left',
    '225': 'fa-arrow-up-left',
    '270': 'fa-arrow-up',
    '315': 'fa-arrow-up-right'
};

export default function LeftSidebar() {
    const { infos, setInfos, isSidebarOpen } = useStore();
    useDraggable('list-sidebar');

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
                        const dirIcon = angleToIcon[info.ang] || 'fa-location-crosshairs';
                        return (
                            <div key={index} className="pos-item" style={{ backgroundColor: bgColor, borderColor }}>
                                <span style={{ flex: 1, fontSize: '11px' }}>{`${info.x}, ${info.y}, ${info.z}`}</span>
                                {/* Direction icon with small background chip */}
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '4px', padding: '1px 4px', marginRight: '4px', color: 'rgba(255,255,255,0.7)'
                                }}>
                                    <i className={`fa-solid ${dirIcon}`} style={{ fontSize: '12px' }}></i>
                                </span>
                                {/* Delete button chip */}
                                <span
                                    onClick={() => removeItem(index)}
                                    title="Remover"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                                        borderRadius: '4px', padding: '1px 4px', cursor: 'pointer'
                                    }}
                                >
                                    <img src="imgs_finder/Delete.png" style={{ width: '12px', height: '12px' }} alt="Delete" />
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
