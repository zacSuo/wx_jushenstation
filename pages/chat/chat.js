// pages/chat/chat.js
const util = require('../../utils/util.js')

Page({
  data: {
    messages: [],
    inputValue: '',
    recording: false, // 是否正在录音
    recordTime: 0, // 录音时长（秒）
    canUseRecord: false, // 是否可以使用录音功能
    isLoading: false, // 是否正在加载
    timer: null // 计时器
  },

  onLoad(options) {
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) {
          this.setData({
            canUseRecord: true
          })
        }
      }
    })
    
    // 验证API密钥
    util.validateAPIKey(
      (res) => {
        console.log('API密钥验证成功:', res);
        // 可以在这里添加成功提示
      },
      (error) => {
        console.error('API密钥验证失败:', error);
        
        // 显示错误信息
        wx.showModal({
          title: 'API密钥验证失败',
          content: error.data && error.data.error && error.data.error.message ? error.data.error.message : '未知错误',
          showCancel: false
        });
      }
    );
    
    // 测试API连接
    this.testAPIConnection();
    
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
  
  // 测试API连接
  testAPIConnection() {
    util.testDeepseekAPI((res) => {
      console.log('API连接测试成功:', res);
      
      // 检查是否是模拟模式
      if (res.data && res.data.mock) {
        wx.showModal({
          title: 'API处于模拟模式',
          content: res.data.message || 'API余额不足，应用将使用本地模拟数据。',
          showCancel: false
        });
        return;
      }
      
      wx.showToast({
        title: 'API连接正常',
        icon: 'success'
      });
    }, (error) => {
      console.error('API连接测试失败:', error);
      
      // 检查是否是模拟模式错误
      if (error && error.mock) {
        wx.showModal({
          title: 'API处于模拟模式',
          content: error.message || 'API不可用，应用将使用本地模拟数据。',
          showCancel: false
        });
        return;
      }
      
      wx.showModal({
        title: 'API连接失败',
        content: error.errMsg || '未知错误',
        showCancel: false
      });
    });
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
    // 检查是否正在加载中
    if (this.data.isLoading) return
    
    if (!this.data.canUseRecord) {
      this.requestRecordAuth()
      return
    }

    const recorderManager = wx.getRecorderManager()
    
    // 注册开始录音事件
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({
        recording: true,
        recordTime: 0
      })
      
      // 显示录音中提示
      wx.showToast({
        title: '录音中...',
        icon: 'none',
        duration: 60000 // 最长提示60秒
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
    
    // 注册错误处理
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.hideToast() // 隐藏录音中提示
      wx.showToast({
        title: '录音出错，请重试',
        icon: 'none'
      })
      this.setData({
        recording: false,
        isLoading: false
      })
      clearInterval(this.data.timer)
    })
    
    // 注册停止录音事件
    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      wx.hideToast() // 隐藏录音中提示
      clearInterval(this.data.timer) // 确保计时器被清除
      
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
        encoding: 'base64', // 直接使用base64编码
        success: (fileRes) => {
          // 调用语音识别API（使用腾讯混元API）
          util.recognizeAudioWithTencent(fileRes.data, (result) => {
            wx.hideLoading()
            
            try {
              // 获取识别结果
              const text = result.data && result.data.text ? result.data.text : '';
              
              // 检查是否是模拟模式
              const isMock = result.data && result.data.mock === true;
              
              // 如果是模拟模式，显示提示
              if (isMock) {
                wx.showModal({
                  title: '模拟模式',
                  content: 'API当前处于模拟模式，返回的是模拟数据。请检查API设置或网络连接。',
                  showCancel: false
                })
              }
              
              // 如果识别结果为空，则提示
              if (!text || !text.trim()) {
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
              
              // 准备消息历史 - 确保包含所有历史消息
              const messageHistory = this.data.messages.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
              }));
              
              console.log('发送语音识别后的聊天请求，消息历史:', JSON.stringify(messageHistory));
              
              // 调用AI对话API（使用腾讯混元API）
              util.chatWithTencent(messageHistory, (result) => {
                try {
                  // 添加AI回复
                  if (result.data && result.data.choices && result.data.choices.length > 0) {
                    const aiResponse = result.data.choices[0].message.content;
                    
                    this.setData({
                      messages: [...this.data.messages, {
                        type: 'ai',
                        content: aiResponse
                      }],
                      isLoading: false
                    }, () => {
                      this.scrollToBottom();
                    });
                  } else {
                    // 处理API返回格式不符合预期的情况
                    wx.showToast({
                      title: 'API返回格式错误',
                      icon: 'none'
                    });
                    
                    this.setData({
                      isLoading: false
                    });
                  }
                } catch (e) {
                  console.error('处理AI回复时出错:', e);
                  this.setData({
                    isLoading: false
                  });
                  wx.showToast({
                    title: '处理AI回复时出错',
                    icon: 'none'
                  });
                }
              }, (error) => {
                console.error('AI对话失败', error)
                
                this.setData({
                  isLoading: false
                });
                
                wx.showToast({
                  title: 'AI对话请求失败',
                  icon: 'none'
                });
              })
            } catch (e) {
              console.error('处理语音识别结果时出错:', e);
              this.setData({
                isLoading: false
              });
              wx.showToast({
                title: '处理语音识别结果时出错',
                icon: 'none'
              });
            }
          }, (error) => {
            console.error('语音识别失败', error)
            wx.hideLoading()
            
            this.setData({
              isLoading: false
            })
            
            wx.showToast({
              title: '语音识别失败',
              icon: 'none'
            })
          })
        },
        fail: (error) => {
          console.error('读取录音文件失败', error)
          wx.hideLoading()
          
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
    console.log('停止录音被调用')
    // 检查是否正在录音
    if (!this.data.recording) {
      console.log('未在录音状态，忽略停止录音请求')
      return
    }
    
    // 停止计时
    if (this.data.timer) {
      console.log('清除计时器')
      clearInterval(this.data.timer)
      this.data.timer = null
    }
    
    try {
      // 停止录音
      console.log('准备停止录音管理器')
      const recorderManager = wx.getRecorderManager()
      recorderManager.stop()
      console.log('录音管理器停止命令已发送')
    } catch (e) {
      console.error('停止录音时出错:', e)
      // 确保UI状态正确
      this.setData({
        recording: false,
        isLoading: false
      })
      wx.showToast({
        title: '停止录音时出错',
        icon: 'none'
      })
    }
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
    const { inputValue } = this.data;
    if (!inputValue.trim()) return;
    
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
    
    // 准备消息历史 - 确保包含所有历史消息
    const messageHistory = this.data.messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    console.log('发送聊天请求，消息历史:', JSON.stringify(messageHistory));
    
    // 调用AI对话API
    util.chatWithAI(messageHistory, (result) => {
      // 添加AI回复
      if (result.data && result.data.choices && result.data.choices.length > 0) {
        const aiResponse = result.data.choices[0].message.content;
        
        this.setData({
          messages: [...this.data.messages, {
            type: 'ai',
            content: aiResponse
          }],
          isLoading: false
        }, () => {
          this.scrollToBottom();
        });
      } else {
        // 处理API返回格式不符合预期的情况
        console.error('API返回格式错误:', result);
        wx.showToast({
          title: 'API返回格式错误',
          icon: 'none'
        });
        
        this.setData({
          isLoading: false
        });
      }
    }, (error) => {
      console.error('AI对话失败', error)
      
      this.setData({
        isLoading: false
      });
      
      wx.showToast({
        title: 'AI对话请求失败',
        icon: 'none'
      });
    });
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
  },
  
  // 请求录音权限
  requestRecordAuth() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({
          canUseRecord: true
        })
        wx.showToast({
          title: '已获取录音权限',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中开启录音权限，以便使用语音功能',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.record']) {
                    this.setData({
                      canUseRecord: true
                    })
                  }
                }
              })
            }
          }
        })
      }
    })
  }
})
