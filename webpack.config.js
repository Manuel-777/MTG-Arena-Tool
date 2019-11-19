const path = require("path");
const nodeExternals = require("webpack-node-externals");
const CopyPlugin = require("copy-webpack-plugin");

const isProduction =
  // eslint-disable-next-line no-undef
  typeof NODE_ENV !== "undefined" && NODE_ENV === "production";
const mode = isProduction ? "production" : "development";
const devtool = isProduction ? false : "inline-source-map";

const envConfig = {
  mode,
  devtool,
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: /src/,
        loader: "babel-loader"
      },
      {
        test: /\.(ts|tsx)$/,
        include: /src/,
        loader: "ts-loader"
      }
    ]
  },
  node: { __dirname: false, __filename: false },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  }
};

module.exports = [
  {
    ...envConfig,
    plugins: [
      new CopyPlugin([
        { from: "src", to: "", ignore: ["*.js", "*.jsx", "*.ts", "*.tsx"] }
      ])
    ],
    target: "electron-main",
    entry: {
      main: "./src/main.js"
    },
    output: {
      path: path.resolve(__dirname, "lib"),
      filename: "main.js"
    }
  },
  {
    ...envConfig,
    target: "electron-renderer",
    entry: {
      window_main: "./src/window_main/renderer.js"
    },
    output: {
      path: path.resolve(__dirname, "lib", "window_main"),
      filename: "renderer.js"
    }
  },
  {
    ...envConfig,
    target: "electron-renderer",
    entry: {
      window_background: "./src/window_background/background.js"
    },
    output: {
      path: path.resolve(__dirname, "lib", "window_background"),
      filename: "background.js"
    }
  },
  {
    ...envConfig,
    target: "electron-renderer",
    entry: {
      overlay: "./src/overlay/index.tsx"
    },
    output: {
      path: path.resolve(__dirname, "lib", "overlay"),
      filename: "index.js"
    }
  },
  {
    ...envConfig,
    target: "electron-renderer",
    entry: {
      window_updater: "./src/window_updater/updater.js"
    },
    output: {
      path: path.resolve(__dirname, "lib", "window_updater"),
      filename: "updater.js"
    }
  }
];
