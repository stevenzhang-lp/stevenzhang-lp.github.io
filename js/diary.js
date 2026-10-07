document.addEventListener('DOMContentLoaded', () => {
    const { escapeHtml, renderStats, setupFilters, renderResult, noResult, showMaintenance } = window.ArchiveList;
    if (showMaintenance('diary.html')) return;
    const page = document.querySelector('.archive-page');
    const diaryGrid = document.getElementById('diary-grid');
    const emptyContainer = document.getElementById('diary-empty-container');
    const toolbar = document.querySelector('.archive-toolbar');
    const resultNode = document.getElementById('diary-result');
    const items = typeof diaries !== 'undefined' ? diaries : [];
    const isEnglish = () => document.body.classList.contains('lang-en');

    function updateDiaryTitle(lang) {
        document.title = lang === 'en' ? 'STEVEN ZHANG | Daily Fragments' : 'STEVEN ZHANG | 日常切片';
    }

    updateDiaryTitle(isEnglish() ? 'en' : 'zh');
    renderStats(page, items);

    if (!items.length) {
        if (toolbar) toolbar.hidden = true;
        if (diaryGrid) diaryGrid.hidden = true;
        if (emptyContainer) emptyContainer.hidden = false;
        window.addEventListener('site:languagechange', event => updateDiaryTitle(event.detail.lang));
        return;
    }

    if (emptyContainer) emptyContainer.hidden = true;

    // Diary entry shape: { titleZh, titleEn, categoryZh, categoryEn, date, year, image?, contentZh?, contentEn?, exif? }
    function renderDiaries(filtered) {
        if (!diaryGrid) return;
        renderResult(resultNode, filtered.length, items.length, 'fragments', '条切片');

        if (!filtered.length) {
            diaryGrid.innerHTML = noResult('No daily fragments found.', '暂无相关切片。');
            return;
        }

        diaryGrid.innerHTML = '';
        filtered.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = item.image ? 'frame-card' : 'frame-card frame-card-text';
            card.style.animationDelay = `${Math.min(index, 8) * 0.07}s`;
            card.innerHTML = `
                ${item.image ? `
                <div class="frame-media">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(isEnglish() ? item.titleEn : item.titleZh)}" loading="lazy" decoding="async">
                    <span class="frame-index">${String(index + 1).padStart(2, '0')}</span>
                </div>` : ''}
                <div class="frame-caption">
                    <div class="frame-heading">
                        <h3 class="frame-title">
                            <span class="lang-zh">${escapeHtml(item.titleZh)}</span>
                            <span class="lang-en">${escapeHtml(item.titleEn)}</span>
                        </h3>
                        <span class="frame-country">
                            <span class="lang-zh">${escapeHtml(item.categoryZh)}</span>
                            <span class="lang-en">${escapeHtml(item.categoryEn)}</span>
                        </span>
                    </div>
                    ${item.contentZh || item.contentEn ? `
                    <p class="frame-story">
                        <span class="lang-zh">${escapeHtml(item.contentZh)}</span>
                        <span class="lang-en">${escapeHtml(item.contentEn)}</span>
                    </p>` : ''}
                    <p class="frame-meta"><time>${escapeHtml(item.date)}</time>${item.exif ? `<span>${escapeHtml(item.exif)}</span>` : ''}</p>
                </div>
            `;

            // The entry detail modal lives in search.js; only make cards interactive when it is available.
            if (typeof window.openEntryDetailModal === 'function') {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
                card.setAttribute('aria-label', isEnglish() ? `Open ${item.titleEn}` : `打开${item.titleZh}`);
                card.addEventListener('click', () => window.openEntryDetailModal(item, 'diary'));
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        card.click();
                    }
                });
            }

            diaryGrid.appendChild(card);
        });
    }

    const rerender = setupFilters({ items, toolbar, render: renderDiaries });

    window.addEventListener('site:languagechange', event => {
        updateDiaryTitle(event.detail.lang);
        rerender();
    });
});
