// pages/webview/webview.js
Page({
  data: {
    url: ''
  },
  
  onLoad: function (options) {
    if (options.url) {
      this.setData({
        url: decodeURIComponent(options.url)
      });
    }
  },
  
  // 处理网页加载错误
  handleLoadError: function(e) {
    console.error('网页加载错误', e);
    wx.showToast({
      title: '网页加载失败',
      icon: 'none'
    });
  }
});
