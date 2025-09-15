// src/app/components/Layout.tsx
'use client';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';

export default function Layout() {
  const { pathname } = useLocation();
  const isGraph = pathname.startsWith('/graph');

  return (
    <div className='relative min-h-screen text-slate-100'>
      {/* full-bleed gradient */}
      <div className='pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#0b1220] via-[#0f1a2d] to-[#1a1f3a]' />

      {/* dark translucent header */}
      <header className='sticky top-0 z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur'>
        <div className='w-full max-w-7xl mx-auto px-4 py-3'>
          <NavBar />
        </div>
      </header>

      {/* full-bleed graph; centered content for others */}
      <main
        className={[
          'flex-1 w-full px-4 py-6',
          isGraph ? 'max-w-none' : 'max-w-7xl mx-auto',
        ].join(' ')}
      >
        <Outlet />
      </main>
    </div>
  );
}
