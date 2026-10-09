// locationMap, monthMap, parseDate, and parseLocation are loaded globally from data.js

// Safe localStorage wrapper to prevent crashes in private modes or restricted iframe sandboxes
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
    }
};


// View switches must jump, not animate: html has scroll-behavior: smooth, which would turn
// window.scrollTo(0, 0) into a visible slide from the card up to the top.
function jumpTo(y) {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function getPhotoYear(photo) {
    return parseInt(photo.date.split(', ')[1], 10);
}

// Fill the hero summary (stories / frames / countries / year span)
function renderArchiveStats() {
    const years = photos.map(getPhotoYear).filter(Number.isFinite);
    const countries = new Set(photos.map(photo => parseLocation(photo.location).enSub));
    const frames = photos.reduce((total, photo) => total + 1 + (photo.morePics?.length || 0), 0);
    const values = {
        stories: String(photos.length).padStart(2, '0'),
        frames: String(frames).padStart(2, '0'),
        countries: String(countries.size).padStart(2, '0'),
        span: years.length ? `${Math.min(...years)}—${String(Math.max(...years)).slice(-2)}` : '—'
    };
    document.querySelectorAll('#gallery-view [data-stat]').forEach(node => {
        node.textContent = values[node.dataset.stat] ?? '—';
    });
}

function initGallery(countryFilter = 'ALL', eraFilter = 'ALL') {
    const grid = document.getElementById('gallery-grid');
    const result = document.getElementById('gallery-result');
    grid.innerHTML = '';

    const filteredPhotos = photos.filter(photo => {
        const loc = parseLocation(photo.location);
        const matchCountry = countryFilter === 'ALL' || loc.enSub === countryFilter;

        const photoYear = getPhotoYear(photo);
        let matchEra = eraFilter === 'ALL';
        if (eraFilter === '<2025') {
            matchEra = photoYear < 2025;
        } else if (eraFilter !== 'ALL') {
            matchEra = eraFilter.split(',').map(Number).includes(photoYear);
        }
        return matchCountry && matchEra;
    });

    if (result) {
        const count = String(filteredPhotos.length).padStart(2, '0');
        result.innerHTML = `<span class="lang-en">${count} / ${photos.length} stories</span><span class="lang-zh">${count} / ${photos.length} 个故事</span>`;
    }

    if (!filteredPhotos.length) {
        grid.innerHTML = `
            <p class="archive-no-result">
                <span class="lang-en">No journeys match this combination yet.</span>
                <span class="lang-zh">这个组合下还没有旅程。</span>
            </p>`;
        return;
    }

    const isEnglish = document.body.classList.contains('lang-en');

    filteredPhotos.forEach((photo, index) => {
        const loc = parseLocation(photo.location);
        const dateLoc = parseDate(photo.date);
        const frameCount = 1 + (photo.morePics?.length || 0);
        const archiveIndex = String(photos.indexOf(photo) + 1).padStart(2, '0');
        const card = document.createElement('article');
        card.className = 'frame-card';
        card.dataset.photoId = String(photo.id);
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', isEnglish ? `Open ${loc.enTitle}` : `打开${loc.zhTitle}`);
        card.style.animationDelay = `${Math.min(index, 8) * 0.07}s`;

        card.innerHTML = `
            <div class="frame-media">
                <img src="${imageVariant(photo.image, 'card')}" alt="${escapeHtml(isEnglish ? photo.titleEn : photo.titleZh)}" loading="lazy" decoding="async">
                <span class="frame-index">${archiveIndex}</span>
                <span class="frame-count">
                    <span class="lang-en">${frameCount} ${frameCount > 1 ? 'FRAMES' : 'FRAME'}</span>
                    <span class="lang-zh">${frameCount} 帧</span>
                </span>
                <span class="frame-open" aria-hidden="true">↗</span>
            </div>
            <div class="frame-caption">
                <div class="frame-heading">
                    <h3 class="frame-title">
                        <span class="lang-en">${loc.enTitle}</span>
                        <span class="lang-zh">${loc.zhTitle}</span>
                    </h3>
                    <span class="frame-country">
                        <span class="lang-en">${loc.enSub}</span>
                        <span class="lang-zh">${loc.zhSub}</span>
                    </span>
                </div>
                <p class="frame-story">
                    <span class="lang-en">${escapeHtml(photo.titleEn)}</span>
                    <span class="lang-zh">${escapeHtml(photo.titleZh)}</span>
                </p>
                <p class="frame-meta">
                    <time>
                        <span class="lang-en">${dateLoc.en}</span>
                        <span class="lang-zh">${dateLoc.zh}</span>
                    </time>
                    <span>${escapeHtml(photo.exif.split(' | ').slice(0, 2).join(' · '))}</span>
                </p>
            </div>
        `;

        card.addEventListener('click', () => openDetail(photo, false, { fromGallery: true }));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDetail(photo, false, { fromGallery: true });
            }
        });
        grid.appendChild(card);
    });
}

// Global State for Filters and Views
let activePhoto = null;
let currentCountry = 'ALL';
let currentEra = 'ALL';
let currentViewMode = 'grid';
const voyageReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let detailArrivalAnimation = null;
let detailRevealObserver = null;

const locationRawCoords = {
    'CHINA·XINJIANG': { lon: 86.0, lat: 45.0 },
    'CHINA·YUNNAN': { lon: 100.1, lat: 25.7 },
    'CHINA·JIANGXI': { lon: 118.0, lat: 28.9 },
    'CHINA·HONG KONG': { lon: 114.1, lat: 22.3 },
    'CHINA·TAIPEI': { lon: 121.5, lat: 25.0 },
    'MALAYSIA·PENANG': { lon: 100.3, lat: 5.4 },
    'MALAYSIA·KUALA LUMPUR': { lon: 101.7, lat: 3.1 },
    'MALAYSIA·PUTRAJAYA': { lon: 101.7, lat: 2.7 }, // Nudge slightly south of KL
    'SINGAPORE': { lon: 103.8, lat: 1.3 }
};

const locationCoords = {};
Object.keys(locationRawCoords).forEach(key => {
    const { lon, lat } = locationRawCoords[key];
    const x = 400.0 + lon * 2.0;
    const y = 300.0 - lat * 2.0;
    locationCoords[key] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
});

const mapSvgContent = `
<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <!-- Background capture layer to ensure the entire SVG area responds to drag/zoom mouse inputs -->
    <rect width="800" height="600" fill="transparent" style="pointer-events: all;" />

    <!-- Grid Lines -->
    <line class="map-grid-line" x1="100" y1="0" x2="100" y2="600" />
    <line class="map-grid-line" x1="200" y1="0" x2="200" y2="600" />
    <line class="map-grid-line" x1="300" y1="0" x2="300" y2="600" />
    <line class="map-grid-line" x1="400" y1="0" x2="400" y2="600" />
    <line class="map-grid-line" x1="500" y1="0" x2="500" y2="600" />
    <line class="map-grid-line" x1="600" y1="0" x2="600" y2="600" />
    <line class="map-grid-line" x1="700" y1="0" x2="700" y2="600" />
    
    <line class="map-grid-line" x1="0" y1="100" x2="800" y2="100" />
    <line class="map-grid-line" x1="0" y1="200" x2="800" y2="200" />
    <line class="map-grid-line" x1="0" y1="300" x2="800" y2="300" />
    <line class="map-grid-line" x1="0" y1="400" x2="800" y2="400" />
    <line class="map-grid-line" x1="0" y1="500" x2="800" y2="500" />

    <!-- Travel Routes (Connecting arcs) -->
    <g id="map-routes"></g>

    <!-- Location Pins -->
    <g id="map-pins"></g>
</svg>
`;

