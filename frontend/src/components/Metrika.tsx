'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import Image from 'next/image';

const YANDEX_METRIKA_ID = 102317479;

export default function YandexMetrika() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.ym =
      window.ym ||
      function (...args: unknown[]) {
        (window.ym.a = window.ym.a || []).push(args);
      };
    window.ym.l = Number(new Date());
    window.ym(YANDEX_METRIKA_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });
  }, []);

  return (
    <>
      <Script
        src="https://mc.yandex.ru/metrika/tag.js"
        strategy="afterInteractive"
      />
      <noscript>
        <div>
          <Image
            src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
            width={1}
            height={1}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
            unoptimized
          />
        </div>
      </noscript>
    </>
  );
}
