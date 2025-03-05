const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 调用DeepSeek API的通用方法
const callDeepSeekAPI = (endpoint, data, success, fail) => {
  const app = getApp()
  
  // 检查API密钥是否配置
  if (!app.globalData.apiKey) {
    console.warn('DeepSeek API密钥未配置')
    if (fail) {
      fail({ errMsg: 'API密钥未配置' })
    }
    return
  }
  
  wx.request({
    url: `${app.globalData.apiUrl}/${endpoint}`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${app.globalData.apiKey}`
    },
    data: data,
    success: (res) => {
      // 检查API响应是否包含错误
      if (res.statusCode !== 200) {
        console.error('API请求失败', res)
        if (fail) {
          fail({ errMsg: `API请求失败: ${res.statusCode}`, ...res })
        }
        return
      }
      
      if (success) {
        success(res)
      }
    },
    fail: (error) => {
      console.error('API请求错误', error)
      if (fail) {
        fail(error)
      }
    }
  })
}

// 语音识别
const recognizeAudio = (audioBase64, success, fail) => {
  callDeepSeekAPI('speech-to-text', {
    audio: audioBase64,
    language: 'zh' // 默认中文
  }, success, fail)
}

// 与AI对话
const chatWithAI = (message, success, fail) => {
  callDeepSeekAPI('chat', {
    messages: [
      { role: 'user', content: message }
    ],
    max_tokens: 1000,
    temperature: 0.7
  }, success, fail)
}

// 翻译文本
const translateText = (text, targetLang, success, fail) => {
  callDeepSeekAPI('translate', {
    text: text,
    target_language: targetLang
  }, success, fail)
}

module.exports = {
  formatTime,
  recognizeAudio,
  chatWithAI,
  translateText
}
