'use client';

import { useEffect, useState } from 'react';
import PodiumContent from './PodiumContent';

const STORAGE_KEY = 'phish-sphere-winner-dismissed-v1';

export default function WinnerPodiumModal({ leaderboard, generatedAt }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
      setOpen(true);
    } catch (_) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch (_) {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="winner-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-modal-title"
      onClick={dismiss}
    >
      <div
        className="winner-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="winner-modal-close"
          onClick={dismiss}
          aria-label="Close winner announcement"
        >
          ×
        </button>
        <h1 id="winner-modal-title" className="winner-modal-title">
          We have a winner.
        </h1>
        <PodiumContent leaderboard={leaderboard} generatedAt={generatedAt} />
      </div>
    </div>
  );
}
