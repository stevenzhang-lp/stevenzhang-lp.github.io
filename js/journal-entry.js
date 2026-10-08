document.addEventListener('DOMContentLoaded', async () => {
    const article = document.getElementById('markdown-article');
    const status = document.getElementById('markdown-status');
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const fail = message => {
        status.textContent = message;
        status.hidden = false;
        article.hidden = true;
    };

    if (!slug) return fail('没有指定要读取的文章。');
    try {
        const indexResponse = await fetch('content/journal/index.json', { cache: 'no-store' });
        if (!indexResponse.ok) throw new Error('index');
        const index = await indexResponse.json();
        const item = index.items.find(entry => entry.slug === slug);
        if (!item) return fail('这篇文章不存在，或仍处于草稿状态。');
        const response = await fetch(item.source, { cache: 'no-store' });
        if (!response.ok) throw new Error('source');
        const rendered = window.MarkdownEngine.render(await response.text());
        document.title = `${item.titleZh} | STEVEN ZHANG`;
        document.getElementById('entry-eyebrow').textContent = item.eyebrowZh;
        document.getElementById('entry-title').textContent = item.titleZh;
        document.getElementById('entry-meta').textContent = `${item.categoryZh} · ${item.date}`;
        article.innerHTML = rendered.html;
        article.querySelectorAll('a').forEach(link => {
            const url = new URL(link.getAttribute('href'), location.href);
            if (url.origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        });
        status.hidden = true;
        article.hidden = false;
    } catch (error) {
        fail('文章读取失败。请先运行 node tools/sync-content.mjs，并通过本地服务器打开网站。');
    }
});
