(() => {
    'use strict';

    window.animateCoverMorph = (card, image, from, to, naturalW, naturalH, options, fromScale = 1, toScale = 1) => {
        // Keep the raster layers at one size throughout the morph. Resizing a wide
        // panorama every frame can repeatedly invalidate its composited texture.
        // The fixed clipping box contains BOTH endpoints, so no inset is negative
        // and a partly off-screen thumbnail cannot be cropped by the final hero.
        const bounds = {
            left: Math.min(from.left, to.left), top: Math.min(from.top, to.top),
            right: Math.max(from.left + from.width, to.left + to.width),
            bottom: Math.max(from.top + from.height, to.top + to.height)
        };
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;
        const radius = rect => rect.radius.map(value => `${value}px`).join(' ');
        const clip = rect => `inset(${rect.top - bounds.top}px ${bounds.right - rect.left - rect.width}px ${bounds.bottom - rect.top - rect.height}px ${rect.left - bounds.left}px round ${radius(rect)})`;
        const photoScale = (rect, zoom) => Math.max(rect.width / naturalW, rect.height / naturalH) * zoom;
        const scaleFrom = photoScale(from, fromScale);
        const scaleTo = photoScale(to, toScale);
        const scale = Math.max(scaleFrom, scaleTo);
        const photoWidth = naturalW * scale;
        const photoHeight = naturalH * scale;
        const transform = (rect, value) => {
            const x = rect.left + rect.width / 2 - bounds.left - photoWidth / 2;
            const y = rect.top + rect.height / 2 - bounds.top - photoHeight / 2;
            return `translate3d(${x}px, ${y}px, 0) scale(${value / scale})`;
        };
        const startClip = clip(from);
        const endClip = clip(to);
        const startTransform = transform(from, scaleFrom);
        const endTransform = transform(to, scaleTo);
        Object.assign(card.style, {
            left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${width}px`, height: `${height}px`,
            borderRadius: '0px', clipPath: startClip
        });
        Object.assign(image.style, {
            inset: 'auto', left: '0px', top: '0px', width: `${photoWidth}px`, height: `${photoHeight}px`,
            transformOrigin: '50% 50%', transform: startTransform, backgroundSize: '100% 100%'
        });
        // Keep the destination hero's wash and rim aligned for a seamless handoff.
        const hero = from.width * from.height > to.width * to.height ? from : to;
        const heroLeft = `${hero.left - bounds.left}px`;
        const heroTop = `${hero.top - bounds.top}px`;
        card.style.setProperty('--morph-hero-left', heroLeft);
        card.style.setProperty('--morph-hero-top', heroTop);
        card.style.setProperty('--morph-hero-width', `${hero.width}px`);
        card.style.setProperty('--morph-hero-height', `${hero.height}px`);
        card.style.setProperty('--morph-hero-radius', radius(hero));
        const wash = card.querySelector('.atlas-transition-wash');
        Object.assign(wash.style, { inset: 'auto', left: heroLeft, top: heroTop, width: `${hero.width}px`, height: `${hero.height}px` });
        // Identical easing keeps the photo centred in, and covering, the clip.
        return [
            card.animate([{ clipPath: startClip }, { clipPath: endClip }], options),
            image.animate([{ transform: startTransform }, { transform: endTransform }], options)
        ];
    };
})();
