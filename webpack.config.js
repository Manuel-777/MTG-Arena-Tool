const path = require("path");
const nodeExternals = require("webpack-node-externals");
const HtmlWebpackPlugin = require("html-webpack-plugin");

// TODO be sure that "production" is used for npm run dist
const isProduction =
  // eslint-disable-next-line no-undef
  typeof NODE_ENV !== "undefined" && NODE_ENV === "production";
const mode = isProduction ? "production" : "development";
const devtool = isProduction ? false : "inline-source-map";

// https://webpack.js.org/configuration/
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
      },
      {
        test: /\.(scss|css)$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: ["file-loader"]
      }
    ]
  },
  // https://webpack.js.org/configuration/node/#node__dirname
  // https://codeburst.io/use-webpack-with-dirname-correctly-4cad3b265a92
  node: { __dirname: false, __filename: false },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  }
};

module.exports = [
  {
    ...envConfig,
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
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "./src/window_main/index.html")
      })
    ]
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
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "./src/window_background/index.html")
      })
    ]
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
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "./src/overlay/index.html")
      })
    ]
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
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "./src/window_updater/index.html")
      })
    ]
  }
];
