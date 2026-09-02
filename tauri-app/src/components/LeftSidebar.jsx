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
                        let bgColor = info.dist.max <= 30 ? 'rgba(34, 197, 94, 0.4)' : info.dist.max <= 500 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                        return (
                            <div key={index} className="pos-item" style={{ backgroundColor: bgColor, borderColor: bgColor.replace('0.4', '0.8') }}>
                                <span>{`${info.x}, ${info.y}, ${info.z} `}</span>
                                <img src={`imgs_finder/${info.ang === -45 ? 'Center' : directions[info.ang]}.png`} className="del-btn" alt="Dir" />
                                <img src="imgs_finder/Delete.png" className="del-btn" alt="Delete" onClick={() => removeItem(index)} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
