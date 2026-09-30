const CURRENT_RESULTS_DIR = 'results/NS-CS-FT1/';
const DATA_JSON_URL = 'data.json?v=1';

// Reveal-on-scroll fade should only play the user's first time through in a
// given browser session — repeat loads/reloads in the same session skip it.
const REVEAL_SESSION_KEY = 'bigboxRevealFadePlayed';
let isFirstSessionVisit = true;
try {
    isFirstSessionVisit = !sessionStorage.getItem(REVEAL_SESSION_KEY);
    sessionStorage.setItem(REVEAL_SESSION_KEY, '1');
} catch (e) {
    isFirstSessionVisit = true; // sessionStorage unavailable (e.g. private mode) — default to animating
}

document.addEventListener('DOMContentLoaded', () => {
    initModelProgressBars();
    initImageLoadingHints();

    // Modal Events
    const modalBtn = document.getElementById('modalCloseBtn');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (modalBtn) modalBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    // Allow closing via Escape key
    document.addEventListener('keydown', function(event) {
        const modal = document.getElementById('sensorModal');
        if (event.key === "Escape" && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });

    // Initialize Tabs
    initDeferredMedia();
    initRevealAnimations();
    const hash = window.location.hash.replace('#', '') || 'introduction';
    switchTab(hash, true); // true = no animation on initial load

});

let stateData = null;
let stateDataPromise = null;
let specificationsRendered = false;
let resultImagesLoaded = false;
let revealObserver = null;
let deferredMediaObserver = null;
let resultChartObserver = null;
let modelObserver = null;

const resultChartInitializers = {
    'chart-temperature': 'initTemperatureChart',
    'chart-frost-heave': 'initFrostHeaveChart',
    'chart-water-content': 'initWaterContentChart',
    'chart-temp-profile': 'initTempProfileChart'
};

const modelVisibility = new Map();

const EXTERNAL_SCRIPTS = {
    chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    hammer: 'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
    chartZoom: 'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
    modelViewer: 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
};

const scriptPromises = {};

document.addEventListener('visibilitychange', () => {
    updateModelRotationStates();
    if (document.visibilityState === 'visible') {
        resizeVisibleResultCharts();
    }
});

function initModelProgressBars() {
    document.querySelectorAll('model-viewer').forEach(modelViewer => {
        if (modelViewer.dataset.progressReady === 'true') return;
        modelViewer.dataset.progressReady = 'true';

        const progress = modelViewer.querySelector('.progress-bar');
        const updateBar = modelViewer.querySelector('.update-bar');
        if (!progress || !updateBar) return;

        modelViewer.addEventListener('progress', event => {
            const percent = event.detail.totalProgress * 100;
            updateBar.style.width = `${percent}%`;
            progress.classList.toggle('hide', percent === 100);
        });
    });
}

function initImageLoadingHints() {
    document.querySelectorAll('img:not(.home-hero-bg):not(.header-logo)').forEach(img => {
        if (!img.hasAttribute('loading')) img.loading = 'lazy';
        img.decoding = 'async';
        if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
    });
}

function loadExternalScript(key, { type } = {}) {
    if (scriptPromises[key]) return scriptPromises[key];

    const src = EXTERNAL_SCRIPTS[key];
    scriptPromises[key] = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-lazy-script="${key}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.lazyScript = key;
        if (type) script.type = type;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => {
            delete scriptPromises[key];
            reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(script);
    });

    return scriptPromises[key];
}

async function ensureChartLibraries() {
    if (!window.Chart) await loadExternalScript('chart');
    if (!window.Hammer) await loadExternalScript('hammer');
    await loadExternalScript('chartZoom');
}

function prepareResultsAssets() {
    loadResultImagesFromFolder();
    observeResultCharts();
}

async function initResultsCharts() {
    loadResultImagesFromFolder();
    observeResultCharts();
}

