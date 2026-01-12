import { defineConfig, loadEnv } from 'vite';
import { BacktracePlugin } from '@backtrace/vite-plugin';

export default defineConfig(({ mode }) => {
    // Load env variables from .env file
    const env = loadEnv(mode, process.cwd(), '');

    return {
        build: {
            sourcemap: true,
        },
        plugins: [
            BacktracePlugin({
                uploadUrl: env.BACKTRACE_UPLOAD_URL,
                uploadOptions: {
                    includeSources: true,
                },
            }),
        ],
    };
});
