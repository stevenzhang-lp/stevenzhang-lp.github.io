(() => {
    'use strict';
    const root = document.documentElement;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supported = () => typeof Element.prototype.animate === 'function';
    const key = 'siteSearchArrival';
    let animations = [];
    let flight = null;
    let source = null;
    let busy = false;
    let arriving = false;
    const address = url => new URL(url, location.href).href;
    try {
        const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
        sessionStorage.removeItem(key);
        if (saved && Date.now() - saved.time < 12000 && saved.url === location.href) {
            arriving = true;
            root.classList.add('search-arriving');
            history.replaceState({ ...(history.state || {}), fromSearch: true }, '');
        }
    } catch (error) { /* Continue without the cross-page entrance. */ }

    const content = () => [...document.querySelectorAll('main, .hub-footer, .site-global-footer, body > .globe-shell.is-immersive')]
        .filter(element => getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0);
    const play = (element, frames, options) => {
        const animation = element.animate(frames, options);
        animations.push(animation);
        return animation;
    };
    const cleanup = () => {
        animations.forEach(animation => animation.cancel());
        animations = [];
        flight?.remove();
        flight = null;
        if (source?.isConnected) source.style.removeProperty('visibility');
        source = null;
        root.classList.remove('search-departing', 'search-arriving');
        busy = false;
    };
    const painted = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    async function enter() {
        if (reduced() || !supported()) return cleanup();
        const distance = Math.min(innerWidth * 0.08, 88);
        const options = { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' };
        const screens = content();
        const entrance = screens.map(element => play(element, [
            { opacity: 0.15, transform: `translate3d(${distance}px, 0, 0)` },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], options));
        const bar = document.querySelector('#detail-view.active .detail-nav-bar') || document.querySelector('.card-nav-container');
        if (bar) entrance.push(play(bar, [{ opacity: 0 }, { opacity: 1 }], { ...options, duration: 420, delay: 80 }));
        // Removing this class reveals the page through its already-installed animations.
        root.classList.remove('search-arriving');
        await Promise.allSettled(entrance.map(animation => animation.finished));
        cleanup();
        const heading = document.querySelector('#detail-view.active #detail-title') || document.querySelector('main h1');
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.classList.add('search-focus-target');
            heading.focus({ preventScroll: true });
        }
    }
    async function open({ row, url, render, closeMenu }) {
        if (busy) return;
        busy = true;
        if (reduced() || !supported()) {
            closeMenu();
            if (render) { render(); cleanup(); }
            else { cleanup(); location.assign(url); }
            return;
        }
        root.classList.add('search-departing');
        const options = { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' };
        const exits = content().map(element => play(element, [
            { opacity: 1, transform: 'translate3d(0, 0, 0)' },
            { opacity: render ? 0 : 0.12, transform: `translate3d(${-Math.min(innerWidth * 0.06, 72)}px, 0, 0)` }
        ], options));
        const nav = document.getElementById('card-nav');
        if (nav) exits.push(play(nav, [{ opacity: 1 }, { opacity: 0 }], { ...options, duration: 300 }));
        if (row) {
            const rect = row.getBoundingClientRect();
            flight = row.cloneNode(true);
            flight.removeAttribute('role');
            flight.removeAttribute('aria-selected');
            flight.setAttribute('aria-hidden', 'true');
            flight.classList.add('search-result-flight');
            Object.assign(flight.style, {
                left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
                font: getComputedStyle(row).font, color: getComputedStyle(row).color
            });
            document.body.appendChild(flight);
            source = row;
            row.style.visibility = 'hidden';
            exits.push(play(flight, [
                { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                { opacity: 0, transform: `translate3d(${-Math.min(innerWidth * 0.18, 150)}px, 0, 0)` }
            ], { ...options, duration: 300 }));
        }
        await Promise.allSettled(exits.map(animation => animation.finished));
        if (!render) {
            try { sessionStorage.setItem(key, JSON.stringify({ url: address(url), time: Date.now() })); } catch (error) { /* no storage */ }
            location.assign(url);
            return;
        }
        closeMenu();
        root.classList.add('search-arriving');
        try {
            render();
            await painted();
            // Cancel the exit effects before entering the new view, but retain the guard.
            animations.forEach(animation => animation.cancel());
            animations = [];
            flight?.remove();
            flight = null;
            if (source?.isConnected) source.style.removeProperty('visibility');
            source = null;
            root.classList.remove('search-departing');
            await enter();
        } catch (error) {
            cleanup();
            location.assign(url);
        }
    }
    window.SearchMotion = { open, get arriving() { return arriving; } };
    if (arriving) document.addEventListener('DOMContentLoaded', async () => {
        await painted();
        await enter();
        arriving = false;
    }, { once: true });
    // A cached Back navigation must restore the outgoing screen and its search results.
    window.addEventListener('pageshow', event => { if (event.persisted) cleanup(); });
})();
