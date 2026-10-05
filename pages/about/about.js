const { menuInfo, dishes, categories } = require('../../data/menu.js')
const store = require('../../utils/store.js')

Page({
  data: {
    info: menuInfo,
    dishCount: dishes.length,
    catCount: categories.length,
    favCount: 0
  },

  onShow() {
    this.setData({ favCount: store.favDishes().length })
  },

  copyContact() {
    const contact = menuInfo.contact
    if (!contact) {
      wx.showToast({ title: '主理人还没留联系方式', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: contact,
      success: function () {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  goMenu() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    return {
      title: menuInfo.shopName + '：' + menuInfo.slogan,
      path: '/pages/index/index'
    }
  }
})
