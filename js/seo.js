(() => {
    'use strict';
    const SITE_URL = 'https://stevenzhangym.com';

    function setMeta(selector, attribute, value) {
        let element = document.head.querySelector(selector);
        if (!element) {
            element = document.createElement('meta');
            const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
            if (!match) return;
            element.setAttribute(match[1], match[2]);
            document.head.appendChild(element);
        }
        element.setAttribute(attribute, value);
    }

    function setCanonical(url) {
        let canonical = document.head.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;
    }

    const id = Number(new URLSearchParams(location.search).get('id'));
    const photo = (window.CONTENT_PHOTOS || []).find(item => item.id === id);
    if (!photo) return;

    const description = String(photo.storyZh || '').replace(/\s+/g, ' ').trim().slice(0, 150);
    const canonical = `${SITE_URL}/voyage.html?id=${encodeURIComponent(photo.id)}`;
    const image = `${SITE_URL}/images/stories/${encodeURIComponent(photo.slug)}/hero/cover.jpg`;
    document.title = `${photo.titleZh} | STEVEN ZHANG`;
    setCanonical(canonical);
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:title"]', 'content', photo.titleZh);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', photo.titleZh);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);

    const published = new Date(`${photo.date} 12:00:00 UTC`);
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: photo.titleZh,
        alternativeHeadline: photo.titleEn,
        description,
        image: [image],
        datePublished: Number.isNaN(published.valueOf()) ? undefined : published.toISOString().slice(0, 10),
        author: { '@type': 'Person', name: 'Steven Zhang', url: SITE_URL },
        mainEntityOfPage: canonical
    });
    document.head.appendChild(schema);
})();
