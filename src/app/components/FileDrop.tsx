// src/app/components/FileDrop.tsx
'use client';
import React, { useCallback, useRef, useState } from 'react';

type Props = {
  onText: (text: string) => Promise<void> | void;
  onFile?: (file: File) => Promise<void> | void; // optional; when provided we'll pass the file to you
  isLoading?: boolean;
  compact?: boolean;
};

export default function FileDrop({
  onText,
  onFile,
  isLoading,
  compact,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const f = e.dataTransfer.files?.[0];
      if (!f) return;

      if (onFile) {
        await onFile(f); // caller decides ZIP vs CSV handling
      } else {
        const t = await f.text(); // CSV text path
        await onText(t);
      }
    },
    [onFile, onText]
  );

  const handleBrowse = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      if (onFile) {
        await onFile(f);
      } else {
        const t = await f.text();
        await onText(t);
      }
      // reset so selecting same file again will retrigger onChange
      e.target.value = '';
    },
    [onFile, onText]
  );

  const boxBase =
    'rounded-2xl border-2 border-dashed transition-colors text-center shadow-sm ' +
    (compact ? 'p-6' : 'p-8');

  const boxTheme = dragOver
    ? 'border-cyan-400/70 bg-cyan-500/10'
    : 'border-white/15 bg-slate-900/40';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`${boxBase} ${boxTheme}`}
      role='region'
      aria-label='File drop zone'
    >
      {/* Icon + helper copy */}
      <div className='text-5xl mb-4 select-none'>📦</div>

      <p className='text-slate-100 font-medium'>
        Drop your LinkedIn export <code className='font-mono'>.zip</code>
      </p>
      <p className='text-sm text-slate-300 mt-1'>
        We’ll auto-extract the files needed for you.
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type='file'
        accept='.zip'
        className='sr-only'
        onChange={handleBrowse}
      />

      {/* Browse button */}
      <div className='mt-5'>
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className='px-4 py-2 rounded-md border border-white/15 bg-slate-800 text-slate-100
                     hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                     disabled:opacity-50'
        >
          Browse…
        </button>
      </div>

      <p className='mt-3 text-xs text-slate-400'>
        Drag &amp; drop a .zip here.
      </p>
    </div>
  );
}
