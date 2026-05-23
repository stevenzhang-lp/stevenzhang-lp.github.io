// locationMap, monthMap, parseDate, and parseLocation are loaded globally from data.js


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
        grid.appendChild(card);
    });
}

// Global State for Filters and Views
let activePhoto = null;
let currentCountry = 'ALL';
let currentEra = 'ALL';
let currentViewMode = 'grid';

const locationCoords = {
    'CHINA·XINJIANG': { x: 200, y: 180 },
    'CHINA·YUNNAN': { x: 350, y: 380 },
    'CHINA·JIANGXI': { x: 520, y: 360 },
    'CHINA·HONG KONG': { x: 525, y: 410 },
    'CHINA·TAIPEI': { x: 620, y: 380 },
    'MALAYSIA·PENANG': { x: 440, y: 520 },
    'MALAYSIA·KUALA LUMPUR': { x: 455, y: 555 },
    'MALAYSIA·PUTRAJAYA': { x: 465, y: 565 },
    'SINGAPORE': { x: 480, y: 590 }
};

const mapSvgContent = `
<svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
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

    <!-- Landmass Outlines (East & Southeast Asia Schematic) -->
    <!-- China Mainland -->
    <path class="map-land" d="M160,140 L280,100 L420,90 L520,110 L600,130 L640,170 L610,230 L630,270 L580,300 L540,310 L510,360 L490,390 L430,370 L380,360 L330,350 L280,300 L180,290 Z" />
    <!-- Taiwan Island -->
    <path class="map-land" d="M605,360 L620,350 L630,370 L620,390 L610,385 Z" />
    <!-- Hainan Island -->
    <path class="map-land" d="M470,420 A15,10 0 1,0 500,420 A15,10 0 1,0 470,420" />
    <!-- Indochina / Indochinese Peninsula -->
    <path class="map-land" d="M430,370 L460,375 L480,420 L450,460 L430,500 L450,530 L430,530 L390,460 L380,410 L380,360 Z" />
    <!-- West Malaysia -->
    <path class="map-land" d="M430,530 L450,530 L470,555 L475,580 L465,585 L445,570 L430,545 Z" />
    <!-- East Malaysia -->
    <path class="map-land" d="M530,560 L570,545 L620,535 L640,540 L600,570 L550,580 Z" />

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
    
    const pinsGroup = document.getElementById('map-pins');
    const routesGroup = document.getElementById('map-routes');
    
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
        
        pinG.innerHTML = `
            <circle class="map-pin-pulse" cx="${x}" cy="${y}" r="10" />
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
        
        pinsGroup.appendChild(pinG);
    });
    
    // 3. Render Travel Routes (curves connecting locations chronologically)
    const travelOrder = [
        'CHINA·JIANGXI',
        'CHINA·YUNNAN',
        'CHINA·HONG KONG',
        'CHINA·XINJIANG',
        'MALAYSIA·PENANG',
        'MALAYSIA·KUALA LUMPUR',
        'MALAYSIA·PUTRAJAYA',
        'SINGAPORE',
        'CHINA·TAIPEI'
    ];
    
    for (let i = 0; i < travelOrder.length - 1; i++) {
        const locA = travelOrder[i];
        const locB = travelOrder[i+1];
        
        const coordA = locationCoords[locA];
        const coordB = locationCoords[locB];
        
        if (coordA && coordB) {
            const pathD = getCurvePath(coordA.x, coordA.y, coordB.x, coordB.y);
            const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            routePath.setAttribute('class', 'travel-route');
            routePath.setAttribute('d', pathD);
            routePath.setAttribute('data-from-coords', `${coordA.x},${coordA.y}`);
            routePath.setAttribute('data-to-coords', `${coordB.x},${coordB.y}`);
            
            routesGroup.appendChild(routePath);
        }
    }
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
    
    const tooltip = document.getElementById('map-tooltip');
    if (!tooltip) return;
    
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
    
    // Position percentage-based to be responsive
    tooltip.style.left = `${(x / 800) * 100}%`;
    tooltip.style.top = `${(y / 600) * 100}%`;
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
    const routes = document.querySelectorAll('.travel-route');
    
    // 1. Filter Pins
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
    
    // 2. Filter Routes
    routes.forEach(route => {
        const fromCoords = route.getAttribute('data-from-coords');
        const toCoords = route.getAttribute('data-to-coords');
        
        const fromPin = document.querySelector(`.map-pin-group[data-coords="${fromCoords}"]`);
        const toPin = document.querySelector(`.map-pin-group[data-coords="${toCoords}"]`);
        
        if (fromPin && toPin && !fromPin.classList.contains('filtered-out') && !toPin.classList.contains('filtered-out')) {
            route.classList.remove('filtered-out');
        } else {
            route.classList.add('filtered-out');
        }
    });
}

