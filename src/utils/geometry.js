import * as turf from '@turf/turf';

export const directions = {
    0: "East", 45: "SouthEast", 90: "South", 135: "SouthWest",
    180: "West", 225: "NorthWest", 270: "North", 315: "NorthEast"
};

export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

export function degToRad(deg) { 
    return deg * (Math.PI / 180); 
}

export function getPoints(pos, ang, distMin, distMax) {
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

export function pixelatePolygon(geomOrFeature) {
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

export function sqr(x) { return x * x; }
export function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y); }

export function distToSegmentSquared(p, v, w) {
    let l2 = dist2(v, w);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

export function pointToPolygonDist(px, py, geomOrFeature) {
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

export function calcIntersection(infos) {
    if (!infos || infos.length === 0) return null;

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
            if (!curIntersection) return null;
        }

        if (curIntersection) {
            const box = turf.bbox(curIntersection);
            const center = turf.center(curIntersection);
            const centroid = turf.centroid(curIntersection);
            const pixelated = pixelatePolygon(curIntersection);
            
            return {
                polygon: curIntersection,
                box,
                center: [center.geometry.coordinates[0], center.geometry.coordinates[1]],
                centroid: [centroid.geometry.coordinates[0], centroid.geometry.coordinates[1]],
                pixelated
            };
        }
    }
    return null;
}
