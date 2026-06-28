# 自习室座位预约系统

面向小型合租共享空间的轻量座位预约系统，技术栈 **Vue 3 + Node.js (Express)**，数据存储使用 JSON 文件，无需数据库。

## 功能特性

### 用户端
- **座位分布图**：按静音区 / 讨论区分类展示，实时显示座位占用状态
- **三档时段预约**：上午 (08:00-12:00)、下午 (13:00-17:00)、晚上 (18:00-22:00)
- **我的预约**：查看、取消个人预约记录
- **防冲突**：
  - 同一用户同一时段不能重复下单
  - 一个座位同一时段不能被两人同时占用

### 管理端
- **订单管理**：查看全部订单，支持按日期 / 状态筛选
- **强制取消**：管理员可取消任意用户的预约

## 目录结构

```
project180/
├── backend/                 # Node.js 后端
│   ├── server.js            # 服务入口
│   ├── routes/              # 路由模块
│   │   ├── auth.js          # 用户登录模块
│   │   ├── seats.js         # 座位配置模块
│   │   └── bookings.js      # 预约管理模块
│   ├── utils/
│   │   └── store.js         # JSON 文件存储层
│   ├── data/                # JSON 数据（自动生成）
│   │   ├── users.json
│   │   ├── seats.json
│   │   └── bookings.json
│   └── package.json
├── frontend/                # Vue 3 前端
│   ├── src/
│   │   ├── views/           # 三个页面
│   │   │   ├── LoginView.vue       # 登录页
│   │   │   ├── SeatsView.vue       # 座位浏览/预约页
│   │   │   ├── MyBookingsView.vue  # 我的预约页
│   │   │   └── AdminView.vue       # 管理员订单页
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── router.js
│   │   ├── api.js           # API 封装
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json             # 根目录统一脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 启动开发环境

开两个终端，分别执行：

**终端 1 - 启动后端（端口 3002）：**
```bash
npm run dev:backend
```

**终端 2 - 启动前端（端口 5173）：**
```bash
npm run dev:frontend
```

然后访问 http://localhost:5173

### 3. 生产部署

```bash
# 构建前端
npm run build:frontend

# 启动后端（同时托管前端 dist）
npm start
```

后端服务会在 http://localhost:3002 同时提供 API 和前端静态页面。

## 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | zhangsan | 123456 |
| 普通用户 | lisi | 123456 |
| 普通用户 | wangwu | 123456 |

可直接编辑 `backend/data/users.json` 增删用户。

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 座位
- `GET /api/seats` - 获取座位 / 区域 / 时段配置
- `GET /api/seats/availability?date=YYYY-MM-DD` - 查询某日各座位各时段的占用情况
- `PUT /api/seats` - 修改座位配置（仅管理员）

### 预约
- `POST /api/bookings` - 创建预约
- `GET /api/bookings/mine` - 我的预约列表
- `GET /api/bookings/all` - 全部预约列表（仅管理员）
- `POST /api/bookings/:id/cancel` - 取消预约（本人或管理员）
