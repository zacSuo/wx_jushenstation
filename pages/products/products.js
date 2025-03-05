// pages/products/products.js
Page({
  data: {
    // 论文数据
    papers: [
      {
        id: 1,
        title: 'Qwen2: Scaling up to 72B and Beyond with 8K Context',
        abstract: '阿里云发布的Qwen2系列大模型，包括从0.5B到72B的不同规模，支持8K上下文长度，在多项基准测试中表现优异。论文详细介绍了模型架构、训练方法和评估结果。',
        authors: 'Alibaba Cloud Intelligence',
        date: '2024-05-15',
        tags: ['大模型', 'LLM', '阿里'],
        link: 'https://qwenlm.github.io/blog/qwen2/',
        category: 'llm'
      },
      {
        id: 2,
        title: 'ByteVerse: A Generalist Agent for 3D Virtual Worlds',
        abstract: '字节跳动研究的多模态智能体ByteVerse，能够在3D虚拟世界中执行复杂任务，结合了视觉理解、规划和执行能力，展示了具身智能的最新进展。',
        authors: 'ByteDance Research',
        date: '2024-06-10',
        tags: ['具身智能', '3D', '字节'],
        link: 'https://example.com/byteverse',
        category: 'embodied'
      },
      {
        id: 3,
        title: 'DamoGLM: A Multilingual Multimodal Generative Language Model',
        abstract: '阿里达摩院推出的多语言多模态生成式语言模型，支持中英日韩等多种语言，能够理解图像、视频并生成高质量文本，在跨语言跨模态任务上表现卓越。',
        authors: 'DAMO Academy, Alibaba Group',
        date: '2024-04-28',
        tags: ['多模态', '多语言', '阿里'],
        link: 'https://example.com/damoglm',
        category: 'multimodal'
      },
      {
        id: 4,
        title: 'ByteRobot: Embodied Intelligence for Industrial Applications',
        abstract: '字节跳动在工业机器人领域的最新研究，结合大模型与机器人控制技术，实现了复杂工业环境下的自主操作，展示了AI在实体世界的应用潜力。',
        authors: 'ByteDance AI Lab',
        date: '2024-07-05',
        tags: ['机器人', '工业应用', '字节'],
        link: 'https://example.com/byterobot',
        category: 'embodied'
      },
      {
        id: 5,
        title: 'Alibaba M2M: A Framework for Machine-to-Machine Collaboration',
        abstract: '阿里巴巴提出的机器间协作框架，使多个AI系统能够自主协作完成复杂任务，类似人类团队合作，在解决复杂问题上展现出超越单一模型的能力。',
        authors: 'Alibaba DAMO Academy',
        date: '2024-05-30',
        tags: ['协作智能', '多智能体', '阿里'],
        link: 'https://example.com/alibabam2m',
        category: 'agent'
      }
    ],
    filteredPapers: [], // 当前显示的论文
    currentTab: 0,
    tabs: ['全部', '大模型', '多模态', '具身智能', '智能体']
  },

  onLoad: function (options) {
    // 初始化时显示全部论文
    this.filterPapers(0);
  },

  // 切换标签页
  switchTab: function(e) {
    const tabIndex = e.currentTarget.dataset.index;
    this.setData({
      currentTab: tabIndex
    });
    
    // 根据标签筛选论文
    this.filterPapers(tabIndex);
  },
  
  // 根据标签筛选论文
  filterPapers: function(tabIndex) {
    let filteredPapers = [];
    
    switch(tabIndex) {
      case 0: // 全部
        filteredPapers = this.data.papers;
        break;
      case 1: // 大模型
        filteredPapers = this.data.papers.filter(paper => 
          paper.category === 'llm' || paper.tags.includes('大模型') || paper.tags.includes('LLM'));
        break;
      case 2: // 多模态
        filteredPapers = this.data.papers.filter(paper => 
          paper.category === 'multimodal' || paper.tags.includes('多模态'));
        break;
      case 3: // 具身智能
        filteredPapers = this.data.papers.filter(paper => 
          paper.category === 'embodied' || paper.tags.includes('具身智能') || paper.tags.includes('机器人'));
        break;
      case 4: // 智能体
        filteredPapers = this.data.papers.filter(paper => 
          paper.category === 'agent' || paper.tags.includes('智能体') || paper.tags.includes('多智能体'));
        break;
    }
    
    this.setData({
      filteredPapers: filteredPapers
    });
  },
  
  // 导航到论文链接
  navigateToLink: function(e) {
    const link = e.currentTarget.dataset.link;
    wx.showModal({
      title: '外部链接',
      content: '即将前往外部链接查看论文详情',
      success: (res) => {
        if (res.confirm) {
          // 在小程序内打开网页
          wx.navigateTo({
            url: `/pages/webview/webview?url=${encodeURIComponent(link)}`
          });
        }
      }
    });
  },
  
  // 分享产品
  shareProduct: function(e) {
    const productId = e.currentTarget.dataset.id;
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  }
});
