# easy-page-router - Simple and Universal JavaScript Routing

easy-page-router is a lightweight and easy-to-use JavaScript routing package that
simplifies navigation in vanilla JavaScript, React, and React Native
applications.

## Key Features:

- **Small and Simple:** Minimalistic design with an intuitive API for quick and
  easy setup __(<1kB)__.
- **Universal:** Works across vanilla JavaScript, React, and React Native,
  making it an ideal choice for various project types.
- **Page Transition Animations:** Enhance user experience with smooth animations
  when transitioning between pages.
- **SSR Support:** Built-in support for Server-Side Rendering (SSR) for improved
  SEO and faster page loads.
- **Easy Integration:** Seamlessly integrates into existing projects.

## Installation

```
npm install easy-page-router
```

## Usage

```js
import { Router, RouterProvider } from "easy-page-router/react";
// or
import { Router, RouterProvider } from "easy-page-router/react-native";

function App() {
    return <RouterProvider>
        <Layout>
            <Router
                renderPage={({ path }) => {
                    if (path.length === 0) {
                        // "/"
                        return <HomePage />;
                    } else if (path[0] === "song" && path[1]) {
                        // "/song/:id"
                        return <SongPage songId={path[1]} />;
                    }
                    return <NotFoundPage />;
                }}
            />
        </Layout>
    </RouterProvider>;
}
```

## Page Transition Animations

The variable state offers the values "active" | "back" | "forward" so it is 
possible to set animations via CSS (react) or Animated (react-native) on change.
All pages remain rendered.

```js
import { Router, RouterProvider } from "easy-page-router/react";

function PageRouter() {
    return <Router
        renderAnimation={Animation}
        renderPage={({ path }) => {
            if (path.length === 0) {
                return <HomePage />;
            } else if (path[0] === "song" && path[1]) {
                return <SongPage songId={path[1]} />;
            }
            return <NotFoundPage />;
        }}
    />;
}

function Animation({ page, state }: RenderAnimationProps) {
    const [newClass, setNewClass] = useState("new");

    useEffect(() => {
        if (state !== "active") setNewClass("");
    }, [state]);

    return <div className={`page-animation ${state} ${newClass}`}>{page}</div>;
}
```
