# 自习室座位预约系统 · 架构说明

> 给新同事看的快速上手指南，花 10 分钟读完大概能知道每块代码是干嘛的、怎么改、从哪儿下手。

---

## 一、项目是啥

三四个人合租共享空间用的轻量座位预约系统。核心需求就三条：

1. 用户能看到座位分布图，选座位 + 选时段（上午/下午/晚上）下单
2. 防冲突：同一个人同一时段不能订两次，一个座位不能同时被两人占
3. 管理员能看当天所有订单、能强制取消

技术栈很朴素：**Vue 3 + Vue Router 4（前端）+ Node.js + Express（后端）+ JSON 文件（存数据）**。没有数据库、没有 Vuex/Pinia、没有 TypeScript，主打一个「够用就好」。

---

## 二、目录长这样

```
project180/
├── backend/                     后端 Node.js 服务
│   ├── server.js                 入口文件（端口 3002）
│   ├── routes/
│   │   ├── auth.js               登录 / 登出 / 鉴权中间件
│   │   ├── seats.js              座位配置 + 占用状态查询
│   │   └── bookings.js           预约增删查 + 常坐位统计
│   ├── utils/
│   │   └── store.js              JSON 文件读写封装（唯一的数据访问层）
│   └── data/
│       ├── users.json            用户表（含管理员）
│       ├── seats.json            座位配置（区域、坐标、时段）
│       └── bookings.json         预约订单
│
├── frontend/                    前端 Vue 3 项目
│   ├── vite.config.js            Vite 配置（/api 代理到 3002）
│   └── src/
│       ├── main.js               入口
│       ├── App.vue               根组件（导航栏 + 路由出口）
│       ├── router.js             路由 + 路由守卫（鉴权）
│       ├── api.js                所有 HTTP 请求封装（按模块分组）
│       ├── styles.css            全局样式
│       ├── composables/
│       │   └── useFrequentSeats.js  「常坐位高亮」组合式函数
│       └── views/
│           ├── LoginView.vue     登录页
│           ├── SeatsView.vue     座位浏览 + 预约页（核心页面）
│           ├── MyBookingsView.vue  我的预约
│           └── AdminView.vue     管理员订单管理
│
├── package.json                  根目录统一脚本（npm run dev:backend 等）
└── README.md / ARCHITECTURE.md   你正在看的
```

---

## 三、后端架构

### 3.1 入口：server.js

入口文件就 [server.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/server.js) 这么一个，做的事情：

1. 配 CORS、bodyParser
2. 把三个路由模块挂到 `/api/auth`、`/api/seats`、`/api/bookings` 下
3. 用 `express.static` 托管前端打包好的 `dist` 目录（生产环境可以直接 Node 起前端）
4. 所有非 API 的 GET 请求 fallback 到 `index.html`（给 Vue Router 的 hash 模式兜底）
5. 监听 3002 端口，启动时把测试账号打印出来方便人用

**关键细节**：端口号是 `3002`（之前 3001 被占用改过一次），前端 `vite.config.js` 里的代理目标也要对应。

### 3.2 三大路由模块的分工边界

| 模块 | 文件 | 管什么 | 不管什么 |
|------|------|--------|----------|
| **auth** | [routes/auth.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/auth.js) | 登录、登出、token 校验、角色判断 | 具体业务逻辑 |
| **seats** | [routes/seats.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/seats.js) | 座位 CRUD、查询某天某时段座位有没有被占 | 下订单、用户管理 |
| **bookings** | [routes/bookings.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/bookings.js) | 预约下单、取消、查我的预约、管理员查所有预约、常坐位统计 | 座位本身的配置 |

**auth 模块还对外暴露了两个中间件**，其他路由会经常用到：
- `authMiddleware` — 校验请求头里有没有合法 token，有就把 `req.user` 填上
- `adminMiddleware` — 在校验登录的基础上再要求 `role === 'admin'`

### 3.3 各模块主要接口一览

#### auth 模块（前缀 `/api/auth`）

| 方法 | 路径 | 需登录 | 说明 |
|------|------|--------|------|
| POST | `/login` | 否 | 用户名密码换 token |
| POST | `/logout` | 是 | 销毁当前 token |
| GET | `/me` | 是 | 用 token 反查当前用户信息 |

