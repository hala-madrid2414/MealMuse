# 技术选型与架构文档定稿 + pnpm Monorepo 搭建指引 Spec

## Why
现有《技术选型与架构文档》由智能体草拟，内容存在可维护性不足、部分前后逻辑冲突与不符合工程最佳实践之处，需要结合最新需求草稿完成定稿，并补齐可落地的工程搭建指引。

## What Changes
- 对 [技术选型与架构文档 (1).md](file:///f:/MealMuse/技术选型与架构文档%20(1).md) 做全面复核与修订，形成“正式版”内容（保留文件名，直接在原文上修订）。
- 补齐并统一：技术栈版本锁定策略、架构分层边界、可扩展性设计、性能与可靠性指标、工程化与安全基线。
- **新增**一份独立的《pnpm monorepo 工程搭建指引》（手把手步骤），面向 “Taro 前端 + NestJS 后端 + shared 共享包” 的组合。
- **BREAKING**：移除/改写现文档中与需求相冲突或不符合最佳实践的建议（例如“无需 commitlint / 可直接推 main / 共享根 .env 存放敏感变量”等）。

## Impact
- Affected specs: 文档交付质量（技术选型与架构定稿、工程化落地指引、安全与合规基线）
- Affected code: 不涉及任何功能性代码的编写或生成；仅修改/新增 Markdown 文档
  - 直接修订：[技术选型与架构文档 (1).md](file:///f:/MealMuse/技术选型与架构文档%20(1).md)
  - 新增文档（拟定路径）：`f:\MealMuse\pnpm-monorepo工程搭建指引.md`

## ADDED Requirements
### Requirement: 技术选型与架构文档定稿
系统 SHALL 输出一份与项目需求草稿完全对齐、内部一致、可长期维护的《技术选型与架构文档》，并覆盖以下维度：
- 技术栈兼容性验证（Taro/NestJS/Node/pnpm/TypeScript 版本与边界）
- 架构分层合理性（前端/后端/共享包/数据层/可观测性与安全）
- 可扩展性设计补全（P0→P1→P2 的演进边界与替换点）
- 性能与可靠性指标匹配度确认（LLM 延迟、缓存策略、超时/重试/降级、限流）
- 安全基线（密钥管理、最小权限、日志脱敏、敏感信息提交流程拦截）

#### Scenario: 成功定稿
- **WHEN** 对现有架构文档进行结构化复核并按需求草稿修订
- **THEN** 文档中不再出现前后冲突的结论/建议
- **AND** 文档中的工程化与安全策略与“pnpm monorepo 搭建指引”一致

### Requirement: pnpm monorepo 工程搭建指引（pnpm-only）
系统 SHALL 新增一份《pnpm monorepo 工程搭建指引》，满足：
- 以 pnpm workspaces 为核心，不依赖 Turborepo/Nx 作为必选编排器（可选项可提及但不作为主路径）
- 覆盖从仓库初始化到工程化配置的全流程，并提供风险点/常见坑的预防性说明
- 至少包含：环境准备、目录结构规划、workspace 规则、Git 工作流（husky/commitlint）、代码规范统一（ESLint/Prettier）、路径别名、依赖隔离与防混用、安全与敏感信息防护（含 commit 阶段拦截规则）、搭建后验证清单

#### Scenario: 新仓库搭建可复现
- **WHEN** 按指引从零初始化仓库并完成配置
- **THEN** 能在一次性校验清单中通过所有检查（lint/format/commit 校验/依赖隔离/别名可用/敏感信息拦截可触发）

## MODIFIED Requirements
### Requirement: 工程化规范（来自现有草稿的修订）
系统 SHALL 采用可执行的 Git 工作流与提交规范配置（husky + commitlint + lint-staged），不得以“口头约定”替代可自动化校验。

## REMOVED Requirements
### Requirement: “共享根 .env 存放敏感变量”
**Reason**：该做法容易导致误提交与范围扩散（前端/共享包读取风险），不符合最小暴露面与最小权限原则。  
**Migration**：改为“各应用独立 `.env` + `.env.example` 模板 + 根目录仅放非敏感公共配置（可选）”，并在提交阶段做拦截与扫描。  
