// utils/cloud.js - 统一封装云函数调用

export function callCloud(name, data = {}) {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        console.log(`[云函数 ${name}] 成功:`, res.result)
        resolve(res.result)
      },
      fail: (err) => {
        console.error(`[云函数 ${name}] 失败:`, err)
        reject(err)
      }
    })
    // #endif
  })
}