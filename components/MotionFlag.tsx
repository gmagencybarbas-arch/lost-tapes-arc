'use client';

import { useEffect } from 'react';

export function MotionFlag() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('motion', !reduce);
  }, []);

  return null;
}
