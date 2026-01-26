document.addEventListener('DOMContentLoaded', () => {
  // --- Safari: prevent "restore scroll position" + hash jump on refresh ---
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // If Safari loads with a hash like #contact, remove it and start at top
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // Force top after load (Safari sometimes applies scroll after DOMContentLoaded)
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 0);

  /* =========================
     Mobile Menu Toggle
  ========================== */
  const button = document.querySelector('.hamburger');
  const mobileNav = document.getElementById('mobileNav');

  const openMenu = () => {
    mobileNav.removeAttribute('hidden');
    mobileNav.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    mobileNav.setAttribute('hidden', '');
    mobileNav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };

  const isMenuOpen = () => mobileNav && !mobileNav.hasAttribute('hidden');

  if (button && mobileNav) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      isMenuOpen() ? closeMenu() : openMenu();
    });

    // Close when a link is tapped
    mobileNav.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu();
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMenuOpen()) closeMenu();
    });

    // Close when tapping outside the menu
    document.addEventListener('click', (e) => {
      if (!isMenuOpen()) return;
      const clickedButton = e.target.closest('.hamburger');
      const clickedInsideMenu = e.target.closest('#mobileNav');
      if (!clickedButton && !clickedInsideMenu) closeMenu();
    });

    // If we resize back to desktop, ensure menu is closed
    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 768px)').matches && isMenuOpen()) {
        closeMenu();
      }
    });
  }

  /* =========================
     Work Carousel (gallery2) - TRUE continuous loop (no visible jump)
     Uses clones + translateX + silent reset
  ========================== */
  (() => {
    const viewport = document.querySelector('.gallery2-viewport');
    const track = document.querySelector('.gallery2-track');
    const prevBtn = document.querySelector('.g2-prev');
    const nextBtn = document.querySelector('.g2-next');

    if (!viewport || !track || !prevBtn || !nextBtn) return;

    // Grab the original slides once (from your HTML)
    const originals = Array.from(track.querySelectorAll('.gallery2-slide'));
    if (!originals.length) return;

    
    // Prefetch gallery images once the carousel is near the viewport (prevents "late load" on fast scroll)
    const _g2Imgs = originals.map(s => s.querySelector('img')).filter(Boolean);
    let _g2Prefetched = false;
    const _g2WarmUp = () => {
      if (_g2Prefetched) return;
      _g2Prefetched = true;
      _g2Imgs.forEach(img => {
        try { img.loading = 'eager'; } catch (_) {}
        const pre = new Image();
        pre.src = img.currentSrc || img.src;
      });
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
          _g2WarmUp();
          io.disconnect();
        }
      }, { root: null, rootMargin: '800px 0px', threshold: 0 });
      io.observe(viewport);
    } else {
      // Fallback: warm up shortly after load
      setTimeout(_g2WarmUp, 1200);
    }

