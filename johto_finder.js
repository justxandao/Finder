const directions = {
    0: "East",
    45: "SouthEast",
    90: "South",
    135: "SouthWest",
    180: "West",
    225: "NorthWest",
    270: "North",
    315: "NorthEast"
}

let allSpawnMarks

async function loadSpawnMarks() {
    try {
        const response = await fetch('spawn_mark_johto.json');
        allSpawnMarks = await response.json();
    } catch (error) {
        console.error("Erro ao carregar o json de SpawnMark:", error)
    }
}

loadSpawnMarks();

const display = document.getElementById('coords-display');

let activeSelector = null;
let activeCross = null;
let userPin = null;

// Stores the last pasted coordinate, used when direction is clicked
let lastPastedPoint = null;

let limitX = 4075
let limitY = 31478

let curDist = { min: 0, max: 30 }
let curDir = 0

let infos = []

let intersection = { mark: null, center: null, centroid: null, box: null };

var CRSPixel = L.Util.extend(L.CRS.Simple, {
    transformation: new L.Transformation(1, 0, 1, 0)
})

distButtons = document.querySelectorAll('.color-btn');

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

// Atualizado para a pasta de tiles de Johto
const floors = {
    "1": L.tileLayer('tiles_johto/1/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "2": L.tileLayer('tiles_johto/2/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "3": L.tileLayer('tiles_johto/3/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "4": L.tileLayer('tiles_johto/4/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "5": L.tileLayer('tiles_johto/5/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "6": L.tileLayer('tiles_johto/6/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "7": L.tileLayer('tiles_johto/7/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "8": L.tileLayer('tiles_johto/8/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "9": L.tileLayer('tiles_johto/9/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "10": L.tileLayer('tiles_johto/10/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "11": L.tileLayer('tiles_johto/11/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "12": L.tileLayer('tiles_johto/12/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "13": L.tileLayer('tiles_johto/13/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "14": L.tileLayer('tiles_johto/14/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "15": L.tileLayer('tiles_johto/15/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
    "16": L.tileLayer('tiles_johto/16/{z}/{x}/{y}.webp', { tileSize: 1024, noWrap: true, minNativeZoom: 0, maxNativeZoom: 0, minZoom: -4, maxZoom: 4 }),
}

var bounds = [
    [29859, 1584],
    [31475, 4080]
]

const map = L.map('map', {
    crs: CRSPixel,
    fadeAnimation: false,
    layers: [floors["6"]],
    minZoom: -4,
    maxZoom: 4,
    maxBounds: bounds,
    zoomSnap: 1,
    zoomDelta: 1,
    zoomControl: false,
    attributionControl: false
}).setView([30667, 2832], 2)

let spawnsLayer = L.layerGroup().addTo(map);

let curFloor = 6;

document.getElementById('btn-floor-up').addEventListener('click', () => {
    if (curFloor > 1) changeFloor(curFloor - 1);
});

document.getElementById('btn-floor-down').addEventListener('click', () => {
    if (curFloor < 16) changeFloor(curFloor + 1);
});

document.getElementById('btn-zoom-in').addEventListener('click', () => {
    map.zoomIn();
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    map.zoomOut();
});

document.getElementById('btn-center').addEventListener('click', () => {
    if (lastPastedPoint) {
        focusPoint(lastPastedPoint.x, lastPastedPoint.y, lastPastedPoint.z, map.getZoom());
    } else if (intersection && intersection.center) {
        focusPoint(intersection.center[0], intersection.center[1], curFloor, getZoomLevelFromBox(intersection.box));
    } else {
        map.setView([30667, 2832], 2);
    }
});

document.getElementById('btn-paste').addEventListener('click', pasteAndFill);

function changeFloor(novoAndar) {
    if (!floors[novoAndar.toString()]) {
        return
    }
    map.removeLayer(floors[curFloor.toString()]);
    curFloor = novoAndar;
    floors[curFloor.toString()].addTo(map);
    const points = getPointsToMarkSpawn();
    markSpawnPoints(points);
}

map.on('mousemove', function (e) {
    const x = Math.floor(e.latlng.lng);
    const y = Math.floor(e.latlng.lat);
    display.innerText = `(${x}, ${y}, ${curFloor})`;
});

map.on('click', function (e) {
    if (activeSelector) map.removeLayer(activeSelector);
    if (activeCross) map.removeLayer(activeCross);

    const x = Math.floor(e.latlng.lng) + 0.5;
    const y = Math.floor(e.latlng.lat) + 0.5;
    raio = 0.5

    var clickBounds = [
        [y + raio, x + raio],
        [y - raio, x - raio]
    ];

    activeSelector = L.rectangle(clickBounds, { color: "#333333", weight: 1, fillOpacity: 0, smoothFactor: 0, interactive: false }).addTo(map);

    xMeio = x;
    yMeio = y;

    const linhaV = L.polyline([[0, xMeio], [limitY, xMeio]], { color: '#333333', weight: 1, interactive: false });
    const linhaH = L.polyline([[yMeio, 0], [yMeio, limitX]], { color: '#333333', weight: 1, interactive: false });
    activeCross = L.layerGroup([linhaV, linhaH]).addTo(map);
});

map.on('contextmenu', function (e) {
    const x = Math.floor(e.latlng.lng);
    const y = Math.floor(e.latlng.lat);
    const coordString = `${x}, ${y}, ${curFloor}`;

    const contextMenu = document.getElementById('context-menu');
    const contextCoord = document.getElementById('context-coord');

    contextCoord.innerText = coordString;
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.originalEvent.pageX + 'px';
    contextMenu.style.top = e.originalEvent.pageY + 'px';

    const btnCopy = document.getElementById('btn-copy-coord');
    btnCopy.onclick = async () => {
        try {
            await navigator.clipboard.writeText(coordString);
            contextMenu.style.display = 'none';
        } catch (err) {
            console.error(err);
        }
    };
});

map.on('click', () => {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) contextMenu.style.display = 'none';
});

function distClick(event, dist) {
    distButtons.forEach(element => {
        element.classList.remove('active');
    });

    event.currentTarget.classList.add('active');
    switch (dist) {
        case 0:
            curDist = { min: 0, max: 30 }
            break
        case 1:
            curDist = { min: 30, max: 500 }
            break
        case 2:
            curDist = { min: 500, max: Math.max(limitY, limitX) }
            break
    }
}

/**
 * Called when user clicks a compass direction button.
 * Uses the lastPastedPoint stored from pasteAndFill().
 * Does NOT re-read the clipboard.
 */
function dirClick(dir) {
    curDir = dir * 45;

    if (!lastPastedPoint) {
        alert("Cole uma coordenada primeiro usando o botão Colar!");
        return;
    }

    const point = {
        x: lastPastedPoint.x,
        y: lastPastedPoint.y,
        z: lastPastedPoint.z,
        dist: curDist,
        ang: curDir
    };

    point.points = getPoints({ x: point.x, y: point.y, z: point.z }, point.ang, point.dist.min, point.dist.max);
    infos.push(point);
    updateMarks();
    listUpdate();
}

function focusPoint(x, y, z, zoom) {
    if (z !== undefined && z !== curFloor) {
        changeFloor(z);
    }

    x = clamp(x, bounds[0][1], bounds[1][1]);
    y = clamp(y, bounds[0][0], bounds[1][0]);

    map.setView([y, x], zoom);
}

/**
 * Reads clipboard, validates the coordinate, places PIN and pans the map.
 * Saves the result in lastPastedPoint for later use with dirClick().
 */
async function pasteAndFill() {
    const btnPaste = document.getElementById('btn-paste');
    const originalHTML = btnPaste ? btnPaste.innerHTML : '';

    try {
        const text = await navigator.clipboard.readText();
        const regex = /(?:X[:\s]*)?(\d+)[^0-9]+(?:Y[:\s]*)?(\d+)[^0-9]+(?:Z[:\s]*)?(\d+)/i;
        const match = text.match(regex);

        if (!match || match.length < 4) {
            if (btnPaste) {
                btnPaste.innerHTML = '<i class="fa-solid fa-times"></i>&nbsp;Coordenada Inválida';
                btnPaste.style.backgroundColor = '#ef4444';
                btnPaste.style.color = '#ffffff';
                setTimeout(() => {
                    btnPaste.innerHTML = originalHTML;
                    btnPaste.style.backgroundColor = '';
                    btnPaste.style.color = '';
                }, 1500);
            }
            return false;
        }

        const px = parseInt(match[1]);
        const py = parseInt(match[2]);
        const pz = parseInt(match[3]);

        // Save the point for use by dirClick
        lastPastedPoint = { x: px, y: py, z: pz };

        // Navigate to the point
        focusPoint(px, py, pz, 2);

        const locationIcon = L.icon({
            iconUrl: 'imgs_finder/location.png',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });

        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([py, px], { icon: locationIcon }).addTo(map);

        if (btnPaste) {
            btnPaste.innerHTML = '<i class="fa-solid fa-check"></i>&nbsp;Colado!';
            btnPaste.style.backgroundColor = '#10b981';
            btnPaste.style.color = '#ffffff';
            setTimeout(() => {
                btnPaste.innerHTML = originalHTML;
                btnPaste.style.backgroundColor = '';
                btnPaste.style.color = '';
            }, 1500);
        }

        return true;
    } catch (err) {
        console.error(err);
        if (btnPaste) {
            btnPaste.innerHTML = '<i class="fa-solid fa-times"></i>&nbsp;Erro ao colar';
            btnPaste.style.backgroundColor = '#ef4444';
            btnPaste.style.color = '#ffffff';
            setTimeout(() => {
                btnPaste.innerHTML = originalHTML;
                btnPaste.style.backgroundColor = '';
                btnPaste.style.color = '';
            }, 1500);
        }
        return false;
    }
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}

function calcDist(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function getSquarePoints(pos, dist) {
    const points = [
        { x: pos.x - dist, y: pos.y - dist },
        { x: pos.x + dist, y: pos.y - dist },
        { x: pos.x + dist, y: pos.y + dist },
        { x: pos.x - dist, y: pos.y + dist }
    ]
    return points;
}

function getPoints(pos, ang, distMin, distMax) {
    if (ang === -45) {
        return getSquarePoints(pos, 30);
    }

    const innerPoints = [];
    const outerPoints = [];
    const angles = [degToRad(ang - 22.5), degToRad(ang), degToRad(ang + 22.5)];

    angles.forEach((angle, i) => {
        cos = Math.cos(angle);
        sin = Math.sin(angle);

        if (distMin === 0) {
            pad = 0.5;
        } else {
            pad = 0
        }

        div = Math.max(Math.abs(cos), Math.abs(sin));
        multMin = (distMin) / div;
        multMax = distMax / div;

        x_min = pos.x + (cos * multMin) + pad;
        y_min = pos.y + (sin * multMin) + pad;
        x_max = pos.x + (cos * multMax);
        y_max = pos.y + (sin * multMax);

        innerPoints.push({ x: x_min, y: y_min });
        outerPoints.push({ x: x_max, y: y_max });
    });

    const points = [...innerPoints, ...outerPoints.reverse()];
    return points;
}

function updateMarks() {
    calcIntersection();

    if (intersection.mark) {
        intersection.mark.addTo(map);
        focusPoint(intersection.center[0], intersection.center[1], curFloor, getZoomLevelFromBox(intersection.box));

        const width = Math.abs(intersection.box[2] - intersection.box[0]);
        const height = Math.abs(intersection.box[3] - intersection.box[1]);

        if (width <= 500 && height <= 500) {
            const spawnsInBox = getPointsToMarkSpawn();
            markSpawnPoints(spawnsInBox);
        }
    }
}

function listUpdate() {
    const listContainer = document.getElementById('pos-list');
    listContainer.innerHTML = '';

    infos.forEach((info, index) => {
        const div = document.createElement('div');
        div.className = 'pos-item';

        const span = document.createElement('span');
        span.innerText = `${info.x}, ${info.y}, ${info.z} `;
        div.appendChild(span);

        const dirbtn = document.createElement('img');
        let dir_img = null
        if (info.ang === -45) {
            dir_img = 'Center'
        } else {
            dir_img = directions[info.ang]
        }
        dirbtn.src = `imgs_finder/${dir_img}.png`
        dirbtn.className = 'del-btn';

        const delbtn = document.createElement('img');
        delbtn.src = 'imgs_finder/Delete.png'
        delbtn.className = 'del-btn';

        delbtn.onclick = () => {
            infos.splice(index, 1);
            updateMarks();
            listUpdate();
        };

        div.appendChild(dirbtn)
        div.appendChild(delbtn);
        listContainer.appendChild(div);
    });
}

function clearList() {
    infos = []

    if (intersection.mark) {
        map.removeLayer(intersection.mark);
        intersection = { mark: null, center: null, centroid: null, box: null };
    }

    if (userPin) {
        map.removeLayer(userPin);
        userPin = null;
    }

    lastPastedPoint = null;
    listUpdate();
}

function getPointsToMarkSpawn() {
    if (!intersection.box) {
        return [];
    }

    const [xMin, yMin, xMax, yMax] = intersection.box;

    return allSpawnMarks.filter(pos => {
        if (pos.z !== curFloor) {
            return false;
        }

        return pos.x >= xMin &&
            pos.x <= xMax &&
            pos.y >= yMin &&
            pos.y <= yMax;
    });
}

function markSpawnPoints(points) {
    spawnsLayer.clearLayers();

    points.forEach(point => {
        const marker = L.circle([point.y - 0.5, point.x - 0.5], {
            radius: 0.5,
            color: '#000000',
            fillColor: '#000000',
            fillOpacity: 0.3,
            weight: 1,
            interactive: false
        });

        marker.addTo(spawnsLayer)
    });
}

function getZoomLevelFromBox(bbox) {
    if (!bbox) return 2;

    const width = Math.abs(bbox[2] - bbox[0]);
    const height = Math.abs(bbox[3] - bbox[1]);
    const maxDim = Math.max(width, height);

    if (maxDim > 1000) return -1;
    if (maxDim > 500) return 0;
    if (maxDim > 200) return 1;
    if (maxDim > 50) return 2;
    if (maxDim > 10) return 3;
    return 4;
}

function calcIntersection() {
    if (intersection.mark) {
        map.removeLayer(intersection.mark);
    }

    intersection = { mark: null, center: null, centroid: null, box: null };

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
            intersection.box = turf.bbox(curIntersection);
            const center = turf.center(curIntersection);
            const centroid = turf.centroid(curIntersection);
            intersection.center = [center.geometry.coordinates[0], center.geometry.coordinates[1]];
            intersection.centroid = [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]];

            // --- INÍCIO DA LÓGICA DE COR ---
            // Pega a distância máxima do último finder utilizado
            const lastDistMax = infos[infos.length - 1].dist.max;
            let maskColor = '#10b981'; // Verde por padrão

            if (lastDistMax <= 30) {
                maskColor = '#00ff00'; // Verde (Curta Distância)
            } else if (lastDistMax <= 500) {
                maskColor = '#ffff00'; // Amarelo (Média Distância)
            } else {
                maskColor = '#ff0000'; // Vermelho (Longa Distância)
            }
            // --- FIM DA LÓGICA DE COR ---

            intersection.mark = L.geoJSON(curIntersection, {
                style: {
                    color: maskColor,
                    weight: 2,
                    fillColor: maskColor,
                    fillOpacity: 0.3
                }
            });
        }
    }
}

// Sistema de navegação entre mapas (Kanto/Johto)
const regionSelector = document.getElementById('region-selector');
if (regionSelector) {
    regionSelector.addEventListener('change', (event) => {
        window.location.href = event.target.value;
    });
}