/* Small, dependency-free Markdown renderer for the journal. */
window.MarkdownEngine = (() => {
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    function splitFrontMatter(source) {
        const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
        if (!match) return { metadata: {}, body: source };
        const metadata = {};
        match[1].split('\n').forEach(line => {
            const at = line.indexOf(':');
            if (at < 1) return;
            const key = line.slice(0, at).trim().toLowerCase();
            let value = line.slice(at + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
            metadata[key] = value;
        });
        return { metadata, body: source.slice(match[0].length) };
    }

    function inline(text) {
        let html = escape(text);
        const code = [];
        html = html.replace(/`([^`]+)`/g, (_, value) => `\u0000CODE${code.push(`<code>${value}</code>`) - 1}\u0000`);
        html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, '<img src="$2" alt="$1" title="$3" loading="lazy">');
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|[^\s)]+)\)/g, '<a href="$2">$1</a>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        return html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => code[Number(index)]);
    }

    function isTableDivider(line) {
        return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    }

    function cells(line) {
        return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    }

    function render(source) {
        const { metadata, body } = splitFrontMatter(String(source ?? '').replace(/\r\n?/g, '\n'));
        const lines = body.split('\n');
        const html = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            if (!line.trim()) { i += 1; continue; }
            if (/^```/.test(line)) {
                const language = line.slice(3).trim().replace(/[^\w-]/g, '');
                const block = [];
                for (i += 1; i < lines.length && !/^```/.test(lines[i]); i += 1) block.push(lines[i]);
                i += 1;
                html.push(`<pre><code${language ? ` class="language-${language}"` : ''}>${escape(block.join('\n'))}</code></pre>`);
                continue;
            }
            const heading = line.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                const level = heading[1].length;
                const id = heading[2].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
                html.push(`<h${level} id="${escape(id)}">${inline(heading[2])}</h${level}>`);
                i += 1; continue;
            }
            if (i + 1 < lines.length && line.includes('|') && isTableDivider(lines[i + 1])) {
                const headers = cells(line);
                const rows = [];
                i += 2;
                while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cells(lines[i])); i += 1; }
                html.push(`<div class="md-table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
                continue;
            }
            if (/^>\s?/.test(line)) {
                const quote = [];
                while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
                html.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`); continue;
            }
            if (/^\s*([-*+] |\d+\. )/.test(line)) {
                const ordered = /^\s*\d+\. /.test(line);
                const items = [];
                const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;
                while (i < lines.length) {
                    const match = lines[i].match(pattern);
                    if (!match) break;
                    items.push(`<li>${inline(match[1])}</li>`); i += 1;
                }
                html.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
            }
            if (/^---+$/.test(line.trim())) { html.push('<hr>'); i += 1; continue; }
            const paragraph = [line.trim()];
            i += 1;
            while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s|^```|^>|^\s*([-*+] |\d+\. )|^---+$/.test(lines[i])) {
                if (i + 1 < lines.length && isTableDivider(lines[i + 1])) break;
                paragraph.push(lines[i].trim()); i += 1;
            }
            html.push(`<p>${inline(paragraph.join(' '))}</p>`);
        }
        return { metadata, html: html.join('\n') };
    }

    return { render, splitFrontMatter };
})();
