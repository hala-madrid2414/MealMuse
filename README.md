# MealMuse

一款「吃什么」决策助手。用户回答 3 个问题（在意什么 / 想吃什么 / 有什么限制），系统给出 1 个主推 + 2 个备选。

本仓库是 **pnpm workspaces** Monorepo，统一采用 **CommonJS** 模块规范：

- 前端：Taro（`apps/client`，支持 H5 / 微信小程序 / 多端）
- 后端：NestJS（`apps/server`）
- 共享：`@mealmuse/shared`（`packages/shared`）

---

## 目录

1. [这是什么项目？](./README.md#这是什么项目)
2. [目录结构](./README.md#目录结构)
3. [前后端怎么对接？](./README.md#前后端怎么对接)
4. [我要装一个包，应该在哪条命令？](./README.md#我要装一个包应该在哪条命令)
5. [怎么把项目跑起来？](./README.md#怎么把项目跑起来)
6. [git commit 时会自动发生什么？](./README.md#git-commit-时会自动发生什么)
7. [代码风格是怎么管的？](./README.md#代码风格是怎么管的)
8. [我可能用到的命令](./README.md#我可能用到的命令)
9. [遇到问题怎么办？](./README.md#遇到问题怎么办)

---

## 这是什么项目？

MealMuse 是一个解决「一个人不知道吃什么」问题的应用。

- **前端（`apps/client`）**：用户能看到的界面。用 [Taro](https://docs.taro.zone/) 编写，编译后可同时跑在 H5、微信小程序等多端。
- **后端（`apps/server`）**：用户看不到的服务端。用 [NestJS](https://docs.nestjs.com/) 编写，对外提供 HTTP API、负责数据处理。
- **共享包（`packages/shared`）**：前后端**约定共用**的类型、常量、工具函数（例如 API 请求/响应的 TS 类型）。两端 import 同一份，杜绝字段拼写不一致。

整个仓库用 [pnpm workspace](https://pnpm.io/workspaces) 管理：多个子项目在一个仓库里，依赖可复用，不会出现"我电脑能跑你电脑跑不起来"的幽灵依赖问题。

---

## 目录结构

```text
MealMuse/
├── apps/
│   ├── client/          # 前端（Taro：H5 / 微信小程序）
│   └── server/          # 后端（NestJS）
├── packages/
│   └── shared/          # 共享类型 / 常量（@mealmuse/shared）
├── scripts/
│   └── preinstall.js    # 装包守卫：拦截 npm/yarn、禁止子目录 install
├── .husky/              # Git 钩子（提交时自动触发）
├── commitlint.config.cjs
├── pnpm-workspace.yaml  # 声明包含 apps/* 和 packages/*
└── package.json
```

---

## 前后端怎么对接？

走最常见的 **HTTP REST API**：

- 浏览器/小程序 → 通过 HTTP 请求调用后端接口
- 默认端口：后端 `3000`、H5 `10086`（端口可在 `apps/server/src/main.ts` 与 Taro 配置里改）
- 跨域处理：
  - **开发期**：H5 通过 Taro devServer 的 proxy 转发到后端，**无需手动配 CORS**
  - **生产期**：由后端做 CORS 配置（部署时按环境调整）
- 共享类型：API 的请求/响应结构、错误码等放在 `@mealmuse/shared`，前后端 import 同一份 TS 类型，**改一处两端都更新**

---

## 我要装一个包，应该在哪条命令？

**口诀**：**「只在一个端用的 → 装那个端；所有端都用的 → 装根目录。」**

| 场景                               | 命令                               | 适用情况                     |
| ---------------------------------- | ---------------------------------- | ---------------------------- |
| 给根目录（所有端共用的工程化工具） | `pnpm add -w -D xxx`               | ESLint、Prettier、Husky 这类 |
| 给前端                             | `pnpm -F client add xxx`           | Taro 插件、H5 组件库         |
| 给后端                             | `pnpm -F server add xxx`           | NestJS 中间件、ORM           |
| 给共享包                           | `pnpm -F @mealmuse/shared add xxx` | 跨端通用的类型/工具          |

> ⚠️ **不要在子目录里直接跑 `pnpm install` / `pnpm add`**。仓库装了一个守卫脚本 `scripts/preinstall.js`，**子目录执行包管理命令会直接报错退出**。请统一在仓库根目录执行，或用上面的 `-F` / `-w` 写法。

---

## 怎么把项目跑起来？

### 准备环境（一次性）

**Node.js 20 LTS**（用 nvm 切版本）：

```bash
nvm install 20 && nvm use 20
node -v
```

**pnpm**（用 Node 自带的 Corepack 锁定版本，避免团队版本漂移）：

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm -v
```

### 装依赖

仓库根目录执行一次：

```bash
pnpm install
```

### 启动你想跑的那端

| 命令              | 作用                                   |
| ----------------- | -------------------------------------- |
| `pnpm dev`        | 全部子项目并行启动                     |
| `pnpm dev:h5`     | 只跑前端 H5                            |
| `pnpm dev:weapp`  | 只跑前端微信小程序                     |
| `pnpm dev:server` | 只跑后端（watch 模式，改代码自动重启） |

需要自定义参数时也可以直接进入子项目：

```bash
pnpm -C apps/client dev:h5
pnpm -C apps/server start:dev
```

---

## git commit 时会自动发生什么？

装包时 Husky 钩子会**自动配置好**。提交时会触发两个动作：

### 1) pre-commit：对暂存文件自动 lint + format

工具叫 **lint-staged**，只对**你这次提交**的文件跑，不会动你仓库里没改过的代码。

- `*.{ts,tsx,js,jsx}` → `eslint --fix` + `prettier --write`
- `*.{json,md,yml,yaml}` → `prettier --write`
- `*.less` → `prettier --write`

代码风格会被自动修好，**省得 PR 上来一堆格式 diff**。

### 2) commit-msg：检查提交信息格式

工具叫 **commitlint**，强制提交信息符合 Angular 规范：

```text
<type>(<scope>): <subject>
```

`type` 必须是以下之一（不在表里的会**拒绝提交**）：

| type                                     | 用途                         |
| ---------------------------------------- | ---------------------------- |
| `feat`                                   | 新增功能                     |
| `fix`                                    | 修复缺陷                     |
| `docs`                                   | 文档变更                     |
| `style`                                  | 代码格式（不影响功能）       |
| `refactor`                               | 重构（不修 bug、不加功能）   |
| `perf`                                   | 性能优化                     |
| `test`                                   | 测试相关                     |
| `build`                                  | 构建系统 / 外部依赖变更      |
| `ci`                                     | CI 配置 / 脚本               |
| `chore`                                  | 其他不影响 src / test 的变更 |
| `revert`                                 | 回滚 commit                  |
| `wip` / `workflow` / `types` / `release` | 扩展类型，按需使用           |

`scope` 可选，subject 用祈使句，Header 不超过 108 字符。

示例：

```text
feat(client): 新增首页 Banner 组件
fix(server): 修复启动时端口占用崩溃
docs: 更新 README 安装步骤
```

---

## 代码风格是怎么管的？

仓库用两个工具管代码风格，**只在根目录统一配置**，子项目不维护：

- **ESLint**：检查 JS/TS 代码里的**潜在问题和坏味道**（未使用的变量、不安全的写法等）。除了风格，还能抓**真正的 bug**。
- **Prettier**：**纯格式化工具**，把缩进、引号、换行统一成同一种风格。**不关心代码对错，只关心好不好看**。

### 为什么要用这两个？

- **少吵架**：以前 PR 里一半 diff 在改"该用单引号还是双引号"，现在 Prettier 自动改，**风格不再上 PR**。
- **少 bug**：ESLint 能在写代码时把一些低级错误拦下来（比如未使用的变量、可能为空的对象）。
- **新人友好**：不用纠结"团队习惯是 2 空格还是 4 空格"，工具说了算。

### 为什么要根目录统一，不放在子项目里？

本仓库有 3 个子项目（`apps/client` + `apps/server` + `packages/shared`），如果每个子项目都自己配 ESLint / Prettier：

- ❌ 配置漂移：A 用单引号、B 用双引号，跨项目改代码风格会反复跳。
- ❌ 重复装依赖：每个子项目都得装一遍 ESLint / Prettier。
- ❌ 改风格要改 3 处：以后想调一条规则得在 3 个目录里同步。

**根目录统一之后**：改 1 处 → 3 个子项目同时生效。配置放在根目录的 `.eslintrc.cjs` / `.prettierrc`，`pnpm lint` / `pnpm format` 也都在根目录跑。

---

## 我可能用到的命令

### 根目录

| 命令                                                              | 作用                   |
| ----------------------------------------------------------------- | ---------------------- |
| `pnpm install`                                                    | 装/同步所有子项目依赖  |
| `pnpm dev` / `pnpm dev:h5` / `pnpm dev:weapp` / `pnpm dev:server` | 启动                   |
| `pnpm build`                                                      | 构建所有子项目         |
| `pnpm lint`                                                       | 全仓库 ESLint 检查     |
| `pnpm format`                                                     | 全仓库 Prettier 格式化 |
| `pnpm -F <name> <script>`                                         | 在指定子项目里跑脚本   |

### `apps/client`（Taro）

| 命令                              | 作用           |
| --------------------------------- | -------------- |
| `pnpm -C apps/client dev:h5`      | H5 开发        |
| `pnpm -C apps/client dev:weapp`   | 微信小程序开发 |
| `pnpm -C apps/client build:h5`    | H5 构建        |
| `pnpm -C apps/client build:weapp` | 微信小程序构建 |

### `apps/server`（NestJS）

| 命令                             | 作用           |
| -------------------------------- | -------------- |
| `pnpm -C apps/server start:dev`  | watch 模式启动 |
| `pnpm -C apps/server build`      | 编译           |
| `pnpm -C apps/server start:prod` | 跑构建产物     |
| `pnpm -C apps/server test`       | 单元测试       |

### `packages/shared`

| 命令                             | 作用     |
| -------------------------------- | -------- |
| `pnpm -F @mealmuse/shared build` | 编译     |
| `pnpm -F @mealmuse/shared dev`   | 监听编译 |

---

## 遇到问题怎么办？

### 在子目录跑 `pnpm install` 报错？

正常。`scripts/preinstall.js` 会拦截子目录里的所有包管理命令。

请回到**仓库根目录**执行，或用 `-F` / `-w` 写法：

```bash
pnpm -F client add xxx
pnpm -F server add xxx
pnpm -F @mealmuse/shared add xxx
pnpm add -w -D xxx
```

### 提交时 lint/format 没自动跑？

- 确认跑过 `pnpm install`（会自动初始化 Husky 钩子）
- 确认 `.husky/` 下有 `commit-msg` 和 `pre-commit` 两个文件
- Windows 下确认 `git config core.hooksPath` 输出为 `.husky`

### `pnpm lint` 报错"无法解析 TS"？

确认**根目录**装了 ESLint 8 + `@typescript-eslint/parser` / `@typescript-eslint/eslint-plugin`。**不要在子项目里单独装 ESLint 依赖**（ESLint/Prettier 在仓库是根统一管理的）。

### 改了 `@mealmuse/shared` 后没生效？

`@mealmuse/shared` 引用的是 `dist/` 产物，改完源码要重新编译：

```bash
pnpm -F @mealmuse/shared build
# 或开发期常驻监听
pnpm -F @mealmuse/shared dev
```

### 锁文件冲突 / 出现 `package-lock.json`？

本仓库**只允许 pnpm**，`package-lock.json` / `yarn.lock` 都是误生成的，请删除并重新 `pnpm install`。
