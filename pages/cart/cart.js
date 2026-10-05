const { menuInfo } = require('../../data/menu.js')
const store = require('../../utils/store.js')
const api = require('../../utils/api.js')

Page({
  data: {
    info: menuInfo,
    items: [],
    total: 0,
    count: 0,
    note: '',
    connected: false,
    submitting: false,
    showResult: false,
    orderNo: '',
    orderText: ''
  },

  onShow() {
    store.updateBadge()
    this.setData({
      connected: api.isConnected(),
      note: store.getNote()
    })
    this.refresh()
  },

  refresh() {
    this.setData({
      items: store.cartList(),
      total: store.cartTotal(),
      count: store.cartCount()
    })
  },

  plus(e) {
    store.addToCart(e.currentTarget.dataset.id, 1)
    this.refresh()
  },

  minus(e) {
    store.addToCart(e.currentTarget.dataset.id, -1)
    this.refresh()
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
    store.setNote(e.detail.value)
  },

  payloadItems() {
    return store.cartList().map(function (it) {
      return { id: it.id, qty: it.qty }
    })
  },

  copyList() {
    const text = store.orderText()
    if (!text) {
      wx.showToast({ title: '还没选菜', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({ title: '已复制，去微信发给主理人', icon: 'none' })
      }
    })
  },

  submit() {
    if (!this.data.items.length) {
      wx.showToast({ title: '还没选菜', icon: 'none' })
      return
    }
    if (this.data.connected) {
      this.submitToServer()
    } else {
      this.copyList()
    }
  },

  submitToServer() {
    const that = this
    if (this.data.submitting) return

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中', mask: true })

    api
      .submitOrder({
        items: this.payloadItems(),
        note: this.data.note
      })
      .then(function (res) {
        wx.hideLoading()
        that.setData({ submitting: false })
        if (!res || !res.ok) {
          wx.showToast({ title: (res && res.error) || '提交失败', icon: 'none' })
          return
        }
        store.clearCart()
        store.clearNote()
        that.refresh()
        that.setData({
          showResult: true,
          orderNo: res.order_no,
          orderText: res.text || ''
        })
      })
      .catch(function (err) {
        wx.hideLoading()
        that.setData({ submitting: false })
        wx.showModal({
          title: '没提交成功',
          content: (err && err.message) || '连不上服务器',
          confirmText: '复制清单',
          cancelText: '知道了',
          success: function (r) {
            if (r.confirm) that.copyList()
          }
        })
      })
  },

  copyResult() {
    const text = this.data.orderText
    if (!text) return
    wx.setClipboardData({ data: text })
  },

  closeResult() {
    this.setData({ showResult: false })
  },

  clearAll() {
    const that = this
    wx.showModal({
      title: '清空点单',
      content: '确定要把选好的菜都去掉吗？',
      success: function (res) {
        if (!res.confirm) return
        store.clearCart()
        store.clearNote()
        that.setData({ note: '' })
        that.refresh()
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
