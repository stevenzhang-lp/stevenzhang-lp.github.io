// Site search, built into the expanded top menu: searches the voyage stories and journal essays
// (titles and place keywords — Chinese and English; not the story or essay text).
// The field sits above the section cards; "/" or ⌘K / Ctrl+K opens the menu and focuses it.
document.addEventListener('DOMContentLoaded', () => {
	const nav = document.getElementById('card-nav');
	const input = nav?.querySelector('.site-search-input');
	if (!nav || !input) return;

	const isEnglish = () => document.body.classList.contains('lang-en');
	const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[char]);

	// ---------------------------------------------------------------------------
	// Data: data.js is already on the archive pages; elsewhere it is loaded on first open.
	// ---------------------------------------------------------------------------
	let dataPromise = null;
	function loadData() {
		if (typeof photos !== 'undefined') return Promise.resolve();
		if (dataPromise) return dataPromise;
		dataPromise = new Promise(resolve => {
			const script = document.createElement('script');
			script.src = 'js/data.js';
			script.onload = resolve;
			script.onerror = resolve;
			document.head.appendChild(script);
		});
		return dataPromise;
	}

	let index = null;
	function buildIndex() {
		if (index) return index;
		index = [];
		if (typeof photos !== 'undefined') {
			photos.forEach(photo => {
				const loc = typeof parseLocation === 'function' ? parseLocation(photo.location) : { enTitle: photo.location, zhTitle: photo.location, enSub: '', zhSub: '' };
				const date = typeof parseDate === 'function' ? parseDate(photo.date) : { en: photo.date, zh: photo.date };
				index.push({
					type: 'voyage',
					id: photo.id,
					thumb: typeof imageVariant === 'function' ? imageVariant(photo.image, 'mini') : photo.image,
					// "槟城 · Batu Ferringhi 的日落余晖": place + the story's own title (after the colon).
					titleZh: `${loc.zhTitle} · ${photo.titleZh.split(/[：:]/).pop().trim()}`,
					titleEn: `${loc.enTitle} · ${photo.titleEn.split(/[：:]/).pop().trim().toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())}`,
					subZh: `${loc.zhSub} · ${date.zh}`,
					subEn: `${loc.enSub} · ${date.en}`,
					// Titles (place + story title) and place keywords only — not the story text.
					haystack: [loc.zhTitle, loc.enTitle, photo.titleZh, photo.titleEn, loc.zhSub, loc.enSub,
						photo.location, photo.mapQuery].join(' \u0000 ').toLowerCase()
				});
			});
		}
		if (typeof journals !== 'undefined') {
			journals.forEach(item => {
				index.push({
					type: 'journal',
					id: item.id,
					link: item.link,
					titleZh: item.titleZh,
					titleEn: item.titleEn,
					subZh: `${item.categoryZh || ''} · ${item.date || ''}`,
					subEn: `${item.categoryEn || ''} · ${item.date || ''}`,
					// Title and subtitle only — not the essay text.
					haystack: [item.titleZh, item.titleEn, item.eyebrowZh, item.eyebrowEn].join(' \u0000 ').toLowerCase()
				});
			});
		}
		return index;
	}

	function search(query) {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		if (!terms.length) return [];
		return buildIndex()
			.map(entry => {
				let score = 0;
				for (const term of terms) {
					const at = entry.haystack.indexOf(term);
					if (at === -1) return null;
					// The place name comes first in the haystack, so matching it ranks above the story title.
					score += at < 24 ? 3 : 1;
				}
				return { entry, score };
			})
			.filter(Boolean)
			.sort((a, b) => b.score - a.score)
			.slice(0, 8)
			.map(result => result.entry);
	}

	function highlight(text, terms) {
		let html = escapeHtml(text);
		terms.forEach(term => {
			const pattern = new RegExp(escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
			html = html.replace(pattern, match => `<mark>${match}</mark>`);
		});
		return html;
	}

	// ---------------------------------------------------------------------------
	// In-menu search: the field is the first row of the expanded menu; while there is a query
	// the results replace the section cards inside the same panel.
	// ---------------------------------------------------------------------------
	const cardsRow = nav.querySelector('.card-nav-cards');
	const panel = nav.querySelector('.site-search-panel');
	const list = nav.querySelector('.site-search-results');
	const empty = nav.querySelector('.site-search-empty');
	let results = [];
	let selected = -1;
	let lastQuery = '';

	function syncLanguage() {
		input.placeholder = isEnglish() ? 'Search places, stories, essays…' : '搜索地点、故事、随笔…';
		input.setAttribute('aria-label', isEnglish() ? 'Search' : '搜索');
		if (input.value.trim()) render();
	}
	window.addEventListener('site:languagechange', syncLanguage);
	syncLanguage();

	function render() {
		const query = input.value.trim();
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		results = query ? search(query) : [];
		selected = results.length ? 0 : -1;
		const en = isEnglish();
		list.innerHTML = results.map((entry, i) => `
			<li class="site-search-result${i === selected ? ' is-selected' : ''}" role="option" data-index="${i}" aria-selected="${i === selected}">
				${entry.thumb
					? `<img class="site-search-thumb" src="${escapeHtml(entry.thumb)}" alt="" loading="lazy">`
					: `<span class="site-search-thumb site-search-thumb-text" aria-hidden="true">${entry.type === 'journal' ? '∫' : '·'}</span>`}
				<span class="site-search-text">
					<span class="site-search-title">${highlight(en ? entry.titleEn : entry.titleZh, terms)}</span>
					<span class="site-search-sub">${escapeHtml(en ? entry.subEn : entry.subZh)}</span>
				</span>
				<span class="site-search-kind">${entry.type === 'journal' ? (en ? 'JOURNAL' : '随笔') : (en ? 'VOYAGE' : '旅途')}</span>
			</li>`).join('');
		empty.hidden = !query || results.length > 0;
		empty.textContent = en ? `Nothing found for “${query}”.` : `没有找到与“${query}”相关的内容。`;
		// Cards ↔ results swap only when the query appears / disappears, then the menu refits.
		const hasQuery = Boolean(query);
		if (hasQuery !== Boolean(lastQuery) || hasQuery) {
			cardsRow.hidden = hasQuery;
			panel.hidden = !hasQuery;
			nav.dispatchEvent(new CustomEvent('cardnav:resize'));
		}
		lastQuery = query;
	}

	function select(i) {
		if (!results.length) return;
		selected = (i + results.length) % results.length;
		list.querySelectorAll('.site-search-result').forEach((row, index) => {
			row.classList.toggle('is-selected', index === selected);
			row.setAttribute('aria-selected', String(index === selected));
		});
		list.children[selected]?.scrollIntoView({ block: 'nearest' });
	}

	function reset() {
		input.value = '';
		lastQuery = '';
		results = [];
		list.innerHTML = '';
		empty.hidden = true;
		cardsRow.hidden = false;
		panel.hidden = true;
	}

	function closeMenu() {
		nav.dispatchEvent(new CustomEvent('cardnav:close'));
	}

	function openResult(entry) {
		if (!entry) return;
		closeMenu();
		if (entry.type === 'journal') {
			if (entry.link) window.open(entry.link, '_blank', 'noopener');
			else window.location.assign('journal.html');
			return;
		}
		// Already on the voyage page: open the story in place.
		const photo = typeof photos !== 'undefined' ? photos.find(item => item.id === entry.id) : null;
		if (photo && typeof openDetail === 'function' && document.getElementById('detail-view')) {
			openDetail(photo, true);
		} else {
			window.location.assign(`voyage.html?id=${entry.id}`);
		}
	}

	// Data is loaded the first time the field is used; the menu closing clears the search.
	input.addEventListener('focus', () => loadData().then(() => { index = null; if (input.value.trim()) render(); }));
	input.addEventListener('input', () => loadData().then(render));
	new MutationObserver(() => {
		if (!nav.classList.contains('open')) reset();
	}).observe(nav, { attributes: true, attributeFilter: ['class'] });

	list.addEventListener('click', event => {
		const row = event.target.closest('.site-search-result');
		if (row) openResult(results[Number(row.dataset.index)]);
	});
	list.addEventListener('pointermove', event => {
		const row = event.target.closest('.site-search-result');
		if (row && Number(row.dataset.index) !== selected) select(Number(row.dataset.index));
	});

	// Unlisted command typed into the search field + Enter. Neither the command nor where it
	// leads is stored in plain text: the command is kept as a salted SHA-256 hash, and the
	// destination is XOR-encrypted with a keystream derived from the command itself.
	const SECRET = {
		salt: '31eddad08277ea20470809ae',
		hash: '9f54805ede582e83212364e172109f9269de458461fd04e63322fdf5fb484872',
		target: '6236330876ef13368653d63662a3072b3554fc358499239516928da2aab80d84'
	};

	// Compact SHA-256 (works on file:// too, where crypto.subtle may be unavailable).
	function sha256(message) {
		const bytes = new TextEncoder().encode(message);
		const K = [];
		const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
		for (let n = 2, found = 0; found < 64; n++) {
			let prime = true;
			for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
			if (prime) K[found++] = (Math.cbrt(n) % 1) * 2 ** 32 | 0;
		}
		const length = bytes.length;
		const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
		padded.set(bytes);
		padded[length] = 0x80;
		const view = new DataView(padded.buffer);
		view.setUint32(padded.length - 4, length * 8);
		view.setUint32(padded.length - 8, Math.floor(length / 2 ** 29));
		const w = new Uint32Array(64);
		const rotr = (x, n) => (x >>> n) | (x << (32 - n));
		for (let offset = 0; offset < padded.length; offset += 64) {
			for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
			for (let i = 16; i < 64; i++) {
				const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
				const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
				w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
			}
			let [a, b, c, d, e, f, g, h] = H;
			for (let i = 0; i < 64; i++) {
				const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
				const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
				h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
			}
			H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
			H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
		}
		const out = new Uint8Array(32);
		H.forEach((value, i) => new DataView(out.buffer).setUint32(i * 4, value));
		return out;
	}
	const toHex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

	// Returns the decrypted destination when the typed text is the command, otherwise null.
	function unlock(text) {
		const command = text.trim().toLowerCase();
		if (!command || toHex(sha256(`${SECRET.salt}|${command}`)) !== SECRET.hash) return null;
		const cipher = SECRET.target.match(/../g).map(pair => parseInt(pair, 16));
		const stream = [];
		for (let block = 0; stream.length < cipher.length; block++) {
			stream.push(...sha256(`${command}|${SECRET.salt}|url|${block}`));
		}
		return new TextDecoder().decode(new Uint8Array(cipher.map((byte, i) => byte ^ stream[i])));
	}

	// A short frosted hand-off with a progress bar before leaving, instead of jumping at once.
	// The name shown comes from the decrypted address, so it is not stored in plain text either.
	function launch(destination) {
		const name = decodeURIComponent(new URL(destination).pathname.split('/').filter(Boolean).pop() || new URL(destination).hostname);
		const overlay = document.createElement('div');
		overlay.className = 'site-launch';
		overlay.setAttribute('role', 'status');
		overlay.innerHTML = `
			<div class="site-launch-box">
				<p class="site-launch-kicker"><span class="lang-en">OPENING</span><span class="lang-zh">正在进入</span></p>
				<p class="site-launch-name">${escapeHtml(name)}</p>
				<div class="site-launch-track"><span class="site-launch-bar"></span></div>
				<p class="site-launch-hint"><span class="lang-en">esc to cancel</span><span class="lang-zh">按 esc 取消</span></p>
			</div>`;
		document.body.appendChild(overlay);
		const bar = overlay.querySelector('.site-launch-bar');
		requestAnimationFrame(() => overlay.classList.add('is-open'));
		const duration = 1200;
		const progress = bar.animate(
			[{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.72)', offset: 0.55 }, { transform: 'scaleX(1)' }],
			{ duration, easing: 'cubic-bezier(0.3, 0, 0.2, 1)', delay: 150, fill: 'forwards' }
		);
		let cancelled = false;
		const dismiss = () => {
			overlay.classList.remove('is-open');
			window.setTimeout(() => overlay.remove(), 300);
		};
		const onKey = keyEvent => {
			if (keyEvent.key !== 'Escape') return;
			keyEvent.preventDefault();
			keyEvent.stopImmediatePropagation();
			cancelled = true;
			progress.cancel();
			document.removeEventListener('keydown', onKey, true);
			dismiss();
		};
		document.addEventListener('keydown', onKey, true);
		progress.finished.then(() => {
			if (cancelled) return;
			document.removeEventListener('keydown', onKey, true);
			window.location.assign(destination);
		}).catch(() => {});
		// Back from the destination restores this page from cache: clear the overlay.
		window.addEventListener('pageshow', pageEvent => { if (pageEvent.persisted) overlay.remove(); }, { once: true });
	}

	input.addEventListener('keydown', event => {
		if (event.key === 'Enter' && !event.isComposing) {
			const destination = unlock(input.value);
			if (destination) {
				event.preventDefault();
				reset();
				closeMenu();
				launch(destination);
				return;
			}
		}
		if (event.key === 'ArrowDown') { event.preventDefault(); select(selected + 1); }
		else if (event.key === 'ArrowUp') { event.preventDefault(); select(selected - 1); }
		else if (event.key === 'Enter') { event.preventDefault(); openResult(results[selected]); }
		else if (event.key === 'Escape' && input.value) {
			// First Esc clears the query; the next one closes the menu (main.js).
			event.preventDefault();
			event.stopPropagation();
			reset();
			nav.dispatchEvent(new CustomEvent('cardnav:resize'));
		}
	});

	// Round search button in the top bar (left of the language toggle): opens the menu with the
	// cursor in the search field, or just focuses the field if the menu is already open.
	const searchToggle = nav.querySelector('.card-nav-search-toggle');
	function focusSearch() {
		if (!nav.classList.contains('open')) nav.dispatchEvent(new CustomEvent('cardnav:open'));
		window.setTimeout(() => input.focus({ preventScroll: true }), 120);
	}
	searchToggle?.addEventListener('click', focusSearch);
	window.addEventListener('site:languagechange', () => {
		searchToggle?.setAttribute('aria-label', isEnglish() ? 'Search' : '搜索');
		searchToggle?.setAttribute('title', isEnglish() ? 'Search ( / )' : '搜索 ( / )');
	});

	// "/" or ⌘K / Ctrl+K: open the menu with the cursor in the search field.
	document.addEventListener('keydown', event => {
		const typing = event.target.closest?.('input, textarea, [contenteditable="true"]');
		if (!((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing))) return;
		event.preventDefault();
		focusSearch();
	});
});
