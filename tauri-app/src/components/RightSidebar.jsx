import React from 'react';
import useStore from '../store/useStore';
import { getPoints } from '../utils/geometry';

export default function RightSidebar() {
    const { 
        currentRegion, setRegion, curDist, setCurDist, curDir, setCurDir,
        lastPastedPoint, infos, setInfos, isHomeToggleActive, toggleSetting,
        homePoints
    } = useStore();

    const distClick = (dist) => {
        let newDist = { min: 0, max: 30 };
        if (dist === 1) newDist = { min: 30, max: 500 };
        if (dist === 2) newDist = { min: 500, max: 7000 };
        
        setCurDist(newDist);

        if (infos.length > 0 && lastPastedPoint) {
            const last = infos[infos.length - 1];
            if (last.x === lastPastedPoint.x && last.y === lastPastedPoint.y && last.z === lastPastedPoint.z) {
                const newInfos = [...infos];
                newInfos[newInfos.length - 1].dist = newDist;
                newInfos[newInfos.length - 1].points = getPoints({ x: last.x, y: last.y, z: last.z }, last.ang, newDist.min, newDist.max);
                setInfos(newInfos);
            }
        }
    };

    const dirClick = (dir) => {
        const ang = dir * 45;
        setCurDir(ang);
        
        if (!lastPastedPoint) {
            alert("Cole uma coordenada primeiro!");
            return;
        }

        const point = { 
            x: lastPastedPoint.x, y: lastPastedPoint.y, z: lastPastedPoint.z, 
            dist: curDist, ang: ang 
        };
        point.points = getPoints({ x: point.x, y: point.y, z: point.z }, point.ang, point.dist.min, point.dist.max);

        const newInfos = [...infos];
        if (newInfos.length > 0) {
            const last = newInfos[newInfos.length - 1];
            if (last.x === point.x && last.y === point.y && last.z === point.z) {
                newInfos.pop();
            }
        }
        newInfos.push(point);
        setInfos(newInfos);
    };

    const undoLast = () => {
        if (infos.length > 0) {
            const newInfos = [...infos];
            newInfos.pop();
            setInfos(newInfos);
        }
    };

    const clearList = () => {
        setInfos([]);
        // TODO: clear spawns and intersection in store if needed
    };

    return (
        <div id="finder-sidebar" className="finder-sidebar" style={{ right: 20, top: 20, display: 'flex', flexDirection: 'column' }}>
            <div id="drag-handle-right" className="drag-handle" data-tooltip="Segure para arrastar">
                <i className="fa-solid fa-grip-lines"></i>
            </div>

            <div className="top-widgets">
                <button id="btn-paste" className="minimap-btn" data-tooltip="Colar Coordenadas">
                    <i className="fa-solid fa-location-dot"></i>
                </button>
                <div className="minimap-pin" style={{ marginLeft: 'auto' }}>
                    <input type="checkbox" id="always-on-top" style={{ display: 'none' }} 
                        // onChange={(e) => toggleAlwaysOnTop(e.target.checked)}
                    />
                    <label htmlFor="always-on-top" data-tooltip="Fixar no Topo"><i className="fa-solid fa-thumbtack"></i></label>
                </div>
            </div>

            <div className="region-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select className="minimap-select" style={{ flex: 1 }} value={currentRegion} onChange={(e) => setRegion(e.target.value)}>
                    <option value="kanto">Kanto</option>
                    <option value="johto">Johto</option>
                </select>
                <div className="home-toggle">
                    <input type="checkbox" id="home-toggle-checkbox" style={{ display: 'none' }} checked={isHomeToggleActive} onChange={(e) => toggleSetting('isHomeToggleActive', e.target.checked)} />
                    <label htmlFor="home-toggle-checkbox" data-tooltip="Ativar Retorno Fixo"><i className="fa-solid fa-anchor"></i></label>
                </div>
            </div>
            
            <div className="search-live-tracker">
                <div className="tracker-item" data-tooltip="Finders usados nesta busca">
                    <i className="fa-solid fa-satellite-dish"></i> <span>{infos.length}</span> finders
                </div>
                <div className="tracker-item" data-tooltip="Tempo decorrido nesta busca">
                    <i className="fa-regular fa-clock"></i> <span>00:00</span>
                </div>
            </div>

            <div className="finder-colors">
                <button className={`color-btn green ${curDist.max === 30 ? 'active' : ''}`} onClick={() => distClick(0)}><img src="imgs_finder/RadarGreen.png" alt="Verde"/></button>
                <button className={`color-btn yellow ${curDist.max === 500 ? 'active' : ''}`} onClick={() => distClick(1)}><img src="imgs_finder/RadarYellow.png" alt="Amarelo"/></button>
                <button className={`color-btn red ${curDist.max === 7000 ? 'active' : ''}`} onClick={() => distClick(2)}><img src="imgs_finder/RadarRed.png" alt="Vermelho"/></button>
            </div>

            <div className="finder-compass">
                <button className="dir-btn" onClick={() => dirClick(5)}><i className="fa-solid fa-location-arrow" style={{ transform: 'rotate(-90deg)' }}></i></button>
                <button className="dir-btn" onClick={() => dirClick(6)}><i className="fa-solid fa-arrow-up"></i></button>
                <button className="dir-btn" onClick={() => dirClick(7)}><i className="fa-solid fa-location-arrow"></i></button>
                <button className="dir-btn" onClick={() => dirClick(4)}><i className="fa-solid fa-arrow-left"></i></button>
                <button className="dir-btn center-dir" onClick={() => dirClick(-1)}><i className="fa-solid fa-location-crosshairs"></i></button>
                <button className="dir-btn" onClick={() => dirClick(0)}><i className="fa-solid fa-arrow-right"></i></button>
                <button className="dir-btn" onClick={() => dirClick(3)}><i className="fa-solid fa-location-arrow" style={{ transform: 'rotate(180deg)' }}></i></button>
                <button className="dir-btn" onClick={() => dirClick(2)}><i className="fa-solid fa-arrow-down"></i></button>
                <button className="dir-btn" onClick={() => dirClick(1)}><i className="fa-solid fa-location-arrow" style={{ transform: 'rotate(90deg)' }}></i></button>
            </div>

            <div className="finder-actions">
                <button className="finish-btn">
                    <img src="imgs_finder/chest.png" className="btn-chest-img" alt="Baú" /> Registrar
                </button>
                <div className="sub-actions-row">
                    <button className="action-btn" onClick={undoLast}><i className="fa-solid fa-rotate-left"></i> Desfazer</button>
                    <button className="clear-btn" onClick={clearList}><img src="imgs_finder/Clear.png" alt="Resetar" /> Resetar</button>
                </div>
            </div>
        </div>
    );
}
