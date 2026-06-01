const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const cwd = path.normalize(process.cwd());
const relativePath = path.relative(rootDir, cwd);
const isRoot = !relativePath || relativePath === ".";

const userAgent = process.env.npm_config_user_agent || "";
const execPath = (process.env.npm_execpath || "").toLowerCase();
const isPnpm = userAgent.startsWith("pnpm/") || execPath.includes("pnpm");

if (!isPnpm) {
  console.error("\n✖  本项目使用 pnpm 进行包管理。\n");
  console.error("检测到: " + (userAgent.split("/")[0] || "unknown") + "\n");
  console.error("请使用 pnpm 代替:");
  console.error("  npm install  -> pnpm install");
  console.error("  npm add xxx  -> pnpm add xxx");
  console.error("  npm run dev  -> pnpm dev\n");
  process.exit(1);
}

if (isRoot) {
  process.exit(0);
}

const argvRaw = process.env.npm_config_argv || "";
const argv = JSON.parse(argvRaw).original || [];
const cmd = argv[2] || "";

const dangerous = ["install", "add", "remove", "rm", "uninstall", "update", "up", "upgrade", "link", "import", "rebuild"].some(
  d => cmd === d
);

if (dangerous) {
  console.error("\n✖  禁止在子目录执行包管理命令。\n");
  console.error("当前目录: " + cwd + "\n");
  console.error("请在项目根目录执行，或使用 workspace 过滤:");
  console.error("  pnpm -F client add xxx");
  console.error("  pnpm -F server add xxx");
  console.error("  pnpm -F @mealmuse/shared add xxx\n");
  process.exit(1);
}

process.exit(0);
