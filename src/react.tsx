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
    push: () => {},
    back: () => {},
    forward: () => {},
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

export function RouterProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState(getDefaultHistory());

    const { handleChange, push, back, forward } = useMemo(() => {
        const handleChange = () => {
            const newHref = window.location.href;

            setHistory((history) => {
                const pageActual = history.pages[history.index];
                const pageBack = history.pages[history.index + 1];
                const pageForward = history.pages[history.index + 1];

                if (newHref === pageActual?.href) return history;
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

        return { handleChange, push, back, forward };
    }, []);

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
        path: url.pathname.split("/").map((p) => decodeURIComponent(p)).filter(
            Boolean,
        ),
        searchParams,
        state: index === actualIndex
            ? "active"
            : index > actualIndex
            ? "back"
            : "forward",
    };
}
