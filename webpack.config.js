const path = require("path");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    entry: {
        'dev-tools': './dev-tools.ts',
        'dev-tools.min': './dev-tools.ts',
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    mode: 'development',
    devtool: 'source-map',
    devServer: {
        static: '.',
    },
    resolve: {
        fallback: {
            fs: false
        },
        extensions: [".ts", ".js"],
    },
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "dist"),
        library: ["ex", "DevTools"],
        libraryTarget: "umd"
    },
    optimization: {
        minimize: true,
    },
    externals: {
        "excalibur": {
            commonjs: "excalibur",
            commonjs2: "excalibur",
            amd: "excalibur",
            root: "ex"
        }
    },
    plugins: [
        //  new BundleAnalyzerPlugin()
    ]
};