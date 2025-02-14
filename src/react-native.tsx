import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Actions = {
    push: (to: string) => void;
    back: () => void;
    forward: () => void;
};

export type PageState = "active" | "back" | "forward";

export type PageProps = {
    pageKey: string;
    href: string;
    to: string;
    path: string[];
    searchParams: Record<string, string>;
    state: PageState;
};

type RouterHistory = {
    index: number;
    pages: {
        pageKey: string;
        href: string;
    }[];
};

const defaultPage = {
    pageKey: new Date().toISOString(),
    href: "",
};

const defaultHistory: RouterHistory = {
    index: 0,
    pages: [defaultPage],
};

const defaultRouterContext: RouterHistory & Actions = {
    ...defaultHistory,
    push: () => { },
    back: () => { },
    forward: () => { },
};

const PageContext = createContext(
    getPageProps(defaultPage.pageKey, defaultPage.href, 0, 0),
);

const RouterContext = createContext(defaultRouterContext);

type RouterProvider = {
    onPageChange?: (href: string) => void;
    children: ReactNode;
}

export function RouterProvider({ children, onPageChange }: RouterProvider) {
    const [history, setHistory] = useState(defaultHistory);

    const pageActual = history.pages[history.index];
    useEffect(() => {
        if (onPageChange && pageActual?.href) onPageChange(pageActual.href);
    }, [pageActual?.href]);

    const { push, back, forward } = useMemo(() => {
        const push = (newHref: string) => {
            setHistory((history) => {
                const pageActual = history.pages[history.index];

                if (newHref === pageActual?.href) return history;

                // remove forwarded pages
                const pages = history.pages.slice(history.index);

                const newPage = {
                    pageKey: new Date().toISOString(),
                    href: newHref,
                };

                return {
                    index: 0,
                    pages: [newPage, ...pages],
                };
            });
        };
        const back = () => {
            setHistory((history) => {
                let index = history.index + 1;
                if (index >= history.pages.length) {
                    index = history.pages.length - 1;
                }

                return { ...history, index };
            });
        };
        const forward = () => {
            setHistory((history) => {
                let index = history.index - 1;
                if (index < 0) index = 0;

                return { ...history, index };
            });
        };

        return { push, back, forward };
    }, []);

    return (
        <RouterContext.Provider value={{ ...history, push, back, forward }}>
            {children}
        </RouterContext.Provider>
    );
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
        return (
            <>
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
            </>
        );
    } else {
        const activePage = pages[index];
        const pageProps = getPageProps(
            activePage.pageKey,
            activePage.href,
            index,
            index,
        );

        return (
            <PageContext.Provider value={pageProps}>
                <Page {...pageProps} />
            </PageContext.Provider>
        );
    }
}

export type LinkProps = {
    to: string;
    className?: string;
    children: ReactNode;
};
export function Link({ to, className, children }: LinkProps) {
    const { push } = useContext(RouterContext);

    return (
        <a
            href={to}
            className={className}
            onClick={(e) => {
                e.preventDefault();
                push(to);
            }}
        >
            {children}
        </a>
    );
}

export type RouterHook = PageProps & Actions;

export function useRouter(): RouterHook {
    const { push, back, forward } = useContext(RouterContext);
    const pageProps = useContext(PageContext);

    return { ...pageProps, push, back, forward };
}

function getPageProps(
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
