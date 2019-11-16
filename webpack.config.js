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
        loader: "babel-loader",
        enforce: "pre",
        exclude: /node_modules/
      },
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        enforce: "pre",
        exclude: /node_modules/
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
      filename: "main.js",
      path: path.join(__dirname, "dist")
    }
  },
  {
    ...baseConfig,
    entry: "./src/window_background/background.js",
    output: {
      filename: "background.js",
      path: path.join(__dirname, "dist")
    }
  },
  {
    ...baseConfig,
    entry: "./src/window_main/renderer.js",
    output: {
      filename: "renderer.js",
      path: path.join(__dirname, "dist")
    }
  },
  {
    ...baseConfig,
    entry: "./src/overlay/index.tsx",
    output: {
      filename: "overlay.tsx",
      path: path.join(__dirname, "dist")
    }
  }
];
