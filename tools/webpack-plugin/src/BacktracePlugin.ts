import webpack from 'webpack';
import { BacktracePluginV4 } from './BacktracePluginV4';
import { BacktracePluginV5 } from './BacktracePluginV5';

let BacktracePlugin: typeof BacktracePluginV4 | typeof BacktracePluginV5;

const version = process.env.WEBPACK_VERSION ?? webpack.version[0];
switch (version) {
    case '4':
        BacktracePlugin = BacktracePluginV4;
        break;
    case '5':
        BacktracePlugin = BacktracePluginV5;
        break;
    default:
        throw new Error(`Webpack version ${version} is not supported.`);
}

export { BacktracePlugin };
