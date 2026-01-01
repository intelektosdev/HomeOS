module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            ["module-resolver", {
                alias: {
                    "react-native-worklets/plugin": "react-native-worklets-core/lib/commonjs/plugin",
                },
            }],
            "react-native-reanimated/plugin",
        ],
    };
};
