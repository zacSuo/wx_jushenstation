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

### 配置云托管服务

本项目使用微信云托管服务作为中间层，用于处理与DeepSeek API的通信。请按照以下步骤配置：

1. 在微信开发者工具中，选择"云托管"
2. 点击"新建版本"
3. 选择"代码上传"方式
4. 上传本项目代码
5. 在环境变量中配置`DEEPSEEK_API_KEY`，设置为您的DeepSeek API密钥
6. 完成部署后，获取云托管服务的域名
7. 在`app.js`中更新`apiUrl`为您的云托管服务域名：

```javascript
globalData: {
  userInfo: null,
  apiKey: '您的DeepSeek API密钥',
  apiUrl: 'https://您的云托管服务域名'
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
├── server.js              // 云托管服务后端代码
├── Dockerfile             // 容器配置文件
├── package.json           // 依赖配置
└── project.config.json    // 项目配置文件
```

## 云托管服务

本项目包含了云托管服务所需的所有文件：

- `Dockerfile`: 定义如何构建容器
- `package.json`: 定义项目依赖
- `server.js`: 后端服务器代码，处理API请求
- `.dockerignore`: 排除不必要的文件

云托管服务作为中间层，负责处理以下API请求：

- `/speech-to-text`: 语音识别
- `/chat`: 与AI对话
- `/translate`: 文本翻译

## 注意事项

- 本项目中的API调用需要有效的DeepSeek API密钥
- 语音功能需要用户授权录音权限
- 在开发阶段，`project.config.json`中的`urlCheck`设置为`false`，以便可以访问未配置的域名
- 在生产环境中，应将`urlCheck`设置为`true`，并确保云托管服务域名已添加到小程序的合法域名列表中
