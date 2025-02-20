const Dotenv = require('dotenv-webpack');
const path = require('path');

module.exports = {
  mode: 'development', // Change to 'production' when ready
  entry: './script.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Regular expression to test for .js files
        exclude: /node_modules/, // Exclude node_modules directory
        use: {
          loader: 'babel-loader', // Use babel-loader to transpile JavaScript
          options: {
            presets: ['@babel/preset-env'] // Preset for ECMAScript features
          }
        }
      }
    ]
  },
  plugins: [
    new Dotenv() // Load environment variables from .env file
  ],
  resolve: {
    fallback: {
      path: false,
      os: false,
      crypto: false
    }
  }
};
