# pnpm Monorepo 工程搭建指引（pnpm-only：Taro + NestJS + shared）

> 面向：**pnpm-only** 的 Monorepo（`apps/client` + `apps/server` + `packages/shared`）  
> 目标：从 0 到 1 搭建一个可复现、可约束、可扩展的工程骨架；**不依赖 Turborepo/Nx 作为主路径**（可选项仅作为补充）。  
> 统一主版本：**Node.js 20 LTS**（仓库统一口径）。  

---

## 0. 总体原则（先读）

- **pnpm-only**：仓库只允许使用 pnpm；禁止 npm/yarn 混用。
- **workspace 边界清晰**：应用在 `apps/*`，可复用能力在 `packages/*`；跨项目复用优先走“包引用”，避免相对路径串联。
- **依赖隔离优先**：默认不依赖隐式提升（hoist），减少“在我机器上能跑”的幽灵依赖问题。
- **工程化与安全默认开启**：提交前自动格式化、lint、commit message 校验、敏感信息拦截；CI 做二次兜底。

---

## 1. 版本要求（Node/pnpm/Git）

### 1.1 Node.js

- 仓库统一：**Node.js 20 LTS**
- 建议：团队统一使用 nvm（Windows 用 nvm-windows）或 Volta，确保所有人 Node 主版本一致。

常见坑/规避：
- 坑：有人用 Node 18/22，导致依赖安装结果/ESLint/Nest 启动行为不一致。  
  规避：在根 `package.json` 加 `engines.node` 并在 CI 校验 Node 版本。

### 1.2 pnpm（强制）

- **最低要求**：pnpm `>= 9`（兼容 Node 20 且生态成熟）
- **推荐锁定**：pnpm `10.x`（以仓库 `packageManager` 为准，团队一致）

建议采用 Corepack（Node 20 自带）锁定 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm -v
```

并在根 `package.json` 固定（示例）：

```json
{
  "packageManager": "pnpm@10.0.0"
}
```

常见坑/规避：
- 坑：没启用 Corepack，团队成员各装各的 pnpm，出现 lockfile 漂移。  
  规避：强制 `packageManager` + CI 中用 `corepack prepare`。
- 坑：用 `npm i` 生成 `package-lock.json`，污染仓库。  
  规避：见“依赖隔离强化（禁止 npm/yarn 混用、锁文件策略、CI 建议）”一节。

### 1.3 Git

- 建议 Git `>= 2.40`（Husky hooks 与跨平台兼容更稳）
- Windows 建议使用 Git for Windows，并确保 `core.autocrlf` 策略统一（见后文常见坑）。

---

## 2. Workspace 规则与目录结构

### 2.1 推荐目录结构（固定口径）

```text
MealMuse/
  apps/
    client/              # Taro 前端（小程序 + H5）
    server/              # NestJS 后端
  packages/
    shared/              # 共享包（类型/常量/工具/Prompt 模板等）
  pnpm-workspace.yaml
  package.json
  pnpm-lock.yaml
  .gitignore
