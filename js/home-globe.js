(() => {
	'use strict';

	const markerData = [
		{ lat: 43.82, lng: 87.62, image: 'images/stories/anjihai/original/cover.jpg', id: 1, en: 'XINJIANG', zh: '新疆' },
		{ lat: 28.68, lng: 115.89, image: 'images/stories/sanqingshan/original/cover.jpg', id: 2, en: 'JIANGXI', zh: '江西' },
		{ lat: 22.32, lng: 114.17, image: 'images/stories/victoria-harbour/original/cover.jpg', id: 4, en: 'HONG KONG', zh: '香港' },
		{ lat: 25.04, lng: 102.71, image: 'images/stories/erhai/original/cover.jpg', id: 5, en: 'YUNNAN', zh: '云南' },
		{ lat: 3.14, lng: 101.69, image: 'images/stories/kuala-lumpur/original/cover.jpg', id: 6, en: 'KUALA LUMPUR', zh: '吉隆坡', offsetX: -32, offsetY: -16 },
		{ lat: 2.93, lng: 101.70, image: 'images/stories/putrajaya/original/cover.jpg', id: 7, en: 'PUTRAJAYA', zh: '布城', offsetX: 31, offsetY: 12 },
		{ lat: 5.41, lng: 100.33, image: 'images/stories/batu-ferringhi/original/cover.jpg', id: 8, en: 'PENANG', zh: '槟城', offsetX: -18, offsetY: 18 },
		{ lat: 1.35, lng: 103.82, image: 'images/stories/singapore/original/cover.jpg', id: 10, en: 'SINGAPORE', zh: '新加坡', offsetX: 26, offsetY: 29 },
		{ lat: 25.03, lng: 121.57, image: 'images/stories/taipei/original/cover.jpg', id: 11, en: 'TAIPEI', zh: '台北' }
	];

	// Same mapping as imageVariant() in data.js (not loaded on the home page).
	const variant = (src, size) => src.replace(/^(images\/stories\/[^/]+)\/original\/(.+)$/i, `$1/${size}/$2`);
	const mobileLite = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
	const transitionVariant = marker => variant(marker.image, mobileLite ? 'card' : 'hero');

	const heroImages = new Map();
	const heroDecoded = new Set();
	function warmHeroImage(marker) {
		const src = transitionVariant(marker);
		if (!heroImages.has(src)) {
			const img = new Image();
			img.decoding = 'async';
			img.src = src;
			heroImages.set(src, (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => { heroDecoded.add(src); }));
		}
		return heroImages.get(src);
	}

	const shell = document.getElementById('globe-shell');
	const mount = document.getElementById('globe-canvas');
	const markerLayer = document.getElementById('globe-markers');
	const fallback = document.getElementById('globe-fallback');
	if (!shell || !mount || !markerLayer) return;
	const archiveMode = shell.dataset.archive === 'true';

	const transitionOverlay = document.createElement('div');
	transitionOverlay.className = 'atlas-transition';
	transitionOverlay.hidden = true;
	transitionOverlay.setAttribute('aria-hidden', 'true');
	transitionOverlay.innerHTML = `
		<div class="atlas-transition-card">
			<div class="atlas-transition-image"><div class="atlas-transition-hires"></div></div>
			<div class="atlas-transition-wash"></div>
		</div>
	`;
	document.body.appendChild(transitionOverlay);

	const transitionCard = transitionOverlay.querySelector('.atlas-transition-card');
	const transitionImage = transitionOverlay.querySelector('.atlas-transition-image');
	const transitionHiRes = transitionOverlay.querySelector('.atlas-transition-hires');
	const transitionWash = transitionOverlay.querySelector('.atlas-transition-wash');
	// Everything that fades while the cover morphs. In full screen the globe lives outside the
	// hero (on <body>), so it — with its exit button and zoom controls — is listed explicitly;
	// otherwise the last frame before the story would still show them around the card.
	const pageChrome = () => document.querySelectorAll('.world-hero, .hub-footer, .card-nav-container, .globe-shell.is-immersive');
	let transitionAnimations = [];
	let isTransitioning = false;
	let globeFrozen = false;
	let needsRender = true;
	let rendererReady = false;
	let freezeSnapshot = null;

	// Stop all WebGL work (e.g. while the cover morphs over the globe). Without
	// preserveDrawingBuffer the canvas may be cleared once it stops drawing, so the last frame
	// is copied into a plain 2D canvas that stays on screen until rendering resumes.
	function setGlobeFrozen(frozen) {
		if (frozen === globeFrozen) return;
		globeFrozen = frozen;
		if (!rendererReady) return;
		if (frozen && !mobileLite) {
			renderer.render(scene, camera);
			const source = renderer.domElement;
			freezeSnapshot = document.createElement('canvas');
			freezeSnapshot.className = 'globe-freeze';
			freezeSnapshot.width = source.width;
			freezeSnapshot.height = source.height;
			freezeSnapshot.getContext('2d').drawImage(source, 0, 0);
			mount.appendChild(freezeSnapshot);
		} else {
			freezeSnapshot?.remove();
			freezeSnapshot = null;
			needsRender = true;
		}
	}

	// Reads the detail hero geometry from CSS (--hero-* in liquid-glass.css) via an
	// invisible probe, so the morph ends exactly where voyage.html paints its hero card.
	const heroProbe = document.createElement('div');
	heroProbe.className = 'atlas-hero-probe';
	heroProbe.setAttribute('aria-hidden', 'true');
	document.body.appendChild(heroProbe);

	function detailHeroRect() {
		const rect = heroProbe.getBoundingClientRect();
		const style = getComputedStyle(heroProbe);
		const radius = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
			.map(key => parseFloat(style[key]) || 0);
		return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius };
	}

	const radiusValue = radii => radii.map(value => `${value}px`).join(' ');

	// Geometry shared by the open morph (marker → story cover) and the return morph (back).
	// The thumbnail is the photo's centre square; the photo is mapped so that square sits on it.
	// Photo layer sized to the whole photo as the cover frames it, not to the cover box (see
	// sizeMorphPhoto in app.js): a marker-sized window shows the photo's full height, which is
	// taller than the cover's crop.
	function sizeMorphPhoto(naturalW, naturalH, rect) {
		const cover = Math.max(rect.width / naturalW, rect.height / naturalH);
		const width = naturalW * cover;
		const height = naturalH * cover;
		Object.assign(transitionImage.style, {
			inset: 'auto',
			left: `${(rect.width - width) / 2}px`,
			top: `${(rect.height - height) / 2}px`,
			width: `${width}px`,
			height: `${height}px`,
			backgroundSize: '100% 100%'
		});
	}

	function morphGeometry(button) {
		const thumbImg = button.querySelector('img');
		const thumb = (thumbImg || button).getBoundingClientRect();
		const target = detailHeroRect();
		const radius = thumb.width / 2;
		return {
			target,
			thumb: { left: thumb.left, top: thumb.top, width: thumb.width, height: thumb.height, radius: [radius, radius, radius, radius] },
			photoW: thumbImg?.naturalWidth || 3,
			photoH: thumbImg?.naturalHeight || 2
		};
	}

	// Paint the full story cover over the page (the state the story page was showing).
	function showCoverCard(marker) {
		const target = detailHeroRect();
		const markerImage = markerButtons.get(marker.id)?.querySelector('img');
		sizeMorphPhoto(markerImage?.naturalWidth || 3, markerImage?.naturalHeight || 2, target);
		Object.assign(transitionCard.style, {
			left: `${target.left}px`,
			top: `${target.top}px`,
			width: `${target.width}px`,
			height: `${target.height}px`,
			borderRadius: radiusValue(target.radius),
			clipPath: `inset(0px 0px 0px 0px round ${radiusValue(target.radius)})`
		});
		transitionImage.style.backgroundImage = `url("${variant(marker.image, 'mini')}")`;
		transitionHiRes.style.backgroundImage = `url("${transitionVariant(marker)}")`;
		transitionHiRes.style.opacity = '1';
		transitionImage.style.transform = 'none';
		transitionWash.style.opacity = '1';
		transitionOverlay.hidden = false;
		transitionOverlay.setAttribute('aria-hidden', 'false');
	}

	// Back from a story: the cover shrinks back into the marker it came from while the page
	// fades in underneath — the open morph played in reverse.
	function playReturn(marker) {
		const button = markerButtons.get(marker.id);
		isTransitioning = true;
		setGlobeFrozen(true);
		transitionAnimations.forEach(animation => animation.cancel());
		transitionAnimations = [];
		showCoverCard(marker);
		if (immersive) document.body.classList.add('globe-immersive');
		const chrome = [...pageChrome()];
		const finish = () => {
			resetAtlasTransition();
			button?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
		};

		const fadeChromeIn = (delay, duration) => chrome.map(element => element.animate(
			[{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: 'ease-out', fill: 'backwards' }
		));

		if (!button || button.classList.contains('is-hidden') || reduceMotion) {
			// Marker not on screen (or reduced motion): simply dissolve the cover.
			transitionAnimations = [
				transitionCard.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' }),
				...fadeChromeIn(0, 420)
			];
			transitionAnimations[0].finished.then(finish).catch(() => {});
			return;
		}

		button.style.opacity = '0';
		const { target, thumb, photoW, photoH } = morphGeometry(button);
		const duration = 760;
		const easing = 'cubic-bezier(0.55, 0, 0.15, 1)';
		transitionAnimations = [
			...animateCoverMorph(transitionCard, transitionImage, target, thumb, photoW, photoH, { duration, easing, fill: 'both' }),
			transitionWash.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'both' }),
			...fadeChromeIn(200, 520)
		];
		transitionAnimations[0].finished.then(finish).catch(() => {});
	}

	// ---------------------------------------------------------------------------
	// Story layer: the story page (voyage.html?embed=1) is preloaded in a full-screen frame on
	// marker hover/press and revealed in place when the morph lands. Opening and closing a
	// story never navigates away from this page, so neither direction can flash.
	// ---------------------------------------------------------------------------
	let lastOpenedMarker = null;
	let storyLayer = null;
	let storyOpen = false;
	let titleBeforeStory = document.title;

	function prepareStory(marker) {
		if (archiveMode || mobileLite) return null;
		if (storyLayer?.marker.id === marker.id) return storyLayer;
		if (storyOpen) return null;
		storyLayer?.frame.remove();
		const frame = document.createElement('iframe');
		frame.className = 'atlas-story-frame';
		frame.title = `${marker.zh} / ${marker.en}`;
		frame.setAttribute('aria-hidden', 'true');
		frame.tabIndex = -1;
		frame.src = `voyage.html?id=${marker.id}&embed=1`;
		let resolveReady;
		const layer = {
			frame,
			marker,
			isReady: false,
			title: '',
			scrollY: 0,
			ready: new Promise(resolve => { resolveReady = resolve; })
		};
		layer.resolveReady = resolveReady;
		document.body.appendChild(frame);
		storyLayer = layer;
		return layer;
	}

	window.addEventListener('message', event => {
		const layer = storyLayer;
		if (!layer || event.source !== layer.frame.contentWindow || event.data?.source !== 'voyage-embed') return;
		const { type } = event.data;
		if (type === 'ready') {
			layer.isReady = true;
			layer.title = event.data.title || layer.title;
			layer.resolveReady();
		} else if (type === 'title') {
			layer.title = event.data.title;
			if (storyOpen) document.title = layer.title;
		} else if (type === 'scroll') {
			layer.scrollY = event.data.y || 0;
		} else if (type === 'back' && storyOpen) {
			history.back(); // popstate → closeStory()
		}
	});

	function showStory(layer) {
		storyOpen = true;
		lastOpenedMarker = layer.marker;
		titleBeforeStory = document.title;
		const state = { ...(history.state || {}), atlasStory: layer.marker.id };
		try {
			history.pushState(state, '', `voyage.html?id=${layer.marker.id}`);
		} catch (error) {
			// file:// pages may not rewrite the path to another file: keep the entry, skip the URL.
			history.pushState(state, '');
		}
		if (layer.title) document.title = layer.title;
		document.body.classList.add('atlas-story-open');
		layer.frame.classList.add('is-visible');
		layer.frame.setAttribute('aria-hidden', 'false');
		layer.frame.tabIndex = 0;
		layer.frame.contentWindow?.postMessage({ type: 'atlas:activate' }, '*');
		// The frame paints the same cover underneath the morph card; drop the card a few
		// frames later (if the frame were a frame late, the identical page shows through).
		requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
			if (!storyOpen) return;
			transitionOverlay.hidden = true;
			isTransitioning = false;
			layer.frame.focus({ preventScroll: true });
		})));
	}

	function closeStory() {
		if (!storyOpen || !storyLayer) return;
		storyOpen = false;
		const layer = storyLayer;
		storyLayer = null;
		document.title = titleBeforeStory;
		document.body.classList.remove('atlas-story-open');
		if (layer.scrollY > 40) {
			// Scrolled into the story: the cover is off screen, so just dissolve the story.
			resetAtlasTransition();
			layer.frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' })
				.finished.then(() => layer.frame.remove()).catch(() => layer.frame.remove());
			return;
		}
		// Cover still in view: put the morph card back on top, drop the frame underneath and
		// shrink the cover into its marker.
		playReturn(layer.marker);
		requestAnimationFrame(() => layer.frame.remove());
	}

	function resetAtlasTransition() {
		transitionAnimations.forEach(animation => animation.cancel());
		transitionAnimations = [];
		isTransitioning = false;
		setGlobeFrozen(false);
		document.body.classList.remove('atlas-transitioning');
		if (immersive) document.body.classList.add('globe-immersive');
		transitionOverlay.hidden = true;
		transitionOverlay.setAttribute('aria-hidden', 'true');
		transitionCard.removeAttribute('style');
		transitionWash.removeAttribute('style');
		transitionImage.removeAttribute('style');
		transitionHiRes.removeAttribute('style');
		markerLayer.querySelectorAll('.globe-marker').forEach(marker => marker.style.removeProperty('opacity'));
	}

	function navigateToDetail(marker) {
		try {
			sessionStorage.setItem('atlasHandoff', JSON.stringify({ id: marker.id, image: transitionVariant(marker), time: Date.now() }));
			sessionStorage.setItem('atlasReturn', JSON.stringify({ id: marker.id, time: Date.now() }));
		} catch (error) { /* the detail page then simply plays its own entrance */ }
		window.location.assign(`voyage.html?id=${marker.id}&from=atlas`);
	}

	function openMarker(marker, button) {
		if (isTransitioning) return;
		if (archiveMode) {
			window.dispatchEvent(new CustomEvent('site:globe-story', { detail: { id: marker.id, source: button } }));
			return;
		}
		if (reduceMotion || typeof transitionCard.animate !== 'function') {
			window.location.assign(`voyage.html?id=${marker.id}`);
			return;
		}

		// Fast start, long soft landing: the card is clearly growing from the first frames,
		// so the page never sits dark while waiting for it.
		const easing = 'cubic-bezier(0.3, 0, 0.12, 1)';
		const duration = mobileLite ? 360 : 900;
		isTransitioning = true;
		setGlobeFrozen(true);
		lastOpenedMarker = marker;
		const heroReady = warmHeroImage(marker);
		const { target, thumb, photoW, photoH } = morphGeometry(button);
		Object.assign(transitionCard.style, {
			left: `${target.left}px`,
			top: `${target.top}px`,
			width: `${target.width}px`,
			height: `${target.height}px`,
			borderRadius: radiusValue(target.radius)
		});
		// Thumbnail underneath, sharp cover on top: shown at once if it is already decoded,
		// otherwise cross-faded in when ready instead of popping from blurry to sharp.
		transitionImage.style.backgroundImage = `url("${variant(marker.image, 'mini')}")`;
		transitionHiRes.style.backgroundImage = `url("${transitionVariant(marker)}")`;
		transitionHiRes.style.opacity = heroDecoded.has(transitionVariant(marker)) ? '1' : '0';
		heroReady.then(() => {
			if (isTransitioning && transitionHiRes.style.opacity !== '1') {
				transitionHiRes.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
				transitionHiRes.style.opacity = '1';
			}
		});

		// Paint the start state inline before the layer becomes visible, so no frame can show
		// the full-size card even if the animations start a frame late.
		const photoAnimations = animateCoverMorph(transitionCard, transitionImage, thumb, target, photoW, photoH, { duration, easing, fill: 'both' });
		transitionWash.style.opacity = '0';
		transitionOverlay.hidden = false;
		transitionOverlay.setAttribute('aria-hidden', 'false');
		document.body.classList.add('atlas-transitioning');
		// The frosted full-screen backdrop dissolves to the plain ambient background that the
		// story page starts on (CSS transition on body::after).
		document.body.classList.remove('globe-immersive');
		button.style.opacity = '0';

		transitionAnimations = [
			...photoAnimations,
			transitionWash.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], { duration, easing: 'linear', fill: 'both' }),
			// The page fades only while the card is already covering most of the view.
			...[...pageChrome()].map(element => element.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: mobileLite ? 240 : 560,
				delay: mobileLite ? 80 : 220,
				easing: 'ease-in-out',
				fill: 'forwards'
			}))
		];

		// When the morph lands, reveal the story that was preloaded in the story layer (same
		// document, so there is no navigation gap to flash). If it isn't ready in time, fall
		// back to a normal page navigation.
		const layer = prepareStory(marker);
		transitionAnimations[0].finished
			.then(() => {
				if (mobileLite) {
					navigateToDetail(marker);
					return null;
				}
				return Promise.race([
					layer ? layer.ready : heroReady,
					new Promise(resolve => setTimeout(resolve, layer ? 2500 : 600))
				]);
			})
			.then(() => {
				if (mobileLite || !isTransitioning) return;
				if (layer?.isReady) showStory(layer);
				else navigateToDetail(marker);
			})
			.catch(error => {
				// Cancelled by a reset is fine; anything else must never leave the page half-faded.
				if (error?.name === 'AbortError' || !isTransitioning || storyOpen) return;
				console.error(error);
				navigateToDetail(marker);
			});
	}

	window.addEventListener('pageshow', event => {
		// Only when restored from the back/forward cache — a late `load` must not cancel a running morph.
		if (!event.persisted) return;
		try { sessionStorage.removeItem('atlasReturn'); } catch (error) { /* ignore */ }
		if (isTransitioning && lastOpenedMarker) playReturn(lastOpenedMarker);
		else resetAtlasTransition();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && isTransitioning) resetAtlasTransition();
	});

	// The globe stays invisible (index.html ships with .is-loading) until its satellite texture
	// is on the GPU, then fades in — never a flat blue sphere first (e.g. when Back reloads).
	shell.classList.add('is-loading');
	let resolveGlobeReady;
	const globeReady = new Promise(resolve => { resolveGlobeReady = resolve; });
	function markGlobeReady() {
		if (!shell.classList.contains('is-loading')) return;
		shell.classList.remove('is-loading');
		// The archive loads this globe lazily, so its entrance starts when the
		// texture is painted, using the home page's scale, rotation and duration.
		if (archiveMode && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof shell.animate === 'function') {
			shell.animate([
				{ opacity: 0, transform: 'scale(0.86) rotate(-3deg)' },
				{ opacity: 1, transform: 'scale(1) rotate(0deg)' }
			], { duration: 1250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
		}
		resolveGlobeReady();
	}

	function showFallback() {
		shell.classList.add('is-fallback');
		if (fallback) fallback.hidden = false;
		mount.hidden = true;
		markerLayer.hidden = true;
		markGlobeReady();
	}

	if (typeof window.THREE === 'undefined') {
		showFallback();
		return;
	}

	const THREE = window.THREE;
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let renderer;

	try {
		renderer = new THREE.WebGLRenderer({ antialias: !mobileLite, alpha: true, powerPreference: 'high-performance' });
	} catch (error) {
		showFallback();
		return;
	}

	const MAX_RENDER_PIXELS = mobileLite ? 9e5 : 2.6e6;
	renderer.setClearColor(0x000000, 0);
	renderer.outputEncoding = THREE.sRGBEncoding;
	mount.appendChild(renderer.domElement);
	rendererReady = true;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
	camera.position.set(0, 0, 7.25);
	const BASE_FOV = 37;
	let tanHalfFov = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));

	const globeGroup = new THREE.Group();
	globeGroup.rotation.set(-0.09, Math.PI - 0.18, 0.02);
	scene.add(globeGroup);

	const radius = 2;
	const sphereGeometry = new THREE.SphereGeometry(radius, mobileLite ? 48 : 72, mobileLite ? 32 : 72);
	const earthMaterial = new THREE.MeshStandardMaterial({
		color: 0x31536b,
		roughness: 0.82,
		metalness: 0.04
	});
	const earth = new THREE.Mesh(sphereGeometry, earthMaterial);
	globeGroup.add(earth);

	// Textures are hosted with the site (fast, cached, no third-party dependency). A page opened
	// from file:// can't use local images in WebGL, so it falls back to the CDN copy.
	const textureLoader = new THREE.TextureLoader();
	textureLoader.setCrossOrigin('anonymous');
	const CDN = 'https://unpkg.com/three-globe@2.31.0/example/img/';
	function loadTexture(file, onLoad, onError = () => {}) {
		// Decode the (4096px) image off the main thread before it is used, so its arrival can't
		// stall an animation that happens to be running.
		const decodeThen = texture => {
			const image = texture.image;
			const decoded = image?.decode ? image.decode().catch(() => {}) : Promise.resolve();
			decoded.then(() => onLoad(texture));
		};
		textureLoader.load(`images/globe/${file}`, decodeThen, undefined, () => {
			textureLoader.load(CDN + file, decodeThen, undefined, onError);
		});
	}

	loadTexture(
		'earth-blue-marble.jpg',
		texture => {
			texture.encoding = THREE.sRGBEncoding;
			earthMaterial.map = texture;
			earthMaterial.color.setHex(0xffffff);
			earthMaterial.needsUpdate = true;
			needsRender = true;
			// Two frames: upload the texture and draw it once before fading the globe in.
			requestAnimationFrame(() => requestAnimationFrame(markGlobeReady));
		},
		markGlobeReady // no texture at all: show the plain globe rather than nothing
	);
	if (!mobileLite) loadTexture('earth-topology.png', texture => {
		earthMaterial.bumpMap = texture;
		earthMaterial.bumpScale = 0.09;
		earthMaterial.needsUpdate = true;
		needsRender = true;
	});
	// The plain (untextured) globe is only ever shown if the texture definitively fails to load
	// (onError above) — never as a timeout, which used to reveal a flat blue sphere.

	const wireframe = new THREE.Mesh(
		new THREE.SphereGeometry(radius * 1.004, 36, 18),
		new THREE.MeshBasicMaterial({ color: 0x8bc9eb, wireframe: true, transparent: true, opacity: 0.035 })
	);
	globeGroup.add(wireframe);

	scene.add(new THREE.AmbientLight(0xa6cde5, 0.68));
	const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
	keyLight.position.set(5, 3, 6);
	scene.add(keyLight);
	const rimLight = new THREE.DirectionalLight(0x4a9ed0, 0.58);
	rimLight.position.set(-4, 1, -3);
	scene.add(rimLight);

	function latLngToVector3(lat, lng, distance) {
		const phi = (90 - lat) * Math.PI / 180;
		const theta = (lng + 180) * Math.PI / 180;
		return new THREE.Vector3(
			-(distance * Math.sin(phi) * Math.cos(theta)),
			distance * Math.cos(phi),
			distance * Math.sin(phi) * Math.sin(theta)
		);
	}

	const markerObjects = [];
	const markerButtons = new Map();
	const markerPoints = [];
	const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb9e6ff, transparent: true, opacity: 0.62 });
	const pointGeometry = new THREE.SphereGeometry(0.035, 12, 12);
	const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xe5f6ff });

	markerData.forEach(marker => {
		const direction = latLngToVector3(marker.lat, marker.lng, 1);
		const surface = direction.clone().multiplyScalar(radius * 1.006);
		const top = direction.clone().multiplyScalar(radius * 1.14);
		const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([surface, top]), lineMaterial);
		const point = new THREE.Mesh(pointGeometry, pointMaterial);
		point.position.copy(surface);
		const anchor = new THREE.Object3D();
		anchor.position.copy(top);
		globeGroup.add(line, point, anchor);
		markerPoints.push({ direction, line, point, anchor });

		const button = document.createElement('button');
		button.className = 'globe-marker is-hidden';
		button.type = 'button';
		button.setAttribute('aria-label', `${marker.zh} / ${marker.en}`);
		button.innerHTML = `<img src="${variant(marker.image, 'mini')}" alt="" draggable="false"><span class="marker-label-en">${marker.en}</span><span class="marker-label-zh">${marker.zh}</span>`;
		const warm = () => { warmHeroImage(marker); if (!mobileLite) prepareStory(marker); };
		button.addEventListener('pointerenter', warm);
		button.addEventListener('focus', warm);
		button.addEventListener('pointerdown', warm);
		button.addEventListener('click', () => openMarker(marker, button));
		markerLayer.appendChild(button);
		markerButtons.set(marker.id, button);
		markerObjects.push({ anchor, button, offsetX: marker.offsetX || 0, offsetY: marker.offsetY || 0 });
	});

	function syncMarkerLanguage(lang) {
		const isEnglish = lang === 'en';
		markerLayer.querySelectorAll('.marker-label-en').forEach(label => { label.hidden = !isEnglish; });
		markerLayer.querySelectorAll('.marker-label-zh').forEach(label => { label.hidden = isEnglish; });
	}

	syncMarkerLanguage(document.body.classList.contains('lang-en') ? 'en' : 'zh');
	window.addEventListener('site:languagechange', event => syncMarkerLanguage(event.detail.lang));

	let width = 1;
	let height = 1;
	function resize() {
		width = Math.max(1, shell.clientWidth);
		height = Math.max(1, shell.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7, Math.sqrt(MAX_RENDER_PIXELS / (width * height))));
		renderer.setSize(width, height, false);
		needsRender = true;
		camera.aspect = width / height;
		// Fit the globe to the shorter side: on a portrait (full-screen phone) view, widen the
		// vertical FOV so the whole globe still fits across the width.
		const baseTan = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
		tanHalfFov = camera.aspect < 1 ? baseTan / camera.aspect : baseTan;
		camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanHalfFov));
		camera.updateProjectionMatrix();
	}

	resize();
	if ('ResizeObserver' in window) new ResizeObserver(resize).observe(shell);
	else window.addEventListener('resize', resize, { passive: true });

	// ---------------------------------------------------------------------------
	// Interaction: free drag with inertia, wheel / pinch / button zoom, slow auto-spin.
	// ---------------------------------------------------------------------------
	const MIN_DISTANCE = 3.64;   // closest zoom ≈ 3.2× (the 4096px texture stays sharp)
	const MAX_DISTANCE = 7.25;   // default, fully framed
	const AUTO_SPIN = 0.00042;   // rad per frame ≈ one turn every ~4 minutes
	const canvas = renderer.domElement;
	const zoomControls = shell.querySelector('.globe-controls');

	let targetRotationX = globeGroup.rotation.x;
	let targetRotationY = globeGroup.rotation.y;
	let targetDistance = MAX_DISTANCE;
	let velocityX = 0;
	let velocityY = 0;
	let spin = AUTO_SPIN;
	let lastInteraction = 0;
	const pointers = new Map();
	let pinchStart = null;
	let dragging = false;
	let lastMoveTime = 0;

	const clampDistance = value => Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, value));
	const isZoomed = () => targetDistance < MAX_DISTANCE - 0.05;
	// Closer in → finer rotation per pixel.
	const touchInteraction = () => { lastInteraction = performance.now(); };

	// ---------------------------------------------------------------------------
	// Immersive mode: zooming in expands the globe from its spot on the page to the
	// full screen (FLIP: the first frame matches the in-page globe exactly).
	// ---------------------------------------------------------------------------
	const exitButton = shell.querySelector('.globe-exit');
	const immersiveEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
	let immersive = false;
	let placeholder = null;
	let immersiveAnimation = null;

	// Transform that maps the full-screen shell back onto a page rect. The globe's size follows
	// the shorter side of the canvas, so a uniform scale of rect / min(viewport) lines it up.
	function flipFrom(rect) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const scale = rect.height / Math.min(vw, vh);
		const dx = rect.left + rect.width / 2 - vw / 2;
		const dy = rect.top + rect.height / 2 - vh / 2;
		return `translate(${dx}px, ${dy}px) scale(${scale})`;
	}

	let exitZoomFrom = null; // camera distance when an exit started (null = not exiting)
	let wheelCooldownUntil = 0; // swallow wheel momentum right after an exit

	// Full screen has its own history entry: Back / the phone's back gesture leaves the map
	// instead of the site, and returning from a story opened in the map lands in the map again.
	let suppressNextPop = false;

	function enterImmersive({ instant = false, fromHistory = false } = {}) {
		if (immersive || (globeFrozen && !instant)) return;
		immersive = true;
		if (!fromHistory && !history.state?.atlasImmersive) {
			history.pushState({ ...(history.state || {}), atlasImmersive: true }, '');
		}
		const wasExiting = Boolean(placeholder);
		// Interrupting an exit: continue from wherever the shrink currently is.
		const from = wasExiting ? getComputedStyle(shell).transform : flipFrom(shell.getBoundingClientRect());
		immersiveAnimation?.cancel();
		exitZoomFrom = null;
		if (!wasExiting) {
			// An empty element with the shell's own class keeps its exact (responsive) size.
			placeholder = document.createElement('div');
			placeholder.className = 'globe-shell globe-placeholder';
			placeholder.setAttribute('aria-hidden', 'true');
			shell.after(placeholder);
			// Lift the globe out of the hero's stacking context so it can sit above the backdrop.
			document.body.appendChild(shell);
		}
		document.body.classList.add('globe-immersive', 'globe-scroll-lock');
		shell.classList.remove('is-leaving');
		shell.classList.add('is-immersive');
		resize();
		immersiveAnimation = instant ? null : shell.animate(
			[{ transform: from === 'none' ? 'none' : from }, { transform: 'none' }],
			{ duration: 620, easing: immersiveEase }
		);
		exitButton?.removeAttribute('hidden');
		if (!instant) requestAnimationFrame(() => exitButton?.focus({ preventScroll: true }));
	}

	function exitImmersive({ fromHistory = false } = {}) {
		if (!immersive || !placeholder) return;
		immersive = false;
		if (!fromHistory && history.state?.atlasImmersive) {
			suppressNextPop = true; // the exit is already running; just drop the entry
			history.back();
		}
		velocityX = 0;
		velocityY = 0;
		// The camera zooms out in lock-step with the shrink (see animate()), so the globe
		// lands at exactly its page size instead of shrinking zoomed-in and then popping.
		exitZoomFrom = camera.position.z;
		targetDistance = MAX_DISTANCE;
		document.body.classList.remove('globe-immersive');
		shell.classList.add('is-leaving');
		immersiveAnimation?.cancel();
		const animation = shell.animate(
			[{ transform: 'none' }, { transform: flipFrom(placeholder.getBoundingClientRect()) }],
			{ duration: 600, easing: immersiveEase, fill: 'forwards' }
		);
		immersiveAnimation = animation;
		animation.finished.then(() => {
			if (immersiveAnimation !== animation) return; // re-entered meanwhile
			exitZoomFrom = null;
			// Page scrolling stays locked until the globe has landed, so the placeholder it is
			// flying to can't move underneath it.
			document.body.classList.remove('globe-scroll-lock');
			wheelCooldownUntil = performance.now() + 400;
			camera.position.z = MAX_DISTANCE;
			shell.classList.remove('is-immersive', 'is-leaving');
			placeholder.replaceWith(shell);
			placeholder = null;
			animation.cancel();
			resize();
			setZoom(MAX_DISTANCE);
		}).catch(() => { /* cancelled by a re-enter */ });
		exitButton?.setAttribute('hidden', '');
		setZoom(MAX_DISTANCE);
	}

	function exitZoomProgress() {
		if (exitZoomFrom === null || !immersiveAnimation) return null;
		const progress = immersiveAnimation.effect?.getComputedTiming().progress;
		return progress == null ? 1 : progress;
	}

	exitButton?.addEventListener('click', () => exitImmersive());
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && immersive && !isTransitioning && !storyOpen) exitImmersive();
	});
	window.addEventListener('popstate', () => {
		// Leaving the story entry (Back, the story's own back button, or Esc inside it).
		if (storyOpen && history.state?.atlasStory == null) {
			closeStory();
			return;
		}
		// Forward into a story entry that is no longer open: load it as a normal page.
		if (!storyOpen && history.state?.atlasStory != null) {
			window.location.replace(`voyage.html?id=${history.state.atlasStory}`);
			return;
		}
		if (suppressNextPop) {
			suppressNextPop = false;
			return;
		}
		if (isTransitioning) return;
		const wantsImmersive = Boolean(history.state?.atlasImmersive);
		if (wantsImmersive && !immersive) enterImmersive({ fromHistory: true });
		else if (!wantsImmersive && immersive) exitImmersive({ fromHistory: true });
	});

	function setZoom(distance) {
		targetDistance = clampDistance(distance);
		touchInteraction();
		if (isZoomed()) enterImmersive();
		// Full screen, the canvas owns every gesture; on the page it only takes horizontal
		// drags so vertical swipes still scroll the page on touch.
		mount.style.touchAction = immersive ? 'none' : 'pan-y';
		shell.classList.toggle('is-zoomed', isZoomed());
		zoomControls?.querySelector('[data-zoom="in"]')?.toggleAttribute('disabled', targetDistance <= MIN_DISTANCE + 0.01);
		zoomControls?.querySelector('[data-zoom="out"]')?.toggleAttribute('disabled', !isZoomed() && !immersive);
		zoomControls?.querySelector('[data-zoom="reset"]')?.toggleAttribute('disabled', !isZoomed());
	}

	mount.style.touchAction = 'pan-y';

	// Rotation (x, y) that brings a point of the globe (local unit vector) to the centre of the view.
	function rotationToCentre(local) {
		const horizontal = Math.hypot(local.x, local.z);
		let y = Math.atan2(-local.x, local.z);
		y += Math.PI * 2 * Math.round((targetRotationY - y) / (Math.PI * 2));
		return { x: Math.max(-1.3, Math.min(1.3, Math.atan2(local.y, horizontal))), y };
	}

	const raycaster = new THREE.Raycaster();
	const pointerNdc = new THREE.Vector2();
	function globePointAt(clientX, clientY) {
		const rect = canvas.getBoundingClientRect();
		pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
		raycaster.setFromCamera(pointerNdc, camera);
		const hit = raycaster.intersectObject(earth, false)[0];
		return hit ? globeGroup.worldToLocal(hit.point.clone()).normalize() : null;
	}

	// Zoom while drifting the point under the cursor toward the centre, in proportion to the
	// zoom gained — so you zoom *into* the place you're pointing at, not the globe's middle.
	function zoomAt(clientX, clientY, distance, pull = 1) {
		// Sample the point under the cursor before setZoom, which may switch to full screen.
		const local = clientX == null ? null : globePointAt(clientX, clientY);
		const previous = targetDistance;
		setZoom(distance);
		const gained = (previous - targetDistance) / (previous - radius);
		if (gained <= 0 || !local) return;
		const centre = rotationToCentre(local);
		const amount = Math.min(1, gained * 1.15 * pull);
		targetRotationX += (centre.x - targetRotationX) * amount;
		targetRotationY += (centre.y - targetRotationY) * amount;
		velocityX = 0;
		velocityY = 0;
	}

	canvas.addEventListener('pointerdown', event => {
		if (globeFrozen) return;
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		canvas.setPointerCapture(event.pointerId);
		velocityX = 0;
		velocityY = 0;
		touchInteraction();
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinchStart = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: targetDistance };
			dragging = false;
		} else {
			dragging = true;
		}
	});

	canvas.addEventListener('pointermove', event => {
		const previous = pointers.get(event.pointerId);
		if (!previous) return;
		const current = { x: event.clientX, y: event.clientY };
		pointers.set(event.pointerId, current);
		touchInteraction();

		if (pointers.size >= 2 && pinchStart) {
			const [a, b] = [...pointers.values()];
			const distance = Math.hypot(a.x - b.x, a.y - b.y);
			if (distance > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinchStart.zoom * pinchStart.distance / distance);
			return;
		}
		if (!dragging) return;
		// 1:1 grab — the surface at the centre of the view moves exactly as far as the finger.
		// One radian of rotation moves that point f·R / (d − R) pixels (f = focal length in px).
		const focalPx = (height / 2) / tanHalfFov;
		const perPixel = (camera.position.z - radius) / (focalPx * radius);
		const dx = (current.x - previous.x) * perPixel;
		// On the page, vertical touch movement belongs to page scrolling (pan-y): don't tilt the
		// globe during the few pixels before the browser takes the gesture over.
		const verticalIsScroll = event.pointerType === 'touch' && !immersive;
		const dy = verticalIsScroll ? 0 : (current.y - previous.y) * perPixel;
		targetRotationY += dx;
		targetRotationX = Math.max(-1.3, Math.min(1.3, targetRotationX + dy));
		velocityY = dx;
		velocityX = dy;
		lastMoveTime = performance.now();
	});

	const releasePointer = event => {
		const wasPinching = Boolean(pinchStart);
		pointers.delete(event.pointerId);
		if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
		if (pointers.size < 2) pinchStart = null;
		if (pointers.size === 0) dragging = false;
		// No fling if the finger had already stopped before lifting, or a pinch just ended.
		if (event.type === 'pointercancel' || wasPinching || performance.now() - lastMoveTime > 60) { velocityX = 0; velocityY = 0; }
		touchInteraction();
	};
	canvas.addEventListener('pointerup', releasePointer);
	canvas.addEventListener('pointercancel', releasePointer);

	// Wheel / trackpad pinch (ctrlKey). Zooming out past the default lets the page scroll.
	// While the globe flies back to the page (and right after), the rest of a fast wheel spin
	// must not scroll the page out from under it — wherever the cursor is by then. The same
	// continuous spin keeps being absorbed; a fresh scroll after a 300 ms pause works normally.
	window.addEventListener('wheel', event => {
		const exiting = Boolean(placeholder) && !immersive;
		// When the input happened, not when it got processed: events queued behind a busy
		// frame (e.g. the canvas resize on landing) still count as the same spin.
		const now = event.timeStamp || performance.now();
		if (!exiting && (immersive || now >= wheelCooldownUntil)) return;
		event.preventDefault();
		wheelCooldownUntil = Math.max(wheelCooldownUntil, now + 300);
	}, { passive: false, capture: true });

	// On the whole globe area (markers included), so pointing at a label and scrolling still zooms.
	shell.addEventListener('wheel', event => {
		if (event.target.closest('.globe-controls')) return;
		if (event.defaultPrevented) return; // absorbed by the page-level guard below
		if (globeFrozen) return;
		const zoomingOut = event.deltaY > 0;
		if (zoomingOut && !isZoomed()) {
			if (immersive) {
				event.preventDefault();
				if (Math.abs(camera.position.z - MAX_DISTANCE) < 0.05) exitImmersive();
			}
			return;
		}
		event.preventDefault();
		const factor = Math.exp(event.deltaY * (event.ctrlKey ? 0.012 : 0.0016));
		zoomAt(event.clientX, event.clientY, targetDistance * factor);
	}, { passive: false });

	canvas.addEventListener('dblclick', event => {
		if (globeFrozen) return;
		if (isZoomed()) setZoom(MAX_DISTANCE);
		else zoomAt(event.clientX, event.clientY, targetDistance * 0.62, 2);
	});

	zoomControls?.addEventListener('click', event => {
		const action = event.target.closest('[data-zoom]')?.dataset.zoom;
		if (action === 'in') setZoom(targetDistance * 0.72);
		if (action === 'out') {
			if (!isZoomed() && immersive) exitImmersive();
			else setZoom(targetDistance / 0.72);
		}
		if (action === 'reset') {
			setZoom(MAX_DISTANCE);
			targetRotationX = -0.09;
		}
	});

	setZoom(MAX_DISTANCE);

	// Coming back to a page that was not kept in the back/forward cache: restore the full-screen
	// map if that is where the user was, turn the globe to the story they opened and play the
	// return morph from its cover.
	const navigationType = performance.getEntriesByType?.('navigation')?.[0]?.type;
	if (history.state?.atlasImmersive) enterImmersive({ instant: true, fromHistory: true });
	(() => {
		if (archiveMode) return;
		let pending = null;
		try {
			pending = JSON.parse(sessionStorage.getItem('atlasReturn') || 'null');
			sessionStorage.removeItem('atlasReturn');
		} catch (error) { /* ignore */ }
		if (navigationType !== 'back_forward' || !pending || Date.now() - pending.time > 30 * 60 * 1000) return;
		const marker = markerData.find(item => item.id === pending.id);
		if (!marker) return;
		const local = latLngToVector3(marker.lat, marker.lng, 1);
		const centre = rotationToCentre(local);
		targetRotationX = globeGroup.rotation.x = centre.x * 0.85;
		targetRotationY = globeGroup.rotation.y = centre.y;
		spin = 0;
		isTransitioning = true;
		showCoverCard(marker);
		// Shrink into the marker only once the globe is visible (and its markers are placed).
		Promise.race([globeReady, new Promise(resolve => setTimeout(resolve, 2500))]).then(() => {
			requestAnimationFrame(() => requestAnimationFrame(() => playReturn(marker)));
		});
	})();

	if (archiveMode) {
		window.addEventListener('site:archive-view', event => {
			setGlobeFrozen(event.detail.isDetail);
			if (immersive) {
				document.body.classList.toggle('globe-immersive', !event.detail.isDetail);
				document.body.classList.toggle('globe-scroll-lock', !event.detail.isDetail);
			}
		});
	}

	const projected = new THREE.Vector3();
	const worldPosition = new THREE.Vector3();
	const cameraDirection = new THREE.Vector3(0, 0, 1);
	let pageVisible = true;

	if ('IntersectionObserver' in window) {
		new IntersectionObserver(entries => {
			pageVisible = entries[0]?.isIntersecting ?? true;
		}, { rootMargin: '120px' }).observe(shell);
	}

	// Lens: the visible disc follows the globe's real silhouette until it fills the frame,
	// then the surface keeps magnifying inside a fixed, softly shaded circle.
	let lensRadius = 0;
	let lastZoomKey = '';
	function updateZoomVisuals() {
		const distance = camera.position.z;
		const silhouette = Math.tan(Math.asin(radius / distance)) / tanHalfFov * (height / 2);
		const maxLens = immersive ? Math.hypot(width, height) / 2 + 4 : Math.min(width, height) / 2;
		lensRadius = Math.min(silhouette + 2, maxLens);
		const overflow = Math.max(0, Math.min(1, (silhouette - maxLens) / (maxLens * 0.35)));
		const key = `${lensRadius.toFixed(1)}|${overflow.toFixed(2)}`;
		if (key !== lastZoomKey) {
			lastZoomKey = key;
			shell.style.setProperty('--lens', `${lensRadius.toFixed(1)}px`);
			shell.style.setProperty('--lens-feather', `${(1 + overflow * 9).toFixed(1)}px`);
			shell.style.setProperty('--lens-shade', overflow.toFixed(2));
		}

		// Dots and stalks keep their on-screen size instead of ballooning with the zoom.
		const scale = (distance - radius) / (MAX_DISTANCE - radius);
		markerPoints.forEach(({ direction, line, point, anchor }) => {
			point.scale.setScalar(scale);
			anchor.position.copy(direction).multiplyScalar(radius * (1 + 0.14 * scale));
			const positions = line.geometry.attributes.position;
			positions.setXYZ(1, anchor.position.x, anchor.position.y, anchor.position.z);
			positions.needsUpdate = true;
		});
	}

	function updateMarkers() {
		globeGroup.updateMatrixWorld(true);
		markerObjects.forEach(({ anchor, button, offsetX, offsetY }) => {
			anchor.getWorldPosition(worldPosition);
			// Visible cap shrinks as the camera moves closer (horizon at radius / distance).
			const facingCamera = worldPosition.clone().normalize().dot(cameraDirection) > 0.12;
			projected.copy(worldPosition).project(camera);
			const onScreen = Math.abs(projected.x) < 1.08 && Math.abs(projected.y) < 1.08 && projected.z < 1;
			const x = (projected.x * 0.5 + 0.5) * width;
			const y = (-projected.y * 0.5 + 0.5) * height;
			const insideLens = Math.hypot(x - width / 2, y - height / 2) < lensRadius - 8;
			button.classList.toggle('is-hidden', !facingCamera || !onScreen || !insideLens);
			button.style.left = `${x + offsetX}px`;
			button.style.top = `${y + offsetY}px`;
		});
	}

	let lastRenderState = '';

	function animate() {
		requestAnimationFrame(animate);
		if (!pageVisible) return;
		// While the card morphs the globe is hidden behind it: stop WebGL work entirely so
		// every frame goes to the transition.
		if (globeFrozen) return;
		const idle = pointers.size === 0;
		// Inertia after a fling.
		if (idle && (Math.abs(velocityX) > 0.00002 || Math.abs(velocityY) > 0.00002)) {
			targetRotationY += velocityY;
			targetRotationX = Math.max(-1.3, Math.min(1.3, targetRotationX + velocityX));
			velocityX *= 0.86;
			velocityY *= 0.86;
		}
		// Slow auto-spin: paused while the user is exploring or zoomed in, then eased back in.
		const resting = idle && !immersive && !isZoomed() && performance.now() - lastInteraction > 3000;
		spin += ((resting && !reduceMotion ? AUTO_SPIN : 0) - spin) * 0.02;
		targetRotationY += spin;
		globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.1;
		globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.1;
		const exitProgress = exitZoomProgress();
		if (exitProgress !== null) camera.position.z = exitZoomFrom + (MAX_DISTANCE - exitZoomFrom) * exitProgress;
		else camera.position.z += (targetDistance - camera.position.z) * 0.12;
		// Skip the frame entirely when nothing moved (zoomed-in or full-screen globe at rest).
		const state = `${globeGroup.rotation.x.toFixed(5)}|${globeGroup.rotation.y.toFixed(5)}|${camera.position.z.toFixed(4)}`;
		if (!needsRender && state === lastRenderState) return;
		lastRenderState = state;
		needsRender = false;
		updateZoomVisuals();
		updateMarkers();
		renderer.render(scene, camera);
	}

	animate();
})();
