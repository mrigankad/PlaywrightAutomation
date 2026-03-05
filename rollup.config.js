import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

const config = [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        outDir: 'dist',
        rootDir: 'src',
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        outDir: 'dist',
        rootDir: 'src',
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [
      dts({
        tsconfig: './tsconfig.json',
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
  // Plugins sub-package - CJS
  {
    input: 'src/plugins/index.ts',
    output: {
      file: 'dist/plugins/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
  // Plugins sub-package - ESM
  {
    input: 'src/plugins/index.ts',
    output: {
      file: 'dist/plugins/index.mjs',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
  // Plugins type definitions
  {
    input: 'src/plugins/index.ts',
    output: {
      file: 'dist/plugins/index.d.ts',
      format: 'esm',
    },
    plugins: [
      dts({
        tsconfig: './tsconfig.json',
      }),
    ],
    external: ['playwright', 'dotenv', 'tesseract.js', 'uuid', 'fs', 'path'],
  },
];

export default config;
