const directions = {
    0: "East", 45: "SouthEast", 90: "South", 135: "SouthWest",
    180: "West", 225: "NorthWest", 270: "North", 315: "NorthEast"
};

const regionConfigs = {
    kanto: {
        limitX: 5000, limitY: 7000,
        bounds: [[2200, 2500], [7500, 7500]],
        center: [3793, 4098],
        defaultFloor: 7
    },
    johto: {
        limitX: 4075, limitY: 31478,
        bounds: [[29300, 1000], [32000, 4600]],
        center: [30667, 2832],
        defaultFloor: 6
    }
};

let currentRegion = 'kanto';
let allSpawnMarks = { kanto: [], johto: [] };

async function loadSpawnMarks() {
    try {
        const response = await fetch('spawns.json');
        const data = await response.json();
        allSpawnMarks = { kanto: [], johto: [] };

        for (const pokemonName in data) {
            const pokemonData = data[pokemonName];
            ['kanto', 'johto'].forEach(region => {
                if (pokemonData.spawns && pokemonData.spawns[region]) {
                    pokemonData.spawns[region].forEach(c => {
                        allSpawnMarks[region].push({ x: c[0] + 1, y: c[1] + 1, z: c[2], pokemon: pokemonName });
                    });
                }
            });
        }
    } catch (error) { console.error("Erro ao carregar o json de spawns unificado:", error); }
}
loadSpawnMarks();

