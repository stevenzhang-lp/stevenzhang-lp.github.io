const photos = [
    { id: 1, location: 'CHINA·XINJIANG', date: 'Aug 16, 2025', image: 'images/pic01.JPG', exif: 'SONY A7R4A | 24mm | 1/500s | f/11.0 | ISO 100', titleZh: '安集海：天山北麓的几何奇迹', titleEn: 'ANJIHAI: GEOMETRIC WONDER OF NORTH TIAN SHAN', storyZh: '站在新疆这片广袤的土地上，时间仿佛不再是一个线性的标量，而是一个趋向无穷大的变量。这张照片捕捉于天山北麓的深处。这里的地貌不是随机生成的，它是风蚀、水流与地壳运动经过数千万年迭代运算后的结果。', storyEn: 'On the vast plains of Xinjiang, time ceases to be a linear scalar and becomes a variable approaching infinity. This photograph, captured deep within the northern foothills of the Tian Shan, reveals a landscape that is not random, but the result of tens of millions of years of iterative calculations by wind, water, and tectonic shifts.', morePics: ['images/d1.JPG', 'images/d2.JPG', 'images/d3.JPG'] },
    { id: 2, location: 'CHINA·JIANGXI', date: 'Aug 8, 2019', image: 'images/pic02.JPG', exif: 'HUAWEI MATE10 | 27mm | 1/370s | f/1.6 | ISO 50', titleZh: '三清山：暮色中的金色仙境', titleEn: 'SANQINGSHAN: A GOLDEN REALM AT TWILIGHT', storyZh: '暮色微醺，三清山的奇峰在金辉中若隐若现。云海翻涌间，大自然正完成一场无声的谢幕。', storyEn: 'As twilight gently descends, the unique peaks of Sanqingshan are bathed in a sea of gold.', morePics: [] },
    { id: 3, location: 'CHINA·XINJIANG', date: 'Aug 14, 2025', image: 'images/pic03.JPG', exif: 'SONY A7R4A | 30mm | 1/160s | f/11.0 | ISO 100', titleZh: '喀纳斯：如梦似幻的北疆之眼', titleEn: 'KANAS: THE DREAMLIKE EYE OF NORTHERN XINJIANG', storyZh: '阿尔泰山脉的翠色绸缎，喀纳斯湖水在寂静中流淌，宛如地球遗落在北疆的一块翡翠。 A turquoise ribbon of Kanas, flowing in silence like a piece of emerald jade.', storyEn: 'A turquoise ribbon of Kanas, flowing in silence like a piece of emerald jade.', morePics: ['images/d4.JPG', 'images/d6.JPG', 'images/d5.JPG'] },
    { id: 4, location: 'CHINA·HONG KONG', date: 'Jul 30, 2024', image: 'images/pic04.JPG', exif: 'SONY A7R4A | 40mm | f/11.0 | ISO 100', titleZh: '维多利亚港：流动的光影坐标', titleEn: 'VICTORIA HARBOUR: COORDINATES OF LIGHT', storyZh: '维多利亚港的岸边，矗立着世界最密集的摩天大楼群。这些由玻璃与混凝土构成的垂直向量，在南中国海的映衬下显得尤为壮丽。在这里，建筑不再仅仅是空间，而成为了记录城市律动的几何图谱。 每当夜幕低垂，维港便进入了它最动人的时刻。两岸的灯光如同倾倒的星辰，散落在平静的海面上。长曝光镜头捕捉到的不仅是五彩斑斓的流光，更是这座城市永不停歇的生命力。光影交织间，现实与虚幻的边界逐渐模糊。', storyEn: 'Along the shores of Victoria Harbour stand the world\'s densest clusters of skyscrapers. These vertical vectors of glass and concrete appear particularly grand against the backdrop of the South China Sea. Here, architecture is no longer just space, but a geometric map recording the city\'s pulse. As night falls, Victoria Harbour enters its most captivating moment. The lights from both shores resemble fallen stars scattered across the calm sea. The long-exposure lens captures not just colorful trails of light, but the relentless vitality of this city. Between the weave of light and shadow, the boundary between reality and illusion blurs.', morePics: ['images/d7.JPG', 'images/d8.JPG'] },
    { id: 6, location: 'MALAYSIA·KUALA LUMPUR', date: 'Nov 1, 2025', image: 'images/pic06.jpg', exif: 'IPHONE 16 PRO | 48mm | 1/6536s | f/1.78 | ISO 100', titleZh: '吉隆坡：跨越时空的多元共生', titleEn: 'KUALA LUMPUR: THE MULTICULTURAL SYMBIONT ACROSS TIME', storyZh: '见证整座城市新旧交融的呼吸与脉动。 斑驳的红墙回响着旧日的余韵，摩天大楼的轮廓在云间自由生长。旗帜掠过长空，将沉淀的岁月与沸腾的当下，于这片静谧的广场中心定格。', storyEn: 'Witnessing the harmonized breath and pulse of the city\'s heritage and future. The lingering echoes of history resonate through the ancient walls, while the silhouettes of skyscrapers grow freely amidst the clouds. As the flag sweeps across the sky, the depth of the past and the vibrancy of the present are captured at the heart of this silent square.', morePics: [] },
    { id: 5, location: 'CHINA·YUNNAN', date: 'Aug 3, 2023', image: 'images/pic05.JPG', exif: 'SONY A7R4A | 70mm | 1/500s | f/11.0 | ISO 100', titleZh: '洱海：倒映天光的诗意之镜', titleEn: 'ERHAI: THE POETIC MIRROR REFLECTING THE CELESTIAL LIGHT', storyZh: '远山衔云，一角飞檐在碧色与湖光中安稳落座。这是万物止息的瞬间，唯有风在层叠的云影间悄声叙事。时间在这里不再流逝，而是像波纹一样，一圈圈荡漾开来。', storyEn: 'Clouds rest upon distant peaks as an ancient eave sits peacefully between the azure sky and the shimmering lake. It is a moment where all is still, save for the wind whispering tales amidst the shifting shadows.', morePics: ['images/d9.JPG'] },
    { id: 7, location: 'MALAYSIA·PUTRAJAYA', date: 'Dec 11, 2025', image: 'images/pic07.JPG', exif: 'SONY A7R4A | 24mm | 1/4000s | f/2.8 | ISO 100', titleZh: '布城：天光云影间的草木长诗', titleEn: 'PUTRAJAYA: AN ARBOREAL POEM AMIDST LIGHT AND SHADOW', storyZh: '捕捉自然与生活在宁静中重叠的瞬间。 黑白交织的影调剥离了色彩的喧嚣，只留下林木与湖水在静谧中对谈。行人缓步其间，如墨色点缀在时光的长卷里，定格出一份不被惊扰的平和。', storyEn: 'Capturing the moments where nature and life overlap in tranquility. The interplay of black and white strips away the clamor of color, leaving only the woods and the lake in a silent dialogue. Passersby move slowly, like ink dots on the long scroll of time, capturing a moment of undisturbed peace.', morePics: ['images/d11.JPG', 'images/d10.JPG'] },
    { id: 8, location: 'MALAYSIA·PENANG', date: 'Jan 9, 2026', image: 'images/pic08.JPG', exif: 'SONY A7R4A | 105mm | 1/2000s | f/8 | ISO 100', titleZh: '槟城：Batu Ferringhi 的日落余晖', titleEn: 'PENANG: SUNSET GLOW AT BATU FERRINGHI', storyZh: '听凭海风吹散城市的喧嚣，在光影交错的岸边找寻自然与人文共生的呼吸节奏。 那天的海风很柔和，岸边的人很多，但每个人似乎都找到了属于自己的那一小片宁静。 黑白剥离了晚霞的色彩，让视线停留在那几个奔跑的剪影上。海浪冲刷过脚踝的瞬间，生活不再是抽象的数字，而是这种真实的触感。 远处的山影在暮色中逐渐模糊。我喜欢这种光影层层叠叠的感觉，它让镜头里的海滩有了一种像呼吸一样的节奏感。 随着太阳接近海平面，天空被染成了温暖的金橙色。竖向的构图拉伸了天空与海面的距离，也将远处那几艘摩托艇在暮色中的微小身影定格在画面中心。 捕捉自然与生活在宁静中重叠的瞬间。光影散去，留下的是关于这片海的独家记忆。', storyEn: 'Letting the sea breeze disperse the urban clamor, finding the rhythm of coexistence between nature and humanity along the shimmering shore. The sea breeze was gentle that day, and while the shore was crowded, everyone seemed to find their own little piece of tranquility. Black and white strips away the colors of the sunset, drawing the eye to the running silhouettes. In the moment waves wash over ankles, life is no longer an abstract number, but this tangible touch. Distant mountain silhouettes gradually blur in the twilight. I love this layered feeling of light and shadow; it gives the beach in the lens a rhythm like breathing. The vertical composition stretches the distance between sky and sea, framing the tiny silhouettes of jet skis in the twilight at the center. Capturing the moments where nature and life overlap in tranquility. As the light fades, what remains is a private memory of this sea.', morePics: ['images/d0801.JPG', 'images/d0802.JPG', 'images/d0803.JPG', 'images/d0804.JPG', 'images/d0805.JPG'] },
    { id: 9, location: 'MALAYSIA·PENANG', date: 'Jan 10, 2026', image: 'images/pic09.JPG', exif: 'SONY A7R4A | 105mm | 1/3200s | f/2.8 | ISO 100', titleZh: '蝴蝶：林间的光影舞者', titleEn: 'BUTTERFLIES: DANCERS OF LIGHT AND SHADOW', storyZh: '当我们真正静下心来，将目光从宏大的风景收回，聚焦于脚下的方寸之间时，会发现一个截然不同的宇宙。蝴蝶的翅膀不仅是飞行的工具，更是自然界最精密的画布。那些肉眼看似无序的斑点与线条，在微距镜头下显现出惊人的几何秩序。它们在林间光影的缝隙中穿梭，每一次停驻都是对短暂生命的庄重展示。在这个微观世界里，喧嚣被过滤，只剩下光线穿透薄翼时的静谧，以及生命最原始、最纯粹的律动。', storyEn: 'When we truly calm our minds and withdraw our gaze from the grand landscapes to focus on the square inches beneath our feet, we discover an entirely different universe. A butterfly\'s wings are not merely tools for flight, but nature\'s most intricate canvases. The spots and lines that appear chaotic to the naked eye reveal astonishing geometric order under a macro lens. They weave through the gaps of light and shadow in the forest; every pause is a solemn display of fleeting life. In this micro world, the clamor is filtered out, leaving only the silence of light piercing through thin wings and the most primitive, pure rhythm of life.', morePics: ['images/d0901.JPG', 'images/d0902.JPG', 'images/d0903.JPG', 'images/d0904.JPG'] },
    { id: 10, location: 'SINGAPORE', date: 'Jan 22, 2026', image: 'images/pic10.JPG', exif: 'SONY A7R4A | 28mm | 1/4s | f/10 | ISO 100', titleZh: '新加坡：未来城市的无限可能', titleEn: 'SINGAPORE: THE INFINITE POSSIBILITIES OF FUTURE CITIES', storyZh: '时空在此交错，建筑的灯火如繁星坠落，编织出一张绚烂的光网。', storyEn: 'Space and time intertwine here; the architectural lights fall like stars, weaving a brilliant web of light.', morePics: ['images/d1001.JPG', 'images/d1002.JPG', 'images/d1003.JPG'] },
    { id: 11, location: 'CHINA·TAIPEI', date: 'May 2, 2026', image: 'images/pic11.JPG', exif: 'SONY A7R4A | 70mm | 1/13s | f/11.0 | ISO 100', titleZh: '台北：盆地边缘的时光轮廓', titleEn: 'TAIPEI: TIME CONTOURS ALONG THE BASIN\'S EDGE', storyZh: '从山顶俯瞰这片被群山环抱的盆地，台北在暮色与薄雾中徐徐展开。远处的台北101直插云霄，与近处松山机场的绿地跑道、横跨河道的桥梁，在长焦镜头下压缩成扁平的几何拼贴。这里既有故宫红墙碧瓦的岁月沉淀，也有自由广场对称轴线上的宁静安详；而在霓虹闪烁的西门町，街头艺人的倒立绝技在喧嚣的市井中定格出一种极致的力量感。在台北，历史的厚重与市井的温度在温润的空气里重合，静静流淌。', storyEn: 'Overlooking the basin framed by mountains, Taipei unfolds softly under the twilight mist. The distant Taipei 101 pierces the sky, while the green runways of Songshan Airport and the white spans of the river bridge are compressed by the lens into a graphic collage. The city is a dialogue between epochs—from the classical jade-green roofs of the Palace Museum and the silent symmetry of Liberty Square, to the pulsating energy of Ximending where a street acrobat freezes time amidst a cheering crowd. Here, the weight of history and the warmth of the everyday coexist, floating quietly in the humid, warm air.', morePics: ['images/d1101.jpg', 'images/d1102.JPG', 'images/d1103.JPG', 'images/d1104.JPG'] }
];

