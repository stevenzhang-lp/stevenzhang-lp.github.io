const photos = [
    { id: 1, location: 'CHINA·XINJIANG', date: 'Aug 16, 2025', image: 'images/pic01.JPG', exif: 'SONY A7R4A | 24mm | 1/500s | f/11.0 | ISO 100', titleZh: '安集海：天山北麓的几何奇迹', titleEn: 'ANJIHAI: GEOMETRIC WONDER OF NORTH TIAN SHAN', storyZh: '站在新疆这片广袤的土地上，时间仿佛不再是一个线性的标量，而是一个趋向无穷大的变量。这张照片捕捉于天山北麓的深处。这里的地貌不是随机生成的，它是风蚀、水流与地壳运动经过数千万年迭代运算后的结果。', storyEn: 'On the vast plains of Xinjiang, time ceases to be a linear scalar and becomes a variable approaching infinity. This photograph, captured deep within the northern foothills of the Tian Shan, reveals a landscape that is not random, but the result of tens of millions of years of iterative calculations by wind, water, and tectonic shifts.', morePics: ['images/d1.JPG', 'images/d2.JPG', 'images/d3.JPG'] },
    { id: 2, location: 'CHINA·JIANGXI', date: 'Aug 8, 2019', image: 'images/pic02.JPG', exif: 'HUAWEI MATE10 | 27mm | 1/370s | f/1.6 | ISO 50', titleZh: '三清山：暮色中的金色仙境', titleEn: 'SANQINGSHAN: A GOLDEN REALM AT TWILIGHT', storyZh: '暮色微醺，三清山的奇峰在金辉中若隐若现。云海翻涌间，大自然正完成一场无声的谢幕。', storyEn: 'As twilight gently descends, the unique peaks of Sanqingshan are bathed in a sea of gold.', morePics: [] },
    { id: 3, location: 'CHINA·XINJIANG', date: 'Aug 14, 2025', image: 'images/pic03.JPG', exif: 'SONY A7R4A | 30mm | 1/160s | f/11.0 | ISO 100', titleZh: '喀纳斯：如梦似幻的北疆之眼', titleEn: 'KANAS: THE DREAMLIKE EYE OF NORTHERN XINJIANG', storyZh: '阿尔泰山脉的翠色绸缎，喀纳斯湖水在寂静中流淌，宛如地球遗落在北疆的一块翡翠。', storyEn: 'A turquoise ribbon of Kanas, flowing in silence like a piece of emerald jade.', morePics: ['images/d4.JPG', 'images/d6.JPG', 'images/d5.JPG'] },
    { id: 4, location: 'CHINA·HONG KONG', date: 'Jul 30, 2024', image: 'images/pic04.JPG', exif: 'SONY A7R4A | 40mm | 8s | f/11.0 | ISO 100', titleZh: '维多利亚港：流动的光影坐标', titleEn: 'VICTORIA HARBOUR: COORDINATES OF LIGHT', storyZh: '维多利亚港的岸边，矗立着世界最密集的摩天大楼群。这些由玻璃与混凝土构成的垂直向量，在南中国海的映衬下显得尤为壮丽。在这里，建筑不再仅仅是空间，而成为了记录城市律动的几何图谱。 每当夜幕低垂，维港便进入了它最动人的时刻。两岸的灯光如同倾倒的星辰，散落在平静的海面上。长曝光镜头捕捉到的不仅是五彩斑斓的流光，更是这座城市永不停歇的生命力。光影交织间，现实与虚幻的边界逐渐模糊。', storyEn: 'Along the shores of Victoria Harbour stand the world\'s densest clusters of skyscrapers. These vertical vectors of glass and concrete appear particularly grand against the backdrop of the South China Sea. Here, architecture is no longer just space, but a geometric map recording the city\'s pulse. As night falls, Victoria Harbour enters its most captivating moment. The lights from both shores resemble fallen stars scattered across the calm sea. The long-exposure lens captures not just colorful trails of light, but the relentless vitality of this city. Between the weave of light and shadow, the boundary between reality and illusion blurs.', morePics: ['images/d7.JPG', 'images/d8.JPG'] },
    { id: 6, location: 'MALAYSIA·KUALA LUMPUR', date: 'Nov 1, 2025', image: 'images/pic06.jpg', exif: 'IPHONE 16 PRO | 48mm | 1/6536s | f/1.78 | ISO 100', titleZh: '吉隆坡：跨越时空的多元共生', titleEn: 'KUALA LUMPUR: THE MULTICULTURAL SYMBIONT ACROSS TIME', storyZh: '见证整座城市新旧交融的呼吸与脉动。 斑驳的红墙回响着旧日的余韵，摩天大楼的轮廓在云间自由生长。旗帜掠过长空，将沉淀的岁月与沸腾的当下，于这片静谧的广场中心定格。', storyEn: 'Witnessing the harmonized breath and pulse of the city\'s heritage and future. The lingering echoes of history resonate through the ancient walls, while the silhouettes of skyscrapers grow freely amidst the clouds. As the flag sweeps across the sky, the depth of the past and the vibrancy of the present are captured at the heart of this silent square.', morePics: [] },
    { id: 5, location: 'CHINA·YUNNAN', date: 'Aug 3, 2023', image: 'images/pic05.JPG', exif: 'SONY A7R4A | 70mm | 1/500s | f/11.0 | ISO 100', titleZh: '洱海：倒映天光的诗意之镜', titleEn: 'ERHAI: THE POETIC MIRROR REFLECTING THE CELESTIAL LIGHT', storyZh: '远山衔云，一角飞檐在碧色与湖光中安稳落座。这是万物止息的瞬间，唯有风在层叠的云影间悄声叙事。时间在这里不再流逝，而是像波纹一样，一圈圈荡漾开来。', storyEn: 'Clouds rest upon distant peaks as an ancient eave sits peacefully between the azure sky and the shimmering lake. It is a moment where all is still, save for the wind whispering tales amidst the shifting shadows.', morePics: ['images/d9.JPG'] },
    { id: 7, location: 'MALAYSIA·PUTRAJAYA', date: 'Dec 11, 2025', image: 'images/pic07.JPG', exif: 'SONY A7R4A | 24mm | 1/4000s | f/2.8 | ISO 100', titleZh: '布城：天光云影间的草木长诗', titleEn: 'PUTRAJAYA: AN ARBOREAL POEM AMIDST LIGHT AND SHADOW', storyZh: '捕捉自然与生活在宁静中重叠的瞬间。 黑白交织的影调剥离了色彩的喧嚣，只留下林木与湖水在静谧中对谈。行人缓步其间，如墨色点缀在时光的长卷里，定格出一份不被惊扰的平和。', storyEn: 'Capturing the moments where nature and life overlap in tranquility. The interplay of black and white strips away the clamor of color, leaving only the woods and the lake in a silent dialogue. Passersby move slowly, like ink dots on the long scroll of time, capturing a moment of undisturbed peace.', morePics: ['images/d11.JPG', 'images/d10.JPG'] },
    { id: 8, location: 'MALAYSIA·PENANG', date: 'Jan 9, 2026', image: 'images/pic08.JPG', exif: 'SONY A7R4A | 105mm | 1/2000s | f/8 | ISO 100', titleZh: '槟城：Batu Ferringhi 的日落余晖', titleEn: 'PENANG: SUNSET GLOW AT BATU FERRINGHI', storyZh: '听凭海风吹散城市的喧嚣，在光影交错的岸边找寻自然与人文共生的呼吸节奏。 那天的海风很柔和，岸边的人很多，但每个人似乎都找到了属于自己的那一小片宁静。 黑白剥离了晚霞的色彩，让视线停留在那几个奔跑的剪影上。海浪冲刷过脚踝的瞬间，生活不再是抽象的数字，而是这种真实的触感。 远处的山影在暮色中逐渐模糊。我喜欢这种光影层层叠叠的感觉，它让镜头里的海滩有了一种像呼吸一样的节奏感。 随着太阳接近海平面，天空被染成了温暖的金橙色。竖向的构图拉伸了天空与海面的距离，也将远处那几艘摩托艇在暮色中的微小身影定格在画面中心。 捕捉自然与生活在宁静中重叠的瞬间。光影散去，留下的是关于这片海的独家记忆。', storyEn: 'Letting the sea breeze disperse the urban clamor, finding the rhythm of coexistence between nature and humanity along the shimmering shore. The sea breeze was gentle that day, and while the shore was crowded, everyone seemed to find their own little piece of tranquility. Black and white strips away the colors of the sunset, drawing the eye to the running silhouettes. In the moment waves wash over ankles, life is no longer an abstract number, but this tangible touch. Distant mountain silhouettes gradually blur in the twilight. I love this layered feeling of light and shadow; it gives the beach in the lens a rhythm like breathing. The vertical composition stretches the distance between sky and sea, framing the tiny silhouettes of jet skis in the twilight at the center. Capturing the moments where nature and life overlap in tranquility. As the light fades, what remains is a private memory of this sea.', morePics: ['images/d0801.JPG', 'images/d0802.JPG', 'images/d0803.JPG', 'images/d0804.JPG', 'images/d0805.JPG'] },
    { id: 9, location: 'MALAYSIA·PENANG', date: 'Jan 10, 2026', image: 'images/pic09.JPG', exif: 'SONY A7R4A | 105mm | 1/3200s | f/2.8 | ISO 100', titleZh: '蝴蝶：林间的光影舞者', titleEn: 'BUTTERFLIES: DANCERS OF LIGHT AND SHADOW', storyZh: '当我们真正静下心来，将目光从宏大的风景收回，聚焦于脚下的方寸之间时，会发现一个截然不同的宇宙。蝴蝶的翅膀不仅是飞行的工具，更是自然界最精密的画布。那些肉眼看似无序的斑点与线条，在微距镜头下显现出惊人的几何秩序。它们在林间光影的缝隙中穿梭，每一次停驻都是对短暂生命的庄重展示。在这个微观世界里，喧嚣被过滤，只剩下光线穿透薄翼时的静谧，以及生命最原始、最纯粹的律动。', storyEn: 'When we truly calm our minds and withdraw our gaze from the grand landscapes to focus on the square inches beneath our feet, we discover an entirely different universe. A butterfly\'s wings are not merely tools for flight, but nature\'s most intricate canvases. The spots and lines that appear chaotic to the naked eye reveal astonishing geometric order under a macro lens. They weave through the gaps of light and shadow in the forest; every pause is a solemn display of fleeting life. In this micro world, the clamor is filtered out, leaving only the silence of light piercing through thin wings and the most primitive, pure rhythm of life.', morePics: ['images/d0901.JPG', 'images/d0902.JPG', 'images/d0903.JPG', 'images/d0904.JPG'] },
    { id: 10, location: 'SINGAPORE', date: 'Jan 22, 2026', image: 'images/pic10.JPG', exif: 'SONY A7R4A | 28mm | 1/4s | f/10 | ISO 100', titleZh: '新加坡：未来城市的无限可能', titleEn: 'SINGAPORE: THE INFINITE POSSIBILITIES OF FUTURE CITIES', storyZh: '时空在此交错，建筑的灯火如繁星坠落，编织出一张绚烂的光网。', storyEn: 'Space and time intertwine here; the architectural lights fall like stars, weaving a brilliant web of light.', morePics: ['images/d1001.JPG', 'images/d1002.JPG', 'images/d1003.JPG'] },
    { id: 11, location: 'CHINA·TAIPEI', date: 'May 2, 2026', image: 'images/pic11.JPG', exif: 'SONY A7R4A | 70mm | 1/13s | f/11.0 | ISO 100', titleZh: '台北：盆地边缘的时光轮廓', titleEn: 'TAIPEI: TIME CONTOURS ALONG THE BASIN\'S EDGE', storyZh: '从山顶俯瞰这片被群山环抱的盆地，台北在暮色与薄雾中徐徐展开。远处的台北101直插云霄，与近处松山机场的绿地跑道、横跨河道的桥梁，在长焦镜头下压缩成扁平的几何拼贴。这里既有故宫红墙碧瓦的岁月沉淀，也有自由广场对称轴线上的宁静安详；而在霓虹闪烁的西门町，街头艺人的倒立绝技在喧嚣的市井中定格出一种极致的力量感。在台北，历史的厚重与市井的温度在温润的空气里重合，静静流淌。', storyEn: 'Overlooking the basin framed by mountains, Taipei unfolds softly under the twilight mist. The distant Taipei 101 pierces the sky, while the green runways of Songshan Airport and the white spans of the river bridge are compressed by the lens into a graphic collage. The city is a dialogue between epochs—from the classical jade-green roofs of the Palace Museum and the silent symmetry of Liberty Square, to the pulsating energy of Ximending where a street acrobat freezes time amidst a cheering crowd. Here, the weight of history and the warmth of the everyday coexist, floating quietly in the humid, warm air.', morePics: ['images/d1101.jpg', 'images/d1102.JPG', 'images/d1103.JPG', 'images/d1104.JPG'] }
];

