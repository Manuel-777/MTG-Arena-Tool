const path = require("path");
const nodeExternals = require("webpack-node-externals");

const isProduction =
  typeof NODE_ENV !== "undefined" && NODE_ENV === "production";
const mode = isProduction ? "production" : "development";
const devtool = isProduction ? false : "inline-source-map";

const baseConfig = {
  target: "node",
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
      }
    ]
  },
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".jsx", ".json"]
  }
};

module.exports = [
  {
    ...baseConfig,
    entry: "./src/main.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      chunkFilename: "[chunkhash].js"
    }
  },
  {
    ...baseConfig,
    entry: "./src/window_background/background.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      chunkFilename: "[chunkhash].js"
    }
  },
  {
    ...baseConfig,
    entry: "./src/window_main/renderer.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      chunkFilename: "[chunkhash].js"
    }
  },
  {
    ...baseConfig,
    entry: "./src/overlay/index.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      chunkFilename: "[chunkhash].js"
    }
  }
];
