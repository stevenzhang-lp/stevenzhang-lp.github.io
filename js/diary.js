document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic
    const langToggle = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('voyage_lang') || 'zh';
    
    // Set initial language class
    document.body.classList.remove('lang-zh', 'lang-en');
    document.body.classList.add(`lang-${currentLang}`);
    updateDiaryTitle(currentLang);

    function updateDiaryTitle(lang) {
        if (lang === 'en') {
            document.title = "STEVEN ZHANG | Daily Fragments";
        } else {
            document.title = "STEVEN ZHANG | 日常切片";
        }
    }

    if (langToggle) {
        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            let newLang = document.body.classList.contains('lang-zh') ? 'en' : 'zh';
            document.body.classList.remove('lang-zh', 'lang-en');
            document.body.classList.add(`lang-${newLang}`);
            localStorage.setItem('voyage_lang', newLang);
            updateDiaryTitle(newLang);
        });
    }

    // 2. Dynamic Content Rendering & Filters
    const diaryGrid = document.getElementById('diary-grid');
    const emptyContainer = document.getElementById('diary-empty-container');
    const categoryFilterList = document.getElementById('category-filter');
    const yearFilterList = document.getElementById('year-filter');

    let currentCategory = 'ALL';
    let currentYear = 'ALL';

    if (typeof diaries !== 'undefined' && diaries.length > 0) {
        // Hide empty state, show grid
        if (emptyContainer) emptyContainer.style.display = 'none';
        if (diaryGrid) diaryGrid.style.display = 'grid';

        initFilters();
        renderDiaries();
    } else {
        // Keep empty state
        if (emptyContainer) emptyContainer.style.display = 'flex';
        if (diaryGrid) diaryGrid.style.display = 'none';
    }

    function initFilters() {
        if (!categoryFilterList || !yearFilterList) return;

        // Categories
        const categories = [...new Set(diaries.map(d => JSON.stringify({ zh: d.categoryZh, en: d.categoryEn })))].map(c => JSON.parse(c));
        categoryFilterList.innerHTML = `
            <li data-category="ALL" class="active">
                <span class="lang-en">All</span><span class="lang-zh">全部</span>
            </li>
            ${categories.map(c => `
                <li data-category="${c.en}">
                    <span class="lang-en">${c.en}</span><span class="lang-zh">${c.zh}</span>
                </li>
            `).join('')}
        `;

        // Years
        const years = [...new Set(diaries.map(d => d.year))].sort((a, b) => b - a);
        yearFilterList.innerHTML = `
            <li data-year="ALL" class="active">
                <span class="lang-en">All</span><span class="lang-zh">全部</span>
            </li>
            ${years.map(y => `
                <li data-year="${y}">${y}</li>
            `).join('')}
        `;

        // Add Event Listeners
        const catItems = categoryFilterList.querySelectorAll('li');
        catItems.forEach(item => {
            item.addEventListener('click', () => {
                catItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentCategory = item.getAttribute('data-category');
                renderDiaries();
            });
        });

        const yearItems = yearFilterList.querySelectorAll('li');
        yearItems.forEach(item => {
            item.addEventListener('click', () => {
                yearItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentYear = item.getAttribute('data-year');
                renderDiaries();
            });
        });
    }

    function renderDiaries() {
        if (!diaryGrid) return;
        diaryGrid.innerHTML = '';

        const filtered = diaries.filter(d => {
            const matchCategory = currentCategory === 'ALL' || d.categoryEn === currentCategory;
            const matchYear = currentYear === 'ALL' || d.year === currentYear;
            return matchCategory && matchYear;
        });

        if (filtered.length === 0) {
            diaryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">
                    <span class="lang-zh">暂无相关切片</span>
                    <span class="lang-en">No daily fragments found</span>
                </div>
            `;
            return;
        }

        filtered.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'analog-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">
                        <span class="lang-zh">${item.titleZh}</span>
                        <span class="lang-en">${item.titleEn}</span>
                    </h3>
                    <p class="card-subtitle">
                        <span class="lang-zh">${item.categoryZh} | ${item.date}</span>
                        <span class="lang-en">${item.categoryEn} | ${item.date}</span>
                    </p>
                </div>
                <div class="card-image-container">
                    <img src="${item.image}" alt="${item.titleEn}" class="card-image" loading="lazy">
                </div>
                <div class="card-footer">${item.exif}</div>
            `;

            card.addEventListener('click', () => {
                if (typeof window.openEntryDetailModal === 'function') {
                    window.openEntryDetailModal(item, 'diary');
                }
            });

            diaryGrid.appendChild(card);
        });
    }


    // 3. Prevent Flash of Unstyled Text (FOUT) and ensure transition starts from opacity: 0
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

    // 4. Anti-Save Protections
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('dragstart', event => {
        if (event.target.tagName.toLowerCase() === 'img') {
            event.preventDefault();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'F12' || 
           (event.ctrlKey && event.shiftKey && event.key === 'I') || 
           (event.ctrlKey && event.key === 'u')) {
            event.preventDefault();
        }
    });
});
