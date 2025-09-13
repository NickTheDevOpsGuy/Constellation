'use client';

import { useEffect, useState } from 'react';
import type { GraphDimension } from './GraphCanvas';

export default function GraphDimToggle({
  value,
  onChange,
}: {
  value?: GraphDimension;
  onChange: (dim: GraphDimension) => void;
}) {
  const [dim, setDim] = useState<GraphDimension>(value ?? '2d');

  useEffect(() => {
    if (value) setDim(value);
  }, [value]);

  useEffect(() => {
    // hydrate from localStorage on mount
    try {
      const saved = localStorage.getItem('graph-dimension') as
        | GraphDimension
        | null;
      if (saved === '2d' || saved === '3d') setDim(saved);
    } catch (_err) {
      console.log("Error:" + _err)
    }
  }, []);

  const set = (next: GraphDimension) => {
    setDim(next);
    onChange(next);
    try {
      localStorage.setItem('graph-dimension', next);
    } catch (_err) {
      console.log("Error:" + _err)
    }
  };

  return (
    <div
      className='flex select-none items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white shadow-lg backdrop-blur'
      role='group'
      aria-label='Graph dimension'
    >
      <button
        type='button'
        onClick={() => set('2d')}
        className={`rounded-full px-3 py-1 ${
          dim === '2d' ? 'bg-white text-black' : 'opacity-80 hover:opacity-100'
        }`}
        aria-pressed={dim === '2d'}
      >
        2D
      </button>
      <button
        type='button'
        onClick={() => set('3d')}
        className={`rounded-full px-3 py-1 ${
          dim === '3d' ? 'bg-white text-black' : 'opacity-80 hover:opacity-100'
        }`}
        aria-pressed={dim === '3d'}
      >
        3D
      </button>
    </div>
  );
}