//启动接口
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logsRouter = require('./routes/logs.js');
require('./db.js'); // 执行里面的连接测试

const app = express();

// 中间件
app.use(cors()); // 允许前端跨域访问
app.use(express.json()); // 解析 JSON 请求体

// 路由挂载
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: '后端运行中' }));
app.use('/api/logs', logsRouter);

// 启动服务
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`);
});