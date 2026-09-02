import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';

export default function PlacesDrawer() {
    const { 
        isPlacesDrawerOpen, setPlacesDrawer,
        allLocations, currentRegion, setRegion, setFloor
    } = useStore();

    const [filterRegion, setFilterRegion] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('finder_place_favorites')) || []);

    const toggleFavorite = (e, placeName) => {
        e.stopPropagation();
        let newFavs = [...favorites];
        if (newFavs.includes(placeName)) {
            newFavs = newFavs.filter(f => f !== placeName);
        } else {
            newFavs.push(placeName);
        }
        setFavorites(newFavs);
        localStorage.setItem('finder_place_favorites', JSON.stringify(newFavs));
    };

    const teleportToPlace = (place) => {
        if (currentRegion !== place.regionKey) {
            setRegion(place.regionKey);
        }
        setFloor(place.z);
        // Note: MapView handles centering automatically if we set a specific state, but for simplicity here we just change region/floor.
        // A complete teleport would update map center via a state like 'teleportTarget'
        setPlacesDrawer(false);
    };

    const displayList = useMemo(() => {
        let list = [];
        (allLocations.Kanto || []).forEach(loc => list.push({ ...loc, regionKey: 'kanto', regionLabel: 'Kanto' }));
        (allLocations['Orange Archipelago'] || []).forEach(loc => list.push({ ...loc, regionKey: 'kanto', regionLabel: 'Orange' }));
        (allLocations.Johto || []).forEach(loc => list.push({ ...loc, regionKey: 'johto', regionLabel: 'Johto' }));

        if (filterRegion !== 'all') list = list.filter(p => p.regionKey === filterRegion);
        if (searchTerm) list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filterCategory === 'cities') list = list.filter(p => p.isCity);
        if (filterCategory === 'islands') list = list.filter(p => !p.isCity);
        if (filterCategory === 'favorites') list = list.filter(p => favorites.includes(p.name));

        list.sort((a, b) => {
            const aFav = favorites.includes(a.name);
            const bFav = favorites.includes(b.name);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            if (a.isCity && !b.isCity) return -1;
            if (!a.isCity && b.isCity) return 1;
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [allLocations, filterRegion, filterCategory, searchTerm, favorites]);

    if (!isPlacesDrawerOpen) return null;

    return (
        <>
            <div id="drawer-backdrop" className="drawer-backdrop active" onClick={() => setPlacesDrawer(false)}></div>
            <div id="places-drawer" className="side-drawer left-drawer active">
                <div className="drawer-header">
                    <h3><i className="fa-solid fa-map-location-dot"></i> Cidades & Ilhas</h3>
                    <button className="drawer-close-btn" onClick={() => setPlacesDrawer(false)}><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="places-region-filter-bar">
                    <select className="places-region-select" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                        <option value="all">Todas as Regiões</option>
                        <option value="kanto">Kanto / Orange</option>
                        <option value="johto">Johto</option>
                    </select>
                </div>
                <div className="drawer-search-box">
                    <i className="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" placeholder="Buscar cidade ou ilha..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && <button className="clear-search-btn" onClick={() => setSearchTerm('')}><i className="fa-solid fa-xmark"></i></button>}
                </div>
                <div className="drawer-filter-tabs">
                    <button className={`filter-tab ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>Todas</button>
                    <button className={`filter-tab ${filterCategory === 'cities' ? 'active' : ''}`} onClick={() => setFilterCategory('cities')}>Cidades</button>
                    <button className={`filter-tab ${filterCategory === 'islands' ? 'active' : ''}`} onClick={() => setFilterCategory('islands')}>Ilhas</button>
                    <button className={`filter-tab ${filterCategory === 'favorites' ? 'active' : ''}`} onClick={() => setFilterCategory('favorites')}>⭐ Favoritos</button>
                </div>
                <div id="places-list-container" className="drawer-list-container">
                    {displayList.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 10px', fontSize: '12px' }}>
                            <i className="fa-solid fa-map-pin" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
                            <p>Nenhum local encontrado.</p>
                        </div>
                    ) : (
                        displayList.map((item, idx) => {
                            const isFav = favorites.includes(item.name);
                            return (
                                <div key={idx} className={`place-card ${item.isCity ? 'is-city' : 'is-island'} ${isFav ? 'is-favorite' : ''}`} onClick={() => teleportToPlace(item)}>
                                    <div className="place-icon">
                                        <i className={`fa-solid ${item.isCity ? 'fa-city' : 'fa-water'}`}></i>
                                    </div>
                                    <div className="place-details">
                                        <div className="place-name">{item.name}</div>
                                        <div className="place-badges">
                                            <span className="place-badge-region">{item.regionLabel}</span>
                                            <span className="place-badge-region" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>Z: {item.z}</span>
                                            <span className="place-badge-coords">({item.x}, {item.y})</span>
                                        </div>
                                    </div>
                                    <button className={`place-fav-btn ${isFav ? 'active' : ''}`} onClick={(e) => toggleFavorite(e, item.name)}>
                                        <i className={`${isFav ? 'fa-solid' : 'fa-regular'} fa-star`}></i>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
