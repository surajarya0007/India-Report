'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PageTransitionTrigger({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    setIsTransitioning(true);
    setShouldRender(true);

    const duration = 1000;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      const cleanup = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(cleanup);
    }, duration);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <>
      {children}
      {shouldRender && (
        <div 
          className={`transition-overlay ${!isTransitioning ? 'fade-out-overlay' : ''}`}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            <div className="logo-box animate-logo-i" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: 'var(--color-ink)', color: 'var(--bg-primary)', fontWeight: 900, fontSize: 28, fontFamily: 'Georgia, serif', borderRadius: 4 }}>I</div>
            <div className="logo-box animate-logo-r" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: 'var(--color-ink)', color: 'var(--bg-primary)', fontWeight: 900, fontSize: 28, fontFamily: 'Georgia, serif', borderRadius: 4 }}>R</div>
          </div>
          <div className="animate-text" style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: 'var(--color-ink)',
          }}>
            INDIA REPORTS
          </div>
          <div style={{
            width: 150,
            height: 2.5,
            background: 'var(--bg-tertiary)',
            borderRadius: 1,
            marginTop: 22,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div className="shimmer-progress-bar" />
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .transition-overlay {
          transition: opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          opacity: 1;
          transform: translateY(0);
        }
        .fade-out-overlay {
          opacity: 0;
          transform: translateY(-24px);
          pointer-events: none;
        }
        .animate-logo-i {
          animation: slideInLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-logo-r {
          animation: slideInRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-text {
          animation: fadeInUpText 0.8s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both, textPulse 1.6s ease-in-out infinite 0.8s;
        }
        .shimmer-progress-bar {
          position: absolute;
          height: 100%;
          width: 50%;
          background: linear-gradient(90deg, #c62828, #1565c0);
          border-radius: 1px;
          animation: shimmerBar 1.6s infinite ease-in-out;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px) rotate(-15deg) scale(0.6); }
          to { opacity: 1; transform: translateX(0) rotate(0) scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px) rotate(15deg) scale(0.6); }
          to { opacity: 1; transform: translateX(0) rotate(0) scale(1); }
        }
        @keyframes fadeInUpText {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes shimmerBar {
          0% { left: -50%; }
          100% { left: 100%; }
        }
      `}} />
    </>
  );
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PageTransitionTrigger>{children}</PageTransitionTrigger>
    </Suspense>
  );
}
