import next from "eslint-config-next";

export default [
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
  ...next,
];
