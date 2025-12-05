import React, { useEffect, useRef } from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export function PromoBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update CSS custom property for header offset
    const updateOffset = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--promo-banner-height', `${height}px`);
      }
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, []);

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white"
    >
      <a
        href="https://lumical.app"
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-center gap-x-3 text-sm">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">New from RayLabs:</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Calendar className="w-4 h-4" />
            Lumical
          </span>
          <span className="hidden sm:inline text-white/90">
            — Scan meeting invites to your calendar with AI
          </span>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
            Try it free
          </span>
        </div>
      </a>
    </div>
  );
}
