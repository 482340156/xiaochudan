const { getDishById, menuInfo } = require('../../data/menu.js')
const store = require('../../utils/store.js')

Page({
  data: {
    info: menuInfo,
    dish: null,
    qty: 0,
    fav: false,
    cartCount: 0,
    cartTotal: 0,
    notFound: false
  },

  onLoad(options) {
    const dish = getDishById(options.id)

    if (!dish) {
      this.setData({ notFound: true })
      wx.setNavigationBarTitle({ title: '菜品不存在' })
      return
    }

    wx.setNavigationBarTitle({ title: dish.name })
    this.setData({ dish: dish })
    this.sync()
  },

  onShow() {
    store.updateBadge()
    this.sync()
  },

  sync() {
    const dish = this.data.dish
    if (!dish) return

    this.setData({
      qty: store.getQty(dish.id),
      fav: store.isFav(dish.id),
      cartCount: store.cartCount(),
      cartTotal: store.cartTotal()
    })
  },

  addOne() {
    const dish = this.data.dish
    if (!dish) return
    store.addToCart(dish.id, 1)
    try {
      wx.vibrateShort({ type: 'light', fail: function () {} })
    } catch (e) {}
    this.sync()
  },

  minusOne() {
    const dish = this.data.dish
    if (!dish) return
    store.addToCart(dish.id, -1)
    this.sync()
  },

  mainAction() {
    if (this.data.qty > 0) {
      wx.switchTab({ url: '/pages/cart/cart' })
    } else {
      this.addOne()
      wx.showToast({ title: '已加入点单', icon: 'none' })
    }
  },

  toggleFav() {
    const dish = this.data.dish
    if (!dish) return
    const added = store.toggleFav(dish.id)
    this.setData({ fav: added })
    wx.showToast({
      title: added ? '已收藏' : '已取消收藏',
      icon: 'none'
    })
  },

  copyRecipe() {
    const dish = this.data.dish
    if (!dish) return

    const lines = []
    lines.push('【' + dish.name + '】来自 ' + menuInfo.shopName)
    lines.push('')
    lines.push('食材：')
    ;(dish.ingredients || []).forEach(function (item) {
      lines.push('· ' + item)
    })
    lines.push('')
    lines.push('做法：')
    ;(dish.steps || []).forEach(function (step, i) {
      lines.push(i + 1 + '. ' + step)
    })
    if (dish.tips) {
      lines.push('')
      lines.push('小贴士：' + dish.tips)
    }

    wx.setClipboardData({
      data: lines.join('\n'),
      success: function () {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    const dish = this.data.dish
    return {
      title: dish ? dish.name + ' · ' + menuInfo.shopName : menuInfo.shopName,
      path: dish ? '/pages/detail/detail?id=' + dish.id : '/pages/index/index'
    }
  }
})
