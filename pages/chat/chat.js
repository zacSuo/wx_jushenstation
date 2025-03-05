// pages/chat/chat.js
const util = require('../../utils/util.js')

// 模拟响应数据，用于开发测试
const mockResponses = [
  "您好！我是DeepSeek AI助手，很高兴为您服务。",
  "这是一个示例回复。在实际部署时，这里会显示来自DeepSeek API的真实回复。",
  "我可以帮助您回答问题、提供信息或进行简单的对话。",
  "如果您有任何问题，请随时向我提问。",
  "这是开发测试阶段的模拟回复，实际使用时将连接到DeepSeek API获取响应。"
];

// 获取随机模拟响应
function getMockResponse() {
  const index = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[index];
}

Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    recording: false,
    recordTime: 0,
    timer: null,
    canUseRecord: false
  },

  onLoad(options) {
    // 检查录音权限
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({
          canUseRecord: true
        })
      },
      fail: () => {
        wx.showToast({
          title: '请授权录音权限',
          icon: 'none'
        })
      }
    })
    
    // 添加欢迎消息
    this.setData({
      messages: [
        {
          type: 'ai',
          content: '您好！我是DeepSeek助手，有什么可以帮您？'
        }
      ]
    }, () => {
      this.scrollToBottom();
    })
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('.chat-container')
        .node()
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            const container = res[0].node;
            container.scrollTop = container.scrollHeight;
          }
        });
    }, 100);
  },

  // 开始录音
  startRecord() {
    if (!this.data.canUseRecord) {
      wx.showToast({
        title: '请先授权录音权限',
        icon: 'none'
      })
      return
    }

    // 检查是否已经在录音
    if (this.data.recording) return
    
    // 开始录音
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({
        recording: true,
        recordTime: 0
      })
      
      // 开始计时
      this.data.timer = setInterval(() => {
        this.setData({
          recordTime: this.data.recordTime + 1
        })
        
        // 限制录音时长为60秒
        if (this.data.recordTime >= 60) {
          this.stopRecord()
        }
      }, 1000)
    })
    
    const options = {
      duration: 60000, // 最长60秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    }
    
    recorderManager.start(options)
  },

  // 结束录音
  stopRecord() {
    // 检查是否正在录音
    if (!this.data.recording) return
    
    // 停止计时
    clearInterval(this.data.timer)
    
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.setData({
        recording: false,
        isLoading: true
      })
      
      // 如果录音时间太短，则不处理
      if (this.data.recordTime < 1) {
        this.setData({
          isLoading: false
        })
        wx.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        return
      }
      
      // 显示加载中
      wx.showLoading({
        title: '识别中...',
      })
      
      // 读取录音文件
      wx.getFileSystemManager().readFile({
        filePath: res.tempFilePath,
        success: (fileRes) => {
          // 将音频数据转为Base64
          const base64Audio = wx.arrayBufferToBase64(fileRes.data)
          
          // 调用语音识别API
          util.recognizeAudio(base64Audio, (result) => {
            wx.hideLoading()
            
            // 获取识别结果
            const text = result.data.text
            
            // 如果识别结果为空，则提示
            if (!text.trim()) {
              this.setData({
                isLoading: false
              })
              wx.showToast({
                title: '未能识别您的语音',
                icon: 'none'
              })
              return
            }
            
            // 添加用户消息
            this.setData({
              messages: [...this.data.messages, {
                type: 'user',
                content: text
              }],
              isLoading: true
            }, () => {
              this.scrollToBottom();
            })
            
            // 调用AI对话API
            util.chatWithAI(text, (chatResult) => {
              // 添加AI回复
              this.setData({
                messages: [...this.data.messages, {
                  type: 'ai',
                  content: chatResult.data.response
                }],
                isLoading: false
              }, () => {
                this.scrollToBottom();
              })
            }, (error) => {
              console.error('AI对话失败', error)
              
              // 使用模拟响应
              const mockResponse = getMockResponse();
              
              this.setData({
                messages: [...this.data.messages, {
                  type: 'ai',
                  content: mockResponse
                }],
                isLoading: false
              }, () => {
                this.scrollToBottom();
              })
              
              wx.showToast({
                title: '使用模拟响应',
                icon: 'none'
              })
            })
            
          }, (error) => {
            console.error('语音识别失败', error)
            
            // 使用模拟文本作为识别结果
            const mockText = "这是一条模拟的语音识别文本，用于开发测试。";
            
            // 添加用户消息（使用模拟文本）
            this.setData({
              messages: [...this.data.messages, {
                type: 'user',
                content: mockText
              }],
              isLoading: true
            }, () => {
              this.scrollToBottom();
            })
            
            // 使用模拟响应
            setTimeout(() => {
              const mockResponse = getMockResponse();
              
              this.setData({
                messages: [...this.data.messages, {
                  type: 'ai',
                  content: mockResponse
                }],
                isLoading: false
              }, () => {
                this.scrollToBottom();
              })
              
              wx.showToast({
                title: '使用模拟数据',
                icon: 'none'
              })
            }, 1000);
          })
        },
        fail: (error) => {
          console.error('读取录音文件失败', error)
          this.setData({
            isLoading: false
          })
          wx.showToast({
            title: '读取录音文件失败',
            icon: 'none'
          })
        }
      })
    })
    
    recorderManager.stop()
  },

  // 处理文本输入
  handleInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 发送按钮点击处理
  sendMessageHandler() {
    const { inputValue, recording, isLoading } = this.data
    
    // 检查输入是否为空或是否在录音/加载中
    if (!inputValue.trim() || recording || isLoading) {
      return
    }
    
    // 调用发送消息函数
    this.sendMessage()
  },

  // 发送文本消息
  sendMessage() {
    const { inputValue } = this.data
    
    // 检查输入是否为空
    if (!inputValue.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }
    
    // 添加用户消息
    this.setData({
      messages: [...this.data.messages, {
        type: 'user',
        content: inputValue
      }],
      inputValue: '',
      isLoading: true
    }, () => {
      this.scrollToBottom();
    })
    
    // 调用AI对话API
    util.chatWithAI(inputValue, (result) => {
      // 添加AI回复
      this.setData({
        messages: [...this.data.messages, {
          type: 'ai',
          content: result.data.response
        }],
        isLoading: false
      }, () => {
        this.scrollToBottom();
      })
    }, (error) => {
      console.error('AI对话失败', error)
      
      // 使用模拟响应
      const mockResponse = getMockResponse();
      
      this.setData({
        messages: [...this.data.messages, {
          type: 'ai',
          content: mockResponse
        }],
        isLoading: false
      }, () => {
        this.scrollToBottom();
      })
      
      wx.showToast({
        title: '使用模拟响应',
        icon: 'none'
      })
    })
  },

  // 清空对话
  clearChat() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [
              {
                type: 'ai',
                content: '您好！我是DeepSeek助手，有什么可以帮您？'
              }
            ]
          }, () => {
            this.scrollToBottom();
          })
          wx.showToast({
            title: '已清空对话',
            icon: 'success'
          })
        }
      }
    })
  }
})
