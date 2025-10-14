// src/app/pages/components/NavBar.tsx
'use client';
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function NavBar() {
  const link = ({ isActive }: { isActive: boolean }) =>
    [
      'uppercase text-xs px-3 py-1 rounded-md transition-colors',
      isActive
        ? 'text-cyan-300 border border-cyan-500/30 bg-cyan-500/10'
        : 'text-slate-300 hover:text-white',
    ].join(' ');

  return (
    <nav className='fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur border-b border-white/10 shadow'>
      <div className='h-14 px-6 flex items-center gap-6'>
        <NavLink
          to='/'
          className='font-semibold text-lg flex items-center gap-2 text-white'
        >
          <span>🌌</span> <span>Constellation</span>
        </NavLink>

        <NavLink to='/' className={link}>
          Import
        </NavLink>
        <NavLink to='/graph' className={link}>
          Graph
        </NavLink>
        <NavLink to='/stats' className={link}>
          Stats
        </NavLink>
      </div>
    </nav>
  );
}