// Sistema de Janelas Flutuantes e Arrastáveis
function makeDraggable(elId, handleId) {
    const el = document.getElementById(elId);
    const handle = document.getElementById(handleId);
    if (!el || !handle) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();

        el.style.right = 'auto'; el.style.bottom = 'auto';
        el.style.left = rect.left + 'px'; el.style.top = rect.top + 'px';
        initialLeft = rect.left; initialTop = rect.top;

        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        el.style.left = (initialLeft + (e.clientX - startX)) + 'px';
        el.style.top = (initialTop + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
}
makeDraggable('finder-sidebar', 'drag-handle-right');
makeDraggable('list-sidebar', 'drag-handle-left');


const display = document.getElementById('coords-display');
let activeSelector = null;
let activeCross = null;
let userPin = null;
let lastPastedPoint = null;

let homePoints = JSON.parse(localStorage.getItem('finderHomePoints')) || { kanto: null, johto: null };
let isHomeToggleActive = localStorage.getItem('finderHomeToggle') === 'true';

window.addEventListener('DOMContentLoaded', () => {
    const toggleCheckbox = document.getElementById('home-toggle-checkbox');
    if (toggleCheckbox) toggleCheckbox.checked = isHomeToggleActive;
});

window.toggleHome = function(isActive) {
    isHomeToggleActive = isActive;
    localStorage.setItem('finderHomeToggle', isActive);
    
    if (isActive) {
        showCustomPrompt(`Cole a coordenada fixa para a região ${currentRegion.toUpperCase()} (ex: 1000, 2000, 7):`, 'Configurar Âncora', (input) => {
            if (!input) {
                document.getElementById('home-toggle-checkbox').checked = false;
                isHomeToggleActive = false;
                localStorage.setItem('finderHomeToggle', false);
                return;
            }

            const regex = /(?:X[:\s]*)?(\d+)[^0-9]+(?:Y[:\s]*)?(\d+)[^0-9]+(?:Z[:\s]*)?(\d+)/i;
            const match = input.match(regex);

            if (!match || match.length < 4) {
                showCustomAlert("Coordenada inválida! Tente colar no formato X: 1000, Y: 2000, Z: 7", "Erro de Formato");
                document.getElementById('home-toggle-checkbox').checked = false;
                isHomeToggleActive = false;
                localStorage.setItem('finderHomeToggle', false);
                return;
            }

            const px = parseInt(match[1]); const py = parseInt(match[2]); const pz = parseInt(match[3]);
            homePoints[currentRegion] = { x: px + 1, y: py + 1, z: pz };
            localStorage.setItem('finderHomePoints', JSON.stringify(homePoints));
            
            showToast("Coordenada fixa salva com sucesso!", "success");
        });
    }
};

let limitX = regionConfigs[currentRegion].limitX;
let limitY = regionConfigs[currentRegion].limitY;
let curDist = { min: 0, max: 30 };
let curDir = 0;
let infos = [];
let intersection = { mark: null, polygon: null, center: null, centroid: null, box: null };

var CRSPixel = L.Util.extend(L.CRS.Simple, { transformation: new L.Transformation(1, 0, 1, 0) });
const distButtons = document.querySelectorAll('.color-btn');
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const floors = { kanto: {}, johto: {} };
for (let i = 1; i <= 16; i++) {
    floors.kanto[i] = L.tileLayer(`tiles/${i}/{z}/{x}/{y}.webp`, { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 });
    floors.johto[i] = L.tileLayer(`tiles_johto/${i}/{z}/{x}/{y}.webp`, { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 });
}

let curFloor = regionConfigs[currentRegion].defaultFloor;

const map = L.map('map', {
    crs: CRSPixel, fadeAnimation: false,
    layers: [floors[currentRegion][curFloor]],
    minZoom: -4, maxZoom: 4, maxBounds: regionConfigs[currentRegion].bounds,
    zoomSnap: 1, zoomDelta: 1, zoomControl: false, attributionControl: false
}).setView(regionConfigs[currentRegion].center, 2);

let spawnsLayer = L.layerGroup().addTo(map);

map.on('zoomend', function () {
    const z = map.getZoom();

    if (intersection.mark && infos.length > 0) {
        const lastDistMax = infos[infos.length - 1].dist.max;
        if (lastDistMax <= 30) {
            markSpawnPoints(getPointsToMarkSpawn());
        }
    }
});

document.getElementById('region-selector').addEventListener('change', (e) => {
    const newRegion = e.target.value;
    if (newRegion === currentRegion) return;

    clearList();
    map.removeLayer(floors[currentRegion][curFloor]);

    currentRegion = newRegion;
    curFloor = regionConfigs[currentRegion].defaultFloor;
    limitX = regionConfigs[currentRegion].limitX; limitY = regionConfigs[currentRegion].limitY;

    map.setMaxBounds(regionConfigs[currentRegion].bounds);
    floors[currentRegion][curFloor].addTo(map);
    map.setView(regionConfigs[currentRegion].center, 2);
});

const btnToggleList = document.getElementById('btn-toggle-list');
const listSidebar = document.querySelector('.list-sidebar');
if (btnToggleList && listSidebar) {
    btnToggleList.addEventListener('click', () => {
        if (listSidebar.style.display === 'none') {
            listSidebar.style.display = 'flex';
            btnToggleList.style.opacity = '1';
        } else {
            listSidebar.style.display = 'none';
            btnToggleList.style.opacity = '0.5';
        }
    });
}

document.getElementById('btn-floor-up').addEventListener('click', () => { if (curFloor > 1) changeFloor(curFloor - 1); });
document.getElementById('btn-floor-down').addEventListener('click', () => { if (curFloor < 16) changeFloor(curFloor + 1); });
document.getElementById('btn-zoom-in').addEventListener('click', () => { map.zoomIn(); });
document.getElementById('btn-zoom-out').addEventListener('click', () => { map.zoomOut(); });
document.getElementById('btn-center').addEventListener('click', () => {
    if (lastPastedPoint) focusPoint(lastPastedPoint.x, lastPastedPoint.y, lastPastedPoint.z, map.getZoom());
    else map.setView(regionConfigs[currentRegion].center, 2);
});
document.getElementById('btn-paste').addEventListener('click', pasteAndFill);

let pasteTimeout = null;
function resetPasteButton() {
    const btnPaste = document.getElementById('btn-paste');
    if (btnPaste) {
        btnPaste.innerHTML = '<i class="fa-solid fa-location-dot"></i>&nbsp;Coordenada';
        btnPaste.style.backgroundColor = ''; btnPaste.style.color = '';
    }
}

function triggerPasteFeedback(isSuccess, message) {
    if (isSuccess) showToast(message, "success");
    else showToast(message, "error");
}

function changeFloor(novoAndar) {
    if (!floors[currentRegion][novoAndar]) return;
    map.removeLayer(floors[currentRegion][curFloor]);
    curFloor = novoAndar;
    floors[currentRegion][curFloor].addTo(map);
    updateMarks();
}

map.on('mousemove', function (e) {
    const x = Math.floor(e.latlng.lng) - 1;
    const y = Math.floor(e.latlng.lat) - 1;
    display.innerText = `(${x}, ${y}, ${curFloor})`;
});

// Clique no mapa: Insere Pin E COPIA a coordenada
map.on('click', function (e) {
    if (activeSelector) map.removeLayer(activeSelector);
    if (activeCross) map.removeLayer(activeCross);

    const intX = Math.floor(e.latlng.lng);
    const intY = Math.floor(e.latlng.lat);
    const x = intX + 0.5; const y = intY + 0.5; const raio = 0.5;

    activeSelector = L.rectangle([[y + raio, x + raio], [y - raio, x - raio]], { color: "#333333", weight: 1, fillOpacity: 0, smoothFactor: 0, interactive: false }).addTo(map);
    const linhaV = L.polyline([[0, x], [limitY, x]], { color: '#333333', weight: 1, interactive: false });
    const linhaH = L.polyline([[y, 0], [y, limitX]], { color: '#333333', weight: 1, interactive: false });
    activeCross = L.layerGroup([linhaV, linhaH]).addTo(map);

    lastPastedPoint = { x: intX, y: intY, z: curFloor };
    const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });

    if (userPin) map.removeLayer(userPin);
    userPin = L.marker([intY, intX], { icon: locationIcon }).addTo(map);

    const coordString = `${intX - 1}, ${intY - 1}, ${curFloor}`;
    navigator.clipboard.writeText(coordString).then(() => {
        triggerPasteFeedback(true, 'Copiado!');
    }).catch(err => console.error(err));
});

