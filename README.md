# DeepSeek助手小程序

这是一个基于微信小程序平台开发的DeepSeek助手应用，包含三个主要功能：

1. **语音对话**：通过语音或文字与DeepSeek大模型进行对话
2. **最新产品**：浏览DeepSeek最新的产品信息
3. **翻译功能**：支持多语言之间的文本翻译

## 使用说明

### 开发环境准备

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 注册微信小程序开发者账号
3. 在微信开发者工具中导入本项目

### 运行项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择本项目所在目录
4. 填入自己的AppID（如果没有，可以选择"测试号"）
5. 点击"导入"按钮

### 配置API密钥

在正式使用前，需要在`app.js`中配置DeepSeek API密钥：

```javascript
globalData: {
  userInfo: null,
  apiKey: '在此处填入您的DeepSeek API密钥',
  apiUrl: 'https://api.deepseek.com'
}
```

## 项目结构

```
├── app.js                 // 应用程序逻辑
├── app.json               // 全局配置
├── app.wxss               // 全局样式
├── images/                // 图片资源
├── pages/                 // 页面文件夹
│   ├── chat/              // 语音对话页面
│   ├── products/          // 产品展示页面
│   └── translate/         // 翻译功能页面
├── utils/                 // 工具函数
│   └── util.js            // 通用工具和API调用
└── project.config.json    // 项目配置文件
```

## 注意事项

- 本项目中的API调用需要有效的DeepSeek API密钥
- 语音功能需要用户授权录音权限
- 产品数据目前为静态数据，可根据需要修改为从服务器获取
