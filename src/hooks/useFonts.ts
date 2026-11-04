import { useEffect, useState } from "react";

export function useFontsReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const faces = [
      '400 16px "Geist Variable"',
      '600 16px "Geist Variable"',
      '400 16px "Noto Sans Variable"',
      '400 40px "Noto Sans Variable"',
      '700 120px "Noto Sans Devanagari Variable"',
      '900 120px "Noto Sans Devanagari Variable"',
      '400 120px "JetBrains Mono Variable"',
      '700 120px "JetBrains Mono Variable"',
      '800 120px "JetBrains Mono Variable"',
      '400 120px "Rozha One"',
      '400 120px "Kalam"',
      '700 120px "Kalam"',
      '400 120px "Yatra One"',
    ];

    Promise.allSettled([
      ...faces.map((font) => document.fonts.load(font)),
      document.fonts.ready,
    ])
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  return ready;
}
