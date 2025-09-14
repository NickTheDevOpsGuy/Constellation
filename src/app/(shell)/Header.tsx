'use client';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className='sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/75 backdrop-blur'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between'>
        <nav className='flex items-center gap-4 text-sm'>
          <Link href='/' className='font-semibold hover:underline'>
            Constellation
          </Link>
          <Link
            href='/graph'
            className='text-slate-600 dark:text-slate-300 hover:underline'
          >
            Graph
          </Link>
          <Link
            href='/stats'
            className='text-slate-600 dark:text-slate-300 hover:underline'
          >
            Stats
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
