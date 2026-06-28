const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authModule = require('./routes/auth');
const seatsRouter = require('./routes/seats');
const bookingsRouter = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authModule.router);
app.use('/api/seats', seatsRouter);
app.use('/api/bookings', bookingsRouter);

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`自习室预约系统后端服务已启动: http://localhost:${PORT}`);
  console.log('默认账户:');
  console.log('  管理员: admin / admin123');
  console.log('  普通用户: zhangsan / 123456, lisi / 123456, wangwu / 123456');
});
