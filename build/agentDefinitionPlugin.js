const webpack = require('webpack');

module.exports = function agentDefinitionPlugin(packageJsonPath) {
    const packageJson = require(packageJsonPath);
    return new webpack.DefinePlugin({
        BACKTRACE_AGENT_NAME: JSON.stringify(packageJson.name),
        BACKTRACE_AGENT_VERSION: JSON.stringify(packageJson.version),
    });
};