```

### 2.2 pnpm workspace 规则

根 `pnpm-workspace.yaml`（示例）：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Workspace 使用规则（必须遵守）：
- **只能**把“可独立发布/可独立安装”的单元放进 workspace（每个子目录都应有 `package.json`）。
- 跨 workspace 依赖，优先使用 `workspace:` 协议：
  - `workspace:*`：随 workspace 当前版本（适合内部包）
  - `workspace:^`：跟随 semver 主版本策略（适合将来可能发布）

示例（`apps/server/package.json` 依赖 shared）：

```json
{
  "dependencies": {
    "@mealmuse/shared": "workspace:*"
  }
}
```

常见坑/规避：
- 坑：用相对路径 `../../packages/shared/src` 直接引用源码，短期能跑，长期会让构建/发布/类型解析一团糟。  
  规避：把 shared 设计成真正的包（`name` + `exports/types`），应用通过包名引用。
- 坑：workspace pattern 写漏（比如漏掉 `apps/*`），导致 `pnpm -r` 找不到子项目。  
  规避：先用 `pnpm -r list --depth -1` 验证 workspace 生效。

---

## 3. 从 0 到 1：仓库初始化（手把手）

> 说明：本节描述“从空目录开始”如何搭建骨架；如果你已有仓库，也可以只对照补齐缺失项。

### Step 1：初始化 Git 仓库

```bash
git init
```

### Step 2：初始化根 package.json（只管仓库级能力）

```bash
pnpm init
```

根 `package.json` 建议最小化（示例）：

```json
{
  "name": "mealmuse",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": {
    "node": ">=20 <21"
  },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format"
  }
}
```

要点：
- `private: true`：避免误发布根包。
- 根脚本只负责“编排”，真正的 dev/build/lint/format 放在子项目里。

### Step 3：创建 pnpm-workspace.yaml 与目录

创建目录结构：

```bash
mkdir apps packages
mkdir apps/client apps/server packages/shared
```

创建 `pnpm-workspace.yaml`（见上文）。

### Step 4：创建/接入子项目（Taro / NestJS / shared）

#### 4.1 apps/client（Taro）

按你团队既定的 Taro 创建方式执行（示例命令仅供参考）：

```bash
# 示例：用官方脚手架（具体参数以你要的模板为准）
# npx @tarojs/cli init apps/client
```

要求：
- `apps/client/package.json` 的 `name` 推荐：`@mealmuse/client`
- 在 client 内提供脚本（示例）：
  - `dev:h5`、`dev:weapp`、`build:h5`、`build:weapp`
  - `lint`、`format`

#### 4.2 apps/server（NestJS）

按 Nest CLI 创建（示例）：

```bash
# 示例：Nest CLI 初始化（具体命令以 Nest 版本为准）
# npx @nestjs/cli new apps/server
```

要求：
- `apps/server/package.json` 的 `name` 推荐：`@mealmuse/server`
- server 内提供脚本（示例）：
  - `start:dev`、`build`、`start:prod`
  - `lint`、`format`

#### 4.3 packages/shared（共享包）

shared 的定位：
- 放置“前后端共享”的**类型/枚举/常量/纯函数工具/Prompt 模板**等
- 不放运行时敏感配置（尤其不要放任何 Key/连接串）

最低要求：
- `packages/shared/package.json` 有 `name: "@mealmuse/shared"`（建议）
- 给出明确的入口导出（`exports`）与类型入口（`types`）

常见坑/规避：
- 坑：shared 里混入只在后端可用的依赖（比如 `fs`、数据库驱动），导致前端构建失败。  
  规避：shared 默认只放“跨端安全”的代码；如果必须放 Node-only 工具，拆包为 `@mealmuse/shared-node`（不要硬塞到 shared）。

### Step 5：安装依赖（只用 pnpm）

在仓库根执行：

```bash
pnpm install
```

常见坑/规避：
- 坑：在子项目里单独 `npm i` / `yarn`，引入额外 lockfile 和 node_modules。  
  规避：只在根执行 `pnpm install`；CI 强制检查多 lockfile（见后文）。

---

## 4. pnpm 常用工作方式（pnpm-only 编排）

### 4.1 递归执行（全 workspace）

```bash
pnpm -r lint
pnpm -r build
pnpm -r test
```

### 4.2 只跑某个子项目（filter）

```bash
pnpm --filter @mealmuse/client dev:h5
pnpm --filter @mealmuse/client dev:weapp
pnpm --filter @mealmuse/server start:dev
pnpm --filter @mealmuse/shared build
```

### 4.3 常用过滤技巧

- 只跑某目录：

```bash
pnpm --filter "./apps/server" lint
```

- 先安装再跑（CI 常用）：

```bash
pnpm install --frozen-lockfile
pnpm -r build
```

常见坑/规避：
- 坑：不知道 filter 语法，最后用回手工 cd 进子项目执行，导致脚本路径/环境不一致。  
  规避：团队统一用 `--filter` 与 `-r`，减少“上下文漂移”。

---

## 5. Husky + commitlint + lint-staged（逐步配置）

> 目标：在本地提交阶段自动完成：  
> 1) 暂存文件格式化/代码规范检查（lint-staged）  
> 2) 提交信息符合 Conventional Commits（commitlint）  

### Step 1：安装依赖（根安装）

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

### Step 2：启用 husky（prepare 脚本）

在根 `package.json` 添加：

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

初始化 husky：

```bash
pnpm prepare
```

### Step 3：配置 commit-msg 钩子（commitlint）

创建钩子：

```bash
npx husky add .husky/commit-msg "pnpm commitlint --edit $1"
```

添加 `commitlint.config.cjs`（示例）：

```js
module.exports = {
  extends: ["@commitlint/config-conventional"]
}
```

推荐提交类型（团队口径）：
- `feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `build` / `ci`

### Step 4：配置 pre-commit 钩子（lint-staged）

创建钩子：

```bash
npx husky add .husky/pre-commit "pnpm lint-staged"
```

在根 `package.json` 配置 `lint-staged`（示例）：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

常见坑/风险点与规避：
- 坑：Windows 下 Git hooks 不执行（尤其是 GUI 客户端/权限问题）。  
  规避：要求团队统一通过 Git Bash/终端提交；并在“搭建后验证清单”里加一条：故意提交不合规 commit message 验证拦截生效。
- 坑：lint-staged 执行 `eslint` 时找不到配置或找错工作目录。  
  规避：ESLint/Prettier 配置以“根为主”，并确保根的 `eslint`/`prettier` 可在 monorepo 顶层运行（见下一节统一策略）。
- 坑：lint-staged 处理大量文件很慢。  
  规避：只对暂存文件执行；不要在 pre-commit 做全量 build/test（把重任务放到 CI）。

---

## 6. 跨子项目 ESLint + Prettier 统一策略（推荐做法）

> 目标：**一套根规则 + 子项目差异化 override**，避免每个包各玩各的。

### 6.1 统一策略（口径）

- Prettier：统一格式（缩进、引号、行宽等），所有子项目共享一份配置。
- ESLint：统一 TS/JS 基础规则；对 Taro/Nest/Node/React 分别做 override。
- 依赖安装：ESLint/Prettier 相关依赖尽量装在根（便于统一版本），子项目只放必要插件或不放。

### 6.2 推荐配置形态

- ESLint 建议使用 **Flat Config**（`eslint.config.js`），monorepo override 更清晰。
- Prettier 使用 `.prettierrc` 或 `prettier.config.cjs`。

示例：根 `.prettierrc`（仅示例，按团队口味调整）：

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

示例：根 `eslint.config.js` 设计要点（不展开完整代码，避免与依赖版本绑定）：
- 基础：`@eslint/js` + `typescript-eslint`
- React（client）：`eslint-plugin-react` / `eslint-plugin-react-hooks`
- Node（server）：Node 环境 globals、禁用浏览器特有规则
- 文件分组：`apps/client/**/*`、`apps/server/**/*`、`packages/shared/**/*`

### 6.3 VS Code 统一体验建议

建议仓库内约定：
- 保存时格式化（Prettier）
- ESLint 修复与 Prettier 不打架（通常配合 `eslint-config-prettier`）

常见坑/风险点与规避：
- 坑：client 和 server 各自装一套 ESLint/Prettier，版本不一致导致 CI 与本地结果不同。  
  规避：根统一安装与配置；子项目尽量只继承。
- 坑：Taro/小程序构建对某些 ESLint 规则/解析器不兼容。  
  规避：对 `apps/client` 做 override；不要强行把 Node-only 规则套在前端上。

---

## 7. 路径别名与跨包引用兼容（TS + 构建/运行时）

> 目标：在三处保持一致：  
> 1) TypeScript 类型解析（tsconfig paths）  
> 2) NestJS 运行时（dev/ts-node 场景）  
> 3) Taro 打包侧（webpack/vite/rollup 的 alias）  

### 7.1 推荐：优先“包名引用”，其次才是路径别名

优先方式：
- `import { X } from '@mealmuse/shared'`

路径别名的用途：
- 在应用内做更短的内部路径（例如 `@/components/...`）
- 或在过渡期兼容 shared 源码路径（不推荐长期依赖）

### 7.2 shared 包的跨端约束

shared 应满足：
- 产物可被 client/server 正常解析（类型与导出明确）
- 不依赖 Node-only API（除非拆成 Node-only 包）

### 7.3 NestJS：tsconfig paths 在运行时生效

常见方案：
- 开发态：用 `ts-node`/Nest dev 时注册 `tsconfig-paths`
- 生产态：构建后用相对路径/输出目录结构，不再依赖 paths

常见坑/风险点与规避：
- 坑：TypeScript 能通过编译，但 Nest 运行时报 “Cannot find module @xxx/yyy”。  
  规避：确保 dev 启动命令注册了 `tsconfig-paths`（或避免在 server 运行时代码里使用仅 TS 识别的 alias）。

### 7.4 Taro：alias 需同时配置 TS 与构建工具

要求：
- `apps/client/tsconfig.json` 里配置 `paths`
- 同时在 Taro 配置（`config/index.ts`）里配置 alias（以实际构建器为准）

常见坑/风险点与规避：
- 坑：IDE 能跳转，运行/打包找不到模块。  
  规避：TS paths 只解决类型解析，不保证打包侧；必须同步配置构建 alias。

---

## 8. 依赖隔离强化（禁止 npm/yarn 混用、锁文件策略、CI 建议）

### 8.1 禁止 npm/yarn 混用（强制）

仓库规则（口径）：
- 仓库内只允许存在：`pnpm-lock.yaml`
- 发现以下文件必须删除并阻止提交：
  - `package-lock.json`
  - `yarn.lock`
  - `npm-shrinkwrap.json`

建议在根 `.npmrc`（pnpm 同样读取）中开启严格模式（示例）：

```ini
package-manager-strict=true
auto-install-peers=true
strict-peer-dependencies=false
```

说明：
- `package-manager-strict=true`：在很多环境中能直接阻止非 pnpm 的安装行为或给出强提示（具体表现随版本略有差异）。

### 8.2 锁文件策略

- **只提交**根 `pnpm-lock.yaml`
- 子项目不应出现自己的 lockfile
- 升级依赖统一走 PR，避免多人并行修改 lockfile 造成巨大冲突

### 8.3 CI 建议（必做）

最小 CI 策略（以任意 CI 为例）：
- Node 版本：固定 `20.x`
- 启用 Corepack 并锁定 pnpm
- 安装依赖用 `--frozen-lockfile`
- 校验多 lockfile 不存在
- 跑 `pnpm -r lint`、`pnpm -r build`（按项目实际补齐 test）

示例（概念性步骤）：

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
pnpm -r lint
pnpm -r build
```