function getCurvePath(x1, y1, x2, y2) {
    const cx = (x1 + x2) / 2 - (y2 - y1) * 0.12;
    const cy = (y1 + y2) / 2 + (x2 - x1) * 0.12;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

let mapInitialized = false;

function initMapView() {
    if (mapInitialized) return;
    mapInitialized = true;
    
    const container = document.getElementById('map-svg-container');
    if (!container) return;
    
    container.innerHTML = mapSvgContent;
    
    // Create map tooltip container programmatically inside scroll container
    let tooltip = document.getElementById('map-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.setAttribute('class', 'map-tooltip');
        tooltip.setAttribute('id', 'map-tooltip');
        container.appendChild(tooltip);
    }
    
    const svg = container.querySelector('svg');
    const pinsGroup = document.getElementById('map-pins');
    const routesGroup = document.getElementById('map-routes');
    
    // Render Dot-Matrix Landmass Points
    const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotsGroup.setAttribute('id', 'map-land-dots');
    
    if (typeof mapGridPoints !== 'undefined') {
        mapGridPoints.forEach(pt => {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', pt[0]);
            dot.setAttribute('cy', pt[1]);
            dot.setAttribute('r', '0.05');
            dot.setAttribute('class', 'map-grid-dot');
            dotsGroup.appendChild(dot);
        });
    }
    svg.insertBefore(dotsGroup, routesGroup);
    
    // 1. Group photos by coordinates key
    const coordsGroup = {};
    photos.forEach(photo => {
        const coords = locationCoords[photo.location];
        if (coords) {
            const key = `${coords.x},${coords.y}`;
            if (!coordsGroup[key]) coordsGroup[key] = [];
            coordsGroup[key].push(photo);
        }
    });
    
    // Save to global for filtering
    window.locationCoordsGroup = coordsGroup;
    
    // 2. Render Pins
    Object.keys(coordsGroup).forEach(key => {
        const [x, y] = key.split(',').map(Number);
        
        const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pinG.setAttribute('class', 'map-pin-group');
        pinG.setAttribute('data-coords', key);
        pinG.setAttribute('role', 'button');
        pinG.setAttribute('tabindex', '0');
        pinG.setAttribute('aria-label', 'Open location archive');
        
        pinG.innerHTML = `
            <circle class="map-pin-pulse" cx="${x}" cy="${y}" />
            <circle class="map-pin-core" cx="${x}" cy="${y}" r="5" />
            <circle cx="${x}" cy="${y}" r="16" fill="transparent" opacity="0" />
        `;
        
        // Tooltip events
        pinG.addEventListener('mouseenter', () => {
            showMapTooltip(key, x, y);
        });
        
        pinG.addEventListener('mouseleave', () => {
            hideMapTooltip();
        });
        
        pinG.addEventListener('click', () => {
            // Open first active matching photo
            const matchingPhoto = getFirstMatchingPhotoInGroup(key);
            if (matchingPhoto) {
                openDetail(matchingPhoto, true);
            }
        });
        pinG.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pinG.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        });
        
        pinsGroup.appendChild(pinG);
    });
    
    // Render Coastlines and Borders
    if (typeof mapCoastlines !== 'undefined' && mapCoastlines) {
        const coastlinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        coastlinePath.setAttribute('class', 'map-coastline-path');
        coastlinePath.setAttribute('d', mapCoastlines);
        svg.insertBefore(coastlinePath, routesGroup);
    }
    
    if (typeof mapBorders !== 'undefined' && mapBorders) {
        const borderPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        borderPath.setAttribute('class', 'map-border-path');
        borderPath.setAttribute('d', mapBorders);
        svg.insertBefore(borderPath, routesGroup);
    }
    
    // Set up zoom and pan interactions
    setupMapZoomPan();
}

function getFirstMatchingPhotoInGroup(coordsKey) {
    const groupPhotos = window.locationCoordsGroup[coordsKey] || [];
    return groupPhotos.find(photo => {
        const loc = parseLocation(photo.location);
        const matchCountry = currentCountry === 'ALL' || loc.enSub === currentCountry;
        
        const photoYear = photo.date.split(', ')[1] || '';
        let matchEra = currentEra === 'ALL';
        if (currentEra === '<2025') {
            matchEra = parseInt(photoYear) < 2025;
        } else if (currentEra !== 'ALL') {
            matchEra = photoYear === currentEra;
        }
        return matchCountry && matchEra;
    });
}

function showMapTooltip(coordsKey, x, y) {
    const photo = getFirstMatchingPhotoInGroup(coordsKey);
    if (!photo) return;
    
    const container = document.getElementById('map-svg-container');
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip || !container) return;
    
    const svg = container.querySelector('svg');
    if (!svg) return;
    
    const loc = parseLocation(photo.location);
    const dateLoc = parseDate(photo.date);
    const title = document.body.classList.contains('lang-en') 
        ? (photo.titleEn || photo.titleZh) 
        : (photo.titleZh || photo.titleEn);
    const locName = document.body.classList.contains('lang-en') ? loc.enTitle : loc.zhTitle;

    tooltip.innerHTML = `
        <img class="map-tooltip-image" src="${photo.image}" alt="Preview">
        <h4 class="map-tooltip-title">${title}</h4>
        <p class="map-tooltip-meta">${locName} &middot; ${photo.date.split(', ')[1] || ''}</p>
    `;
    
    // Position tooltip dynamically in screen space relative to the pin's actual position
    const pinGroup = document.querySelector(`.map-pin-group[data-coords="${coordsKey}"]`);
    if (pinGroup) {
        const pinCore = pinGroup.querySelector('.map-pin-core');
        if (pinCore) {
            const pinRect = pinCore.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const tooltipLeft = pinRect.left - containerRect.left + pinRect.width / 2;
            const tooltipTop = pinRect.top - containerRect.top + pinRect.height / 2;
            
            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;
        }
    }
    
    // Flip tooltip to render below the pin if it is near the top edge (y < 180 out of 600)
    if (y < 180) {
        tooltip.classList.add('tooltip-bottom');
    } else {
        tooltip.classList.remove('tooltip-bottom');
    }
    
    tooltip.classList.add('show');
}

function hideMapTooltip() {
    const tooltip = document.getElementById('map-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
    }
}

function filterMapPins(country, era) {
    const pins = document.querySelectorAll('.map-pin-group');
    
    // Filter Pins
    pins.forEach(pin => {
        const coordsKey = pin.getAttribute('data-coords');
        const groupPhotos = window.locationCoordsGroup[coordsKey] || [];
        
        const hasMatch = groupPhotos.some(photo => {
            const loc = parseLocation(photo.location);
            const matchCountry = country === 'ALL' || loc.enSub === country;
            
            const photoYear = photo.date.split(', ')[1] || '';
            let matchEra = era === 'ALL';
            if (era === '<2025') {
                matchEra = parseInt(photoYear) < 2025;
            } else if (era !== 'ALL') {
                matchEra = photoYear === era;
            }
            return matchCountry && matchEra;
        });
        
        if (hasMatch) {
            pin.classList.remove('filtered-out');
        } else {
            pin.classList.add('filtered-out');
        }
    });
}