function observeResultCharts() {
    const resultsSection = document.getElementById('results');
    if (!resultsSection) return;

    const canvases = Array.from(resultsSection.querySelectorAll('canvas[id]'))
        .filter(canvas => resultChartInitializers[canvas.id]);
    if (!canvases.length) return;

    if (!('IntersectionObserver' in window)) {
        canvases.forEach(initResultChartForCanvas);
        return;
    }

    if (!resultChartObserver) {
        resultChartObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                resultChartObserver.unobserve(entry.target);
                initResultChartForCanvas(entry.target);
            });
        }, { root: null, rootMargin: '300px 0px', threshold: 0.01 });
    }

    canvases.forEach(canvas => {
        if (canvas.dataset.chartInitialized === 'true' || canvas.dataset.chartObserved === 'true') return;
        canvas.dataset.chartObserved = 'true';
        resultChartObserver.observe(canvas);
    });
}

async function initResultChartForCanvas(canvas) {
    if (!canvas || canvas.dataset.chartInitialized === 'true' || canvas.dataset.chartInitializing === 'true') return;

    const section = canvas.closest('.page-section');
    if (section && !section.classList.contains('active')) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        setTimeout(() => initResultChartForCanvas(canvas), 120);
        return;
    }

    const initializerName = resultChartInitializers[canvas.id];
    const initializer = window[initializerName];
    if (typeof initializer !== 'function') return;

    canvas.dataset.chartInitializing = 'true';
    try {
        await ensureChartLibraries();
        await initializer();
        canvas.dataset.chartInitialized = 'true';
        resizeVisibleResultCharts();
    } catch (error) {
        delete canvas.dataset.chartObserved;
        console.error(`Chart initialization failed for ${canvas.id}:`, error);
    } finally {
        delete canvas.dataset.chartInitializing;
    }
}

function resizeVisibleResultCharts() {
    document.querySelectorAll('#results canvas[id]').forEach(canvas => {
        if (!canvas._chartInstance) return;
        const section = canvas.closest('.page-section');
        if (section && !section.classList.contains('active')) return;
        requestAnimationFrame(() => canvas._chartInstance.resize());
    });
}

function initRevealAnimations() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
        return;
    }

    revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
            setTimeout(() => {
                entry.target.style.willChange = 'auto';
            }, 1050);
        });
    }, { root: null, rootMargin: '160px 0px', threshold: 0.02 });
}

function queueReveal(el) {
    if (!el || el.dataset.revealQueued === 'true') return;
    el.dataset.revealQueued = 'true';
    el.classList.add('reveal-on-scroll');
    el.style.willChange = 'opacity, transform';
    if (!el.matches('img, canvas, model-viewer')) {
        el.classList.add('defer-render');
    }
    if (revealObserver) {
        revealObserver.observe(el);
    } else {
        el.classList.add('is-visible');
    }
}

function showImmediately(el) {
    if (!el) return;
    if (revealObserver) revealObserver.unobserve(el);
    el.dataset.revealQueued = 'true';
    el.classList.remove('reveal-on-scroll', 'defer-render');
    el.classList.add('is-visible');
    el.style.willChange = 'auto';
}

function shouldShowImmediately(el, section) {
    if (!el || !section) return true;
    if (!isFirstSessionVisit) return true;
    if (el.closest('.home-hero-shell')) return true;

    const firstChild = Array.from(section.children).find(child => child.nodeType === Node.ELEMENT_NODE);
    if (firstChild && (el === firstChild || firstChild.contains(el))) return true;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return rect.top < window.innerHeight * 0.82 && rect.bottom > 0;
}

function observeSectionReveal(section) {
    if (!section) return;
    section.querySelectorAll(':scope > :not(.home-hero-shell)')
        .forEach(el => {
            if (shouldShowImmediately(el, section)) {
                showImmediately(el);
            } else {
                queueReveal(el);
            }
        });
}

let soilStatsInit = false;

function animateStatCount(el, duration = 1300) {
    const target = parseInt(el.dataset.target, 10) || 0;
    const start = performance.now();
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * easeOutCubic(progress)).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function initSoilStatCounters() {
    if (soilStatsInit) return;
    const container = document.getElementById('soil-material-stats');
    if (!container) return;
    soilStatsInit = true;

    const numbers = Array.from(container.querySelectorAll('.stat-number'));
    if (!numbers.length) return;

    const playAll = () => numbers.forEach(el => animateStatCount(el));

    if (!('IntersectionObserver' in window)) {
        playAll();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            playAll();
        });
    }, { root: null, threshold: 0.3 });

    observer.observe(container);
}