常见坑/风险点与规避：
- 坑：CI 用 `pnpm install` 没加 `--frozen-lockfile`，导致 CI 自动改 lockfile（等于隐式写入）。  
  规避：CI 强制 `--frozen-lockfile`，并在失败时提示开发者先本地更新 lockfile 再提交。
- 坑：pnpm 默认的依赖提升/布局在某些组合下触发“本地能用，CI 缺依赖”。  
  规避：坚持“每个包声明自己需要的依赖”，不要依赖隐式 hoist；必要时在 pnpm 配置中收紧 node-linker/hoist 策略（按团队实践选定并固化）。

---

## 9. 敏感信息防护（提交阶段拦截 + 规范）

> 目标：在“最容易犯错的提交瞬间”阻止泄露：  
> - `sk\-` 类 Token（OpenAI/DeepSeek/通义等兼容形态）  
> - 数据库/缓存连接串（MongoDB/MySQL/Postgres/Redis 等）  
> - `.env` 文件误暂存  

### 9.1 .env 与 gitignore 规范（必须）

规则（口径）：
- **永远不提交**：任何真实 `.env`（包含 `.env.local`、`.env.*.local` 等）
- **必须提交**：`.env.example`（只包含键名与示例占位符，不包含真实值）
- **应用各自管理**：`apps/client/.env.example`、`apps/server/.env.example`（推荐），避免根 `.env` 承载敏感信息