function setupMapZoomPan() {
    const wrapper = document.querySelector('.map-wrapper');
    const svg = document.querySelector('#map-svg-container svg');
    if (!wrapper || !svg) return;
    
    // Scoped Zoom/Pan State variables in SVG user units (0 to 800, 0 to 600)
    let zoomScale = 1;
    let panX = 0;
    let panY = 0;
    
    // Wrap children in a zoom group to apply transforms
    let zoomGroup = document.getElementById('map-zoom-group');
    if (!zoomGroup) {
        zoomGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        zoomGroup.setAttribute('id', 'map-zoom-group');
        const children = Array.from(svg.children);
        children.forEach(child => {
            zoomGroup.appendChild(child);
        });
        svg.appendChild(zoomGroup);
    }
    
    zoomGroup.style.transformOrigin = '0 0';
    zoomGroup.style.transition = 'none';
    
    // Calculate initial scale
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    
    if (isMobile) {
        zoomScale = 3.6;
        panX = -1760; // Deep focus on the Southeast Asia / East Asia pin cluster
        panY = -614;
    } else if (isTablet) {
        zoomScale = 3.0;
        panX = -1400;
        panY = -462;
    } else {
        zoomScale = 2.4;
        panX = -1040;
        panY = -310;
    }
    
    function getSvgScaleRatio() {
        const svgRect = svg.getBoundingClientRect();
        return 800 / (svgRect.width || 800);
    }
    
    function applyTransform() {
        zoomScale = Math.max(1, Math.min(10, zoomScale));
        
        // Limits in SVG coordinate space
        const minPanX = 800 * (1 - zoomScale);
        const maxPanX = 0;
        const minPanY = 600 * (1 - zoomScale);
        const maxPanY = 0;
        
        panX = Math.max(minPanX, Math.min(maxPanX, panX));
        panY = Math.max(minPanY, Math.min(maxPanY, panY));
        
        // Apply transform via standard SVG attribute (highly compatible)
        zoomGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoomScale})`);
        zoomGroup.style.setProperty('--map-zoom', zoomScale);
        
        // Hide tooltip to avoid layout offsets during animation
        hideMapTooltip();
    }
    
    applyTransform();
    
    // Mouse Drag to Pan
    let isPanning = false;
    let lastClientX = 0;
    let lastClientY = 0;
    
    wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        // If clicking on a pin, don't initiate drag panning
        if (e.target.closest('.map-pin-group')) {
            return;
        }
        isPanning = true;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        wrapper.style.cursor = 'grabbing';
    });
    
    // Prevent browser drag-and-drop actions on SVG background/dots during dragging
    wrapper.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        const dx = e.clientX - lastClientX;
        const dy = e.clientY - lastClientY;
        const ratio = getSvgScaleRatio();
        
        // Translate delta into SVG coordinate units
        panX += dx * ratio;
        panY += dy * ratio;
        
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        
        applyTransform();
    });
    
    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            wrapper.style.cursor = 'grab';
        }
    });
    
    wrapper.style.cursor = 'grab';
    
    // Mouse Wheel to Zoom (centered on cursor)
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomIntensity = 0.08;
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate offset if SVG has padding or centering margins inside wrapper
        const svgRect = svg.getBoundingClientRect();
        const centerOffsetX = svgRect.left - rect.left;
        const centerOffsetY = svgRect.top - rect.top;
        
        const ratio = getSvgScaleRatio();
        const localX = (mouseX - centerOffsetX) * ratio;
        const localY = (mouseY - centerOffsetY) * ratio;
        
        const svgX = (localX - panX) / zoomScale;
        const svgY = (localY - panY) / zoomScale;
        
        if (e.deltaY < 0) {
            zoomScale += zoomScale * zoomIntensity;
        } else {
            zoomScale -= zoomScale * zoomIntensity;
        }
        zoomScale = Math.max(1, Math.min(5, zoomScale));
        
        panX = localX - zoomScale * svgX;
        panY = localY - zoomScale * svgY;
        
        applyTransform();
    }, { passive: false });
    
    // Touch Gestures (Mobile/Tablet drag and pinch zoom)
    let isPinching = false;
    let initialPinchDist = 0;
    let initialZoom = 1;
    let initialPanX = 0;
    let initialPanY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    
    wrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('.map-pin-group')) {
            return;
        }
        const rect = wrapper.getBoundingClientRect();
        if (e.touches.length === 1) {
            isPanning = true;
            lastClientX = e.touches[0].clientX;
            lastClientY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            isPanning = false;
            isPinching = true;
            initialPinchDist = getTouchDist(e.touches[0], e.touches[1]);
            initialZoom = zoomScale;
            initialPanX = panX;
            initialPanY = panY;
            
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            
            const svgRect = svg.getBoundingClientRect();
            const centerOffsetX = svgRect.left - rect.left;
            const centerOffsetY = svgRect.top - rect.top;
            
            const ratio = getSvgScaleRatio();
            touchStartX = (midX - centerOffsetX) * ratio;
            touchStartY = (midY - centerOffsetY) * ratio;
        }
    });
    
    wrapper.addEventListener('touchmove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        if (isPanning && e.touches.length === 1) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const dx = touchX - lastClientX;
            const dy = touchY - lastClientY;
            const ratio = getSvgScaleRatio();
            
            panX += dx * ratio;
            panY += dy * ratio;
            
            lastClientX = touchX;
            lastClientY = touchY;
            
            applyTransform();
            e.preventDefault();
        } else if (isPinching && e.touches.length === 2) {
            const dist = getTouchDist(e.touches[0], e.touches[1]);
            const factor = dist / initialPinchDist;
            
            zoomScale = initialZoom * factor;
            zoomScale = Math.max(1, Math.min(5, zoomScale));
            
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            
            const svgRect = svg.getBoundingClientRect();
            const centerOffsetX = svgRect.left - rect.left;
            const centerOffsetY = svgRect.top - rect.top;
            
            const ratio = getSvgScaleRatio();
            const localX = (midX - centerOffsetX) * ratio;
            const localY = (midY - centerOffsetY) * ratio;
            
            const svgX = (touchStartX - initialPanX) / initialZoom;
            const svgY = (touchStartY - initialPanY) / initialZoom;
            
            panX = localX - zoomScale * svgX;
            panY = localY - zoomScale * svgY;
            
            applyTransform();
            e.preventDefault();
        }
    }, { passive: false });
    
    wrapper.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isPanning = false;
            isPinching = false;
        } else if (e.touches.length === 1) {
            isPinching = false;
            isPanning = true;
            lastClientX = e.touches[0].clientX;
            lastClientY = e.touches[0].clientY;
        }
    });
}

function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function setupFilters() {
    const countryItems = document.querySelectorAll('#country-filter li');
    const eraItems = document.querySelectorAll('#era-filter li');

    const prepareFilter = (item, items, activate) => {
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
        const run = () => {
            items.forEach(option => {
                option.classList.remove('active');
                option.setAttribute('aria-pressed', 'false');
            });
            item.classList.add('active');
            item.setAttribute('aria-pressed', 'true');
            activate();
        };
        item.addEventListener('click', run);
        item.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                run();
            }
        });
    };

    countryItems.forEach(item => {
        prepareFilter(item, countryItems, () => {
            currentCountry = item.getAttribute('data-country');
            if (currentViewMode === 'grid') {
                initGallery(currentCountry, currentEra);
            } else {
                filterMapPins(currentCountry, currentEra);
            }
        });
    });

    eraItems.forEach(item => {
        prepareFilter(item, eraItems, () => {
            currentEra = item.getAttribute('data-era');
            if (currentViewMode === 'grid') {
                initGallery(currentCountry, currentEra);
            } else {
                filterMapPins(currentCountry, currentEra);
            }
        });
    });

    // Wire up View Toggle
    const viewToggleItems = document.querySelectorAll('#view-toggle li');
    viewToggleItems.forEach(item => {
        prepareFilter(item, viewToggleItems, () => {
            currentViewMode = item.getAttribute('data-view');
            
            const gridView = document.getElementById('gallery-grid');
            const mapView = document.getElementById('map-view-container');
            
            if (currentViewMode === 'grid') {
                mapView.style.display = 'none';
                gridView.style.display = 'grid';
                initGallery(currentCountry, currentEra);
            } else {
                gridView.style.display = 'none';
                mapView.style.display = 'flex';
                initMapView();
                filterMapPins(currentCountry, currentEra);
            }
        });
    });
}

function animateDetailArrival() {
    const detailView = document.getElementById('detail-view');
    if (!detailView) return;

    detailArrivalAnimation?.pause?.();
    detailRevealObserver?.disconnect?.();
    detailArrivalAnimation = null;
    detailRevealObserver = null;

    if (voyageReduceMotion || typeof window.anime === 'undefined') {
        detailView.classList.add('detail-ready');
        return;
    }

    const heroMedia = detailView.querySelector('.detail-hero-media');
    const nav = detailView.querySelector('.detail-nav-bar');
    const heroCopy = [...detailView.querySelectorAll('.detail-hero-copy > *')];
    const scrollCue = detailView.querySelector('.detail-scroll-cue');
    const revealSections = [...detailView.querySelectorAll('.detail-reveal')];

    window.anime.remove([heroMedia, nav, scrollCue, ...heroCopy, ...revealSections]);
    window.anime.set(revealSections, { translateY: 28, opacity: 0 });

    // Coming from the home globe the hero card is already on screen (painted by the
    // inline head script), so only the chrome fades in — no second entrance.
    const isHandoff = document.documentElement.classList.contains('atlas-handoff') || document.documentElement.classList.contains('search-arriving');
    if (isHandoff) {
        document.documentElement.classList.add('handoff-ready');
        // The cover is already in place; the copy rises in quickly right after it lands.
        window.anime.set(nav, { opacity: 0 });
        window.anime.set(heroCopy, { translateY: 12, opacity: 0 });
        detailArrivalAnimation = window.anime.timeline({
            easing: 'easeOutCubic',
            complete: () => document.documentElement.classList.remove('atlas-handoff', 'handoff-ready')
        })
            .add({ targets: heroCopy, translateY: 0, opacity: 1, delay: window.anime.stagger(60), duration: 600 }, 40)
            .add({ targets: nav, opacity: 1, duration: 450 }, 200);
    } else {
        window.anime.set(heroMedia, { scale: 1.035, opacity: 0.9 });
        window.anime.set(nav, { translateY: -14, opacity: 0 });
        window.anime.set(heroCopy, { translateY: 20, opacity: 0 });
        window.anime.set(scrollCue, { opacity: 0 });

        detailArrivalAnimation = window.anime.timeline({ easing: 'easeOutExpo' })
            .add({ targets: heroMedia, scale: 1, opacity: 1, duration: 1100 })
            .add({ targets: nav, translateY: 0, opacity: 1, duration: 600 }, '-=850')
            .add({
                targets: heroCopy,
                translateY: 0,
                opacity: 1,
                delay: window.anime.stagger(60),
                duration: 700
            }, '-=650');
    }

    if ('IntersectionObserver' in window) {
        detailRevealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                detailRevealObserver.unobserve(entry.target);
                window.anime({
                    targets: entry.target,
                    translateY: 0,
                    opacity: 1,
                    duration: 950,
                    easing: 'easeOutExpo'
                });
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        revealSections.forEach(section => detailRevealObserver.observe(section));
    } else {
        window.anime.set(revealSections, { translateY: 0, opacity: 1 });
    }
}

function toTitleCase(value) {
    return String(value || '').toLowerCase().replace(/\b([a-z])/g, char => char.toUpperCase());
}

// "Open in Maps" buttons: search the landmark (photo.mapQuery) or fall back to city + country.
function updateMapLinks(photo, loc) {
    const query = photo.mapQuery || (loc.enTitle === loc.enSub
        ? toTitleCase(loc.enTitle)
        : `${toTitleCase(loc.enTitle)}, ${toTitleCase(loc.enSub)}`);
    const encoded = encodeURIComponent(query);
    const apple = document.getElementById('detail-map-apple');
    const google = document.getElementById('detail-map-google');
    if (apple) {
        apple.href = `https://maps.apple.com/?q=${encoded}`;
        apple.setAttribute('aria-label', `在 Apple 地图中打开 ${query}`);
    }
    if (google) {
        google.href = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
        google.setAttribute('aria-label', `在 Google 地图中打开 ${query}`);
    }
}

// ---------------------------------------------------------------------------
// Navigation flow. Every way out of a story ("back" button, Esc, browser/gesture Back)
// goes through the browser history, so they all behave the same:
//   opened from the gallery → back returns to the gallery at the same scroll position
//   arrived from the home globe → back returns to the globe (which plays its return morph)
//   opened from a direct link → back shows the gallery in place
// ---------------------------------------------------------------------------
// Story shown inside the home page (see home-globe.js "story layer").
const isAtlasEmbed = new URLSearchParams(window.location.search).get('embed') === '1' && window.parent !== window;
function postToAtlas(message) {
    if (isAtlasEmbed) window.parent.postMessage({ source: 'voyage-embed', ...message }, '*');
}

const cameFromAtlas = (() => {
    try {
        if (isAtlasEmbed) return true;
        // Reloaded while the home page's story layer had this URL: the globe is one step back.
        if (history.state?.atlasStory != null) return true;
        if (new URLSearchParams(window.location.search).get('from') === 'atlas') return true;
        const ref = new URL(document.referrer);
        return ref.origin === window.location.origin && /\/(index\.html)?$/.test(ref.pathname);
    } catch (error) {
        return false;
    }
})();
let galleryScrollY = 0;
let lastOpenedCardId = null;
let lastOpenedGlobeMarker = null;
let lastCardViewportTop = null;

