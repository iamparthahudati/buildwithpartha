import babelParser from "@babel/eslint-parser";
import presetTypeScript from "@babel/preset-typescript";
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const typeScriptLanguageOptions = {
  parser: babelParser,
  parserOptions: {
    babelOptions: {
      presets: [[presetTypeScript, { allExtensions: true, isTSX: true }]],
    },
    ecmaFeatures: {
      jsx: true,
    },
    requireConfigFile: false,
  },
};

export default [
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**"],
  },
  {
    ...eslint.configs.recommended,
    files: ["**/*.{cjs,js,jsx,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: typeScriptLanguageOptions,
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.flat["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: [
      "eslint.config.mjs",
      "prettier.config.mjs",
      "scripts/**/*.mjs",
      "tests/**/*.mjs",
      "vite.config.ts",
      "vitest.config.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
];