推荐 `.gitignore` 片段（示例）：

```gitignore
.env
.env.*
!.env.example
!.env.*.example
```

`.env.example` 规范（示例）：

```dotenv
# apps/server/.env.example
LLM_API_KEY=__REPLACE_ME__
LLM_BASE_URL=https://api.example.com
LLM_MODEL=__REPLACE_ME__
MONGODB_URI=__REPLACE_ME__
```

常见坑/规避：
- 坑：把前端可见变量里塞入 Key（即使是 `.env.local` 也会被打包注入）。  
  规避：前端 `.env` 只允许“公开配置”（如 API Base URL、开关、版本号）；任何 Key/密码只在后端环境变量。

### 9.2 提交阶段扫描：推荐两条线（选择其一或并用）

#### 方案 A：使用现成扫描器（推荐）

推荐工具：`gitleaks`（跨平台、规则成熟）或 `trufflehog`。  
做法：在 `pre-commit` 中增加扫描命令，仅扫描暂存区。

##### 方案 A（推荐落地）：gitleaks + `.env*` 暂存阻断（Step-by-step）

**Step 1：安装 gitleaks（任选其一）**

```bash
# 任选其一（Windows 常见）
# winget install -e --id Gitleaks.Gitleaks
# choco install gitleaks
# scoop install gitleaks

gitleaks version
```

