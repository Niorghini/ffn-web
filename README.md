# 发法牛 - 发布的想法都很牛！

📝 一款简洁高效的本地优先笔记应用，让记录想法变得轻松自如。**v1.2 起支持多端实时同步**。

## ✨ 核心功能

### 📝 笔记记录
- 快速记录想法，纯文本输入（v1.2 移除富文本/图片）
- 停止输入 300ms 自动保存
- 支持 `Ctrl+Enter` 快捷创建
- 软删除（30 天可恢复）+ 自动归档（已处理 7/30 天/永不）

### 🏷️ 标签系统
- 使用 `#标签名` 格式自动识别标签
- 标签独立实体（UUID + 颜色 + 笔记数）
- 点击标签快速筛选；AND/OR 组合筛选
- 标签管理：合并、颜色、计数

### ✅ 状态管理
- 已处理/未处理状态切换
- 状态筛选（全部 / 未处理 / 已处理）
- 处理时间自动记录
- 已处理笔记按策略自动归档

### ☁️ 多端同步（v1.2 新增）
- Supabase 云端 + 本地 IndexedDB 离线优先
- 邮箱 + 密码认证
- Realtime 跨设备实时更新
- 30s 轮询 + 联网/切回前台自动同步
- 指数退避重试 + 离线队列
- LWW（最后写入胜出）冲突解决 + 手动冲突 UI

### 🔍 检索与数据
- 全文搜索（content 字段）
- 标签筛选 + 状态筛选
- 笔记列表虚拟滚动（手写 useVirtualizer，1w 条 50ms 渲染）
- JSON 导入/导出（开发中）
- 每日自动备份（开发中）

## 🚀 快速开始（v1.2）

### 1. 启动本地 Supabase

需要 Docker Desktop 和 Supabase CLI（已自带）。

```bash
cd /Users/niorghini/ffnapp/ffnmv
supabase start    # 首次会拉镜像（~3min），之后秒启
supabase status   # 查 URL + anon key
```

把 status 里的 API URL 和 `Publishable` key 写到 `.env.local`：

```bash
# .env.local （已存在，请确认值与 supabase status 一致）
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

### 2. 安装依赖 + 启动 dev

```bash
npm install
npm run dev
# 打开 http://localhost:5173
```

### 3. 注册并使用

第一次打开是登录页，切到「注册」用任意 email + 6+ 字符密码注册一个本地 Supabase 账号（不需要真实邮箱，Supabase 本地默认关闭 email confirmation）。

### 4. 测试同步

打开两个浏览器窗口（一个普通窗口 + 一个无痕窗口），都登录同一账号。一个窗口建笔记/改笔记，另一个应该在 1 秒内看到（Realtime）。

## 🛠️ 技术栈

- **前端**: React 18 + Vite 5 + Tailwind CSS 3
- **路由**: react-router-dom v6
- **状态**: Zustand
- **数据库**: Dexie.js (IndexedDB 封装，7-store schema)
- **云端**: Supabase (Postgres + RLS + Realtime)
- **测试**: Vitest + @testing-library/react + fake-indexeddb + happy-dom
- **图标**: Lucide React

## 📦 版本信息

**当前版本**: v1.2.0

### v1.2 主要变化（与 v0.7.0 对比）
- ✨ 接入 Supabase 云端同步（多端实时）
- ✨ 邮箱密码认证
- ✨ 标签升级为独立实体（UUID + 颜色 + 计数）
- ✨ 软删除（30 天可恢复）+ 自动归档
- ✨ 冲突解决 UI（LWW + 手动选择）
- ✨ 虚拟滚动（1w 条笔记流畅）
- 🗑 移除图片上传（PRD 改为纯文本）
- 🗑 移除富文本（PRD 改为纯文本）
- 🗑 **v0.7.0 本地数据不再兼容**（首次启动会一次性清理并提示）

## 🧪 测试

```bash
npm test          # 一次性跑全套
npm run test:watch  # watch 模式
```

当前 98 个测试覆盖：
- Dexie 7-store 创建/索引/CRUD
- 仓库层 create/update/softDelete/restore/merge/version bump/sync_queue 入队
- LWW pickWinner 四种分支
- SyncManager 推/拉/冲突/退避/Realtime 过滤/网络监听
- autoArchive（7/30/永不 三策略）
- cleanup（30 天硬删）
- Editor debounce 自动保存、Ctrl+Enter 创建、状态切换
- Login 模式切换、错误显示
- useVirtualizer 滚动计算

## 🏗️ 项目结构

```
src/
├── lib/                     # 数据 + 同步底层
│   ├── db.js                # Dexie 7-store
│   ├── supabase.js          # Supabase client 单例
│   ├── auth.js              # 登录/注册/登出
│   ├── syncManager.js       # 同步核心（PRD §5）
│   ├── syncInstance.js      # 单例 + store 绑定
│   ├── conflict.js          # LWW pickWinner
│   ├── tags.js              # 标签解析 + 颜色
│   ├── device.js            # 设备 ID
│   ├── autoArchive.js       # 自动归档
│   └── cleanup.js           # 30 天硬删
├── repositories/            # 仓库层（写操作唯一入口）
│   ├── notesRepo.js
│   ├── tagsRepo.js
│   └── noteTagsRepo.js
├── stores/                  # Zustand stores
│   ├── useAuthStore.js
│   ├── useNotesStore.js
│   ├── useTagsStore.js
│   ├── useSyncStore.js
│   └── useConflictsStore.js
├── hooks/
│   └── useVirtualizer.js    # 虚拟滚动
├── components/              # UI 组件
│   ├── TagList.jsx
│   ├── NoteList.jsx
│   ├── Editor.jsx
│   ├── SearchBar.jsx
│   ├── StatusFilter.jsx
│   ├── SyncIndicator.jsx
│   ├── ConflictDialog.jsx
│   └── Toast.jsx
├── pages/                   # 路由页面
│   ├── MainApp.jsx          # 三栏主界面
│   ├── Trash.jsx
│   ├── Settings.jsx
│   └── Login.jsx
└── test/
    ├── setup.js             # fake-indexeddb + jest-dom
    └── fakes/
        └── supabase.js
```

## 🔄 同步五大流程（PRD §5）

| 流程 | 触发 | 实现 |
|---|---|---|
| 初始化同步 | 登录 | `SyncManager.start()` → `fullSync()` → 水印 + Realtime + 轮询 + 监听 |
| 本地推云端 | 仓库层写操作 | `_pushLocalChanges()` 批量 upsert，失败指数退避 |
| 云端拉本地 | 30s 轮询 + Realtime + 切前台 | `_syncEntity()` + `_handleRealtimeChange()`，LWW 合并 |
| 离线恢复 | online 事件 | `retryDelay` 重置 + `fullSync()` |
| 多设备 | Realtime 跨设备推送 | `user_id=eq.${userId}` 过滤的 channel 订阅 |

## 🐛 已知限制 / 后续

- 标签拖拽排序未实现（M5 留接口）
- 标签合并 UI 未做（后端 merge() 已就绪）
- JSON 导入/导出待加
- 每日自动备份待加
- PWA / service worker 待加（PRD 7.4）

## 📄 许可证

MIT License

## 💡 致敬 Flomo

发法牛的诞生，源于对 [Flomo](https://flomoapp.com/) 的深深敬意——「记录即是进步」。受其启发，加上「已处理/未处理 + 软删除 + 跨设备同步」等自己的思考，形成发法牛 v1.2。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
