// Feature flag: set to true to enable cursor drawing + header icon buttons (download/reset).
const DRAWING_AND_HEADER_ICONS_ENABLED = true;
if (!DRAWING_AND_HEADER_ICONS_ENABLED) {
  document.documentElement.classList.add('drawing-and-header-icons-disabled');
}

// Live time in header
function updateHeaderTime() {
  const el = document.getElementById('header-time');
  if (!el) return;
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  el.textContent = h + ':' + String(mins).padStart(2, '0') + ' ' + ampm;
}

updateHeaderTime();
setInterval(updateHeaderTime, 1000);

// Export drawing canvas with white background (for download/send)
function drawingCanvasWithWhiteBg(sourceCanvas) {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return out;
}

// Download current drawing as PNG
(function () {
  if (!DRAWING_AND_HEADER_ICONS_ENABLED) return;
  const button = document.getElementById('download-drawing');
  const canvas = document.getElementById('cursor-drawing');
  if (!button || !canvas) return;

  function makeFilename() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `levan-work-pattern-${y}${m}${d}-${hh}${mm}${ss}.png`;
  }

  function triggerDownload(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = makeFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  button.addEventListener('click', function () {
    if (!canvas.width || !canvas.height) return;

    let exportCanvas = document.createElement('canvas');
    if (typeof window.exportDrawingToCanvas === 'function') {
      window.exportDrawingToCanvas(exportCanvas);
    } else {
      exportCanvas = drawingCanvasWithWhiteBg(canvas);
    }
    if (exportCanvas.toBlob) {
      exportCanvas.toBlob(function (blob) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        triggerDownload(url);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png');
    } else {
      const dataUrl = exportCanvas.toDataURL('image/png');
      triggerDownload(dataUrl);
    }
  });
})();

// Feature toggles
// Set TOOLS_ICONS_ENABLED to false to hide tool icons even on hover.
const TOOLS_ICONS_ENABLED = true;
if (!TOOLS_ICONS_ENABLED) {
  document.documentElement.classList.add('tools-icons-disabled');
}

// Simple radio stream toggle
(function () {
  const toggle = document.getElementById('radio-toggle');
  if (!toggle) return;

  const RADIO_URL = 'https://fjaartaf.zone/stream';
  const audio = new Audio(RADIO_URL);
  audio.preload = 'none';

  let playing = false;

  function updateLabel() {
    toggle.textContent = playing ? '- stop my radio' : '+ play my radio';
  }

  toggle.addEventListener('click', function () {
    if (!playing) {
      audio
        .play()
        .then(function () {
          playing = true;
          updateLabel();
        })
        .catch(function () {
          // Ignore play errors (e.g. blocked by browser)
        });
    } else {
      audio.pause();
      playing = false;
      updateLabel();
    }
  });

  updateLabel();
})();

// First-visit preload: loader + preload all preview images, then enable hover previews
(function () {
  var PRELOAD_STORAGE_KEY = 'levan_preload_v1';
  var IMAGE_BASE = 'imgs/works_2/';
  var TIMEOUT_MS = 10000;
  var FADE_OUT_MS = 200;

  function getPreviewUrls() {
    var nodes = document.querySelectorAll('[data-preview]');
    var seen = {};
    var urls = [];
    for (var i = 0; i < nodes.length; i++) {
      var src = nodes[i].getAttribute('data-preview');
      if (src && !seen[src] && !/\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
        seen[src] = true;
        urls.push(IMAGE_BASE + src);
      }
    }
    return urls;
  }

// Add this near the top of the preload IIFE, after IMAGE_BASE
var imageCache = {};  // keeps Image objects alive so browser won't evict them
window._previewImageCache = imageCache;  // expose for showPreview

function loadOneImage(url) {
  return new Promise(function (resolve) {
    var img = new Image();
    imageCache[url] = img;  // ← store reference, prevents GC
    img.onload = function () {
      if (typeof img.decode === 'function') {
        img.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };
    img.onerror = resolve;
    img.src = url;
  });
}

  var CONCURRENT = 8; // load up to 8 images in parallel for faster preload

  function preloadAllWithProgress(urls, onProgress) {
    var total = urls.length;
    var done = 0;
    if (total === 0) return Promise.resolve();
    function report() {
      try {
        onProgress(total === 0 ? 100 : Math.round((done / total) * 100));
      } catch (e) {}
    }
    function loadBatch(start) {
      if (start >= total) return Promise.resolve();
      var end = Math.min(start + CONCURRENT, total);
      var batch = [];
      for (var i = start; i < end; i++) {
        batch.push(loadOneImage(urls[i]).then(function () {
          done++;
          report();
        }));
      }
      return Promise.all(batch).then(function () {
        return loadBatch(end);
      });
    }
    return loadBatch(0);
  }

  /* ── Typing progress bar ── */
  var PATTERN = ':.';
  var TYPING_INTERVAL_MS = 15;
  var BAR_LEN = 0; // computed at runtime
  var currentFilled = 0;
  var targetFilled = 0;
  var typingTimer = null;

  function computeBarLen() {
    var bar = document.getElementById('preload-loader-bar');
    var fill = document.getElementById('preload-loader-fill');
    if (!bar || !fill) return 60; // fallback
    // Measure how wide the container is
    var containerW = bar.parentElement ? bar.parentElement.offsetWidth : 300;
    // Measure width of "100%" label (worst-case pct text)
    var pctEl = document.getElementById('preload-loader-pct');
    var pctW = 0;
    if (pctEl) {
      var saved = pctEl.textContent;
      pctEl.textContent = '100%';
      pctW = pctEl.offsetWidth;
      pctEl.textContent = saved;
    }
    // Measure width of a single ":." in the fill font
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' +
      getComputedStyle(fill).font;
    probe.textContent = ':.';
    document.body.appendChild(probe);
    var pairW = probe.offsetWidth || 6;
    document.body.removeChild(probe);
    // Available width for fill chars
    var available = containerW - pctW;
    var chars = Math.floor(available / (pairW / 2)); // width per single char
    return Math.max(10, chars);
  }

  function getBarEls() {
    return {
      fill: document.getElementById('preload-loader-fill'),
      pct: document.getElementById('preload-loader-pct')
    };
  }

  function buildFillString(len) {
    if (len <= 0) return '';
    var str = '';
    for (var i = 0; i < Math.ceil(len / PATTERN.length); i++) str += PATTERN;
    return str.slice(0, len);
  }

  function renderBar() {
    var els = getBarEls();
    if (els.fill) els.fill.textContent = buildFillString(currentFilled);
  }

  function typeTick() {
    if (currentFilled < targetFilled) {
      currentFilled++;
      renderBar();
      typingTimer = setTimeout(typeTick, TYPING_INTERVAL_MS);
    } else {
      typingTimer = null;
    }
  }

  function setProgress(pct) {
    if (BAR_LEN === 0) BAR_LEN = computeBarLen();
    var els = getBarEls();
    if (els.pct) els.pct.textContent = pct + '%';
    var newTarget = Math.round((pct / 100) * BAR_LEN);
    if (newTarget > BAR_LEN) newTarget = BAR_LEN;
    if (newTarget < 0) newTarget = 0;
    targetFilled = newTarget;
    if (!typingTimer && currentFilled < targetFilled) {
      typeTick();
    }
  }

  function hideLoader() {
    var loader = document.getElementById('preload-loader');
    if (!loader) return;
    loader.classList.add('is-hidden');
    loader.setAttribute('aria-busy', 'false');
    setTimeout(function () {
      loader.style.display = 'none';
    }, FADE_OUT_MS);
  }

  function runPreload() {
    var loader = document.getElementById('preload-loader');
    if (!loader) {
      if (typeof window.initHoverPreviews === 'function') window.initHoverPreviews();
      return;
    }
    var urls = getPreviewUrls();
    setProgress(0);
    var preloadDone = preloadAllWithProgress(urls, setProgress);
    var timeout = new Promise(function (r) {
      setTimeout(r, TIMEOUT_MS);
    });
    Promise.race([preloadDone, timeout])
      .then(function () {
        try { localStorage.setItem(PRELOAD_STORAGE_KEY, '1'); } catch (e) {}
        setProgress(100);
        hideLoader();
        document.dispatchEvent(new CustomEvent('preload-complete'));
        if (typeof window.initHoverPreviews === 'function') window.initHoverPreviews();
      })
      .catch(function () {
        try { localStorage.setItem(PRELOAD_STORAGE_KEY, '1'); } catch (e) {}
        hideLoader();
        document.dispatchEvent(new CustomEvent('preload-complete'));
        if (typeof window.initHoverPreviews === 'function') window.initHoverPreviews();
      });
  }

  function maybeRun() {
    try {
      if (localStorage.getItem(PRELOAD_STORAGE_KEY) === '1') {
        // Hide loader UI immediately
        var loader = document.getElementById('preload-loader');
        if (loader) loader.style.display = 'none';
  
        // But still populate the cache silently
        var urls = getPreviewUrls();
        preloadAllWithProgress(urls, function () {}).then(function () {
          document.dispatchEvent(new CustomEvent('preload-complete'));
          if (typeof window.initHoverPreviews === 'function') window.initHoverPreviews();
        });
        return;
      }
    } catch (e) {}
    runPreload();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeRun);
  } else {
    maybeRun();
  }
})();

// Project hover previews — enabled after preload (or immediately on return visits)
function initHoverPreviews() {
  const preview = document.getElementById('project-preview');
  const previewImg = document.getElementById('project-preview-img');
  const previewVideo = document.getElementById('project-preview-video');
  const projects = document.querySelector('.projects');
  if (!preview || !previewImg || !projects) return;

  const touchLike = function () {
    return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 768px)').matches;
  };

  let activeItem = null;

  function updatePreviewPosition() {
    const itemsColumn = projects.querySelector('.project-items');
    if (!itemsColumn) return;
    const rect = itemsColumn.getBoundingClientRect();
    let left = rect.left - 24;
    if (touchLike()) {
      left = Math.max(0, left);
    }
    preview.style.left = left + 'px';
  }

function showPreview(src) {
  if (!src) return;
  updatePreviewPosition();

  var fullUrl = 'imgs/works_2/' + src;
  var isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(src);

  if (isVideo && previewVideo) {
    // Show video placeholder frame immediately
    previewImg.style.display = 'none';
    previewVideo.style.display = 'block';
    preview.classList.add('project-preview--visible');
    document.body.classList.add('project-preview-active');
    preview.classList.add('project-preview--video-loading');

    // Reset previous listeners
    previewVideo.pause();
    previewVideo.removeAttribute('src');

    const onLoaded = function () {
      preview.classList.remove('project-preview--video-loading');
      previewVideo.play().catch(function () {});
      previewVideo.removeEventListener('loadeddata', onLoaded);
      previewVideo.removeEventListener('error', onError);
    };

    const onError = function () {
      preview.classList.remove('project-preview--video-loading');
      previewVideo.removeEventListener('loadeddata', onLoaded);
      previewVideo.removeEventListener('error', onError);
    };

    previewVideo.addEventListener('loadeddata', onLoaded);
    previewVideo.addEventListener('error', onError);
    previewVideo.src = fullUrl;
  } else {
    if (previewVideo) {
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.style.display = 'none';
    }
    previewImg.style.display = 'block';
    var cache = window._previewImageCache;
    if (cache && cache[fullUrl] && cache[fullUrl].complete) {
      previewImg.src = cache[fullUrl].src;
    } else {
      previewImg.src = fullUrl;
    }
    preview.classList.add('project-preview--visible');
    document.body.classList.add('project-preview-active');
  }
}

function hidePreview() {
  if (previewVideo) {
    previewVideo.pause();
    previewVideo.removeAttribute('src');
  }
  preview.classList.remove('project-preview--video-loading');
  preview.classList.remove('project-preview--visible');
  document.body.classList.remove('project-preview-active');
}

  function setActiveItem(li) {
    if (activeItem) activeItem.classList.remove('project-item--active');
    activeItem = li || null;
    if (li) li.classList.add('project-item--active');
  }

  projects.addEventListener(
    'pointerover',
    function (e) {
      if (touchLike()) return;
      const label = e.target.closest('.project-item-label');
      if (!label) return;
      const li = label.closest('li');
      if (!li || !projects.contains(li)) return;
      const src = li.getAttribute('data-preview');
      if (!src) {
        hidePreview();
        return;
      }
      showPreview(src);
    },
    { passive: true }
  );

  projects.addEventListener(
    'pointermove',
    function (e) {
      if (touchLike() && activeItem) return;
      if (!touchLike() && !e.target.closest('.project-item-label')) hidePreview();
    },
    { passive: true }
  );

  projects.addEventListener(
    'pointerleave',
    function () {
      if (touchLike() && activeItem) return;
      hidePreview();
    },
    { passive: true }
  );

  projects.addEventListener('click', function (e) {
    if (!touchLike()) return;
    const li = e.target.closest('.project-items li');
    if (li && projects.contains(li)) {
      const src = li.getAttribute('data-preview');
      if (src) {
        if (li === activeItem) {
          hidePreview();
          setActiveItem(null);
        } else {
          showPreview(src);
          setActiveItem(li);
        }
      } else {
        hidePreview();
        setActiveItem(null);
      }
      return;
    }
    hidePreview();
    setActiveItem(null);
  });

  document.addEventListener('click', function (e) {
    if (!touchLike()) return;
    if (projects.contains(e.target)) return;
    hidePreview();
    setActiveItem(null);
  });

  window.addEventListener('resize', updatePreviewPosition);
}
window.initHoverPreviews = initHoverPreviews;

