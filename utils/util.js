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

// Deepseek API配置
const DEEPSEEK_API_KEY = 'sk-88c59b94f23d41eb886c5d7068ebc745'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1'

// 腾讯混元API配置
const TENCENT_API_KEY = 'your-tencent-api-key'
const TENCENT_API_URL = 'https://api.tencent.com/v1'

// 模拟模式设置（当API不可用时使用）
let USE_MOCK_MODE = false // 禁用模拟模式，尝试使用真实API
let API_ERROR_MESSAGE = ''

// 验证API密钥
const validateAPIKey = (success, fail) => {
  console.log('正在验证API密钥...');
  
  wx.request({
    url: `${DEEPSEEK_API_URL}/models`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    success: (res) => {
      console.log('API密钥验证响应:', res);
      
      if (res.statusCode === 200) {
        console.log('API密钥有效');
        if (success) success(res);
      } else {
        console.error('API密钥验证失败:', res);
        
        // 如果是余额不足错误，记录具体错误信息
        if (res.statusCode === 402) {
          API_ERROR_MESSAGE = res.data && res.data.error && res.data.error.message ? res.data.error.message : 'Insufficient Balance';
          console.log('API余额不足:', API_ERROR_MESSAGE);
        } else {
          API_ERROR_MESSAGE = res.data && res.data.error && res.data.error.message ? res.data.error.message : '未知错误';
        }
        
        if (fail) fail(res);
      }
    },
    fail: (error) => {
      console.error('API密钥验证请求失败:', error);
      if (fail) fail(error);
    }
  });
};

// 调用Deepseek API的通用方法
const callDeepseekAPI = (endpoint, data, success, fail) => {
  console.log(`正在调用Deepseek API: ${endpoint}`, JSON.stringify(data).substring(0, 500) + (JSON.stringify(data).length > 500 ? '...' : ''));
  
  // 如果在模拟模式下，使用模拟数据
  if (USE_MOCK_MODE) {
    console.log('使用模拟模式，API余额不足')
    
    // 延迟返回，模拟网络请求
    setTimeout(() => {
      if (endpoint === 'audio/transcription') {
        // 模拟语音识别
        success({
          data: {
            text: '这是模拟的语音识别结果。由于API余额不足，正在使用本地模拟数据。'
          }
        })
      } else if (endpoint === 'chat/completions') {
        // 模拟聊天回复
        const userMessage = data.messages[data.messages.length - 1].content;
        let response = '';
        
        // 根据用户消息生成不同的模拟回复
        if (userMessage.includes('你好') || userMessage.includes('Hello')) {
          response = '你好！我是模拟的AI助手。由于API余额不足，我正在使用本地模拟数据回复您。我可以模拟回答一些简单的问题。';
        } else if (userMessage.includes('天气')) {
          response = '今天天气不错，阳光明媚。(这是模拟数据，实际天气请查看天气预报)';
        } else if (userMessage.includes('时间') || userMessage.includes('日期')) {
          const now = new Date();
          response = `现在的时间是${now.getHours()}:${now.getMinutes()}，日期是${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。(这是模拟数据)`;
        } else {
          response = `我收到了您的消息："${userMessage}"。由于API余额不足，我无法提供真实的AI回复。这是一个模拟回复，用于演示界面功能。`;
        }
        
        success({
          data: {
            choices: [
              {
                message: {
                  content: response
                }
              }
            ]
          }
        })
      } else {
        // 其他API调用
        success({
          data: {
            result: '模拟数据',
            message: `API当前不可用: ${API_ERROR_MESSAGE}`
          }
        })
      }
    }, 500)
    
    return
  }
  
  wx.request({
    url: `${DEEPSEEK_API_URL}/${endpoint}`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    data: data,
    success: (res) => {
      // 记录API响应，但限制日志大小
      const responseLog = JSON.stringify(res.data).substring(0, 500) + (JSON.stringify(res.data).length > 500 ? '...' : '');
      console.log(`Deepseek API响应: ${endpoint}`, responseLog);
      
      // 检查API响应是否包含错误
      if (res.statusCode !== 200) {
        console.error('Deepseek API请求失败', {
          statusCode: res.statusCode,
          endpoint: endpoint,
          error: res.data && res.data.error ? res.data.error : '未知错误'
        });
        
        // 如果是余额不足错误，启用模拟模式
        if (res.statusCode === 402 || (res.data && res.data.error && res.data.error.message === 'Insufficient Balance')) {
          USE_MOCK_MODE = true;
          API_ERROR_MESSAGE = 'Insufficient Balance';
          console.log('检测到API余额不足，启用模拟模式');
          
          // 递归调用自身，这次将使用模拟模式
          callDeepseekAPI(endpoint, data, success, fail);
          return;
        }
        
        if (fail) {
          fail({ 
            errMsg: `Deepseek API请求失败: ${res.statusCode}`, 
            details: res.data || '无详细信息', 
            endpoint: endpoint,
            ...res 
          });
        }
        return;
      }
      
      // 检查响应数据格式
      if (!res.data) {
        console.error('Deepseek API响应数据为空', {
          endpoint: endpoint
        });
        
        if (fail) {
          fail({ 
            errMsg: 'Deepseek API响应数据为空', 
            endpoint: endpoint
          });
        }
        return;
      }
      
      if (success) {
        success(res);
      }
    },
    fail: (error) => {
      console.error(`Deepseek API请求错误: ${endpoint}`, error);
      
      // 网络错误时也启用模拟模式
      USE_MOCK_MODE = true;
      API_ERROR_MESSAGE = error.errMsg || '网络请求失败';
      console.log('API请求失败，启用模拟模式');
      
      // 递归调用自身，这次将使用模拟模式
      callDeepseekAPI(endpoint, data, success, fail);
    }
  });
}

