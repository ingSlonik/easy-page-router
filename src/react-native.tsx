import React, { ReactNode, useMemo } from "react";
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from "react-native";

import { useRouter } from ".";

export * from ".";


export type LinkProps = {
    href: string;
    style?: StyleProp<ViewStyle>,
    styleActive?: StyleProp<ViewStyle>,
    children: ReactNode;
    onPress?: (e: GestureResponderEvent) => void;
};
export function Link({ href, style, styleActive, children, onPress }: LinkProps) {
    const { push, href: pageHref } = useRouter();

    const isActive = useMemo(() => {
        const url = new URL(pageHref);
        return url.pathname + url.search === href;
    }, [href, pageHref]);

    return <Pressable
        style={[style, isActive ? styleActive : undefined]}
        onPress={(e) => {
            onPress?.(e);
            push(href);
        }}
    >
        {children}
    </Pressable>;
}