// Document position from layout (offsetTop), ignoring transforms — the gallery and its cards
// replay a short rise animation when they reappear, which would skew getBoundingClientRect.
function layoutTop(element) {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
}

function openDetail(photo, instant = false, { fromGallery = false, source = null, fromSearch = false } = {}) {
    // Clear the previous story's frames before building the new series.
    clearMasonry();
    // Update browser URL in-place without page reload
    const targetSearch = `?id=${photo.id}`;
    if (fromGallery) {
        galleryScrollY = window.scrollY;
        lastOpenedCardId = photo.id;
        lastOpenedGlobeMarker = source?.classList.contains('globe-marker') ? source : null;
        // Where the card sat on screen — restored relative to the card itself, so images that
        // finish loading above it in the meantime can't shift the user's place.
        const card = document.querySelector(`#gallery-grid .frame-card[data-photo-id="${photo.id}"]`);
        lastCardViewportTop = card && !lastOpenedGlobeMarker ? layoutTop(card) - window.scrollY : null;
    }
    // Inside the home page's story layer the parent owns the history; an entry pushed here
    // would merge into the tab's back stack.
    if (!isAtlasEmbed && window.location.search !== targetSearch) {
        history.pushState({ id: photo.id, fromGallery, fromSearch, ...(lastOpenedGlobeMarker && history.state?.atlasImmersive ? { atlasImmersive: true } : {}) }, '', `voyage.html${targetSearch}`);
    }
    
    activePhoto = photo;
    document.body.classList.add('showing-detail');
    window.dispatchEvent(new CustomEvent('site:archive-view', { detail: { isDetail: true } }));
    document.getElementById('detail-view')?.style.removeProperty('opacity');
    updateVoyageTitle(safeStorage.getItem('voyage_lang') || 'zh');

    const loc = parseLocation(photo.location);
    const dateLoc = parseDate(photo.date);

    // Set hero content
    const heroSrc = imageVariant(photo.image, 'hero');
    // The small thumbnail sits underneath the cover so a not-yet-decoded cover shows a soft
    // preview instead of an empty dark card.
    document.getElementById('detail-hero-bg').style.backgroundImage = `url('${heroSrc}'), url('${imageVariant(photo.image, 'mini')}')`;
    updateImageDimensions(heroSrc);
    document.getElementById('detail-title').innerHTML = `<span class="lang-en">${loc.enTitle}</span><span class="lang-zh">${loc.zhTitle}</span>`;
    document.getElementById('detail-subtitle').innerHTML = `<span class="lang-en">${loc.enSub} | ${dateLoc.en}</span><span class="lang-zh">${loc.zhSub} | ${dateLoc.zh}</span>`;

    // Set Story content
    document.getElementById('detail-story-title').innerHTML = `<span class="lang-en">${photo.titleEn}</span><span class="lang-zh">${photo.titleZh}</span>`;
    document.getElementById('detail-story').innerHTML = `<span class="lang-zh">${photo.storyZh}</span><span class="lang-en"><i>${photo.storyEn}</i></span>`;
    const detailExif = document.getElementById('detail-exif');
    const detailIndex = document.getElementById('detail-index');
    if (detailExif) {
        // One element per value: inline on narrow screens, a stacked spec list in the wide layout.
        const parts = String(photo.exif || '').split('|').map(part => part.trim()).filter(Boolean);
        detailExif.innerHTML = parts.length
            ? parts.map(part => `<span class="exif-item">${escapeHtml(part)}</span>`).join('')
            : '—';
    }
    if (detailIndex) {
        const index = Math.max(0, photos.findIndex(item => item.id === photo.id)) + 1;
        detailIndex.textContent = `${String(index).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    }

    updateMapLinks(photo, loc);

    const breadcrumbCurrent = document.getElementById('breadcrumb-current-title');
    if (breadcrumbCurrent) {
        breadcrumbCurrent.innerHTML = `<span class="lang-en">${photo.titleEn}</span><span class="lang-zh">${photo.titleZh}</span>`;
    }

    if (instant) {
        document.getElementById('gallery-view').classList.remove('active');
        document.getElementById('gallery-view').style.display = 'none';
        document.getElementById('detail-view').style.display = 'block';
        document.getElementById('detail-view').classList.add('active');
        document.documentElement.classList.remove('direct-detail-load');
        jumpTo(0);
        whenPageActive(() => requestAnimationFrame(animateDetailArrival));
        announceEmbedReady(photo);
        // The series sits below the fold: build it once the arrival has settled so its
        // image downloads and decodes don't compete with the first frames.
        requestAnimationFrame(() => loadMasonry(photo));
    } else if (fromGallery && morphFromCard(photo, source)) {
        // Card → cover morph handles the switch (see morphFromCard).
    } else {
        // Switch views smoothly
        document.getElementById('gallery-view').classList.remove('active');
        setTimeout(() => {
            document.getElementById('gallery-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'block';
            setTimeout(() => document.getElementById('detail-view').classList.add('active'), 50);

            jumpTo(0);
            loadMasonry(photo);
            requestAnimationFrame(animateDetailArrival);
        }, 500); // match transition time
    }
}

// ---------------------------------------------------------------------------
// Gallery card → story cover: the card's photo opens up into the cover card (same idea as
// the home globe). The photo is mapped so that what the card showed sits exactly on the
// card at the first frame, and both the window and the photo grow into the cover framing.
// ---------------------------------------------------------------------------
let cardMorph = null;

// The gallery card photo is shown slightly dimmed (.frame-media img in main.css); the morph
// copy animates to/from the same look so there is no tone change at the hand-off.
const CARD_PHOTO_FILTER = 'saturate(0.88) brightness(0.92)';
// .frame-media img also carries transform: scale(1.001) (anti-seam); the copy matches it too.
const CARD_PHOTO_SCALE = 1.001;

// After a morph lands the pointer usually rests on the revealed card, which would start the
// card's hover zoom the instant it appears (read as a small displacement). Hover on that card
// is held back until the pointer actually moves.
function holdCardHover(cardEl) {
    if (!cardEl) return;
    cardEl.style.pointerEvents = 'none';
    const release = () => {
        cardEl.style.removeProperty('pointer-events');
        window.removeEventListener('pointermove', release, true);
    };
    window.addEventListener('pointermove', release, { capture: true, once: true });
}

// Hand the screen over from the morph copy to the real card: the real card is shown under the
// copy, which then fades out quickly (covers the chips / gradient the copy doesn't have).
function revealCardUnderOverlay(layer, cardEl, done) {
    // Only the photo is ever hidden during a morph (its caption stays and fades with the list).
    const photoEl = cardEl?.classList.contains('globe-marker') ? cardEl.querySelector('img') : cardEl?.querySelector('.frame-media');
    if (photoEl) photoEl.style.visibility = '';
    const fade = layer.card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
    fade.finished.then(done).catch(done);
}

// The photo layer of the morph copy is sized to the whole photo as the cover frames it (cover
// scale), not to the cover box. The cover crops the photo's top/bottom; a card-sized window
// shows the full height, so a layer cut to the cover box would leave dark strips at the top and
// bottom of that window. The card box clips the excess when the window is open.
function sizeMorphPhoto(layer, naturalW, naturalH, cardRect) {
    const cover = Math.max(cardRect.width / naturalW, cardRect.height / naturalH);
    const width = naturalW * cover;
    const height = naturalH * cover;
    Object.assign(layer.image.style, {
        inset: 'auto',
        left: `${(cardRect.width - width) / 2}px`,
        top: `${(cardRect.height - height) / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundSize: '100% 100%'
    });
}

function heroTargetRect() {
    const probe = document.createElement('div');
    probe.className = 'atlas-hero-probe';
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    const style = getComputedStyle(probe);
    const radius = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
        .map(key => parseFloat(style[key]) || 0);
    probe.remove();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius };
}