#### seats 模块（前缀 `/api/seats`）

| 方法 | 路径 | 需登录 | 说明 |
|------|------|--------|------|
| GET | `/` | 否 | 拉所有座位配置（区域、坐标、时段列表） |
| PUT | `/` | 管理员 | 更新座位布局 |
| GET | `/availability?date=YYYY-MM-DD` | 是 | 查指定日期每个座位每个时段的占用情况 |

#### bookings 模块（前缀 `/api/bookings`）

| 方法 | 路径 | 需登录 | 说明 |
|------|------|--------|------|
| POST | `/` | 是 | 下新预约（含双重冲突检测） |
| GET | `/mine?date=...` | 是 | 查我自己的预约 |
| GET | `/all?date=...` | 管理员 | 查当天所有人的预约 |
| POST | `/:id/cancel` | 是 | 取消预约（本人或管理员） |
| GET | `/frequent-seats` | 是（普通用户） | 统计我历史上常坐哪些座位（管理员直接返回空） |

---

## 四、前端架构

### 4.1 四个页面 & 后端接口对应关系

| 页面 | 文件 | 主要调哪些接口 |
|------|------|----------------|
| **登录页** | [views/LoginView.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/views/LoginView.vue) | `authApi.login()` → 成功后存 token 到 localStorage |
| **座位浏览/预约页** | [views/SeatsView.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/views/SeatsView.vue) | `seatsApi.get()` 拉座位布局<br>`seatsApi.availability()` 拉占用情况<br>`bookingsApi.create()` 下单<br>`useFrequentSeats()` 拉常坐位 |
| **我的预约** | [views/MyBookingsView.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/views/MyBookingsView.vue) | `bookingsApi.mine()` 列表 + `bookingsApi.cancel()` 取消 |
| **管理员订单** | [views/AdminView.vue](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/views/AdminView.vue) | `bookingsApi.all()` 查全量 + `bookingsApi.cancel()` 强制取消 |

### 4.2 路由守卫

[router.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/router.js) 里给每个路由打了两个「标签」：

- `requiresAuth: true` — 必须登录才能进（座位页、我的预约、管理员页）
- `requiresAdmin: true` — 不仅要登录，还得是管理员（管理员订单页）

`beforeEach` 里统一判断：没登录跳 `/login`，不是管理员跳首页。登录状态判断就看 localStorage 里有没有 `user` 和 `token`（纯前端判断，真正的权限校验在后端中间件里）。

### 4.3 状态管理：没上 Vuex，就用 Composition API + localStorage

整个项目没引入 Pinia/Vuex，状态管理就两条：

1. **token 和用户信息** — 直接存 `localStorage`（`api.js` 里的 `getToken` / `setToken` / `getUser` / `setUser`），简单粗暴够用
2. **跨组件复用逻辑** — 用 Vue 3 的「组合式函数」模式。目前抽出来的只有一个：[composables/useFrequentSeats.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/composables/useFrequentSeats.js)

`useFrequentSeats` 是前阵子重构的产物，负责：
- 调 `/bookings/frequent-seats` 接口拿数据
- 管 `loading`、`error` 状态
- 判断当前用户是不是管理员（管理员不显示常坐位）
- 对外返回 `frequentSeatIds`（Set，O(1) 查询）、`isFrequent(id)` 等方法

SeatsView.vue 自己就专注渲染座位和处理交互，不用管常坐数据是怎么来的。

---

## 五、数据存储：为什么是 JSON 文件

### 5.1 文件结构

所有数据都在 `backend/data/` 下：

- **users.json** — 用户表，每条记录长这样：
  ```json
  { "id": "user1", "username": "admin", "password": "admin123", "name": "管理员", "role": "admin" }
  ```
  `role` 字段决定是 `admin` 还是普通 `user`。

- **seats.json** — 座位配置（两部分：区域 + 座位 + 时段）：
  ```json
  {
    "zones": [
      { "id": "silent", "name": "静音区", "color": "#1890ff" },
      { "id": "discussion", "name": "讨论区", "color": "#fa8c16" }
    ],
    "timeSlots": [
      { "id": "morning", "name": "上午", "timeRange": "08:00 - 12:00" }
    ],
    "seats": [
      { "id": "A1", "zoneId": "silent", "x": 0, "y": 0 }
    ]
  }
  ```
  座位用 `x`、`y` 坐标控制在分布图上的位置，布局改起来很方便。

