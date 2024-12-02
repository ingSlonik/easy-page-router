import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

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

const createHref = "http://localhost/";
const createPageKey = "default";

const createRouterContext: RouterHistory & Actions = {
    index: 0,
    pages: [{ pageKey: createPageKey, href: createHref }],
    push: () => { },
    back: () => { },
    forward: () => { },
};

// SSR support. Designed to be loaded with render.
function getHref() {
    if (!global.window) console.error("Error: No default location for SSR!");
    return global.window?.location?.href || createHref;
}

function getDefaultHistory(): RouterHistory {
    return {
        index: 0,
        pages: [{ pageKey: createPageKey, href: getHref() }],
    };
}

const PageContext = createContext(
    getPageProps(createPageKey, createHref, 0, 0),
);

const RouterContext = createContext(createRouterContext);

type RouterProvider = {
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
}: RouterProvider) {
    const [history, setHistory] = useState(getDefaultHistory());

    const pageActual = history.pages[history.index];
    useEffect(() => {
        if (onPageChange && pageActual?.href) onPageChange(pageActual.href);
    }, [pageActual?.href]);

    const { handleChange, push, back, forward } = useMemo(() => {
        const handleChange = () => {
            const newHref = window.location.href;

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
            window.history.pushState({ to }, "", to);
            handleChange();
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

    useEffect(() => {
        window.addEventListener("popstate", handleChange);
        window.addEventListener("hashchange", handleChange);

        return () => {
            window.removeEventListener("popstate", handleChange);
            window.removeEventListener("hashchange", handleChange);
        };
    }, [handleChange]);

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
    const page = useContext(PageContext);

    const isActive = page.to === to;

    return <a
        href={to}
        className={(className ?? "") + (isActive ? " active" : "")}
        onClick={(e) => {
            e.preventDefault();
            push(to);
        }}
    >
        {children}
    </a>;
}

export type RouterHook = PageProps & Actions;

export function useRouter(): RouterHook {
    const { push, back, forward } = useContext(RouterContext);
    const pageProps = useContext(PageContext);

    return { ...pageProps, push, back, forward };
}

export function useTitle(title: string) {
    const { state } = useContext(PageContext);

    useEffect(() => {
        if (state === "active") {
            document.title = title;
        }
    }, [state, title]);
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

function scrollToTop(time: number, startScroll = window.scrollY, startTime = new Date().getTime()) {
    if (window.scrollY > 0) {
        const ratio = (new Date().getTime() - startTime) / time;
        window.scrollTo(0, startScroll * (1 - ratio));
        window.requestAnimationFrame(() => scrollToTop(time, startScroll, startTime));
    }
}