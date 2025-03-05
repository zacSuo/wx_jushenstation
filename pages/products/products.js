// pages/products/products.js
Page({
  data: {
    products: [
      {
        id: 1,
        name: 'DeepSeek Coder',
        description: '一款强大的AI代码助手，支持多种编程语言，帮助开发者提高编码效率。',
        price: '免费试用',
        tags: ['AI', '编程', '开发工具']
      },
      {
        id: 2,
        name: 'DeepSeek Chat',
        description: '智能对话机器人，可以回答问题、提供建议、进行创意写作等。',
        price: '免费使用',
        tags: ['AI', '聊天', '助手']
      },
      {
        id: 3,
        name: 'DeepSeek Translator',
        description: '高精度多语言翻译工具，支持100+种语言互译，适合国际交流和学习。',
        price: '免费使用',
        tags: ['AI', '翻译', '语言']
      },
      {
        id: 4,
        name: 'DeepSeek Office',
        description: '智能办公套件，包含文档生成、数据分析、演示制作等功能。',
        price: '¥99/月',
        tags: ['AI', '办公', '生产力']
      },
      {
        id: 5,
        name: 'DeepSeek Research',
        description: '科研助手，帮助研究人员进行文献检索、数据分析和论文写作。',
        price: '¥199/月',
        tags: ['AI', '科研', '学术']
      }
    ],
    currentTab: 0,
    tabs: ['全部', 'AI工具', '办公', '开发', '教育']
  },

  onLoad: function (options) {
    // 可以在这里从服务器获取产品数据
  },

  // 切换标签页
  switchTab: function(e) {
    const tabIndex = e.currentTarget.dataset.index
    this.setData({
      currentTab: tabIndex
    })
    
    // 根据标签筛选产品
    this.filterProducts(tabIndex)
  },
  
  // 根据标签筛选产品
  filterProducts: function(tabIndex) {
    // 这里可以实现产品筛选逻辑
    // 目前使用的是静态数据，所以不做实际筛选
  },
  
  // 查看产品详情
  viewProductDetail: function(e) {
    const productId = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '产品详情功能正在开发中',
      showCancel: false
    })
  },
  
  // 分享产品
  shareProduct: function(e) {
    const productId = e.currentTarget.dataset.id
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  }
})
