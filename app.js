const store = require('./utils/store.js')

App({
  globalData: {
    statusBarHeight: 20
  },

  onLaunch() {
    store.init()

    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      this.globalData.statusBarHeight = info.statusBarHeight || 20
    } catch (e) {
      this.globalData.statusBarHeight = 20
    }
  },

  onShow() {
    store.updateBadge()
  }
})
