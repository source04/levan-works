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

// Download current drawing as PNG
(function () {
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
    return `levan-works-pattern-${y}${m}${d}-${hh}${mm}${ss}.png`;
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

    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        triggerDownload(url);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
      }, 'image/png');
    } else {
      const dataUrl = canvas.toDataURL('image/png');
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

  const RADIO_URL = 'https://fjaartaf.zone/';
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

// Project hover previews (JPG series, etc.) — hover on desktop, tap-to-show on mobile
(function () {
  const preview = document.getElementById('project-preview');
  const previewImg = document.getElementById('project-preview-img');
  const projects = document.querySelector('.projects');
  if (!preview || !previewImg || !projects) return;

  const touchLike = function () {
    return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 768px)').matches;
  };

  let activeItem = null; // on touch: the <li> that is currently "selected"

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
    previewImg.src = 'imgs/works/' + src;
    preview.classList.add('project-preview--visible');
  }

  function hidePreview() {
    preview.classList.remove('project-preview--visible');
    previewImg.removeAttribute('src');
  }

  function setActiveItem(li) {
    if (activeItem) activeItem.classList.remove('project-item--active');
    activeItem = li || null;
    if (li) li.classList.add('project-item--active');
  }

  // Desktop: hover shows preview; pointerleave hides it
  projects.addEventListener(
    'pointerover',
    function (e) {
      if (touchLike()) return; // on mobile we use click only
      const li = e.target.closest('li');
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
    'pointerleave',
    function () {
      if (touchLike() && activeItem) return; // on mobile keep preview when an item is active
      hidePreview();
    },
    { passive: true }
  );

  // Mobile: tap project item to show preview and keep it; tap same item or elsewhere to close
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
    // Click inside .projects but not on an item (e.g. heading) — close preview
    hidePreview();
    setActiveItem(null);
  });

  document.addEventListener('click', function (e) {
    if (!touchLike()) return;
    if (projects.contains(e.target)) return; // handled above
    hidePreview();
    setActiveItem(null);
  });

  window.addEventListener('resize', updatePreviewPosition);
})();

// Cursor drawing: thin persistent line, no delay, no fade
(function () {
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
    ctx.strokeStyle = '#4b4b4b';
    redraw();
  }

  function redraw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4b4b4b';
    for (const seg of segments) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.stroke();
    }
  }

  function onPointerMove(e) {
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
      ctx.strokeStyle = '#4b4b4b';
      ctx.stroke();
    }
  }

  function onPointerLeave() {
    segments.push([]);
  }

  function reset() {
    segments = [[]];
    redraw();
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, [role="button"]')) return;
    reset();
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('drawing-reset', reset);
})();

// Reset drawing button (dispatches event so drawing module clears canvas)
(function () {
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
  const mask = document.getElementById('intro-drawing-mask');
  const intro = document.querySelector('.intro');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/090c5104-30a8-4dd7-a802-9112c06a1703',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:intro-cursor-init',message:'intro cursor init',data:{maskExists:!!mask,introExists:!!intro},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/090c5104-30a8-4dd7-a802-9112c06a1703',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:cursor-img-load',message:'cursor image resized 16x16',data:{originalW:cursorImg.naturalWidth,originalH:cursorImg.naturalHeight,usingDataUrl:!!CUSTOM_CURSOR.match(/^url\('data:/)},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
    // #endregion
  };
  cursorImg.onerror = function () { CUSTOM_CURSOR = 'auto'; };
  cursorImg.src = cursorImgUrl;
  let lastLog = 0;
  let lastInside = null;

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
    // #region agent log
    var now = Date.now();
    if (inside !== lastInside || (inside && now - lastLog > 500)) {
      lastInside = inside;
      if (inside) lastLog = now;
      fetch('http://127.0.0.1:7243/ingest/090c5104-30a8-4dd7-a802-9112c06a1703',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:onPointerMove',message:'intro hit test',data:{clientX:e.clientX,clientY:e.clientY,rectLeft:r.left,rectRight:r.right,rectTop:r.top,rectBottom:r.bottom,inside:inside,cursorSet:inside?CUSTOM_CURSOR:'default'},timestamp:Date.now(),hypothesisId:'A_E'})}).catch(()=>{});
    }
    // #endregion
  }

  updateMask();
  window.addEventListener('scroll', updateMask, { passive: true });
  window.addEventListener('resize', updateMask);
  document.addEventListener('pointermove', onPointerMove, { passive: true });
})();
