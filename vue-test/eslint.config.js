import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";


export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    ignores: [
      "node_modules",
      ".vscode",
      "dist",
      "*.config.js",
    ],
    rules: {
      semi: "error"
    }
  },
];