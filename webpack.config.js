const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const commonConfig = {
    resolve: {
        alias: {
            common: path.resolve(__dirname, 'src/common/'),
            static: path.resolve(__dirname, 'static/')
        }
    },
    mode: 'development',
    devtool: 'cheap-source-map',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                loader: "babel-loader",
                exclude: /node_modules/,
                options: {
                    presets: [["@babel/preset-env", {
                        targets: {
                            electron: "5.0.1",
                        }
                    }],"@babel/react"],
                    plugins: ["@babel/plugin-proposal-class-properties"],
                }
            }
            ,{
                test: /\.(html)$/,
                use: {
                    loader: 'html-loader',
                    // options: {
                    //     name: '[name].[ext]',
                    //     outputPath: (url, resourcePath, context) => {
                    //         console.log(url);
                    //         console.log(resourcePath);
                    //         console.log(context);
                    //         const relativePath = path.relative(context, resourcePath);
                    //         console.log(relativePath);
                    //         return relativePath;
                    //     }
                    //   },
                },
            }
            ,{
                test: /\.(png|jpg|gif|woff|woff2|eot|ttf|svg)$/i,
                use: {
                    loader: 'url-loader',
                    options: {
                    limit: 8192,
                    },
                },
            }
            ,{
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            }
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
        plugins: [
            new CopyPlugin([ { from: 'static', to: 'static' } ]),
        ]
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