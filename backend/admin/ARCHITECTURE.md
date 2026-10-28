# 管理端控制台 · 架构与开发约定

懂分帝数据运营控制台（`/admin`）。**免构建**：由 FastAPI 以静态文件直接托管（`main.py` 中 `app.mount("/admin", StaticFiles(...))`），不跑 webpack/vite，无 `.vue` 单文件组件、无 `npm run build`。

## 目录结构

```
admin/
├── index.html          # 应用外壳 + 全部 in-DOM 模板（v-if / v-model / el-* 指令）
├── styles.css          # 样式
├── vendor/             # 运行时依赖（本地托管，不依赖 CDN）
│   ├── vue.global.prod.js     # Vue 3 全局构建（含模板编译器）
│   ├── index.full.min.js      # Element Plus 全局 UMD
│   ├── index.css / css-vars.css
└── src/                # 业务逻辑（原生 ESM，无需打包）
    ├── main.js         # 入口：装配根 setup()，合并各页面组合函数并 mount
    ├── vue.js          # 桥接 vendor 全局：重导出 window.Vue / window.ElementPlus
    ├── state.js        # 全局认证态单例（token / user / profile）+ logout
    ├── api.js          # 统一请求封装（注入 Bearer、401/429/错误透传、文件上传）
    ├── icons.js        # ICONS 常量 + AppIcon / LineChart / DonutChart / BarList 组件
    └── pages/          # 按页面划分的组合函数（composable）
        ├── dashboard.js    # 数据看板
        ├── universities.js  # 院校库
        ├── baselines.js     # 录取基线 + 单条修正
        ├── versions.js      # 数据版本（建年度/校验/发布/回滚/审计）
        ├── sync.js          # 数据同步
        ├── lines.js         # 校线导入(D1) / 种子落库(S6) / 官方落库(S7-A,S8-A) / 一分段同步(S11)
        ├── acquisition.js   # 年度采集台账(P0) + 数据体检(P2)
        ├── events.js        # 查询日志
        └── settings.js      # 系统设置（改密 + 数据库配置）
```

## 加载顺序（关键点）

`index.html` 底部：

```html
<script src="./vendor/vue.global.prod.js"></script>   <!-- 经典脚本，解析期立即执行 -->
<script src="./vendor/index.full.min.js"></script>
<script type="module" src="./src/main.js"></script>   <!-- 模块脚本，defer，解析后执行 -->
```

经典脚本先于模块脚本执行，故 `main.js` 运行时 `window.Vue` / `window.ElementPlus` 已就绪。
`src/vue.js` 在模块求值期直接解构这两个全局，因此**在任何浏览器环境下都能用**，无需打包器。

## 组合函数约定

每个页面是一个组合函数 `useXxx()`，内部用 `ref/reactive/computed` 声明状态与 `async` 方法，
返回 `{ ...state, ...methods }` 对象。`main.js` 在根 `setup()` 中调用所有组合函数，展开合并后
`return` 给模板——模板（仍在 `index.html`）无需改动。

新增页面步骤：
1. 在 `src/pages/` 新建 `xxx.js`，导出 `useXxx()`，返回本页全部 state/methods；
2. 在 `main.js` 中 `import` 并调用 `const xxx = useXxx()`，把 `...xxx` 加入根 `return`；
3. 在 `navItems` 加一条导航项；
4. 在 `index.html` 加对应 `<section v-if="page === 'xxx'">` 模板。

## 跨模块协作

- 全局认证态（token/user/profile）集中在 `state.js`，所有组合函数共享同一份响应式引用。
- 看板 `loadOverview` 在「发布/回滚/同步」后需刷新：`versions`/`sync` 通过 `bindOverview()`
  注入 `dashboard.loadOverview`，**避免组合函数之间直接互相 import** 造成耦合。
- 数据库切换（`settings.applyDb/resetDb`）后需整体刷新：`settings` 通过 `bindRefreshAll()`
  注入根 `refreshAll`。

## 测试

- 模板静态校验（前端仓库）：`cd frontend && node tests/template.test.mjs`（复用 vendor 的 Vue 编译器编译 `.vue` 模板；管理端模板在 `index.html`，不参与此项）。
- 模块图校验（本目录）：用最小 `window` shim 在 Node 里动态 `import('./src/main.js')`，
  验证导入路径、命名导出/导入全部对齐。

## 为什么这样设计

- **零部署心智**：后端一启动，控制台随 `/admin` 自动可用，无需独立前端构建与产物托管。
- **仍模块化**：通过原生 ESM 获得模块边界、可复用、可单测，规避「单文件 1000+ 行」的维护灾难。
- **取舍**：无 TS / 无 HMR / 逻辑无独立单测框架（模板与运行时强依赖浏览器 DOM）。
  若后台持续膨胀到多人长期并行开发，可平滑迁移到 Vite + SFC（产物仍由后端 `StaticFiles` 托管）。