function initDeferredMedia() {
    const media = document.querySelectorAll('img[data-src]');
    if (!media.length) return;

    if (!('IntersectionObserver' in window)) {
        media.forEach(loadDeferredImage);
        return;
    }

    deferredMediaObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            loadDeferredImage(entry.target);
            deferredMediaObserver.unobserve(entry.target);
        });
    }, { root: null, rootMargin: '600px 0px', threshold: 0.01 });

    media.forEach(img => deferredMediaObserver.observe(img));
}

function loadDeferredImage(img) {
    if (!img || img.dataset.loadedSrc === 'true') return;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    img.dataset.loadedSrc = 'true';
}

function observeDeferredMedia(root) {
    if (!root) return;
    root.querySelectorAll('img[data-src]').forEach(img => {
        if (img.dataset.loadedSrc === 'true') return;
        if (deferredMediaObserver) {
            deferredMediaObserver.observe(img);
        } else {
            loadDeferredImage(img);
        }
    });
}

const NAV_ALIAS = {
    'results-s-cs-ft1': 'results',
    'testing-program': 'experimental',
};

function normalizeTabId(tabId) {
    const validTabs = ['introduction', 'instrumentation', 'experimental', 'results', 'results-s-cs-ft1', 'testing-program'];
    return validTabs.includes(tabId) ? tabId : 'introduction';
}

function activateSectionResources(targetId, targetSection) {
    observeDeferredMedia(targetSection);
    observeSectionReveal(targetSection);

    if (targetId === 'experimental') {
        initSoilStatCounters();
    }

    if (targetId === 'results') {
        prepareResultsAssets();
        resizeVisibleResultCharts();
    }

    if (targetId === 'instrumentation') {
        loadSpecificationsData().catch(error => console.error('Specification data load failed:', error));
        lazyLoadModels();
    } else {
        pauseAllModels();
    }
}

function switchTab(targetId, initialLoad = false) {
    targetId = normalizeTabId(targetId);
    const navTargetId = NAV_ALIAS[targetId] || targetId;

    // 1. Update Navigation Underlines
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'text-primary');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(navTargetId)) {
            link.classList.add('active', 'text-primary');
        }
    });

    // 2. Handle Section Transitions
    const sections = Array.from(document.querySelectorAll('.page-section'));
    const activeSection = sections.find(s => s.classList.contains('active'));
    const targetSection = document.getElementById(targetId);

    if (!targetSection) return;
    
    // Update URL hash without jumping
    history.pushState(null, null, `#${targetId}`);

    if (initialLoad) {
        sections.forEach(s => {
            s.classList.remove('active', 'show');
            s.style.display = 'none';
        });
        targetSection.style.display = 'flex';
        targetSection.classList.add('active', 'show');
        activateSectionResources(targetId, targetSection);
        return;
    }

    if (activeSection === targetSection) {
        activateSectionResources(targetId, targetSection);
        return;
    }

    if (activeSection) {
        if (activeSection.id === 'instrumentation' && targetId !== 'instrumentation') {
            pauseAllModels();
        }

        activeSection.classList.remove('show');
        
        setTimeout(() => {
            activeSection.classList.remove('active');
            activeSection.style.display = 'none';

            targetSection.style.display = 'flex';
            targetSection.classList.add('active');

            requestAnimationFrame(() => {
                targetSection.classList.add('show');
                activateSectionResources(targetId, targetSection);
            });
        }, 220);
    }
}

function goToExperimentalSection(anchorId) {
    const alreadyActive = document.getElementById('experimental')?.classList.contains('active');
    switchTab('experimental');

    const scrollToAnchor = () => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (alreadyActive) {
        scrollToAnchor();
    } else {
        setTimeout(scrollToAnchor, 260);
    }
}

