import React, { ReactNode, useEffect, useMemo } from "react";

import { useRouter } from ".";

export * from ".";


export type LinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};
export function Link({ href, className = "", children, onClick }: LinkProps) {
    const { push, href: pageHref } = useRouter();

    const isActive = useMemo(() => {
        const url = new URL(pageHref);
        return url.pathname + url.search === href;
    }, [href, pageHref]);

    return <a
        href={href}
        className={className + (isActive ? " active" : "")}
        onClick={(e) => {
            e.preventDefault();
            onClick?.(e);
            push(href);
        }}
    >
        {children}
    </a>;
}

export function useTitle(title: string) {
    const { state } = useRouter();

    useEffect(() => {
        if (state === "active") {
            document.title = title;
        }
    }, [state, title]);
}
