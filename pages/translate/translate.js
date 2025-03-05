const util = require('../../utils/util.js')

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
    speechRecognizer: null,
    autoPlay: true
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
        
        wx.showToast({
          title: '语音识别失败',
          icon: 'none'
        })
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

  // 翻译语音识别的文本
  translateVoiceText: function() {
    const { recognitionText, targetLang } = this.data
    
    if (!recognitionText) {
      wx.showToast({
        title: '没有可翻译的文本',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '翻译中...' })
    
    // 调用翻译API
    util.translateText(recognitionText, targetLang, 
      (res) => {
        wx.hideLoading()
        
        if (res.data && res.data.translation) {
          const translatedText = res.data.translation
          
          // 添加到历史记录
          const newHistory = [...this.data.history]
          newHistory.push({
            original: recognitionText,
            translated: translatedText,
            targetLanguage: targetLang,
            timestamp: new Date().getTime()
          })
          
          this.setData({
            translatedText: translatedText,
            history: newHistory
          }, () => {
            this.scrollToBottom();
            
            // 自动播放翻译结果
            if (this.data.autoPlay) {
              this.playTranslatedText()
            }
          })
          
          // 保存历史记录
          wx.setStorageSync('translateHistory', newHistory)
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
        
        wx.showToast({
          title: '翻译请求失败',
          icon: 'none'
        })
      }
    )
  },
  
  // 翻译手动输入的文本
  translateInputText: function() {
    const { inputText, targetLang } = this.data
    
    if (!inputText.trim()) {
      wx.showToast({
        title: '请输入要翻译的文本',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '翻译中...' })
    
    // 调用翻译API
    util.translateText(inputText, targetLang, 
      (res) => {
        wx.hideLoading()
        
        if (res.data && res.data.translation) {
          const translatedText = res.data.translation
          
          // 添加到历史记录
          const newHistory = [...this.data.history]
          newHistory.push({
            original: inputText,
            translated: translatedText,
            targetLanguage: targetLang,
            timestamp: new Date().getTime()
          })
          
          this.setData({
            recognitionText: inputText,
            translatedText: translatedText,
            inputText: '',
            translationMode: 'text',
            history: newHistory
          }, () => {
            this.scrollToBottom();
            
            // 自动播放翻译结果
            if (this.data.autoPlay) {
              this.playTranslatedText()
            }
          })
          
          // 保存历史记录
          wx.setStorageSync('translateHistory', newHistory)
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
        
        wx.showToast({
          title: '翻译请求失败',
          icon: 'none'
        })
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
    // 使用微信小程序的文本转语音接口
    wx.showLoading({ title: '加载语音...' })
    
    // 调用Deepseek的文本转语音API
    const text = encodeURIComponent(this.data.translatedText)
    const lang = this.data.targetLang
    
    // 创建音频上下文
    const innerAudioContext = wx.createInnerAudioContext()
    
    // 设置音频源为Deepseek的文本转语音API
    innerAudioContext.src = `https://api.deepseek.com/v1/audio/speech?text=${text}&voice=deepseek_tts&language=${lang}`
    
    // 设置请求头
    wx.request({
      url: `https://api.deepseek.com/v1/audio/speech`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${util.DEEPSEEK_API_KEY}`
      },
      data: {
        model: 'deepseek-tts',
        input: this.data.translatedText,
        voice: 'default'
      },
      responseType: 'arraybuffer',
      success: (res) => {
        // 将返回的音频数据转为临时文件
        const fs = wx.getFileSystemManager()
        const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio.mp3`
        
        fs.writeFile({
          filePath: tempFilePath,
          data: res.data,
          encoding: 'binary',
          success: () => {
            // 播放音频
            innerAudioContext.src = tempFilePath
            innerAudioContext.play()
            wx.hideLoading()
          },
          fail: (err) => {
            console.error('写入音频文件失败', err)
            wx.hideLoading()
            wx.showToast({
              title: '语音生成失败',
              icon: 'none'
            })
          }
        })
      },
      fail: (err) => {
        console.error('文本转语音请求失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '语音生成请求失败',
          icon: 'none'
        })
      }
    })
    
    innerAudioContext.onPlay(() => {
      console.log('开始播放翻译')
    })
    
    innerAudioContext.onError((res) => {
      console.log(res.errMsg)
      console.log(res.errCode)
      wx.hideLoading()
      // 播放失败时显示提示
      wx.showToast({
        title: '语音播放失败',
        icon: 'none'
      })
    })
  },

  // 播放翻译结果 (语音输入翻译)
  playVoiceTranslation: function () {
    // 使用微信小程序的文本转语音接口
    wx.showLoading({ title: '加载语音...' })
    
    // 调用Deepseek的文本转语音API
    const text = encodeURIComponent(this.data.voiceTranslationText || this.data.translatedText)
    const lang = this.data.targetLang
    
    // 创建音频上下文
    const innerAudioContext = wx.createInnerAudioContext()
    
    // 调用Deepseek的文本转语音API
    wx.request({
      url: `https://api.deepseek.com/v1/audio/speech`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${util.DEEPSEEK_API_KEY}`
      },
      data: {
        model: 'deepseek-tts',
        input: text,
        voice: 'default'
      },
      responseType: 'arraybuffer',
      success: (res) => {
        // 将返回的音频数据转为临时文件
        const fs = wx.getFileSystemManager()
        const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio.mp3`
        
        fs.writeFile({
          filePath: tempFilePath,
          data: res.data,
          encoding: 'binary',
          success: () => {
            // 播放音频
            innerAudioContext.src = tempFilePath
            innerAudioContext.play()
            wx.hideLoading()
          },
          fail: (err) => {
            console.error('写入音频文件失败', err)
            wx.hideLoading()
            wx.showToast({
              title: '语音生成失败',
              icon: 'none'
            })
          }
        })
      },
      fail: (err) => {
        console.error('文本转语音请求失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '语音生成请求失败',
          icon: 'none'
        })
      }
    })
    
    innerAudioContext.onPlay(() => {
      console.log('开始播放语音翻译')
    })
    
    innerAudioContext.onError((res) => {
      console.log(res.errMsg)
      console.log(res.errCode)
      wx.hideLoading()
      // 播放失败时显示提示
      wx.showToast({
        title: '语音播放失败',
        icon: 'none'
      })
    })
  },

  // 播放翻译结果
  playTranslatedText: function() {
    // 根据当前模式选择播放方法
    if (this.data.translationMode === 'voice') {
      this.playVoiceTranslation()
    } else {
      this.playTranslation()
    }
  },
})