// src/app/components/NavBar.tsx
'use client';
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function NavBar() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `uppercase text-sm px-2 py-1 rounded ${
      isActive
        ? 'font-semibold text-blue-600'
        : 'text-gray-600 hover:text-black'
    }`;

  return (
    <nav className='flex items-center gap-6'>
      <NavLink to='/' className='font-semibold text-lg flex items-center gap-2'>
        <span>🦝</span> <span>Constellation</span>
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
      <div className='ml-auto' />
    </nav>
  );
}
