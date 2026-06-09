import React, { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Home Page Skeleton ── minimal, Apple-style shimmer
const Shimmer = ({ className = '' }: { className?: string }) => (
  <div
    className={`relative overflow-hidden rounded-2xl ${className}`}
    style={{ background: 'rgba(255,255,255,0.04)' }}
  >
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      }}
    />
  </div>
);

export const HomeSkeleton = memo(() => (
  <div className="space-y-4 animate-fade-in">
    <style>{`@keyframes shimmer{100%{transform:translateX(100%)}}`}</style>
    {/* Hero bento */}
    <Shimmer className="h-36 rounded-3xl" />

    {/* Horizontal row */}
    <div>
      <Shimmer className="h-3 w-24 mb-3 rounded-md" />
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[130px]">
            <Shimmer className="w-[130px] h-[130px] rounded-3xl mb-2" />
            <Shimmer className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>

    {/* Grid */}
    <div>
      <Shimmer className="h-3 w-20 mb-3 rounded-md" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Shimmer className="aspect-square rounded-3xl mb-1.5" />
            <Shimmer className="h-3 w-4/5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
));
HomeSkeleton.displayName = 'HomeSkeleton';

// ── Library Page Skeleton ──
export const LibrarySkeleton = memo(() => (
  <div className="space-y-0.5 animate-fade-in">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-3xl">
        <Skeleton className="w-11 h-11 rounded-3xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="w-3/4 h-4 rounded-md" />
          <Skeleton className="w-1/2 h-3 rounded-md mt-1.5" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    ))}
  </div>
));
LibrarySkeleton.displayName = 'LibrarySkeleton';

// ── Library Artists Skeleton ──
export const LibraryArtistsSkeleton = memo(() => (
  <div className="grid grid-cols-3 gap-3 animate-fade-in">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center p-3 rounded-3xl" style={{ background: 'hsl(var(--card) / 0.5)', border: '0.5px solid rgba(255,255,255,0.04)' }}>
        <Skeleton className="w-16 h-16 rounded-full mb-2" />
        <Skeleton className="w-14 h-3 rounded" />
      </div>
    ))}
  </div>
));
LibraryArtistsSkeleton.displayName = 'LibraryArtistsSkeleton';

// ── Search Results Skeleton ──
export const SearchSkeleton = memo(() => (
  <div className="space-y-1 animate-fade-in">
    <div className="flex items-center gap-2 mb-3">
      <Skeleton className="w-4 h-4 rounded-md" />
      <Skeleton className="w-40 h-4 rounded-md" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-3xl">
        <Skeleton className="w-12 h-12 rounded-3xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="w-3/4 h-4 rounded-md" />
          <Skeleton className="w-1/2 h-3 rounded-md mt-1.5" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    ))}
  </div>
));
SearchSkeleton.displayName = 'SearchSkeleton';
