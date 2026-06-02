# ESLint/Prettier 根统一（pnpm workspace）— Spec

## 1. Summary

- 目标：在 pnpm monorepo（根目录 + `apps/client` + `apps/server` + `packages/shared`）中，把 ESLint/Prettier 统一到根目录；子应用不再维护任何 lint/format 配置与依赖。
- 约束：不改动现有 Husky / commitlint / lint-staged 的行为与配置；不做全量格式化；后续仅改根 `.eslintrc.cjs` 与 `.prettierrc` 即可调整风格。
- 关键决策：采用 **ESLint 8 + `.eslintrc.cjs`（legacy config）**，以兼容当前 `lint-staged` 的 `eslint --fix` 调用方式，并满足“4 个根配置文件”的约束。

## 2. Current State Analysis

### 2.1 Workspace

- Workspace 定义：[pnpm-workspace.yaml](file:///f:/MealMuse/pnpm-workspace.yaml)
  - `apps/*`
  - `packages/*`

### 2.2 Husky / lint-staged（既有，保持不改）

- 根 [package.json](file:///f:/MealMuse/package.json) 已存在：
  - `scripts.prepare = "husky"`
  - `lint-staged` 规则中对 `*.{ts,tsx,js,jsx}` 执行：`eslint --fix` + `prettier --write`

### 2.3 子项目存在多套规范（需清理）

- client：存在 [.eslintrc](file:///f:/MealMuse/apps/client/.eslintrc) + ESLint 相关依赖（`eslint-config-taro` 等）
- server：存在 [eslint.config.mjs](file:///f:/MealMuse/apps/server/eslint.config.mjs)（flat config）+ [.prettierrc](file:///f:/MealMuse/apps/server/.prettierrc) + ESLint/Prettier 相关依赖
- 根目录目前未安装 eslint/prettier 相关依赖，`lint-staged` 实际依赖子项目/间接依赖，存在“配置来源不明确”的风险

## 3. Proposed Changes

### 3.1 根目录：安装最小依赖（可解析 TS/TSX）

在根目录以 workspace 方式安装（`-w`）开发依赖（`-D`）：

- `eslint@8`（固定 8.x，确保 `.eslintrc.cjs` 与 `.eslintignore` 生效）
- `prettier@3`
- `eslint-config-prettier`
- `eslint-plugin-prettier`（本次安装，但默认不启用规则）
- `@typescript-eslint/parser`（必须：否则 eslint 无法解析 `.ts/.tsx`）
- `@typescript-eslint/eslint-plugin`（必须：提供 TS 规则集；本次只启用推荐级别，保持宽松）

安装命令（执行阶段使用）：

```bash
pnpm -w add -D eslint@8 prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

对应修改文件：

- [package.json](file:///f:/MealMuse/package.json)：新增 devDependencies（不改动现有 husky/commitlint/lint-staged 配置块）

### 3.2 根目录：新增 4 个配置文件（后续只改这两份即可调风格）

新增以下 4 个文件（路径与命名固定）：

- `/.eslintrc.cjs`
- `/.eslintignore`
- `/.prettierrc`
- `/.prettierignore`

#### 3.2.1 `.eslintrc.cjs`（宽松、跨端、安全默认）

设计目标：

- 能 lint `apps/client` 的 TS/TSX、`apps/server` 的 TS
- 尽量少规则、少误报；不做框架强绑定（不引入 taro/react 专用规则）
- 不把 prettier 当作 eslint 报错来源（避免 `eslint --fix` 在 prettier 之前执行导致 pre-commit 失败）

建议内容（执行阶段落地时写入）：

```js
module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  overrides: [
    {
      files: ['apps/client/**/*.{js,jsx,ts,tsx}'],
      env: { browser: true, node: false },
    },
    {
      files: ['apps/server/**/*.{js,ts}'],
      env: { node: true, browser: false },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
```

#### 3.2.2 ignore 文件

- `.eslintignore`：忽略构建产物与依赖目录（`dist/`, `build/`, `.temp/`, `node_modules/`, `coverage/` 等）
- `.prettierignore`：与 `.eslintignore` 对齐，避免格式化生成目录/产物

建议内容（执行阶段落地时写入）：

`.eslintignore`：

```text
node_modules
.pnpm-store
dist
build
.temp
coverage
*.min.js
```

`.prettierignore`：

```text
node_modules
.pnpm-store
dist
build
.temp
coverage
```

`.prettierrc`：

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "endOfLine": "auto"
}
```

### 3.3 子应用：删除所有 eslint/prettier 配置文件

删除（如存在则删）：

- `apps/client/.eslintrc*`
- `apps/client/.eslintignore`
- `apps/client/.prettierrc*`
- `apps/client/.prettierignore`
- `apps/server/.eslintrc*`
- `apps/server/.eslintignore`
- `apps/server/.prettierrc*`
- `apps/server/.prettierignore`
- `apps/server/eslint.config.*`（当前为 `eslint.config.mjs`）

### 3.4 子应用：移除 eslint/prettier 相关依赖与脚本

#### 3.4.1 apps/client/package.json

- scripts：移除 `lint` / `format`
- devDependencies：移除 eslint 相关（`eslint`, `eslint-config-taro`, `eslint-plugin-react`, `eslint-plugin-react-hooks`）

#### 3.4.2 apps/server/package.json

- scripts：移除 `lint` / `format`
- devDependencies：移除 eslint/prettier 相关（`eslint`, `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier`, `@eslint/js`, `@eslint/eslintrc`, `globals`, `typescript-eslint`）

### 3.5 根目录 scripts：从 “pnpm -r lint/format” 切到根统一执行

原因：按本次目标，子应用不再提供 `lint/format` 脚本，继续使用 `pnpm -r lint/format` 会失败或跳过。

修改：

- 根 `lint`: `eslint .`
- 根 `format`: `prettier --write .`

不改动：

- husky / commitlint / lint-staged 的配置与钩子逻辑

## 4. Assumptions & Decisions

- 已确认并采纳用户选择：**ESLint 8 + `.eslintrc.cjs`**（满足“4 文件”约束，且不需要修改 `lint-staged` 的 `eslint --fix` 调用方式）
- 为保证 `.ts/.tsx` 可 lint：必须额外安装 `@typescript-eslint/parser` 与 `@typescript-eslint/eslint-plugin`（不属于“风格定制”，属于语法解析必需）
- `eslint-plugin-prettier` 本次仅安装不启用（避免与现有 lint-staged 执行顺序冲突；后续若要启用，可调整 lint-staged 顺序为 prettier 先于 eslint）

## 5. Verification (Acceptance Criteria)

- 子目录：`apps/client`、`apps/server` 内不存在任何 eslint/prettier 配置文件（见 3.3 列表）
- 根目录：新增 4 个文件存在且生效（`.eslintrc.cjs` / `.eslintignore` / `.prettierrc` / `.prettierignore`）
- 依赖：根目录安装 eslint/prettier/ts parser 等依赖成功；子应用不再包含 eslint/prettier 相关依赖
- Husky/commitlint/lint-staged：保持原样；执行 pre-commit 时 `eslint --fix` 与 `prettier --write` 能从根配置读取规则并完成暂存文件处理

---

## 6. Checklist（执行清单）

- [ ] 根目录安装依赖（workspace dev deps）
- [ ] 根目录创建 4 个配置文件
- [ ] 删除 apps/client 的 eslint/prettier 配置文件
- [ ] 删除 apps/server 的 eslint/prettier 配置文件
- [ ] apps/client/package.json 移除 eslint/prettier 依赖与 lint/format scripts
- [ ] apps/server/package.json 移除 eslint/prettier 依赖与 lint/format scripts
- [ ] 根 package.json 调整 lint/format scripts（不改动 lint-staged 配置块）
- [ ] 验证：lint-staged 在根配置下可对暂存文件生效

## 7. Tasks（实施步骤）

1. 编辑根 [package.json](file:///f:/MealMuse/package.json)：补齐根 devDependencies（eslint/prettier/ts parser）
2. 新增根配置文件：`.eslintrc.cjs`、`.eslintignore`、`.prettierrc`、`.prettierignore`
3. 删除子项目配置文件：
   - [apps/client/.eslintrc](file:///f:/MealMuse/apps/client/.eslintrc)
   - [apps/server/eslint.config.mjs](file:///f:/MealMuse/apps/server/eslint.config.mjs)
   - [apps/server/.prettierrc](file:///f:/MealMuse/apps/server/.prettierrc)
4. 编辑子项目 package.json：
   - [apps/client/package.json](file:///f:/MealMuse/apps/client/package.json)
   - [apps/server/package.json](file:///f:/MealMuse/apps/server/package.json)
5. 编辑根 [package.json](file:///f:/MealMuse/package.json) scripts：`lint`/`format` 改为根统一执行
6. 验证：安装依赖、运行 `pnpm lint`、模拟 lint-staged 只对暂存文件执行（不做全量格式化）