function createPhotoMorphLayer() {
    const overlay = document.createElement('div');
    overlay.className = 'atlas-transition';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <div class="atlas-transition-card">
            <div class="atlas-transition-image"><div class="atlas-transition-hires"></div></div>
            <div class="atlas-transition-wash"></div>
        </div>`;
    document.body.appendChild(overlay);
    return {
        overlay,
        card: overlay.querySelector('.atlas-transition-card'),
        image: overlay.querySelector('.atlas-transition-image'),
        hires: overlay.querySelector('.atlas-transition-hires'),
        wash: overlay.querySelector('.atlas-transition-wash')
    };
}

function ensureCardMorphLayer() {
    return cardMorph || (cardMorph = createPhotoMorphLayer());
}

function morphFromCard(photo, sourceEl = null) {
    if (voyageReduceMotion || typeof Element.prototype.animate !== 'function') return false;
    const cardEl = sourceEl || document.querySelector(`#gallery-grid .frame-card[data-photo-id="${photo.id}"]`);
    const media = sourceEl?.classList.contains('globe-marker') ? sourceEl.querySelector('img') : cardEl?.querySelector('.frame-media');
    const thumb = media?.tagName === 'IMG' ? media : media?.querySelector('img');
    if (!thumb || !thumb.naturalWidth) return false;

    const from = media.getBoundingClientRect();
    const fromRadius = parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0;
    const to = heroTargetRect();
    const radii = values => values.map(value => `${value}px`).join(' ');

    // Both the card and the cover crop the photo with "cover", centred.
    const w = thumb.naturalWidth;
    const h = thumb.naturalHeight;
    // Match the card's current hover zoom and colour at the first frame.
    const liveStyle = getComputedStyle(thumb);
    const liveScale = liveStyle.transform && liveStyle.transform !== 'none' ? new DOMMatrix(liveStyle.transform).a : CARD_PHOTO_SCALE;
    const liveFilter = liveStyle.filter && liveStyle.filter !== '' ? liveStyle.filter : 'none';
    const source = { left: from.left, top: from.top, width: from.width, height: from.height, radius: [fromRadius, fromRadius, fromRadius, fromRadius] };

    const layer = ensureCardMorphLayer();
    // The nav stays out of sight while the cover morphs (it would otherwise show as a dark sliver
    // beside / behind the cover's top edge); it comes back with the story page or the list.
    document.body.classList.add('card-morphing');
    const heroSrc = imageVariant(photo.image, 'hero');
    Object.assign(layer.card.style, {
        left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
        borderRadius: radii(to.radius), clipPath: 'none'
    });
    sizeMorphPhoto(layer, thumb.naturalWidth, thumb.naturalHeight, to);
    layer.image.style.backgroundImage = `url("${thumb.currentSrc || thumb.src}")`;
    layer.image.style.filter = liveFilter;
    layer.hires.style.backgroundImage = `url("${heroSrc}")`;
    layer.hires.style.opacity = '0';
    layer.wash.style.opacity = '0';
    layer.overlay.hidden = false;
    // Cross-fade: the copy fades in over the real card (chips and bottom gradient included), and
    // only then does the card step aside — no one-frame jump at the click.
    layer.card.style.opacity = '0';
    layer.card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'linear', fill: 'forwards' });
    const cardPhotoEl = media;
    window.setTimeout(() => { cardPhotoEl.style.visibility = 'hidden'; }, 150);

    const hero = new Image();
    hero.src = heroSrc;
    const heroReady = (hero.decode ? hero.decode() : Promise.resolve()).catch(() => {});
    heroReady.then(() => {
        layer.hires.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
    });

    const galleryView = document.getElementById('gallery-view');
    // Lay the story out now, invisibly and out of flow: its first style/layout pass (~40ms of
    // long serif text and the cover) happens before the morph starts moving instead of on
    // the landing frame, where it showed as a hitch.
    const detailView = document.getElementById('detail-view');
    Object.assign(detailView.style, {
        display: 'block', visibility: 'hidden', position: 'absolute', top: '0px', left: '0px', right: '0px'
    });
    void detailView.offsetHeight;
    const duration = 720;
    const easing = 'cubic-bezier(0.3, 0, 0.12, 1)';
    const [morph] = animateCoverMorph(layer.card, layer.image, source, to, w, h, { duration, easing, fill: 'forwards' }, liveScale);
    layer.wash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration, easing: 'linear', fill: 'forwards' });
    layer.image.animate([{ filter: liveFilter }, { filter: 'none' }], { duration, easing, fill: 'forwards' });
    // The list visibly fades out while the window opens (starting right after the click, so the
    // fade happens around the window rather than behind it), and is gone before the swap below
    // (the morph ends at 720 ms) so nothing around the cover is removed abruptly.
    galleryView.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 460, delay: 60, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' });

    morph.finished
        .then(() => Promise.race([heroReady, new Promise(resolve => setTimeout(resolve, 500))]))
        .then(() => {
            // Swap underneath the overlay: story at the top, already showing the same cover.
            galleryView.getAnimations().forEach(animation => animation.cancel());
            galleryView.classList.remove('active');
            galleryView.style.display = 'none';
            ['visibility', 'position', 'top', 'left', 'right'].forEach(property => detailView.style.removeProperty(property));
            detailView.classList.add('active');
            jumpTo(0);
            cardPhotoEl.style.visibility = '';
            document.documentElement.classList.add('atlas-handoff');
            requestAnimationFrame(() => {
                animateDetailArrival();
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    layer.overlay.hidden = true;
                    document.body.classList.remove('card-morphing');
                    [layer.card, layer.image, layer.hires, layer.wash].forEach(element => {
                        element.getAnimations().forEach(animation => animation.cancel());
                        element.removeAttribute('style');
                    });
                }));
            });
            requestAnimationFrame(() => loadMasonry(photo));
        });
    return true;
}

// Leave the story the way the user came in (see "Navigation flow" above).
function goBackFromDetail() {
    if (isAtlasEmbed) {
        // The home page owns this history entry and plays the return morph.
        postToAtlas({ type: 'back' });
        return;
    }
    if (history.state?.fromGallery || history.state?.fromSearch || cameFromAtlas) {
        history.back();
        return;
    }
    // Direct link: there is nothing of ours to go back to, so show the gallery in place.
    try { history.replaceState(null, '', 'voyage.html'); } catch (error) { /* ignore */ }
    closeDetail();
}

function closeDetail() {
    // Never leave a modal layer or a scroll lock behind when the story closes.
    if (lightbox && !lightbox.hidden) closeLightbox(true);
    if (heroSection.classList.contains('zen-mode')) exitZenMode(true);
    document.body.style.overflow = '';

    detailArrivalAnimation?.pause?.();
    detailRevealObserver?.disconnect?.();
    // Closing can interrupt the arrival before its completion callback clears
    // these classes. atlas-handoff forces display:block even on a hidden view.
    document.documentElement.classList.remove('atlas-handoff', 'handoff-ready');
    const detailView = document.getElementById('detail-view');
    const galleryView = document.getElementById('gallery-view');
    const finishClose = () => {
        clearMasonry();
        detailView.classList.remove('active', 'detail-ready');
        detailView.style.display = 'none';
        detailView.style.removeProperty('opacity');
        galleryView.style.display = 'flex';
        document.body.classList.remove('showing-detail');
        activePhoto = null;
        updateVoyageTitle(document.body.classList.contains('lang-en') ? 'en' : 'zh');
        // Return to the exact spot in the gallery and put focus back on the card.
        const card = lastOpenedGlobeMarker || (lastOpenedCardId == null ? null
            : document.querySelector(`#gallery-grid .frame-card[data-photo-id="${lastOpenedCardId}"]`));
        if (card && lastCardViewportTop != null) {
            jumpTo(layoutTop(card) - lastCardViewportTop);
        } else {
            jumpTo(galleryScrollY);
        }
        card?.focus({ preventScroll: true });
        window.dispatchEvent(new CustomEvent('site:archive-view', { detail: { isDetail: false } }));
        requestAnimationFrame(() => galleryView.classList.add('active'));
    };

    if (detailView.style.display !== 'none' && morphToCard(finishClose)) {
        // Cover → card morph (see morphToCard).
    } else if (!voyageReduceMotion && typeof window.anime !== 'undefined' && detailView.style.display !== 'none') {
        window.anime.remove(detailView);
        window.anime({
            targets: detailView,
            opacity: [1, 0],
            duration: 380,
            easing: 'easeInOutQuad',
            complete: finishClose
        });
    } else {
        finishClose();
    }
}

// Story cover → gallery card: the reverse of morphFromCard. The cover is copied onto the
// overlay, the gallery is restored underneath at the user's place, and the cover shrinks
// back into the card it came from. Only while the cover is still on screen.
function morphToCard(finishClose) {
    if (voyageReduceMotion || lastOpenedCardId == null || typeof Element.prototype.animate !== 'function') return false;
    const detailView = document.getElementById('detail-view');
    const galleryView = document.getElementById('gallery-view');
    const heroCard = detailView.querySelector('.detail-arrival');
    const from = heroCard?.getBoundingClientRect();
    if (!from || from.bottom < window.innerHeight * 0.45) return false; // cover mostly scrolled away
    const photo = photos.find(item => item.id === lastOpenedCardId);
    if (!photo) return false;
    const fromRadius = getComputedStyle(heroCard);
    const radii = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
        .map(key => `${parseFloat(fromRadius[key]) || 0}px`).join(' ');

    // 1. Cover onto the overlay, exactly where it is now.
    const layer = ensureCardMorphLayer();
    Object.assign(layer.card.style, {
        left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
        borderRadius: radii, clipPath: `inset(0px 0px 0px 0px round ${radii})`
    });
    {
        const probe = lastOpenedGlobeMarker?.querySelector('img') || document.querySelector(`#gallery-grid .frame-card[data-photo-id="${photo.id}"] .frame-media img`);
        sizeMorphPhoto(layer, probe?.naturalWidth || 3, probe?.naturalHeight || 2, from);
    }
    layer.image.style.backgroundImage = `url("${imageVariant(photo.image, 'card')}")`;
    layer.image.style.transform = 'none';
    layer.image.style.filter = 'none';
    layer.hires.style.backgroundImage = `url("${imageVariant(photo.image, 'hero')}")`;
    layer.hires.style.opacity = '1';
    layer.wash.style.opacity = '1';
    layer.overlay.hidden = false;
    document.body.classList.add('card-morphing'); // nav stays hidden until the cover has landed

    // 2. Gallery back underneath, at the user's place, with no entrance motion.
    finishClose();
    galleryView.classList.add('skip-rise');
    galleryView.style.transition = 'none';
    galleryView.classList.add('active');
    void galleryView.offsetHeight;
    galleryView.style.removeProperty('transition');
    const cardEl = lastOpenedGlobeMarker || document.querySelector(`#gallery-grid .frame-card[data-photo-id="${photo.id}"]`);
    const media = lastOpenedGlobeMarker ? cardEl.querySelector('img') : cardEl?.querySelector('.frame-media');
    const thumb = media?.tagName === 'IMG' ? media : media?.querySelector('img');
    const to = media?.getBoundingClientRect();
    const resetLayer = () => {
        layer.overlay.hidden = true;
        [layer.card, layer.image, layer.hires, layer.wash].forEach(element => {
            element.getAnimations().forEach(animation => animation.cancel());
            element.removeAttribute('style');
        });
    };
    const cleanup = () => {
        document.body.classList.remove('card-morphing'); // nav fades back in with the hand-off
        if (!lastOpenedGlobeMarker) holdCardHover(cardEl);
        revealCardUnderOverlay(layer, cardEl, resetLayer);
    };
    if (!to || !thumb?.naturalWidth || to.bottom < 0 || to.top > window.innerHeight) {
        // Card not on screen: just dissolve the cover over the restored gallery.
        layer.card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' })
            .finished.then(cleanup).catch(cleanup);
        return true;
    }
    media.style.visibility = 'hidden'; // the photo only: the caption below fades in with the list

    // 3. Shrink into the card (same mapping as the open morph, reversed).
    const w = thumb.naturalWidth;
    const h = thumb.naturalHeight;
    const source = {
        left: from.left, top: from.top, width: from.width, height: from.height,
        radius: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
            .map(key => parseFloat(fromRadius[key]) || 0)
    };
    const toRadius = parseFloat(getComputedStyle(media).borderTopLeftRadius) || 0;
    const target = { left: to.left, top: to.top, width: to.width, height: to.height, radius: [toRadius, toRadius, toRadius, toRadius] };
    const duration = 640;
    const easing = 'cubic-bezier(0.5, 0, 0.15, 1)';
    const [shrink] = animateCoverMorph(layer.card, layer.image, source, target, w, h, { duration, easing, fill: 'forwards' }, 1, CARD_PHOTO_SCALE);
    layer.image.animate([{ filter: 'none' }, { filter: CARD_PHOTO_FILTER }], { duration, easing, fill: 'forwards' });
    // The sharp cover gives way to the card-sized photo the card itself shows.
    layer.hires.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' });
    layer.wash.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' });
    // The list comes up while the window is opening, so you actually see it fade in (it used to
    // finish inside the first 190 ms, hidden behind the still almost full-size cover). It starts
    // from a dim level, not black, so the margins around the cover are never an empty frame.
    galleryView.animate([{ opacity: 0.1 }, { opacity: 1 }], { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'backwards' });
    shrink.finished.then(cleanup).catch(cleanup);
    return true;
}

