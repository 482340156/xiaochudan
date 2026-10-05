const { menuInfo, categories, dishes } = require('../../data/menu.js')
const store = require('../../utils/store.js')

const app = getApp()

function decorate(dish) {
  return Object.assign({}, dish, {
    qty: store.getQty(dish.id),
    spicyText: dish.spicy > 0 ? new Array(dish.spicy + 1).join('🌶️') : ''
  })
}

Page({
  data: {
    info: menuInfo,
    navPad: 64,
    cats: [{ id: 'all', name: '全部' }].concat(categories),
    activeCat: 'all',
    activeCatName: '全部菜品',
    keyword: '',
    list: [],
    recommends: [],
    total: dishes.length,
    recommendCount: 0,
    cartCount: 0,
    cartTotal: 0,
    showRecommend: true
  },

  onLoad() {
    let statusBar = 20
    try {
      statusBar = (app && app.globalData && app.globalData.statusBarHeight) || 20
    } catch (e) {}

    const recommends = dishes
      .filter(function (d) {
        return d.recommend
      })
      .map(decorate)

    this.setData({
      navPad: statusBar + 44,
      recommends: recommends,
      recommendCount: recommends.length
    })

    this.refresh()
  },

  onShow() {
    store.updateBadge()
    this.syncCart()
    this.refresh()
  },

  refresh() {
    const cat = this.data.activeCat
    const kw = (this.data.keyword || '').trim().toLowerCase()

    let list = dishes

    if (cat !== 'all') {
      list = list.filter(function (d) {
        return d.category === cat
      })
    }

    if (kw) {
      list = list.filter(function (d) {
        const haystack = [d.name, d.desc].concat(d.ingredients || []).join(' ').toLowerCase()
        return haystack.indexOf(kw) > -1
      })
    }

    const nameMap = { all: '全部菜品' }
    categories.forEach(function (c) {
      nameMap[c.id] = c.name
    })

    this.setData({
      list: list.map(decorate),
      activeCatName: nameMap[cat] || '菜单',
      showRecommend: cat === 'all' && !kw
    })
  },

  syncCart() {
    this.setData({
      cartCount: store.cartCount(),
      cartTotal: store.cartTotal()
    })
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.refresh()
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.refresh()
  },

  onCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.id })
    this.refresh()
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id
    })
  },

  addOne(e) {
    const id = e.currentTarget.dataset.id
    store.addToCart(id, 1)
    try {
      wx.vibrateShort({ type: 'light', fail: function () {} })
    } catch (err) {}
    this.refresh()
    this.syncCart()
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  onShareAppMessage() {
    return {
      title: menuInfo.shopName + '：' + menuInfo.slogan,
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: menuInfo.shopName + '：' + menuInfo.slogan
    }
  }
})
