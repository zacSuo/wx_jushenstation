const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 80;

// 中间件
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// DeepSeek API配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 健康检查
app.get('/', (req, res) => {
  res.status(200).send('DeepSeek助手云服务正常运行中');
});

// 语音识别API
app.post('/speech-to-text', async (req, res) => {
  try {
    const { audio, language } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: '缺少音频数据' });
    }
    
    const response = await axios.post(`${DEEPSEEK_API_URL}/speech-to-text`, {
      audio,
      language: language || 'zh'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('语音识别错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '语音识别失败', 
      details: error.response?.data || error.message 
    });
  }
});

// 聊天API
app.post('/chat', async (req, res) => {
  try {
    const { messages, max_tokens, temperature } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '消息格式不正确' });
    }
    
    const response = await axios.post(`${DEEPSEEK_API_URL}/chat`, {
      messages,
      max_tokens: max_tokens || 1000,
      temperature: temperature || 0.7
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('聊天错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '聊天请求失败', 
      details: error.response?.data || error.message 
    });
  }
});

// 翻译API
app.post('/translate', async (req, res) => {
  try {
    const { text, target_language } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少要翻译的文本' });
    }
    
    if (!target_language) {
      return res.status(400).json({ error: '缺少目标语言' });
    }
    
    const response = await axios.post(`${DEEPSEEK_API_URL}/translate`, {
      text,
      target_language
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('翻译错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '翻译失败', 
      details: error.response?.data || error.message 
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`DeepSeek助手云服务运行在端口 ${port}`);
});
