import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, LayerGroup, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../store/useStore';
import * as turf from '@turf/turf';
import { calcIntersection } from '../utils/geometry';
import 'leaflet/dist/leaflet.css';

// Leaflet config
const CRSPixel = L.Util.extend(L.CRS.Simple, { transformation: new L.Transformation(1, 0, 1, 0) });
const locationIcon = L.icon({ iconUrl: 'imgs_finder/location.png', iconSize: [24, 24], iconAnchor: [12, 24] });

function MapEvents() {
    const { setLastPastedPoint, setCurCoords, curFloor, regionConfigs, currentRegion } = useStore();
    const map = useMapEvents({
        click: (e) => {
            const intX = Math.floor(e.latlng.lng);
            const intY = Math.floor(e.latlng.lat);
            setLastPastedPoint({ x: intX, y: intY, z: curFloor });
            
            const coordString = `${intX}, ${intY}, ${curFloor}`;
            navigator.clipboard.writeText(coordString)
                .then(() => console.log("Copied: ", coordString))
                .catch(err => console.error("Clipboard error:", err));
        },
        mousemove: (e) => {
            const intX = Math.floor(e.latlng.lng);
            const intY = Math.floor(e.latlng.lat);
            setCurCoords({ x: intX, y: intY });
        }
    });
    
    useEffect(() => {
        const bounds = regionConfigs[currentRegion].bounds;
        map.setMaxBounds(bounds);
        map.setView(regionConfigs[currentRegion].center, 2);
    }, [currentRegion, regionConfigs, map]);

    return null;
}

export default function MapView() {
    const { 
        currentRegion, curFloor, regionConfigs, infos, lastPastedPoint, 
        showMapLocations, allLocations, labelScopeSetting, labelsOpacitySetting,
        showSpawnsSetting, allSpawnMarks
    } = useStore();
    
    const [intersectionData, setIntersectionData] = useState(null);

    useEffect(() => {
        document.documentElement.style.setProperty('--map-labels-opacity', (labelsOpacitySetting / 100).toString());
    }, [labelsOpacitySetting]);

    useEffect(() => {
        const intersection = calcIntersection(infos);
        setIntersectionData(intersection);
    }, [infos]);

    // Calcular locations ativas
    const activeLocations = useMemo(() => {
        if (!showMapLocations) return [];
        let locList = [];
        if (currentRegion === 'kanto') {
            locList = [...(allLocations.Kanto || []), ...(allLocations['Orange Archipelago'] || [])];
        } else if (currentRegion === 'johto') {
            locList = allLocations.Johto || [];
        }

        if (labelScopeSetting === 'cities') {
            locList = locList.filter(loc => loc.isCity);
        }
        return locList.filter(loc => loc.z === curFloor);
    }, [showMapLocations, allLocations, currentRegion, curFloor, labelScopeSetting]);

    // Calcular spawns ativos
    const activeSpawns = useMemo(() => {
        if (!showSpawnsSetting) return [];
        if (!intersectionData || !intersectionData.polygon) return [];
        
        const spawns = allSpawnMarks[currentRegion] || [];
        const floorSpawns = spawns.filter(spawn => spawn.z === curFloor);
        
        return floorSpawns.filter(spawn => {
            try {
                const pt = turf.point([spawn.x, spawn.y]);
                const geom = intersectionData.polygon.geometry || intersectionData.polygon;
                
                if (geom.type === 'MultiPolygon') {
                    for (let coords of geom.coordinates) {
                        if (turf.booleanPointInPolygon(pt, turf.polygon(coords))) return true;
                    }
                    return false;
                } else if (geom.type === 'GeometryCollection') {
                    for (let g of geom.geometries) {
                        if (g.type === 'Polygon' && turf.booleanPointInPolygon(pt, turf.polygon(g.coordinates))) return true;
                    }
                    return false;
                }
                
                return turf.booleanPointInPolygon(pt, intersectionData.polygon);
            } catch (e) {
                return false;
            }
        });
    }, [showSpawnsSetting, allSpawnMarks, currentRegion, curFloor, intersectionData]);
    // Crosshair and User Pin logic
    const limitX = regionConfigs[currentRegion].limitX;
    const limitY = regionConfigs[currentRegion].limitY;
    
    let lastPointEl = null;
    if (lastPastedPoint && lastPastedPoint.z === curFloor) {
        const px = lastPastedPoint.x + 0.5;
        const py = lastPastedPoint.y + 0.5;
        lastPointEl = (
            <LayerGroup>
                <Polyline positions={[[py, 0], [py, limitX]]} pathOptions={{ color: '#333333', weight: 1 }} interactive={false} />
                <Polyline positions={[[0, px], [limitY, px]]} pathOptions={{ color: '#333333', weight: 1 }} interactive={false} />
                <Marker position={[py, px]} icon={locationIcon} />
            </LayerGroup>
        );
    }

    const tileUrl = currentRegion === 'kanto' 
        ? `tiles/${curFloor}/{z}/{x}/{y}.webp` 
        : `tiles_johto/${curFloor}/{z}/{x}/{y}.webp`;

    return (
        <MapContainer 
            center={regionConfigs[currentRegion].center} 
            zoom={2} 
            minZoom={-4} 
            maxZoom={4} 
            crs={CRSPixel} 
            zoomSnap={1} 
            zoomDelta={1} 
            zoomControl={false} 
            attributionControl={false}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
            fadeAnimation={false}
        >
            <TileLayer url={tileUrl} tileSize={1024} noWrap={true} minNativeZoom={0} maxNativeZoom={0} minZoom={-4} maxZoom={4} />
            <MapEvents />
            {lastPointEl}

            {intersectionData && (
                <GeoJSON 
                    data={intersectionData.pixelated} 
                    style={{
                        color: infos[infos.length - 1]?.dist.max <= 30 ? '#00ff00' : infos[infos.length - 1]?.dist.max <= 500 ? '#ffff00' : '#ff0000',
                        weight: 2,
                        fillColor: infos[infos.length - 1]?.dist.max <= 30 ? '#00ff00' : infos[infos.length - 1]?.dist.max <= 500 ? '#ffff00' : '#ff0000',
                        fillOpacity: 0.3
                    }} 
                />
            )}

            {/* Render Locations Labels */}
            {activeLocations.map((loc, idx) => {
                const titleClass = loc.isCity ? 'city-title' : 'island-title';
                const iconHtml = `<div class="map-city-label" style="opacity: var(--map-labels-opacity);"><span class="${titleClass}">${loc.name}</span></div>`;
                const divIcon = L.divIcon({
                    className: 'custom-city-divicon',
                    html: iconHtml,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                });
                return <Marker key={idx} position={[loc.y + 0.5, loc.x + 0.5]} icon={divIcon} interactive={false} zIndexOffset={loc.isCity ? 300 : 150} />;
            })}

            {/* Render Pokémon Spawns */}
            {activeSpawns.map((spawn, idx) => {
                const iconHtml = `<div class="pokemon-spawn-marker" title="${spawn.pokemon}"><img src="pokemon_icons/${spawn.pokemon}.png" alt="${spawn.pokemon}" style="width:24px;height:24px;object-fit:contain;filter:drop-shadow(0px 0px 2px rgba(0,0,0,0.8));"/></div>`;
                const divIcon = L.divIcon({
                    className: 'custom-spawn-divicon',
                    html: iconHtml,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                return <Marker key={`spawn-${idx}`} position={[spawn.y + 0.5, spawn.x + 0.5]} icon={divIcon} interactive={false} zIndexOffset={200} />;
            })}
        </MapContainer>
    );
}