// 调用腾讯混元API
const callTencentAPI = (endpoint, data, success, fail) => {
  console.log(`调用腾讯混元API: ${endpoint}`);
  
  // 如果在模拟模式下，直接返回模拟数据
  if (USE_MOCK_MODE) {
    console.log('使用模拟模式调用腾讯API');
    
    let mockResponse = {
      data: {
        mock: true
      }
    };
    
    // 根据不同的端点返回不同的模拟数据
    if (endpoint === 'asr') {
      mockResponse.data.text = '这是模拟的语音识别结果。请检查API设置或网络连接。';
    } else if (endpoint === 'chat') {
      mockResponse.data.choices = [{
        message: {
          content: '这是模拟的AI回复。请检查API设置或网络连接。'
        }
      }];
    }
    
    setTimeout(() => {
      if (success) success(mockResponse);
    }, 1000);
    
    return;
  }
  
  // 实际API调用
  wx.request({
    url: `${TENCENT_API_URL}/${endpoint}`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TENCENT_API_KEY}`
    },
    data: data,
    success: (res) => {
      console.log(`腾讯API(${endpoint})响应:`, res);
      
      if (res.statusCode !== 200) {
        console.error(`腾讯API(${endpoint})请求失败`, res);
        
        // 如果API返回错误，启用模拟模式
        USE_MOCK_MODE = true;
        console.log('启用模拟模式');
        
        // 递归调用自身，这次将使用模拟模式
        callTencentAPI(endpoint, data, success, fail);
        return;
      }
      
      if (success) success(res);
    },
    fail: (error) => {
      console.error(`腾讯API(${endpoint})请求错误`, error);
      
      // 启用模拟模式
      USE_MOCK_MODE = true;
      console.log('启用模拟模式');
      
      // 递归调用自身，这次将使用模拟模式
      callTencentAPI(endpoint, data, success, fail);
    }
  });
};

// 测试Deepseek API连接
const testDeepseekAPI = (success, fail) => {
  console.log('测试Deepseek API连接...');
  
  // 先验证API密钥
  validateAPIKey((res) => {
    // API密钥有效，尝试发送测试消息
    callDeepseekAPI('chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: '你好，这是一个测试消息。'
        }
      ],
      max_tokens: 10,
      temperature: 0.7
    }, (res) => {
      console.log('Deepseek API测试成功:', res);
      if (success) success(res);
    }, (error) => {
      console.error('Deepseek API测试失败:', error);
      
      // 如果是余额不足错误，启用模拟模式
      if (error.statusCode === 402 || (error.data && error.data.error && error.data.error.message === 'Insufficient Balance')) {
        USE_MOCK_MODE = true;
        API_ERROR_MESSAGE = 'Insufficient Balance';
        console.log('检测到API余额不足，启用模拟模式');
        
        if (success) {
          success({
            data: {
              mock: true,
              message: `API当前处于模拟模式: ${API_ERROR_MESSAGE}`
            }
          });
        }
      } else {
        if (fail) fail(error);
      }
    });
  }, (error) => {
    console.error('API密钥验证失败:', error);
    
    // 如果API密钥验证失败，启用模拟模式
    USE_MOCK_MODE = true;
    API_ERROR_MESSAGE = error.data && error.data.error && error.data.error.message ? error.data.error.message : '未知错误';
    console.log('API密钥验证失败，启用模拟模式');
    
    if (success) {
      success({
        data: {
          mock: true,
          message: `API当前处于模拟模式: ${API_ERROR_MESSAGE}`
        }
      });
    }
  });
};

// 语音识别
const recognizeAudio = (audioBase64, success, fail) => {
  console.log('开始语音识别...');
  
  // 检查音频数据是否有效
  if (!audioBase64 || audioBase64.length < 100) {
    console.error('音频数据无效或太短');
    if (fail) {
      fail({
        errMsg: '音频数据无效或太短'
      });
    }
    return;
  }
  
  // 如果在模拟模式下，直接返回模拟数据
  if (USE_MOCK_MODE) {
    console.log('使用模拟模式进行语音识别');
    setTimeout(() => {
      success({
        data: {
          text: '这是模拟的语音识别结果。请检查API设置或网络连接。',
          mock: true
        }
      });
    }, 1000);
    return;
  }
  
  console.log('调用Deepseek语音识别API...');
  
  callDeepseekAPI('audio/transcription', {
    model: 'deepseek-audio',
    file: audioBase64,
    language: 'zh'
  }, (res) => {
    console.log('语音识别API响应:', res);
    
    // 如果是模拟模式，检查是否已经返回了模拟数据
    if (USE_MOCK_MODE && res.data && res.data.text && res.data.text.includes('模拟')) {
      if (success) success(res);
      return;
    }
    
    // 正常API响应处理
    if (res.data && res.data.text) {
      console.log('语音识别成功:', res.data.text);
      if (success) success(res);
    } else {
      console.error('语音识别API返回格式错误', res);
      
      // 如果API返回了错误信息，则使用模拟模式
      USE_MOCK_MODE = true;
      
      // 递归调用自身，这次将使用模拟模式
      recognizeAudio(audioBase64, success, fail);
    }
  }, (error) => {
    console.error('语音识别API调用失败:', error);
    
    // 启用模拟模式
    USE_MOCK_MODE = true;
    console.log('启用模拟模式进行语音识别');
    
    // 递归调用自身，这次将使用模拟模式
    recognizeAudio(audioBase64, success, fail);
  });
};

// 使用腾讯混元进行语音识别
const recognizeAudioWithTencent = (audioBase64, success, fail) => {
  console.log('开始使用腾讯混元进行语音识别...');
  
  // 检查音频数据是否有效
  if (!audioBase64 || audioBase64.length < 100) {
    console.error('音频数据无效或太短');
    if (fail) {
      fail({
        errMsg: '音频数据无效或太短'
      });
    }
    return;
  }
  
  // 如果在模拟模式下，直接返回模拟数据
  if (USE_MOCK_MODE) {
    console.log('使用模拟模式进行语音识别');
    setTimeout(() => {
      success({
        data: {
          text: '这是模拟的语音识别结果。请检查API设置或网络连接。',
          mock: true
        }
      });
    }, 1000);
    return;
  }
  
  console.log('调用腾讯混元语音识别API...');
  
  callTencentAPI('asr', {
    model: 'hunyuan-asr',
    file: audioBase64,
    language: 'zh'
  }, (res) => {
    console.log('语音识别API响应:', res);
    
    // 如果是模拟模式，检查是否已经返回了模拟数据
    if (USE_MOCK_MODE && res.data && res.data.text && res.data.text.includes('模拟')) {
      if (success) success(res);
      return;
    }
    
    // 正常API响应处理
    if (res.data && res.data.text) {
      console.log('语音识别成功:', res.data.text);
      if (success) success(res);
    } else {
      console.error('语音识别API返回格式错误', res);
      
      // 如果API返回了错误信息，则使用模拟模式
      USE_MOCK_MODE = true;
      
      // 递归调用自身，这次将使用模拟模式
      recognizeAudioWithTencent(audioBase64, success, fail);
    }
  }, (error) => {
    console.error('语音识别API调用失败:', error);
    
    // 启用模拟模式
    USE_MOCK_MODE = true;
    console.log('启用模拟模式进行语音识别');
    
    // 递归调用自身，这次将使用模拟模式
    recognizeAudioWithTencent(audioBase64, success, fail);
  });
};

// 与AI对话
const chatWithAI = (messages, success, fail) => {
  // 确保消息格式正确
  const formattedMessages = messages.map(msg => {
    // 确保role是正确的格式：user或assistant
    let role = msg.role;
    if (!role && msg.type) {
      // 如果使用type字段，转换为role
      role = msg.type === 'user' ? 'user' : 'assistant';
    }
    
    return {
      role: role,
      content: msg.content
    };
  });
  
  console.log('发送多轮对话请求，消息历史:', JSON.stringify(formattedMessages));
  
  callDeepseekAPI('chat/completions', {
    model: 'deepseek-chat',
    messages: formattedMessages,
    max_tokens: 1000,
    temperature: 0.7
  }, (res) => {
    console.log('AI对话响应:', res);
    if (success) success(res);
  }, (error) => {
    console.error('AI对话请求失败:', error);
    if (fail) fail(error);
  });
}

// 使用腾讯混元进行聊天
const chatWithTencent = (messages, success, fail) => {
  console.log('开始使用腾讯混元进行聊天...');
  
  // 确保消息格式正确
  const formattedMessages = messages.map(msg => {
    // 确保role是正确的格式：user或assistant
    let role = msg.role;
    if (!role && msg.type) {
      // 如果使用type字段，转换为role
      role = msg.type === 'user' ? 'user' : 'assistant';
    }
    
    return {
      role: role,
      content: msg.content
    };
  });
  
  // 如果在模拟模式下，直接返回模拟数据
  if (USE_MOCK_MODE) {
    console.log('使用模拟模式进行聊天');
    setTimeout(() => {
      success({
        data: {
          choices: [{
            message: {
              content: '这是模拟的AI回复。请检查API设置或网络连接。'
            }
          }],
          mock: true
        }
      });
    }, 1000);
    return;
  }
  
  console.log('调用腾讯混元聊天API...');
  
  callTencentAPI('chat', {
    messages: formattedMessages,
    model: 'hunyuan',
    temperature: 0.7,
    top_p: 0.9,
    stream: false
  }, (res) => {
    console.log('聊天API响应:', res);
    
    // 如果是模拟模式，检查是否已经返回了模拟数据
    if (USE_MOCK_MODE && res.data && res.data.choices && res.data.choices.length > 0 && res.data.choices[0].message.content.includes('模拟')) {
      if (success) success(res);
      return;
    }
    
    // 正常API响应处理
    if (res.data && res.data.choices && res.data.choices.length > 0) {
      console.log('聊天成功:', res.data.choices[0].message.content);
      if (success) success(res);
    } else {
      console.error('聊天API返回格式错误', res);
      
      // 如果API返回了错误信息，则使用模拟模式
      USE_MOCK_MODE = true;
      
      // 递归调用自身，这次将使用模拟模式
      chatWithTencent(messages, success, fail);
    }
  }, (error) => {
    console.error('聊天API调用失败:', error);
    
    // 启用模拟模式
    USE_MOCK_MODE = true;
    console.log('启用模拟模式进行聊天');
    
    // 递归调用自身，这次将使用模拟模式
    chatWithTencent(messages, success, fail);
  });
};

// 翻译文本 (使用Deepseek的聊天API进行翻译)
const translateText = (text, targetLang, success, fail) => {
  const targetLanguageName = targetLang === 'zh' ? '中文' : '英文'
  
  callDeepseekAPI('chat/completions', {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个专业的翻译助手。请将用户的文本翻译成${targetLanguageName}，只返回翻译结果，不要添加任何解释或额外内容。`
      },
      {
        role: 'user',
        content: text
      }
    ],
    max_tokens: 1000,
    temperature: 0.3
  }, (res) => {
    // 如果是模拟模式，直接返回模拟翻译结果
    if (USE_MOCK_MODE && res.data && res.data.mock) {
      let translatedText = '';
      
      // 简单的模拟翻译逻辑
      if (targetLang === 'zh') {
        // 英文到中文的模拟翻译
        if (/^[a-zA-Z\s,.!?]+$/.test(text)) {
          translatedText = `[模拟翻译] ${text} -> 这是英文到中文的模拟翻译结果`;
        } else {
          translatedText = text; // 如果不是纯英文，返回原文
        }
      } else {
        // 中文到英文的模拟翻译
        if (/[\u4e00-\u9fa5]/.test(text)) {
          translatedText = `[Mock Translation] ${text} -> This is a simulated translation from Chinese to English`;
        } else {
          translatedText = text; // 如果不是中文，返回原文
        }
      }
      
      if (success) {
        success({
          translation: translatedText,
          original: text,
          targetLang: targetLang
        });
      }
      return;
    }
    
    // 正常API响应处理
    if (res.data && res.data.choices && res.data.choices.length > 0) {
      const translation = res.data.choices[0].message.content;
      
      if (success) {
        success({
          translation: translation,
          original: text,
          targetLang: targetLang
        });
      }
    } else {
      console.error('翻译API返回格式错误', res);
      if (fail) {
        fail({
          errMsg: '翻译API返回格式错误',
          details: res
        });
      }
    }
  }, fail);
};

module.exports = {
  formatTime,
  recognizeAudio,
  recognizeAudioWithTencent,
  chatWithAI,
  chatWithTencent,
  translateText,
  DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL,
  TENCENT_API_KEY,
  TENCENT_API_URL,
  testDeepseekAPI,
  validateAPIKey
}
