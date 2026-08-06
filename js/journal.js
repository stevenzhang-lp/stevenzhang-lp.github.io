document.addEventListener('DOMContentLoaded', () => {
    // 1. Language Toggle Logic
    let currentLang = document.body.classList.contains('lang-en') ? 'en' : 'zh';
    
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

    window.addEventListener('site:languagechange', event => {
        updateJournalTitle(event.detail.lang);
        renderJournals();
    });

    // 2. Dynamic Content Rendering & Filters
    const journalGrid = document.getElementById('journal-grid');
    const emptyContainer = document.getElementById('journal-empty-container');
    const filtersPanel = document.querySelector('.journal-sidebar');
    const categoryFilterList = document.getElementById('category-filter');
    const yearFilterList = document.getElementById('year-filter');

    let currentCategory = 'ALL';
    let currentYear = 'ALL';

    if (typeof journals !== 'undefined' && journals.length > 0) {
        // Hide empty state, show grid
        if (emptyContainer) emptyContainer.style.display = 'none';
        if (journalGrid) journalGrid.style.display = 'grid';
        if (filtersPanel) filtersPanel.hidden = false;

        initFilters();
        renderJournals();
    } else {
        // Keep empty state
        if (emptyContainer) emptyContainer.style.display = 'flex';
        if (journalGrid) journalGrid.style.display = 'none';
        if (filtersPanel) filtersPanel.hidden = true;
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
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            item.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
            const activate = () => {
                catItems.forEach(i => i.classList.remove('active'));
                catItems.forEach(i => i.setAttribute('aria-pressed', 'false'));
                item.classList.add('active');
                item.setAttribute('aria-pressed', 'true');
                currentCategory = item.getAttribute('data-category');
                renderJournals();
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
                renderJournals();
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

    function renderJournals() {
        if (!journalGrid) return;
        journalGrid.innerHTML = '';

        const filtered = journals.filter(j => {
            const matchCategory = currentCategory === 'ALL' || j.categoryEn === currentCategory;
            const matchYear = currentYear === 'ALL' || j.year === currentYear;
            return matchCategory && matchYear;
        });

        if (filtered.length === 0) {
            journalGrid.classList.remove('is-single');
            journalGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">
                    <span class="lang-zh">暂无相关碎片</span>
                    <span class="lang-en">No thought fragments found</span>
                </div>
            `;
            return;
        }

        journalGrid.classList.toggle('is-single', filtered.length === 1);

        filtered.forEach((item, index) => {
            const card = document.createElement(item.link ? 'a' : 'div');
            card.className = 'journal-card';
            if (item.link) {
                card.href = item.link;
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.setAttribute('aria-label', document.body.classList.contains('lang-en')
                    ? `Open ${item.titleEn} in a new tab`
                    : `在新标签页打开${item.titleZh}`);
            } else {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
                card.setAttribute('aria-label', document.body.classList.contains('lang-en') ? `Open ${item.titleEn}` : `打开${item.titleZh}`);
            }
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="journal-card-content">
                    <p class="journal-card-eyebrow">
                        <span class="lang-zh">${item.eyebrowZh || item.categoryZh}</span>
                        <span class="lang-en">${item.eyebrowEn || item.categoryEn}</span>
                    </p>
                    <h3 class="journal-card-title">
                        <span class="lang-zh">${item.titleZhHtml || item.titleZh}</span>
                        <span class="lang-en">${item.titleEn}</span>
                    </h3>
                    <p class="journal-card-meta">
                        <span class="lang-zh">${item.categoryZh}</span>
                        <span class="lang-en">${item.categoryEn}</span>
                        <span aria-hidden="true">·</span>
                        <span>${item.date}</span>
                    </p>
                    <p class="journal-card-excerpt">
                        <span class="lang-zh">${item.contentZh}</span>
                        <span class="lang-en">${item.contentEn}</span>
                    </p>
                    <span class="journal-card-action">
                        <span class="lang-zh">阅读完整文章</span>
                        <span class="lang-en">READ THE FULL ESSAY</span>
                        <span class="journal-card-action-arrow" aria-hidden="true">↗</span>
                    </span>
                </div>
                <div class="journal-project-visual" aria-hidden="true">
                    <span class="project-visual-label">EULER–POISSON INTEGRAL</span>
                    <div class="project-equation">∫ from −∞ to ∞ e^(−x²) dx = √π</div>
                    <span class="project-visual-note">
                        <span class="lang-zh">${item.highlightsZh || ''}</span>
                        <span class="lang-en">${item.highlightsEn || ''}</span>
                    </span>
                </div>
            `;

            const renderTex = (element, tex, displayMode = false) => {
                if (!element || !tex || typeof window.katex === 'undefined') return;
                try {
                    window.katex.render(tex, element, {
                        displayMode,
                        throwOnError: false,
                        output: 'htmlAndMathml'
                    });
                } catch (error) {
                    // Keep the readable fallback text if KaTeX cannot render.
                }
            };

            renderTex(card.querySelector('.journal-inline-math'), item.titleMathTex, false);
            renderTex(card.querySelector('.project-equation'), item.formulaTex, true);

            if (!item.link) {
                card.addEventListener('click', () => {
                    if (typeof window.openEntryDetailModal === 'function') {
                        window.openEntryDetailModal(item, 'journal');
                    }
                });
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        card.click();
                    }
                });
            }

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

});
