import { useEffect } from 'react';

// Full-screen pages (SOS, the 995 call, the nurse call) colour the whole phone screen: the area
// behind the status bar and any space beside or below the page takes the browser's theme colour
// and the page background, which are the app's off-white by default. This sets both while the
// page is open and puts them back when it closes.
// `top` is the colour at the top of the page (status bar area); `page` fills the rest.
export const SCREEN = { red: '#B83A26', blue: '#7CC7FE', white: '#FFFFFF', canvas: '#F5F3EE' } as const;

export function useScreenColour(top: string, page: string = top): void {
  useEffect(() => {
    const meta = themeMeta();
    const before = { theme: meta.content, html: document.documentElement.style.background, body: document.body.style.background };
    meta.content = top;
    document.documentElement.style.background = page;
    document.body.style.background = page;
    return () => {
      meta.content = before.theme;
      document.documentElement.style.background = before.html;
      document.body.style.background = before.body;
    };
  }, [top, page]);
}

function themeMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = SCREEN.canvas;
    document.head.appendChild(meta);
  }
  return meta;
}
