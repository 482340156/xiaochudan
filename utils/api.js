/**
 * 可选：把点单直接提交到你自己跑的 Python 服务器。
 *
 * 不填地址也能用 —— 点单会生成一段文字，复制后发微信给主理人。
 * 填了地址（在「我的」页面里设置），点单就会直接进服务器后台。
 */

const BASE_KEY = 'pm_server_v1'

function normalize(url) {
  let value = (url || '').trim()
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) value = 'http://' + value
  while (value.length > 1 && value.charAt(value.length - 1) === '/') {
    value = value.slice(0, -1)
  }
  return value
}

function getBase() {
  try {
    return wx.getStorageSync(BASE_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setBase(url) {
  const value = normalize(url)
  try {
    if (value) {
      wx.setStorageSync(BASE_KEY, value)
    } else {
      wx.removeStorageSync(BASE_KEY)
    }
  } catch (e) {}
  return value
}

function isConnected() {
  return !!getBase()
}

function request(path, options) {
  const opts = options || {}
  return new Promise(function (resolve, reject) {
    const base = getBase()
    if (!base) {
      reject(new Error('还没填服务器地址'))
      return
    }
    wx.request({
      url: base + path,
      method: opts.method || 'GET',
      data: opts.data,
      header: { 'content-type': 'application/json' },
      timeout: 8000,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error('服务器返回 ' + res.statusCode))
        }
      },
      fail: function () {
        reject(new Error('连不上服务器，检查地址和网络'))
      }
    })
  })
}

function ping() {
  return request('/health')
}

function submitOrder(payload) {
  return request('/api/order', { method: 'POST', data: payload })
}

module.exports = {
  normalize: normalize,
  getBase: getBase,
  setBase: setBase,
  isConnected: isConnected,
  request: request,
  ping: ping,
  submitOrder: submitOrder
}
