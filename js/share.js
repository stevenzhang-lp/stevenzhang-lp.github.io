(function() {
    // Flag to check if qrcode and html2canvas scripts are loaded
    let librariesLoadingPromise = null;

    // Helper to load external scripts dynamically
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    // Load libraries on demand
    function loadLibraries() {
        if (librariesLoadingPromise) return librariesLoadingPromise;

        const promises = [];
        if (typeof QRCode === 'undefined') {
            promises.push(loadScript('js/qrcode.min.js'));
        }
        if (typeof html2canvas === 'undefined') {
            promises.push(loadScript('js/html2canvas.min.js'));
        }

        librariesLoadingPromise = Promise.all(promises);
        return librariesLoadingPromise;
    }

    // Helper to show a toast message
    function showToast(zhMsg, enMsg) {
        let lang = document.body.classList.contains('lang-en') ? 'en' : 'zh';
        const modal = document.getElementById('share-popup-modal');
        if (modal && modal.classList.contains('show')) {
            lang = modal.classList.contains('modal-lang-en') ? 'en' : 'zh';
        }
        const msg = lang === 'en' ? enMsg : zhMsg;

        let toast = document.getElementById('share-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'share-toast';
            toast.className = 'share-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        toast.textContent = msg;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    function truncateText(text, maxLength) {
        const normalized = String(text || '').replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) return normalized;
        return `${normalized.slice(0, maxLength).trim()}…`;
    }

    // Main share modal function
    // Helper to generate the premium poster card markup
    function createPosterCardMarkup(item, type, lang, qrCodeId, style = 'classic') {
        let primaryCategory = "";
        let secondaryCategory = "";
        if (lang === 'en') {
            primaryCategory = "VOYAGE ARCHIVE";
            if (type === 'voyage') {
                secondaryCategory = "PHOTOGRAPHY";
            } else if (type === 'diary') {
                secondaryCategory = "DIARY";
            } else if (type === 'journal') {
                secondaryCategory = "JOURNAL";
            } else {
                secondaryCategory = "HUB";
            }
        } else {
            primaryCategory = "时空档案室";
            if (type === 'voyage') {
                secondaryCategory = "摄影";
            } else if (type === 'diary') {
                secondaryCategory = "随笔";
            } else if (type === 'journal') {
                secondaryCategory = "沉淀";
            } else {
                secondaryCategory = "主站";
            }
        }

        let locationZh = "";
        let locationEn = "";
        if (type === 'voyage' && !item.isPage) {
            if (typeof parseLocation === 'function' && typeof parseDate === 'function') {
                const loc = parseLocation(item.location);
                const dateLoc = parseDate(item.date);
                locationZh = `${loc.zhSub} · ${loc.zhTitle} | ${dateLoc.zh}`;
                locationEn = `${loc.enSub} · ${loc.enTitle} | ${dateLoc.en}`;
            } else {
                locationZh = item.location || "";
                locationEn = item.location || "";
            }
        } else {
            const catZh = item.categoryZh ? `${item.categoryZh} | ` : "";
            const catEn = item.categoryEn ? `${item.categoryEn} | ` : "";
            locationZh = `${catZh}${item.date || ""}`;
            locationEn = `${catEn}${item.date || ""}`;
        }

        const contentZh = truncateText((type === 'voyage' ? item.storyZh : item.contentZh) || "", 180);
        const contentEn = truncateText((type === 'voyage' ? item.storyEn : item.contentEn) || "", 260);

        return `
            <div class="share-poster-card style-${style}">
                <div class="poster-inner-frame">
                    <div class="poster-category">
                        <div class="poster-category-primary">${primaryCategory}</div>
                    </div>
                    
                    ${item.image ? `
                        <div class="poster-image-container">
                            <img src="${item.image}" class="poster-image" alt="">
                        </div>
                    ` : `
                        <div class="poster-text-art">
                            <div class="poster-quote-mark">“</div>
                            <h4 class="poster-art-title">${lang === 'en' ? (item.titleEn || item.titleZh || '') : (item.titleZh || item.titleEn || '')}</h4>
                            <span class="poster-art-sub">${secondaryCategory}</span>
                        </div>
                    `}
                    
                    <div class="poster-details">
                        ${lang === 'en' 
                            ? `<h2 class="poster-title-en">${item.titleEn || item.titleZh || ''}</h2>` 
                            : `<h2 class="poster-title-zh">${item.titleZh || item.titleEn || ''}</h2>`
                        }
                        <div class="poster-meta-row">${lang === 'en' ? locationEn : locationZh}</div>
                    </div>
                    
                    <div class="poster-content">
                        ${lang === 'en'
                            ? `<p class="poster-text-en">${contentEn || contentZh || ''}</p>`
                            : `<p class="poster-text-zh">${contentZh || contentEn || ''}</p>`
                        }
                    </div>

                    ${type === 'voyage' && item.exif ? `<div class="poster-exif">${item.exif}</div>` : ''}
                    
                    <div class="poster-footer">
                        <div class="poster-footer-branding">
                            <div class="poster-brand-name">STEVEN ZHANG</div>
                            <div class="poster-brand-sub">
                                ${lang === 'en' ? 'Scan to explore details' : '扫码探索档案详情'}
                            </div>
                        </div>
                        <div class="poster-qrcode-box" id="${qrCodeId}"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Main share modal function
    window.openShareModal = async function(item, type) {
        // 1. Create loader or disable trigger while loading libraries
        const initialLang = document.body.classList.contains('lang-en') ? 'en' : 'zh';
        let currentModalLang = initialLang;
        let currentPosterStyle = 'classic';
        const returnFocus = document.activeElement;
        
        // Show loading state toast
        showToast("正在载入分享组件...", "Loading share components...");

        try {
            await loadLibraries();
        } catch (err) {
            console.error(err);
            showToast("组件加载失败，请检查网络", "Failed to load sharing components, check network");
            return;
        }

        // 2. Generate URL
        let baseUrl = window.location.origin;
        if (baseUrl === 'null' || !baseUrl.startsWith('http')) {
            // Fallback for file:// or offline mode
            baseUrl = 'https://stevenzhangym.com';
        }
        const pageByType = {
            voyage: 'voyage.html',
            diary: 'diary.html',
            journal: 'journal.html'
        };
        const shareUrl = item.isPage
            ? `${baseUrl}/${item.pagePath}`
            : `${baseUrl}/${pageByType[type] || 'index.html'}?id=${encodeURIComponent(item.id)}`;

        // 3. Inject share modal markup if not present
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
        // Set the active class on modal
        modal.className = `share-popup-modal modal-lang-${currentModalLang}`;

        // Get labels
        const labels = {
            titleZh: "分享档案",
            titleEn: "SHARE ARCHIVE",
            descZh: "链接将指引访问者至固定分享页面，图片包含此页的所有信息与底部的二维码。",
            descEn: "The link directs visitors to the share page. The image contains all details and a QR code.",
            copyZh: "复制链接",
            copyEn: "Copy Link",
            imageZh: "保存分享图",
            imageEn: "Save Poster",
            closeZh: "关闭",
            closeEn: "Close",
            generatingZh: "正在生成图片...",
            generatingEn: "Generating image...",
            successZh: "链接已复制",
            successEn: "Link copied to clipboard",
            errCopyZh: "复制失败，请手动复制",
            errCopyEn: "Failed to copy, please copy manually"
        };

        // Render modal UI
        modal.innerHTML = `
            <div class="share-popup-content glass-panel" tabindex="-1">
                <header class="share-modal-header">
                    <div>
                        <p class="share-modal-eyebrow">
                            <span class="lang-zh">创建分享</span><span class="lang-en">CREATE &amp; SHARE</span>
                        </p>
                        <h2 class="share-modal-title" id="share-modal-title">
                            <span class="lang-zh">${labels.titleZh}</span>
                            <span class="lang-en">${labels.titleEn}</span>
                        </h2>
                        <p class="share-modal-desc">
                            <span class="lang-zh">预览并定制你的档案海报。</span>
                            <span class="lang-en">Preview and customize your archive poster.</span>
                        </p>
                    </div>
                    <button class="share-close-btn" id="share-modal-close" type="button" aria-label="${currentModalLang === 'en' ? labels.closeEn : labels.closeZh}">&times;</button>
                </header>

                <div class="share-layout">
                    <section class="share-preview-column" aria-label="Poster preview">
                        <div class="share-preview-toolbar">
                            <span><span class="lang-zh">海报预览</span><span class="lang-en">POSTER PREVIEW</span></span>
                            <span>PNG · 1200 PX</span>
                        </div>
                        <div class="share-preview-container">
                            <div class="share-card-preview" id="share-card-preview-node">
                                ${createPosterCardMarkup(item, type, currentModalLang, 'preview-qrcode', currentPosterStyle)}
                            </div>
                        </div>
                    </section>

                    <section class="share-controls-column">
                        <div class="share-control-section">
                            <span class="share-control-label"><span class="lang-zh">海报语言</span><span class="lang-en">POSTER LANGUAGE</span></span>
                            <div class="share-lang-btn-group glass-pill-group" role="group" aria-label="Poster language">
                                <button type="button" class="share-lang-btn glass-pill-btn ${currentModalLang === 'zh' ? 'active' : ''}" data-lang="zh" aria-pressed="${currentModalLang === 'zh'}">中文</button>
                                <button type="button" class="share-lang-btn glass-pill-btn ${currentModalLang === 'en' ? 'active' : ''}" data-lang="en" aria-pressed="${currentModalLang === 'en'}">ENGLISH</button>
                            </div>
                        </div>

                        <div class="share-control-section">
                            <span class="share-control-label"><span class="lang-zh">视觉风格</span><span class="lang-en">VISUAL STYLE</span></span>
                            <div class="share-style-btn-group glass-pill-group" role="group" aria-label="Poster style">
                                <button type="button" class="share-style-btn glass-pill-btn ${currentPosterStyle === 'classic' ? 'active' : ''}" data-style="classic" aria-pressed="${currentPosterStyle === 'classic'}">
                                    <span class="lang-zh">深色经典</span><span class="lang-en">Dark Classic</span>
                                </button>
                                <button type="button" class="share-style-btn glass-pill-btn ${currentPosterStyle === 'minimal' ? 'active' : ''}" data-style="minimal" aria-pressed="${currentPosterStyle === 'minimal'}">
                                    <span class="lang-zh">纸张极简</span><span class="lang-en">Paper Minimal</span>
                                </button>
                            </div>
                        </div>

                        <div class="share-link-preview" title="${shareUrl}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            <span>${shareUrl}</span>
                        </div>

                        <div class="share-action-buttons">
                            <button type="button" class="share-action-btn copy-btn glass-btn" id="share-copy-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                <span class="lang-zh">${labels.copyZh}</span>
                                <span class="lang-en">${labels.copyEn}</span>
                            </button>
                            <button type="button" class="share-action-btn image-btn glass-btn glass-btn-primary" id="share-image-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span class="lang-zh">${labels.imageZh}</span>
                                <span class="lang-en">${labels.imageEn}</span>
                            </button>
                        </div>

                        <p class="share-privacy-note">
                            <span class="lang-zh">二维码仅包含当前档案链接，不包含精确拍摄位置。</span>
                            <span class="lang-en">The QR code contains only the archive link, never the exact shooting location.</span>
                        </p>
                    </section>
                </div>
            </div>

            <!-- Off-screen High-Resolution Poster Card for Capture (Fixed 600px width) -->
            <div id="share-poster-capture" class="share-poster-capture">
                ${createPosterCardMarkup(item, type, currentModalLang, 'capture-qrcode', currentPosterStyle)}
            </div>
        `;

        // 4. Generate QR Codes Helper
        function generateQRCodes() {
            const previewQrNode = document.getElementById('preview-qrcode');
            const captureQrNode = document.getElementById('capture-qrcode');

            if (!previewQrNode || !captureQrNode) return;

            if (typeof QRCode !== 'undefined') {
                previewQrNode.innerHTML = '';
                captureQrNode.innerHTML = '';

                // Generate preview QR code (smaller)
                new QRCode(previewQrNode, {
                    text: shareUrl,
                    width: 64,
                    height: 64,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // Generate poster QR code (larger, high contrast)
                new QRCode(captureQrNode, {
                    text: shareUrl,
                    width: 88,
                    height: 88,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                previewQrNode.innerHTML = 'Scan';
                captureQrNode.innerHTML = 'Scan';
            }
        }

        // Initial generation of QR Codes
        generateQRCodes();

        // Show modal from a painted initial state so the transition is visible.
        const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                modal.classList.add('show');
                modal.querySelector('#share-modal-close')?.focus({ preventScroll: true });
            });
        });

        // Bind language switching event listeners
        const langBtns = modal.querySelectorAll('.share-lang-btn');
        langBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetLang = btn.getAttribute('data-lang');
                if (targetLang === currentModalLang) return;

                currentModalLang = targetLang;

                // Update active state of language switcher buttons
                langBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                // Update modal wrapper classes to toggle language
                modal.className = `share-popup-modal modal-lang-${currentModalLang} show`;

                // Re-render poster nodes with new language
                const previewContainer = document.getElementById('share-card-preview-node');
                const captureContainer = document.getElementById('share-poster-capture');
                
                if (previewContainer) {
                    previewContainer.innerHTML = createPosterCardMarkup(item, type, currentModalLang, 'preview-qrcode', currentPosterStyle);
                }
                if (captureContainer) {
                    captureContainer.innerHTML = createPosterCardMarkup(item, type, currentModalLang, 'capture-qrcode', currentPosterStyle);
                }

                // Regenerate QR Codes for the updated DOM nodes
                generateQRCodes();
            });
        });

        // Bind style switching event listeners
        const styleBtns = modal.querySelectorAll('.share-style-btn');
        styleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetStyle = btn.getAttribute('data-style');
                if (targetStyle === currentPosterStyle) return;

                currentPosterStyle = targetStyle;

                // Update active state of style switcher buttons
                styleBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                // Re-render poster nodes with new style
                const previewContainer = document.getElementById('share-card-preview-node');
                const captureContainer = document.getElementById('share-poster-capture');
                
                if (previewContainer) {
                    previewContainer.innerHTML = createPosterCardMarkup(item, type, currentModalLang, 'preview-qrcode', currentPosterStyle);
                }
                if (captureContainer) {
                    captureContainer.innerHTML = createPosterCardMarkup(item, type, currentModalLang, 'capture-qrcode', currentPosterStyle);
                }

                // Regenerate QR Codes for the updated DOM nodes
                generateQRCodes();
            });
        });

        // Close handlers
        const closeBtn = document.getElementById('share-modal-close');
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

        const handleModalKeydown = (event) => {
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

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', handleModalKeydown);

        // Copy Link Action
        document.getElementById('share-copy-btn').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast(labels.successZh, labels.successEn);
            } catch (err) {
                // Fallback for browsers with restricted clipboard permission
                const textArea = document.createElement("textarea");
                textArea.value = shareUrl;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast(labels.successZh, labels.successEn);
                } catch (e) {
                    console.error("Clipboard fallback failed:", e);
                    showToast(labels.errCopyZh, labels.errCopyEn);
                }
                document.body.removeChild(textArea);
            }
        });

        // Save Image Action
        const saveImgBtn = document.getElementById('share-image-btn');
        saveImgBtn.addEventListener('click', async () => {
            // Check for file:// protocol
            if (window.location.protocol === 'file:') {
                showToast(
                    "检测到本地文件协议(file://)，浏览器安全限制无法下载分享图。请使用本地服务器运行网页。",
                    "Detected local file protocol (file://). Browser security restricts downloading share posters. Please run via a local server."
                );
                return;
            }

            const captureTarget = document.getElementById('share-poster-capture');
            if (!captureTarget) return;

            saveImgBtn.disabled = true;
            const originalHtml = saveImgBtn.innerHTML;
            
            // Set generating message
            saveImgBtn.innerHTML = `
                <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                <span>${currentModalLang === 'en' ? labels.generatingEn : labels.generatingZh}</span>
            `;

            // Wait brief moment for any dynamic rendering
            setTimeout(async () => {
                try {
                    // Ensure all images are decoded and loaded
                    const images = captureTarget.querySelectorAll('img');
                    const loadPromises = Array.from(images).map(img => {
                        if (img.complete && img.naturalWidth !== 0) {
                            if (typeof img.decode === 'function') {
                                return img.decode().catch(() => {});
                            }
                            return Promise.resolve();
                        }
                        return new Promise((resolve) => {
                            img.onload = () => {
                                if (typeof img.decode === 'function') {
                                    img.decode().then(resolve).catch(resolve);
                                } else {
                                    resolve();
                                }
                            };
                            img.onerror = resolve; // Resolve anyway to not block
                        });
                    });
                    await Promise.all(loadPromises);

                    const canvas = await html2canvas(captureTarget, {
                        useCORS: true,
                        allowTaint: false, // Set to false so toDataURL works without security block
                        scale: 2, // 2x for Retina quality
                        backgroundColor: '#121212'
                    });

                    // Convert to image download
                    const imgData = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    const filename = `archive_share_${type}_${item.id}.png`;
                    link.download = filename;
                    link.href = imgData;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    showToast("分享图生成成功", "Share poster saved successfully");
                } catch (err) {
                    console.error("Poster generation failed:", err);
                    showToast("生成图片失败，请重试", "Failed to generate poster, please retry");
                } finally {
                    saveImgBtn.disabled = false;
                    saveImgBtn.innerHTML = originalHtml;
                }
            }, 300);
        });
    };
})();
