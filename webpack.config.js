const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
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
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true
                },
                target: 'es2020',
                transform: {
                  react: {
                    runtime: 'classic',
                    pragma: 'React.createElement',
                    pragmaFrag: 'React.Fragment'
                  }
                }
              },
              module: {
                type: 'es6'
              }
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
      extensions: ['.tsx', '.ts', '.js'],
      // Add caching for module resolution
      cache: true
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'icon*.png', to: '[name][ext]' },
          { from: 'logo.png', to: 'logo.png' },
          { from: 'jumango.gif', to: 'jumango.gif' },
          { from: 'src/inject.js', to: 'inject.js' },
          { from: 'src/worklets/spectral-gate-processor.js', to: 'src/worklets/spectral-gate-processor.js' },
          { from: 'src/worklets/spectral-compressor-processor.js', to: 'src/worklets/spectral-compressor-processor.js' }
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
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            },
            format: {
              comments: false
            }
          },
          extractComments: false,
          parallel: true
        })
      ],
      splitChunks: {
        chunks: 'all'
      }
    },
    // Disable source maps in production for faster builds
    devtool: isProduction ? false : 'eval-source-map',
    // Enable caching
    cache: {
      type: 'filesystem',
      allowCollectingMemory: true,
      buildDependencies: {
        config: [__filename]
      }
    },
    // Performance hints
    performance: {
      hints: false
    }
  };
};