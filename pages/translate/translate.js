// pages/translate/translate.js
const util = require('../../utils/util.js')

// 模拟翻译响应
function getMockTranslation(text, targetLang) {
  // 简单的模拟翻译（仅用于开发测试）
  const mockTranslations = {
    'zh': {
      'en': '这是一段中文翻译成英文的模拟文本。This is a mock translation from Chinese to English.',
      'ja': '这是一段中文翻译成日文的模拟文本。これは中国語から日本語への模擬翻訳です。',
      'ko': '这是一段中文翻译成韩文的模拟文本。이것은 중국어에서 한국어로의 모의 번역입니다.'
    },
    'en': {
      'zh': 'This is a mock translation from English to Chinese. 这是一段英文翻译成中文的模拟文本。',
      'ja': 'This is a mock translation from English to Japanese. これは英語から日本語への模擬翻訳です。',
      'ko': 'This is a mock translation from English to Korean. 이것은 영어에서 한국어로의 모의 번역입니다.'
    }
  };
  
  // 如果有对应的模拟翻译，则返回
  if (mockTranslations[targetLang]) {
    return `${text}\n\n[模拟翻译]:\n${mockTranslations[targetLang]}`;
  }
  
  // 默认返回
  return `${text}\n\n[模拟翻译]:\n这是一段模拟翻译文本，仅用于开发测试。实际使用时将连接到DeepSeek API获取真实翻译。`;
}