// ── Nav dropdowns: persistent selection highlight + auto-close ──
function selectDropdownItem(btn, action) {
    const menu = btn.closest('.nav-dropdown-menu');
    if (menu) {
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('is-selected');
            const check = item.querySelector('.dropdown-check');
            if (check) check.classList.add('hidden');
        });
        btn.classList.add('is-selected');
        const check = btn.querySelector('.dropdown-check');
        if (check) check.classList.remove('hidden');
    }

    const dropdown = btn.closest('.nav-dropdown');
    const active = document.activeElement;
    if (dropdown && active && dropdown.contains(active)) active.blur();

    action();
}

function closeOpenNavDropdowns() {
    const active = document.activeElement;
    if (active && active.closest && active.closest('.nav-dropdown')) {
        active.blur();
    }
}

document.addEventListener('click', event => {
    if (!event.target.closest('.nav-dropdown')) closeOpenNavDropdowns();
});

const RESULT_FIGURES = {
    'img-dfos-strain':   'DFOS results_base strain.jpg',
    'img-dfos-temp':     'DFOS results_subgrade strain.jpg',
    'img-dcp-results':   'DCP results.jpg',
    'img-plate-loading': 'Plate loading results.jpg'
};

function loadResultImagesFromFolder() {
    if (resultImagesLoaded) return;

    Object.entries(RESULT_FIGURES).forEach(([imgId, fileName]) => {
        const imgEl = document.getElementById(imgId);
        const phEl  = document.getElementById('placeholder-' + imgId.replace('img-', ''));
        if (!imgEl) return;
        const figureId  = imgId.replace('img-', '');
        const folderUrl = new URL(CURRENT_RESULTS_DIR + encodeURIComponent(fileName), document.baseURI).href;
        // initImageLoadingHints() stamps loading="lazy" on every <img> at page load.
        // Native lazy-loading never fires for an element that's display:none (via the
        // "hidden" class here), so it would defer this fetch forever. We're already
        // loading intentionally (the Results tab is active) — force it eager.
        imgEl.loading = 'eager';
        imgEl.decoding = 'async';
        imgEl.onload  = () => {
            // Ignore load events for anything other than the folder file itself
            // (e.g. a user-uploaded data URL later assigned to this same <img>).
            if (imgEl.src !== folderUrl) return;
            imgEl.classList.remove('hidden');
            imgEl.classList.add('zoomable');
            if (phEl) phEl.classList.add('hidden');
            imgEl.dataset.folderLoaded = 'true';
            renderFigureState(figureId, fileName);
        };
        imgEl.onerror = () => {
            if (imgEl.src !== folderUrl) return;
            imgEl.classList.add('hidden');
            if (phEl) { phEl.classList.remove('hidden'); phEl.textContent = `Could not load ${fileName}`; }
            imgEl.dataset.folderLoaded = 'false';
            renderFigureState(figureId, fileName);
        };
        // Load directly rather than deferring via IntersectionObserver: the element
        // starts with display:none (the "hidden" class) until it loads, so it has no
        // layout box and can never register an intersection — deferred loading would
        // never fire. The Results tab is already active by the time this runs anyway.
        imgEl.src = folderUrl;
        renderFigureState(figureId, fileName);
    });

    resultImagesLoaded = true;
}

// ── Figure upload/download (client-side only; stored as data URLs in localStorage) ──
const FIGURE_UPLOAD_STORAGE_KEY = 'bigboxFigureUploads';

