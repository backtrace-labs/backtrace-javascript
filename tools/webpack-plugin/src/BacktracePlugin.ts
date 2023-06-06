import { BannerPlugin, Compiler, WebpackPluginInstance } from 'webpack';

export class BacktracePlugin implements WebpackPluginInstance {
    public apply(compiler: Compiler) {
        new BannerPlugin({
            banner: '!function(){console.log("test");}()',
            include: /\.(jsx?|tsx?|mjs|cjs)$/,
            raw: true,
            footer: true,
        }).apply(compiler);
    }
}
