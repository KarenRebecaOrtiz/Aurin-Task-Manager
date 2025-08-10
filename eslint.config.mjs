import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // React Hooks rules para prevenir re-renders
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      
      // Reglas para prevenir re-renders innecesarios
      "react/jsx-no-bind": "warn",
      "react/jsx-key": "error",
      "react/no-array-index-key": "warn",
      
      // TypeScript estricto
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Reglas de performance
      "react/jsx-no-constructed-context-values": "warn",
      "react/no-unescaped-entities": "warn",
      
      // Reglas de calidad de código
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "warn"
    }
  }
];

export default eslintConfig;
