(() => {
    'use strict';
    const shell = document.getElementById('globe-shell');
    const gallery = document.getElementById('gallery-view');
    if (!shell || !gallery) return;
    let started = false;
    const loadScript = src => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
    async function start() {
        // Direct story links and preloaded story frames do not need another globe.
        if (started || getComputedStyle(gallery).display === 'none') return;
        started = true;
        try {
            if (!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
            await loadScript('js/home-globe.js');
        } catch (error) {
            shell.classList.remove('is-loading');
            shell.classList.add('is-fallback');
            document.getElementById('globe-fallback').hidden = false;
        }
    }
    window.addEventListener('site:archive-view', event => {
        if (!event.detail.isDetail) start();
    });
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
})();
