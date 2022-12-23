import typescript from "@rollup/plugin-typescript";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import {copy} from 'esbuild-plugin-copy'

import json from "@rollup/plugin-json";

export default {
  input: "src/main.ts",
  output: {
    dir: "dist",
    sourcemap: "inline",
    format: "cjs",
    exports: "default",
  },
  external: ["obsidian", "electron"],
  plugins: [
    typescript(),
    nodeResolve({browser: false}),
    commonjs(),
    json(),
    copy({
      // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
      // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
      assets: {
        from: ['./manifest.json'],
        to: ['./'],
      },
    }),
  ],
};
