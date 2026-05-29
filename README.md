# MealMuse

本仓库为 pnpm workspaces Monorepo：

- 前端：Taro（`apps/client`，支持 H5 / 微信小程序）
- 后端：NestJS（`apps/server`）
- 共享：packages（`packages/*`）

## 环境要求

- Node.js：20 LTS（仓库约束：`>=20 <21`）
- pnpm：以根 `package.json` 的 `packageManager` 为准（当前为 `pnpm@10.0.0`）

## 安装 Node.js（nvm）

### Windows：nvm-windows

1. 安装 nvm-windows：<https://github.com/coreybutler/nvm-windows/releases>
2. 安装并切换到 Node 20：

```bash
nvm install 20
nvm use 20
node -v
```

### macOS/Linux：nvm

1. 安装 nvm：<https://github.com/nvm-sh/nvm>
2. 安装并使用 Node 20：

```bash
nvm install 20
nvm use 20
node -v
```

## 安装 pnpm（推荐：Corepack）

Node 20 自带 Corepack，建议用它锁定 pnpm 版本，避免团队 lockfile 漂移：

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm -v
```

## 安装依赖

在仓库根目录执行：

```bash
pnpm -r install
```

## 启动开发环境

### 后端（NestJS）

```bash
pnpm -C apps/server start:dev
```

### 前端（Taro）

H5：

```bash
pnpm -C apps/client dev:h5
```

微信小程序：

```bash
pnpm -C apps/client dev:weapp
```

## 常见问题

### 1) `pnpm dev` 不工作？

根目录脚本当前为：

- `dev`: `pnpm -r --parallel dev`

但子项目脚本命名并不统一为 `dev`（例如前端为 `dev:h5`、后端为 `start:dev`），因此建议按本 README 分别启动。

### 2) 为什么要求只用 pnpm？

本仓库是 pnpm workspaces，混用 npm/yarn 容易造成：

- 锁文件冲突（`package-lock.json` / `yarn.lock`）
- 依赖树不一致导致“在我机器上能跑”的幽灵问题

建议始终使用 pnpm，并保留 `pnpm-lock.yaml` 作为唯一锁文件。
