document.addEventListener('DOMContentLoaded', () => {
	const body = document.body;
	const langToggle = document.getElementById('lang-toggle');
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const hasGsap = typeof window.gsap !== 'undefined';

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

	const starDensity = window.innerWidth < 768 ? 0.55 : 1;
	createStars('stars', Math.round(320 * starDensity), 1);
	createStars('stars2', Math.round(140 * starDensity), 2);
	createStars('stars3', Math.round(50 * starDensity), 3);
	createStars('stars4', Math.round(24 * starDensity), 2);
	createStars('stars5', Math.round(10 * starDensity), 4);

	if (hasGsap && !reduceMotion) {
		document.querySelectorAll('.title-line').forEach(line => {
			if (line.parentElement?.classList.contains('title-line-mask')) return;
			const wrapper = document.createElement('span');
			wrapper.className = 'title-line-mask';
			line.parentNode.insertBefore(wrapper, line);
			wrapper.appendChild(line);
		});

		const timeline = window.gsap.timeline();
		timeline
			.fromTo('.title-line', { y: '120%', opacity: 0 }, {
				y: '0%', opacity: 1, duration: 1.25, stagger: 0.12, ease: 'power4.out', delay: 0.1
			})
			.fromTo('.hero-subtitle', { opacity: 0, y: 18 }, {
				opacity: 1, y: 0, duration: 0.9, ease: 'power3.out'
			}, '-=0.75')
			.fromTo('.nav-card', { opacity: 0, y: 24 }, {
				opacity: 1, y: 0, duration: 0.85, stagger: 0.1, ease: 'power3.out'
			}, '-=0.6')
			.fromTo('.hub-footer', { opacity: 0, y: 12 }, {
				opacity: 1, y: 0, duration: 0.7, ease: 'power3.out'
			}, '-=0.55');

		const orb = document.querySelector('.hero-bg-orb');
		if (orb) {
			window.gsap.set(orb, { xPercent: -50, yPercent: -50 });
			window.gsap.to(orb, {
				scale: 1.14, opacity: 1, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut'
			});

			if (window.matchMedia('(pointer: fine)').matches) {
				document.addEventListener('pointermove', event => {
					const x = (event.clientX / window.innerWidth - 0.5) * 34;
					const y = (event.clientY / window.innerHeight - 0.5) * 34;
					window.gsap.to(orb, { xPercent: -50 + x, yPercent: -50 + y, duration: 2.4, ease: 'power2.out' });
					window.gsap.to('.stars-container', { xPercent: -x * 0.1, yPercent: -y * 0.1, duration: 2.4, ease: 'power2.out' });
				}, { passive: true });
			}
		}

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
