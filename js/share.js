// Share composer for voyage entries.
// The poster is drawn directly onto a <canvas> (no DOM screenshot), so the preview
// is pixel-identical to the PNG that gets saved.
(function() {
    const SITE_HOST = 'stevenzhangym.com';
    const BASE_WIDTH = 1080;
    const EXPORT_SCALE = 1.5; // 1620px wide PNG
    const FORMATS = {
        portrait: { height: 1350, labelZh: '4:5 帖子', labelEn: '4:5 Post' },
        story: { height: 1920, labelZh: '9:16 快拍', labelEn: '9:16 Story' }
    };
    // Order here is the order of the style buttons; the first one is the default.
    const STYLES = {
        cinema: { labelZh: '影院', labelEn: 'Cinema' },
        paper: { labelZh: '纸本', labelEn: 'Paper' },
        atlas: { labelZh: '暗夜', labelEn: 'Night' }
    };

    const FONT_SANS = 'Inter, "Noto Serif SC", "PingFang SC", "Hiragino Sans GB", sans-serif';
    const FONT_SERIF = '"Noto Serif SC", "Playfair Display", "Songti SC", serif';
    const FONT_MONO = '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

    let qrLibraryPromise = null;

    function loadQrLibrary() {
        if (typeof window.qrcode === 'function') return Promise.resolve();
        if (qrLibraryPromise) return qrLibraryPromise;
        qrLibraryPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/qrcode.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => {
                qrLibraryPromise = null;
                reject(new Error('Failed to load js/qrcode.min.js'));
            };
            document.head.appendChild(script);
        });
        return qrLibraryPromise;
    }

    function showToast(zhMsg, enMsg) {
        let lang = document.body.classList.contains('lang-en') ? 'en' : 'zh';
        const modal = document.getElementById('share-popup-modal');
        if (modal && modal.classList.contains('show')) {
            lang = modal.classList.contains('modal-lang-en') ? 'en' : 'zh';
        }

        let toast = document.getElementById('share-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'share-toast';
            toast.className = 'share-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        toast.textContent = lang === 'en' ? enMsg : zhMsg;
        toast.classList.add('show');
        window.clearTimeout(toast._hideTimer);
        toast._hideTimer = window.setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    // ------------------------------------------------------------------
    // Poster content
    // ------------------------------------------------------------------

    function formatCoordinates(location) {
        const raw = typeof locationRawCoords !== 'undefined' ? locationRawCoords[location] : null;
        if (!raw) return '—';
        const lat = `${Math.abs(raw.lat).toFixed(1)}°${raw.lat >= 0 ? 'N' : 'S'}`;
        const lon = `${Math.abs(raw.lon).toFixed(1)}°${raw.lon >= 0 ? 'E' : 'W'}`;
        return `${lat}  ${lon}`;
    }

    function splitStoryTitle(title) {
        // "维多利亚港：流动的光影坐标" → headline + tagline
        const match = String(title || '').match(/^(.+?)[：:]\s*(.+)$/);
        return match ? { head: match[1].trim(), tail: match[2].trim() } : { head: String(title || ''), tail: '' };
    }

    function buildPosterContent(item, type, lang) {
        const isEn = lang === 'en';
        const list = typeof photos !== 'undefined' ? photos : [];
        const index = list.indexOf(item);
        const loc = typeof parseLocation === 'function' ? parseLocation(item.location || '') : null;
        const date = typeof parseDate === 'function' && item.date ? parseDate(item.date) : { en: item.date || '', zh: item.date || '' };
        const storyTitle = splitStoryTitle(isEn ? item.titleEn : item.titleZh);
        const exifParts = String(item.exif || '').split('|').map(part => part.trim()).filter(Boolean);

        return {
            lang,
            image: (typeof imageVariant === 'function' ? imageVariant(item.image, 'hero') : item.image) || '',
            kicker: type === 'voyage'
                ? (isEn ? 'VOYAGE ARCHIVE' : '时空档案室 · VOYAGE')
                : (isEn ? 'THOUGHT FRAGMENTS' : '思维碎片 · JOURNAL'),
            number: index >= 0 ? `No. ${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}` : '',
            title: loc ? (isEn ? loc.enTitle : loc.zhTitle) : (isEn ? item.titleEn : item.titleZh) || '',
            country: loc ? (isEn ? loc.enSub : loc.zhSub) : '',
            tagline: storyTitle.tail || storyTitle.head,
            story: String((isEn ? item.storyEn : item.storyZh) || (isEn ? item.contentEn : item.contentZh) || '').replace(/\s+/g, ' ').trim(),
            meta: [
                { label: isEn ? 'DATE' : '日期', value: isEn ? date.en : date.zh },
                { label: isEn ? 'REGION' : '区域坐标', value: formatCoordinates(item.location) },
                { label: isEn ? 'CAMERA' : '相机', value: exifParts[0] || '—' }
            ],
            exifLine: exifParts.slice(1).join('  ·  '),
            frames: 1 + (item.morePics?.length || 0),
            framesLabel: isEn ? ((item.morePics?.length || 0) ? 'FRAMES IN SERIES' : 'FRAME') : '帧 · 完整影集',
            scanLabel: isEn ? 'Scan to open this story' : '扫码进入这段旅程'
        };
    }

    // ------------------------------------------------------------------
    // Canvas helpers
    // ------------------------------------------------------------------

    const CJK = /[⺀-鿿　-〿＀-￯]/;
    const NO_LINE_START = /^[，。、：；！？）」』》〉”’,.;:!?)\]]/;

    function tokenize(text) {
        return String(text).match(/[⺀-鿿　-〿＀-￯]|[^\s⺀-鿿　-〿＀-￯]+|\s+/g) || [];
    }

    // Wraps mixed CJK / Latin text. Returns at most maxLines lines, the last one ellipsised if needed.
    function wrapText(ctx, text, maxWidth, maxLines = Infinity) {
        const lines = [];
        let line = '';
        const tokens = tokenize(text);

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const candidate = line + token;
            if (!line.trim() && /^\s+$/.test(token)) continue;
            if (ctx.measureText(candidate).width <= maxWidth || !line || NO_LINE_START.test(token)) {
                line = candidate;
                continue;
            }
            lines.push(line.trimEnd());
            line = /^\s+$/.test(token) ? '' : token;
            if (lines.length === maxLines) {
                line = '';
                lines[lines.length - 1] = ellipsis(ctx, lines[lines.length - 1] + tokens.slice(i).join(''), maxWidth);
                return lines;
            }
        }
        if (line.trim()) lines.push(line.trimEnd());
        return lines;
    }

    function ellipsis(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let chars = [...text];
        while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
        return chars.join('').replace(/[\s，。、,.:;：；]+$/, '') + '…';
    }

    // Manual tracking: ctx.letterSpacing is not available in every browser.
    function drawTracked(ctx, text, x, y, tracking, align = 'left') {
        const chars = [...String(text)];
        const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + tracking * Math.max(0, chars.length - 1);
        let cursor = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
        const previousAlign = ctx.textAlign;
        ctx.textAlign = 'left';
        chars.forEach(char => {
            ctx.fillText(char, cursor, y);
            cursor += ctx.measureText(char).width + tracking;
        });
        ctx.textAlign = previousAlign;
        return width;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawImageCover(ctx, img, x, y, w, h, focusY = 0.5) {
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const sw = w / scale;
        const sh = h / scale;
        const sx = (img.naturalWidth - sw) / 2;
        const sy = Math.max(0, Math.min(img.naturalHeight - sh, (img.naturalHeight - sh) * focusY));
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    function drawPhotoOrPlaceholder(ctx, img, x, y, w, h, dark) {
        if (img) {
            drawImageCover(ctx, img, x, y, w, h, 0.45);
            return;
        }
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, dark ? '#0e1a26' : '#dfe7ee');
        gradient.addColorStop(1, dark ? '#1b1430' : '#e9e2f3');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, w, h);
    }

    function drawQr(ctx, text, x, y, size, dark, light) {
        if (typeof window.qrcode !== 'function') return false;
        const qr = window.qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const count = qr.getModuleCount();
        const cell = size / count;
        ctx.fillStyle = light;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = dark;
        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (qr.isDark(row, col)) {
                    // Slight overlap avoids hairline seams when the canvas is scaled.
                    ctx.fillRect(x + col * cell, y + row * cell, cell + 0.6, cell + 0.6);
                }
            }
        }
        return true;
    }

    function titleFont(content, size, weight = 600) {
        return `${weight} ${size}px ${FONT_SANS}`;
    }

    function fitFontSize(ctx, text, fontFor, start, min, maxWidth) {
        let size = start;
        ctx.font = fontFor(size);
        while (size > min && ctx.measureText(text).width > maxWidth) {
            size -= 4;
            ctx.font = fontFor(size);
        }
        return size;
    }

    // Shared bottom block: meta columns + footer with QR. Drawn bottom-up, returns top y.
    function drawFooter(ctx, content, shareUrl, { W, H, pad, ink, faint, line, qrDark, qrLight, qrPlate }) {
        const qrSize = 124;
        const plate = 18; // ≥ 4 modules of quiet zone for reliable scanning
        const footerTop = H - pad - qrSize - plate * 2;

        // QR plate
        const qrX = W - pad - qrSize - plate * 2;
        ctx.fillStyle = qrPlate;
        roundRect(ctx, qrX, footerTop, qrSize + plate * 2, qrSize + plate * 2, 18);
        ctx.fill();
        const drewQr = drawQr(ctx, shareUrl, qrX + plate, footerTop + plate, qrSize, qrDark, qrLight);
        if (!drewQr) {
            ctx.fillStyle = qrDark;
            ctx.font = `600 22px ${FONT_MONO}`;
            ctx.textAlign = 'center';
            ctx.fillText('SCAN', qrX + plate + qrSize / 2, footerTop + plate + qrSize / 2 + 8);
            ctx.textAlign = 'left';
        }

        // Branding
        ctx.fillStyle = ink;
        ctx.font = `700 30px ${FONT_SANS}`;
        drawTracked(ctx, 'STEVEN ZHANG', pad, footerTop + 52, 6);
        ctx.fillStyle = faint;
        ctx.font = `400 21px ${FONT_MONO}`;
        ctx.fillText(SITE_HOST, pad, footerTop + 92);
        ctx.font = `400 22px ${FONT_SANS}`;
        ctx.fillText(`${content.scanLabel}  →`, pad, footerTop + qrSize + plate * 2 - 6);

        // Hairline above footer
        const ruleY = footerTop - 30;
        ctx.fillStyle = line;
        ctx.fillRect(pad, ruleY, W - pad * 2, 1.5);

        // Meta columns
        const metaTop = ruleY - 30 - 70;
        const colWidth = (W - pad * 2) / content.meta.length;
        content.meta.forEach((entry, index) => {
            const x = pad + index * colWidth;
            ctx.fillStyle = faint;
            ctx.font = `500 18px ${FONT_MONO}`;
            drawTracked(ctx, entry.label, x, metaTop + 18, 2.5);
            ctx.fillStyle = ink;
            ctx.font = `500 25px ${FONT_SANS}`;
            ctx.fillText(ellipsis(ctx, entry.value, colWidth - 24), x, metaTop + 62);
        });
        return metaTop;
    }

    // Text stack (kicker / title / tagline / story), laid out bottom-up above `bottom`.
    function measureStack(ctx, content, width, { storyLines, titleSize, serifTitle }) {
        const titleFontFor = size => serifTitle ? `600 ${size}px ${FONT_SERIF}` : titleFont(content, size);
        // Latin capitals run much wider than CJK, so English titles start smaller; the fit also
        // keeps room for the country label beside the title so it is never pushed out.
        const startSize = Math.round(titleSize * (content.lang === 'en' ? 0.85 : 1));
        ctx.font = `500 21px ${FONT_MONO}`;
        const countryRoom = content.country ? ctx.measureText(content.country).width + content.country.length * 3 + 30 : 0;
        const fittedTitle = fitFontSize(ctx, content.title, titleFontFor, startSize, 44, width - countryRoom);

        ctx.font = `500 34px ${serifTitle ? FONT_SERIF : FONT_SANS}`;
        const tagline = wrapText(ctx, content.tagline, width, 2);

        const storyFont = content.lang === 'en' ? `400 25px ${FONT_SANS}` : `400 26px ${FONT_SANS}`;
        ctx.font = storyFont;
        const story = storyLines > 0 ? wrapText(ctx, content.story, width, storyLines) : [];

        const storyLineHeight = 46;
        const height = 30 + 34 + fittedTitle * 1.02 + 28 + tagline.length * 48 + (story.length ? 22 + story.length * storyLineHeight : 0);
        return { fittedTitle, titleFontFor, tagline, story, storyFont, storyLineHeight, height };
    }

    function drawStack(ctx, content, x, top, stack, colors) {
        let y = top;
        // Kicker: "01 ——— VOYAGE ARCHIVE"            No. 04 / 11
        ctx.fillStyle = colors.accent;
        ctx.font = `500 20px ${FONT_MONO}`;
        const kickerWidth = drawTracked(ctx, content.kicker, x, y + 20, 3);
        ctx.fillRect(x + kickerWidth + 22, y + 13, 56, 1.5);
        if (colors.showNumber) {
            ctx.fillStyle = colors.faint;
            drawTracked(ctx, content.number, colors.right, y + 20, 2, 'right');
        }
        y += 30 + 34;

        // Title + country
        ctx.font = stack.titleFontFor(stack.fittedTitle);
        const titleBaseline = y + stack.fittedTitle * 0.82;
        const titleWidth = ctx.measureText(content.title).width;
        ctx.fillStyle = colors.title(ctx, x, titleWidth);
        ctx.fillText(content.title, x, titleBaseline);
        if (content.country) {
            ctx.fillStyle = colors.faint;
            ctx.font = `500 21px ${FONT_MONO}`;
            const countryX = x + titleWidth + 22;
            if (countryX + ctx.measureText(content.country).width < colors.right) {
                drawTracked(ctx, content.country, countryX, titleBaseline, 3);
            }
        }
        y += stack.fittedTitle * 1.02 + 28;

        // Tagline
        ctx.fillStyle = colors.ink;
        ctx.font = `500 34px ${colors.serif ? FONT_SERIF : FONT_SANS}`;
        stack.tagline.forEach(line => {
            ctx.fillText(line, x, y + 34);
            y += 48;
        });

        // Story excerpt
        if (stack.story.length) {
            y += 22;
            ctx.fillStyle = colors.body;
            ctx.font = stack.storyFont;
            stack.story.forEach(line => {
                ctx.fillText(line, x, y + 28);
                y += stack.storyLineHeight;
            });
        }
    }

    // ------------------------------------------------------------------
    // Poster styles
    // ------------------------------------------------------------------

    function drawAtlas(ctx, content, img, shareUrl, W, H, isStory) {
        const pad = 72;
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, W, H);

        const palette = { W, H, pad, ink: '#f5f5f7', faint: 'rgba(255,255,255,0.46)', line: 'rgba(255,255,255,0.14)', qrDark: '#05070a', qrLight: '#ffffff', qrPlate: '#ffffff' };
        const metaTop = drawFooter(ctx, content, shareUrl, palette);

        const stack = measureStack(ctx, content, W - pad * 2, { storyLines: isStory ? 5 : 2, titleSize: isStory ? 96 : 76 });
        const stackTop = metaTop - 48 - stack.height;

        // Photo fills everything above the text, fading into the background.
        const photoH = stackTop + 90;
        drawPhotoOrPlaceholder(ctx, img, 0, 0, W, photoH, true);
        const fade = ctx.createLinearGradient(0, photoH * 0.45, 0, photoH);
        fade.addColorStop(0, 'rgba(5,7,10,0)');
        fade.addColorStop(0.75, 'rgba(5,7,10,0.86)');
        fade.addColorStop(1, '#05070a');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, W, photoH);
        const topShade = ctx.createLinearGradient(0, 0, 0, 180);
        topShade.addColorStop(0, 'rgba(5,7,10,0.55)');
        topShade.addColorStop(1, 'rgba(5,7,10,0)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, W, 180);

        // Header over the photo
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `700 22px ${FONT_SANS}`;
        drawTracked(ctx, 'STEVEN ZHANG', pad, pad + 8, 5);
        ctx.font = `500 19px ${FONT_MONO}`;
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        drawTracked(ctx, `${content.frames} ${content.framesLabel}`, W - pad, pad + 8, 2, 'right');

        drawStack(ctx, content, pad, stackTop, stack, {
            accent: '#a9b8c9',
            faint: 'rgba(255,255,255,0.46)',
            ink: 'rgba(255,255,255,0.9)',
            body: 'rgba(255,255,255,0.6)',
            right: W - pad,
            showNumber: true,
            title: () => '#f5f5f7'
        });
    }

    function drawPaper(ctx, content, img, shareUrl, W, H, isStory) {
        const pad = 72;
        ctx.fillStyle = '#f1eee7';
        ctx.fillRect(0, 0, W, H);

        const palette = { W, H, pad, ink: '#16181c', faint: 'rgba(22,24,28,0.5)', line: 'rgba(22,24,28,0.16)', qrDark: '#16181c', qrLight: '#f1eee7', qrPlate: '#f1eee7' };
        const metaTop = drawFooter(ctx, content, shareUrl, palette);

        const stack = measureStack(ctx, content, W - pad * 2, { storyLines: isStory ? 4 : 0, titleSize: isStory ? 88 : 68, serifTitle: true });
        const stackTop = metaTop - 44 - stack.height;

        // Inset print with caption
        const photoTop = pad + 56;
        const captionH = 50;
        const photoH = stackTop - photoTop - captionH - 20;
        ctx.fillStyle = '#16181c';
        ctx.font = `700 22px ${FONT_SANS}`;
        drawTracked(ctx, 'STEVEN ZHANG', pad, pad + 26, 5);
        ctx.fillStyle = 'rgba(22,24,28,0.5)';
        ctx.font = `500 19px ${FONT_MONO}`;
        drawTracked(ctx, content.number, W - pad, pad + 26, 2, 'right');

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pad, photoTop, W - pad * 2, photoH);
        ctx.restore();
        drawPhotoOrPlaceholder(ctx, img, pad, photoTop, W - pad * 2, photoH, false);

        ctx.fillStyle = 'rgba(22,24,28,0.55)';
        ctx.font = `500 18px ${FONT_MONO}`;
        const caption = `FIG. ${content.number.replace(/^No\.\s*/, '').split(' ')[0] || '—'}  ${content.exifLine}`;
        ctx.fillText(ellipsis(ctx, caption, W - pad * 2), pad, photoTop + photoH + 36);

        drawStack(ctx, content, pad, stackTop, stack, {
            accent: '#2f5673',
            faint: 'rgba(22,24,28,0.45)',
            ink: '#16181c',
            body: 'rgba(22,24,28,0.66)',
            right: W - pad,
            serif: true,
            title: () => '#16181c'
        });
    }

    function drawCinema(ctx, content, img, shareUrl, W, H, isStory) {
        const pad = 72;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        drawPhotoOrPlaceholder(ctx, img, 0, 0, W, H, true);

        const shade = ctx.createLinearGradient(0, H * 0.3, 0, H);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(0.55, 'rgba(0,0,0,0.72)');
        shade.addColorStop(1, 'rgba(0,0,0,0.94)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, W, H);
        const topShade = ctx.createLinearGradient(0, 0, 0, 220);
        topShade.addColorStop(0, 'rgba(0,0,0,0.6)');
        topShade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShade;
        ctx.fillRect(0, 0, W, 220);

        // Letterbox frame marks
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        [[pad - 24, pad - 24, 1, 1], [W - pad + 24, pad - 24, -1, 1]].forEach(([x, y, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(x, y + 36 * dy);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 36 * dx, y);
            ctx.stroke();
        });

        ctx.fillStyle = 'rgba(255,255,255,0.94)';
        ctx.font = `700 22px ${FONT_SANS}`;
        drawTracked(ctx, 'STEVEN ZHANG', pad, pad + 20, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = `500 19px ${FONT_MONO}`;
        drawTracked(ctx, content.number, W - pad, pad + 20, 2, 'right');

        const palette = { W, H, pad, ink: '#ffffff', faint: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.22)', qrDark: '#000000', qrLight: '#ffffff', qrPlate: '#ffffff' };
        const metaTop = drawFooter(ctx, content, shareUrl, palette);
        const stack = measureStack(ctx, content, W - pad * 2, { storyLines: isStory ? 4 : 2, titleSize: isStory ? 108 : 84 });
        drawStack(ctx, content, pad, metaTop - 56 - stack.height, stack, {
            accent: '#ffffff',
            faint: 'rgba(255,255,255,0.6)',
            ink: '#ffffff',
            body: 'rgba(255,255,255,0.72)',
            right: W - pad,
            title: () => '#ffffff'
        });
    }

    const RENDERERS = { atlas: drawAtlas, paper: drawPaper, cinema: drawCinema };

    // ------------------------------------------------------------------
    // Rendering pipeline
    // ------------------------------------------------------------------

    const imageCache = new Map();

    function loadImage(src) {
        if (!src) return Promise.resolve(null);
        if (!imageCache.has(src)) {
            imageCache.set(src, new Promise(resolve => {
                const img = new Image();
                img.decoding = 'async';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            }));
        }
        return imageCache.get(src);
    }

    async function ensureFonts(content) {
        if (!document.fonts?.load) return;
        const sample = [content.title, content.tagline, content.story, content.scanLabel, content.kicker, ...content.meta.map(m => m.label + m.value)].join('');
        const loads = [
            `700 30px Inter`, `600 100px Inter`, `500 30px Inter`, `400 26px Inter`,
            `600 100px "Noto Serif SC"`, `500 34px "Noto Serif SC"`, `400 26px "Noto Serif SC"`
        ].map(font => document.fonts.load(font, sample).catch(() => {}));
        await Promise.race([Promise.all(loads), new Promise(resolve => setTimeout(resolve, 2500))]);
    }

    async function renderPoster(canvas, { item, type, lang, style, format, shareUrl }) {
        const content = buildPosterContent(item, type, lang);
        const W = BASE_WIDTH;
        const H = FORMATS[format].height;
        const [img] = await Promise.all([loadImage(content.image), ensureFonts(content)]);

        canvas.width = Math.round(W * EXPORT_SCALE);
        canvas.height = Math.round(H * EXPORT_SCALE);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.imageSmoothingQuality = 'high';
        RENDERERS[style](ctx, content, img, shareUrl, W, H, format === 'story');
        return canvas;
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), 'image/png');
        });
    }

    function slugify(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';
    }

    // ------------------------------------------------------------------
    // Modal
    // ------------------------------------------------------------------

    function optionButtons(options, current, className, labelFor) {
        return Object.entries(options).map(([key, option]) => `
            <button type="button" class="${className} glass-pill-btn ${key === current ? 'active' : ''}" data-value="${key}" aria-pressed="${key === current}">
                ${labelFor(option, key)}
            </button>`).join('');
    }

    window.openShareModal = async function(item, type) {
        const state = {
            lang: document.body.classList.contains('lang-en') ? 'en' : 'zh',
            style: Object.keys(STYLES)[0],
            format: 'portrait'
        };
        const returnFocus = document.activeElement;

        try {
            await loadQrLibrary();
        } catch (error) {
            console.error(error);
            showToast('二维码组件加载失败，海报将不含二维码', 'QR component failed to load; the poster will omit the code');
        }

        let baseUrl = window.location.origin;
        if (!baseUrl || baseUrl === 'null' || !baseUrl.startsWith('http') || /localhost|127\.0\.0\.1/.test(baseUrl)) {
            baseUrl = `https://${SITE_HOST}`;
        }
        const pageByType = { voyage: 'voyage.html', diary: 'diary.html', journal: 'journal.html' };
        const shareUrl = item.isPage
            ? `${baseUrl}/${item.pagePath}`
            : type === 'voyage' && item.slug
                ? `${baseUrl}/share/${encodeURIComponent(item.slug)}.html`
                : `${baseUrl}/${pageByType[type] || 'index.html'}?id=${encodeURIComponent(item.id)}`;

        let modal = document.getElementById('share-popup-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'share-popup-modal';
            document.body.appendChild(modal);
        }
        window.clearTimeout(modal._shareCloseTimer);
        modal.hidden = false;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'share-modal-title');
        modal.setAttribute('aria-hidden', 'false');
        modal.className = `share-popup-modal modal-lang-${state.lang}`;

        modal.innerHTML = `
            <div class="share-popup-content glass-panel" tabindex="-1">
                <header class="share-modal-header">
                    <div>
                        <p class="share-modal-eyebrow"><span class="lang-zh">创建分享</span><span class="lang-en">CREATE &amp; SHARE</span></p>
                        <h2 class="share-modal-title" id="share-modal-title"><span class="lang-zh">分享海报</span><span class="lang-en">Share Poster</span></h2>
                        <p class="share-modal-desc">
                            <span class="lang-zh">预览即成品：保存的 PNG 与左侧画面完全一致。</span>
                            <span class="lang-en">What you see is what you save — the PNG matches this preview exactly.</span>
                        </p>
                    </div>
                    <button class="share-close-btn" id="share-modal-close" type="button" aria-label="${state.lang === 'en' ? 'Close' : '关闭'}">&times;</button>
                </header>

                <div class="share-layout">
                    <section class="share-preview-column" aria-label="Poster preview">
                        <div class="share-preview-toolbar">
                            <span><span class="lang-zh">海报预览</span><span class="lang-en">POSTER PREVIEW</span></span>
                            <span id="share-poster-size"></span>
                        </div>
                        <div class="share-preview-container">
                            <div class="share-card-preview" id="share-card-preview-node">
                                <canvas id="share-poster-canvas" class="share-poster-canvas" role="img" aria-label="${escapeHtml(state.lang === 'en' ? item.titleEn : item.titleZh)}"></canvas>
                            </div>
                        </div>
                    </section>

                    <section class="share-controls-column">
                        <div class="share-control-section">
                            <span class="share-control-label"><span class="lang-zh">海报语言</span><span class="lang-en">POSTER LANGUAGE</span></span>
                            <div class="glass-pill-group share-option-group" data-option="lang" role="group" aria-label="Poster language">
                                ${optionButtons({ zh: { label: '中文' }, en: { label: 'ENGLISH' } }, state.lang, 'share-option-btn', option => option.label)}
                            </div>
                        </div>

                        <div class="share-control-section">
                            <span class="share-control-label"><span class="lang-zh">视觉风格</span><span class="lang-en">VISUAL STYLE</span></span>
                            <div class="glass-pill-group share-option-group share-option-group-3" data-option="style" role="group" aria-label="Poster style">
                                ${optionButtons(STYLES, state.style, 'share-option-btn', option => `<span class="lang-zh">${option.labelZh}</span><span class="lang-en">${option.labelEn}</span>`)}
                            </div>
                        </div>

                        <div class="share-control-section">
                            <span class="share-control-label"><span class="lang-zh">尺寸</span><span class="lang-en">FORMAT</span></span>
                            <div class="glass-pill-group share-option-group" data-option="format" role="group" aria-label="Poster format">
                                ${optionButtons(FORMATS, state.format, 'share-option-btn', option => `<span class="lang-zh">${option.labelZh}</span><span class="lang-en">${option.labelEn}</span>`)}
                            </div>
                        </div>

                        <div class="share-link-preview" title="${escapeHtml(shareUrl)}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            <span>${escapeHtml(shareUrl)}</span>
                        </div>

                        <div class="share-action-buttons">
                            <button type="button" class="share-action-btn copy-btn glass-btn" id="share-copy-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                <span class="lang-zh">复制链接</span><span class="lang-en">Copy Link</span>
                            </button>
                            <button type="button" class="share-action-btn image-btn glass-btn glass-btn-primary" id="share-image-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span class="lang-zh">保存海报</span><span class="lang-en">Save Poster</span>
                            </button>
                        </div>

                        <p class="share-privacy-note">
                            <span class="lang-zh">二维码仅包含当前档案链接；海报只标注区域级坐标，不含精确拍摄位置。</span>
                            <span class="lang-en">The QR code holds only the archive link; coordinates are regional, never the exact shooting spot.</span>
                        </p>
                    </section>
                </div>
            </div>
        `;

        const canvas = modal.querySelector('#share-poster-canvas');
        const sizeLabel = modal.querySelector('#share-poster-size');
        const previewNode = modal.querySelector('#share-card-preview-node');
        let renderToken = 0;

        const render = async () => {
            const token = ++renderToken;
            previewNode.classList.add('is-rendering');
            // Draw into an offscreen canvas first so switching options never flashes a blank frame.
            const buffer = document.createElement('canvas');
            await renderPoster(buffer, { item, type, lang: state.lang, style: state.style, format: state.format, shareUrl });
            if (token !== renderToken) return;
            canvas.width = buffer.width;
            canvas.height = buffer.height;
            canvas.getContext('2d').drawImage(buffer, 0, 0);
            previewNode.dataset.format = state.format;
            sizeLabel.textContent = `PNG · ${buffer.width} × ${buffer.height}`;
            previewNode.classList.remove('is-rendering');
        };

        render().catch(error => {
            console.error('Poster render failed:', error);
            showToast('海报渲染失败', 'Poster rendering failed');
        });

        const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                modal.classList.add('show');
                modal.querySelector('#share-modal-close')?.focus({ preventScroll: true });
            });
        });

        modal.querySelectorAll('.share-option-group').forEach(group => {
            const key = group.dataset.option;
            const buttons = [...group.querySelectorAll('.share-option-btn')];
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    const value = button.dataset.value;
                    if (state[key] === value) return;
                    state[key] = value;
                    buttons.forEach(other => {
                        other.classList.toggle('active', other === button);
                        other.setAttribute('aria-pressed', String(other === button));
                    });
                    if (key === 'lang') modal.className = `share-popup-modal modal-lang-${value} show`;
                    render().catch(error => console.error('Poster render failed:', error));
                });
            });
        });

        const closeModal = () => {
            if (modal.hidden) return;
            window.clearTimeout(modal._shareCloseTimer);
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            modal._shareCloseTimer = window.setTimeout(() => {
                modal.hidden = true;
                document.body.classList.remove('modal-open');
                document.documentElement.style.removeProperty('--scrollbar-compensation');
                document.removeEventListener('keydown', handleModalKeydown);
                if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
            }, 320);
        };

        const handleModalKeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeModal();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
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
        };

        modal.querySelector('#share-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', event => {
            if (event.target === modal) closeModal();
        });
        document.addEventListener('keydown', handleModalKeydown);

        modal.querySelector('#share-copy-btn').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('链接已复制', 'Link copied to clipboard');
            } catch (error) {
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast('链接已复制', 'Link copied to clipboard');
                } catch (fallbackError) {
                    showToast('复制失败，请手动复制', 'Failed to copy, please copy manually');
                }
                textArea.remove();
            }
        });

        const saveButton = modal.querySelector('#share-image-btn');
        saveButton.addEventListener('click', async () => {
            if (window.location.protocol === 'file:') {
                showToast(
                    '本地文件协议(file://)下浏览器禁止导出图片，请通过本地服务器打开网页。',
                    'Browsers block image export on file://. Please run the site via a local server.'
                );
                return;
            }

            saveButton.disabled = true;
            const originalHtml = saveButton.innerHTML;
            saveButton.innerHTML = `
                <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10"></path></svg>
                <span>${state.lang === 'en' ? 'Rendering…' : '正在生成…'}</span>`;

            try {
                const output = await renderPoster(document.createElement('canvas'), {
                    item, type, lang: state.lang, style: state.style, format: state.format, shareUrl
                });
                const blob = await canvasToBlob(output);
                const loc = typeof parseLocation === 'function' ? parseLocation(item.location || '') : null;
                const filename = `stevenzhang-${type}-${String(item.id).padStart(2, '0')}-${slugify(loc?.enTitle || item.titleEn)}-${state.style}-${state.format === 'story' ? '9x16' : '4x5'}.png`;
                const file = typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null;
                const preferShareSheet = window.matchMedia('(pointer: coarse)').matches && file && navigator.canShare?.({ files: [file] });

                if (preferShareSheet) {
                    try {
                        await navigator.share({ files: [file], title: 'STEVEN ZHANG' });
                        showToast('海报已准备好', 'Poster ready to share');
                    } catch (error) {
                        if (error.name !== 'AbortError') throw error;
                    }
                } else {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
                    showToast('海报已保存', 'Poster saved');
                }
            } catch (error) {
                console.error('Poster export failed:', error);
                showToast('生成图片失败，请重试', 'Failed to generate poster, please retry');
            } finally {
                saveButton.disabled = false;
                saveButton.innerHTML = originalHtml;
            }
        });
    };

})();
