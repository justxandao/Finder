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
                        allSpawnMarks[region].push({ x: c[0], y: c[1], z: c[2], pokemon: pokemonName });
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
    if (z < 2) {
        document.getElementById('map').classList.add('zoom-out');
    } else {
        document.getElementById('map').classList.remove('zoom-out');
    }

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
    const btnPaste = document.getElementById('btn-paste');
    if (!btnPaste) return;
    if (pasteTimeout) clearTimeout(pasteTimeout);

    if (isSuccess) {
        btnPaste.innerHTML = `<i class="fa-solid fa-check"></i>&nbsp;${message}`;
        btnPaste.style.backgroundColor = '#10b981'; btnPaste.style.color = '#ffffff';
    } else {
        btnPaste.innerHTML = `<i class="fa-solid fa-times"></i>&nbsp;${message}`;
        btnPaste.style.backgroundColor = '#ef4444'; btnPaste.style.color = '#ffffff';
    }
    pasteTimeout = setTimeout(resetPasteButton, 1500);
}

function changeFloor(novoAndar) {
    if (!floors[currentRegion][novoAndar]) return;
    map.removeLayer(floors[currentRegion][curFloor]);
    curFloor = novoAndar;
    floors[currentRegion][curFloor].addTo(map);
    markSpawnPoints(getPointsToMarkSpawn());
}

map.on('mousemove', function (e) {
    const x = Math.floor(e.latlng.lng);
    const y = Math.floor(e.latlng.lat);
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

    const coordString = `${intX}, ${intY}, ${curFloor}`;
    navigator.clipboard.writeText(coordString).then(() => {
        triggerPasteFeedback(true, 'Copiado!');
    }).catch(err => console.error(err));
});

map.on('contextmenu', function (e) {
    const x = Math.floor(e.latlng.lng); const y = Math.floor(e.latlng.lat);
    const coordString = `${x}, ${y}, ${curFloor}`;

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
}

function dirClick(dir) {
    curDir = dir * 45;
    if (!lastPastedPoint) {
        alert("Cole uma coordenada primeiro usando o botão Coordenada ou clicando no mapa!");
        return;
    }

    const point = { x: lastPastedPoint.x, y: lastPastedPoint.y, z: lastPastedPoint.z, dist: curDist, ang: curDir };
    point.points = getPoints({ x: point.x, y: point.y, z: point.z }, point.ang, point.dist.min, point.dist.max);

    // Substitui se for a mesma coordenada e cor (trocando só a direção)
    if (infos.length > 0) {
        const last = infos[infos.length - 1];
        if (last.x === point.x && last.y === point.y && last.z === point.z && last.dist.max === point.dist.max) {
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
        lastPastedPoint = { x: px, y: py, z: pz };
        focusPoint(px, py, pz, map.getZoom());

        const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });
        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([py, px], { icon: locationIcon }).addTo(map);

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

function updateMarks() {
    calcIntersection();
    if (intersection.mark) {
        intersection.mark.addTo(map);
        const lastDistMax = infos.length > 0 ? infos[infos.length - 1].dist.max : 0;

        // Exibe Pokémons estritamente quando o Finder for o verde (dist <= 30)
        if (lastDistMax <= 30) markSpawnPoints(getPointsToMarkSpawn());
        else spawnsLayer.clearLayers();
    } else { spawnsLayer.clearLayers(); }
}

function listUpdate() {
    const listContainer = document.getElementById('pos-list');
    listContainer.innerHTML = '';

    infos.forEach((info, index) => {
        const div = document.createElement('div');
        div.className = 'pos-item';

        let bgColor = 'rgba(16, 185, 129, 0.4)'; // Verde Translúcido
        if (info.dist.max > 30 && info.dist.max <= 500) bgColor = 'rgba(234, 179, 8, 0.4)'; // Amarelo
        else if (info.dist.max > 500) bgColor = 'rgba(239, 68, 68, 0.4)'; // Vermelho

        div.style.backgroundColor = bgColor;
        div.style.borderColor = bgColor.replace('0.4', '0.8');

        const span = document.createElement('span');
        span.innerText = `${info.x}, ${info.y}, ${info.z} `;
        div.appendChild(span);

        const dirbtn = document.createElement('img');
        dirbtn.src = `imgs_finder/${info.ang === -45 ? 'Center' : directions[info.ang]}.png`;
        dirbtn.className = 'del-btn';

        const delbtn = document.createElement('img');
        delbtn.src = 'imgs_finder/Delete.png';
        delbtn.className = 'del-btn';
        delbtn.onclick = () => { infos.splice(index, 1); updateMarks(); listUpdate(); };

        div.appendChild(dirbtn); div.appendChild(delbtn); listContainer.appendChild(div);
    });
}

function clearList() {
    infos = [];
    if (intersection.mark) {
        map.removeLayer(intersection.mark);
        intersection = { mark: null, polygon: null, center: null, centroid: null, box: null };
    }
    spawnsLayer.clearLayers();
    listUpdate();
}

function getPointsToMarkSpawn() {
    if (!intersection.polygon || !allSpawnMarks[currentRegion]) return [];

    const [xMin, yMin, xMax, yMax] = intersection.box;

    return allSpawnMarks[currentRegion].filter(pos => {
        if (pos.z !== curFloor || pos.x < xMin || pos.x > xMax || pos.y < yMin || pos.y > yMax) return false;
        // Filtro Exato do Polígono Matemático (Garante que só puxe o que está estritamente dentro da área colorida)
        return turf.booleanPointInPolygon(turf.point([pos.x + 0.5, pos.y + 0.5]), intersection.polygon);
    });
}

function markSpawnPoints(points) {
    spawnsLayer.clearLayers();

    let currentZoom = map.getZoom();

    // Escala de tamanho baseada no zoom
    let size = 32;
    if (currentZoom === 3) size = 24;
    else if (currentZoom >= 4) size = 16;
    else if (currentZoom === 1) size = 48;
    else if (currentZoom === 0) size = 64;
    else if (currentZoom <= -1) return; // Esconde se o zoom estiver muito distante

    points.forEach(point => {
        if (!point.pokemon) return;

        const capitalizedName = point.pokemon.charAt(0).toUpperCase() + point.pokemon.slice(1);

        // Criação do badge circular (bolinha com fundo escuro e borda azul) por baixo do ícone
        const pokemonIcon = L.divIcon({
            className: '',
            html: `
                <div style="
                    width: 100%;
                    height: 100%;
                    background-color: rgba(15, 23, 42, 0.9);
                    border: 2px solid #3b82f6;
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

            intersection.mark = L.geoJSON(curIntersection, {
                style: { color: maskColor, weight: 2, fillColor: maskColor, fillOpacity: 0.3 }
            });
        }
    }
}