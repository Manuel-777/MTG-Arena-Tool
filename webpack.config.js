const path = require("path");
const webpack = require('webpack');
const nodeExternals = require("webpack-node-externals");

const isProduction =
  typeof NODE_ENV !== "undefined" && NODE_ENV === "production";
const mode = isProduction ? "production" : "development";
const devtool = isProduction ? false : "inline-source-map";

const defaultConfig = {
  mode,
  devtool,
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: "ts-loader"
      },
      {
        test: /\.(html)$/,
        use: {
          loader: "html-loader",
          options: {
            attrs: ["':data-src"]
          }
        }
      }
    ]
  },
  target: "electron-renderer",
  devServer: {
    contentBase: "./dist",
    hot: true,
    port: 8082
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".jsx", ".json"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    publicPath: "/"
  }
};

module.exports = [
  {
    ...defaultConfig,
    entry: {
      main: "./src/window_main/renderer.js"
    }
  },
  {
    ...defaultConfig,
    entry: {
      background: "./src/window_background/background.js"
    }
  }
]