function getFigureUploads() {
    try {
        return JSON.parse(localStorage.getItem(FIGURE_UPLOAD_STORAGE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderFigureState(figureId, folderFile) {
    const img          = document.getElementById('img-' + figureId);
    const phEl         = document.getElementById('placeholder-' + figureId);
    const statusEl      = document.getElementById('figure-status-' + figureId);
    const downloadLink  = document.getElementById('figure-download-' + figureId);
    const clearBtn      = document.getElementById('figure-clear-' + figureId);
    if (!img) return;

    const upload = getFigureUploads()[figureId];

    if (upload) {
        img.src = upload.dataUrl;
        img.classList.remove('hidden');
        img.classList.add('zoomable');
        if (phEl) phEl.classList.add('hidden');
        if (statusEl) statusEl.textContent = `Custom upload: ${upload.name} (${formatFileSize(upload.size)})`;
        if (downloadLink) {
            downloadLink.href = upload.dataUrl;
            downloadLink.download = upload.name;
            downloadLink.classList.remove('hidden');
        }
        if (clearBtn) clearBtn.classList.remove('hidden');
        return;
    }

    if (clearBtn) clearBtn.classList.add('hidden');

    if (img.dataset.folderLoaded === 'true') {
        if (statusEl) statusEl.textContent = 'Loaded from results folder';
        if (downloadLink) {
            downloadLink.href = img.currentSrc || img.src;
            downloadLink.download = folderFile;
            downloadLink.classList.remove('hidden');
        }
        return;
    }

    if (downloadLink) downloadLink.classList.add('hidden');

    if (img.dataset.folderLoaded === 'false') {
        // Confirmed failure — restore the placeholder, clearing the failed image.
        img.classList.add('hidden');
        img.removeAttribute('src');
        const message = `Could not load ${folderFile}`;
        if (phEl) { phEl.classList.remove('hidden'); phEl.textContent = message; }
        if (statusEl) statusEl.textContent = message;
        return;
    }

    // Undetermined yet (folder-file load still in flight, or not started) — only
    // touch the status text; leave the <img> alone so an in-progress load isn't cancelled.
    if (statusEl) statusEl.textContent = 'Awaiting Data Figure';
}

function handleFigureUpload(figureId, folderFile, inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const uploads = getFigureUploads();
        uploads[figureId] = { dataUrl: reader.result, name: file.name, size: file.size };
        try {
            localStorage.setItem(FIGURE_UPLOAD_STORAGE_KEY, JSON.stringify(uploads));
        } catch (e) {
            console.error('Could not save figure upload (browser storage may be full):', e);
            alert('Could not save this upload — the image may be too large for browser storage.');
            return;
        }
        renderFigureState(figureId, folderFile);
    };
    reader.readAsDataURL(file);
    inputEl.value = '';
}

function clearFigureUpload(figureId, folderFile) {
    const uploads = getFigureUploads();
    delete uploads[figureId];
    try {
        localStorage.setItem(FIGURE_UPLOAD_STORAGE_KEY, JSON.stringify(uploads));
    } catch (e) {
        console.error('Could not update figure uploads in storage:', e);
    }

    // The folder file's own load may never have gotten a fair chance to resolve
    // while the upload was overriding this <img>'s src — give it a fresh attempt.
    const img = document.getElementById('img-' + figureId);
    if (img) {
        img.classList.add('hidden');
        delete img.dataset.folderLoaded;
        img.loading = 'eager';
        img.src = new URL(CURRENT_RESULTS_DIR + encodeURIComponent(folderFile), document.baseURI).href;
    }
    renderFigureState(figureId, folderFile);
}

function resetChartZoom(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas._chartInstance) {
        canvas._chartInstance.resetZoom();
    } else if (typeof Chart !== 'undefined' && Chart.instances) {
        // Chart.js 4.x: find instance by canvas
        const instance = Object.values(Chart.instances).find(c => c.canvas.id === canvasId);
        if (instance) instance.resetZoom();
    }
}

function openLightbox(src) {
    const lb    = document.getElementById('img-lightbox');
    const lbImg = document.getElementById('lightbox-img');
    lbImg.src = src;
    lb.classList.add('open');
    document.addEventListener('keydown', closeLightboxOnEsc);
}

function closeLightboxOnEsc(e) {
    if (e.key === 'Escape') {
        document.getElementById('img-lightbox').classList.remove('open');
        document.removeEventListener('keydown', closeLightboxOnEsc);
    }
}

function closeModal() {
    const modal = document.getElementById('sensorModal');
    if(modal) {
        modal.classList.remove('show');
        // Because of the 'opacity', the pointer-events none will handle actual dismissal.
        // We'll reset scroll as well just in case.
        document.body.style.overflow = '';
    }
}

function openModal(sensor) {
    const modal = document.getElementById('sensorModal');
    const nameEl = document.getElementById('modalSensorName');
    const specsEl = document.getElementById('modalSensorSpecs');
    const photosEl = document.getElementById('modalSensorPhotos');
    
    // Set Header
    if(nameEl) nameEl.textContent = sensor.name;
    
    // Set Specs
    let specsHtml = '';
    for (const [key, value] of Object.entries(sensor.specs)) {
        // Format value nicely
        const formattedValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
        specsHtml += `
            <div class="flex items-start gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="mt-1">
                    <span class="material-symbols-outlined text-primary text-xl">check_circle</span>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">${key}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">${formattedValue}</p>
                </div>
            </div>
        `;
    }
    if(specsEl) specsEl.innerHTML = specsHtml;
    
    // Set Photos
    let photosHtml = '';
    if (sensor.photos && sensor.photos.length > 0) {
        sensor.photos.forEach(photo => {
            photosHtml += `
                <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-48 bg-slate-100 dark:bg-slate-800 relative group cursor-zoom-in" onclick="openLightbox('${photo}')">
                    <img src="${photo}" alt="${sensor.name} photo" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="text-white text-xs font-medium">Click to enlarge</span>
                    </div>
                </div>
            `;
        });
    } else {
        photosHtml = `
            <div class="col-span-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-center">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">hide_image</span>
                <p class="text-sm font-medium">No imagery available</p>
                <p class="text-xs mt-1">Installation photos for this sensor type have not been logged.</p>
            </div>
        `;
    }
    if(photosEl) photosEl.innerHTML = photosHtml;
    
    // Show Modal
    if(modal) {
        document.body.style.overflow = 'hidden'; // Stop background scrolling
        modal.classList.add('show');
    }
}

async function loadSpecificationsData() {
    if (stateData && specificationsRendered) return stateData;

    try {
        if (!stateDataPromise) {
            stateDataPromise = fetch(DATA_JSON_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${DATA_JSON_URL}: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    stateDataPromise = null;
                    throw error;
                });
        }

        stateData = await stateDataPromise;
        if (specificationsRendered) return stateData;
        
        if (stateData["Overall specification"] && stateData["Overall specification"].format === "structured") {
            const allSensors = stateData["Overall specification"].sensors;
            
            // On Box: contain LVDT, DFOS, thin-film pressure sensor, strain gauge
            const onBoxKeywords = ['lvdt', 'dfos', 'thin-film', 'strain gauge'];
            const onBoxSensors = allSensors.filter(s =>
                onBoxKeywords.some(keyword => s.name.toLowerCase().includes(keyword))
            );

            // In Soil: remove LVDT, thin-film pressure sensor, loading plate, strain gauge
            const inSoilExcludedKeywords = ['lvdt', 'thin-film', 'loading plate', 'strain gauge'];
            const inSoilSensors = allSensors.filter(s =>
                !inSoilExcludedKeywords.some(keyword => s.name.toLowerCase().includes(keyword))
            );

            // Purpose labels in reading order (left→right, top→bottom across both sections)
            const onBoxLabels  = ['Wall deformation', 'Frost heave', 'Lateral pressure', 'Structural strain'];
            const inSoilLabels = ['Water content migration', 'Soil strain change', 'Temperature profile',
                                  'Thermal & dynamic loading', 'Mimic traffic loading', 'Quality control'];

            // Render to containers
            renderSensors(onBoxSensors,  'sensorListContainerOnBox',  onBoxLabels);
            renderSensors(inSoilSensors, 'sensorListContainerInSoil', inSoilLabels);
            specificationsRendered = true;
        } else {
            throw new Error("Data format changed or 'Overall specification' missing.");
        }
        return stateData;
        
    } catch (error) {
        console.error('Error loading data:', error);
        const errorHtml = `
            <div class="col-span-full p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-center">
                <span class="material-symbols-outlined text-red-500 text-4xl mb-4">error</span>
                <h3 class="text-red-800 dark:text-red-400 font-bold mb-2">Data Load Failure</h3>
                <p class="text-red-600 dark:text-red-300 text-sm mb-4">Please ensure you are viewing this via the local server to bypass CORS restrictions.</p>
                <code class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm block max-w-md mx-auto">python -m http.server 8000</code>
            </div>
        `;
        const containerOnBox = document.getElementById('sensorListContainerOnBox');
        const containerInSoil = document.getElementById('sensorListContainerInSoil');
        if (containerOnBox) containerOnBox.innerHTML = errorHtml;
        if (containerInSoil) containerInSoil.innerHTML = errorHtml;
        throw error;
    }
}

async function lazyLoadModels() {
    const models = Array.from(document.querySelectorAll('model-viewer[data-src]'));
    if (!models.length) return;

    models.forEach(prepareModelViewer);

    if (!('IntersectionObserver' in window)) {
        models.forEach(mv => {
            modelVisibility.set(mv, true);
            loadSingleModelViewer(mv);
        });
        return;
    }

    if (!modelObserver) {
        modelObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                modelVisibility.set(entry.target, entry.isIntersecting);
                if (entry.isIntersecting) {
                    loadSingleModelViewer(entry.target);
                }
            });
            updateModelRotationStates();
        }, { root: null, rootMargin: '500px 0px', threshold: 0.05 });
    }

    models.forEach(mv => {
        if (mv.dataset.modelObserved === 'true') return;
        mv.dataset.modelObserved = 'true';
        modelObserver.observe(mv);
    });

    updateModelRotationStates();
}

