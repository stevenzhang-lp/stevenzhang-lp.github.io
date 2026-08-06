document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic
    let currentLang = document.body.classList.contains('lang-en') ? 'en' : 'zh';
    
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

    window.addEventListener('site:languagechange', event => {
        updateDiaryTitle(event.detail.lang);
        renderDiaries();
    });

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
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
            const activate = () => {
                catItems.forEach(i => i.classList.remove('active'));
                catItems.forEach(i => i.setAttribute('aria-pressed', 'false'));
                item.classList.add('active');
                item.setAttribute('aria-pressed', 'true');
                currentCategory = item.getAttribute('data-category');
                renderDiaries();
            };
            item.addEventListener('click', activate);
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            });
        });

        const yearItems = yearFilterList.querySelectorAll('li');
        yearItems.forEach(item => {
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
            const activate = () => {
                yearItems.forEach(i => i.classList.remove('active'));
                yearItems.forEach(i => i.setAttribute('aria-pressed', 'false'));
                item.classList.add('active');
                item.setAttribute('aria-pressed', 'true');
                currentYear = item.getAttribute('data-year');
                renderDiaries();
            };
            item.addEventListener('click', activate);
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
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
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.setAttribute('aria-label', document.body.classList.contains('lang-en') ? `Open ${item.titleEn}` : `打开${item.titleZh}`);
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
            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    card.click();
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

});