// Project name description tooltip (follows cursor)
(function () {
  const tooltip = document.getElementById('project-description-tooltip');
  const projects = document.querySelector('.projects');
  if (!tooltip || !projects) return;

  const OFFSET_X = 8;
  const OFFSET_Y = 8;

  const touchLike = function () {
    return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 768px)').matches;
  };

  function show(e, text) {
    if (touchLike() || !text || !text.trim()) return;
    tooltip.textContent = text.trim();
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    updatePosition(e);
  }

  function updatePosition(e) {
    let x = e.clientX + OFFSET_X;
    let y = e.clientY + OFFSET_Y;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    const rect = tooltip.getBoundingClientRect();
    const pad = 8;
    if (rect.width && rect.height) {
      if (x + rect.width + pad > window.innerWidth) x = e.clientX - rect.width - OFFSET_X;
      if (y + rect.height + pad > window.innerHeight) y = e.clientY - rect.height - OFFSET_Y;
      if (x < pad) x = pad;
      if (y < pad) y = pad;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }
  }

  function hide() {
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  projects.addEventListener('mouseenter', function (e) {
    const name = e.target.closest('.project-name');
    if (!name) return;
    const heading = name.closest('.project-heading');
    const desc = heading && heading.getAttribute('data-project-description');
    show(e, desc);
  }, true);

  projects.addEventListener('mousemove', function (e) {
    if (!tooltip.classList.contains('is-visible')) return;
    const name = e.target.closest('.project-name');
    if (!name) return;
    updatePosition(e);
  }, true);

  projects.addEventListener('mouseleave', function (e) {
    const next = e.relatedTarget;
    if (!next || !next.closest || !next.closest('.project-name')) hide();
  }, true);

  document.addEventListener('mousemove', function (e) {
    if (!tooltip.classList.contains('is-visible')) return;
    if (!e.target.closest || !e.target.closest('.project-name')) return;
    updatePosition(e);
  });
})();

