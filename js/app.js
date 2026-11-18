/* Maison Valcour — page behaviour: language switch, collection filters, details drawer, booking form. */
(function () {
  'use strict';

  var CARS = window.MV_CARS;
  var CATS = window.MV_CATS;
  var SLOTS = window.MV_SLOTS;
  var I18N = window.MV_I18N;
  var CAT_KEY = { All: 'catAll', Supercar: 'catSupercar', 'Grand Tourer': 'catGT', SUV: 'catSUV', Classic: 'catClassic' };

  var state = { lang: 'fr', cat: 'All', sort: 'featured', open: null, slot: '11:30', bookCar: '', lastFocus: null };

  try { var saved = localStorage.getItem('mv-lang'); if (saved === 'en' || saved === 'fr') state.lang = saved; } catch (e) { /* storage unavailable */ }

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- i18n helpers ---------- */
  function t(key, vars) {
    var s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.fr[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function loc() { return state.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(n) { return new Intl.NumberFormat(state.lang === 'fr' ? 'fr-FR' : 'en-US').format(n); }
  function price(n) { return new Intl.NumberFormat(state.lang === 'fr' ? 'fr-FR' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
  function tr(v) { return typeof v === 'string' ? v : (v[state.lang] || v.fr); }
  function accel(a) { return state.lang === 'fr' ? a : a.replace(',', '.'); }
  function title(c) { return c.year + ' ' + c.make + ' ' + c.model; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }

  /* ---------- Car silhouette (fallback when a photo can't load) ---------- */
  var SHAPES = {
    coupe: { body: 'M30,150 C30,136 38,128 56,124 L120,114 C170,84 230,64 300,62 C350,61 392,70 432,92 L520,106 C552,111 568,124 572,140 L574,152 C574,158 570,160 564,160 L512,160 A44,44 0 0 0 424,160 L182,160 A44,44 0 0 0 94,160 L40,160 C34,160 30,156 30,150 Z',
      glass: ['M196,104 C228,82 262,74 300,73 C338,73 368,80 396,98 L392,104 Z'], line: 'M62,128 C200,110 400,108 560,128', pillar: 'M300,106 L306,150',
      head: 'M546,118 L566,127', tail: 'M34,134 L50,131', wheels: [138, 468], wy: 160, wr: 36, hr: 25 },
    gt: { body: 'M28,146 C28,132 38,122 58,118 L136,106 C184,80 230,64 284,62 C330,61 366,68 398,86 L428,100 L524,110 C554,114 570,126 573,142 L574,152 C574,158 570,160 564,160 L516,160 A44,44 0 0 0 428,160 L178,160 A44,44 0 0 0 90,160 L38,160 C32,160 28,156 28,146 Z',
      glass: ['M200,100 C232,80 262,72 290,71 C326,71 354,78 382,94 L378,101 Z'], line: 'M60,124 C200,106 400,106 560,126', pillar: 'M290,103 L296,150',
      head: 'M550,120 L567,128', tail: 'M32,130 L48,127', wheels: [134, 472], wy: 160, wr: 36, hr: 25 },
    suv: { body: 'M30,146 L30,116 C30,104 38,98 52,96 L104,92 L150,46 C156,40 164,38 174,38 L392,38 C406,38 416,44 426,54 L468,92 L532,100 C556,104 570,116 572,132 L574,150 C574,156 570,158 564,158 L508,158 A46,46 0 0 0 416,158 L186,158 A46,46 0 0 0 94,158 L40,158 C34,158 30,154 30,146 Z',
      glass: ['M164,90 L192,54 C195,50 199,48 204,48 L290,48 L290,90 Z', 'M302,48 L386,48 C394,48 400,52 406,58 L436,90 L302,90 Z'], line: 'M44,112 C200,100 420,100 562,118', pillar: 'M296,92 L296,150',
      head: 'M548,108 L566,114', tail: 'M33,112 L33,128', wheels: [140, 462], wy: 158, wr: 38, hr: 26 }
  };
  function carSvg(paint, shape, label) {
    var s = SHAPES[shape] || SHAPES.coupe;
    var wheels = s.wheels.map(function (x) {
      return '<circle cx="' + x + '" cy="' + s.wy + '" r="' + s.wr + '" fill="#0A0A0A"/><circle cx="' + x + '" cy="' + s.wy + '" r="' + s.hr + '" fill="#1C1C1C" stroke="#8C877E" stroke-width="2"/><circle cx="' + x + '" cy="' + s.wy + '" r="5" fill="#8C877E"/>';
    }).join('');
    return '<svg class="car-svg" viewBox="0 0 600 210" role="img" aria-label="' + esc(label) + '">' +
      '<ellipse cx="300" cy="198" rx="282" ry="7" fill="rgba(0,0,0,0.55)"/>' +
      '<path d="' + s.body + '" fill="' + paint + '"/>' +
      s.glass.map(function (g) { return '<path d="' + g + '" fill="rgba(8,8,10,0.86)"/>'; }).join('') +
      '<path d="' + s.line + '" stroke="rgba(255,255,255,0.22)" stroke-width="2" fill="none"/>' +
      '<path d="' + s.pillar + '" stroke="rgba(0,0,0,0.28)" stroke-width="1.5"/>' +
      '<path d="' + s.head + '" stroke="#F3EFE6" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="' + s.tail + '" stroke="#D03A2B" stroke-width="3.5" stroke-linecap="round"/>' +
      wheels + '</svg>';
  }

  /* Photo with silhouette fallback */
  /* Wikimedia serves these thumbnail widths; phones get the smaller files. */
  function srcset(src) {
    return [500, 960, 1280].map(function (w) { return src.replace('/1280px-', '/' + w + 'px-') + ' ' + w + 'w'; }).join(', ');
  }
  var SIZES = {
    card: '(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 50vw, 410px',
    hero: '(max-width: 1320px) 94vw, 1200px',
    drawer: '(max-width: 620px) 100vw, 540px'
  };
  function media(c, imgClass, loading, sizes) {
    if (!c.photo) return '<div class="car-wrap">' + carSvg(c.paint, c.shape, title(c)) + '</div>';
    return '<img class="' + (imgClass || '') + '" src="' + c.photo.src + '" srcset="' + srcset(c.photo.src) + '" sizes="' + (sizes || SIZES.card) + '" alt="' + esc(title(c)) + '" width="1280" height="800" loading="' + (loading || 'lazy') + '" decoding="async" data-fallback="' + c.id + '">';
  }
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.dataset.fallback) return;
    var c = CARS.find(function (x) { return String(x.id) === img.dataset.fallback; });
    var wrap = document.createElement('div');
    wrap.className = 'car-wrap';
    wrap.innerHTML = carSvg(c.paint, c.shape, title(c));
    img.replaceWith(wrap);
  }, true);

  /* ---------- Static text ---------- */
  function applyStatic() {
    document.documentElement.lang = state.lang;
    document.title = t('pageTitle');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
    $$('[data-num]').forEach(function (el) { el.textContent = num(Number(el.dataset.num)); });
    $$('.lang-btn').forEach(function (b) {
      var on = b.dataset.lang === state.lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('#featured-price').textContent = price(389000);
  }

  /* ---------- Collection ---------- */
  function renderFilters() {
    $('#filters').innerHTML = CATS.map(function (n) {
      var on = n === state.cat;
      return '<button type="button" class="pill' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-cat="' + n + '">' + esc(t(CAT_KEY[n])) + '</button>';
    }).join('');
  }

  function visibleCars() {
    var list = CARS.filter(function (c) { return state.cat === 'All' || c.cat === state.cat; });
    if (state.sort === 'high') list = list.slice().sort(function (a, b) { return b.price - a.price; });
    if (state.sort === 'low') list = list.slice().sort(function (a, b) { return a.price - b.price; });
    if (state.sort === 'new') list = list.slice().sort(function (a, b) { return b.year - a.year; });
    return list;
  }

  function renderGrid() {
    var list = visibleCars();
    $('#count').textContent = t('count', { n: list.length, total: CARS.length });
    $('#grid').innerHTML = list.map(function (c) {
      return '<article class="card">' +
        '<div class="card-media">' + media(c) +
          (c.badge ? '<span class="lbl tag tag-badge">' + esc(t('badge_' + c.badge)) + '</span>' : '') +
          '<span class="lbl tag tag-ext">' + esc(c.ext) + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="card-title-block">' +
            '<span class="lbl">' + c.year + ' · ' + esc(t(CAT_KEY[c.cat])) + '</span>' +
            '<h3 class="card-title"><span class="card-make">' + esc(c.make) + '</span><span class="display card-model">' + esc(c.model) + '</span></h3>' +
          '</div>' +
          '<div class="card-specs"><span>' + num(c.km) + ' km</span><span>' + num(c.hp) + ' ' + t('hp') + '</span><span>0–100 ' + accel(c.accel) + '</span></div>' +
          '<div class="card-foot">' +
            '<span class="display card-price">' + price(c.price) + '</span>' +
            '<div class="card-actions">' +
              '<a class="btn btn-line btn-sm" href="#book" data-book="' + c.id + '">' + esc(t('enquire')) + '</a>' +
              '<button type="button" class="btn btn-gold btn-sm" data-open="' + c.id + '">' + esc(t('details')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderHero() {
    var c = CARS[0];
    $('#hero-car').innerHTML = media(c, 'hero-photo', 'eager', SIZES.hero);
  }

  /* ---------- Drawer ---------- */
  function openCar(id) {
    var c = CARS.find(function (x) { return x.id === Number(id); });
    if (!c) return;
    state.open = c.id;
    state.lastFocus = document.activeElement;
    renderDrawer();
    $('#drawer').hidden = false;
    document.body.classList.add('no-scroll');
    $('.drawer-panel').focus();
  }
  function renderDrawer() {
    var c = CARS.find(function (x) { return x.id === state.open; });
    if (!c) return;
    $('#d-ref').textContent = t(CAT_KEY[c.cat]) + ' · ' + (state.lang === 'fr' ? 'Réf.' : 'Ref.') + ' MV-' + c.id;
    $('#d-make').textContent = c.year + ' ' + c.make;
    $('#d-model').textContent = c.model;
    $('#d-media').innerHTML = media(c, '', 'eager', SIZES.drawer) +
      (c.photo ? '<a class="photo-credit" href="' + c.photo.page + '" target="_blank" rel="noopener">' + esc(t('photoBy', { by: c.photo.by, lic: c.photo.lic })) + '</a>' : '');
    $('#d-price').textContent = price(c.price);
    $('#d-note').textContent = tr(c.note);
    $('#d-km').textContent = num(c.km) + ' km';
    $('#d-hp').textContent = num(c.hp) + ' ' + t('hp');
    $('#d-accel').textContent = accel(c.accel);
    $('#d-gear').textContent = tr(c.gearbox);
    $('#d-ext').textContent = c.ext;
    $('#d-int').textContent = tr(c.int);
    $('.drawer-panel').setAttribute('aria-label', title(c));
  }
  function closeCar() {
    if (state.open === null) return;
    state.open = null;
    $('#drawer').hidden = true;
    document.body.classList.remove('no-scroll');
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  /* ---------- Booking ---------- */
  function renderCarSelect() {
    var sel = $('#f-car');
    sel.innerHTML = '<option value="">' + esc(t('fCarNone')) + '</option>' +
      CARS.map(function (c) { return '<option value="' + c.id + '">' + esc(title(c)) + '</option>'; }).join('');
    sel.value = state.bookCar;
  }
  function renderSlots() {
    $('#slots').innerHTML = SLOTS.map(function (s) {
      var on = s === state.slot;
      return '<button type="button" class="slot' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-slot="' + s + '">' + s + '</button>';
    }).join('');
  }
  function fmtDate(v) {
    if (!v) return t('cAnyDate');
    try { return new Date(v + 'T12:00:00').toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return v; }
  }
  function fmtSlot(s) { return state.lang === 'fr' ? s.replace(':', 'h') : s; }
  function setBookCar(id) {
    state.bookCar = id ? String(id) : '';
    $('#f-car').value = state.bookCar;
    showForm();
  }
  function showForm() {
    $('#book-form').hidden = false;
    $('#confirm').hidden = true;
  }

  var lastSent = null;
  function renderConfirm() {
    if (!lastSent) return;
    var car = CARS.find(function (c) { return String(c.id) === lastSent.car; });
    $('#confirm-title').textContent = t('cThanks', { name: lastSent.name || t('cThere') });
    $('#confirm-text').innerHTML = t('cText', {
      car: esc(car ? title(car) : t('cSourcing')),
      date: esc(fmtDate(lastSent.date)),
      slot: esc(fmtSlot(lastSent.slot))
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var err = $('#form-error');
    var name = form.elements.name, email = form.elements.email;
    var msg = '';
    if (!name.value.trim()) { msg = t('errName'); name.focus(); }
    else if (!email.validity.valid || !email.value.trim()) { msg = t('errEmail'); email.focus(); }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    lastSent = {
      name: name.value.trim().split(/\s+/)[0],
      car: state.bookCar,
      date: form.elements.date.value,
      slot: state.slot
    };
    renderConfirm();
    form.hidden = true;
    $('#confirm').hidden = false;
    $('#reset-form').focus();
  }

  /* ---------- Credits ---------- */
  function renderCredits() {
    $('#credits-list').innerHTML = CARS.filter(function (c) { return c.photo; }).map(function (c) {
      return '<li>' + esc(title(c)) + ' — <a href="' + c.photo.page + '" target="_blank" rel="noopener">' + esc(c.photo.by) + '</a>, ' + esc(c.photo.lic) + '</li>';
    }).join('');
  }

  /* ---------- Render all ---------- */
  function renderAll() {
    applyStatic();
    renderFilters();
    renderGrid();
    renderCarSelect();
    renderSlots();
    renderConfirm();
    if (state.open !== null) renderDrawer();
  }

  /* ---------- Mobile menu ---------- */
  var header = $('#site-header');
  var menuBtn = $('#menu-btn');
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', function () { setMenu(!header.classList.contains('menu-open')); });
  $('#site-nav').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  header.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('.lang-btn'))) {
      state.lang = el.dataset.lang;
      try { localStorage.setItem('mv-lang', state.lang); } catch (err) { /* ignore */ }
      renderAll();
      return;
    }
    if ((el = e.target.closest('.pill[data-cat]'))) { state.cat = el.dataset.cat; renderFilters(); renderGrid(); return; }
    if ((el = e.target.closest('.foot-col a[data-cat]'))) { state.cat = el.dataset.cat; renderFilters(); renderGrid(); return; }
    if ((el = e.target.closest('[data-open]'))) { openCar(el.dataset.open); return; }
    if ((el = e.target.closest('[data-book]'))) { setBookCar(el.dataset.book); return; }
    if ((el = e.target.closest('[data-close]'))) { closeCar(); return; }
    if ((el = e.target.closest('[data-slot]'))) { state.slot = el.dataset.slot; renderSlots(); return; }
    if (e.target.closest('#d-book')) { var id = state.open; closeCar(); setBookCar(id); return; }
    if (e.target.closest('#sourcing-cta')) { setBookCar(''); return; }
    if (e.target.closest('#reset-form')) { showForm(); $('#f-name').focus(); }
  });

  $('#drawer').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeCar(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button:not([tabindex="-1"]), a[href]', $('.drawer-panel'));
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  $('#sort').addEventListener('change', function (e) { state.sort = e.target.value; renderGrid(); });
  $('#f-car').addEventListener('change', function (e) { state.bookCar = e.target.value; });
  $('#book-form').addEventListener('submit', onSubmit);

  renderHero();
  renderCredits();
  renderAll();
})();
