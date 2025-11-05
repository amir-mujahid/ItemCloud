// eslint.config.mjs — ESLint 9 flat config (ESM) while project code stays CommonJS
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",         // you're using CommonJS in index.js
      globals: {
        ...globals.node,            // define require, module, exports, __dirname, etc.
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-console": "off",
    },
    ignores: [
      "node_modules/**",
      "lib/**",
      "dist/**",
      "**/*.d.ts",
    ],
  },
];
