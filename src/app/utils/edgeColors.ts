// src/app/utils/edgeColors.ts
import type { EdgeType } from '../types/linkedin';

export const EDGE_COLORS: Record<EdgeType | 'default', string> = {
  connection: '#6b7280', // gray-500
  invited: '#0ea5e9', // sky-500
  authored: '#ea580c', // orange-600
  commented: '#16a34a', // green-600
  liked: '#2563eb', // blue-600
  reacted: '#7c3aed', // violet-600
  messaged: '#ef4444', // red-500
  co_company: '#ff1493',
  co_title: '#00ced1',
  default: 'rgba(0,0,0,0.25)',
};

export function edgeColor(t?: EdgeType): string {
  return (t && EDGE_COLORS[t]) || EDGE_COLORS.default;
}

export function edgeWidth(t?: EdgeType): number {
  switch (t) {
    case 'authored':
      return 2.2;
    case 'commented':
      return 1.8;
    case 'liked':
    case 'reacted':
      return 1.2;
    case 'connection':
    case 'invited':
    case 'messaged':
    case 'co_company':
    case 'co_title':
      return 1.4;
    default:
      return 1.0;
  }
}