map.on('contextmenu', function (e) {
    const x = Math.floor(e.latlng.lng); const y = Math.floor(e.latlng.lat);
    const coordString = `${x - 1}, ${y - 1}, ${curFloor}`;

    const contextMenu = document.getElementById('context-menu');
    const contextCoord = document.getElementById('context-coord');

    contextCoord.innerText = coordString;
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.originalEvent.pageX + 'px';
    contextMenu.style.top = e.originalEvent.pageY + 'px';

    document.getElementById('btn-copy-coord').onclick = async () => {
        try { await navigator.clipboard.writeText(coordString); contextMenu.style.display = 'none'; }
        catch (err) { console.error(err); }
    };
});

map.on('click', () => {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) contextMenu.style.display = 'none';
});

function distClick(event, dist) {
    distButtons.forEach(element => element.classList.remove('active'));
    event.currentTarget.classList.add('active');
    switch (dist) {
        case 0: curDist = { min: 0, max: 30 }; break;
        case 1: curDist = { min: 30, max: 500 }; break;
        case 2: curDist = { min: 500, max: Math.max(limitY, limitX) }; break;
    }

    if (infos.length > 0 && lastPastedPoint) {
        const last = infos[infos.length - 1];
        if (last.x === lastPastedPoint.x && last.y === lastPastedPoint.y && last.z === lastPastedPoint.z) {
            last.dist = curDist;
            last.points = getPoints({ x: last.x, y: last.y, z: last.z }, last.ang, last.dist.min, last.dist.max);
            updateMarks(); listUpdate();
        }
    }
}

function dirClick(dir) {
    document.querySelectorAll('.dir-btn').forEach(btn => btn.classList.remove('active-dir'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active-dir');

    curDir = dir * 45;
    if (!lastPastedPoint) {
        showCustomAlert("Cole uma coordenada primeiro usando o botão de pino ou clicando no mapa!", "Atenção");
        return;
    }

    const point = { x: lastPastedPoint.x, y: lastPastedPoint.y, z: lastPastedPoint.z, dist: curDist, ang: curDir };
    point.points = getPoints({ x: point.x, y: point.y, z: point.z }, point.ang, point.dist.min, point.dist.max);

    // Substitui se for a mesma coordenada (trocando só a direção ou atualizando)
    if (infos.length > 0) {
        const last = infos[infos.length - 1];
        if (last.x === point.x && last.y === point.y && last.z === point.z) {
            infos.pop();
        }
    }
    infos.push(point);
    updateMarks(); listUpdate();
}

function undoLast() {
    if (infos.length > 0) {
        infos.pop();
        updateMarks(); listUpdate();
    }
}

function focusPoint(x, y, z, zoom) {
    if (z !== undefined && z !== curFloor) changeFloor(z);
    const bounds = regionConfigs[currentRegion].bounds;
    x = clamp(x, bounds[0][1], bounds[1][1]);
    y = clamp(y, bounds[0][0], bounds[1][0]);
    map.setView([y, x], zoom);
}

async function pasteAndFill() {
    try {
        const text = await navigator.clipboard.readText();
        const regex = /(?:X[:\s]*)?(\d+)[^0-9]+(?:Y[:\s]*)?(\d+)[^0-9]+(?:Z[:\s]*)?(\d+)/i;
        const match = text.match(regex);

        if (!match || match.length < 4) {
            triggerPasteFeedback(false, 'Inválida');
            return false;
        }

        const px = parseInt(match[1]); const py = parseInt(match[2]); const pz = parseInt(match[3]);
        const mapX = px + 1; const mapY = py + 1;
        lastPastedPoint = { x: mapX, y: mapY, z: pz };
        focusPoint(mapX, mapY, pz, map.getZoom());

        const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });
        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([mapY, mapX], { icon: locationIcon }).addTo(map);

        triggerPasteFeedback(true, 'Colado!');
        return true;
    } catch (err) {
        triggerPasteFeedback(false, 'Erro'); return false;
    }
}

