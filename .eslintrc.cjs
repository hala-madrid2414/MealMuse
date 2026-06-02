module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  overrides: [
    {
      files: ["apps/client/**/*.{js,jsx,ts,tsx}"],
      env: { browser: true, node: false },
    },
    {
      files: ["apps/server/**/*.{js,ts}"],
      env: { node: true, browser: false },
    },
    {
      files: ["**/*.config.{js,cjs,mjs}", "scripts/**/*.{js,cjs}"],
      env: { node: true, browser: false },
      parserOptions: { sourceType: "script" },
      rules: {
        "@typescript-eslint/no-require-imports": "off"
      }
    }
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off"
  }
};
