const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const fixNedbForElectronRenderer = require("./fixNedbForElectronRenderer");
const merge = require("webpack-merge");
const path = require("path");

console.log("__dirname: ", __dirname);

let common_config = {
  node: {
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        enforce: "pre",
        use: [
          {
            options: {
              eslintPath: require.resolve("eslint"),
            },
            loader: require.resolve("eslint-loader"),
          },
        ],
        exclude: /(node_modules|lib)/,
      },
      {
        test: /\.(s[ac]|c)ss$/i,
        use: [
          {
            loader: "@teamsupercell/typings-for-css-modules-loader",
            options: {
              banner: "/* eslint-disable */\n// GENERATED FILE; DO NOT EDIT",
            },
          },
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName:
                  process.env.NODE_ENV == "production"
                    ? "[hash:base64:10]"
                    : "[path][name]_[local]--[hash:base64:5]",
              },
              localsConvention: "camelCase",
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.svg$/,
        use: ["@svgr/webpack"],
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
        exclude: [/node_modules/, path.join(__dirname, "src/ui")],
      },
      {
        test: /\.(woff2|ttf|woff|eot)$/,
        loader: "file-loader",
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
      {
        test: /\.(mp3|png|jpg|jpeg|gif|webm)$/i,
        loader: "file-loader",
      },
    ],
  },
  optimization: {
    namedModules: true,
    namedChunks: true,
    moduleIds: 'named',
    minimize: false,
  },
  resolve: {
    plugins: [fixNedbForElectronRenderer],
    extensions: [
      ".tsx",
      ".ts",
      ".js",
      ".css",
      ".json",
      ".scss",
      ".jpeg",
      ".jpg",
      ".png",
      ".mp3",
      ".svg",
    ],
  },
};

module.exports = common_config;
