import parser from "@babel/eslint-parser";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    languageOptions: {
      parser,
    },
    ...eslintPluginPrettierRecommended,
  },
];
