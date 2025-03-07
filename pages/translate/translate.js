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
    autoPlay: true,
    // 新增变量用于文本输入
    inputText: ''
  },

  onLoad: function (options) {
    console.log('概念解释页面加载')
    // 从本地存储加载历史记录
    const history = wx.getStorageSync('conceptHistory') || []
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
      this.setData({
        isListening: false
      })
      
      // 停止实时语音识别
      this.stopRealtimeRecognition()
      
      if (res.tempFilePath) {
        // 读取录音文件并进行识别
        wx.getFileSystemManager().readFile({
          filePath: res.tempFilePath,
          encoding: 'base64',
          success: (res) => {
            const base64Audio = res.data
            // 进行语音识别和翻译
            this.recognizeAndTranslate(base64Audio)
          },
          fail: (err) => {
            console.error('读取录音文件失败', err)
            wx.showToast({
              title: '读取录音失败',
              icon: 'none'
            })
          }
        })
      }
    })
    
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      this.setData({ 
        isListening: false,
        realtimeRecognitionText: ''
      })
      wx.showToast({
        title: '录音出错',
        icon: 'none'
      })
    })
    
    this.setData({ recordManager: recorderManager })
    
    // 初始化语音识别器
    this.initSpeechRecognizer()
  },
  
  onShow: function() {
    console.log('概念解释页面显示')
    // 重置页面状态
    this.setData({
      isListening: false,
      isTranslating: false,
      realtimeRecognitionText: ''
    })
    
    // 从本地存储重新加载历史记录
    const history = wx.getStorageSync('conceptHistory') || []
    this.setData({ history })
    
    // 确保页面元素正确显示
    wx.nextTick(() => {
      this.scrollToBottom()
    })
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

  // 处理文本输入
  handleInputText: function(e) {
    this.setData({
      inputText: e.detail.value,
      translationMode: 'text'
    })
  },

  // 发送文本进行翻译
  sendTextToTranslate() {
    const text = this.data.inputText.trim()
    
    if (!text) {
      wx.showToast({
        title: '请输入要解释的概念',
        icon: 'none'
      })
      return
    }
    
    // 显示加载中
    this.setData({
      isTranslating: true
    })
    
    wx.showLoading({
      title: '解释中...'
    })
    
    // 添加用户输入到消息列表
    this.setData({
      recognitionText: text,
      translationMode: 'text'
    }, () => {
      this.scrollToBottom()
    })
    
    // 调用概念解释API
    util.explainConcept(text, 
      (res) => {
        wx.hideLoading()
        
        this.setData({
          voiceTranslationText: res.explanation,
          isTranslating: false,
          inputText: ''
        }, () => {
          this.scrollToBottom()
        })
        
        // 保存到历史记录
        this.saveToHistory(text, res.explanation)
        
        // 如果启用了自动播放，则播放翻译结果
        if (this.data.autoPlay) {
          this.playTranslatedText()
        }
      },
      (err) => {
        console.error('概念解释失败', err)
        wx.hideLoading()
        
        this.setData({
          isTranslating: false
        })
        
        wx.showToast({
          title: '解释失败，请重试',
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
  translateVoiceText() {
    const text = this.data.recognitionText.trim()
    
    if (!text) {
      this.setData({
        isTranslating: false
      })
      wx.hideLoading()
      return
    }
    
    // 显示加载中
    this.setData({
      isTranslating: true
    })
    
    wx.showLoading({
      title: '解释中...'
    })
    
    // 调用概念解释API
    util.explainConcept(text, 
      (res) => {
        wx.hideLoading()
        
        this.setData({
          voiceTranslationText: res.explanation,
          isTranslating: false
        }, () => {
          this.scrollToBottom()
        })
        
        // 保存到历史记录
        this.saveToHistory(text, res.explanation)
        
        // 如果启用了自动播放，则播放翻译结果
        if (this.data.autoPlay) {
          this.playVoiceTranslation()
        }
      },
      (err) => {
        console.error('概念解释失败', err)
        wx.hideLoading()
        
        this.setData({
          isTranslating: false
        })
        
        wx.showToast({
          title: '解释失败，请重试',
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
        
        if (res && res.translation) {
          const translatedText = res.translation
          
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
          wx.setStorageSync('conceptHistory', newHistory)
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
  saveToHistory(sourceText, explanationText) {
    // 限制历史记录数量
    const MAX_HISTORY = 20
    
    // 创建新的历史记录项
    const historyItem = {
      id: Date.now().toString(),
      sourceText: sourceText,
      translatedText: explanationText,
      timestamp: new Date().getTime()
    }
    
    // 添加到历史记录
    let history = [...this.data.history]
    
    // 检查是否已存在相同的条目，如果存在则移除旧的
    const existingIndex = history.findIndex(item => item.sourceText === sourceText)
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1)
    }
    
    // 添加新条目到开头
    history.unshift(historyItem)
    
    // 限制历史记录数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY)
    }
    
    // 更新状态并保存到本地存储
    this.setData({ history });
    wx.setStorageSync('conceptHistory', history);
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
    
    if (!item) return;
    
    // 设置源语言和目标语言
    const sourceLangCode = item.sourceLang === '中文' ? 'zh' : 'en'
    const targetLangCode = item.targetLang === '中文' ? 'zh' : 'en'
    
    // 更新界面
    this.setData({
      recognitionText: item.sourceText,
      voiceTranslationText: item.translatedText,
      sourceLang: sourceLangCode,
      targetLang: targetLangCode,
      sourceLangIndex: sourceLangCode === 'zh' ? 0 : 1,
      targetLangIndex: targetLangCode === 'zh' ? 0 : 1,
      translationMode: 'text'
    })
  },

  // 删除历史记录
  deleteHistoryItem: function(e) {
    // 阻止事件冒泡，避免触发useHistoryItem
    e.stopPropagation();
    
    const index = e.currentTarget.dataset.index
    let history = [...this.data.history]
    history.splice(index, 1)
    
    this.setData({ history })
    wx.setStorageSync('conceptHistory', history)
    
    wx.showToast({
      title: '已删除',
      icon: 'success',
      duration: 1000
    })
  },
  
  // 清空所有历史记录
  clearAllHistory: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有翻译历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: [] })
          wx.setStorageSync('conceptHistory', [])
          
          wx.showToast({
            title: '已清空历史记录',
            icon: 'success',
            duration: 1000
          })
        }
      }
    })
  },

  // 开始录音
  startRecording: function () {
    console.log('开始录音')
    if (!this.data.recordManager) {
      console.error('录音管理器未初始化')
      wx.showToast({
        title: '录音功能初始化失败',
        icon: 'none'
      })
      return
    }
    
    // 检查录音权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        const recordManager = this.data.recordManager
        recordManager.start({
          duration: 60000, // 录音的最长时间，单位 ms
          sampleRate: 44100, // 采样率
          numberOfChannels: 1, // 录音通道数
          encodeBitRate: 192000, // 编码码率
          format: 'mp3', // 音频格式
          frameSize: 50 // 指定帧大小，单位 KB
        })
      },
      fail: () => {
        wx.showToast({
          title: '请授权录音权限',
          icon: 'none'
        })
      }
    })
  },
  
  // 停止录音
  stopRecording: function () {
    console.log('停止录音')
    if (!this.data.recordManager) {
      console.error('录音管理器未初始化')
      return
    }
    
    this.stopRealtimeRecognition()
    this.data.recordManager.stop()
  },

  // 播放翻译结果 (文本输入翻译)
  playTranslation: function() {
    // 如果没有翻译结果，直接返回
    if (!this.data.translatedText) {
      wx.showToast({
        title: '没有可播放的翻译',
        icon: 'none'
      })
      return
    }
    
    // 使用微信小程序的文本转语音接口
    wx.showLoading({ title: '加载语音...' })
    
    // 使用系统内置的文本转语音功能
    const innerAudioContext = wx.createInnerAudioContext()
    
    // 根据目标语言选择合适的语音合成参数
    const lang = this.data.targetLang === 'zh' ? 'zh_CN' : 'en_US'
    
    // 使用微信的文本转语音功能
    wx.request({
      url: `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(this.data.translatedText)}&cuid=baike&lan=${lang}&ctp=1&pdt=301&vol=9&rate=32&per=0`,
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          // 将音频数据转换为临时文件
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
                title: '播放失败',
                icon: 'none'
              })
            }
          })
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '获取语音失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('请求语音合成失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '语音合成请求失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 播放翻译结果 (语音输入翻译)
  playVoiceTranslation: function() {
    // 如果没有翻译结果，直接返回
    if (!this.data.voiceTranslationText) {
      wx.showToast({
        title: '没有可播放的翻译',
        icon: 'none'
      })
      return
    }
    
    // 使用微信小程序的文本转语音接口
    wx.showLoading({ title: '加载语音...' })
    
    // 使用系统内置的文本转语音功能
    const innerAudioContext = wx.createInnerAudioContext()
    
    // 根据目标语言选择合适的语音合成参数
    const lang = this.data.targetLang === 'zh' ? 'zh_CN' : 'en_US'
    
    // 使用微信的文本转语音功能
    wx.request({
      url: `https://tts.baidu.com/text2audio?tex=${encodeURIComponent(this.data.voiceTranslationText)}&cuid=baike&lan=${lang}&ctp=1&pdt=301&vol=9&rate=32&per=0`,
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          // 将音频数据转换为临时文件
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
                title: '播放失败',
                icon: 'none'
              })
            }
          })
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '获取语音失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('请求语音合成失败', err)
        wx.hideLoading()
        wx.showToast({
          title: '语音合成请求失败',
          icon: 'none'
        })
      }
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