function degToRad(deg) { return deg * (Math.PI / 180); }

// Lógica "Pixel Perfect": Converte a área para valores inteiros cravados (tiles exatos)
function getSquarePoints(pos, dist) {
    return [
        { x: Math.round(pos.x - dist), y: Math.round(pos.y - dist) },
        { x: Math.round(pos.x + dist), y: Math.round(pos.y - dist) },
        { x: Math.round(pos.x + dist), y: Math.round(pos.y + dist) },
        { x: Math.round(pos.x - dist), y: Math.round(pos.y + dist) }
    ];
}

function getPoints(pos, ang, distMin, distMax) {
    if (ang === -45) return getSquarePoints(pos, 30);

    const innerPoints = []; const outerPoints = [];
    const angles = [degToRad(ang - 22.5), degToRad(ang), degToRad(ang + 22.5)];

    angles.forEach((angle) => {
        let cos = Math.cos(angle); let sin = Math.sin(angle);
        let div = Math.max(Math.abs(cos), Math.abs(sin));
        let multMin = distMin / div; let multMax = distMax / div;

        innerPoints.push({ x: Math.round(pos.x + (cos * multMin)), y: Math.round(pos.y + (sin * multMin)) });
        outerPoints.push({ x: Math.round(pos.x + (cos * multMax)), y: Math.round(pos.y + (sin * multMax)) });
    });

    return [...innerPoints, ...outerPoints.reverse()];
}

function pixelatePolygon(poly) {
    const coords = poly.geometry.coordinates[0];
    const newCoords = [];
    
    for (let i = 0; i < coords.length - 1; i++) {
        let p1 = coords[i];
        let p2 = coords[i+1];
        
        let x1 = Math.round(p1[0]);
        let y1 = Math.round(p1[1]);
        let x2 = Math.round(p2[0]);
        let y2 = Math.round(p2[1]);
        
        newCoords.push([x1, y1]);
        
        let dx = Math.abs(x2 - x1);
        let dy = Math.abs(y2 - y1);
        let sx = (x1 < x2) ? 1 : -1;
        let sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;
        
        while (x1 !== x2 || y1 !== y2) {
            let e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
                newCoords.push([x1, y1]);
            }
            if (e2 < dx) {
                err += dx;
                y1 += sy;
                newCoords.push([x1, y1]);
            }
        }
    }
    
    if (newCoords.length > 0 && 
        (newCoords[0][0] !== newCoords[newCoords.length-1][0] || 
         newCoords[0][1] !== newCoords[newCoords.length-1][1])) {
        newCoords.push([newCoords[0][0], newCoords[0][1]]);
    }
    
    // Fallback just in case
    if (newCoords.length < 4) return poly;
    
    return turf.polygon([newCoords]);
}

