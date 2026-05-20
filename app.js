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

function setupFilters() {
    let currentCountry = 'ALL';
    let currentEra = 'ALL';

    const countryItems = document.querySelectorAll('#country-filter li');
    const eraItems = document.querySelectorAll('#era-filter li');

    countryItems.forEach(item => {
        item.addEventListener('click', () => {
            countryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCountry = item.getAttribute('data-country');
            initGallery(currentCountry, currentEra);
        });
    });

    eraItems.forEach(item => {
        item.addEventListener('click', () => {
            eraItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentEra = item.getAttribute('data-era');
            initGallery(currentCountry, currentEra);
        });
    });
}

let activePhoto = null;

function openDetail(photo) {
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

function closeDetail() {
    activePhoto = null;
    updateVoyageTitle(localStorage.getItem('voyage_lang') || 'zh');

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
    document.getElementById('gallery-view').style.display = 'flex';

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