// A prerendered page (speculation rules from the home globe) must not play its entrance
// before the user actually lands on it.
function whenPageActive(task) {
    if (isAtlasEmbed) {
        // Preloaded by the home page: start the entrance only when it is revealed.
        const onMessage = event => {
            if (event.source !== window.parent || event.data?.type !== 'atlas:activate') return;
            window.removeEventListener('message', onMessage);
            task();
        };
        window.addEventListener('message', onMessage);
    } else if (document.prerendering) {
        document.addEventListener('prerenderingchange', task, { once: true });
    } else {
        task();
    }
}

// Tell the home page when the preloaded story is fully painted (cover decoded), so the swap
// from its morph card to this page is pixel-identical.
function announceEmbedReady(photo) {
    if (!isAtlasEmbed) return;
    const img = new Image();
    img.src = imageVariant(photo.image, 'hero');
    const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    decoded.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        postToAtlas({ type: 'ready', id: photo.id, title: document.title });
    })));
}

// Wide-screen series layout (used by the ≥1200px CSS on a 6-column grid): a feature frame
// with two stacked beside it, then rows of three — and the tail regrouped into rows of two
// so no row is ever left with a lone frame and an empty gap.
function applySeriesLayout(masonry) {
    const items = [...masonry.children];
    const n = items.length;
    const set = (item, cols, rows = 1) => {
        item.dataset.cols = String(cols);
        item.dataset.rows = String(rows);
    };
    if (n === 1) return set(items[0], 6, 2);
    if (n === 2 || n === 4) return items.forEach(item => set(item, 3, 2));
    set(items[0], 4, 2);
    set(items[1], 2);
    set(items[2], 2);
    const rest = items.slice(3);
    rest.forEach(item => set(item, 2));
    const remainder = rest.length % 3;
    if (remainder === 2) rest.slice(-2).forEach(item => set(item, 3, 2));
    if (remainder === 1) rest.slice(-4).forEach(item => set(item, 3, 2));
}

function clearMasonry() {
    const masonry = document.getElementById('detail-masonry');
    if (masonry) masonry.innerHTML = '';
}

function loadMasonry(photo) {
    // A delayed build for a story the user has already left (or switched away from) is dropped.
    if (!activePhoto || activePhoto.id !== photo.id) return;
    const masonry = document.getElementById('detail-masonry');
    masonry.innerHTML = '';

    // The cover is the opening frame of the complete series. Set removes it
    // when the same source is already present in morePics.
    const pics = [...new Set([photo.image, ...(photo.morePics || [])].filter(Boolean))];
    const hintContainer = document.querySelector('.scroll-hint-container');
    if (pics.length === 0) {
        document.querySelector('.other-perspectives-title').style.display = 'none';
        if (hintContainer) hintContainer.style.display = 'none';
    } else {
        document.querySelector('.other-perspectives-title').style.display = 'block';
        if (hintContainer) hintContainer.style.display = 'block';
        pics.forEach((src, index) => {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            if (index === 0) item.classList.add('is-cover');
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            const isEnglish = document.body.classList.contains('lang-en');
            item.setAttribute('aria-label', index === 0
                ? (isEnglish ? 'Open cover image preview' : '打开封面图片预览')
                : (isEnglish ? 'Open image preview' : '打开图片预览'));
            // A tiny cached preview fills the frame while the responsive image loads.
            item.style.backgroundImage = `url("${imageVariant(src, 'mini')}")`;
            const mobileSrc = src.replace('/original/', '/album/').replace(/\.jpe?g$/i, '.webp');
            item.innerHTML = `<picture><source media="(max-width: 760px)" srcset="${mobileSrc}"><img src="${imageVariant(src, 'card')}" alt="" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"></picture>`;
            item.addEventListener('click', () => openLightbox(src, item));
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLightbox(src, item);
                }
            });
            masonry.appendChild(item);
        });
        applySeriesLayout(masonry);
    }
}

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.getElementById('close-lightbox');
const lightboxImmerseBtn = document.getElementById('lightbox-immerse-btn');
let currentLightboxSrc = '';
let lightboxReturnFocus = null;
let lightboxAnimationTimer = null;

let lightboxSource = null;
let lightboxMorph = null;
let lightboxGeneration = 0;

function resetLightboxMorph() {
    if (!lightboxMorph) return;
    lightboxMorph.overlay.hidden = true;
    [lightboxMorph.card, lightboxMorph.image, lightboxMorph.hires, lightboxMorph.wash].forEach(element => {
        element.getAnimations().forEach(animation => animation.cancel());
        element.removeAttribute('style');
    });
    lightbox.classList.remove('is-morphing');
}

function animateLightboxPhoto(from, to, src, naturalW, naturalH, duration, closing = false) {
    if (!lightboxMorph) {
        lightboxMorph = createPhotoMorphLayer();
        lightboxMorph.overlay.classList.add('is-lightbox-morph');
    }
    const layer = lightboxMorph;
    layer.image.style.backgroundImage = `url("${src}")`;
    layer.hires.style.opacity = '0';
    layer.wash.style.background = 'none';
    const [animation] = animateCoverMorph(layer.card, layer.image, from, to, naturalW, naturalH, {
        duration, easing: 'cubic-bezier(0.3, 0, 0.12, 1)', fill: 'both'
    });
    layer.card.animate(closing
        ? [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1 }], {
        duration: closing ? duration : 120, easing: 'linear', fill: 'both'
    });
    lightbox.classList.add('is-morphing');
    layer.overlay.hidden = false;
    // The backdrop and close button stay interactive while the photo moves.
    layer.overlay.style.pointerEvents = 'none';
    return animation.finished;
}

function openLightbox(src, source = null) {
    window.clearTimeout(lightboxAnimationTimer);
    const generation = ++lightboxGeneration;
    resetLightboxMorph();
    currentLightboxSrc = src;
    lightboxSource = source;
    lightboxReturnFocus = source || document.activeElement;
    const thumb = source?.querySelector('img');
    const previewSrc = thumb?.naturalWidth ? (thumb.currentSrc || thumb.src) : imageVariant(src, 'mini');
    const naturalW = thumb?.naturalWidth || 3;
    const naturalH = thumb?.naturalHeight || 2;
    const scale = Math.min(Math.min(window.innerWidth * 0.92, 1500) / naturalW, window.innerHeight * 0.86 / naturalH);
    const width = naturalW * scale;
    const height = naturalH * scale;
    const target = { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height, radius: [18, 18, 18, 18] };
    lightbox.classList.remove('show', 'image-ready');
    lightboxImg.src = previewSrc;
    // A small cached bitmap must occupy the same box as the sharper replacement.
    lightboxImg.style.width = `${width}px`;
    lightboxImg.style.height = `${height}px`;
    lightboxImg.alt = activePhoto
        ? (document.body.classList.contains('lang-en') ? activePhoto.titleEn : activePhoto.titleZh)
        : '';
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    if (!history.state?.lightbox) history.pushState({ ...(history.state || {}), lightbox: true }, '');
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');

    let opening = Promise.resolve();
    if (source && thumb?.naturalWidth && !voyageReduceMotion && typeof Element.prototype.animate === 'function') {
        const rect = source.getBoundingClientRect();
        const radius = parseFloat(getComputedStyle(source).borderTopLeftRadius) || 0;
        const from = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius: [radius, radius, radius, radius] };
        opening = animateLightboxPhoto(from, target, previewSrc, naturalW, naturalH, 520);
    }
    // Show the cached photo immediately; a slow network never holds the preview closed.
    requestAnimationFrame(() => {
        if (generation !== lightboxGeneration) return;
        lightbox.classList.add('show', 'image-ready');
        closeLightboxBtn?.focus({ preventScroll: true });
    });
    opening.then(() => {
        if (generation === lightboxGeneration) resetLightboxMorph();
    }).catch(() => {});

    // Decode a screen-sized image separately before swapping it in. Original files
    // can contain tens of megapixels and are unnecessary for a phone-sized preview.
    const sharp = new Image();
    sharp.decoding = 'async';
    sharp.src = imageVariant(src, 'hero');
    const decoded = sharp.decode ? sharp.decode() : new Promise((resolve, reject) => {
        sharp.onload = resolve;
        sharp.onerror = reject;
    });
    Promise.all([opening, decoded]).then(() => {
        if (generation !== lightboxGeneration || lightbox.hidden) return;
        lightboxImg.src = sharp.src;
    }).catch(() => {}); // Keep the already visible preview on download failure.
}