function sqr(x) { return x * x; }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y); }
function distToSegmentSquared(p, v, w) {
    let l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
function pointToPolygonDist(px, py, poly) {
    const coords = poly.geometry.coordinates[0];
    let minDist = Infinity;
    let p = { x: px, y: py };
    for (let i = 0; i < coords.length - 1; i++) {
        let v = { x: coords[i][0], y: coords[i][1] };
        let w = { x: coords[i+1][0], y: coords[i+1][1] };
        let d2 = distToSegmentSquared(p, v, w);
        if (d2 < minDist) minDist = d2;
    }
    return Math.sqrt(minDist);
}

function updateMarks() {
    calcIntersection();
    if (intersection.mark) {
        intersection.mark.addTo(map);
        
        if (intersection.polygon) {
            const [xMin, yMin, xMax, yMax] = intersection.box;
            const width = xMax - xMin;
            const height = yMax - yMin;
            if (width <= 60 && height <= 60) markSpawnPoints(getPointsToMarkSpawn());
            else spawnsLayer.clearLayers();
        } else {
            spawnsLayer.clearLayers();
        }
    } else { spawnsLayer.clearLayers(); }
}

function listUpdate() {
    const list = document.getElementById('pos-list');
    list.innerHTML = '';

    infos.forEach((info, index) => {
        const div = document.createElement('div');
        div.className = 'pos-item';

        let bgColor = info.dist.max <= 30 ? 'rgba(34, 197, 94, 0.4)' : info.dist.max <= 500 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        div.style.backgroundColor = bgColor;
        div.style.borderColor = bgColor.replace('0.4', '0.8');

        const span = document.createElement('span');
        span.innerText = `${info.x - 1}, ${info.y - 1}, ${info.z} `;
        div.appendChild(span);

        const dirbtn = document.createElement('img');
        dirbtn.src = `imgs_finder/${info.ang === -45 ? 'Center' : directions[info.ang]}.png`;
        dirbtn.className = 'del-btn';

        const delbtn = document.createElement('img');
        delbtn.src = 'imgs_finder/Delete.png';
        delbtn.className = 'del-btn';
        delbtn.onclick = () => { infos.splice(index, 1); updateMarks(); listUpdate(); };

        div.appendChild(dirbtn); div.appendChild(delbtn); list.appendChild(div);
    });
}

// =========================================
// CUSTOM UI CONTROLLERS
// =========================================

// Toasts
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Modals
let activePromptCallback = null;

function showCustomAlert(message, title = 'Aviso') {
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-message').innerText = message;
    document.getElementById('custom-modal-input').style.display = 'none';
    document.getElementById('custom-modal-btn-cancel').style.display = 'none';
    document.getElementById('custom-modal-btn-confirm').innerText = 'OK';
    
    activePromptCallback = null;
    document.getElementById('custom-modal-overlay').classList.add('visible');
}

function showCustomPrompt(message, title, callback) {
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-message').innerText = message;
    
    const input = document.getElementById('custom-modal-input');
    input.style.display = 'block';
    input.value = '';
    
    document.getElementById('custom-modal-btn-cancel').style.display = 'block';
    document.getElementById('custom-modal-btn-confirm').innerText = 'Confirmar';
    
    activePromptCallback = callback;
    document.getElementById('custom-modal-overlay').classList.add('visible');
    input.focus();
}

function closeModal(isConfirm) {
    document.getElementById('custom-modal-overlay').classList.remove('visible');
    if (activePromptCallback) {
        if (isConfirm) {
            activePromptCallback(document.getElementById('custom-modal-input').value);
        } else {
            activePromptCallback(null);
        }
        activePromptCallback = null;
    }
}

document.getElementById('custom-modal-btn-cancel').addEventListener('click', () => closeModal(false));
document.getElementById('custom-modal-btn-confirm').addEventListener('click', () => closeModal(true));
document.getElementById('custom-modal-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') closeModal(true);
});

// Tooltips Customizados
document.addEventListener('DOMContentLoaded', () => {
    const tooltip = document.getElementById('custom-tooltip');
    
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) return;
        
        const text = target.getAttribute('data-tooltip');
        tooltip.innerText = text;
        
        const rect = target.getBoundingClientRect();
        tooltip.classList.add('visible');
        
        // Posição baseada no elemento
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
        
        // Evita sair da tela
        if (left < 5) left = 5;
        if (left + tooltip.offsetWidth > window.innerWidth - 5) {
            left = window.innerWidth - tooltip.offsetWidth - 5;
        }
        if (top + tooltip.offsetHeight > window.innerHeight - 5) {
            top = rect.top - tooltip.offsetHeight - 8;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    });
    
    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltip.classList.remove('visible');
        }
    });
});

function clearList() {
    infos = [];
    if (intersection.mark) {
        map.removeLayer(intersection.mark);
        intersection = { mark: null, polygon: null, center: null, centroid: null, box: null };
    }
    spawnsLayer.clearLayers();
    listUpdate();

    if (isHomeToggleActive && homePoints[currentRegion]) {
        const hp = homePoints[currentRegion];
        lastPastedPoint = { ...hp };
        focusPoint(hp.x, hp.y, hp.z, map.getZoom());
        const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });
        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([hp.y, hp.x], { icon: locationIcon }).addTo(map);
    }
}

