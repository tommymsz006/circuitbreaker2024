module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ["module:react-native-dotenv"],
    ["babel-plugin-rewrite-require", {
      "aliases": {
        "web-worker": "node-libs-browser/mock/empty",
      }
    }],
    [
      "search-and-replace",
      {
        "rules": [
          {
            "search": "singleThread: singleThread ? true : false",
            "replace": "singleThread: true"
          },
          {
            "search": "return Buffer.from(str).toString(\"base64\")",
            "replace": "return globalThis.btoa(str);"
          }
        ]
      }
    ]
  ]
};