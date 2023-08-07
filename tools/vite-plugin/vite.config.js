const { defineConfig} = require('vite');
import { BacktracePlugin } from './lib';

export default defineConfig({
    build: {
        outDir: './viteBuild',
        rollupOptions: {
            input: './src/index.ts',
            output: {
                sourcemap: true,
            }
        }
    },
    plugins: [
        BacktracePlugin()
    ]
})