// Cursor drawing: thin persistent line, no delay, no fade
(function () {
  if (!DRAWING_AND_HEADER_ICONS_ENABLED) return;
  const canvas = document.getElementById('cursor-drawing');
  if (!canvas) return;

  // Disable drawing on mobile / small viewports
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
    return;
  }

  document.documentElement.classList.add('drawing-enabled');

  const ctx = canvas.getContext('2d');
  const lineWidth = 0.8;
  const jitter = () => (Math.random() * 0.8 - 0.4); // ±0.4px

  let segments = [[]]; // array of point arrays; new segment on pointer leave
  let dpr = 1;
  let drawingDisabled = false; // true during 2s "fix" blink after click
  let blinkTimeout = null;
  const BLINK_DURATION_MS = 2000;

  function isLoaderVisible() {
    var el = document.getElementById('preload-loader');
    return el ? getComputedStyle(el).display !== 'none' : false;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#EBEBEB';
    redraw();
  }

  function redraw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#EBEBEB';
    for (const seg of segments) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.stroke();
    }
  }

  function onPointerMove(e) {
    if (isLoaderVisible() || drawingDisabled) return;
    const x = e.clientX + jitter();
    const y = e.clientY + jitter();
    const seg = segments[segments.length - 1];
    const prev = seg[seg.length - 1];
    seg.push({ x, y });
    if (prev !== undefined) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#EBEBEB';
      ctx.stroke();
    }
  }

  function onPointerLeave() {
    segments.push([]);
  }

  function reset() {
    if (blinkTimeout) {
      clearTimeout(blinkTimeout);
      blinkTimeout = null;
    }
    canvas.classList.remove('cursor-drawing--blinking');
    drawingDisabled = false;
    segments = [[]];
    redraw();
  }

  function startBlink() {
    if (blinkTimeout) clearTimeout(blinkTimeout);
    canvas.classList.add('cursor-drawing--blinking');
    drawingDisabled = true;
    blinkTimeout = setTimeout(function () {
      canvas.classList.remove('cursor-drawing--blinking');
      drawingDisabled = false;
      blinkTimeout = null;
    }, BLINK_DURATION_MS);
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, [role="button"]')) return;
    segments.push([]); // new segment so next stroke starts fresh after fix
    startBlink();
  }

  // ── Drawing hint tooltip: shown once after first draw ──
  const HINT_STORAGE_KEY = 'levan_drawing_hint_v1';
  let hintShown = false;
  let hintActive = false;
  let hintTimeout = null;
  let lastCursorX = 0;
  let lastCursorY = 0;
  const hintEl = document.getElementById('drawing-hint-tooltip');
  const HINT_OFFSET_X = 8;
  const HINT_OFFSET_Y = 8;

  function positionHintAt(cx, cy) {
    if (!hintEl || !hintActive) return;
    let x = cx + HINT_OFFSET_X;
    let y = cy + HINT_OFFSET_Y;
    hintEl.style.left = x + 'px';
    hintEl.style.top = y + 'px';
    const rect = hintEl.getBoundingClientRect();
    const pad = 8;
    if (rect.width && rect.height) {
      if (x + rect.width + pad > window.innerWidth) x = cx - rect.width - HINT_OFFSET_X;
      if (y + rect.height + pad > window.innerHeight) y = cy - rect.height - HINT_OFFSET_Y;
      if (x < pad) x = pad;
      if (y < pad) y = pad;
      hintEl.style.left = x + 'px';
      hintEl.style.top = y + 'px';
    }
  }

  function showHint() {
    if (!hintEl) return;
    hintActive = true;
    positionHintAt(lastCursorX, lastCursorY);
    hintEl.classList.add('is-visible');
    hintEl.setAttribute('aria-hidden', 'false');
    // Hide after 7 seconds
    setTimeout(function () {
      hintActive = false;
      hintEl.classList.remove('is-visible');
      hintEl.setAttribute('aria-hidden', 'true');
    }, 7000);
  }

  function onFirstDraw() {
    if (hintShown) return;
    hintShown = true;
    try { localStorage.setItem(HINT_STORAGE_KEY, '1'); } catch (e) {}
    hintTimeout = setTimeout(showHint, 5000);
  }

  // Check if hint was already shown in a previous visit
  try {
    if (localStorage.getItem(HINT_STORAGE_KEY) === '1') hintShown = true;
  } catch (e) {}

  // Wrap onPointerMove to detect first stroke (only when loader is gone)
  const origOnPointerMove = onPointerMove;
  function onPointerMoveWithHint(e) {
    lastCursorX = e.clientX;
    lastCursorY = e.clientY;
    if (isLoaderVisible()) {
      positionHintAt(lastCursorX, lastCursorY);
      return;
    }
    origOnPointerMove(e);
    if (!hintShown && segments[segments.length - 1].length >= 3) {
      onFirstDraw();
    }
    positionHintAt(lastCursorX, lastCursorY);
  }

  // Export for download: redraw segments with #282828 on white (on-screen stays light)
  window.exportDrawingToCanvas = function (exportCanvas) {
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const outCtx = exportCanvas.getContext('2d');
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    outCtx.setTransform(1, 0, 0, 1, 0, 0);
    outCtx.scale(dpr, dpr);
    outCtx.lineWidth = lineWidth;
    outCtx.lineCap = 'round';
    outCtx.lineJoin = 'round';
    outCtx.strokeStyle = '#282828';
    for (const seg of segments) {
      if (seg.length < 2) continue;
      outCtx.beginPath();
      outCtx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) outCtx.lineTo(seg[i].x, seg[i].y);
      outCtx.stroke();
    }
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMoveWithHint, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('drawing-reset', reset);
})();

