import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import markdown from "@eslint/markdown";

export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^next|^req|^res" }],
      "no-console": "off",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
        io: "readonly",
      },
    },
  },
  {
    files: ["**/*.json", "**/*.jsonc", "**/*.json5"],
    plugins: { json },
    rules: {
      ...json.configs.recommended.rules,
    },
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    rules: {
      ...markdown.configs.recommended.rules,
    },
  },
  {
    ignores: ["node_modules/", "dist/", "src/generated/"],
  },
];
