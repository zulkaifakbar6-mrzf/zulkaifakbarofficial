/* ==========================================================================
   MR ZF — app.js
   All website behaviour lives here. You normally never need to edit this
   file — day-to-day changes go in js/config.js and data/products.json.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ------------------------- helpers ------------------------- */
  var CFG = window.MRZF_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fmtPrice(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    var grouped;
    try { grouped = n.toLocaleString('en-PK'); }
    catch (e) { grouped = n.toLocaleString(); }
    return (CFG.currency || 'PKR') + ' ' + grouped;
  }

  function qsParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  function setParam(key, value) {
    var params = new URLSearchParams(window.location.search);
    if (value) { params.set(key, value); } else { params.delete(key); }
    var qs = params.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '');
    try { window.history.replaceState({}, '', newUrl); } catch (e) { /* file:// */ }
  }

  /* ------------------------- products ------------------------- */
  var PRODUCTS = [];
  var productsReady = null;

  function normalizeProduct(p) {
    if (!p || typeof p !== 'object') return null;
    return {
      id: String(p.id || '').trim(),
      slug: String(p.slug || '').trim(),
      name: String(p.name || 'Unnamed product'),
      category: String(p.category || 'Other'),
      description: String(p.description || ''),
      price: Number(p.price) || 0,
      currency: String(p.currency || CFG.currency || 'PKR'),
      sizes: Array.isArray(p.sizes) ? p.sizes.map(String) : [],
      colors: Array.isArray(p.colors) ? p.colors.map(String) : [],
      images: Array.isArray(p.images) && p.images.length ? p.images.map(String) : ['assets/images/products/placeholder.svg'],
      featured: !!p.featured,
      newArrival: !!p.newArrival,
      available: p.available !== false
    };
  }

  function loadProducts() {
    if (productsReady) return productsReady;
    productsReady = fetch('data/products.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var list = (data && Array.isArray(data.products)) ? data.products : [];
        PRODUCTS = list.map(normalizeProduct).filter(Boolean);
        return PRODUCTS;
      })
      .catch(function () {
        /* Offline / file:// fallback — js/products.js holds a spare copy */
        if (Array.isArray(window.MRZF_PRODUCTS)) {
          PRODUCTS = window.MRZF_PRODUCTS.map(normalizeProduct).filter(Boolean);
          return PRODUCTS;
        }
        throw new Error('Products could not be loaded.');
      });
    return productsReady;
  }

  function placeholderSwap(img) {
    img.addEventListener('error', function handle() {
      img.removeEventListener('error', handle);
      img.src = 'assets/images/products/placeholder.svg';
    });
  }

  /* ------------------------- WhatsApp ------------------------- */
  function waNumber() { return String(CFG.whatsappNumber || '').trim(); }

  function waConfigured() {
    var n = waNumber();
    return /^[0-9]{10,15}$/.test(n); /* digits only — "923XXXXXXXXX" fails this on purpose */
  }

  function waLink(message) {
    var num = waNumber();
    if (waConfigured()) {
      return 'https://wa.me/' + num + '?text=' + encodeURIComponent(message);
    }
    /* Number missing — let the visitor pick the contact manually instead of a dead link */
    return 'https://wa.me/?text=' + encodeURIComponent(message);
  }

  function orderMessage(p, opts) {
    var lines = [
      'Assalam-o-Alaikum ' + (CFG.brandName || 'Mr ZF') + ',',
      '',
      'I would like to order:',
      '',
      'Product: ' + p.name,
      'Product Code: ' + p.id
    ];
    if (opts.size) lines.push('Size: ' + opts.size);
    if (opts.color) lines.push('Color: ' + opts.color);
    lines.push('Quantity: ' + opts.qty);
    lines.push('Price: ' + fmtPrice(p.price));
    lines.push('');
    lines.push('Product Page:');
    lines.push(window.location.href);
    lines.push('');
    lines.push('Please confirm availability, delivery charges and payment details.');
    lines.push('');
    lines.push('Thank you.');
    return lines.join('\n');
  }

  function generalMessage() {
    return 'Assalam-o-Alaikum ' + (CFG.brandName || 'Mr ZF') + ',\n\nI visited your website and would like some assistance.';
  }

  function openWhatsApp(message) {
    var a = document.createElement('a');
    a.href = waLink(message);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* Wire every WhatsApp trigger on the page */
  function initWhatsAppButtons() {
    $$('[data-wa]').forEach(function (btn) {
      var msg = btn.getAttribute('data-wa') === 'order' ? '' : generalMessage();
      if (msg) { btn.href = waLink(msg); }
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.addEventListener('click', function (e) {
        if (!waConfigured()) {
          e.preventDefault();
          storeNotConnected();
          return;
        }
        if (msg) {
          e.preventDefault();
          openWhatsApp(msg);
        }
        /* data-wa="order" buttons handle themselves inside the product page */
      });
    });
  }

  function storeNotConnected() {
    var toast = $('#toast');
    if (!toast) return;
    toast.textContent = '';
    toast.appendChild(document.createTextNode(
      'WhatsApp is not connected yet. Please email us at '
    ));
    var mail = el('a', null, CFG.email || 'us');
    mail.href = 'mailto:' + (CFG.email || '') + '?subject=' + encodeURIComponent((CFG.brandName || 'Mr ZF') + ' Website Enquiry');
    toast.appendChild(mail);
    toast.classList.add('is-visible');
    clearTimeout(storeNotConnected._t);
    storeNotConnected._t = setTimeout(function () { toast.classList.remove('is-visible'); }, 6000);
  }

  function showToast(text, ms) {
    var toast = $('#toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove('is-visible'); }, ms || 3200);
  }

  /* ------------------------- shared UI ------------------------- */
  function initHeader() {
    var header = $('.site-header');
    var onScroll = function () {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = $('.nav-toggle');
    var drawer = $('#mobile-nav');
    if (!toggle || !drawer) return;

    function setMenu(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-locked', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (n) { io.observe(n); });
  }

  function applyConfigText() {
    $$('[data-cfg="tagline"]').forEach(function (n) { n.textContent = CFG.tagline || ''; });
    $$('[data-cfg="announcement"]').forEach(function (n) { n.textContent = CFG.announcement || ''; });
    $$('[data-cfg="wa-display"]').forEach(function (n) { n.textContent = CFG.whatsappDisplay || ''; });
    $$('[data-year]').forEach(function (n) { n.textContent = String(new Date().getFullYear()); });
  }

  function initSocial() {
    var box = $('[data-social]');
    if (!box) return;
    var social = CFG.social || {};
    var links = [
      { key: 'instagramUrl', label: 'Instagram', icon: iconInstagram() },
      { key: 'facebookUrl',  label: 'Facebook',  icon: iconFacebook()  },
      { key: 'tiktokUrl',    label: 'TikTok',    icon: iconTikTok()    }
    ];
    links.forEach(function (l) {
      var url = String(social[l.key] || '').trim();
      if (!url) return; /* empty = hidden — no fake links */
      var a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', (CFG.brandName || 'Mr ZF') + ' on ' + l.label);
      a.innerHTML = l.icon;
      box.appendChild(a);
    });
    box.hidden = !box.children.length;
  }

  function renderDocuments() {
    $$('[data-documents]').forEach(function (list) {
      var docs = Array.isArray(CFG.documents) ? CFG.documents : [];
      docs.forEach(function (d) {
        if (!d || !d.file || !d.name) return;
        var li = el('li');
        var a = document.createElement('a');
        a.href = d.file;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(iconPdf());
        a.appendChild(document.createTextNode(d.name));
        li.appendChild(a);
        list.appendChild(li);
      });
      var host = list.closest('[data-documents-host]');
      if (host) host.hidden = !list.children.length;
    });
  }

  /* ------------------------- product card ------------------------- */
  function productCard(p, soldOutOverlay) {
    var a = el('a', 'product-card' + (p.available ? '' : ' is-soldout'));
    a.href = 'product.html?id=' + encodeURIComponent(p.id);

    var media = el('div', 'media');
    var badges = el('div', 'badges');
    if (!p.available) badges.appendChild(el('span', 'badge badge--soldout', 'Sold Out'));
    else if (p.newArrival) badges.appendChild(el('span', 'badge badge--new', 'New'));
    if (p.featured && p.available) badges.appendChild(el('span', 'badge', 'Featured'));
    if (badges.children.length) media.appendChild(badges);

    var img = document.createElement('img');
    img.src = p.images[0];
    img.alt = p.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    placeholderSwap(img);
    media.appendChild(img);

    if (!p.available && soldOutOverlay !== false) {
      media.appendChild(el('div', 'card-soldout-overlay', 'Currently Sold Out'));
    }

    var info = el('div', 'info');
    info.appendChild(el('span', 'cat', p.category));
    info.appendChild(el('span', 'name', p.name));
    info.appendChild(el('span', 'price', fmtPrice(p.price)));

    a.appendChild(media);
    a.appendChild(info);
    return a;
  }

  function renderGridInto(node, list, emptyText, emptyAction) {
    if (!node) return;
    node.textContent = '';
    if (!list.length) {
      var box = el('div', 'state-box');
      box.appendChild(el('p', 'big', emptyText || 'Nothing found.'));
      if (emptyText === undefined) box.appendChild(el('p', null, 'Try a different search or filter.'));
      if (emptyAction) box.appendChild(emptyAction);
      node.appendChild(box);
      return;
    }
    list.forEach(function (p) { node.appendChild(productCard(p)); });
  }

  /* ------------------------- HOME ------------------------- */
  function initHome() {
    var gridNew = $('[data-grid="new"]');
    var gridFeatured = $('[data-grid="featured"]');
    var catGrid = $('[data-cats]');
    if (!gridNew && !gridFeatured && !catGrid) return;

    loadProducts().then(function (list) {
      var inStock = list.filter(function (p) { return p.available; });

      renderGridInto(gridNew, inStock.filter(function (p) { return p.newArrival; }).slice(0, 4));

      var featured = inStock.filter(function (p) { return p.featured; });
      if (featured.length < 4) {
        inStock.forEach(function (p) {
          if (featured.length >= 8) return;
          if (!featured.some(function (f) { return f.id === p.id; })) featured.push(p);
        });
      }
      renderGridInto(gridFeatured, featured.slice(0, 8));

      if (catGrid) {
        var order = ['Shirts', 'T-Shirts', 'Trousers', 'Jackets', 'Accessories'];
        var cats = {};
        list.forEach(function (p) { cats[p.category] = (cats[p.category] || 0) + 1; });
        var names = Object.keys(cats).sort(function (a, b) {
          var ia = order.indexOf(a), ib = order.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        names.forEach(function (name) {
          var sample = list.filter(function (p) { return p.category === name; })[0];
          var a = el('a', 'cat-card reveal');
          a.href = 'shop.html?cat=' + encodeURIComponent(name);
          var img = document.createElement('img');
          img.src = sample ? sample.images[0] : 'assets/images/products/placeholder.svg';
          img.alt = name + ' category';
          img.loading = 'lazy';
          placeholderSwap(img);
          var label = el('span', 'label');
          label.appendChild(el('b', null, name));
          label.appendChild(el('span', 'count', (cats[name] === 1 ? '1 piece' : cats[name] + ' pieces')));
          a.appendChild(img);
          a.appendChild(label);
          catGrid.appendChild(a);
          if ('IntersectionObserver' in window) reveal.observe(a);
        });
      }
    }).catch(function () {
      renderGridInto(gridNew, [], 'Products are loading…');
      renderGridInto(gridFeatured, [], 'Products are loading…');
    });
  }

  /* ------------------------- SHOP ------------------------- */
  function initShop() {
    var grid = $('[data-grid="shop"]');
    if (!grid) return;

    var searchInput = $('#shop-search');
    var chipRow = $('#chip-row');
    var note = $('#result-note');
    var state = { q: qsParam('q'), cat: qsParam('cat') || 'All' };

    function matches(p) {
      var okCat =
        state.cat === 'All' ? true :
        state.cat === 'New' ? p.newArrival :
        state.cat === 'Featured' ? p.featured :
        p.category === state.cat;
      if (!okCat) return false;
      if (!state.q) return true;
      var hay = (p.name + ' ' + p.category + ' ' + p.description + ' ' + p.id).toLowerCase();
      return hay.indexOf(state.q.toLowerCase()) !== -1;
    }

    function currentList() {
      return PRODUCTS.filter(matches).sort(function (a, b) {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return 0;
      });
    }

    function refresh() {
      var list = currentList();
      renderGridInto(grid, list);
      if (note) {
        var label = state.cat === 'All' ? 'all products' :
          state.cat === 'New' ? 'new arrivals' :
          state.cat === 'Featured' ? 'featured pieces' : state.cat.toLowerCase();
        note.textContent = 'Showing ' + list.length + ' of ' + PRODUCTS.length + ' products — ' + label;
      }
      $$('.chip', chipRow).forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-cat') === state.cat);
        c.setAttribute('aria-pressed', c.getAttribute('data-cat') === state.cat ? 'true' : 'false');
      });
    }

    loadProducts().then(function (list) {
      /* build filter chips from real data */
      if (chipRow) {
        var cats = [];
        list.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
        var defs = ['All', 'New', 'Featured'].concat(cats.sort());
        defs.forEach(function (name) {
          var b = el('button', 'chip', name === 'New' ? 'New Arrivals' : name === 'Featured' ? 'Featured' : name);
          b.type = 'button';
          b.setAttribute('data-cat', name);
          b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', function () {
            state.cat = name;
            setParam('cat', name === 'All' ? '' : name);
            refresh();
          });
          chipRow.appendChild(b);
        });
      }

      if (searchInput) {
        var t = null;
        searchInput.value = state.q;
        searchInput.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            state.q = searchInput.value.trim();
            setParam('q', state.q);
            refresh();
          }, 140);
        });
      }

      var reset = $('#clear-filters');
      if (reset) reset.addEventListener('click', function () {
        state.q = ''; state.cat = 'All';
        if (searchInput) searchInput.value = '';
        setParam('q', ''); setParam('cat', '');
        refresh();
      });

      refresh();
    }).catch(function () {
      renderGridInto(grid, [], 'Products could not be loaded.',
        (function () {
          var b = el('button', 'btn btn--sm', 'Try again');
          b.type = 'button';
          b.addEventListener('click', function () { window.location.reload(); });
          return b;
        })()
      );
    });
  }

  /* ------------------------- PRODUCT PAGE ------------------------- */
  function initProduct() {
    var wrap = $('#pdp');
    if (!wrap) return;

    loadProducts().then(function (list) {
      var id = qsParam('id');
      var p = list.filter(function (x) { return x.id === id; })[0];

      if (!p) {
        $('#pdp-notfound').hidden = false;
        wrap.hidden = true;
        document.title = 'Product not found — ' + (CFG.brandName || 'Mr ZF');
        return;
      }

      document.title = p.name + ' — ' + (CFG.brandName || 'Mr ZF');
      var desc = $('meta[name="description"]');
      if (desc && p.description) desc.setAttribute('content', p.description);

      /* --- gallery --- */
      var mainImg = $('#pdp-main-img');
      var thumbs = $('#pdp-thumbs');
      mainImg.src = p.images[0];
      mainImg.alt = p.name;
      placeholderSwap(mainImg);
      if (p.images.length > 1) {
        p.images.forEach(function (src, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = i === 0 ? 'is-active' : '';
          b.setAttribute('aria-label', 'Show image ' + (i + 1) + ' of ' + p.name);
          var t = document.createElement('img');
          t.src = src; t.alt = ''; t.loading = 'lazy';
          placeholderSwap(t);
          b.appendChild(t);
          b.addEventListener('click', function () {
            mainImg.src = src;
            $$('#pdp-thumbs button').forEach(function (x) { x.classList.remove('is-active'); });
            b.classList.add('is-active');
          });
          thumbs.appendChild(b);
        });
      } else {
        thumbs.hidden = true;
      }

      /* --- info --- */
      $('#pdp-cat').textContent = p.category;
      $('#pdp-name').textContent = p.name;
      $('#pdp-code').textContent = 'Code: ' + p.id;
      var stock = $('#pdp-stock');
      if (p.available) { stock.textContent = 'In stock'; }
      else { stock.textContent = 'Sold out'; stock.classList.add('out'); }
      $('#pdp-price').textContent = fmtPrice(p.price);
      $('#pdp-desc').textContent = p.description || 'Contact us on WhatsApp for details about this piece.';

      /* --- options --- */
      var sel = { size: '', color: '' };
      var errBox = $('#pdp-error');
      var orderBtn = $('#pdp-order');

      function buildOptions(rowEl, values, key, labelSel) {
        if (!values.length) {
          var group = rowEl.closest('.option-group');
          if (group) group.hidden = true;
          return;
        }
        if (values.length === 1) sel[key] = values[0]; /* "One Size" etc. auto-selected */
        values.forEach(function (v) {
          var b = el('button', 'opt', v);
          b.type = 'button';
          b.setAttribute('data-value', v);
          b.setAttribute('aria-pressed', v === sel[key] ? 'true' : 'false');
          b.addEventListener('click', function () {
            sel[key] = v;
            errBox.classList.remove('is-visible');
            $$('button', rowEl).forEach(function (x) {
              x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
            });
            var live = $(labelSel);
            if (live) live.textContent = v;
          });
          rowEl.appendChild(b);
        });
        if (sel[key]) {
          var live = $(labelSel);
          if (live) live.textContent = sel[key];
        }
      }
      buildOptions($('#pdp-sizes'), p.sizes, 'size', '#pdp-size-sel');
      buildOptions($('#pdp-colors'), p.colors, 'color', '#pdp-color-sel');

      /* --- quantity --- */
      var qtyInput = $('#pdp-qty');
      $('#pdp-qty-minus').addEventListener('click', function () {
        qtyInput.value = String(Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1));
      });
      $('#pdp-qty-plus').addEventListener('click', function () {
        qtyInput.value = String(Math.min(99, (parseInt(qtyInput.value, 10) || 1) + 1));
      });

      /* --- CTAs --- */
      if (!p.available) {
        orderBtn.hidden = true;
        $('#pdp-soldout-note').hidden = false;
      } else {
        orderBtn.addEventListener('click', function () {
          var missing = [];
          if (p.sizes.length && !sel.size) missing.push('size');
          if (p.colors.length && !sel.color) missing.push('colour');
          if (missing.length) {
            errBox.textContent = 'Please choose a ' + missing.join(' and a ') + ' before ordering — it only takes a second.';
            errBox.classList.add('is-visible');
            if ('scrollIntoView' in errBox) errBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
          }
          errBox.classList.remove('is-visible');
          var qty = Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));
          openWhatsApp(orderMessage(p, { size: sel.size, color: sel.color, qty: qty }));
        });
      }

      /* --- related --- */
      var relGrid = $('#pdp-related-grid');
      var related = list.filter(function (x) { return x.available && x.id !== p.id && x.category === p.category; });
      if (related.length < 4) {
        list.forEach(function (x) {
          if (related.length >= 4) return;
          if (x.available && x.id !== p.id && !related.some(function (r) { return r.id === x.id; })) related.push(x);
        });
      }
      renderGridInto(relGrid, related.slice(0, 4));

      wrap.hidden = false;
    }).catch(function () {
      $('#pdp-notfound').hidden = false;
      $('#pdp-notfound').querySelector('.big').textContent = 'Products could not be loaded.';
      wrap.hidden = true;
    });
  }

  /* ------------------------- APPOINTMENT PAGE ------------------------- */
  function initAppointment() {
    var embed = $('#booking-embed');
    if (!embed) return;

    var url = String(CFG.bookingUrl || '').trim();
    var isHttp = /^https:\/\//i.test(url);
    var notice = $('#booking-notice');

    if (isHttp) {
      var frame = document.createElement('iframe');
      frame.src = url;
      frame.title = 'Book an appointment with ' + (CFG.ownerName || 'Mr ZF');
      frame.loading = 'lazy';
      embed.appendChild(frame);
      var openBtn = $('#booking-open');
      if (openBtn) { openBtn.href = url; openBtn.target = '_blank'; openBtn.rel = 'noopener noreferrer'; }
    } else {
      embed.hidden = true;
      if (notice) notice.hidden = false;
      var btn = $('#booking-primary');
      if (btn) {
        btn.addEventListener('click', function () {
          showToast('Online booking is not set up yet. Please message us on WhatsApp or send an email — we will arrange a time for you.');
        });
      }
    }
  }

  /* ------------------------- icons ------------------------- */
  function svg(htmlStr) {
    var t = document.createElement('template');
    t.innerHTML = htmlStr.trim();
    return t.content.firstChild;
  }
  function iconWa() {
    return svg('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>');
  }
  window.MRZF_iconWa = iconWa;
  function iconPdf() {
    return svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M9 18h3"/></svg>');
  }
  function iconInstagram() {
    return svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>');
  }
  function iconFacebook() {
    return svg('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.5h-2.6C11.2 2.5 10 4 10 6.6v1.9H8v3h2V22h4v-9.5h2.7l.3-3z"/></svg>');
  }
  function iconTikTok() {
    return svg('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.1 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v5.9c0 3.6-2.4 5.8-5.5 5.8-3 0-5.1-2-5.1-4.9 0-2.9 2.2-5 5.4-4.9v3.1c-1.5-.2-2.5.7-2.5 1.9 0 1.1.9 1.9 2.1 1.9 1.4 0 2.4-1 2.4-2.8V3z"/></svg>');
  }

  /* ------------------------- boot ------------------------- */
  var reveal = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' })
    : null;

  function boot() {
    applyConfigText();
    initHeader();
    initSocial();
    renderDocuments();
    initWhatsAppButtons();
    initReveal();

    var page = document.body.getAttribute('data-page') || '';
    if (page === 'home') initHome();
    if (page === 'shop') initShop();
    if (page === 'product') initProduct();
    if (page === 'appointment') initAppointment();

    /* reveal targets present in static HTML */
    if (reveal) $$('.reveal').forEach(function (n) { reveal.observe(n); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
