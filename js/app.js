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


function initGallery(countryFilter = 'ALL', eraFilter = 'ALL') {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    const filteredPhotos = photos.filter(photo => {
        const loc = parseLocation(photo.location);
        const matchCountry = countryFilter === 'ALL' || loc.enSub === countryFilter;

        const photoYear = photo.date.split(', ')[1];
        let matchEra = eraFilter === 'ALL';
        if (eraFilter === '<2025') {
            matchEra = parseInt(photoYear) < 2025;
        } else if (eraFilter !== 'ALL') {
            const validYears = eraFilter.split(',');
            matchEra = validYears.includes(photoYear);
        }
        return matchCountry && matchEra;
    });

    filteredPhotos.forEach((photo, index) => {
        const loc = parseLocation(photo.location);
        const dateLoc = parseDate(photo.date);
        const card = document.createElement('div');
        card.className = 'analog-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', document.body.classList.contains('lang-en') ? `Open ${loc.enTitle}` : `打开${loc.zhTitle}`);
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">
                    <span class="lang-en">${loc.enTitle}</span>
                    <span class="lang-zh">${loc.zhTitle}</span>
                </h3>
                <p class="card-subtitle">
                    <span class="lang-en">${loc.enSub} | ${dateLoc.en}</span>
                    <span class="lang-zh">${loc.zhSub} | ${dateLoc.zh}</span>
                </p>
            </div>
            <div class="card-image-container">
                <img src="${photo.image}" alt="${loc.enTitle}" class="card-image" loading="lazy">
            </div>
            <div class="card-footer">${photo.exif}</div>
        `;

        card.addEventListener('click', () => openDetail(photo));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDetail(photo);
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

function openDetail(photo, instant = false) {
    // Update browser URL in-place without page reload
    const targetSearch = `?id=${photo.id}`;
    if (window.location.search !== targetSearch) {
        history.pushState({ id: photo.id }, '', `voyage.html${targetSearch}`);
    }
    
    activePhoto = photo;
    updateVoyageTitle(safeStorage.getItem('voyage_lang') || 'zh');

    const loc = parseLocation(photo.location);
    const dateLoc = parseDate(photo.date);

    // Set hero content
    document.getElementById('detail-hero-bg').style.backgroundImage = `url('${photo.image}')`;
    updateImageDimensions(photo.image);
    document.getElementById('detail-title').innerHTML = `<span class="lang-en">${loc.enTitle}</span><span class="lang-zh">${loc.zhTitle}</span>`;
    document.getElementById('detail-subtitle').innerHTML = `<span class="lang-en">${loc.enSub} | ${dateLoc.en}</span><span class="lang-zh">${loc.zhSub} | ${dateLoc.zh}</span>`;

    // Set Story content
    document.getElementById('detail-story-title').innerHTML = `<span class="lang-en">${photo.titleEn}</span><span class="lang-zh">${photo.titleZh}</span>`;
    document.getElementById('detail-story').innerHTML = `<span class="lang-zh">${photo.storyZh}</span><span class="lang-en"><i>${photo.storyEn}</i></span>`;

    // Regional location information. Coordinates intentionally point to the
    // wider area rather than the exact camera position.
    const regionalCoords = locationRawCoords[photo.location];
    const locationName = document.getElementById('detail-location-name');
    const locationCountry = document.getElementById('detail-location-country');
    const locationCoordinates = document.getElementById('detail-location-coordinates');
    const locationPin = document.getElementById('detail-location-pin');

    if (locationName) {
        locationName.innerHTML = `<span class="lang-en">${loc.enTitle}</span><span class="lang-zh">${loc.zhTitle}</span>`;
    }
    if (locationCountry) {
        locationCountry.innerHTML = `<span class="lang-en">${loc.enSub}</span><span class="lang-zh">${loc.zhSub}</span>`;
    }
    if (regionalCoords && locationCoordinates && locationPin) {
        const latitude = `${Math.abs(regionalCoords.lat).toFixed(1)}° ${regionalCoords.lat >= 0 ? 'N' : 'S'}`;
        const longitude = `${Math.abs(regionalCoords.lon).toFixed(1)}° ${regionalCoords.lon >= 0 ? 'E' : 'W'}`;
        locationCoordinates.textContent = `${latitude} · ${longitude}`;
        locationPin.style.left = `${((regionalCoords.lon + 180) / 360) * 100}%`;
        locationPin.style.top = `${((90 - regionalCoords.lat) / 180) * 100}%`;
    } else if (locationCoordinates) {
        locationCoordinates.textContent = '—';
    }

    const breadcrumbCurrent = document.getElementById('breadcrumb-current-title');
    if (breadcrumbCurrent) {
        breadcrumbCurrent.innerHTML = `<span class="lang-en">${photo.titleEn}</span><span class="lang-zh">${photo.titleZh}</span>`;
    }

    if (instant) {
        document.getElementById('gallery-view').classList.remove('active');
        document.getElementById('gallery-view').style.display = 'none';
        document.getElementById('detail-view').style.display = 'flex';
        document.getElementById('detail-view').classList.add('active');
        document.documentElement.classList.remove('direct-detail-load');
        window.scrollTo(0, 0);
        loadMasonry(photo);
    } else {
        // Switch views smoothly
        document.getElementById('gallery-view').classList.remove('active');
        setTimeout(() => {
            document.getElementById('gallery-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'flex';
            setTimeout(() => document.getElementById('detail-view').classList.add('active'), 50);

            window.scrollTo(0, 0);
            loadMasonry(photo);
        }, 500); // match transition time
    }
}

function closeDetail() {
    if (window.location.search) {
        history.pushState(null, '', 'voyage.html');
    }
    
    document.getElementById('detail-view').classList.remove('active');
    setTimeout(() => {
        document.getElementById('detail-view').style.display = 'none';
        document.getElementById('gallery-view').style.display = 'flex';
        setTimeout(() => document.getElementById('gallery-view').classList.add('active'), 50);
    }, 400);
}

function loadMasonry(photo) {
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
            item.innerHTML = `<img src="${src}" alt="" loading="lazy"${index === 0 ? ' fetchpriority="high"' : ''}>`;
            item.addEventListener('click', () => openLightbox(src));
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLightbox(src);
                }
            });
            masonry.appendChild(item);
        });
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

function openLightbox(src) {
    window.clearTimeout(lightboxAnimationTimer);
    currentLightboxSrc = src;
    lightboxReturnFocus = document.activeElement;
    lightbox.classList.remove('show', 'image-ready');
    lightboxImg.src = src;
    lightboxImg.alt = activePhoto
        ? (document.body.classList.contains('lang-en') ? activePhoto.titleEn : activePhoto.titleZh)
        : '';
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');

    const revealImage = () => {
        if (currentLightboxSrc === src && !lightbox.hidden) {
            window.requestAnimationFrame(() => lightbox.classList.add('image-ready'));
        }
    };
    if (lightboxImg.complete) revealImage();
    else {
        lightboxImg.addEventListener('load', revealImage, { once: true });
        lightboxImg.addEventListener('error', revealImage, { once: true });
    }

    // Let the browser paint the initial state before starting the transition.
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            lightbox.classList.add('show');
            closeLightboxBtn?.focus({ preventScroll: true });
        });
    });
}

function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    window.clearTimeout(lightboxAnimationTimer);
    lightbox.classList.remove('show', 'image-ready');
    lightbox.setAttribute('aria-hidden', 'true');

    lightboxAnimationTimer = window.setTimeout(() => {
        if (lightbox.classList.contains('show')) return;
        lightbox.hidden = true;
        lightboxImg.removeAttribute('src');
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('--scrollbar-compensation');
        if (lightboxReturnFocus instanceof HTMLElement) {
            lightboxReturnFocus.focus({ preventScroll: true });
        }
    }, 320);
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
    if (event.key === 'Escape' && lightbox && !lightbox.hidden) {
        event.preventDefault();
        closeLightbox();
    }
});

// Event Listeners
document.getElementById('back-btn').addEventListener('click', closeDetail);
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

    bg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
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

        window.scrollTo(0, start * (1 - ease));

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            window.scrollTo(0, 0);
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

        window.scrollTo(0, start + change * ease);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            window.scrollTo(0, targetY);
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

function exitZenMode() {
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
            window.scrollTo(0, preZenScrollY);

            heroSection.classList.remove('has-panned');
            zoomScale = 1.0;
            panX = 0;
            panY = 0;
            updateBgTransform();
            if (activePhoto) {
                document.getElementById('detail-hero-bg').style.backgroundImage = `url('${activePhoto.image}')`;
                updateImageDimensions(activePhoto.image);
            }
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
function updateVoyageTitle(lang) {
    if (activePhoto) {
        if (lang === 'en') {
            document.title = `STEVEN ZHANG | ${activePhoto.titleEn}`;
        } else {
            document.title = `STEVEN ZHANG | ${activePhoto.titleZh}`;
        }
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
    initGallery();
    preloadAllImages();

    if (hasId) {
        const targetId = parseInt(urlParams.get('id'), 10);
        const targetPhoto = photos.find(p => p.id === targetId);
        if (targetPhoto) {
            document.getElementById('gallery-view').classList.remove('active');
            document.getElementById('gallery-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'flex';
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

// Preload all vault images into browser memory cache
function preloadAllImages() {
    photos.forEach(photo => {
        if (photo.image) {
            const img = new Image();
            img.src = photo.image;
        }
        if (photo.morePics && Array.isArray(photo.morePics)) {
            photo.morePics.forEach(src => {
                const img = new Image();
                img.src = src;
            });
        }
    });
}

// Handle Browser Back / Forward buttons without page reloads
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('id')) {
        const targetId = parseInt(urlParams.get('id'), 10);
        const targetPhoto = photos.find(p => p.id === targetId);
        if (targetPhoto) {
            openDetail(targetPhoto, true);
        }
    } else {
        closeDetail();
    }
});

window.addEventListener('site:languagechange', event => {
    updateVoyageTitle(event.detail.lang);
    if (currentViewMode === 'grid') initGallery(currentCountry, currentEra);
});
