import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

type RouterHistory = {
    index: number;
    pages: {
        pageKey: string;
        href: string;
    }[];
};

export type Actions = {
    push: (to: string) => void;
    back: () => void;
    forward: () => void;
};


const createHref = isReactNative ? "/" : "http://localhost/";
const createPageKey = "default";

const createRouterContext: RouterHistory & Actions = {
    index: 0,
    pages: [{ pageKey: createPageKey, href: createHref }],
    push: () => { },
    back: () => { },
    forward: () => { },
};

const PageContext = createContext(getPageProps(createPageKey, createHref, 0, 0));

const RouterContext = createContext(createRouterContext);



// SSR support. Designed to be loaded with render.
declare var global: any;
function getHref() {
    if (isReactNative) return createHref; // TODO: open app in different state

    if (!global.window) console.error("Error: No default location for SSR!");
    return global.window?.location?.href || createHref;
}

function getDefaultHistory(): RouterHistory {
    return {
        index: 0,
        pages: [{ pageKey: createPageKey, href: getHref() }],
    };
}

export type RouterProviderProps = {
    /* default is 500 ms */
    scrollSpeed?: number,
    scrollAlways?: boolean,
    noScroll?: boolean,
    onPageChange?: (href: string) => void;
    children: ReactNode;
}

export function RouterProvider({
    children, onPageChange,
    scrollSpeed = 500, scrollAlways = false, noScroll = false,
}: RouterProviderProps) {
    const [history, setHistory] = useState(getDefaultHistory());

    const pageActual = history.pages[history.index];
    useEffect(() => {
        if (onPageChange && pageActual?.href) onPageChange(pageActual.href);
    }, [pageActual?.href]);

    const { handleChange, push, back, forward } = useMemo(() => {
        const handleChange = (newHref: string) => {

            setHistory((history) => {
                const pageActual = history.pages[history.index];
                const pageBack = history.pages[history.index + 1];
                const pageForward = history.pages[history.index + 1];

                if (newHref === pageActual?.href) return history;

                !noScroll && scrollAlways && scrollToTop(scrollSpeed);

                if (newHref === pageBack?.href) {
                    return { ...history, index: history.index + 1 };
                }
                if (newHref === pageForward?.href) {
                    return { ...history, index: history.index - 1 };
                }

                // remove forwarded pages
                const pages = history.pages.slice(history.index);

                const newPage = {
                    pageKey: new Date().toISOString(),
                    href: newHref,
                };

                !noScroll && !scrollAlways && scrollToTop(scrollSpeed);

                return {
                    index: 0,
                    pages: [newPage, ...pages],
                };
            });
        };

        const push = (to: string) => {
            if (!isReactNative)
                window.history.pushState({ to }, "", to);

            handleChange(to);
        };
        const back = () => {
            setHistory((history) => {
                let index = history.index + 1;
                if (index >= history.pages.length) {
                    index = history.pages.length - 1;
                }

                !noScroll && scrollAlways && scrollToTop(scrollSpeed);

                return { ...history, index };
            });
        };
        const forward = () => {
            setHistory((history) => {
                let index = history.index - 1;
                if (index < 0) index = 0;

                !noScroll && scrollAlways && scrollToTop(scrollSpeed);

                return { ...history, index };
            });
        };

        return { handleChange, push, back, forward };
    }, [scrollSpeed, scrollAlways, noScroll]);

    // listening browser url change (only for react) 
    useEffect(() => {
        if (isReactNative) return;

        function listener() {
            handleChange(window.location.href);
        }

        window.addEventListener("popstate", listener);
        window.addEventListener("hashchange", listener);

        return () => {
            window.removeEventListener("popstate", listener);
            window.removeEventListener("hashchange", listener);
        };
    }, [handleChange]);

    // for useRouter outside Router
    const actualPageProps = getPageProps(pageActual.pageKey, pageActual.href, history.index, history.index);

    return <RouterContext.Provider value={{ ...history, push, back, forward }}>
        <PageContext.Provider value={actualPageProps}>
            {children}
        </PageContext.Provider>
    </RouterContext.Provider>;
}

export type RenderAnimationProps = PageProps & { page: ReactNode };

export type RouterProps = {
    renderPage: (props: PageProps) => ReactNode;
    renderAnimation?: (props: RenderAnimationProps) => ReactNode;
};

export function Router({ renderPage, renderAnimation }: RouterProps) {
    const { index, pages } = useContext(RouterContext);

    const Page = renderPage;
    const Animation = renderAnimation;

    if (Animation) {
        return <>
            {pages.map((page, i) => {
                const pageProps = getPageProps(
                    page.pageKey,
                    page.href,
                    i,
                    index,
                );

                return (
                    <PageContext.Provider
                        key={page.pageKey}
                        value={pageProps}
                    >
                        <Animation
                            {...pageProps}
                            page={<Page {...pageProps} />}
                        />
                    </PageContext.Provider>
                );
            }).reverse()}
        </>;
    } else {
        const activePage = pages[index];
        const pageProps = getPageProps(activePage.pageKey, activePage.href, index, index);

        return <PageContext.Provider value={pageProps}>
            <Page {...pageProps} />
        </PageContext.Provider>;
    }
}

export type PageState = "active" | "back" | "forward";

export type PageProps = {
    pageKey: string;
    href: string;
    to: string;
    path: string[];
    searchParams: Record<string, string>;
    state: PageState;
};

export function getPageProps(
    pageKey: string,
    href: string,
    index: number,
    actualIndex: number,
): PageProps {
    const url = new URL(href);

    const searchParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => searchParams[key] = value);

    return {
        pageKey,
        href,
        to: url.pathname + url.search,
        path: url.pathname.split("/").map((p) => decodeURIComponent(p)).filter(Boolean),
        searchParams,
        state: index === actualIndex
            ? "active"
            : index > actualIndex
                ? "back"
                : "forward",
    };
}

export type RouterHook = PageProps & Actions;

export function useRouter(): RouterHook {
    const { push, back, forward } = useContext(RouterContext);
    const pageProps = useContext(PageContext);

    return { ...pageProps, push, back, forward };
}


export function scrollToTop(time: number, startScroll?: number, startTime = new Date().getTime()) {
    if (isReactNative) {
        // TODO: implement
    } else {
        if (window.scrollY > 0) {
            if (!startScroll) startScroll = window.scrollY;
            const ratio = (new Date().getTime() - startTime) / time;
            window.scrollTo(0, startScroll * (1 - ratio));
            window.requestAnimationFrame(() => scrollToTop(time, startScroll, startTime));
        }
    }
}
