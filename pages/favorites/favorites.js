const store = require('../../utils/store.js')

Page({
  data: {
    items: []
  },

  onShow() {
    store.updateBadge()
    this.load()
  },

  load() {
    this.setData({
      items: store.favDishes().map(function (dish) {
        return Object.assign({}, dish, { qty: store.getQty(dish.id) })
      })
    })
  },

  addOne(e) {
    store.addToCart(e.currentTarget.dataset.id, 1)
    this.load()
    wx.showToast({ title: '已加入点单', icon: 'none' })
  },

  remove(e) {
    store.toggleFav(e.currentTarget.dataset.id)
    this.load()
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  goMenu() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
