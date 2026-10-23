(function () {
  'use strict';

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  let toastTimer = null;

  function showToast(message) {
    let toast = qs('.doc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'doc-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    window.clearTimeout(toastTimer);
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('show');
    }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        area.remove();
      }
    });
  }

  function setupActions() {
    qsa('[data-print]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        if (button.tagName === 'A') event.preventDefault();
        window.print();
      });
    });

    qsa('[data-copy]').forEach(function (button) {
      button.addEventListener('click', function () {
        const value = button.getAttribute('data-copy') || '';
        copyText(value)
          .then(function () {
            showToast('Disalin ke clipboard.');
          })
          .catch(function () {
            showToast('Gagal menyalin. Silakan salin manual.');
          });
      });
    });
  }

  function setupGuideSidebar() {
    const sidebar = qs('.guide-sidebar');
    const toggle = qs('[data-guide-toggle]');
    const backdrop = qs('#guideBackdrop');
    if (!sidebar || !toggle) return;

    function close() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
    }

    function open() {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
    }

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) close();
      else open();
    });

    if (backdrop) backdrop.addEventListener('click', close);

    qsa('.guide-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 1100) close();
        const search = qs('#docSearch');
        if (search && search.value) {
          search.value = '';
          filterSections();
        }
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
  }

  const sections = qsa('.doc-section');

  function filterSections() {
    const search = qs('#docSearch');
    if (!search) return;

    const query = search.value.toLowerCase().trim();
    const empty = qs('#searchEmpty');
    const status = qs('#searchStatus');
    let visible = 0;

    sections.forEach(function (section) {
      const matches = !query || section.textContent.toLowerCase().indexOf(query) !== -1;
      section.classList.toggle('hidden', !matches);
      if (matches) visible += 1;
    });

    if (empty) empty.classList.toggle('show', visible === 0);
    if (status) {
      status.textContent = query ? visible + ' bagian ditemukan' : '';
    }
  }

  function setupSearch() {
    const search = qs('#docSearch');
    if (!search) return;
    search.addEventListener('input', filterSections);
  }

  function setupNavObserver() {
    const links = qsa('.guide-nav-link');
    if (!links.length || !sections.length) return;

    const linkMap = {};
    links.forEach(function (link) {
      const href = link.getAttribute('href') || '';
      if (href.charAt(0) === '#') linkMap[href.slice(1)] = link;
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (link) {
              link.classList.remove('active');
            });
            const active = linkMap[entry.target.id];
            if (active) active.classList.add('active');
          });
        },
        { rootMargin: '-32% 0px -58% 0px', threshold: 0 },
      );

      sections.forEach(function (section) {
        observer.observe(section);
      });
    }
  }

  function setupScrollProgress() {
    const bar = qs('.guide-scroll-progress i');
    if (!bar) return;

    function update() {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? (window.scrollY / height) * 100 : 0;
      bar.style.width = Math.max(0, Math.min(100, progress)) + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function setupLightbox() {
    const images = qsa('img.zoomable');
    const lightbox = qs('#lightbox');
    if (!images.length || !lightbox) return;

    const image = qs('#lightboxImage', lightbox);
    const counter = qs('#lightboxCount', lightbox);
    const closeButton = qs('.lightbox-close', lightbox);
    const prevButton = qs('.lightbox-prev', lightbox);
    const nextButton = qs('.lightbox-next', lightbox);
    let current = 0;

    function render() {
      const source = images[current];
      if (!source) return;
      image.src = source.currentSrc || source.src;
      image.alt = source.alt || 'Screenshot aplikasi';
      if (counter) counter.textContent = current + 1 + ' / ' + images.length;
    }

    function open(index) {
      current = index;
      render();
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function move(step) {
      current = (current + step + images.length) % images.length;
      render();
    }

    images.forEach(function (element, index) {
      element.addEventListener('click', function () {
        open(index);
      });
    });

    if (closeButton) closeButton.addEventListener('click', close);
    if (prevButton) prevButton.addEventListener('click', function () { move(-1); });
    if (nextButton) nextButton.addEventListener('click', function () { move(1); });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) close();
    });

    document.addEventListener('keydown', function (event) {
      if (!lightbox.classList.contains('open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    });
  }

  function setupChecklist() {
    const checks = qsa('.learning-check');
    if (!checks.length) return;

    const storageKey = 'saunglele-guide-progress-v1';
    const fills = qsa('[data-progress-fill]');
    const texts = qsa('[data-progress-text]');
    const percents = qsa('[data-progress-percent]');

    function save() {
      const state = {};
      checks.forEach(function (check) {
        state[check.getAttribute('data-key')] = check.checked;
      });
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (error) {
        /* localStorage can be unavailable in private browsing. */
      }
    }

    function load() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
        checks.forEach(function (check) {
          check.checked = !!saved[check.getAttribute('data-key')];
        });
      } catch (error) {
        /* Ignore malformed state. */
      }
    }

    function update() {
      const done = checks.filter(function (check) { return check.checked; }).length;
      const total = checks.length;
      const percent = total ? Math.round((done / total) * 100) : 0;

      fills.forEach(function (fill) { fill.style.width = percent + '%'; });
      texts.forEach(function (text) { text.textContent = done + ' / ' + total; });
      percents.forEach(function (text) { text.textContent = percent + '%'; });
      save();
    }

    checks.forEach(function (check) {
      check.addEventListener('change', update);
    });

    const reset = qs('[data-reset-checklist]');
    if (reset) {
      reset.addEventListener('click', function () {
        checks.forEach(function (check) { check.checked = false; });
        update();
        showToast('Checklist direset.');
      });
    }

    load();
    update();
  }

  function init() {
    setupActions();
    setupGuideSidebar();
    setupSearch();
    setupNavObserver();
    setupScrollProgress();
    setupLightbox();
    setupChecklist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
