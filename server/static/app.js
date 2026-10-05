/* 菜单页 / 菜品页的交互：选菜、算钱、提交点单。
   购物车存在浏览器本地（localStorage），所以每个人的选择互不影响。 */
(function () {
  'use strict';

  var DISHES = window.__DISHES__ || {};
  var CART_KEY = 'pm_web_cart_v1';
  var CURRENT = window.__CURRENT_DISH__ || null;

  /* ---------------------------------------------------- 购物车 */

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (err) {
      return {};
    }
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {}
  }

  function getQty(id) {
    return readCart()[String(id)] || 0;
  }

  function setQty(id, qty) {
    var cart = readCart();
    var key = String(id);
    qty = Math.max(0, Math.floor(qty || 0));
    if (qty === 0) {
      delete cart[key];
    } else {
      cart[key] = qty;
    }
    writeCart(cart);
    return qty;
  }

  function addQty(id, delta) {
    return setQty(id, getQty(id) + delta);
  }

  function entries() {
    var cart = readCart();
    return Object.keys(cart).map(function (id) {
      var dish = DISHES[id] || {};
      var price = Number(dish.price) || 0;
      var qty = cart[id];
      return {
        id: Number(id),
        name: dish.name || '菜品 ' + id,
        emoji: dish.emoji || '🍽️',
        unit: dish.unit || '份',
        price: price,
        qty: qty,
        subtotal: Math.round(price * qty * 100) / 100
      };
    });
  }

  function totalCount() {
    return entries().reduce(function (sum, it) {
      return sum + it.qty;
    }, 0);
  }

  function totalPrice() {
    return (
      Math.round(
        entries().reduce(function (sum, it) {
          return sum + it.subtotal;
        }, 0) * 100
      ) / 100
    );
  }

  /* ---------------------------------------------------- 小工具 */

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch];
    });
  }

  var toastTimer = null;

  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('show');
    }, 1700);
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    toast(ok ? '已复制' : '复制失败，长按文字手动复制');
  }

  function copyText(text) {
    if (!text) {
      toast('没有可复制的内容');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast('已复制');
        },
        function () {
          fallbackCopy(text);
        }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ---------------------------------------------------- 渲染 */

  function renderSteppers() {
    var boxes = document.querySelectorAll('[data-stepper]');
    Array.prototype.forEach.call(boxes, function (box) {
      var qty = getQty(box.getAttribute('data-stepper'));
      var minus = box.querySelector('.minus');
      var qtyEl = box.querySelector('.qty');
      if (minus) minus.hidden = qty === 0;
      if (qtyEl) {
        qtyEl.hidden = qty === 0;
        qtyEl.textContent = qty;
      }
    });
  }

  function renderBar() {
    var bar = document.getElementById('bar');
    var countEl = document.getElementById('barCount');
    var totalEl = document.getElementById('barTotal');
    var count = totalCount();
    var total = totalPrice();

    if (CURRENT) {
      var mine = getQty(CURRENT);
      var dish = DISHES[String(CURRENT)] || {};
      if (countEl) {
        countEl.textContent =
          mine > 0
            ? '这道菜已选 ' + mine + ' 份 · 全部共 ' + count + ' 份'
            : '还没选这道菜';
      }
      if (totalEl) totalEl.textContent = '¥' + total;

      var addBtn = document.getElementById('dishAdd');
      if (addBtn) {
        addBtn.textContent =
          mine > 0
            ? '再加一份 · 共 ' + count + ' 份'
            : '加入点单 · ¥' + (dish.price || 0);
      }
      return;
    }

    if (!bar) return;
    bar.hidden = count === 0;
    if (countEl) countEl.textContent = '已选 ' + count + ' 份';
    if (totalEl) totalEl.textContent = '¥' + total;
  }

  function renderSheet() {
    var list = document.getElementById('sheetList');
    if (!list) return;

    var items = entries();
    list.innerHTML = items
      .map(function (it) {
        return (
          '<div class="sheet-row">' +
          '<span class="sr-emoji">' + it.emoji + '</span>' +
          '<span class="sr-name">' + esc(it.name) + '</span>' +
          '<span class="sr-qty">× ' + it.qty + '</span>' +
          '<span class="sr-sub">¥' + it.subtotal + '</span>' +
          '</div>'
        );
      })
      .join('');

    var totalEl = document.getElementById('sheetTotal');
    if (totalEl) totalEl.textContent = '¥' + totalPrice();
  }

  function renderAll() {
    renderSteppers();
    renderBar();
    renderSheet();
  }

  /* ---------------------------------------------------- 搜索 / 分类 */

  function setupFilters() {
    var list = document.getElementById('list');
    if (!list) return;

    var input = document.getElementById('searchInput');
    var cats = document.getElementById('cats');
    var title = document.getElementById('listTitle');
    var countEl = document.getElementById('listCount');
    var empty = document.getElementById('empty');
    var recSection = document.getElementById('recSection');
    var cards = Array.prototype.slice.call(list.querySelectorAll('.card'));
    var state = { cat: 'all', keyword: '' };

    function apply() {
      var shown = 0;
      cards.forEach(function (card) {
        var okCat = state.cat === 'all' || card.getAttribute('data-cat') === state.cat;
        var okKeyword =
          !state.keyword ||
          (card.getAttribute('data-search') || '').toLowerCase().indexOf(state.keyword) > -1;
        var ok = okCat && okKeyword;
        card.hidden = !ok;
        if (ok) shown++;
      });

      if (empty) empty.hidden = shown !== 0;
      if (countEl) countEl.textContent = '共 ' + shown + ' 道';
      if (recSection) recSection.hidden = !(state.cat === 'all' && !state.keyword);

      if (title) {
        var active = cats ? cats.querySelector('.cat-on') : null;
        title.textContent = active ? active.textContent : '全部菜品';
      }
    }

    if (input) {
      input.addEventListener('input', function () {
        state.keyword = input.value.trim().toLowerCase();
        apply();
      });
    }

    if (cats) {
      cats.addEventListener('click', function (ev) {
        var btn = ev.target.closest('.cat');
        if (!btn) return;
        Array.prototype.forEach.call(cats.querySelectorAll('.cat'), function (b) {
          b.classList.remove('cat-on');
        });
        btn.classList.add('cat-on');
        state.cat = btn.getAttribute('data-cat');
        apply();
      });
    }

    apply();
  }

  /* ---------------------------------------------------- 弹层 */

  function openSheet() {
    if (!entries().length) {
      toast('先选几道菜吧');
      return;
    }
    renderSheet();
    var sheet = document.getElementById('sheet');
    if (sheet) sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    var sheet = document.getElementById('sheet');
    if (sheet) sheet.hidden = true;
    document.body.style.overflow = '';
  }

  function showDone(data) {
    var panel = document.querySelector('.sheet-panel');
    if (!panel) return;
    panel.innerHTML =
      '<div class="sheet-head"><h3>点单成功</h3>' +
      '<button class="sheet-close" type="button" data-close="1">✕</button></div>' +
      '<p class="sheet-hint done">订单号 <strong>#' + esc(data.order_no) +
      '</strong>，已经发给主理人了。</p>' +
      '<textarea class="order-text" readonly>' + esc(data.text || '') + '</textarea>' +
      '<button class="primary block" id="copyOrder" type="button">复制清单</button>' +
      '<p class="sheet-hint">也可以长按上面的文字直接复制，再发微信给主理人。</p>';
  }

  function submitOrder() {
    var items = entries().map(function (it) {
      return { id: it.id, qty: it.qty };
    });
    if (!items.length) {
      toast('先选几道菜吧');
      return;
    }

    var btn = document.getElementById('confirmBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '提交中…';
    }

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items,
        customer: fieldValue('fCustomer'),
        contact: fieldValue('fContact'),
        note: fieldValue('fNote')
      })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok) {
          throw new Error((data && data.error) || '提交失败');
        }
        writeCart({});
        showDone(data);
        renderSteppers();
        renderBar();
      })
      .catch(function (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '提交给主理人';
        }
        toast(err.message || '提交失败，再试一次');
      });
  }

  /* ---------------------------------------------------- 事件绑定 */

  document.addEventListener('click', function (ev) {
    var target = ev.target;

    var copyOrder = target.closest('#copyOrder');
    if (copyOrder) {
      var area = document.querySelector('.order-text');
      copyText(area ? area.value : '');
      return;
    }

    var dishAdd = target.closest('#dishAdd');
    if (dishAdd) {
      addQty(dishAdd.getAttribute('data-dish'), 1);
      renderAll();
      toast('已加入点单');
      return;
    }

    var add = target.closest('[data-add]');
    if (add) {
      addQty(add.getAttribute('data-add'), 1);
      renderAll();
      return;
    }

    var minus = target.closest('[data-minus]');
    if (minus) {
      addQty(minus.getAttribute('data-minus'), -1);
      renderAll();
      return;
    }

    if (target.closest('[data-close]')) {
      closeSheet();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    setupFilters();
    renderAll();

    var openBtn = document.getElementById('openSheet');
    if (openBtn) openBtn.addEventListener('click', openSheet);

    var confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', submitOrder);

    var recipeBtn = document.getElementById('copyRecipe');
    if (recipeBtn) {
      recipeBtn.addEventListener('click', function () {
        var source = document.getElementById('recipeSource');
        copyText(source ? source.value : '');
      });
    }
  });
})();
