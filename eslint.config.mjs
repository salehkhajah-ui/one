import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Engine purity: financial code must not import UI layers.
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["react", "react-dom", "next", "next/*"], message: "lib/ must stay framework-free" }] },
      ],
    },
    files: ["lib/**/*.ts"],
  },
];

export default config;
