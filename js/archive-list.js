// Shared helpers for the list-style sub pages (diary.html, journal.html):
// category / year filter chips, hero stats, and HTML escaping.

window.ArchiveList = (() => {
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function uniqueCategories(items) {
        const seen = new Map();
        items.forEach(item => {
            if (item.categoryEn && !seen.has(item.categoryEn)) {
                seen.set(item.categoryEn, { en: item.categoryEn, zh: item.categoryZh || item.categoryEn });
            }
        });
        return [...seen.values()];
    }

    function uniqueYears(items) {
        return [...new Set(items.map(item => item.year).filter(Boolean))].sort((a, b) => b - a);
    }

    function renderStats(scope, items) {
        const values = { count: pad(items.length), topics: pad(uniqueCategories(items).length) };
        scope.querySelectorAll('[data-stat]').forEach(node => {
            node.textContent = values[node.dataset.stat] ?? '—';
        });
    }

    function bindChips(list, onSelect) {
        const chips = [...list.querySelectorAll('li')];
        chips.forEach(chip => {
            chip.setAttribute('role', 'button');
            chip.tabIndex = 0;
            chip.setAttribute('aria-pressed', String(chip.classList.contains('active')));
            const activate = () => {
                chips.forEach(option => {
                    option.classList.toggle('active', option === chip);
                    option.setAttribute('aria-pressed', String(option === chip));
                });
                onSelect(chip);
            };
            chip.addEventListener('click', activate);
            chip.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            });
        });
    }

    const allChip = '<li data-{key}="ALL" class="active"><span class="lang-en">All</span><span class="lang-zh">全部</span></li>';

    /**
     * Builds the filter toolbar and calls render(filteredItems) whenever the selection changes.
     * The toolbar stays hidden when neither filter has more than one option.
     */
    function setupFilters({ items, toolbar, render }) {
        const state = { category: 'ALL', year: 'ALL' };
        const categoryList = toolbar?.querySelector('#category-filter');
        const yearList = toolbar?.querySelector('#year-filter');
        const categories = uniqueCategories(items);
        const years = uniqueYears(items);

        const apply = () => render(items.filter(item =>
            (state.category === 'ALL' || item.categoryEn === state.category) &&
            (state.year === 'ALL' || item.year === state.year)
        ));

        if (!toolbar || !categoryList || !yearList) {
            apply();
            return apply;
        }

        categoryList.innerHTML = allChip.replace('{key}', 'category') + categories.map(c =>
            `<li data-category="${escapeHtml(c.en)}"><span class="lang-en">${escapeHtml(c.en)}</span><span class="lang-zh">${escapeHtml(c.zh)}</span></li>`
        ).join('');
        yearList.innerHTML = allChip.replace('{key}', 'year') + years.map(y =>
            `<li data-year="${escapeHtml(y)}">${escapeHtml(y)}</li>`
        ).join('');

        categoryList.closest('.filter-group').hidden = categories.length < 2;
        yearList.closest('.filter-group').hidden = years.length < 2;
        toolbar.hidden = categories.length < 2 && years.length < 2;

        bindChips(categoryList, chip => { state.category = chip.dataset.category; apply(); });
        bindChips(yearList, chip => { state.year = chip.dataset.year; apply(); });

        apply();
        return apply;
    }

    function renderResult(node, shown, total, enNoun, zhNoun) {
        if (!node) return;
        node.innerHTML = `<span class="lang-en">${pad(shown)} / ${total} ${enNoun}</span><span class="lang-zh">${pad(shown)} / ${total} ${zhNoun}</span>`;
    }

    const noResult = (en, zh) =>
        `<p class="archive-no-result"><span class="lang-en">${en}</span><span class="lang-zh">${zh}</span></p>`;

    // Section switched off in js/maintenance-config.js: keep the page header and menu, replace
    // the content with a maintenance notice. Returns true when the page is under maintenance.
    function showMaintenance(page) {
        if (typeof MAINTENANCE_CONFIG === 'undefined' || !MAINTENANCE_CONFIG.disabledPages?.[page]) return false;
        const main = document.querySelector('.archive-page');
        if (!main) return false;
        main.querySelectorAll('.archive-toolbar, .archive-empty, .archive-grid, .journal-grid, .archive-stats')
            .forEach(element => { element.hidden = true; });
        main.insertAdjacentHTML('beforeend', `
            <section class="archive-maintenance" aria-live="polite">
                <p class="archive-kicker"><span>00</span><span class="lang-en">UNDER MAINTENANCE</span><span class="lang-zh">维护中</span></p>
                <h2>
                    <span class="lang-en">This section is being rebuilt.</span>
                    <span class="lang-zh">这个栏目正在整理中。</span>
                </h2>
                <p>
                    <span class="lang-en">New entries are on the way. In the meantime, the journeys are open.</span>
                    <span class="lang-zh">新的内容正在路上。在那之前，不妨先去看看旅途。</span>
                </p>
                <a class="primary-action" href="voyage.html">
                    <span class="lang-en">VISIT THE VOYAGE ARCHIVE</span><span class="lang-zh">浏览旅途影像</span>
                    <span aria-hidden="true">↗</span>
                </a>
            </section>`);
        return true;
    }

    return { escapeHtml, renderStats, setupFilters, renderResult, noResult, showMaintenance };
})();