function getPointsToMarkSpawn() {
    if (!intersection.polygon || !allSpawnMarks[currentRegion]) return [];

    const [xMin, yMin, xMax, yMax] = intersection.box;
    const margin = 8; // Distância de tolerância para os com borda vermelha

    return allSpawnMarks[currentRegion]
        .map(pos => {
            if (pos.z !== curFloor) return null;
            if (pos.x < xMin - margin || pos.x > xMax + margin || pos.y < yMin - margin || pos.y > yMax + margin) return null;

            const isInside = turf.booleanPointInPolygon(turf.point([pos.x + 0.5, pos.y + 0.5]), intersection.polygon);
            if (isInside) {
                return { ...pos, status: 'inside' };
            } else {
                const dist = pointToPolygonDist(pos.x + 0.5, pos.y + 0.5, intersection.polygon);
                if (dist <= margin) {
                    return { ...pos, status: 'near' };
                }
            }
            return null;
        })
        .filter(p => p !== null);
}

function markSpawnPoints(points) {
    spawnsLayer.clearLayers();

    let currentZoom = map.getZoom();

    // Escala de tamanho baseada no zoom
    let size = 32;
    if (currentZoom >= 3) size = 24;
    if (currentZoom >= 4) size = 16;
    
    if (currentZoom <= -1) return; // Esconde se o zoom estiver muito distante

    points.forEach(point => {
        if (!point.pokemon) return;

        const capitalizedName = point.pokemon.charAt(0).toUpperCase() + point.pokemon.slice(1);

        let borderColor = '#3b82f6';
        let bgColor = 'rgba(15, 23, 42, 0.9)';
        if (point.status === 'near') {
            borderColor = '#ef4444';
            bgColor = 'rgba(60, 15, 15, 0.9)';
        }

        // Criação do badge circular (bolinha com fundo escuro e borda azul ou vermelha) por baixo do ícone
        const pokemonIcon = L.divIcon({
            className: '',
            html: `
                <div style="
                    width: 100%;
                    height: 100%;
                    background-color: ${bgColor};
                    border: 2px solid ${borderColor};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6);
                    box-sizing: border-box;
                ">
                    <img src="pokemon_icons/${capitalizedName}.png" style="width: 70%; height: 70%; object-fit: contain;">
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([point.y - 0.5, point.x - 0.5], {
            icon: pokemonIcon,
            interactive: true
        });

        marker.bindTooltip(capitalizedName, {
            direction: 'top',
            offset: [0, -(size / 2)],
            opacity: 0.9
        });

        marker.addTo(spawnsLayer);
    });
}

function calcIntersection() {
    if (intersection.mark) map.removeLayer(intersection.mark);
    intersection = { mark: null, polygon: null, center: null, centroid: null, box: null };

    let polygons = [];
    for (let i = 0; i < infos.length; i++) {
        let coords = infos[i].points.map(p => [p.x, p.y]);
        coords.push([infos[i].points[0].x, infos[i].points[0].y]);
        polygons.push(turf.polygon([coords]));
    }

    if (polygons.length > 0) {
        let curIntersection = polygons[0];
        for (let i = 1; i < polygons.length; i++) {
            curIntersection = turf.intersect(turf.featureCollection([curIntersection, polygons[i]]));
            if (!curIntersection) break;
        }

        if (curIntersection) {
            intersection.polygon = curIntersection; // Salvo para o sistema de filtro exato turf.js
            intersection.box = turf.bbox(curIntersection);
            const center = turf.center(curIntersection); const centroid = turf.centroid(curIntersection);
            intersection.center = [center.geometry.coordinates[0], center.geometry.coordinates[1]];
            intersection.centroid = [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]];

            const lastDistMax = infos[infos.length - 1].dist.max;
            let maskColor = lastDistMax <= 30 ? '#00ff00' : lastDistMax <= 500 ? '#ffff00' : '#ff0000';

            const pixelated = pixelatePolygon(curIntersection);

            intersection.mark = L.geoJSON(pixelated, {
                style: { color: maskColor, weight: 2, fillColor: maskColor, fillOpacity: 0.3 }
            });
        }
    }
}