const diaries = [];

const journals = [];

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

const vaultConfig = {
    encryptedPrivJwk: "9f5ce81234a3bafa397060b4a1740f1234cb6f99f6471d319073b7bab51d63188edaf92ddc51633756ad43f7b0ad6da66040d0b7860fc9d24e8fd25429db39c930d10545033e5b33d204e0472d0870a9dd19cce2486591e85c54d263d9089b0b6126c413cacf6d8390bd106b5266fbd0ce51b9ba70b12a16d81f6bfd9a1d368ecc6b3f98db1338f0a9fbde1fbcc68ee3b4fd9aee30b0a30d792205bf6dba61738b729b9815947ba839fd64d5b59b7bbf",
    privIv: "d8b84888136c194455aa8956",
    privTag: "4acd02907a0c8b961b08a25ca59f7a81",
    passcodeSalt: "841877dd6b624efd8ea4d312a14547d9",
    ephPubJwk: {
        "kty": "EC",
        "x": "0sIgEMulhBy_edBngdYVsT5GuCCW3N8z6_FOx8GAWNM",
        "y": "WvqwLAltz0clNBIS3bHvT0d-imMD5ZW6oM0T6MUiBxo",
        "crv": "P-256"
    },
    staticPubJwk: {
        "kty": "EC",
        "x": "qHKaf9MJVkFiw7RfxPveWjAmjPbgm7cTSXYvUPoTXbs",
        "y": "eYVh0Jx7-8QI__FfmyEGqNDhGt0ekTBAmR5iFHqlXC0",
        "crv": "P-256"
    },
    encryptedEntries: "a05b",
    entriesIv: "68b9477f7ad0e744f3c455f0",
    entriesTag: "785ce2d5aad4cfaec32ec3bb19cbc661"
};