// Reset drawing button (dispatches event so drawing module clears canvas)
(function () {
  if (!DRAWING_AND_HEADER_ICONS_ENABLED) return;
  const btn = document.getElementById('reset-drawing');
  if (!btn) return;
  btn.addEventListener('click', function () {
    document.dispatchEvent(new CustomEvent('drawing-reset'));
  });
})();

// Custom scrollbar: 2px, #282828, square
(function () {
  const thumb = document.getElementById('scrollbar-thumb');
  if (!thumb) return;

  function update() {
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollHeight <= viewportHeight) {
      thumb.style.opacity = '0';
      return;
    }
    thumb.style.opacity = '1';

    const trackHeight = viewportHeight;
    const thumbHeight = Math.max(20, trackHeight * (viewportHeight / scrollHeight));
    const maxScroll = scrollHeight - viewportHeight;
    const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;

    thumb.style.height = thumbHeight + 'px';
    thumb.style.transform = 'translateY(' + thumbTop + 'px)';
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();

// Intro block mask: drawing is hidden in this area (appears behind it)
(function () {
  if (!DRAWING_AND_HEADER_ICONS_ENABLED) return;
  const mask = document.getElementById('intro-drawing-mask');
  const intro = document.querySelector('.intro');
  if (!mask || !intro) return;

  var cursorImgUrl = new URL('imgs/levan.png', document.baseURI || window.location.href).href;
  var CUSTOM_CURSOR = 'auto';
  var cursorImg = new Image();
  cursorImg.onload = function () {
    var c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    var ctx = c.getContext('2d');
    ctx.drawImage(cursorImg, 0, 0, 16, 16);
    try {
      var dataUrl = c.toDataURL('image/png');
      CUSTOM_CURSOR = "url('" + dataUrl + "') 8 8, auto";
    } catch (err) {
      CUSTOM_CURSOR = "url('" + cursorImgUrl + "') 8 8, auto";
    }
  };
  cursorImg.onerror = function () { CUSTOM_CURSOR = 'auto'; };
  cursorImg.src = cursorImgUrl;

  function updateMask() {
    const r = intro.getBoundingClientRect();
    mask.style.top = r.top + 'px';
    mask.style.left = r.left + 'px';
    mask.style.width = r.width + 'px';
    mask.style.height = r.height + 'px';
  }

  function onPointerMove(e) {
    const r = intro.getBoundingClientRect();
    const inside =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;
    document.body.style.cursor = inside ? CUSTOM_CURSOR : '';
    if (inside) {
      document.body.classList.add('intro-cursor-active');
    } else {
      document.body.classList.remove('intro-cursor-active');
    }
  }

  updateMask();
  window.addEventListener('scroll', updateMask, { passive: true });
  window.addEventListener('resize', updateMask);
  document.addEventListener('pointermove', onPointerMove, { passive: true });
})();