let perView = 3;
    let gap = 0;
    let slideW = 0;
    let index = 0; // index within the rebuilt (cloned) list
    let isAnimating = false;

    function calcPerView() {
      if (window.matchMedia('(max-width: 640px)').matches) return 1;
      if (window.matchMedia('(max-width: 980px)').matches) return 2;
      return 3;
    }

    function readGap() {
      const g = parseFloat(getComputedStyle(track).gap || '0');
      return Number.isFinite(g) ? g : 0;
    }

    function computeSlideWidth() {
      // This avoids "0px width" issues by using viewport size directly.
      const vw = viewport.clientWidth;
      if (!vw) return 0;
      // total gaps inside the visible row: (perView - 1)
      const totalGaps = gap * (perView - 1);
      return (vw - totalGaps) / perView;
    }

    function applySizesToSlides() {
      // Ensure flex-basis matches computed width so layout is consistent
      const allSlides = track.querySelectorAll('.gallery2-slide');
      allSlides.forEach(s => {
        s.style.flex = `0 0 ${slideW}px`;
      });
    }

    function setInstant() {
      track.style.transition = 'none';
      // force reflow
      void track.offsetHeight;
    }

    function setAnimated() {
      track.style.transition = '';
    }

    function translateToIndex(smooth = true) {
      const x = -(index * (slideW + gap));
      if (!smooth) setInstant();
      track.style.transform = `translateX(${x}px)`;
      if (!smooth) {
        // force commit then restore transition
        void track.offsetHeight;
        setAnimated();
      }
    }

    function rebuild() {
      perView = calcPerView();
      gap = readGap();

      // Rebuild structure:
      // [last perView clones] + [originals] + [first perView clones]
      track.innerHTML = '';

      const tail = originals.slice(-perView).map(s => s.cloneNode(true));
      const head = originals.slice(0, perView).map(s => s.cloneNode(true));

      tail.forEach(s => track.appendChild(s));
      originals.forEach(s => track.appendChild(s.cloneNode(true)));
      head.forEach(s => track.appendChild(s));

      slideW = computeSlideWidth();
      if (!slideW) return;

      applySizesToSlides();

      // Start on first REAL slide
      index = perView;

      // Position without animation
      translateToIndex(false);
    }

    function move(dir) {
      if (isAnimating || !slideW) return;
      isAnimating = true;
      index += dir;
      translateToIndex(true);
    }

    track.addEventListener('transitionend', () => {
      const realCount = originals.length;

      // right clone zone
      if (index >= perView + realCount) {
        index = perView;
        translateToIndex(false);
      }
      // left clone zone
      if (index < perView) {
        index = perView + realCount - 1;
        translateToIndex(false);
      }

      isAnimating = false;
    });

    prevBtn.addEventListener('click', () => move(-1));
    nextBtn.addEventListener('click', () => move(1));

    // Keyboard support when viewport focused
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    });

    // Swipe support (disabled on mobile: arrows only)
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (!isCoarsePointer) {
      let startX = 0;
      viewport.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      viewport.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;
        if (Math.abs(diff) > 40) diff > 0 ? move(-1) : move(1);
      }, { passive: true });
    }

    // Rebuild on resize (keeps you on the same real slide)
    //
    // IMPORTANT (mobile Safari/Chrome): scrolling can trigger "resize" events
    // due to the address bar collapsing/expanding (height changes). Rebuilding
    // the carousel on those events causes visible flicker.
    // So we only rebuild when the viewport WIDTH actually changes.
    let lastViewportWidth = viewport.clientWidth;
    const onResize = () => {
      const newWidth = viewport.clientWidth;
      if (!newWidth) return;

      // Ignore height-only resizes (common during scroll on iOS)
      if (Math.abs(newWidth - lastViewportWidth) < 2) return;
      lastViewportWidth = newWidth;

      const realCount = originals.length;
      const realIndex = ((index - perView) % realCount + realCount) % realCount;

      rebuild();
      // restore to the same real slide
      index = perView + realIndex;
      translateToIndex(false);
    };

    window.addEventListener('resize', onResize);

    // IMPORTANT: wait one frame so layout is ready
    requestAnimationFrame(() => {
      rebuild();
      // If fonts/images change layout, rebuild again after load
      window.addEventListener('load', () => rebuild(), { once: true });
    });
  })();

  /* =========================
     Event Type Conditional Fields
  ========================== */
  const otherRadio = document.getElementById('evt-other');
  const corpRadio = document.getElementById('evt-corp');
  const wrap = document.getElementById('eventTypeOtherWrap');
  const otherInput = document.getElementById('eventTypeOther');
  const group = document.getElementById('eventType');

  const coupleWrap = document.getElementById('coupleNamesWrap');
  const coupleInput = document.getElementById('coupleNames');

  function updateEventTypeFields() {
    const isOtherOrCorp =
      (otherRadio && otherRadio.checked) ||
      (corpRadio && corpRadio.checked);

    if (wrap && otherInput) {
      wrap.hidden = !isOtherOrCorp;
      otherInput.disabled = !isOtherOrCorp;
      otherInput.required = isOtherOrCorp;
      if (!isOtherOrCorp) otherInput.value = '';
    }

    const showFor = new Set(['evt-wedding', 'evt-elopement', 'evt-baby', 'evt-bridal']);
    const checked = group?.querySelector('input[type="radio"]:checked');
    const shouldShow = !!checked && showFor.has(checked.id);

    if (coupleWrap && coupleInput) {
      coupleWrap.hidden = !shouldShow;
      coupleInput.disabled = !shouldShow;
      coupleInput.required = shouldShow;
      if (!shouldShow) coupleInput.value = '';
    }
  }

  if (group) {
    group.addEventListener('change', updateEventTypeFields);
    updateEventTypeFields();
  }

  /* =========================
     "I am → Other" Toggle
  ========================== */
  const iamOtherRadio = document.getElementById('role-other');
  const iamGroup = document.getElementById('iamGroup');
  const iamWrap = document.getElementById('iamOtherWrap');
  const iamInput = document.getElementById('iamOther');

  function updateIamOther() {
    const isOther = iamOtherRadio && iamOtherRadio.checked;
    if (!iamWrap || !iamInput) return;

    iamWrap.hidden = !isOther;
    iamInput.disabled = !isOther;
    iamInput.required = !!isOther;
    if (!isOther) iamInput.value = '';
  }

  if (iamGroup) {
    iamGroup.addEventListener('change', updateIamOther);
    updateIamOther();
  }
});