function closeLightbox(fromHistory = false) {
    if (!lightbox || lightbox.hidden) return;
    if (!fromHistory && history.state?.lightbox) {
        history.back();
        return;
    }
    window.clearTimeout(lightboxAnimationTimer);
    const generation = ++lightboxGeneration;
    // If closed during the opening morph, reverse from its current visible crop.
    let from = null;
    if (lightbox.classList.contains('is-morphing') && lightboxMorph) {
        const rect = lightboxMorph.card.getBoundingClientRect();
        const clip = getComputedStyle(lightboxMorph.card).clipPath;
        const values = clip.slice(6).split(' round')[0].split(' ').map(parseFloat);
        const top = values[0], right = values[1] ?? top, bottom = values[2] ?? top, left = values[3] ?? right;
        from = { left: rect.left + left, top: rect.top + top, width: rect.width - left - right, height: rect.height - top - bottom, radius: [18, 18, 18, 18] };
    }
    if (!from) {
        const rect = lightboxImg.getBoundingClientRect();
        from = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius: [18, 18, 18, 18] };
    }
    resetLightboxMorph();
    lightbox.classList.remove('show', 'image-ready');
    lightbox.setAttribute('aria-hidden', 'true');
    const finish = () => {
        if (generation !== lightboxGeneration) return;
        resetLightboxMorph();
        lightbox.hidden = true;
        lightboxImg.removeAttribute('src');
        lightboxImg.style.removeProperty('width');
        lightboxImg.style.removeProperty('height');
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('--scrollbar-compensation');
        if (lightboxReturnFocus instanceof HTMLElement && lightboxReturnFocus.isConnected) {
            lightboxReturnFocus.focus({ preventScroll: true });
        }
    };
    const toRect = lightboxSource?.isConnected ? lightboxSource.getBoundingClientRect() : null;
    if (!voyageReduceMotion && typeof Element.prototype.animate === 'function' && lightboxImg.naturalWidth && toRect?.width && toRect.bottom > 0 && toRect.top < window.innerHeight) {
        const radius = parseFloat(getComputedStyle(lightboxSource).borderTopLeftRadius) || 0;
        const to = { left: toRect.left, top: toRect.top, width: toRect.width, height: toRect.height, radius: [radius, radius, radius, radius] };
        animateLightboxPhoto(from, to, lightboxImg.currentSrc || lightboxImg.src, lightboxImg.naturalWidth, lightboxImg.naturalHeight, 360, true)
            .then(finish).catch(() => {});
    } else {
        lightboxAnimationTimer = window.setTimeout(finish, voyageReduceMotion ? 0 : 320);
    }
}

lightbox.addEventListener('click', (e) => {
    const clickedImmerse = lightboxImmerseBtn && (e.target === lightboxImmerseBtn || lightboxImmerseBtn.contains(e.target));
    if (e.target !== lightboxImg && !clickedImmerse) {
        closeLightbox();
    }
});

closeLightboxBtn?.addEventListener('click', event => {
    event.stopPropagation();
    closeLightbox();
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (heroSection.classList.contains('zen-mode')) {
        event.preventDefault();
        exitZenMode();
        return;
    }
    if (lightbox && !lightbox.hidden) {
        event.preventDefault();
        closeLightbox();
        return;
    }
    // Esc on a story (no dialog or menu open) = the back button.
    const shareOpen = document.getElementById('share-popup-modal')?.classList.contains('show');
    const navOpen = document.getElementById('card-nav')?.classList.contains('open');
    if (activePhoto && !shareOpen && !navOpen && document.body.classList.contains('showing-detail')) {
        event.preventDefault();
        goBackFromDetail();
    }
});

// Event Listeners
const backButton = document.getElementById('back-btn');
backButton.addEventListener('click', goBackFromDetail);
if (cameFromAtlas) {
    backButton.innerHTML = '<span aria-hidden="true">←</span><span class="lang-en">BACK TO ATLAS</span><span class="lang-zh">返回地球</span>';
}
const voyageShareBtn = document.getElementById('voyage-share-btn');
if (voyageShareBtn) {
    voyageShareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activePhoto && typeof window.openShareModal === 'function') {
            window.openShareModal(activePhoto, 'voyage');
        }
    });
}

// Zen Mode Logic
const heroSection = document.getElementById('detail-hero');
const immerseBtn = document.getElementById('immerse-btn');

let isPanning = false;
let hasDragged = false;
let preZenScrollY = 0;
let startMouseX = 0;
let startMouseY = 0;
let startPanX = 0;
let startPanY = 0;

let zoomScale = 1.0;
const minScale = 1.0;
const maxScale = 4.0;
let panX = 0;
let panY = 0;

let initialPinchDistance = 0;
let initialZoomScale = 1.0;

let imgNaturalWidth = 0;
let imgNaturalHeight = 0;

function updateImageDimensions(url) {
    let cleanUrl = url;
    if (url.startsWith('url(')) {
        cleanUrl = url.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    }

    const tempImg = new Image();
    tempImg.src = cleanUrl;
    tempImg.onload = () => {
        imgNaturalWidth = tempImg.naturalWidth;
        imgNaturalHeight = tempImg.naturalHeight;
        updateBgTransform();
    };
}

