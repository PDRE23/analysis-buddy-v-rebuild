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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/components/analytics/**",
      "src/components/calendar/**",
      "src/components/presentation/**",
      "src/components/mobile/**",
      "src/components/email/**",
      "src/components/templates/**",
      "src/components/collaboration/**",
      "src/components/approvals/**",
      "src/components/tablet/**",
      "src/components/team/**",
      "src/components/deals/File*.tsx",
      "src/components/export/**",
      "src/lib/export/**",
      "src/lib/integrations/**",
      "src/lib/knowledgeGraph.ts",
      "src/lib/presentationGenerator.ts",
      "src/lib/realtime.ts",
      "src/lib/teamAnalytics.ts",
      "src/lib/templates.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
];

export default eslintConfig;