function prepareModelViewer(mv) {
    if (mv.dataset.modelPrepared === 'true') return;
    mv.dataset.modelPrepared = 'true';
    if (mv.hasAttribute('auto-rotate')) {
        mv.dataset.autoRotate = 'true';
        mv.removeAttribute('auto-rotate');
    }
}

async function loadSingleModelViewer(mv) {
    if (!mv || mv.dataset.modelLoaded === 'true' || mv.dataset.modelLoading === 'true') return;
    mv.dataset.modelLoading = 'true';

    try {
        if (!customElements.get('model-viewer')) {
            await loadExternalScript('modelViewer', { type: 'module' });
        }
        if (!mv.getAttribute('src')) {
            mv.setAttribute('src', mv.getAttribute('data-src'));
        }
        mv.dataset.modelLoaded = 'true';
        updateModelRotationStates();
    } catch (error) {
        console.error('3D model viewer load failed:', error);
    } finally {
        delete mv.dataset.modelLoading;
    }
}

function pauseAllModels() {
    document.querySelectorAll('model-viewer').forEach(mv => mv.removeAttribute('auto-rotate'));
}

function updateModelRotationStates() {
    const instrumentationActive = document.getElementById('instrumentation')?.classList.contains('active');
    const tabVisible = document.visibilityState === 'visible';

    document.querySelectorAll('model-viewer').forEach(mv => {
        const shouldRotate = Boolean(
            instrumentationActive &&
            tabVisible &&
            mv.dataset.modelLoaded === 'true' &&
            mv.dataset.autoRotate === 'true' &&
            modelVisibility.get(mv)
        );

        if (shouldRotate) {
            mv.setAttribute('auto-rotate', '');
        } else {
            mv.removeAttribute('auto-rotate');
        }
    });
}

