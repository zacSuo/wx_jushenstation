const util = require('../../utils/util.js')

// 模拟翻译响应
function getMockTranslation(text, targetLang) {
  // 简单的模拟翻译（仅用于开发测试）
  const mockTranslations = {
    'zh': {
      'en': '这是一段中文翻译成英文的模拟文本。This is a mock translation from Chinese to English.'
    },
    'en': {
      'zh': 'This is a mock translation from English to Chinese. 这是一段英文翻译成中文的模拟文本。'
    }
  };
  
  // 如果有对应的模拟翻译，则返回
  if (mockTranslations[targetLang] && mockTranslations[targetLang]['zh']) {
    return mockTranslations[targetLang]['zh'];
  } else if (mockTranslations['zh'] && mockTranslations['zh'][targetLang]) {
    return mockTranslations['zh'][targetLang];
  }
  
  // 默认返回
  return `${text}\n\n[模拟翻译]:\n这是一段模拟翻译文本，仅用于开发测试。实际使用时将连接到DeepSeek API获取真实翻译。`;
}

Page({
  data: {
    sourceText: '',
    translatedText: '',
    recognitionText: '',
    voiceTranslationText: '',
    sourceLang: 'zh',
    targetLang: 'en',
    sourceLangIndex: 0,  // 默认选中中文（索引0）
    targetLangIndex: 1,  // 默认选中英语（索引1）
    languages: {
      'zh': { code: 'zh', name: '中文' },
      'en': { code: 'en', name: '英语' }
    },
    languagesArray: [
      { code: 'zh', name: '中文' },
      { code: 'en', name: '英语' }
    ],
    isTranslating: false,
    history: [],
    showHistory: false,
    isListening: false,
    recordManager: null,
    audioBuffer: [],
    translationMode: 'text', // 'text' 或 'voice'
    // 新增变量用于实时语音识别
    realtimeRecognitionText: '',
    speechRecognizer: null
  },

  onLoad: function (options) {
    // 从本地存储加载历史记录
    const history = wx.getStorageSync('translateHistory') || []
    this.setData({ history })
    
    // 初始化录音管理器
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({
        isListening: true,
        realtimeRecognitionText: '',
        audioBuffer: []
      })
      
      // 开始实时语音识别
      this.startRealtimeRecognition()
    })
    
    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.setData({ isListening: false })
      
      const { tempFilePath } = res
      
      // 将音频文件转为base64
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: (res) => {
          // 调用语音识别API
          this.recognizeAndTranslate(res.data)
        },
        fail: (err) => {
          console.error('读取音频文件失败', err)
          wx.showToast({
            title: '读取音频失败',
            icon: 'none'
          })
        }
      })
    })
    
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      this.setData({ isListening: false })
      wx.showToast({
        title: '录音出错',
        icon: 'none'
      })
    })
    
    // 初始化语音识别器
    this.initSpeechRecognizer()
    
    this.setData({ recordManager: recorderManager })
  },
  
  // 滚动到底部
  scrollToBottom: function() {
    wx.createSelectorQuery()
      .select('.translate-container')
      .node()
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          const container = res[0].node;
          container.scrollTop = container.scrollHeight;
        }
      });
  },
  
  // 初始化语音识别器
  initSpeechRecognizer: function() {
    // 检查平台是否支持实时语音识别
    if (wx.createSpeechRecognizer) {
      const speechRecognizer = wx.createSpeechRecognizer({
        lang: 'zh_CN'
      })
      
      speechRecognizer.onRecognize((res) => {
        if (res.result) {
          this.setData({
            realtimeRecognitionText: res.result
          })
        }
      })
      
      speechRecognizer.onError((res) => {
        console.error('语音识别错误', res)
      })
      
      this.setData({ speechRecognizer })
    } else {
      console.log('当前平台不支持实时语音识别，将使用普通语音识别')
    }
  },
  
  // 开始实时语音识别
  startRealtimeRecognition: function() {
    if (this.data.speechRecognizer) {
      this.data.speechRecognizer.start({
        success: () => {
          console.log('实时语音识别开始')
        },
        fail: (err) => {
          console.error('实时语音识别启动失败', err)
        }
      })
    }
  },
  
  // 停止实时语音识别
  stopRealtimeRecognition: function() {
    if (this.data.speechRecognizer) {
      this.data.speechRecognizer.stop()
    }
  },

  // 语音识别并翻译
  recognizeAndTranslate: function(audioBase64) {
    wx.showLoading({ title: '识别中...' })
    
    // 如果有实时识别的文本，直接使用
    if (this.data.realtimeRecognitionText) {
      this.setData({
        recognitionText: this.data.realtimeRecognitionText,
        translationMode: 'voice'
      }, () => {
        this.scrollToBottom();
      })
      
      // 自动翻译
      this.translateVoiceText()
      wx.hideLoading()
      return
    }
    
    // 调用语音识别API
    util.recognizeAudio(audioBase64, 
      (res) => {
        wx.hideLoading()
        if (res.data && res.data.text) {
          const recognizedText = res.data.text
          
          // 设置为源文本
          this.setData({ 
            recognitionText: recognizedText,
            translationMode: 'voice'
          }, () => {
            this.scrollToBottom();
          })
          
          // 自动翻译
          this.translateVoiceText()
        } else {
          wx.showToast({
            title: '未能识别语音',
            icon: 'none'
          })
        }
      },
      (err) => {
        wx.hideLoading()
        console.error('语音识别失败', err)
        
        // 使用模拟数据
        const mockText = "这是模拟的语音识别结果，用于开发测试。"
        
        this.setData({ 
          recognitionText: mockText,
          translationMode: 'voice'
        }, () => {
          this.scrollToBottom();
        })
        
        // 自动翻译
        this.translateVoiceText()
      }
    )
  },

  // 输入源文本
  handleSourceInput: function(e) {
    this.setData({
      sourceText: e.detail.value,
      translationMode: 'text'
    })
  },

  // 切换源语言
  changeSourceLang: function(e) {
    const index = e.detail.value
    const langCode = this.data.languagesArray[index].code
    this.setData({
      sourceLang: langCode,
      sourceLangIndex: index,
      // 自动设置目标语言为另一种语言
      targetLang: langCode === 'zh' ? 'en' : 'zh',
      targetLangIndex: langCode === 'zh' ? 1 : 0
    })
  },

  // 切换目标语言
  changeTargetLang: function(e) {
    const index = e.detail.value
    const langCode = this.data.languagesArray[index].code
    this.setData({
      targetLang: langCode,
      targetLangIndex: index,
      // 自动设置源语言为另一种语言
      sourceLang: langCode === 'zh' ? 'en' : 'zh',
      sourceLangIndex: langCode === 'zh' ? 1 : 0
    })
  },

  // 交换语言
  swapLanguages: function() {
    const { sourceLang, targetLang, sourceLangIndex, targetLangIndex } = this.data
    
    this.setData({
      sourceLang: targetLang,
      targetLang: sourceLang,
      sourceLangIndex: targetLangIndex,
      targetLangIndex: sourceLangIndex
    })
    
    // 如果已有翻译结果，也交换源文本和翻译结果
    if (this.data.translatedText) {
      this.setData({
        sourceText: this.data.translatedText,
        translatedText: this.data.sourceText
      })
    }
  },

  // 翻译文本
  translateText: function() {
    const { sourceText, targetLang } = this.data
    
    if (!sourceText.trim()) {
      return
    }
    
    this.setData({ isTranslating: true })
    wx.showLoading({ title: '翻译中...' })
    
    // 调用翻译API
    util.translateText(
      sourceText,
      targetLang,
      (res) => {
        wx.hideLoading()
        this.setData({ isTranslating: false })
        
        if (res.data && res.data.translation) {
          const translatedText = res.data.translation
          
          this.setData({ translatedText })
          
          // 保存到历史记录
          this.saveToHistory(sourceText, translatedText, this.data.sourceLang, targetLang)
          
          // 播放翻译结果
          this.playTranslation()
        } else {
          wx.showToast({
            title: '翻译失败',
            icon: 'none'
          })
        }
      },
      (err) => {
        wx.hideLoading()
        console.error('翻译失败', err)
        this.setData({ isTranslating: false })
        
        // 使用模拟翻译
        const mockTranslation = getMockTranslation(sourceText, targetLang)
        this.setData({ translatedText: mockTranslation })
        
        // 保存到历史记录
        this.saveToHistory(sourceText, mockTranslation, this.data.sourceLang, targetLang)
        
        // 播放翻译结果
        this.playTranslation()
      }
    )
  },

  // 翻译语音识别的文本
  translateVoiceText: function() {
    const { recognitionText, targetLang } = this.data
    
    if (!recognitionText.trim()) {
      return
    }
    
    this.setData({ isTranslating: true })
    wx.showLoading({ title: '翻译中...' })
    
    // 调用翻译API
    util.translateText(
      recognitionText,
      targetLang,
      (res) => {
        wx.hideLoading()
        this.setData({ isTranslating: false })
        
        if (res.data && res.data.translation) {
          const translatedText = res.data.translation
          
          this.setData({ voiceTranslationText: translatedText }, () => {
            this.scrollToBottom();
          })
          
          // 保存到历史记录
          this.saveToHistory(recognitionText, translatedText, this.data.sourceLang, targetLang)
          
          // 播放翻译结果
          this.playVoiceTranslation()
        } else {
          wx.showToast({
            title: '翻译失败',
            icon: 'none'
          })
        }
      },
      (err) => {
        wx.hideLoading()
        console.error('翻译失败', err)
        this.setData({ isTranslating: false })
        
        // 使用模拟翻译
        const mockTranslation = getMockTranslation(recognitionText, targetLang)
        this.setData({ voiceTranslationText: mockTranslation }, () => {
          this.scrollToBottom();
        })
        
        // 保存到历史记录
        this.saveToHistory(recognitionText, mockTranslation, this.data.sourceLang, targetLang)
        
        // 播放翻译结果
        this.playVoiceTranslation()
      }
    )
  },

  // 保存到历史记录
  saveToHistory: function(sourceText, translatedText, sourceLang, targetLang) {
    // 限制历史记录长度
    const MAX_HISTORY = 20
    
    // 创建新的历史记录项
    const newHistoryItem = {
      id: Date.now(),
      sourceText: sourceText,
      translatedText: translatedText,
      sourceLang: this.data.languages[sourceLang].name,
      targetLang: this.data.languages[targetLang].name,
      timestamp: new Date().toLocaleString()
    }
    
    // 添加到历史记录
    let history = this.data.history
    history.unshift(newHistoryItem)
    
    // 限制历史记录长度
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY)
    }
    
    // 更新数据
    this.setData({ history })
    
    // 保存到本地存储
    wx.setStorageSync('translateHistory', history)
  },

  // 复制翻译结果
  copyResult: function() {
    wx.setClipboardData({
      data: this.data.translatedText,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
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
    const index = e.currentTarget.dataset.index
    const item = this.data.history[index]
    
    // 找到对应的语言代码
    let sourceLangCode = 'zh'
    let targetLangCode = 'en'
    
    for (const code in this.data.languages) {
      if (this.data.languages[code].name === item.sourceLang) {
        sourceLangCode = code
      }
      if (this.data.languages[code].name === item.targetLang) {
        targetLangCode = code
      }
    }
    
    // 更新数据
    this.setData({
      sourceText: item.sourceText,
      translatedText: item.translatedText,
      sourceLang: sourceLangCode,
      targetLang: targetLangCode,
      sourceLangIndex: sourceLangCode === 'zh' ? 0 : 1,
      targetLangIndex: targetLangCode === 'zh' ? 0 : 1,
      translationMode: 'text'
    })
  },

  // 删除历史记录
  deleteHistoryItem: function(e) {
    const index = e.currentTarget.dataset.index
    let history = this.data.history
    history.splice(index, 1)
    
    this.setData({ history })
    wx.setStorageSync('translateHistory', history)
  },

  // 清空所有历史记录
  clearAllHistory: function() {
    this.setData({
      history: []
    });
  },

  // 开始录音
  startRecording: function () {
    const recordManager = this.data.recordManager;
    recordManager.start({
      duration: 60000, // 录音的最长时间，单位 ms
      sampleRate: 44100, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 192000, // 编码码率
      format: 'mp3', // 音频格式
      frameSize: 50 // 指定帧大小，单位 KB
    });
  },

  // 停止录音
  stopRecording: function () {
    const recordManager = this.data.recordManager;
    this.stopRealtimeRecognition();
    recordManager.stop();
  },

  // 播放翻译结果 (文本输入翻译)
  playTranslation: function() {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = `YOUR_TEXT_TO_SPEECH_API_URL?text=${encodeURIComponent(this.data.translatedText)}&lang=${this.data.targetLang}`; // 替换为你的文本转语音API地址
    innerAudioContext.play();
    innerAudioContext.onPlay(() => {
      console.log('开始播放翻译');
    });
    innerAudioContext.onError((res) => {
      console.log(res.errMsg);
      console.log(res.errCode);
      // 播放失败时显示提示
      wx.showToast({
        title: '语音播放失败',
        icon: 'none'
      });
    });
  },

  // 播放翻译结果 (语音输入翻译)
  playVoiceTranslation: function () {
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = `YOUR_TEXT_TO_SPEECH_API_URL?text=${encodeURIComponent(this.data.voiceTranslationText)}&lang=${this.data.targetLang}`; // 替换为你的文本转语音API地址
    innerAudioContext.play();
    innerAudioContext.onPlay(() => {
      console.log('开始播放语音翻译');
    });
    innerAudioContext.onError((res) => {
      console.log(res.errMsg);
      console.log(res.errCode);
      // 播放失败时显示提示
      wx.showToast({
        title: '语音播放失败',
        icon: 'none'
      });
    });
  }
})