Page({
  data: {
    sourceText: '',
    translatedText: '',
    sourceLang: 'zh',
    targetLang: 'en',
    sourceLangIndex: 0,  // 默认选中中文（索引0）
    targetLangIndex: 1,  // 默认选中英语（索引1）
    languages: {
      'zh': { code: 'zh', name: '中文' },
      'en': { code: 'en', name: '英语' },
      'ja': { code: 'ja', name: '日语' },
      'ko': { code: 'ko', name: '韩语' },
      'fr': { code: 'fr', name: '法语' },
      'de': { code: 'de', name: '德语' },
      'es': { code: 'es', name: '西班牙语' },
      'it': { code: 'it', name: '意大利语' },
      'ru': { code: 'ru', name: '俄语' },
      'pt': { code: 'pt', name: '葡萄牙语' },
      'ar': { code: 'ar', name: '阿拉伯语' }
    },
    languagesArray: [
      { code: 'zh', name: '中文' },
      { code: 'en', name: '英语' },
      { code: 'ja', name: '日语' },
      { code: 'ko', name: '韩语' },
      { code: 'fr', name: '法语' },
      { code: 'de', name: '德语' },
      { code: 'es', name: '西班牙语' },
      { code: 'it', name: '意大利语' },
      { code: 'ru', name: '俄语' },
      { code: 'pt', name: '葡萄牙语' },
      { code: 'ar', name: '阿拉伯语' }
    ],
    isTranslating: false,
    history: [],
    showHistory: false
  },

  onLoad: function (options) {
    // 从本地存储加载历史记录
    const history = wx.getStorageSync('translateHistory') || []
    this.setData({ history })
  },

  // 输入源文本
  handleSourceInput: function(e) {
    this.setData({
      sourceText: e.detail.value
    })
  },

  // 切换源语言
  changeSourceLang: function(e) {
    const index = e.detail.value
    const langCode = this.data.languagesArray[index].code
    this.setData({
      sourceLang: langCode,
      sourceLangIndex: index
    })
  },

  // 切换目标语言
  changeTargetLang: function(e) {
    const index = e.detail.value
    const langCode = this.data.languagesArray[index].code
    this.setData({
      targetLang: langCode,
      targetLangIndex: index
    })
  },

  // 交换语言
  swapLanguages: function() {
    const { sourceLang, targetLang, sourceText, translatedText, sourceLangIndex, targetLangIndex } = this.data
    
    this.setData({
      sourceLang: targetLang,
      targetLang: sourceLang,
      sourceText: translatedText,
      translatedText: sourceText,
      sourceLangIndex: targetLangIndex,
      targetLangIndex: sourceLangIndex
    })
  },

  // 翻译文本
  translateText: function() {
    const { sourceText, targetLang, sourceLang } = this.data
    
    if (!sourceText.trim()) {
      wx.showToast({
        title: '请输入要翻译的文本',
        icon: 'none'
      })
      return
    }
    
    this.setData({ isTranslating: true })
    
    // 调用翻译API
    util.translateText(sourceText, targetLang, (result) => {
      const translatedText = result.data.translated_text
      
      // 更新翻译结果
      this.setData({
        translatedText,
        isTranslating: false
      })
      
      // 保存到历史记录
      this.saveToHistory(sourceText, translatedText, sourceLang, targetLang)
      
    }, (error) => {
      console.error('翻译失败', error)
      
      // 使用模拟翻译
      const mockTranslatedText = getMockTranslation(sourceText, targetLang);
      
      this.setData({ 
        translatedText: mockTranslatedText,
        isTranslating: false 
      })
      
      // 保存到历史记录
      this.saveToHistory(sourceText, mockTranslatedText, sourceLang, targetLang)
      
      wx.showToast({
        title: '使用模拟翻译',
        icon: 'none'
      })
    })
  },

  // 保存到历史记录
  saveToHistory: function(sourceText, translatedText, sourceLang, targetLang) {
    const { languages } = this.data
    
    // 获取语言名称
    const getLanguageName = (code) => {
      return languages[code].name
    }
    
    // 创建新的历史记录
    const newRecord = {
      id: Date.now(),
      sourceText,
      translatedText,
      sourceLang: getLanguageName(sourceLang),
      targetLang: getLanguageName(targetLang),
      time: util.formatTime(new Date())
    }
    
    // 限制历史记录数量为20条
    const newHistory = [newRecord, ...this.data.history].slice(0, 20)
    
    // 更新状态并保存到本地存储
    this.setData({ history: newHistory })
    wx.setStorageSync('translateHistory', newHistory)
  },

  // 复制翻译结果
  copyResult: function() {
    const { translatedText } = this.data
    
    if (!translatedText.trim()) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      })
      return
    }
    
    wx.setClipboardData({
      data: translatedText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板'
        })
      }
    })
  },

  // 清空输入
  clearInput: function() {
    this.setData({
      sourceText: '',
      translatedText: ''
    })
  },

  // 切换历史记录显示
  toggleHistory: function() {
    this.setData({
      showHistory: !this.data.showHistory
    })
  },

  // 使用历史记录
  useHistoryItem: function(e) {
    const { index } = e.currentTarget.dataset
    const record = this.data.history[index]
    
    // 找到对应的语言代码
    const getLanguageCode = (name) => {
      for (const code in this.data.languages) {
        if (this.data.languages[code].name === name) {
          return code
        }
      }
      return 'en'
    }
    
    // 找到语言在数组中的索引
    const getLanguageIndex = (code) => {
      return this.data.languagesArray.findIndex(lang => lang.code === code)
    }
    
    const sourceLang = getLanguageCode(record.sourceLang)
    const targetLang = getLanguageCode(record.targetLang)
    
    this.setData({
      sourceText: record.sourceText,
      translatedText: record.translatedText,
      sourceLang: sourceLang,
      targetLang: targetLang,
      sourceLangIndex: getLanguageIndex(sourceLang),
      targetLangIndex: getLanguageIndex(targetLang),
      showHistory: false
    })
  },

  // 删除历史记录
  deleteHistoryItem: function(e) {
    const { index } = e.currentTarget.dataset
    const newHistory = [...this.data.history]
    newHistory.splice(index, 1)
    
    this.setData({ history: newHistory })
    wx.setStorageSync('translateHistory', newHistory)
  },

  // 清空所有历史记录
  clearAllHistory: function() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有翻译历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: [] })
          wx.setStorageSync('translateHistory', [])
        }
      }
    })
  }
})
