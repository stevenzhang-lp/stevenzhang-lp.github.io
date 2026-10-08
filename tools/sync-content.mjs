#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content', 'journal');
const STORIES_DIR = join(ROOT, 'content', 'stories');
const INDEX_PATH = join(CONTENT_DIR, 'index.json');
const GENERATED_PATH = join(ROOT, 'js', 'generated-content.js');
const watchMode = process.argv.includes('--watch');
const intervalArg = process.argv.indexOf('--interval');
const interval = intervalArg >= 0 ? Math.max(Number(process.argv[intervalArg + 1]) || 1, 0.2) * 1000 : 1000;

const posix = value => value.split(sep).join('/');

function scalar(value) {
    const trimmed = value.trim();
    if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) {
        return trimmed.slice(1, -1);
    }
    if (/^(true|yes|on)$/i.test(trimmed)) return true;
    if (/^(false|no|off)$/i.test(trimmed)) return false;
    return trimmed;
}

function parseDocument(text) {
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
    const metadata = {};
    if (!match) return { metadata, body: text.trim() };
    for (const rawLine of match[1].split('\n')) {
        const line = rawLine.trim();
        const at = line.indexOf(':');
        if (!line || line.startsWith('#') || at < 1) continue;
        metadata[line.slice(0, at).trim().toLowerCase()] = scalar(line.slice(at + 1));
    }
    return { metadata, body: text.slice(match[0].length).trim() };
}

function plainText(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~`>#|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function markdownFiles(directory) {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) found.push(...await markdownFiles(path));
        else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') found.push(path);
    }
    return found.sort();
}

async function buildItem(path) {
    const text = await readFile(path, 'utf8');
    const { metadata, body } = parseDocument(text);
    const name = path.split(sep).at(-1);
    if (name.startsWith('_') || metadata.draft === true) return null;

    const info = await stat(path);
    const modified = info.mtime;
    const relativePath = posix(relative(ROOT, path));
    const relativeToJournal = path.startsWith(join(STORIES_DIR, 'journal'))
        ? relative(join(STORIES_DIR, 'journal'), path)
        : relative(CONTENT_DIR, path);
    const slug = posix(relativeToJournal).replace(/\/story\.md$/i, '').replace(/\.md$/i, '');
    const heading = body.match(/^#\s+(.+)$/m)?.[1];
    const fallbackTitle = slug.split('/').at(-1).replace(/[-_]/g, ' ').trim();
    const title = String(metadata.title || (heading ? plainText(heading) : fallbackTitle));
    const date = String(metadata.date || modified.toISOString().slice(0, 10));
    const excerpt = String(metadata.excerpt || plainText(body).slice(0, 180)).trim();

    return {
        id: `md-${createHash('sha1').update(relativePath).digest('hex').slice(0, 10)}`,
        slug,
        source: relativePath.split('/').map(encodeURIComponent).join('/'),
        titleZh: title,
        titleEn: String(metadata.title_en || title),
        categoryZh: String(metadata.category || '随笔'),
        categoryEn: String(metadata.category_en || 'NOTES'),
        eyebrowZh: String(metadata.eyebrow || metadata.category || '思维碎片'),
        eyebrowEn: String(metadata.eyebrow_en || metadata.category_en || 'THOUGHT FRAGMENT'),
        contentZh: excerpt,
        contentEn: String(metadata.excerpt_en || excerpt),
        date,
        year: date.match(/\d{4}/)?.[0] || String(modified.getFullYear()),
        updated: modified.toISOString(),
        link: metadata.external_url || `journal-entry.html?slug=${encodeURIComponent(slug)}`,
        visualLabel: metadata.visual_label || '',
        formulaText: metadata.formula_text || '',
        formulaTex: metadata.formula_tex || '',
        highlightsZh: metadata.highlights || '',
        highlightsEn: metadata.highlights_en || '',
        isMarkdown: true
    };
}

async function buildVoyageItem(path) {
    const text = await readFile(path, 'utf8');
    const { metadata, body } = parseDocument(text);
    if (metadata.draft === true) return null;
    const slug = metadata.slug || posix(relative(join(STORIES_DIR, 'voyage'), dirname(path)));
    const [storyZh = '', storyEn = ''] = body.split(/\n\s*<!--\s*English\s*-->\s*\n/i);
    const galleryCount = metadata.gallery ? String(metadata.gallery).split(',').filter(Boolean).length : 0;
    const base = `images/stories/${slug}`;
    return {
        id: Number(metadata.id),
        slug,
        mapQuery: metadata.map_query || '',
        location: metadata.location,
        date: metadata.date,
        image: `${base}/original/cover.jpg`,
        exif: metadata.exif,
        titleZh: metadata.title_zh,
        titleEn: metadata.title_en,
        storyZh: storyZh.trim(),
        storyEn: storyEn.trim(),
        morePics: Array.from({ length: galleryCount }, (_, index) => `${base}/original/gallery-${String(index + 1).padStart(2, '0')}.jpg`)
    };
}

async function snapshot() {
    const files = await markdownFiles(CONTENT_DIR);
    return JSON.stringify(await Promise.all(files.map(async path => {
        const info = await stat(path);
        return [path, info.mtimeMs, info.size];
    })));
}

async function build() {
    await mkdir(CONTENT_DIR, { recursive: true });
    const legacyJournalFiles = await markdownFiles(CONTENT_DIR);
    const storyJournalFiles = await markdownFiles(join(STORIES_DIR, 'journal'));
    const items = (await Promise.all([...legacyJournalFiles, ...storyJournalFiles].map(buildItem))).filter(Boolean);
    items.sort((a, b) => b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated));
    const payload = { generated_at: new Date().toISOString(), items };
    const temporary = `${INDEX_PATH}.tmp`;
    await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await rename(temporary, INDEX_PATH);
    const voyageFiles = await markdownFiles(join(STORIES_DIR, 'voyage'));
    const photos = (await Promise.all(voyageFiles.map(buildVoyageItem))).filter(Boolean).sort((a, b) => a.id - b.id);
    const generated = `// Generated by tools/sync-content.mjs — edit content/stories, not this file.\nwindow.CONTENT_PHOTOS = ${JSON.stringify(photos, null, 2)};\nwindow.CONTENT_DIARIES = [];\nwindow.CONTENT_JOURNALS = ${JSON.stringify(items, null, 2)};\n`;
    await writeFile(GENERATED_PATH, generated, 'utf8');
    console.log(`Updated ${posix(relative(ROOT, GENERATED_PATH))} (${photos.length} voyage, ${items.length} journal)`);
}

await build();
if (watchMode) {
    console.log('Watching content/journal — press Ctrl+C to stop');
    let state = await snapshot();
    setInterval(async () => {
        const current = await snapshot();
        if (current !== state) {
            await build();
            state = current;
        }
    }, interval);
}