- **bookings.json** — 预约订单，核心字段：
  ```json
  {
    "id": "uuid",
    "userId": "user2",
    "seatId": "A1",
    "date": "2026-06-28",
    "timeSlotId": "afternoon",
    "status": "active",
    "createdAt": "2026-06-28T14:59:23.639Z"
  }
  ```
  `status` 目前只有 `active`（预留了取消字段，但取消是直接物理删除，没改状态）。

### 5.2 为什么不用数据库？

- 用户量：三四个人的合租空间，并发量可以忽略不计
- 数据量：一天撑死十来条预约，一年几千条，JSON 完全装得下
- 运维成本：不用装 MySQL/Postgres，拉代码 `npm install` 就能跑
- 迁移方便：JSON 文件拷走就完事，没有 dump/restore

**数据访问统一走 [utils/store.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/utils/store.js)** 里的 `readJSON` / `writeJSON`，所有路由都不直接 `fs.readFile`，以后真要换成数据库，只要改这一层就行。

### 5.3 一个小坑

**JSON 文件读写没有事务**。高并发下两个人同时下单可能会有数据竞争丢失。但对于「三四个人」这个场景，概率约等于零，先不管了。真要解决可以加个 `async-mutex` 之类的轻量锁。

---

## 六、核心流程：从点座位到写 JSON

以「用户下单预约」这个最复杂的场景为例，走一遍完整链路：

### 6.1 时序总览

```
用户点击座位
  ↓
SeatsView.vue 选中 seatId + 当前 date + 当前 timeSlotId
  ↓
点击「确认预约」按钮
  ↓
bookingsApi.create(seatId, date, timeSlotId)
  ↓
request() 函数自动带上 Authorization: Bearer <token>
  ↓
POST /api/bookings
  ↓
authMiddleware 校验 token，把 req.user 填上
  ↓
bookings.js 里做双重冲突检测
  ↓
通过 → writeJSON 写 bookings.json → 返回 enriched 数据
不通过 → 返回 409 冲突
  ↓
前端收到 success → 刷新 availability 和 frequentSeats → 弹出提示
```

### 6.2 真实 HTTP 请求/响应示例

**请求**：
```http
POST /api/bookings HTTP/1.1
Host: localhost:3002
Content-Type: application/json
Authorization: Bearer b985f284-xxxx-xxxx-xxxx-xxxxxxxxxxxx

{
  "seatId": "A1",
  "date": "2026-06-28",
  "timeSlotId": "afternoon"
}
```

**成功响应（200）**：
```json
{
  "success": true,
  "data": {
    "id": "e9b791b1-c6af-45c3-ba68-86e0bb256cd0",
    "userId": "user2",
    "seatId": "A1",
    "date": "2026-06-28",
    "timeSlotId": "afternoon",
    "status": "active",
    "createdAt": "2026-06-28T14:59:23.639Z",
    "seatName": "A1",
    "zoneName": "静音区",
    "timeSlotName": "下午",
    "timeRange": "13:00 - 17:00",
    "userName": "张三"
  }
}
```

**冲突响应（409）**：
```json
{
  "success": false,
  "message": "该座位在此时段已被预约"
}
```

### 6.3 双重冲突检测

这是后端最核心的逻辑，在 [bookings.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/bookings.js) 里的 create 接口开头：

**冲突一：同一个人同一时段重复下单**
```javascript
const selfConflict = bookings.find(b =>
  b.userId === req.user.id &&
  b.date === date &&
  b.timeSlotId === timeSlotId &&
  b.status === 'active'
);
```

**冲突二：座位被别人占了**
```javascript
const seatConflict = bookings.find(b =>
  b.seatId === seatId &&
  b.date === date &&
  b.timeSlotId === timeSlotId &&
  b.status === 'active'
);
```

任何一个命中都返回 409。

### 6.4 座位状态的优先级

前端渲染时一个座位可能同时满足多个条件，用下面的优先级决定显示成什么颜色（从高到低，先命中的用谁）：

