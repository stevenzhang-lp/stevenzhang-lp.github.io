document.addEventListener('DOMContentLoaded', () => {
	const body = document.body;
	const langToggle = document.getElementById('lang-toggle');
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const hasGsap = typeof window.gsap !== 'undefined';
	const hasAnime = typeof window.anime !== 'undefined';

	const storage = {
		get(key) {
			try { return window.localStorage.getItem(key); } catch (error) { return null; }
		},
		set(key, value) {
			try { window.localStorage.setItem(key, value); } catch (error) { /* Storage may be restricted. */ }
		}
	};

	let currentLang = storage.get('siteLang') || storage.get('voyage_lang') || 'zh';

	function updateLanguage(lang, announce = false) {
		currentLang = lang === 'en' ? 'en' : 'zh';
		body.classList.remove('lang-zh', 'lang-en');
		body.classList.add(`lang-${currentLang}`);
		document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
		storage.set('siteLang', currentLang);
		storage.set('voyage_lang', currentLang);

		if (langToggle) {
			langToggle.setAttribute('aria-label', currentLang === 'zh' ? 'Switch to English' : '切换至中文');
		}

		window.dispatchEvent(new CustomEvent('site:languagechange', {
			detail: { lang: currentLang, announce }
		}));
	}

	updateLanguage(currentLang);

	if (langToggle && !langToggle.dataset.languageBound) {
		langToggle.dataset.languageBound = 'true';
		langToggle.addEventListener('click', () => {
			updateLanguage(currentLang === 'en' ? 'zh' : 'en', true);
		});
	}

	function initCardNav() {
		const nav = document.getElementById('card-nav');
		const toggle = document.getElementById('card-nav-toggle');
		const content = document.getElementById('card-nav-content');
		if (!nav || !toggle || !content) return;

		const cards = [...content.querySelectorAll('.card-nav-card')];
		// Everything that slides in when the menu opens: the search row first, then the cards.
		const reveal = [...content.querySelectorAll('.card-nav-search, .card-nav-card')];
		let expanded = false;
		let animation = null;

		cards.forEach(card => {
			let frame = 0;
			let pointerX = 0;
			let pointerY = 0;
			const paintGradient = () => {
				frame = 0;
				const rect = card.getBoundingClientRect();
				card.style.setProperty('--pointer-x', `${pointerX - rect.left}px`);
				card.style.setProperty('--pointer-y', `${pointerY - rect.top}px`);
			};
			card.addEventListener('pointermove', event => {
				pointerX = event.clientX;
				pointerY = event.clientY;
				if (!frame) frame = requestAnimationFrame(paintGradient);
			}, { passive: true });
			card.addEventListener('focusin', () => {
				card.style.setProperty('--pointer-x', '50%');
				card.style.setProperty('--pointer-y', '12%');
			});
		});

		const calculateHeight = () => {
			const previous = {
				visibility: content.style.visibility,
				pointerEvents: content.style.pointerEvents,
				position: content.style.position,
				height: content.style.height
			};
			content.style.visibility = 'visible';
			content.style.pointerEvents = 'auto';
			content.style.position = 'static';
			content.style.height = 'auto';
			// Measured from the content's layout box (search row + cards, or search results).
			// offsetHeight, not scrollHeight: the cards start translated 50px down for their slide-in,
			// and scrollHeight counts that transform, which left an empty band under the cards.
			const height = Math.min(60 + content.offsetHeight, window.innerHeight - 32);
			Object.assign(content.style, previous);
			return height;
		};

		const finishClosed = () => {
			nav.classList.remove('open');
			content.setAttribute('aria-hidden', 'true');
			if (hasGsap) window.gsap.set(reveal, { y: 50, opacity: 0 });
		};

		const setExpanded = open => {
			if (open === expanded) return;
			expanded = open;
			toggle.classList.toggle('open', open);
			toggle.setAttribute('aria-expanded', String(open));
			toggle.setAttribute('aria-label', open ? '关闭栏目导航' : '打开栏目导航');
			animation?.kill?.();

			if (open) {
				nav.classList.add('open');
				content.setAttribute('aria-hidden', 'false');
				if (hasGsap && !reduceMotion) {
					window.gsap.set(reveal, { y: 50, opacity: 0 });
					animation = window.gsap.timeline()
						.to(nav, { height: calculateHeight(), duration: 0.4, ease: 'power3.out' })
						.to(reveal, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.08 }, '-=0.1');
				} else {
					nav.style.height = `${calculateHeight()}px`;
					reveal.forEach(card => { card.style.opacity = '1'; card.style.transform = 'none'; });
				}
			} else if (hasGsap && !reduceMotion) {
				animation = window.gsap.timeline({ onComplete: finishClosed })
					.to(reveal, { y: 24, opacity: 0, duration: 0.22, ease: 'power2.in', stagger: { each: 0.035, from: 'end' } })
					.to(nav, { height: 60, duration: 0.32, ease: 'power3.inOut' }, '-=0.08');
			} else {
				nav.style.height = '60px';
				finishClosed();
			}
		};

		if (hasGsap) {
			window.gsap.set(nav, { height: 60, overflow: 'hidden' });
			window.gsap.set(reveal, { y: 50, opacity: 0 });
		}

		// Lets other code (scroll handling) close the menu through the normal animated path.
		// The whole card opens its section, not only the small link line at its bottom.
		cards.forEach(card => {
			const link = card.querySelector('.card-nav-link[href]');
			if (!link) return;
			card.addEventListener('click', event => {
				if (event.target.closest('a')) return;
				link.click();
			});
		});

		nav.addEventListener('cardnav:close', () => setExpanded(false));
		// Search: open the menu (from the round button too), and refit it when results change.
		nav.addEventListener('cardnav:open', () => {
			nav.closest('.card-nav-container')?.classList.remove('is-compact');
			setExpanded(true);
		});
		nav.addEventListener('cardnav:resize', () => {
			if (!expanded) return;
			if (hasGsap && !reduceMotion) window.gsap.to(nav, { height: calculateHeight(), duration: 0.32, ease: 'power3.out', overwrite: 'auto' });
			else nav.style.height = `${calculateHeight()}px`;
		});

		toggle.addEventListener('click', () => {
			const container = nav.closest('.card-nav-container');
			if (!expanded && container?.classList.contains('is-compact')) {
				// Round button: just restore the full bar. The menu opens on the next click.
				container.classList.remove('is-compact');
				return;
			}
			setExpanded(!expanded);
		});
		document.addEventListener('pointerdown', event => {
			if (expanded && !nav.contains(event.target)) setExpanded(false);
		}, { passive: true });
		document.addEventListener('keydown', event => {
			if (event.key !== 'Escape' || !expanded) return;
			setExpanded(false);
			toggle.focus();
		});
		window.addEventListener('resize', () => {
			if (!expanded) return;
			if (hasGsap) window.gsap.set(nav, { height: calculateHeight() });
			else nav.style.height = `${calculateHeight()}px`;
		}, { passive: true });
	}

	initCardNav();

	// Sections under maintenance (js/maintenance-config.js) stay clickable in the menu and get
	// a small "维护中" badge; the page itself shows the maintenance notice.
	function markMaintenance() {
		if (typeof MAINTENANCE_CONFIG === 'undefined') return;
		document.querySelectorAll('.card-nav-link[href]').forEach(link => {
			const page = (link.getAttribute('href') || '').split(/[?#]/)[0];
			if (!MAINTENANCE_CONFIG.disabledPages?.[page]) return;
			const label = link.closest('.card-nav-card')?.querySelector('.card-nav-label');
			if (!label || label.querySelector('.card-nav-badge')) return;
			label.insertAdjacentHTML('beforeend', '<span class="card-nav-badge"><span class="lang-en">SOON</span><span class="lang-zh">维护中</span></span>');
		});
	}

	markMaintenance();

	// While scrolling down the floating nav shrinks into a round hamburger button (so it never
	// sits over headings); any upward scroll, the top of the page or keyboard focus restores it.
	function initNavAutoHide() {
		const container = document.querySelector('.card-nav-container');
		const nav = document.getElementById('card-nav');
		if (!container || !nav) return;
		let lastY = window.scrollY;
		let frame = 0;
		let menuOpenedAtY = null;
		// Where the round button parks: the middle of the empty margin left of the page content
		// (measured, since every page lays out differently); a small inset when there is no margin.
		const contentSelectors = ['.archive-hero', '.archive-toolbar', '.archive-grid', '.journal-grid',
			'#detail-view .detail-arrival', '#detail-view .detail-content', '.world-copy', '.globe-shell'];
		const dockLeft = () => {
			let contentLeft = Infinity;
			contentSelectors.forEach(selector => document.querySelectorAll(selector).forEach(element => {
				const rect = element.getBoundingClientRect();
				if (rect.width && rect.height && rect.bottom > 0 && rect.top < window.innerHeight) {
					contentLeft = Math.min(contentLeft, rect.left);
				}
			}));
			const size = 60;
			const inset = window.innerWidth <= 768 ? 16 : 20;
			if (!Number.isFinite(contentLeft) || contentLeft < size + inset * 2) return inset;
			return Math.round((contentLeft - size) / 2);
		};
		const setTucked = compact => {
			if (compact && !container.classList.contains('is-compact')) {
				container.style.setProperty('--nav-dock-left', `${dockLeft()}px`);
			}
			container.classList.toggle('is-compact', compact);
		};
		window.addEventListener('resize', () => {
			if (container.classList.contains('is-compact')) container.style.setProperty('--nav-dock-left', `${dockLeft()}px`);
		}, { passive: true });
		window.addEventListener('scroll', () => {
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				const y = window.scrollY;
				if (nav.classList.contains('open')) {
					// An open menu closes once the page is scrolled ~40px either way; from then on
					// the normal down = circle / up = full bar rules apply.
					if (menuOpenedAtY === null) menuOpenedAtY = y;
					if (Math.abs(y - menuOpenedAtY) > 40) {
						menuOpenedAtY = null;
						nav.dispatchEvent(new CustomEvent('cardnav:close'));
					}
					lastY = y;
					return;
				}
				menuOpenedAtY = null;
				const delta = y - lastY;
				// Collapses as soon as you scroll down; only expands again once you are almost back
				// at the top (the round button can still be clicked to expand at any point).
				if (y < 140) setTucked(false);
				else if (delta > 6) setTucked(true);
				if (Math.abs(delta) > 6 || y < 140) lastY = y;
			});
		}, { passive: true });
		container.addEventListener('focusin', event => {
			// The hamburger itself may stay round; anything else in the bar needs the full bar.
			if (!event.target.closest('.hamburger-menu')) setTucked(false);
		});
	}

	initNavAutoHide();

	function createStars(elementId, count, size) {
		const element = document.getElementById(elementId);
		if (!element) return;

		const width = window.innerWidth * 2;
		const height = window.innerHeight * 2;
		const shadows = Array.from({ length: count }, () => {
			const x = Math.floor(Math.random() * width);
			const y = Math.floor(Math.random() * height);
			const opacity = Math.random() * 0.7 + 0.2;
			return `${x}px ${y}px rgba(255,255,255,${opacity})`;
		});

		element.style.boxShadow = shadows.join(', ');
		element.style.width = `${size}px`;
		element.style.height = `${size}px`;
		element.style.background = 'transparent';
		element.style.borderRadius = '50%';
	}

	// The liquid-glass theme hides the starfield; skip building hundreds of box-shadows for nothing.
	const starsContainer = document.querySelector('.stars-container');
	const starsVisible = Boolean(starsContainer) && getComputedStyle(starsContainer).display !== 'none';
	if (starsVisible) {
		const starDensity = window.innerWidth < 768 ? 0.55 : 1;
		createStars('stars', Math.round(320 * starDensity), 1);
		createStars('stars2', Math.round(140 * starDensity), 2);
		createStars('stars3', Math.round(50 * starDensity), 3);
		createStars('stars4', Math.round(24 * starDensity), 2);
		createStars('stars5', Math.round(10 * starDensity), 4);
	}


	function initAnimeMotion() {
		if (!hasAnime || reduceMotion) return false;
		body.classList.add('motion-ready');

		const titleLines = [...document.querySelectorAll('.world-copy .title-line')];
		const titleCharacters = [];
		titleLines.forEach(line => {
			const text = line.textContent;
			line.setAttribute('aria-label', text);
			line.textContent = '';
			[...text].forEach(character => {
				const span = document.createElement('span');
				span.className = character === ' ' ? 'title-char title-space' : 'title-char';
				span.setAttribute('aria-hidden', 'true');
				span.textContent = character === ' ' ? '\u00a0' : character;
				line.appendChild(span);
				titleCharacters.push(span);
			});
		});

		// The top bar is the same on every page: it only plays its entrance the first time the
		// site is opened in this tab, not again on every page (a placeholder keeps the timing).
		let navSeen = false;
		try {
			navSeen = sessionStorage.getItem('navEntranceSeen') === '1';
			sessionStorage.setItem('navEntranceSeen', '1');
		} catch (error) { /* storage unavailable: animate */ }
		window.anime.timeline({ easing: 'easeOutExpo' })
			.add(navSeen
				? { targets: { t: 0 }, t: 1, duration: 900 }
				: { targets: '.card-nav', translateY: [-34, 0], opacity: [0, 1], duration: 900 })
			.add({
				targets: titleCharacters,
				translateY: ['115%', '0%'],
				rotateZ: [4, 0],
				opacity: [0, 1],
				delay: window.anime.stagger(34),
				duration: 1050
			}, '-=520')
			.add({
				targets: '.hero-eyebrow, .hero-intro, .hero-actions',
				translateY: [22, 0],
				opacity: [0, 1],
				delay: window.anime.stagger(90),
				duration: 850
			}, '-=720')
			.add({
				targets: '.globe-shell',
				scale: [0.86, 1],
				rotate: ['-3deg', '0deg'],
				opacity: [0, 1],
				duration: 1250
			}, '-=1050');

		return true;
	}

	const animeRunsHeroEntrance = initAnimeMotion();

	if (hasGsap && !reduceMotion) {
		if (!animeRunsHeroEntrance) {
			document.querySelectorAll('.title-line').forEach(line => {
				if (line.parentElement?.classList.contains('title-line-mask')) return;
				const wrapper = document.createElement('span');
				wrapper.className = 'title-line-mask';
				line.parentNode.insertBefore(wrapper, line);
				wrapper.appendChild(line);
			});

			window.gsap.timeline()
				.fromTo('.title-line', { y: '120%', opacity: 0 }, {
					y: '0%', opacity: 1, duration: 1.25, stagger: 0.12, ease: 'power4.out', delay: 0.1
				})
				.fromTo('.hero-eyebrow, .hero-intro', { opacity: 0, y: 18 }, {
					opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out'
				}, '-=0.75')
				.fromTo('.hero-actions', { opacity: 0, y: 20 }, {
					opacity: 1, y: 0, duration: 0.72, ease: 'power3.out'
				}, '-=0.6')
				.fromTo('.globe-shell', { opacity: 0, scale: 0.9 }, {
					opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out'
				}, '-=1.1');
		}

		// The ambient glow stays still (see liquid-glass.css): animating it forced every glass
		// surface to re-blur each frame, which was slow on large screens.
		const orb = document.querySelector('.hero-bg-orb');
		if (orb) window.gsap.set(orb, { xPercent: -50, yPercent: -50 });

		if (window.matchMedia('(pointer: fine)').matches) {
			document.querySelectorAll('.nav-card').forEach(card => {
				card.addEventListener('pointermove', event => {
					const rect = card.getBoundingClientRect();
					const x = (event.clientX - rect.left) / rect.width - 0.5;
					const y = (event.clientY - rect.top) / rect.height - 0.5;
					window.gsap.to(card, {
						rotationY: x * 8, rotationX: -y * 8, duration: 0.35, ease: 'power2.out', transformPerspective: 1000
					});
				});
				card.addEventListener('pointerleave', () => {
					window.gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.45, ease: 'power2.out' });
				});
			});

			document.querySelectorAll('.magnetic-btn').forEach(element => {
				element.addEventListener('pointermove', event => {
					const rect = element.getBoundingClientRect();
					window.gsap.to(element, {
						x: (event.clientX - rect.left - rect.width / 2) * 0.18,
						y: (event.clientY - rect.top - rect.height / 2) * 0.18,
						duration: 0.3,
						ease: 'power2.out'
					});
				});
				element.addEventListener('pointerleave', () => {
					window.gsap.to(element, { x: 0, y: 0, duration: 0.35, ease: 'power2.out' });
				});
			});
		}
	}

	const aboutToggle = document.getElementById('about-toggle');
	const aboutHeroToggle = document.getElementById('about-hero-toggle');
	const aboutModal = document.getElementById('about-modal');
	const closeAbout = document.getElementById('close-about');
	const modalContent = aboutModal?.querySelector('.home-modal-content');
	let lastFocusedElement = null;

	function openAbout() {
		if (!aboutModal || !aboutToggle) return;
		lastFocusedElement = document.activeElement;
		aboutModal.hidden = false;
		aboutModal.setAttribute('aria-hidden', 'false');
		aboutToggle.setAttribute('aria-expanded', 'true');
		body.classList.add('modal-open');
		requestAnimationFrame(() => aboutModal.classList.add('is-open'));
		modalContent?.focus();
	}

	function closeAboutModal() {
		if (!aboutModal || aboutModal.hidden) return;
		aboutModal.classList.remove('is-open');
		aboutModal.setAttribute('aria-hidden', 'true');
		aboutToggle?.setAttribute('aria-expanded', 'false');
		body.classList.remove('modal-open');

		const finish = () => {
			aboutModal.hidden = true;
			aboutModal.removeEventListener('transitionend', finish);
			if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
		};

		if (reduceMotion) finish();
		else {
			aboutModal.addEventListener('transitionend', finish, { once: true });
			window.setTimeout(finish, 360);
		}
	}

	aboutToggle?.addEventListener('click', openAbout);
	aboutHeroToggle?.addEventListener('click', openAbout);
	closeAbout?.addEventListener('click', closeAboutModal);
	aboutModal?.addEventListener('click', event => {
		if (event.target === aboutModal) closeAboutModal();
	});

	document.addEventListener('keydown', event => {
		if (!aboutModal || aboutModal.hidden) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeAboutModal();
			return;
		}
		if (event.key !== 'Tab') return;

		const focusable = [...aboutModal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
			.filter(element => !element.hasAttribute('disabled'));
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	});
});
