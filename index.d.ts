import * as react from "./react";
import * as reactNative from "./react-native";

declare module "easy-page-router/react" {
    export default react;
}

declare module "easy-page-router/react-native" {
    export default reactNative;
}