| 优先级 | 状态 | 样式 class | 颜色 |
|--------|------|-----------|------|
| 1 | 被当前用户选中（待下单） | `.seat-selected` | 深绿 |
| 2 | 当前用户已预约 | `.seat-mine` | 浅绿 |
| 3 | 被别人占了 | `.seat-occupied` | 灰色不可点 |
| 4 | 是当前用户的常坐位（仅普通用户） | `.seat-frequent` | 橙黄 |
| 5 | 普通空位 | `.seat-available` | 浅蓝 |

所以「常坐位」不会覆盖掉「我已预约」或「已被占用」的状态，不会误导人。

---

## 七、Token 鉴权机制

### 7.1 Token 的一生

```
生成 → 传递 → 校验 → 过期
```

**1. 生成（登录时）**  
[auth.js:18](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/auth.js#L18) 用 `uuidv4()` 生成一串随机 token，存在内存的 `sessions` 对象里：
```javascript
sessions[token] = { userId: user.id, expireAt: Date.now() + 24 * 60 * 60 * 1000 };
```
有效期 24 小时。

**2. 传递（每次请求）**  
前端 `api.js` 里的 `request()` 函数自动从 localStorage 取 token，塞到请求头里：
```javascript
headers['Authorization'] = `Bearer ${token}`
```

**3. 校验（后端中间件）**  
`authMiddleware` 从请求头抠掉 `Bearer ` 前缀，查 `sessions[token]`：
- 不存在 → 401
- `expireAt < Date.now()` → 401 + 顺手把过期 session 从内存里清掉
- 通过 → 把用户信息挂到 `req.user` 上，后面的路由直接用

**4. 过期 / 登出**  
登出接口会从 `sessions` 里 `delete` 掉对应 token。另外 24 小时自然过期。

### 7.2 一个注意点

`sessions` 是纯内存对象，**后端重启就全没了**，所有用户都会被踢下线。对于当前场景完全可以接受，真要持久化可以换成 Redis 或者写个 JSON 文件存 sessions。

---

## 八、本地跑起来

### 8.1 安装依赖（第一次）

```bash
# 在项目根目录
npm run install:all
```

这会同时给 backend 和 frontend 装依赖（原理就是分别 cd 进去 `npm install`）。

### 8.2 启动开发模式

两个终端分别跑：

```bash
# 终端 1：后端（端口 3002）
npm run dev:backend

# 终端 2：前端 Vite（端口 5173 / 5174，随机）
npm run dev:frontend
```

或者根目录也可以直接 `npm start` 同时起前后端（不过日志会混在一起，建议分开）。

### 8.3 生产构建

```bash
npm run build:frontend   # 打包前端到 frontend/dist
node backend/server.js   # 后端会自动托管 dist，一个进程搞定前后端
```

### 8.4 测试账号

后端启动的时候会在控制台打印一遍，这里也列一下：

| 角色 | 用户名 | 密码 | 备注 |
|------|--------|------|------|
| 管理员 | `admin` | `admin123` | 能看订单管理页、取消任何人的预约 |
| 普通用户 | `zhangsan` | `123456` | 张三，有历史预约（常坐位 A1） |
| 普通用户 | `lisi` | `123456` | 李四，干净账号 |
| 普通用户 | `wangwu` | `123456` | 王五，干净账号 |

### 8.5 改代码从哪儿下手的一些小贴士

- **想加新预约规则（比如只能约未来 3 天）** → 改 [bookings.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/backend/routes/bookings.js) 的 create 接口，在冲突检测后面加一层时间校验
- **想调整座位布局 / 增删座位** → 直接改 `backend/data/seats.json`，或者管理员账号调 PUT `/api/seats`（前端暂时没做管理界面，得手动调接口）
- **想加时段（比如加个「通宵」档）** → `seats.json` 里的 `timeSlots` 数组加一项，前端自动会多渲染一个时段按钮
- **想让高亮颜色更顺眼** → 改 [styles.css](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo180/project180/frontend/src/styles.css) 里 `.seat-*` 开头的 class
- **想加新页面** → `views/` 下新建 `.vue`，然后去 `router.js` 加路由配置（记得打 `requiresAuth` 标签）
- **想接数据库** → 只改 `utils/store.js` 这一个文件，把 `readJSON` / `writeJSON` 换成数据库查询，其他代码一行不用动
