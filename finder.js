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
                const regionCap = region.charAt(0).toUpperCase() + region.slice(1);
                const locs = (pokemonData.locations_raw && (pokemonData.locations_raw[regionCap] || pokemonData.locations_raw[region])) ||
                             (pokemonData.spawns && Array.isArray(pokemonData.spawns[regionCap]) && pokemonData.spawns[regionCap]) ||
                             (pokemonData.spawns && Array.isArray(pokemonData.spawns[region]) && pokemonData.spawns[region]);
                
                if (locs && Array.isArray(locs)) {
                    locs.forEach(c => {
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
        
        let newLeft = initialLeft + (e.clientX - startX);
        let newTop = initialTop + (e.clientY - startY);
        
        const rect = el.getBoundingClientRect();
        // Fallback pro window inner caso o container no retorne altura til
        const cWidth = window.innerWidth;
        const cHeight = window.innerHeight;
        
        // Mantm pelo menos 40px visveis
        newTop = Math.max(0, Math.min(newTop, cHeight - 40));
        newLeft = Math.max(-rect.width + 40, Math.min(newLeft, cWidth - 40));
        
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
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
            homePoints[currentRegion] = { x: px, y: py, z: pz };
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
let locationsLayer = L.layerGroup().addTo(map);

let allLocations = { Kanto: [], Johto: [], "Orange Archipelago": [] };
let showMapLocations = localStorage.getItem('finderShowLocations') !== 'false';
let labelScopeSetting = localStorage.getItem('finder_setting_label_scope') || 'both';
let labelsOpacitySetting = parseInt(localStorage.getItem('finder_setting_labels_opacity') || '78', 10);
let showCoordsSetting = localStorage.getItem('finder_setting_show_coords') !== 'false';
let showSpawnsSetting = localStorage.getItem('finder_setting_show_spawns') !== 'false';
let placeFavorites = JSON.parse(localStorage.getItem('finder_place_favorites')) || [];
let currentPlacesFilter = 'all';
let currentPlacesRegionFilter = 'all';
let placesSearchTerm = '';

// Aplica opacidade inicial
document.documentElement.style.setProperty('--map-labels-opacity', (labelsOpacitySetting / 100).toString());

async function loadLocations() {
    try {
        const response = await fetch('locations.json');
        allLocations = await response.json();
        updateLocationLabels();
        renderPlacesList();
    } catch (err) {
        console.error("Erro ao carregar locations.json:", err);
    }
}
loadLocations();

function updateLocationLabels() {
    if (!locationsLayer) return;
    locationsLayer.clearLayers();
    if (!showMapLocations) return;

    const currentZoom = map.getZoom();
    if (currentZoom <= -3) return;

    let locList = [];
    if (currentRegion === 'kanto') {
        locList = [...(allLocations.Kanto || []), ...(allLocations['Orange Archipelago'] || [])];
    } else if (currentRegion === 'johto') {
        locList = allLocations.Johto || [];
    }

    // Filtra pelo escopo das configurações (todas vs apenas cidades)
    if (labelScopeSetting === 'cities') {
        locList = locList.filter(loc => loc.isCity);
    }

    // Exibe locais no andar do mapa atual
    const floorLocs = locList.filter(loc => loc.z === curFloor);

    floorLocs.forEach(loc => {
        const isCity = loc.isCity || false;
        if (currentZoom === -2 && !isCity) return;

        const titleClass = isCity ? 'city-title' : 'island-title';
        const iconHtml = `<div class="map-city-label"><span class="${titleClass}">${loc.name}</span></div>`;

        const divIcon = L.divIcon({
            className: 'custom-city-divicon',
            html: iconHtml,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });

        // interactive: false permite que qualquer clique vaze direto para o mapa Leaflet copiar a coordenada
        const marker = L.marker([loc.y + 0.5, loc.x + 0.5], {
            icon: divIcon,
            interactive: false,
            zIndexOffset: isCity ? 300 : 150
        });

        locationsLayer.addLayer(marker);
    });
}

// =========================================
// ATALHOS RÁPIDOS DE CIDADES & ILHAS (PLACES)
// =========================================

window.togglePlacesDrawer = function() {
    const drawer = document.getElementById('places-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const settingsDrawer = document.getElementById('settings-drawer');
    if (settingsDrawer) settingsDrawer.classList.remove('active');

    if (drawer) {
        drawer.classList.toggle('active');
        const isActive = drawer.classList.contains('active');
        if (backdrop) backdrop.classList.toggle('active', isActive);
        if (isActive) {
            renderPlacesList();
            const input = document.getElementById('places-search-input');
            if (input) setTimeout(() => input.focus(), 150);
        }
    }
};

window.closePlacesDrawer = function() {
    const drawer = document.getElementById('places-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
};

window.closeAllDrawers = function() {
    const placesDrawer = document.getElementById('places-drawer');
    const settingsDrawer = document.getElementById('settings-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (placesDrawer) placesDrawer.classList.remove('active');
    if (settingsDrawer) settingsDrawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
};

window.setPlacesRegionFilter = function(region) {
    currentPlacesRegionFilter = region;
    renderPlacesList();
};

window.setPlacesFilter = function(filter) {
    currentPlacesFilter = filter;
    document.querySelectorAll('.drawer-filter-tabs .filter-tab').forEach(tab => {
        if (tab.dataset.filter === filter) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    renderPlacesList();
};

window.filterPlacesList = function() {
    const input = document.getElementById('places-search-input');
    const clearBtn = document.getElementById('places-clear-search');
    placesSearchTerm = input ? input.value.trim().toLowerCase() : '';
    if (clearBtn) clearBtn.style.display = placesSearchTerm ? 'block' : 'none';
    renderPlacesList();
};

window.clearPlacesSearch = function() {
    const input = document.getElementById('places-search-input');
    const clearBtn = document.getElementById('places-clear-search');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
    placesSearchTerm = '';
    renderPlacesList();
};

window.togglePlaceFavorite = function(e, placeName) {
    e.stopPropagation();
    const idx = placeFavorites.indexOf(placeName);
    if (idx >= 0) {
        placeFavorites.splice(idx, 1);
        showToast(`${placeName} removido dos favoritos`, 'info');
    } else {
        placeFavorites.push(placeName);
        showToast(`${placeName} adicionado aos favoritos!`, 'success');
    }
    localStorage.setItem('finder_place_favorites', JSON.stringify(placeFavorites));
    renderPlacesList();
};

function renderPlacesList() {
    const container = document.getElementById('places-list-container');
    if (!container) return;

    // Constrói lista com metadata de região
    let list = [];
    (allLocations.Kanto || []).forEach(loc => list.push({ ...loc, regionKey: 'kanto', regionLabel: 'Kanto' }));
    (allLocations['Orange Archipelago'] || []).forEach(loc => list.push({ ...loc, regionKey: 'orange', regionLabel: 'Orange' }));
    (allLocations.Johto || []).forEach(loc => list.push({ ...loc, regionKey: 'johto', regionLabel: 'Johto' }));

    // Filtro por Região
    if (currentPlacesRegionFilter && currentPlacesRegionFilter !== 'all') {
        list = list.filter(p => p.regionKey === currentPlacesRegionFilter);
    }

    // Filtro de texto
    if (placesSearchTerm) {
        list = list.filter(p => p.name.toLowerCase().includes(placesSearchTerm) || p.regionLabel.toLowerCase().includes(placesSearchTerm));
    }

    // Filtro de categoria
    if (currentPlacesFilter === 'cities') {
        list = list.filter(p => p.isCity);
    } else if (currentPlacesFilter === 'islands') {
        list = list.filter(p => !p.isCity);
    } else if (currentPlacesFilter === 'favorites') {
        list = list.filter(p => placeFavorites.includes(p.name));
    }

    // Ordenação: Favoritos primeiro, depois cidades, depois alfabético
    list.sort((a, b) => {
        const aFav = placeFavorites.includes(a.name);
        const bFav = placeFavorites.includes(b.name);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        if (a.isCity && !b.isCity) return -1;
        if (!a.isCity && b.isCity) return 1;
        return a.name.localeCompare(b.name);
    });

    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #64748b; padding: 30px 10px; font-size: 12px;">
                <i class="fa-solid fa-map-pin" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                <p>Nenhum local encontrado.</p>
            </div>
        `;
        return;
    }

    list.forEach(item => {
        const isFav = placeFavorites.includes(item.name);
        const card = document.createElement('div');
        card.className = `place-card ${item.isCity ? 'is-city' : 'is-island'} ${isFav ? 'is-favorite' : ''}`;

        const iconHtml = item.isCity 
            ? '<i class="fa-solid fa-city"></i>' 
            : '<i class="fa-solid fa-water"></i>';

        card.innerHTML = `
            <div class="place-icon">${iconHtml}</div>
            <div class="place-details">
                <div class="place-name">${item.name}</div>
                <div class="place-badges">
                    <span class="place-badge-region">${item.regionLabel}</span>
                    <span class="place-badge-region" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8;">Z: ${item.z}</span>
                    <span class="place-badge-coords">(${item.x}, ${item.y})</span>
                </div>
            </div>
            <button class="place-fav-btn ${isFav ? 'active' : ''}" onclick="togglePlaceFavorite(event, '${item.name}')" data-tooltip="${isFav ? 'Remover Favorito' : 'Favoritar'}">
                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>
        `;

        card.addEventListener('click', () => {
            teleportToPlace(item);
        });

        container.appendChild(card);
    });
}

function teleportToPlace(place) {
    // 1. Muda de região se necessário
    const targetRegion = place.regionKey || 'kanto';
    const regionSelector = document.getElementById('region-selector');

    if (currentRegion !== targetRegion) {
        if (regionSelector) regionSelector.value = targetRegion;
        clearList();
        map.removeLayer(floors[currentRegion][curFloor]);
        currentRegion = targetRegion;
        curFloor = place.z || regionConfigs[currentRegion].defaultFloor;
        limitX = regionConfigs[currentRegion].limitX;
        limitY = regionConfigs[currentRegion].limitY;
        map.setMaxBounds(regionConfigs[currentRegion].bounds);
        floors[currentRegion][curFloor].addTo(map);
    } else if (curFloor !== place.z) {
        changeFloor(place.z);
    }

    // 2. Foca no ponto exato
    focusPoint(place.x, place.y, place.z, 2);
    closeAllDrawers();
    showToast(`Viajando para ${place.name}!`, 'success');
}

// =========================================
// MENU LATERAL DE CONFIGURAÇÕES (SETTINGS)
// =========================================

window.toggleSettingsDrawer = function() {
    const drawer = document.getElementById('settings-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const placesDrawer = document.getElementById('places-drawer');
    if (placesDrawer) placesDrawer.classList.remove('active');

    if (drawer) {
        drawer.classList.toggle('active');
        const isActive = drawer.classList.contains('active');
        if (backdrop) backdrop.classList.toggle('active', isActive);
        if (isActive) syncSettingsUI();
    }
};

window.closeSettingsDrawer = function() {
    const drawer = document.getElementById('settings-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
};

function syncSettingsUI() {
    const elShowLabels = document.getElementById('setting-show-labels');
    if (elShowLabels) elShowLabels.checked = showMapLocations;

    const elOpacity = document.getElementById('setting-labels-opacity');
    const elOpacityLabel = document.getElementById('setting-opacity-val-label');
    if (elOpacity) elOpacity.value = labelsOpacitySetting;
    if (elOpacityLabel) elOpacityLabel.innerText = labelsOpacitySetting + '%';

    const elScope = document.getElementById('setting-label-scope');
    if (elScope) elScope.value = labelScopeSetting;

    const elCoords = document.getElementById('setting-show-coords');
    if (elCoords) elCoords.checked = showCoordsSetting;

    const elSpawns = document.getElementById('setting-show-spawns');
    if (elSpawns) elSpawns.checked = showSpawnsSetting;

    const elAlwaysOnTop = document.getElementById('setting-always-on-top');
    const mainAlwaysOnTop = document.getElementById('always-on-top');
    if (elAlwaysOnTop && mainAlwaysOnTop) elAlwaysOnTop.checked = mainAlwaysOnTop.checked;
}

window.toggleSettingShowLabels = function(checked) {
    showMapLocations = checked;
    localStorage.setItem('finderShowLocations', checked);
    const btnToggle = document.getElementById('btn-toggle-labels');
    if (btnToggle) {
        if (checked) btnToggle.classList.add('active');
        else btnToggle.classList.remove('active');
    }
    updateLocationLabels();
    showToast(checked ? 'Nomes no mapa ativados' : 'Nomes no mapa ocultados', 'info');
};

window.updateSettingLabelsOpacity = function(val) {
    labelsOpacitySetting = parseInt(val, 10);
    localStorage.setItem('finder_setting_labels_opacity', labelsOpacitySetting);
    document.documentElement.style.setProperty('--map-labels-opacity', (labelsOpacitySetting / 100).toString());
    const label = document.getElementById('setting-opacity-val-label');
    if (label) label.innerText = labelsOpacitySetting + '%';
};

window.updateSettingLabelScope = function(scope) {
    labelScopeSetting = scope;
    localStorage.setItem('finder_setting_label_scope', scope);
    updateLocationLabels();
    showToast(scope === 'cities' ? 'Exibindo apenas cidades' : 'Exibindo cidades e ilhas', 'info');
};

window.toggleSettingShowCoords = function(checked) {
    showCoordsSetting = checked;
    localStorage.setItem('finder_setting_show_coords', checked);
    const coordsDisplay = document.getElementById('coords-display');
    if (coordsDisplay) coordsDisplay.style.display = checked ? 'block' : 'none';
};

window.toggleSettingShowSpawns = function(checked) {
    showSpawnsSetting = checked;
    localStorage.setItem('finder_setting_show_spawns', checked);
    if (!checked) spawnsLayer.clearLayers();
    else if (shouldShowSpawns()) markSpawnPoints(getPointsToMarkSpawn());
};

window.toggleSettingAlwaysOnTop = function(checked) {
    const mainAlwaysOnTop = document.getElementById('always-on-top');
    if (mainAlwaysOnTop) mainAlwaysOnTop.checked = checked;
    if (window.electronAPI && window.electronAPI.toggleAlwaysOnTop) {
        window.electronAPI.toggleAlwaysOnTop(checked);
    }
};

window.restoreDefaultSettings = function() {
    showMapLocations = true;
    labelsOpacitySetting = 78;
    labelScopeSetting = 'both';
    showCoordsSetting = true;
    showSpawnsSetting = true;

    localStorage.setItem('finderShowLocations', true);
    localStorage.setItem('finder_setting_labels_opacity', 78);
    localStorage.setItem('finder_setting_label_scope', 'both');
    localStorage.setItem('finder_setting_show_coords', true);
    localStorage.setItem('finder_setting_show_spawns', true);

    document.documentElement.style.setProperty('--map-labels-opacity', '0.78');
    syncSettingsUI();
    updateLocationLabels();
    
    const coordsDisplay = document.getElementById('coords-display');
    if (coordsDisplay) coordsDisplay.style.display = 'block';

    showToast('Configurações restauradas para o padrão!', 'success');
};

// Sincroniza visibilidade das coordenadas na inicialização
window.addEventListener('DOMContentLoaded', () => {
    const coordsDisplay = document.getElementById('coords-display');
    if (coordsDisplay && !showCoordsSetting) coordsDisplay.style.display = 'none';
});

map.on('zoomend', function () {
    if (shouldShowSpawns()) {
        markSpawnPoints(getPointsToMarkSpawn());
    } else {
        spawnsLayer.clearLayers();
    }
    updateLocationLabels();
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
    updateLocationLabels();
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

const btnToggleLabels = document.getElementById('btn-toggle-labels');
if (btnToggleLabels) {
    if (showMapLocations) btnToggleLabels.classList.add('active');
    else btnToggleLabels.classList.remove('active');

    btnToggleLabels.addEventListener('click', () => {
        showMapLocations = !showMapLocations;
        localStorage.setItem('finderShowLocations', showMapLocations);
        if (showMapLocations) btnToggleLabels.classList.add('active');
        else btnToggleLabels.classList.remove('active');
        updateLocationLabels();
        showToast(showMapLocations ? 'Nomes de cidades ativados' : 'Nomes de cidades ocultados', 'success');
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
    updateLocationLabels();
}

map.on('mousemove', function (e) {
    const x = Math.floor(e.latlng.lng);
    const y = Math.floor(e.latlng.lat);
    display.innerText = `(${x}, ${y}, ${curFloor})`;
});

// Clique no mapa: Insere Pin E COPIA a coordenada exata
map.on('click', function (e) {
    if (activeSelector) map.removeLayer(activeSelector);
    if (activeCross) map.removeLayer(activeCross);

    const intX = Math.floor(e.latlng.lng);
    const intY = Math.floor(e.latlng.lat);
    const x = intX + 0.5; const y = intY + 0.5; const raio = 0.5;

    activeSelector = L.rectangle([[intY + 1, intX + 1], [intY, intX]], { color: "#333333", weight: 1, fillOpacity: 0, smoothFactor: 0, interactive: false }).addTo(map);
    const linhaV = L.polyline([[0, x], [limitY, x]], { color: '#333333', weight: 1, interactive: false });
    const linhaH = L.polyline([[y, 0], [y, limitX]], { color: '#333333', weight: 1, interactive: false });
    activeCross = L.layerGroup([linhaV, linhaH]).addTo(map);

    lastPastedPoint = { x: intX, y: intY, z: curFloor };
    const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });

    if (userPin) map.removeLayer(userPin);
    userPin = L.marker([y, x], { icon: locationIcon }).addTo(map);

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
    registerFinderUsage(1);
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
        const mapX = px; const mapY = py;
        lastPastedPoint = { x: mapX, y: mapY, z: pz };
        focusPoint(mapX, mapY, pz, map.getZoom());

        const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });
        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([mapY + 0.5, mapX + 0.5], { icon: locationIcon }).addTo(map);

        triggerPasteFeedback(true, 'Colado!');
        return true;
    } catch (err) {
        triggerPasteFeedback(false, 'Erro'); return false;
    }
}

function degToRad(deg) { return deg * (Math.PI / 180); }

// Geração precisa dos polígonos de busca no grid
function getPoints(pos, ang, distMin, distMax) {
    const cx = pos.x + 0.5;
    const cy = pos.y + 0.5;

    if (ang === -45) {
        const r = distMax + 0.5;
        return [
            { x: cx - r, y: cy - r },
            { x: cx + r, y: cy - r },
            { x: cx + r, y: cy + r },
            { x: cx - r, y: cy + r }
        ];
    }

    const outerR = distMax + 0.5;
    const innerR = distMin > 0 ? Math.max(0, distMin - 0.5) : 0;

    const angles = [ang - 22.5, ang, ang + 22.5];
    const outerPoints = angles.map(a => {
        const rad = degToRad(a);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const div = Math.max(Math.abs(cos), Math.abs(sin));
        return { x: cx + (cos / div) * outerR, y: cy + (sin / div) * outerR };
    });

    if (innerR === 0) {
        return [{ x: cx, y: cy }, ...outerPoints];
    }

    const innerAngles = [ang + 22.5, ang, ang - 22.5];
    const innerPoints = innerAngles.map(a => {
        const rad = degToRad(a);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const div = Math.max(Math.abs(cos), Math.abs(sin));
        return { x: cx + (cos / div) * innerR, y: cy + (sin / div) * innerR };
    });

    return [...outerPoints, ...innerPoints];
}

function pixelatePolygon(geomOrFeature) {
    const geom = geomOrFeature.geometry || geomOrFeature;

    function pixelateRing(coords) {
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
        
        return newCoords.length >= 4 ? newCoords : coords;
    }

    if (geom.type === 'Polygon') {
        const rings = geom.coordinates.map(ring => pixelateRing(ring));
        return turf.polygon(rings);
    } else if (geom.type === 'MultiPolygon') {
        const multiRings = geom.coordinates.map(poly => poly.map(ring => pixelateRing(ring)));
        return turf.multiPolygon(multiRings);
    }
    return geomOrFeature;
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

function pointToPolygonDist(px, py, geomOrFeature) {
    const geom = geomOrFeature.geometry || geomOrFeature;
    let rings = [];
    if (geom.type === 'Polygon') {
        rings = geom.coordinates;
    } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach(polyCoords => {
            polyCoords.forEach(ring => rings.push(ring));
        });
    }

    let minDist = Infinity;
    let p = { x: px, y: py };

    for (let r = 0; r < rings.length; r++) {
        const coords = rings[r];
        for (let i = 0; i < coords.length - 1; i++) {
            let v = { x: coords[i][0], y: coords[i][1] };
            let w = { x: coords[i+1][0], y: coords[i+1][1] };
            let d2 = distToSegmentSquared(p, v, w);
            if (d2 < minDist) minDist = d2;
        }
    }
    return Math.sqrt(minDist);
}

function shouldShowSpawns() {
    if (!intersection.polygon || !intersection.box || infos.length === 0) return false;
    const [xMin, yMin, xMax, yMax] = intersection.box;
    const width = xMax - xMin;
    const height = yMax - yMin;
    // Exibe os ícones sempre que a área atual tiver tamanho de até 30 tiles de raio (~65-70 tiles de diâmetro)
    return width <= 70 && height <= 70;
}

function updateMarks() {
    calcIntersection();
    if (intersection.mark) {
        intersection.mark.addTo(map);
        
        if (shouldShowSpawns()) {
            markSpawnPoints(getPointsToMarkSpawn());
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
        span.innerText = `${info.x}, ${info.y}, ${info.z} `;
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
        
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
        
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
    resetSearchSession();

    if (isHomeToggleActive && homePoints[currentRegion]) {
        const hp = homePoints[currentRegion];
        lastPastedPoint = { ...hp };
        focusPoint(hp.x, hp.y, hp.z, map.getZoom());
        const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });
        if (userPin) map.removeLayer(userPin);
        userPin = L.marker([hp.y + 0.5, hp.x + 0.5], { icon: locationIcon }).addTo(map);
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

            const pt = turf.point([pos.x + 0.5, pos.y + 0.5]);
            const isInside = turf.booleanPointInPolygon(pt, intersection.polygon, { ignoreBoundary: false });
            
            if (isInside) {
                return { ...pos, status: 'inside' };
            } else {
                const dist = pointToPolygonDist(pos.x + 0.5, pos.y + 0.5, intersection.polygon);
                if (dist <= 0.6) {
                    return { ...pos, status: 'inside' };
                } else if (dist <= margin) {
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

    // Escala de tamanho progressiva e compacta no zoom-out
    let size = 22;
    if (currentZoom >= 4) size = 30;
    else if (currentZoom === 3) size = 26;
    else if (currentZoom === 2) size = 20;
    else if (currentZoom === 1) size = 15;
    else if (currentZoom === 0) size = 11;
    else if (currentZoom === -1) size = 8;
    else if (currentZoom <= -2) return; // Oculta quando muito afastado para não poluir

    const borderWidth = size <= 14 ? 1 : 2;
    const shadow = size <= 14 ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.6)';
    const imgSize = size <= 10 ? '88%' : '72%';

    points.forEach(point => {
        if (!point.pokemon) return;

        const capitalizedName = point.pokemon.charAt(0).toUpperCase() + point.pokemon.slice(1);

        let borderColor = '#3b82f6';
        let bgColor = 'rgba(15, 23, 42, 0.9)';
        if (point.status === 'near') {
            borderColor = '#ef4444';
            bgColor = 'rgba(60, 15, 15, 0.9)';
        }

        const pokemonIcon = L.divIcon({
            className: '',
            html: `
                <div style="
                    width: 100%;
                    height: 100%;
                    background-color: ${bgColor};
                    border: ${borderWidth}px solid ${borderColor};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: ${shadow};
                    box-sizing: border-box;
                ">
                    <img src="pokemon_icons/${capitalizedName}.png" style="width: ${imgSize}; height: ${imgSize}; object-fit: contain;">
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });

        const marker = L.marker([point.y + 0.5, point.x + 0.5], {
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
            intersection.polygon = curIntersection;
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

// =========================================
// SISTEMA DE BI & LIVE SEARCH TRACKER
// =========================================

let biHistory = JSON.parse(localStorage.getItem('finder_bi_history')) || [];
let searchSession = {
    active: false,
    startTime: null,
    elapsedSeconds: 0,
    findersUsed: 0,
    timerInterval: null
};

function formatTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds)) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
}

function updateLiveTrackerUI() {
    const findersEl = document.getElementById('live-finders-count');
    const timerEl = document.getElementById('live-timer-display');
    if (findersEl) findersEl.innerText = searchSession.findersUsed;
    if (timerEl) timerEl.innerText = formatTime(searchSession.elapsedSeconds);
}

function registerFinderUsage(count = 1) {
    if (!searchSession.active) {
        searchSession.active = true;
        searchSession.startTime = Date.now();
        searchSession.elapsedSeconds = 0;
        searchSession.findersUsed = count;
        
        if (searchSession.timerInterval) clearInterval(searchSession.timerInterval);
        searchSession.timerInterval = setInterval(() => {
            if (searchSession.active && searchSession.startTime) {
                searchSession.elapsedSeconds = Math.floor((Date.now() - searchSession.startTime) / 1000);
                updateLiveTrackerUI();
            }
        }, 1000);
    } else {
        searchSession.findersUsed += count;
    }
    updateLiveTrackerUI();
}

function resetSearchSession() {
    if (searchSession.timerInterval) {
        clearInterval(searchSession.timerInterval);
        searchSession.timerInterval = null;
    }
    searchSession.active = false;
    searchSession.startTime = null;
    searchSession.elapsedSeconds = 0;
    searchSession.findersUsed = 0;
    updateLiveTrackerUI();
}

// Modal de Registro Rápido (Encounter Modal)
let selectedEncounterType = 'chest';

window.openEncounterModal = function() {
    const modalOverlay = document.getElementById('encounter-modal-overlay');
    if (!modalOverlay) return;
    
    selectedEncounterType = 'chest';
    selectEncounterType('chest');
    
    const findersCount = Math.max(1, searchSession.findersUsed || (infos.length > 0 ? infos.length : 1));
    const countDisplay = document.getElementById('modal-finders-display');
    if (countDisplay) {
        countDisplay.innerText = findersCount;
    }
    
    const timeDisplay = document.getElementById('modal-time-display');
    if (timeDisplay) {
        timeDisplay.innerText = formatTime(searchSession.elapsedSeconds || 0);
    }

    // Coord atual opcional
    const modalCoord = document.getElementById('modal-coord-input');
    if (modalCoord) {
        modalCoord.value = infos.length > 0 ? `${infos[infos.length-1].x}, ${infos[infos.length-1].y}, ${infos[infos.length-1].z}` : 'Nenhuma';
    }
    
    modalOverlay.classList.add('visible');
};

window.closeEncounterModal = function() {
    const modalOverlay = document.getElementById('encounter-modal-overlay');
    if (modalOverlay) modalOverlay.classList.remove('visible');
};

window.selectEncounterType = function(type) {
    selectedEncounterType = type;
    const chestCard = document.getElementById('btn-type-chest');
    const dungeonCard = document.getElementById('btn-type-dungeon');
    
    if (type === 'chest') {
        if (chestCard) chestCard.classList.add('active');
        if (dungeonCard) dungeonCard.classList.remove('active');
    } else {
        if (chestCard) chestCard.classList.remove('active');
        if (dungeonCard) dungeonCard.classList.add('active');
    }
};

window.pasteLootToModalInput = async function() {
    try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('modal-loot-input');
        if (input) {
            input.value = text;
            showToast('Loot colado com sucesso!', 'success');
        }
    } catch (err) {
        showToast('Erro ao ler a área de transferência', 'error');
    }
};

window.saveEncounterLog = function() {
    const findersDisplay = document.getElementById('modal-finders-display');
    const finders = findersDisplay ? (parseInt(findersDisplay.innerText) || 1) : 1;
    const durationSeconds = searchSession.elapsedSeconds || 0;
    const lootInput = document.getElementById('modal-loot-input');
    const lootText = lootInput ? lootInput.value.trim() : '';
    
    const logEntry = {
        id: Date.now().toString(),
        type: selectedEncounterType,
        finders: finders,
        durationSeconds: durationSeconds,
        region: currentRegion,
        timestamp: Date.now()
    };
    
    biHistory.unshift(logEntry);
    localStorage.setItem('finder_bi_history', JSON.stringify(biHistory));
    
    // Se o usuário colou a mensagem de loot junto
    if (lootText) {
        const parsed = parseLootMessage(lootText, selectedEncounterType);
        if (parsed.length > 0) {
            parsed.forEach(p => lootHistory.unshift(p));
            localStorage.setItem('finder_loot_history', JSON.stringify(lootHistory));
        }
        if (lootInput) lootInput.value = '';
    }
    
    closeEncounterModal();
    showToast((selectedEncounterType === 'chest' ? 'Baú' : 'Dungeon') + ' registrado com sucesso!', 'success');
    clearList();
};

// =========================================
// SISTEMA DE CONTADOR DE LOOT & ABAS
// =========================================

let lootHistory = JSON.parse(localStorage.getItem('finder_loot_history')) || [];
let currentBiTab = 'overview';

function parseLootMessage(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const results = [];

    for (const line of lines) {
        let time = null;
        let itemsStr = line;

        const timeMatch = line.match(/^(\d{1,2}:\d{2})\s+/);
        if (timeMatch) time = timeMatch[1];

        const contentMatch = line.match(/voc[eê]\s+recebeu\s+(.+?)(?:\s+como\s+recompensa|\.|$)/i);
        if (contentMatch) {
            itemsStr = contentMatch[1];
        } else {
            itemsStr = itemsStr.replace(/^(\d{1,2}:\d{2}\s+)?(parab[eé]ns!\s+)?/i, '')
                               .replace(/\s+como\s+recompensa.*$/i, '')
                               .replace(/\.$/, '');
        }

        itemsStr = itemsStr.replace(/\.$/, '');
        const rawItems = itemsStr.split(/,|\be\b/).map(s => s.trim()).filter(Boolean);
        const parsedItems = [];

        for (const rawItem of rawItems) {
            const itemMatch = rawItem.match(/^(\d+)\s+(.+)$/);
            let count = 1;
            let name = rawItem;

            if (itemMatch) {
                count = parseInt(itemMatch[1], 10);
                name = itemMatch[2].trim();
            }

            name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            if (name.toLowerCase() === 'gold bar' || name.toLowerCase() === 'gold bars') name = 'Gold Bar';
            if (name.toLowerCase() === 'gold coin' || name.toLowerCase() === 'gold coins') name = 'Gold Coin';

            parsedItems.push({ name, count });
        }

        if (parsedItems.length > 0) {
            results.push({
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                raw: line,
                time: time,
                items: parsedItems,
                region: currentRegion,
                timestamp: Date.now()
            });
        }
    }

    return results;
}

window.switchBiTab = function(tabName) {
    currentBiTab = tabName;
    const btnOverview = document.getElementById('bi-tab-btn-overview');
    const btnLoot = document.getElementById('bi-tab-btn-loot');
    const paneOverview = document.getElementById('bi-tab-content-overview');
    const paneLoot = document.getElementById('bi-tab-content-loot');

    if (tabName === 'overview') {
        if (btnOverview) btnOverview.classList.add('active');
        if (btnLoot) btnLoot.classList.remove('active');
        if (paneOverview) paneOverview.style.display = 'flex';
        if (paneLoot) paneLoot.style.display = 'none';
        updateBiView();
    } else {
        if (btnOverview) btnOverview.classList.remove('active');
        if (btnLoot) btnLoot.classList.add('active');
        if (paneOverview) paneOverview.style.display = 'none';
        if (paneLoot) paneLoot.style.display = 'flex';
        updateLootView();
    }
};

window.pasteLootFromClipboard = async function() {
    try {
        const text = await navigator.clipboard.readText();
        const textarea = document.getElementById('loot-paste-textarea');
        if (textarea) {
            textarea.value = text;
            showToast('Texto colado no campo!', 'success');
        }
    } catch (err) {
        showToast('Erro ao acessar área de transferência', 'error');
    }
};

window.processLootFromTextarea = function() {
    const textarea = document.getElementById('loot-paste-textarea');
    if (!textarea || !textarea.value.trim()) {
        showCustomAlert('Cole pelo menos uma mensagem de loot do chat para processar!', 'Atenção');
        return;
    }

    const parsedResults = parseLootMessage(textarea.value.trim());
    if (parsedResults.length === 0) {
        showCustomAlert('Nenhum item válido foi reconhecido na mensagem.', 'Formato Inválido');
        return;
    }

    parsedResults.forEach(r => lootHistory.unshift(r));
    localStorage.setItem('finder_loot_history', JSON.stringify(lootHistory));
    textarea.value = '';
    
    updateLootView();
    showToast(`${parsedResults.length} registro(s) de loot adicionado(s)!`, 'success');
};

window.updateLootView = function() {
    const filterSelect = document.getElementById('bi-region-filter');
    const regionFilter = filterSelect ? filterSelect.value : 'all';

    let filtered = lootHistory;
    if (regionFilter !== 'all') {
        filtered = lootHistory.filter(item => item.region === regionFilter);
    }

    let totalGoldBars = 0;
    let totalGoldCoins = 0;
    let totalSpecialItems = 0;
    const consolidatedMap = {};

    filtered.forEach(entry => {
        entry.items.forEach(it => {
            if (it.name === 'Gold Bar') {
                totalGoldBars += it.count;
            } else if (it.name === 'Gold Coin') {
                totalGoldCoins += it.count;
            } else {
                totalSpecialItems += it.count;
            }

            if (!consolidatedMap[it.name]) {
                consolidatedMap[it.name] = {
                    name: it.name,
                    totalCount: 0,
                    occurrences: 0
                };
            }
            consolidatedMap[it.name].totalCount += it.count;
            consolidatedMap[it.name].occurrences += 1;
        });
    });

    const elGoldBars = document.getElementById('kpi-total-gold-bars');
    if (elGoldBars) elGoldBars.innerText = totalGoldBars.toLocaleString();

    const elGoldCoins = document.getElementById('kpi-total-gold-coins');
    if (elGoldCoins) elGoldCoins.innerText = totalGoldCoins.toLocaleString();

    const elSpecial = document.getElementById('kpi-total-special-items');
    if (elSpecial) elSpecial.innerText = totalSpecialItems.toLocaleString();

    const tbody = document.getElementById('loot-consolidated-tbody');
    const emptyState = document.getElementById('loot-empty-state');

    if (tbody) {
        tbody.innerHTML = '';
        const itemList = Object.values(consolidatedMap);

        // Ordena colocando Gold Bars e Gold Coins no topo, depois por quantidade
        itemList.sort((a, b) => {
            if (a.name === 'Gold Bar') return -1;
            if (b.name === 'Gold Bar') return 1;
            if (a.name === 'Gold Coin') return -1;
            if (b.name === 'Gold Coin') return 1;
            return b.totalCount - a.totalCount;
        });

        if (itemList.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            const totalDrops = filtered.length;

            itemList.forEach(item => {
                const tr = document.createElement('tr');
                const avg = totalDrops > 0 ? (item.totalCount / totalDrops).toFixed(1) : item.totalCount;

                let iconStyle = '';
                if (item.name === 'Gold Bar') iconStyle = '<img src="imgs_finder/gold bar.png" class="table-loot-img" alt="Gold Bar">';
                else if (item.name === 'Gold Coin') iconStyle = '<img src="imgs_finder/gold coin.png" class="table-loot-img" alt="Gold Coin">';
                else iconStyle = '<i class="fa-solid fa-gem" style="color: #c084fc; margin-right: 6px;"></i>';

                tr.innerHTML = `
                    <td><strong>${iconStyle} ${item.name}</strong></td>
                    <td><strong style="color: #f8fafc; font-size: 13px;">${item.totalCount.toLocaleString()}</strong></td>
                    <td style="color: #94a3b8;">${item.occurrences}x</td>
                    <td style="color: #38bdf8; font-family: monospace;">${avg}/drop</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
};

window.clearLootHistory = function() {
    if (lootHistory.length === 0) {
        showCustomAlert('O histórico de loot já está vazio!', 'Aviso');
        return;
    }
    showCustomPrompt('Digite LIMPAR para apagar todos os registros de loot:', 'Limpar Histórico de Loot', (input) => {
        if (input && input.trim().toUpperCase() === 'LIMPAR') {
            lootHistory = [];
            localStorage.setItem('finder_loot_history', JSON.stringify(lootHistory));
            updateLootView();
            showToast('Histórico de loots limpo com sucesso!', 'success');
        } else if (input !== null) {
            showCustomAlert('Confirmação inválida. Os loots não foram alterados.', 'Cancelado');
        }
    });
};

// =========================================
// EXPORTAÇÃO DE PLANILHAS (CSV / EXCEL)
// =========================================

function downloadCsvFallback(filename, csvContent) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.exportBiHistoryToCsv = async function() {
    if (!biHistory || biHistory.length === 0) {
        showCustomAlert('Nenhuma caçada registrada para exportar!', 'Aviso');
        return;
    }

    let csv = 'Data / Hora;Tipo;Finders Gastos;Duração (segundos);Tempo Formatado;Região\n';
    biHistory.forEach(item => {
        const typeStr = item.type === 'chest' ? 'Baú' : 'Dungeon';
        csv += `"${formatDate(item.timestamp)}";"${typeStr}";${item.finders};${item.durationSeconds || 0};"${formatTime(item.durationSeconds)}";"${item.region || 'kanto'}"\n`;
    });

    if (window.electronAPI && window.electronAPI.saveCsvFile) {
        const res = await window.electronAPI.saveCsvFile('historico_cacadas.csv', csv);
        if (res.success) {
            showToast('Planilha de Caçadas salva na pasta "planilhas"!', 'success');
        } else {
            downloadCsvFallback('historico_cacadas.csv', csv);
            showToast('Planilha de Caçadas exportada!', 'success');
        }
    } else {
        downloadCsvFallback('historico_cacadas.csv', csv);
        showToast('Planilha de Caçadas exportada!', 'success');
    }
};

window.exportLootHistoryToCsv = async function() {
    if (!lootHistory || lootHistory.length === 0) {
        showCustomAlert('Nenhum loot registrado para exportar!', 'Aviso');
        return;
    }

    // 1. Resumo Consolidado de Itens
    const consolidatedMap = {};
    lootHistory.forEach(entry => {
        entry.items.forEach(it => {
            if (!consolidatedMap[it.name]) consolidatedMap[it.name] = { name: it.name, totalCount: 0, occurrences: 0 };
            consolidatedMap[it.name].totalCount += it.count;
            consolidatedMap[it.name].occurrences += 1;
        });
    });

    let csv = 'RESUMO CONSOLIDADO DE ITENS\n';
    csv += 'Item;Quantidade Total;Total de Drops;Média por Abertura\n';
    const totalDrops = lootHistory.length;
    Object.values(consolidatedMap).forEach(it => {
        const avg = totalDrops > 0 ? (it.totalCount / totalDrops).toFixed(2) : it.totalCount;
        csv += `"${it.name}";${it.totalCount};${it.occurrences};"${avg}"\n`;
    });

    csv += '\n\nHISTÓRICO DETALHADO DE MENSAGENS\n';
    csv += 'Data / Hora;Mensagem Original;Itens Extraídos;Região\n';
    lootHistory.forEach(entry => {
        const itemsStr = entry.items.map(i => `${i.count}x ${i.name}`).join(', ');
        csv += `"${formatDate(entry.timestamp)}";"${(entry.raw || '').replace(/"/g, '""')}";"${itemsStr}";"${entry.region || 'kanto'}"\n`;
    });

    if (window.electronAPI && window.electronAPI.saveCsvFile) {
        const res = await window.electronAPI.saveCsvFile('historico_loots.csv', csv);
        if (res.success) {
            showToast('Planilha de Loots salva na pasta "planilhas"!', 'success');
        } else {
            downloadCsvFallback('historico_loots.csv', csv);
            showToast('Planilha de Loots exportada!', 'success');
        }
    } else {
        downloadCsvFallback('historico_loots.csv', csv);
        showToast('Planilha de Loots exportada!', 'success');
    }
};

window.openSpreadsheetFolder = function() {
    if (window.electronAPI && window.electronAPI.openCsvFolder) {
        window.electronAPI.openCsvFolder();
    } else {
        showCustomAlert('As planilhas são salvas no seu navegador / pasta do aplicativo.', 'Informação');
    }
};

// Modal do Dashboard de BI
window.openBiDashboard = function() {
    const modalOverlay = document.getElementById('bi-modal-overlay');
    if (!modalOverlay) return;
    modalOverlay.classList.add('visible');
    if (currentBiTab === 'loot') {
        updateLootView();
    } else {
        updateBiView();
    }
};

window.closeBiDashboard = function() {
    const modalOverlay = document.getElementById('bi-modal-overlay');
    if (modalOverlay) modalOverlay.classList.remove('visible');
};

window.updateBiView = function() {
    const filterSelect = document.getElementById('bi-region-filter');
    const regionFilter = filterSelect ? filterSelect.value : 'all';
    
    let filtered = biHistory;
    if (regionFilter !== 'all') {
        filtered = biHistory.filter(item => item.region === regionFilter);
    }
    
    const totalChests = filtered.filter(d => d.type === 'chest').length;
    const totalDungeons = filtered.filter(d => d.type === 'dungeon').length;
    const totalEncounters = totalChests + totalDungeons;
    
    const chestPercent = totalEncounters > 0 ? Math.round((totalChests / totalEncounters) * 100) : 0;
    const dungeonPercent = totalEncounters > 0 ? (100 - chestPercent) : 0;
    
    const totalChestFinders = filtered.filter(d => d.type === 'chest').reduce((sum, d) => sum + d.finders, 0);
    const avgFindersChest = totalChests > 0 ? (totalChestFinders / totalChests).toFixed(1) : '0.0';
    
    const totalDungeonFinders = filtered.filter(d => d.type === 'dungeon').reduce((sum, d) => sum + d.finders, 0);
    const avgFindersDungeon = totalDungeons > 0 ? (totalDungeonFinders / totalDungeons).toFixed(1) : '0.0';
    
    const totalFinders = filtered.reduce((sum, d) => sum + d.finders, 0);
    const totalDuration = filtered.reduce((sum, d) => sum + (d.durationSeconds || 0), 0);
    const avgTimeSecs = totalEncounters > 0 ? Math.round(totalDuration / totalEncounters) : 0;
    
    // Atualiza KPIs
    const elChests = document.getElementById('kpi-total-chests');
    if (elChests) elChests.innerText = totalChests;
    const elChestPct = document.getElementById('kpi-chest-percent');
    if (elChestPct) elChestPct.innerText = `${chestPercent}%`;
    
    const elDungeons = document.getElementById('kpi-total-dungeons');
    if (elDungeons) elDungeons.innerText = totalDungeons;
    const elDungeonPct = document.getElementById('kpi-dungeon-percent');
    if (elDungeonPct) elDungeonPct.innerText = `${dungeonPercent}%`;
    
    const elAvgChest = document.getElementById('kpi-avg-finders-chest');
    if (elAvgChest) elAvgChest.innerText = avgFindersChest;
    
    const elAvgDungeon = document.getElementById('kpi-avg-finders-dungeon');
    if (elAvgDungeon) elAvgDungeon.innerText = avgFindersDungeon;
    
    const elAvgTime = document.getElementById('kpi-avg-time');
    if (elAvgTime) elAvgTime.innerText = formatTime(avgTimeSecs);
    
    const elTotalFinders = document.getElementById('kpi-total-finders');
    if (elTotalFinders) elTotalFinders.innerText = totalFinders;
    
    // Barra de Proporção
    const ratioChest = document.getElementById('ratio-chest-count');
    if (ratioChest) ratioChest.innerText = `${totalChests} (${chestPercent}%)`;
    const ratioDungeon = document.getElementById('ratio-dungeon-count');
    if (ratioDungeon) ratioDungeon.innerText = `${totalDungeons} (${dungeonPercent}%)`;
    
    const barChest = document.getElementById('ratio-bar-chest');
    const barDungeon = document.getElementById('ratio-bar-dungeon');
    if (barChest && barDungeon) {
        if (totalEncounters === 0) {
            barChest.style.width = '50%';
            barDungeon.style.width = '50%';
        } else {
            barChest.style.width = `${chestPercent}%`;
            barDungeon.style.width = `${dungeonPercent}%`;
        }
    }
    
    // Tabela de Histórico
    const tbody = document.getElementById('bi-history-tbody');
    const emptyState = document.getElementById('bi-empty-state');
    
    if (tbody) {
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            filtered.forEach((item, index) => {
                const tr = document.createElement('tr');
                const badgeClass = item.type === 'chest' ? 'chest' : 'dungeon';
                const typeIcon = item.type === 'chest' ? '<img src="imgs_finder/chest.png" class="mini-chest-icon" alt="Baú"> Baú' : '<i class="fa-solid fa-dungeon"></i> Dungeon';
                
                tr.innerHTML = `
                    <td>${filtered.length - index}</td>
                    <td><span class="badge-type ${badgeClass}">${typeIcon}</span></td>
                    <td><strong>${item.finders}</strong></td>
                    <td style="font-family: monospace; color: #38bdf8;">${formatTime(item.durationSeconds)}</td>
                    <td style="text-transform: capitalize; color: #94a3b8;">${item.region || 'kanto'}</td>
                    <td style="color: #64748b; font-size: 11px;">${formatDate(item.timestamp)}</td>
                    <td>
                        <button class="btn-del-log" onclick="deleteBiLogEntry('${item.id}')" data-tooltip="Excluir Registro">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
};

window.deleteBiLogEntry = function(id) {
    biHistory = biHistory.filter(item => item.id !== id);
    localStorage.setItem('finder_bi_history', JSON.stringify(biHistory));
    updateBiView();
    showToast('Registro excluído com sucesso!', 'success');
};

window.clearBiHistory = function() {
    if (biHistory.length === 0) {
        showCustomAlert('O histórico já está vazio!', 'Aviso');
        return;
    }
    showCustomPrompt('Digite LIMPAR para apagar todo o histórico de caçadas:', 'Limpar Histórico de BI', (input) => {
        if (input && input.trim().toUpperCase() === 'LIMPAR') {
            biHistory = [];
            localStorage.setItem('finder_bi_history', JSON.stringify(biHistory));
            updateBiView();
            showToast('Todo o histórico de BI foi limpo!', 'success');
        } else if (input !== null) {
            showCustomAlert('Confirmação inválida. O histórico não foi alterado.', 'Cancelado');
        }
    });
};

// =========================================
// PICTURE-IN-PICTURE (PIP) MODE
// =========================================
let pipWindow = null;

// Salva as referências originais do document
const origGetId = document.getElementById.bind(document);
const origQuery = document.querySelector.bind(document);
const origQueryAll = document.querySelectorAll.bind(document);

// Proxies globais para redirecionar as buscas pelo DOM para a janela PiP quando ativa
document.getElementById = function(id) {
    if (pipWindow) return pipWindow.document.getElementById(id) || origGetId(id);
    return origGetId(id);
};
document.querySelector = function(sel) {
    if (pipWindow) return pipWindow.document.querySelector(sel) || origQuery(sel);
    return origQuery(sel);
};
document.querySelectorAll = function(sel) {
    if (pipWindow) {
        const pipNodes = pipWindow.document.querySelectorAll(sel);
        return pipNodes.length > 0 ? pipNodes : origQueryAll(sel);
    }
    return origQueryAll(sel);
};

window.togglePictureInPicture = async function() {
    if (!('documentPictureInPicture' in window)) {
        showCustomAlert('Seu navegador não suporta a API de Picture-in-Picture nativa. Você precisa usar o Google Chrome 116+ ou Microsoft Edge.', 'PiP Não Suportado');
        return;
    }

    if (pipWindow) {
        pipWindow.close();
        return;
    }

    try {
        const appContainer = origGetId('app-container'); // Busca no original por segurança
        if (!appContainer) return;

        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 480,
            height: 580
        });

        // Repassar eventos fundamentais da janela filha para a janela mãe (Leaflet Drag e Clicks)
        const eventTypes = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'wheel', 'keydown', 'keyup', 'click', 'contextmenu', 'mousemove', 'mouseup', 'mousedown'];
        eventTypes.forEach(evtType => {
            pipWindow.addEventListener(evtType, (e) => {
                const clonedEvent = new e.constructor(e.type, e);
                document.dispatchEvent(clonedEvent);
            });
        });

        pipWindow.document.body.appendChild(appContainer);
        
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.padding = '0';
        pipWindow.document.body.style.overflow = 'hidden';

        // Copia estilos
        origQueryAll('link[rel="stylesheet"], style').forEach((style) => {
            pipWindow.document.head.appendChild(style.cloneNode(true));
        });

        // Força atualização de tamanho do Leaflet após anexar
        setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 300);

        // Retorna o appContainer quando a janela é fechada
        pipWindow.addEventListener('pagehide', (event) => {
            document.body.appendChild(appContainer);
            pipWindow = null;
            setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 150);
            showToast('Modo PiP desativado. Modo normal restaurado.', 'info');
        });
        
        showToast('Modo Compacto Flutuante (PiP) Ativado!', 'success');

    } catch (err) {
        console.error(err);
        showCustomAlert('Erro ao abrir Overlay PiP: ' + err.message, 'Erro de PiP');
    }
};