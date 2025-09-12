// src/app/components/LayOut.tsx
'use client';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';

export default function Layout() {
  const { pathname } = useLocation();
  const isGraph = pathname.startsWith('/graph');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        {/* left-aligned brand/nav; widen here if you want center by using max-w-6xl mx-auto */}
        <div className="w-full px-4 py-3">
          <NavBar />
        </div>
      </header>

      {/* Full-bleed for /graph; comfy centered for others */}
      <main className={`flex-1 w-full px-4 py-6 ${isGraph ? 'max-w-none' : 'max-w-6xl mx-auto'}`}>
        <Outlet />
      </main>
    </div>
  );
}
