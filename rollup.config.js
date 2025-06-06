import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    format: 'cjs'
  },
  external: ['obsidian'],
  plugins: [
    typescript(),
    resolve({ browser: true }),
    commonjs()
  ]
};
