import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Soft Brutalist typography stack */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: brutalistGlobals }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const brutalistGlobals = `
:root {
  --tk-cream: #F4ECD8;
  --tk-paper: #FFFEF8;
  --tk-ink: #0A0A0A;
  --tk-cobalt: #1E3AFF;
  --tk-tomato: #FF4D2E;
  --tk-mustard: #F4B400;
  --tk-lime: #5BD27D;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--tk-cream);
  color: var(--tk-ink);
  font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Diagonal grain pattern behind the canvas — subtle paper texture */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(10,10,10,0.05) 1px, transparent 0);
  background-size: 14px 14px;
  opacity: 0.55;
}

@media (prefers-color-scheme: dark) {
  html, body {
    background-color: #11100D;
    color: #FAF6EC;
  }
  body::before {
    background-image: radial-gradient(circle at 1px 1px, rgba(250,246,236,0.06) 1px, transparent 0);
  }
}

/* Selection chrome */
::selection {
  background: var(--tk-cobalt);
  color: var(--tk-paper);
}

/* Scrollbars — chunky brutalist */
::-webkit-scrollbar { width: 14px; height: 14px; }
::-webkit-scrollbar-track { background: var(--tk-cream); border-left: 2px solid var(--tk-ink); }
::-webkit-scrollbar-thumb { background: var(--tk-ink); border: 3px solid var(--tk-cream); border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: var(--tk-cobalt); }
`;