function renderSensors(sensors, containerId, purposeLabels = []) {
    const container = document.getElementById(containerId);
    if(!container) return;

    container.innerHTML = '';

    if (!sensors || sensors.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">No sensors recorded in the database.</p>';
        return;
    }

    sensors.forEach((sensor, index) => {
        const card = document.createElement('div');
        card.className = 'group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-primary dark:hover:border-primary hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(23,84,207,0.15)] transition-all duration-300 transform hover:-translate-y-1';

        const imgSrc = sensor.photos && sensor.photos.length > 0 ? sensor.photos[0] : '';
        const purposeLabel = purposeLabels[index] || 'View Spec Sheet';

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                    ${imgSrc ? `<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" data-src="${imgSrc}" alt="${sensor.name}" loading="lazy" decoding="async" fetchpriority="low" class="w-full h-full object-cover">` : '<span class="material-symbols-outlined text-slate-400 w-full h-full flex items-center justify-center text-3xl">sensors</span>'}
                </div>
                <span class="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">arrow_outward</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">${sensor.name}</h3>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                ${purposeLabel}
            </p>
        `;

        card.onclick = () => openModal(sensor);
        container.appendChild(card);
        observeDeferredMedia(card);
        const section = container.closest('.page-section');
        if (shouldShowImmediately(card, section)) {
            showImmediately(card);
        } else {
            queueReveal(card);
        }
    });
}