**Step 2：添加 gitleaks 配置（含白名单/误报处理的起点）**

建议在仓库根创建 `.gitleaks.toml`（示例，按需调整）：

```toml
[allowlist]
description = "mealmuse allowlist"
paths = [
  '''pnpm-lock.yaml''',
  '''docs/''',
  '''**/*.md'''
]

regexes = [
  # 示例：允许文档里出现 sk\- 作为“占位符/示例”，要求示例明确写 x/REPLACE_ME
  '''sk\\-[xX]{8,}''',
  '''__REPLACE_ME__'''
]
```

要点：
- 默认先对白名单收敛在“文档/锁文件”等误报高发区，避免一上来就逼团队关扫描。
- 真实代码里的 `sk\-`/连接串命中仍应阻断提交。

**Step 3：把扫描接入 husky 的 pre-commit**

将 `.husky/pre-commit` 改为（示例）：

```sh
pnpm lint-staged

# 阻断：任何 .env* 被暂存（跨平台，用 node 执行）
node -e "const {execSync}=require('child_process'); const out=execSync('git diff --cached --name-only',{encoding:'utf8'}); const files=out.split(/\r?\n/).filter(Boolean); const hit=files.filter(f=>/^(?:.*\/)?\.env(\..+)?$/i.test(f)); if(hit.length){ console.error('Blocked: staged .env file(s):\\n'+hit.join('\\n')); process.exit(1);} "

# 扫描：只扫暂存区（推荐 protect --staged）
gitleaks protect --staged --redact --config .gitleaks.toml
```

说明：
- `gitleaks protect --staged`：只扫暂存内容，性能更好，适合挂在提交阶段。
- `.env*` 暂存阻断单独做一条规则：比依赖扫描器规则更确定、可解释。

常见坑/规避：
- 坑：全仓扫描很慢，影响提交体验。  
  规避：只扫描暂存文件（staged），并给出“手动全量扫描”作为补充命令（放 CI 或手工执行）。
- 坑：误报太多导致团队把扫描关掉。  
  规避：先做路径白名单（docs/、md、lockfile），再逐步收紧；严禁用“全局禁用某类规则”一刀切。

#### 方案 B：自定义轻量规则（可控、可解释）

最低应覆盖的规则（建议）：
- `sk\-[A-Za-z0-9]{20,}`（一类常见 Token 形态）
- `mongodb(\+srv)?:\/\/`、`mysql:\/\/`、`postgres(ql)?:\/\/`、`redis:\/\/`
- `password\s*[:=]\s*['"][^'"]+['"]`（仅作为提示，不要过宽）
- 暂存区出现 `.env` / `.pem` / `.key` / `id_rsa` 等文件直接阻断

注意：此方案通常需要一个脚本文件（例如 `scripts/check-secrets.*`）来实现跨平台扫描。你可以把脚本写成 Node.js，确保 Windows/macOS/Linux 一致执行。

### 9.3 误报处理 / 白名单策略（必须写进团队约定）

无论使用方案 A 还是 B，都必须提供“可审计的放行机制”，否则团队会为了赶进度直接把扫描关掉。

推荐白名单策略（按优先级）：
1) **路径白名单**：对确认为安全的路径放行（如 `**/*.snap`、`**/*.lock`、`docs/**` 的代码片段）  
2) **规则白名单**：对某些已知误报的正则做限制（缩小匹配范围，避免全局放行）  
3) **行级放行**：支持在代码行标注 allow（例如 `gitleaks:allow` / `allowlist`），但要求必须附带原因并走 code review

