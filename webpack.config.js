const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
          loader: "html-loader"
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"]
      }
    ]
  },
  target: "electron-renderer",
  devServer: {
    contentBase: "./dist",
    hot: true,
    port: 8082
  },
  //plugins: [new webpack.HotModuleReplacementPlugin()],
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".jsx", ".json"]
  }
};

module.exports = [
  {
    ...defaultConfig,
    target: "electron-main",
    entry: {
      main: "./src/main.js"
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].bundle.js",
      publicPath: __dirname + "/dist/"
    }
  },
  {
    ...defaultConfig,
    entry: {
      window_main: "./src/window_main/renderer.js"
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: path.resolve(__dirname, "./src/window_main/index.html"),
        minify: {
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true
        }
      })
    ],
    output: {
      path: path.resolve(__dirname, "dist", "window_main"),
      filename: "[name].bundle.js",
      publicPath: ""
    }
  },
  {
    ...defaultConfig,
    entry: {
      window_background: "./src/window_background/background.js"
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: path.resolve(__dirname, "./src/window_background/index.html"),
        minify: {
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true
        }
      })
    ],
    output: {
      path: path.resolve(__dirname, "dist", "window_background"),
      filename: "[name].bundle.js",
      publicPath: ""
    }
  },
  {
    ...defaultConfig,
    entry: {
      window_overlay: "./src/overlay/index.tsx"
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: path.resolve(__dirname, "./src/overlay/index.html"),
        minify: {
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true
        }
      })
    ],
    output: {
      path: path.resolve(__dirname, "dist", "overlay"),
      filename: "[name].bundle.js",
      publicPath: ""
    }
  }
];
