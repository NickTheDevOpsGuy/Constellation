'use client';
import React, { useCallback, useRef, useState } from 'react';

type Props = {
  onText: (text: string) => Promise<void> | void;
  onFile?: (file: File) => Promise<void> | void; // use this to handle .zip
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
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;

      if (onFile) {
        await onFile(f); // let the page decide (zip vs csv)
        return;
      }

      const t = await f.text(); // text path for simple CSV
      await onText(t);
    },
    [onFile, onText]
  );

  const handleBrowse = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      if (onFile) {
        await onFile(f);
        return;
      }

      const t = await f.text();
      await onText(t);
    },
    [onFile, onText]
  );

  const border = dragOver
    ? 'border-blue-400 bg-blue-50'
    : 'border-gray-300 bg-white';

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed ${border} transition-colors ${compact ? 'p-6' : 'p-8'} text-center shadow-sm`}
    >
      {/* Icon + helper copy */}
      <div className='text-5xl mb-4'>📦</div>
      <p className='text-gray-900 font-medium'>
        Drop your LinkedIn export <code>.zip</code>
      </p>
      <p className='text-sm text-gray-500 mt-1'>
        We will auto-extract the files needed for you.
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type='file'
        accept='.zip'
        className='hidden'
        onChange={handleBrowse}
      />

      {/* Browse button */}
      <div className='mt-5'>
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className='px-4 py-2 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50'
        >
          Browse…
        </button>
      </div>

      <p className='mt-3 text-xs text-gray-500'>Drag &amp; drop a .zip here.</p>
    </div>
  );
}
