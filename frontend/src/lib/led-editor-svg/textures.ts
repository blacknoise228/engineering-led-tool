// src/lib/led-editor-svg/textures.ts

export interface TextureItem {
  id: string;
  name: string;
  url: string;
  color: string;
}

export const TEXTURES: TextureItem[] = [
  { id: 'quad_01', name: 'Blue',        url: '/quad_01.png',  color: '#0284c7' },
  { id: 'quad_02', name: 'Green',       url: '/quad_02.png',  color: '#22c55e' },
  { id: 'quad_03', name: 'Yellow',      url: '/quad_03.png',  color: '#eab308' },
  { id: 'quad_04', name: 'Orange',      url: '/quad_04.png',  color: '#f97316' },
  { id: 'quad_05', name: 'Purple',      url: '/quad_05.png',  color: '#a855f7' },
  { id: 'quad_06', name: 'Cyan',        url: '/quad_06.png',  color: '#06b6d4' },
  { id: 'quad_07', name: 'Magenta',     url: '/quad_07.png',  color: '#ec4899' },
  { id: 'quad_08', name: 'Red-Orange',  url: '/quad_08.png',  color: '#ef4444' },
  { id: 'quad_09', name: 'Pink',        url: '/quad_09.png',  color: '#f43f5e' },
  { id: 'quad_10', name: 'Ultramarine', url: '/quad_10.png',  color: '#3b82f6' },
  { id: 'quad_11', name: 'Gold',        url: '/quad_11.png',  color: '#f59e0b' },
  { id: 'quad_12', name: 'Lavender',    url: '/quad_12.png',  color: '#8b5cf6' },
];

export function getTextureById(id?: string): TextureItem {
  return TEXTURES.find(t => t.id === id) ?? TEXTURES[0];
}
