// src/app/components/ThemeToggle.tsx
'use client';
import React from 'react';
import { useTheme } from '../hooks/useTheme';

<div className="p-2 rounded border bg-white dark:bg-black text-black dark:text-white">
  Dark probe: this box should flip black/white when you toggle.
</div>

const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];

function labelFor(t: 'system' | 'light' | 'dark') {
  switch (t) {
    case 'dark': return '🌙 Dark';
    case 'light': return '☀️ Light';
    default: return '💻 System';
  }
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const i = order.indexOf(theme as any);
    const next = order[(i + 1) % order.length];
    setTheme(next);
    // tiny visual aid: smooth transition
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setTimeout(() => root.classList.remove('theme-transition'), 170);
  };

  return (
    <button
      onClick={cycle}
      className="px-3 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-700
                 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
      title="Toggle theme (system → light → dark)"
      aria-label="Toggle theme"
    >
      {labelFor(theme as any)}
    </button>
    
  );
}
