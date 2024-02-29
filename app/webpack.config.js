const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
require('dotenv').config();

module.exports = {
    mode: "development",
    entry: "./src/index.ts",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "src"),
    },
    plugins: [
        new NodePolyfillPlugin(),
        new webpack.EnvironmentPlugin(["API_KEY"]),
    ],
};
