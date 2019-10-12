const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const commonConfig = {
    resolve: {
        alias: {
            common: path.resolve(__dirname, 'src/common/')
        }
    },
    mode: 'development',
    devtool: 'cheap-source-map',
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: "babel-loader",
                options: {
                    presets: ["@babel/react"]
                }
            }
        // ,{
        //     test: /\.(html)$/,
        //     use: {
        //         loader: 'file-loader',
        //         options: {
        //             name: '[name].[ext]',
        //             outputPath: (url, resourcePath, context) => {
        //                 console.log(url);
        //                 console.log(resourcePath);
        //                 console.log(context);
        //                 const relativePath = path.relative(context, resourcePath);
        //                 console.log(relativePath);
        //                 return relativePath;
        //             }
        //           },
        //     },
        // }
        ]
    },
    node: {
        __dirname: false,
    }
}

const webpacks = [
    Object.assign({
        entry: {
            main: './src/main.js'
        },
        target: 'electron-main',
    }, commonConfig),
    Object.assign({
        entry: {
            background: './src/window_background/background.js'
        },
        output: {
            path: path.join(__dirname, 'dist/window_background/'),
        },
        target: 'electron-main',
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/window_background/index.html',
                filename: './index.html'
            }),
        ]
    }, commonConfig),
    Object.assign({
        entry: {
            renderer: './src/window_main/renderer.js'
        },
        output: {
            path: path.join(__dirname, 'dist/window_main'),
        },
        target: 'electron-renderer',
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/window_main/index.html',
                filename: './index.html'
            }),
        ]
    }, commonConfig),
    Object.assign({
        entry: {
            overlay: './src/window_overlay_v3/overlay.js'
        },
        output: {
            path: path.join(__dirname, 'dist/window_overlay_v3'),
        },
        target: 'electron-renderer',
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/window_overlay_v3/index.html',
                filename: './index.html'
            }),
        ]
    }, commonConfig),
    Object.assign({
        entry: {
            updater: './src/window_updater/updater.js'
        },
        output: {
            path: path.join(__dirname, 'dist/window_updater'),
        },
        target: 'electron-renderer',
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/window_updater/index.html',
                filename: './index.html'
            }),
        ]
    }, commonConfig),
];

webpacks.forEach(config => config.output && (config.output.filename = '[name].js'));

module.exports = webpacks;