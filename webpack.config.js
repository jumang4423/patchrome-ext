const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    sidepanel: path.resolve('src/sidepanel/index.tsx'),
    background: path.resolve('src/background.ts'),
    content: path.resolve('src/content.ts')
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icon*.png', to: '[name][ext]' },
        { from: 'src/inject.js', to: 'inject.js' }
      ]
    }),
    new HtmlPlugin({
      template: 'src/sidepanel/index.html',
      filename: 'sidepanel.html',
      chunks: ['sidepanel']
    })
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
};