function updateBgTransform() {
    const bg = document.getElementById('detail-hero-bg');
    if (!bg) return;

    let limitX = 0;
    let limitY = 0;

    if (heroSection.classList.contains('zen-mode') && imgNaturalWidth > 0 && imgNaturalHeight > 0) {
        const containerW = window.innerWidth;
        const containerH = window.innerHeight;

        // Calculate dimensions of image scaled under "background-size: cover"
        const scaleCover = Math.max(containerW / imgNaturalWidth, containerH / imgNaturalHeight);
        const imgW = imgNaturalWidth * scaleCover;
        const imgH = imgNaturalHeight * scaleCover;

        // Set explicit dimensions and centering on the background element
        bg.style.width = imgW + 'px';
        bg.style.height = imgH + 'px';
        bg.style.left = (containerW - imgW) / 2 + 'px';
        bg.style.top = (containerH - imgH) / 2 + 'px';

        // Apply current pinch/scroll zoom factor
        const totalW = imgW * zoomScale;
        const totalH = imgH * zoomScale;

        // Calculate max bounds allowing scrolling/dragging to hidden cropped parts
        limitX = Math.max(0, (totalW - containerW) / 2);
        limitY = Math.max(0, (totalH - containerH) / 2);
    } else {
        // Restore defaults when not in Zen Mode
        bg.style.width = '100%';
        bg.style.height = '100%';
        bg.style.left = '0';
        bg.style.top = '0';

        // Fallback or standard zoom limits
        limitX = window.innerWidth * (zoomScale - 1) / 2;
        limitY = window.innerHeight * (zoomScale - 1) / 2;
    }

    panX = Math.min(limitX, Math.max(-limitX, panX));
    panY = Math.min(limitY, Math.max(-limitY, panY));

    // Identity transforms are left unset: writing one would promote and re-raster the
    // cover layer for no visual change, which shows as a jolt right after arrival.
    const isIdentity = panX === 0 && panY === 0 && zoomScale === 1;
    bg.style.transform = isIdentity ? '' : `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
}

function startPan(clientX, clientY) {
    if (!heroSection.classList.contains('zen-mode')) return;
    isPanning = true;
    hasDragged = false;
    startMouseX = clientX;
    startMouseY = clientY;
    startPanX = panX;
    startPanY = panY;
    const bg = document.getElementById('detail-hero-bg');
    if (bg) bg.style.transition = 'none'; // Instant drag response
}

function doPan(clientX, clientY) {
    if (!isPanning) return;
    const deltaX = clientX - startMouseX;
    const deltaY = clientY - startMouseY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged = true;
        heroSection.classList.add('has-panned');
    }

    panX = startPanX + deltaX;
    panY = startPanY + deltaY;
    updateBgTransform();
}

function stopPan() {
    isPanning = false;
    const bg = document.getElementById('detail-hero-bg');
    if (bg) bg.style.transition = 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
}

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// PC Mouse Drag Events
heroSection.addEventListener('mousedown', (e) => {
    if (e.button === 0) startPan(e.clientX, e.clientY);
});
window.addEventListener('mousemove', (e) => doPan(e.clientX, e.clientY));
window.addEventListener('mouseup', stopPan);

// Mobile Touch Events (Pinch and Pan)
heroSection.addEventListener('touchstart', (e) => {
    if (!heroSection.classList.contains('zen-mode')) return;
    if (e.touches.length === 1) {
        startPan(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        isPanning = false; // Disable single finger pan during pinch zoom
        initialPinchDistance = getDistance(e.touches);
        initialZoomScale = zoomScale;
    }
});

window.addEventListener('touchmove', (e) => {
    if (!heroSection.classList.contains('zen-mode')) return;
    if (e.touches.length === 1) {
        doPan(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        e.preventDefault(); // Prevent native browser pinch zoom
        const currentDistance = getDistance(e.touches);
        const factor = currentDistance / initialPinchDistance;
        zoomScale = Math.min(maxScale, Math.max(minScale, initialZoomScale * factor));
        if (zoomScale > minScale) {
            heroSection.classList.add('has-panned');
        }
        updateBgTransform();
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    stopPan();
});

// PC Mouse Wheel Zoom Event
window.addEventListener('wheel', (e) => {
    if (!heroSection.classList.contains('zen-mode')) return;
    e.preventDefault(); // Prevent page scroll

    // Hide hint immediately on scroll wheel zoom
    heroSection.classList.add('has-panned');

    const zoomIntensity = 0.08;
    const delta = -e.deltaY;

    if (delta > 0) {
        zoomScale = Math.min(maxScale, zoomScale + zoomIntensity);
    } else {
        zoomScale = Math.max(minScale, zoomScale - zoomIntensity);
    }

    updateBgTransform();
}, { passive: false });

function smoothScrollToTop(callback) {
    const start = window.scrollY;
    if (start === 0) {
        callback();
        return;
    }

    const duration = 1200; // 1.2 seconds for slow, cinematic easing
    const startTime = performance.now();

    // Smooth ease-in-out cubic curve
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(currentTime) {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        jumpTo(start * (1 - ease));

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            jumpTo(0);
            callback();
        }
    }

    requestAnimationFrame(animate);
}

function smoothScrollTo(targetY, duration) {
    const start = window.scrollY;
    const change = targetY - start;
    if (change === 0) return;

    const startTime = performance.now();

    // Smooth ease-in-out cubic curve
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(currentTime) {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        jumpTo(start + change * ease);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            jumpTo(targetY);
        }
    }

    requestAnimationFrame(animate);
}

let isFixedZen = false;

function enterZenMode(isLightbox) {
    isFixedZen = isLightbox;
    zoomScale = 1.0;
    panX = 0;
    panY = 0;
    updateBgTransform();

    if (isLightbox) {
        preZenScrollY = window.scrollY; // Save current scroll position before layout changes
        heroSection.classList.add('zen-fixed');
        document.body.classList.add('zen-fixed-active');
    } else {
        // Smoothly scroll to top for cover photo immersion
        smoothScrollTo(0, 1200);
    }

    heroSection.classList.add('zen-mode');
    document.body.classList.add('zen-active');
    document.body.style.overflow = 'hidden';
    heroSection.classList.remove('has-panned');
}

if (immerseBtn) {
    immerseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterZenMode(false);
    });
}

// Lightbox Immerse Button Event
if (lightboxImmerseBtn) {
    lightboxImmerseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentLightboxSrc) {
            lightbox.classList.remove('show');
            document.getElementById('detail-hero-bg').style.backgroundImage = `url('${currentLightboxSrc}')`;
            updateImageDimensions(currentLightboxSrc);

            // Enter zen mode immediately - it expands in place
            enterZenMode(true);
        }
    });
}

function exitZenMode(instant = false) {
    if (instant) {
        heroSection.classList.remove('zen-mode', 'zen-fixed', 'zen-exiting', 'has-panned');
        document.body.classList.remove('zen-active', 'zen-fixed-active');
        document.body.style.overflow = '';
        zoomScale = 1.0;
        panX = 0;
        panY = 0;
        updateBgTransform();
        return;
    }
    if (isFixedZen) {
        if (heroSection.classList.contains('zen-exiting')) return;
        heroSection.classList.add('zen-exiting');

        // Wait for CSS scale & fade-out animation (1200ms) before returning to relative layout
        setTimeout(() => {
            heroSection.classList.remove('zen-mode');
            heroSection.classList.remove('zen-fixed');
            heroSection.classList.remove('zen-exiting');
            document.body.classList.remove('zen-active');
            document.body.classList.remove('zen-fixed-active');
            document.body.style.overflow = '';

            // Instantly restore scroll position
            jumpTo(preZenScrollY);

            heroSection.classList.remove('has-panned');
            zoomScale = 1.0;
            panX = 0;
            panY = 0;
            updateBgTransform();
            if (activePhoto) {
                document.getElementById('detail-hero-bg').style.backgroundImage = `url('${imageVariant(activePhoto.image, 'hero')}'), url('${imageVariant(activePhoto.image, 'mini')}')`;
                updateImageDimensions(imageVariant(activePhoto.image, 'hero'));
            }
            // The lightbox this immersive view came from is only visually hidden — close it
            // properly so it doesn't keep its history entry and scroll lock.
            if (lightbox && !lightbox.hidden) closeLightbox();
        }, 1200);
    } else {
        // Cover photo exit: standard relative transition (smoothly transitions height back to 80vh)
        heroSection.classList.remove('zen-mode');
        document.body.classList.remove('zen-active');
        document.body.style.overflow = '';
        heroSection.classList.remove('has-panned');
        zoomScale = 1.0;
        panX = 0;
        panY = 0;
        updateBgTransform();
    }
}

heroSection.addEventListener('click', (e) => {
    if (hasDragged) {
        hasDragged = false;
        return; // do not exit zen mode if we were dragging
    }
    if (heroSection.classList.contains('zen-mode')) {
        exitZenMode();
    }
});

// Function to update dynamic voyage title
if (isAtlasEmbed) {
    let scrollFrame = 0;
    window.addEventListener('scroll', () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = 0;
            postToAtlas({ type: 'scroll', y: window.scrollY });
        });
    }, { passive: true });
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (link && !link.target) link.target = '_top';
    }, true);
}

function updateVoyageTitle(lang) {
    if (activePhoto) {
        if (lang === 'en') {
            document.title = `STEVEN ZHANG | ${activePhoto.titleEn}`;
        } else {
            document.title = `STEVEN ZHANG | ${activePhoto.titleZh}`;
        }
        postToAtlas({ type: 'title', title: document.title });
    } else {
        if (lang === 'en') {
            document.title = "STEVEN ZHANG | The Voyage Archive";
        } else {
            document.title = "STEVEN ZHANG | 时空档案室";
        }
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasId = urlParams.has('id');
    
    if (!hasId) {
        document.getElementById('gallery-view').style.display = 'flex';
        document.getElementById('gallery-view').classList.add('active');
    }

    // Language setup
    let currentLang = safeStorage.getItem('voyage_lang') || 'zh';
    document.body.classList.remove('lang-zh', 'lang-en');
    document.body.classList.add(`lang-${currentLang}`);
    updateVoyageTitle(currentLang);

    setupFilters();
    renderArchiveStats();
    initGallery();

    if (hasId) {
        const targetId = parseInt(urlParams.get('id'), 10);
        const targetPhoto = photos.find(p => p.id === targetId);
        if (targetPhoto) {
            // Drop the hand-off marker (?from=atlas) so Back/Share use the clean URL.
            if (urlParams.has('from') && !isAtlasEmbed) {
                try { history.replaceState(history.state, '', `voyage.html?id=${targetId}`); } catch (error) { /* ignore */ }
            }
            document.getElementById('gallery-view').classList.remove('active');
            document.getElementById('gallery-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'block';
            openDetail(targetPhoto, true);
        } else {
            document.getElementById('gallery-view').style.display = 'flex';
            document.getElementById('gallery-view').classList.add('active');
        }
    }

    // Prevent Flash of Unstyled Text (FOUT) and ensure transition starts from opacity: 0
    setTimeout(() => {
        if (document.fonts) {
            document.fonts.ready.then(() => {
                document.body.classList.add('fonts-loaded');
            });
            setTimeout(() => {
                document.body.classList.add('fonts-loaded');
            }, 1000);
        } else {
            document.body.classList.add('fonts-loaded');
        }
    }, 80);
});

window.addEventListener('site:globe-story', event => {
    const photo = photos.find(item => item.id === event.detail.id);
    if (photo && !activePhoto) openDetail(photo, false, { fromGallery: true, source: event.detail.source });
});

// Handle Browser Back / Forward buttons without page reloads
window.addEventListener('popstate', () => {
    // Back from an open image / immersive view only closes that layer.
    if (lightbox && !lightbox.hidden && !history.state?.lightbox) {
        if (heroSection.classList.contains('zen-mode')) exitZenMode(true);
        closeLightbox(true);
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        const targetId = parseInt(urlParams.get('id'), 10);
        const targetPhoto = photos.find(p => p.id === targetId);
        if (targetPhoto) {
            openDetail(targetPhoto, true);
        }
    } else if (activePhoto) {
        closeDetail();
    }
});

window.addEventListener('site:languagechange', event => {
    updateVoyageTitle(event.detail.lang);
    if (currentViewMode === 'grid') initGallery(currentCountry, currentEra);
});