const locationMap = {
    'CHINA·TAIPEI': { enTitle: 'TAIPEI', zhTitle: '台北', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·XINJIANG': { enTitle: 'XINJIANG', zhTitle: '新疆', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·JIANGXI': { enTitle: 'JIANGXI', zhTitle: '江西', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·HONG KONG': { enTitle: 'HONG KONG', zhTitle: '香港', enSub: 'CHINA', zhSub: '中国' },
    'CHINA·YUNNAN': { enTitle: 'YUNNAN', zhTitle: '云南', enSub: 'CHINA', zhSub: '中国' },
    'MALAYSIA·KUALA LUMPUR': { enTitle: 'KUALA LUMPUR', zhTitle: '吉隆坡', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'MALAYSIA·PUTRAJAYA': { enTitle: 'PUTRAJAYA', zhTitle: '布城', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'MALAYSIA·PENANG': { enTitle: 'PENANG', zhTitle: '槟城', enSub: 'MALAYSIA', zhSub: '马来西亚' },
    'SINGAPORE': { enTitle: 'SINGAPORE', zhTitle: '新加坡', enSub: 'SINGAPORE', zhSub: '新加坡' }
};

const monthMap = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
function parseDate(dateStr) {
    const parts = dateStr.replace(',', '').split(' ');
    if (parts.length === 3) {
        return {
            en: dateStr,
            zh: `${parts[2]}年${monthMap[parts[0]]}月${parts[1]}日`
        };
    }
    return { en: dateStr, zh: dateStr };
}

function parseLocation(loc) {
    if (locationMap[loc]) return locationMap[loc];
    // fallback
    if (loc.includes('·')) {
        const [country, detail] = loc.split('·');
        return { enTitle: detail, zhTitle: detail, enSub: country, zhSub: country };
    }
    return { enTitle: loc, zhTitle: loc, enSub: 'SOUTHEAST ASIA', zhSub: '东南亚' };
}

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

    // Prevent Flash of Unstyled Text (FOUT)
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
