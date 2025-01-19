import parser from "@babel/eslint-parser";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    languageOptions: {
      parser,
    },
  },
  eslintConfigPrettier,
];