function setupFilters() {
    const countryItems = document.querySelectorAll('#country-filter li');
    const eraItems = document.querySelectorAll('#era-filter li');

    countryItems.forEach(item => {
        item.addEventListener('click', () => {
            countryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCountry = item.getAttribute('data-country');
            if (currentViewMode === 'grid') {
                initGallery(currentCountry, currentEra);
            } else {
                filterMapPins(currentCountry, currentEra);
            }
        });
    });

    eraItems.forEach(item => {
        item.addEventListener('click', () => {
            eraItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
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
        item.addEventListener('click', () => {
            viewToggleItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
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
    activePhoto = photo;
    updateVoyageTitle(localStorage.getItem('voyage_lang') || 'zh');

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

    if (instant) {
        document.getElementById('gallery-view').classList.remove('active');
        document.getElementById('gallery-view').style.display = 'none';
        document.getElementById('detail-view').style.display = 'flex';
        document.getElementById('detail-view').classList.add('active');
        document.documentElement.classList.remove('direct-detail-load');
        window.scrollTo(0, 0);
        loadMasonry(photo);
    } else {
        // Switch views
        document.getElementById('gallery-view').classList.remove('active');
        setTimeout(() => {
            document.getElementById('gallery-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'flex';
            // Small delay for fade in
            setTimeout(() => document.getElementById('detail-view').classList.add('active'), 50);

            window.scrollTo(0, 0);
            loadMasonry(photo);
        }, 500); // match transition time
    }
}

function closeDetail() {
    activePhoto = null;
    updateVoyageTitle(localStorage.getItem('voyage_lang') || 'zh');

    // Clean URL query parameters to avoid re-triggering on reload
    if (window.location.search) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
    }

    document.getElementById('detail-view').classList.remove('active');
    setTimeout(() => {
        document.getElementById('detail-view').style.display = 'none';
        document.getElementById('gallery-view').style.display = 'flex';
        setTimeout(() => document.getElementById('gallery-view').classList.add('active'), 50);
    }, 500);
}

function loadMasonry(photo) {
    const masonry = document.getElementById('detail-masonry');
    masonry.innerHTML = '';

    const pics = photo.morePics || [];
    if (pics.length === 0) {
        document.querySelector('.other-perspectives-title').style.display = 'none';
    } else {
        document.querySelector('.other-perspectives-title').style.display = 'block';
        pics.forEach(src => {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            item.innerHTML = `<img src="${src}" loading="lazy">`;
            item.addEventListener('click', () => openLightbox(src));
            masonry.appendChild(item);
        });
    }
}

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxImmerseBtn = document.getElementById('lightbox-immerse-btn');
let currentLightboxSrc = '';

function openLightbox(src) {
    currentLightboxSrc = src;
    lightboxImg.src = src;
    lightbox.classList.add('show');
}

lightbox.addEventListener('click', (e) => {
    if (e.target !== lightboxImg && e.target !== lightboxImmerseBtn && !lightboxImmerseBtn.contains(e.target)) {
        lightbox.classList.remove('show');
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

immerseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    enterZenMode(false);
});

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
    if (!new URLSearchParams(window.location.search).has('id')) {
        document.getElementById('gallery-view').style.display = 'flex';
    }

    // Language setup
    let currentLang = localStorage.getItem('voyage_lang') || 'zh';
    document.body.classList.remove('lang-zh', 'lang-en');
    document.body.classList.add(`lang-${currentLang}`);
    updateVoyageTitle(currentLang);

    setupFilters();
    initGallery();

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

const langToggleBtn = document.getElementById('lang-toggle');
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let newLang = document.body.classList.contains('lang-zh') ? 'en' : 'zh';
        document.body.classList.remove('lang-zh', 'lang-en');
        document.body.classList.add(`lang-${newLang}`);
        localStorage.setItem('voyage_lang', newLang);
        updateVoyageTitle(newLang);
    });
}

// Anti-Save Protections (Deterrents)
document.addEventListener('contextmenu', event => event.preventDefault()); // Block right-click globally

document.addEventListener('dragstart', event => {
    if (event.target.tagName.toLowerCase() === 'img') {
        event.preventDefault(); // Block dragging images
    }
});

document.addEventListener('keydown', event => {
    // Block F12, Ctrl+Shift+I, Cmd+Opt+I (Mac), Ctrl+U (View Source)
    if (event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.metaKey && event.altKey && event.key === 'I') ||
        (event.ctrlKey && event.key === 'U') ||
        (event.metaKey && event.key === 'u')) {
        event.preventDefault();
    }
});
