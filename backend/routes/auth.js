const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/store');

const router = express.Router();

const sessions = {};

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON('users.json', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  const token = uuidv4();
  sessions[token] = { userId: user.id, expireAt: Date.now() + 24 * 60 * 60 * 1000 };

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && sessions[token]) {
    delete sessions[token];
  }
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions[token] : null;

  if (!session || session.expireAt < Date.now()) {
    if (session) delete sessions[token];
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }

  const users = readJSON('users.json', []);
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ success: false, message: '用户不存在' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions[token] : null;

  if (!session || session.expireAt < Date.now()) {
    if (session) delete sessions[token];
    return res.status(401).json({ success: false, message: '未登录或登录已过期' });
  }

  const users = readJSON('users.json', []);
  const user = users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: '用户不存在' });
  }

  req.user = user;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}

module.exports = { router, authMiddleware, adminMiddleware };
