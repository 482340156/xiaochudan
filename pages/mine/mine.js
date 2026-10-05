const { menuInfo, dishes } = require('../../data/menu.js')
const store = require('../../utils/store.js')
const api = require('../../utils/api.js')

const DEFAULT_HINT = '填了地址，点单会直接进电脑上的后台；不填也能用，点单会生成文字，复制发给主理人。'

Page({
  data: {
    info: menuInfo,
    dishCount: dishes.length,
    favCount: 0,
    cartCount: 0,
    serverUrl: '',
    serverHint: DEFAULT_HINT,
    testing: false
  },

  onShow() {
    store.updateBadge()
    this.setData({
      favCount: store.favDishes().length,
      cartCount: store.cartCount(),
      serverUrl: api.getBase()
    })
  },

  onServerInput(e) {
    this.setData({ serverUrl: e.detail.value })
  },

  saveServer() {
    const value = api.setBase(this.data.serverUrl)
    this.setData({
      serverUrl: value,
      serverHint: value ? '已保存：' + value : DEFAULT_HINT
    })
    wx.showToast({ title: value ? '已保存' : '已清空', icon: 'none' })
  },

  testServer() {
    if (this.data.testing) return

    api.setBase(this.data.serverUrl)
    if (!api.isConnected()) {
      wx.showToast({ title: '先填服务器地址', icon: 'none' })
      return
    }

    const that = this
    this.setData({ testing: true, serverHint: '正在连接…' })

    api
      .ping()
      .then(function (res) {
        const ok = !!(res && res.ok)
        that.setData({
          testing: false,
          serverHint: ok ? '连接成功，点单可以直接提交了' : '有回应，但不太像菜单服务'
        })
        wx.showToast({ title: ok ? '连接成功' : '回应异常', icon: 'none' })
      })
      .catch(function (err) {
        that.setData({
          testing: false,
          serverHint: (err && err.message) || '连不上，检查地址和网络'
        })
        wx.showToast({ title: '连不上', icon: 'none' })
      })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  clearAll() {
    wx.showModal({
      title: '清空本地数据',
      content: '会清掉选好的菜、收藏和备注。服务器上的订单不受影响。',
      success: function (res) {
        if (!res.confirm) return
        store.clearCart()
        store.clearNote()
        store.clearFavs()
        wx.showToast({ title: '已清空', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: menuInfo.shopName + '：' + menuInfo.slogan,
      path: '/pages/index/index'
    }
  }
})
