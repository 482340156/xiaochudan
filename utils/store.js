const { dishes, menuInfo } = require('../data/menu.js')

const CART_KEY = 'pm_cart_v1'
const FAV_KEY = 'pm_favs_v1'
const NOTE_KEY = 'pm_note_v1'

function readCart() {
  try {
    const raw = wx.getStorageSync(CART_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    return {}
  }
}

function writeCart(cart) {
  try {
    wx.setStorageSync(CART_KEY, cart)
  } catch (e) {}
  updateBadge()
}

function readFavs() {
  try {
    const raw = wx.getStorageSync(FAV_KEY)
    return Array.isArray(raw) ? raw : []
  } catch (e) {
    return []
  }
}

function writeFavs(list) {
  try {
    wx.setStorageSync(FAV_KEY, list)
  } catch (e) {}
}

function keyOf(id) {
  return String(id)
}

function getDish(id) {
  const k = keyOf(id)
  for (let i = 0; i < dishes.length; i++) {
    if (keyOf(dishes[i].id) === k) return dishes[i]
  }
  return null
}

function getQty(id) {
  const cart = readCart()
  return cart[keyOf(id)] || 0
}

function setQty(id, qty) {
  const cart = readCart()
  const k = keyOf(id)
  const next = Math.max(0, Math.floor(qty || 0))
  if (next === 0) {
    delete cart[k]
  } else {
    cart[k] = next
  }
  writeCart(cart)
  return next
}

function addToCart(id, delta) {
  return setQty(id, getQty(id) + (delta || 1))
}

function clearCart() {
  writeCart({})
}

function cartCount() {
  const cart = readCart()
  let n = 0
  Object.keys(cart).forEach(function (k) {
    n += cart[k]
  })
  return n
}

function cartList() {
  const cart = readCart()
  const list = []
  Object.keys(cart).forEach(function (k) {
    const dish = getDish(k)
    if (dish) {
      list.push({
        id: dish.id,
        name: dish.name,
        emoji: dish.emoji,
        color: dish.color,
        color2: dish.color2,
        price: dish.price,
        unit: dish.unit,
        tags: dish.tags,
        qty: cart[k],
        subtotal: Math.round(dish.price * cart[k] * 100) / 100
      })
    }
  })
  return list
}

function cartTotal() {
  let total = 0
  cartList().forEach(function (it) {
    total += it.subtotal
  })
  return Math.round(total * 100) / 100
}

function getFavs() {
  return readFavs()
}

function isFav(id) {
  return readFavs().map(keyOf).indexOf(keyOf(id)) > -1
}

function toggleFav(id) {
  const list = readFavs()
  const k = keyOf(id)
  const idx = list.map(keyOf).indexOf(k)
  if (idx > -1) {
    list.splice(idx, 1)
  } else {
    list.unshift(Number(id) || id)
  }
  writeFavs(list)
  return idx === -1
}

function favDishes() {
  const list = readFavs()
  const out = []
  list.forEach(function (id) {
    const dish = getDish(id)
    if (dish) out.push(dish)
  })
  return out
}

function clearFavs() {
  writeFavs([])
}

function getNote() {
  try {
    return wx.getStorageSync(NOTE_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setNote(text) {
  try {
    wx.setStorageSync(NOTE_KEY, text || '')
  } catch (e) {}
}

function clearNote() {
  try {
    wx.removeStorageSync(NOTE_KEY)
  } catch (e) {}
}

function updateBadge() {
  const n = cartCount()
  try {
    if (n > 0) {
      wx.setTabBarBadge({ index: 1, text: n > 99 ? '99+' : String(n), fail: function () {} })
    } else {
      wx.removeTabBarBadge({ index: 1, fail: function () {} })
    }
  } catch (e) {}
}

function orderText() {
  const list = cartList()
  if (!list.length) return ''
  const lines = []
  lines.push('【' + menuInfo.shopName + ' · 点单清单】')
  lines.push('————————————')
  list.forEach(function (it) {
    lines.push(it.name + ' × ' + it.qty + '   ¥' + it.subtotal)
  })
  lines.push('————————————')
  lines.push('合计：¥' + cartTotal() + '（' + cartCount() + ' 份）')
  const note = getNote()
  if (note) lines.push('备注：' + note)
  if (menuInfo.contact) lines.push('联系主理人：' + menuInfo.contact)
  return lines.join('\n')
}

function init() {
  updateBadge()
}

module.exports = {
  getDish: getDish,
  getQty: getQty,
  setQty: setQty,
  addToCart: addToCart,
  clearCart: clearCart,
  cartCount: cartCount,
  cartList: cartList,
  cartTotal: cartTotal,
  getFavs: getFavs,
  isFav: isFav,
  toggleFav: toggleFav,
  favDishes: favDishes,
  clearFavs: clearFavs,
  getNote: getNote,
  setNote: setNote,
  clearNote: clearNote,
  updateBadge: updateBadge,
  orderText: orderText,
  init: init
}
