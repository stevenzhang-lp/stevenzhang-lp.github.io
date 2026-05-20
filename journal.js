document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic
    const langToggle = document.getElementById('lang-toggle');
    let currentLang = localStorage.getItem('voyage_lang') || 'zh';
    
    // Set initial language class
    document.body.classList.remove('lang-zh', 'lang-en');
    document.body.classList.add(`lang-${currentLang}`);
    updateJournalTitle(currentLang);

    function updateJournalTitle(lang) {
        if (lang === 'en') {
            document.title = "STEVEN ZHANG | Thought Fragments";
        } else {
            document.title = "STEVEN ZHANG | 思维碎片";
        }
    }

    if (langToggle) {
        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            let newLang = document.body.classList.contains('lang-zh') ? 'en' : 'zh';
            document.body.classList.remove('lang-zh', 'lang-en');
            document.body.classList.add(`lang-${newLang}`);
            localStorage.setItem('voyage_lang', newLang);
            updateJournalTitle(newLang);
        });
    }

    // 2. Dynamic Content Rendering & Filters
    const journalGrid = document.getElementById('journal-grid');
    const emptyContainer = document.getElementById('journal-empty-container');
    const categoryFilterList = document.getElementById('category-filter');
    const yearFilterList = document.getElementById('year-filter');

    let currentCategory = 'ALL';
    let currentYear = 'ALL';

    if (typeof journals !== 'undefined' && journals.length > 0) {
        // Hide empty state, show grid
        if (emptyContainer) emptyContainer.style.display = 'none';
        if (journalGrid) journalGrid.style.display = 'grid';

        initFilters();
        renderJournals();
    } else {
        // Keep empty state
        if (emptyContainer) emptyContainer.style.display = 'flex';
        if (journalGrid) journalGrid.style.display = 'none';
    }

    function initFilters() {
        if (!categoryFilterList || !yearFilterList) return;

        // Categories
        const categories = [...new Set(journals.map(j => JSON.stringify({ zh: j.categoryZh, en: j.categoryEn })))].map(c => JSON.parse(c));
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
        const years = [...new Set(journals.map(j => j.year))].sort((a, b) => b - a);
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
                renderJournals();
            });
        });

        const yearItems = yearFilterList.querySelectorAll('li');
        yearItems.forEach(item => {
            item.addEventListener('click', () => {
                yearItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentYear = item.getAttribute('data-year');
                renderJournals();
            });
        });
    }

    function renderJournals() {
        if (!journalGrid) return;
        journalGrid.innerHTML = '';

        const filtered = journals.filter(j => {
            const matchCategory = currentCategory === 'ALL' || j.categoryEn === currentCategory;
            const matchYear = currentYear === 'ALL' || j.year === currentYear;
            return matchCategory && matchYear;
        });

        if (filtered.length === 0) {
            journalGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">
                    <span class="lang-zh">暂无相关碎片</span>
                    <span class="lang-en">No thought fragments found</span>
                </div>
            `;
            return;
        }

        filtered.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'analog-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="card-header" style="text-align: left; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                    <h3 class="card-title" style="color: var(--card-text); text-align: left; font-size: 1.15rem;">
                        <span class="lang-zh">${item.titleZh}</span>
                        <span class="lang-en">${item.titleEn}</span>
                    </h3>
                    <p class="card-subtitle" style="text-align: left; font-size: 0.75rem;">
                        <span class="lang-zh">${item.categoryZh} | ${item.date}</span>
                        <span class="lang-en">${item.categoryEn} | ${item.date}</span>
                    </p>
                </div>
                <div class="card-text-excerpt" style="color: var(--card-text-muted); font-size: 0.9rem; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; flex: 1; margin-bottom: 0.5rem; text-align: justify;">
                    <span class="lang-zh">${item.contentZh}</span>
                    <span class="lang-en">${item.contentEn}</span>
                </div>
                <div class="card-footer" style="margin-top: auto; border-top: 1px solid rgba(0,0,0,0.05); text-align: right; color: var(--card-text-muted); font-family: monospace; font-size: 0.7rem; padding-top: 0.5rem;">
                    ${item.year}
                </div>
            `;

            card.addEventListener('click', () => {
                if (typeof window.openEntryDetailModal === 'function') {
                    window.openEntryDetailModal(item, 'journal');
                }
            });

            journalGrid.appendChild(card);
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
