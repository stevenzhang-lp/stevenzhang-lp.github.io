document.addEventListener('DOMContentLoaded', () => {
    // 1. Determine Current Page Type
    const path = window.location.pathname;
    const isVoyage = path.includes('voyage.html');
    const isDiary = path.includes('diary.html');
    const isJournal = path.includes('journal.html');
    const isGlobal = !isVoyage && !isDiary && !isJournal;

    // Auto-wipe vault session whenever landing on a standard page to prevent lingering data
    sessionStorage.removeItem('decrypted_vault_entries');
    sessionStorage.removeItem('vault_authorized');

    // Handle back button (bfcache) restoration state
    window.addEventListener('pageshow', (e) => {
        // Reset body opacity to let CSS transition take over
        document.body.style.opacity = '';
        document.body.classList.add('fonts-loaded');

        if (e.persisted) {
            const searchModal = document.getElementById('search-modal');
            const searchInput = document.getElementById('search-input');
            if (searchModal) {
                searchModal.classList.remove('show');
                searchModal.classList.remove('vault-decrypt-success');
            }
            if (searchInput) {
                searchInput.value = '';
                searchInput.disabled = false;
            }
            document.body.style.overflow = '';
        }
    });

    // Global smooth page transitions on navigation links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href) {
            const hrefAttr = link.getAttribute('href');
            // Check if link goes to a hash, language switcher, custom vault lock, or is external
            if (!hrefAttr || hrefAttr.startsWith('#') || link.id.includes('lang-toggle') || link.id === 'lock-return-link' || link.getAttribute('target') === '_blank') {
                return;
            }

            try {
                const url = new URL(link.href);
                if (url.origin === window.location.origin) {
                    const path = url.pathname;
                    const targetPage = path.substring(path.lastIndexOf('/') + 1);
                    const pages = ['index.html', 'voyage.html', 'diary.html', 'journal.html', 'vault.html'];
                    const isInternalPage = pages.some(p => targetPage === p) || targetPage === '';

                    if (isInternalPage) {
                        e.preventDefault();
                        document.body.style.transition = 'opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                        document.body.style.opacity = '0';
                        setTimeout(() => {
                            window.location.href = link.href;
                        }, 400);
                    }
                }
            } catch (err) {
                console.error("Navigation error:", err);
            }
        }
    });

    // 2. Inject Search Button & Search Modal
    insertSearchButton();
    insertSearchModal();

    if (isDiary || isJournal) {
        insertEntryDetailModal();
    }

    // 3. Setup Search Event Listeners
    const searchBtn = document.getElementById('search-btn');
    const searchModal = document.getElementById('search-modal');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (searchBtn && searchModal && closeSearchBtn && searchInput) {
        // Open search
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSearch();
        });

        // Close search
        closeSearchBtn.addEventListener('click', closeSearch);

        // Click outside search container to close
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                closeSearch();
            }
        });

        // Listen for input
        searchInput.addEventListener('input', () => {
            performSearch(searchInput.value.trim());
        });

        // Listen for enter key for private vault password check
        searchInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();

                if (query === 'sz.lp.28') {
                    e.preventDefault();
                    if (typeof vaultConfig !== 'undefined') {
                        try {
                            const entries = await decryptVault(query, vaultConfig);
                            if (entries && Array.isArray(entries)) {
                                sessionStorage.setItem('decrypted_vault_entries', JSON.stringify(entries));
                                sessionStorage.setItem('vault_authorized', 'true');

                                searchInput.blur();
                                searchInput.disabled = true;

                                // Trigger premium success animation
                                searchModal.classList.add('vault-decrypt-success');

                                setTimeout(() => {
                                    // Navigate directly while keeping the solid dark overlay visible
                                    window.location.href = 'vault.html';
                                }, 800);
                            }
                        } catch (err) {
                            console.error("Vault decryption failed:", err);
                        }
                    }
                }
            }
        });
    }

    // Keyboard Shortcuts (/, Cmd+K, Esc)
    document.addEventListener('keydown', (e) => {
        // If modal is open and user presses Esc
        if (e.key === 'Escape') {
            if (searchModal && searchModal.classList.contains('show')) {
                closeSearch();
            }
            const entryModal = document.getElementById('entry-detail-modal');
            if (entryModal && entryModal.classList.contains('show')) {
                closeEntryDetailModal();
            }
        }

        // Shortcut '/' or 'Cmd+K' to open search (unless in an input/textarea)
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            if (e.key === '/' || (e.metaKey && e.key.toLowerCase() === 'k') || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                openSearch();
            }
        }
    });

    function openSearch() {
        if (searchModal) {
            searchModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            updateSearchPlaceholder();
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    function closeSearch() {
        if (searchModal) {
            searchModal.classList.remove('show');
            document.body.style.overflow = '';
            if (searchInput) searchInput.value = '';
            if (searchResults) searchResults.innerHTML = '';
        }
    }

    function updateSearchPlaceholder() {
        if (!searchInput) return;
        const currentLang = localStorage.getItem('voyage_lang') || 'zh';
        if (isGlobal) {
            searchInput.placeholder = currentLang === 'en' 
                ? "Search global archives, photography, thoughts..." 
                : "搜索全局档案、摄影、思维碎片...";
        } else if (isVoyage) {
            searchInput.placeholder = currentLang === 'en' 
                ? "Search photography by title, story, country..." 
                : "搜索时空档案（标题、故事、国家/城市）...";
        } else if (isDiary) {
            searchInput.placeholder = currentLang === 'en' 
                ? "Search daily fragments by title, content, tag..." 
                : "搜索日常切片（标题、内容、年份）...";
        } else if (isJournal) {
            searchInput.placeholder = currentLang === 'en' 
                ? "Search thought fragments by title, concept..." 
                : "搜索思维碎片（标题、观点、分类）...";
        }
    }

    // 4. Search Execution Logic
    function performSearch(query) {
        if (!searchResults) return;

        if (!query) {
            searchResults.innerHTML = '';
            return;
        }

        const isEn = localStorage.getItem('voyage_lang') === 'en';
        const queryLower = query.toLowerCase();

        let results = [];

        // Fetch data matching queries
        if (isGlobal || isVoyage) {
            // Search photos (Voyage)
            if (typeof photos !== 'undefined') {
                photos.forEach(item => {
                    let matchScore = calculateMatchScore(item, queryLower, ['titleZh', 'titleEn', 'storyZh', 'storyEn', 'location', 'date']);
                    
                    // Parse location names dynamically to match Chinese/English geographical queries
                    if (typeof parseLocation === 'function') {
                        const loc = parseLocation(item.location);
                        if (loc) {
                            const extraLocFields = [loc.enTitle, loc.zhTitle, loc.enSub, loc.zhSub];
                            extraLocFields.forEach(val => {
                                if (val && val.toLowerCase().includes(queryLower)) {
                                    matchScore += 8; // High relevance score for location match
                                }
                            });
                        }
                    }

                    if (matchScore > 0) {
                        results.push({
                            type: 'voyage',
                            subsiteZh: '时空档案室',
                            subsiteEn: 'VOYAGE ARCHIVE',
                            url: `voyage.html?id=${item.id}`,
                            id: item.id,
                            titleZh: item.titleZh,
                            titleEn: item.titleEn,
                            excerptZh: item.storyZh,
                            excerptEn: item.storyEn,
                            date: item.date,
                            image: item.image,
                            score: matchScore,
                            rawData: item
                        });
                    }
                });
            }
        }

        if (isGlobal || isDiary) {
            // Search diaries (Diary)
            if (typeof diaries !== 'undefined') {
                diaries.forEach(item => {
                    const matchScore = calculateMatchScore(item, queryLower, ['titleZh', 'titleEn', 'contentZh', 'contentEn', 'categoryZh', 'categoryEn', 'year', 'date']);
                    if (matchScore > 0) {
                        results.push({
                            type: 'diary',
                            subsiteZh: '日常切片',
                            subsiteEn: 'DAILY FRAGMENTS',
                            url: `diary.html?id=${item.id}`,
                            id: item.id,
                            titleZh: item.titleZh,
                            titleEn: item.titleEn,
                            excerptZh: item.contentZh,
                            excerptEn: item.contentEn,
                            date: item.date,
                            image: item.image,
                            score: matchScore,
                            rawData: item
                        });
                    }
                });
            }
        }

        if (isGlobal || isJournal) {
            // Search journals (Journal)
            if (typeof journals !== 'undefined') {
                journals.forEach(item => {
                    const matchScore = calculateMatchScore(item, queryLower, ['titleZh', 'titleEn', 'contentZh', 'contentEn', 'categoryZh', 'categoryEn', 'year', 'date']);
                    if (matchScore > 0) {
                        results.push({
                            type: 'journal',
                            subsiteZh: '思维碎片',
                            subsiteEn: 'THOUGHT FRAGMENTS',
                            url: `journal.html?id=${item.id}`,
                            id: item.id,
                            titleZh: item.titleZh,
                            titleEn: item.titleEn,
                            excerptZh: item.contentZh,
                            excerptEn: item.contentEn,
                            date: item.date,
                            image: null,
                            score: matchScore,
                            rawData: item
                        });
                    }
                });
            }
        }

        // Sort by match score (relevance) descending
        results.sort((a, b) => b.score - a.score);

        // Render results
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <span class="lang-zh">未找到相关内容</span>
                    <span class="lang-en">No matching archives found</span>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(res => {
                const subsiteTag = isGlobal ? `
                    <span class="subsite-label">
                        <span class="lang-zh">${res.subsiteZh} · ${res.type}.html</span>
                        <span class="lang-en">${res.subsiteEn} · ${res.type}.html</span>
                    </span>
                ` : '';

                const imageHtml = res.image ? `
                    <div class="search-result-img-container">
                        <img src="${res.image}" alt="Image" class="search-result-img" loading="lazy">
                    </div>
                ` : '';

                return `
                    <div class="search-result-item" data-type="${res.type}" data-id="${res.id}">
                        ${imageHtml}
                        <div class="search-result-info">
                            <div class="search-result-header">
                                <h4 class="search-result-title">
                                    <span class="lang-zh">${res.titleZh}</span>
                                    <span class="lang-en">${res.titleEn}</span>
                                </h4>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    ${subsiteTag}
                                    <span class="search-result-meta">${res.date}</span>
                                </div>
                            </div>
                            <p class="search-result-excerpt">
                                <span class="lang-zh">${res.excerptZh}</span>
                                <span class="lang-en">${res.excerptEn}</span>
                            </p>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click handlers for results
            const items = searchResults.querySelectorAll('.search-result-item');
            items.forEach((item, index) => {
                const res = results[index];
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleResultClick(res);
                });
            });
        }
    }

    function calculateMatchScore(item, query, fields) {
        let score = 0;
        fields.forEach(field => {
            if (item[field]) {
                const val = String(item[field]).toLowerCase();
                if (val.includes(query)) {
                    // Match in title gets highest weight
                    if (field.startsWith('title')) {
                        score += 10;
                    } else if (field.startsWith('story') || field.startsWith('content')) {
                        score += 5;
                    } else {
                        score += 2;
                    }
                }
            }
        });
        return score;
    }

    function handleResultClick(result) {
        closeSearch();

        if (isGlobal) {
            // On global hub, redirect with item ID as parameter
            window.location.href = result.url;
        } else {
            // Local page interaction
            if (isVoyage && result.type === 'voyage') {
                if (typeof openDetail === 'function') {
                    openDetail(result.rawData);
                }
            } else if (isDiary && result.type === 'diary') {
                openEntryDetailModal(result.rawData, 'diary');
            } else if (isJournal && result.type === 'journal') {
                openEntryDetailModal(result.rawData, 'journal');
            }
        }
    }

    // 5. Deep Linking Support (Open item if loaded from URL parameter)
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if (idParam) {
            const id = parseInt(idParam);
            if (isVoyage && typeof photos !== 'undefined') {
                const photo = photos.find(p => p.id === id);
                if (photo && typeof openDetail === 'function') {
                    openDetail(photo);
                }
            } else if (isDiary && typeof diaries !== 'undefined') {
                const diary = diaries.find(d => d.id === id);
                if (diary) {
                    openEntryDetailModal(diary, 'diary');
                }
            } else if (isJournal && typeof journals !== 'undefined') {
                const journal = journals.find(j => j.id === id);
                if (journal) {
                    openEntryDetailModal(journal, 'journal');
                }
            }
        }
    }, 300);

    // Helper functions for dynamic insertion
    function insertSearchButton() {
        const mainNav = document.querySelector('.main-nav');
        if (!mainNav) return;

        const langToggle = document.getElementById('lang-toggle-home') || document.getElementById('lang-toggle');

        const searchBtn = document.createElement('button');
        searchBtn.id = 'search-btn';
        searchBtn.className = 'search-trigger-btn';
        searchBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="search-btn-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span class="lang-en">SEARCH</span>
            <span class="lang-zh">搜索</span>
        `;

        if (langToggle) {
            mainNav.insertBefore(searchBtn, langToggle);
        } else {
            mainNav.appendChild(searchBtn);
        }
    }

    function insertSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.className = 'search-modal-overlay';
        modal.innerHTML = `
            <div class="search-modal-content">
                <button class="close-search" id="close-search-btn">&times;</button>
                <div class="search-input-wrapper">
                    <svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="search-input" placeholder="Search..." autocomplete="off">
                </div>
                <div class="search-results-container" id="search-results"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function insertEntryDetailModal() {
        if (document.getElementById('entry-detail-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'entry-detail-modal';
        modal.className = 'home-modal';
        modal.innerHTML = `
            <div class="home-modal-content entry-detail-modal-content">
                <button class="close-modal" id="close-entry-modal-btn">&times;</button>
                <div class="entry-detail-header">
                    <div class="entry-detail-subsite-label" id="entry-detail-subsite"></div>
                    <h2 class="modal-title" id="entry-detail-title"></h2>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem;">
                        <div class="entry-detail-meta" id="entry-detail-meta" style="margin-top: 0;"></div>
                        <button class="entry-share-btn" id="entry-share-btn">
                            <span class="lang-en">[ SHARE ]</span>
                            <span class="lang-zh">[ 分享 ]</span>
                        </button>
                    </div>
                </div>
                <div class="modal-body" id="entry-detail-body"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = document.getElementById('close-entry-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeEntryDetailModal);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEntryDetailModal();
            }
        });
    }

    function openEntryDetailModal(item, type) {
        const modal = document.getElementById('entry-detail-modal');
        const subsite = document.getElementById('entry-detail-subsite');
        const title = document.getElementById('entry-detail-title');
        const meta = document.getElementById('entry-detail-meta');
        const body = document.getElementById('entry-detail-body');

        if (!modal || !title || !meta || !body || !subsite) return;

        // Subsite labels
        if (type === 'diary') {
            subsite.innerHTML = `
                <span class="lang-zh">日常切片 · diary.html</span>
                <span class="lang-en">DAILY FRAGMENTS · diary.html</span>
            `;
        } else {
            subsite.innerHTML = `
                <span class="lang-zh">思维碎片 · journal.html</span>
                <span class="lang-en">THOUGHT FRAGMENTS · journal.html</span>
            `;
        }

        // Title
        title.innerHTML = `
            <span class="lang-zh">${item.titleZh}</span>
            <span class="lang-en">${item.titleEn}</span>
        `;

        // Metadata
        const categoryTagZh = item.categoryZh || '';
        const categoryTagEn = item.categoryEn || '';
        const catTextZh = categoryTagZh ? `${categoryTagZh} | ` : '';
        const catTextEn = categoryTagEn ? `${categoryTagEn} | ` : '';
        
        meta.innerHTML = `
            <span class="lang-zh">${catTextZh}${item.date}</span>
            <span class="lang-en">${catTextEn}${item.date}</span>
        `;

        // Body Content
        let contentHtml = '';
        if (item.image) {
            contentHtml += `
                <div class="entry-detail-image-wrapper">
                    <img src="${item.image}" alt="${item.titleEn}" class="entry-detail-image" loading="lazy">
                </div>
            `;
        }

        contentHtml += `
            <p class="entry-detail-text">
                <span class="lang-zh">${item.contentZh}</span>
                <span class="lang-en">${item.contentEn}</span>
            </p>
        `;

        if (item.exif) {
            contentHtml += `
                <div class="entry-detail-exif">
                    ${item.exif}
                </div>
            `;
        }

        body.innerHTML = contentHtml;

        // Wire Share button click handler dynamically
        const shareBtn = document.getElementById('entry-share-btn');
        if (shareBtn) {
            const newShareBtn = shareBtn.cloneNode(true);
            shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
            newShareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.openShareModal === 'function') {
                    window.openShareModal(item, type);
                }
            });
        }

        // Show modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeEntryDetailModal() {
        const modal = document.getElementById('entry-detail-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            
            // Clean URL query parameters to avoid re-triggering on reload
            if (window.location.search) {
                const url = new URL(window.location.href);
                url.search = '';
                window.history.replaceState({}, document.title, url.toString());
            }
        }
    }



    function triggerPrivateVault() {
        const inputWrapper = document.querySelector('.search-input-wrapper');
        if (inputWrapper) {
            inputWrapper.classList.add('vault-unlocked-glow');
        }
        if (searchInput) {
            searchInput.blur();
            searchInput.disabled = true;
        }

        setTimeout(() => {
            closeSearch();
            // Remove the glow for next time
            if (inputWrapper) {
                inputWrapper.classList.remove('vault-unlocked-glow');
            }
            if (searchInput) {
                searchInput.disabled = false;
                searchInput.value = '';
            }

            // Redirect to standalone vault page
            window.location.href = 'vault.html';
        }, 1200);
    }

    // Helper to convert hex string to Uint8Array
    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    // Decrypt Vault using single-layer passcode (sz.lp.28)
    async function decryptVault(passcode, config) {
        if (!config || !config.encryptedPrivJwk) return null;

        const importRawKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(passcode),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        const saltBytes = hexToBytes(config.passcodeSalt);
        const pbkdf2Params = {
            name: "PBKDF2",
            salt: saltBytes,
            iterations: 100000,
            hash: "SHA-256"
        };

        const derivedAesKey = await crypto.subtle.deriveKey(
            pbkdf2Params,
            importRawKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const encryptedPrivBytes = hexToBytes(config.encryptedPrivJwk);
        const ivBytes = hexToBytes(config.privIv);
        const tagBytes = hexToBytes(config.privTag);

        const combinedBytes = new Uint8Array(encryptedPrivBytes.length + tagBytes.length);
        combinedBytes.set(encryptedPrivBytes);
        combinedBytes.set(tagBytes, encryptedPrivBytes.length);

        const decryptedPrivBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes },
            derivedAesKey,
            combinedBytes
        );

        const privateJwk = JSON.parse(new TextDecoder().decode(decryptedPrivBuffer));

        // ECDH derive key for entries
        const staticPrivateKey = await crypto.subtle.importKey(
            "jwk",
            privateJwk,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const ephPublicKey = await crypto.subtle.importKey(
            "jwk",
            config.ephPubJwk,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );

        const sharedSecretBits = await crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: ephPublicKey
            },
            staticPrivateKey,
            256
        );

        const sha256Digest = await crypto.subtle.digest("SHA-256", sharedSecretBits);

        const entriesAesKey = await crypto.subtle.importKey(
            "raw",
            sha256Digest,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        const encryptedEntriesBytes = hexToBytes(config.encryptedEntries);
        const entriesIvBytes = hexToBytes(config.entriesIv);
        const entriesTagBytes = hexToBytes(config.entriesTag);

        const combinedEntriesBytes = new Uint8Array(encryptedEntriesBytes.length + entriesTagBytes.length);
        combinedEntriesBytes.set(encryptedEntriesBytes);
        combinedEntriesBytes.set(entriesTagBytes, encryptedEntriesBytes.length);

        const decryptedEntriesBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: entriesIvBytes },
            entriesAesKey,
            combinedEntriesBytes
        );

        return JSON.parse(new TextDecoder().decode(decryptedEntriesBuffer));
    }

    // Expose entry detail modal globally
    window.openEntryDetailModal = openEntryDetailModal;
});