常见坑/规避：
- 坑：为了消除误报，直接把“sk\-”规则整体关掉。  
  规避：优先缩小匹配范围或限定文件类型；确需放行必须在 PR 里解释原因并由他人复核。

---

## 10. 常见坑/风险点清单（集中汇总）

- **多 lockfile 污染**：`package-lock.json` / `yarn.lock` 混入，导致依赖不一致与 CI 失败。  
  规避：仓库规则 + CI 检查 + 代码评审必查。
- **幽灵依赖**：某包没声明依赖却能跑（靠 hoist），换机器/换环境就炸。  
  规避：每个 workspace 显式声明依赖；避免依赖根/其他包的隐式 node_modules。
- **TS paths 与运行时不一致**：IDE 可跳转，运行时报找不到模块。  
  规避：Nest dev 注册 `tsconfig-paths` 或避免运行时依赖 alias；Taro 同步配置构建 alias。
- **shared 混入 Node-only 代码**：前端打包失败或小程序运行报错。  
  规避：shared 只放跨端安全内容；Node-only 单独拆包。
- **Git hooks 不生效**（Windows/GUI 提交）：导致约束形同虚设。  
  规避：在验证清单中强制验证 hooks；必要时 CI 兜底（lint/commit message/secret scan）。
- **.env 误提交**：最常见的真实泄露路径。  
  规避：`.gitignore` + pre-commit 暂存阻断 + `.env.example` 模板化。

---

## 11. 搭建后验证清单（一次性验收）

> 目标：按清单跑完，说明 monorepo、工程化、安全基线都已生效。

### 11.1 环境与工具链

- [ ] `node -v` 显示 `v20.*`
- [ ] `corepack enable` 已启用
- [ ] `pnpm -v` 与根 `packageManager` 一致

### 11.2 Workspace 与依赖

- [ ] 根目录存在 `pnpm-workspace.yaml` 且包含 `apps/*`、`packages/*`
- [ ] 仓库内只存在 `pnpm-lock.yaml`（无 `package-lock.json` / `yarn.lock`）
- [ ] `pnpm install` 在干净环境可一次成功
- [ ] `pnpm -r list --depth -1` 能列出 `@mealmuse/client`、`@mealmuse/server`、`@mealmuse/shared`

### 11.3 脚本编排（pnpm-only）

- [ ] `pnpm --filter @mealmuse/client dev:h5` 可启动
- [ ] `pnpm --filter @mealmuse/server start:dev` 可启动
- [ ] `pnpm -r lint` 可执行（允许部分规则未完善，但流程要通）

### 11.4 ESLint + Prettier

- [ ] 故意写一段不符合格式的代码，`pnpm lint-staged` 能自动修复并通过
- [ ] VS Code 保存时能按 Prettier 格式化（团队一致）

### 11.5 Husky + commitlint + lint-staged

- [ ] 提交信息 `git commit -m "bad message"` 会被 commitlint 拦截
- [ ] 暂存一个 JS/TS 文件的格式化变更，提交时会触发 lint-staged 执行

### 11.6 敏感信息防护

- [ ] 暂存一个 `.env` 文件并尝试提交，会被拦截（或在 CI 被拦截）
- [ ] 在暂存代码中写入类似 `sk`+`-`xxxxxxxxxxxxxxxxxxxxxxxx 并尝试提交，会被拦截（验证后立即撤销该内容）
- [ ] 误报放行机制可用（路径/规则/行级放行至少一种），且团队知道如何使用

### 11.7 CI（建议）

- [ ] CI 固定 Node 20 + Corepack + pnpm
- [ ] CI 使用 `pnpm install --frozen-lockfile`
- [ ] CI 至少跑：`pnpm -r lint`、`pnpm -r build`

---

## 12. 可选增强（非主路径）

- 任务编排：可选引入 Turborepo/Nx，但不应成为“无它不行”的强依赖；主路径仍应保证 `pnpm -r`/`--filter` 可完成 dev/build/lint。
- 变更影响优化：CI 可按变更目录决定只跑相关包（配合 pnpm filter 与 git diff），提高速度。
