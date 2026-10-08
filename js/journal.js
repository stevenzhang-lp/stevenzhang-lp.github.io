document.addEventListener('DOMContentLoaded', async () => {
    const { escapeHtml, renderStats, setupFilters, renderResult, noResult, showMaintenance } = window.ArchiveList;
    if (showMaintenance('journal.html')) return;
    const page = document.querySelector('.archive-page');
    const journalGrid = document.getElementById('journal-grid');
    const emptyContainer = document.getElementById('journal-empty-container');
    const toolbar = document.querySelector('.archive-toolbar');
    const resultNode = document.getElementById('journal-result');
    const items = typeof journals !== 'undefined' ? journals : [];
    const isEnglish = () => document.body.classList.contains('lang-en');

    function updateJournalTitle(lang) {
        document.title = lang === 'en' ? 'STEVEN ZHANG | Thought Fragments' : 'STEVEN ZHANG | 思维碎片';
    }

    updateJournalTitle(isEnglish() ? 'en' : 'zh');
    renderStats(page, items);

    if (!items.length) {
        if (toolbar) toolbar.hidden = true;
        if (journalGrid) journalGrid.hidden = true;
        if (emptyContainer) emptyContainer.hidden = false;
        window.addEventListener('site:languagechange', event => updateJournalTitle(event.detail.lang));
        return;
    }

    if (emptyContainer) emptyContainer.hidden = true;

    const renderTex = (element, tex, displayMode = false) => {
        if (!element || !tex || typeof window.katex === 'undefined') return;
        try {
            window.katex.render(tex, element, { displayMode, throwOnError: false, output: 'htmlAndMathml' });
        } catch (error) {
            // Keep the readable fallback text if KaTeX cannot render.
        }
    };

    function renderJournals(filtered) {
        if (!journalGrid) return;
        renderResult(resultNode, filtered.length, items.length, 'essays', '篇');
        journalGrid.classList.toggle('is-single', filtered.length === 1);

        if (!filtered.length) {
            journalGrid.innerHTML = noResult('No thought fragments found.', '暂无相关碎片。');
            return;
        }

        journalGrid.innerHTML = '';
        filtered.forEach((item, index) => {
            const card = document.createElement(item.link ? 'a' : 'article');
            card.className = 'journal-card';
            card.style.animationDelay = `${Math.min(index, 8) * 0.07}s`;
            if (item.link) {
                card.href = item.link;
                if (/^https?:\/\//i.test(item.link)) {
                    card.target = '_blank';
                    card.rel = 'noopener noreferrer';
                }
                card.setAttribute('aria-label', isEnglish()
                    ? `Open ${item.titleEn}`
                    : `打开${item.titleZh}`);
            }

            const hasVisual = Boolean(item.formulaTex || item.formulaText);
            card.innerHTML = `
                <div class="journal-card-content">
                    <p class="journal-card-eyebrow">
                        <span class="journal-card-number">${String(index + 1).padStart(2, '0')}</span>
                        <span class="lang-zh">${escapeHtml(item.eyebrowZh || item.categoryZh)}</span>
                        <span class="lang-en">${escapeHtml(item.eyebrowEn || item.categoryEn)}</span>
                    </p>
                    <h3 class="journal-card-title">
                        <span class="lang-zh">${item.titleZhHtml || escapeHtml(item.titleZh)}</span>
                        <span class="lang-en">${escapeHtml(item.titleEn)}</span>
                    </h3>
                    <p class="journal-card-meta">
                        <span class="lang-zh">${escapeHtml(item.categoryZh)}</span>
                        <span class="lang-en">${escapeHtml(item.categoryEn)}</span>
                        <span aria-hidden="true">·</span>
                        <span>${escapeHtml(item.date)}</span>
                    </p>
                    <p class="journal-card-excerpt">
                        <span class="lang-zh">${escapeHtml(item.contentZh)}</span>
                        <span class="lang-en">${escapeHtml(item.contentEn)}</span>
                    </p>
                    ${item.link ? `
                    <span class="journal-card-action">
                        <span class="lang-zh">阅读完整文章</span>
                        <span class="lang-en">READ THE FULL ESSAY</span>
                        <span class="journal-card-action-arrow" aria-hidden="true">↗</span>
                    </span>` : ''}
                </div>
                ${hasVisual ? `
                <div class="journal-project-visual" aria-hidden="true">
                    <span class="project-visual-label">${escapeHtml(item.visualLabel || '')}</span>
                    <div class="project-equation">${escapeHtml(item.formulaText || '')}</div>
                    <span class="project-visual-note">
                        <span class="lang-zh">${escapeHtml(item.highlightsZh || '')}</span>
                        <span class="lang-en">${escapeHtml(item.highlightsEn || '')}</span>
                    </span>
                </div>` : ''}
            `;

            renderTex(card.querySelector('.journal-inline-math'), item.titleMathTex, false);
            renderTex(card.querySelector('.project-equation'), item.formulaTex, true);

            if (!item.link && typeof window.openEntryDetailModal === 'function') {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
                card.setAttribute('aria-label', isEnglish() ? `Open ${item.titleEn}` : `打开${item.titleZh}`);
                card.addEventListener('click', () => window.openEntryDetailModal(item, 'journal'));
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

    const rerender = setupFilters({ items, toolbar, render: renderJournals });

    window.addEventListener('site:languagechange', event => {
        updateJournalTitle(event.detail.lang);
        rerender();
    });
});
