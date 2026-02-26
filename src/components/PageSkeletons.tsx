import React, { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Home Page Skeleton ──
export const HomeSkeleton = memo(() => (
  <div className="space-y-5 animate-fade-in">
    {/* Featured Artists skeleton */}
    <div className="rounded-2xl p-3 pb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Skeleton className="w-5 h-5 rounded-md" />
        <Skeleton className="w-28 h-4 rounded-md" />
      </div>
      <div className="flex gap-2.5 overflow-hidden pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[78px] flex flex-col items-center">
            <Skeleton className="w-[64px] h-[64px] rounded-full mb-2" />
            <Skeleton className="w-14 h-3 rounded" />
            <Skeleton className="w-10 h-2 rounded mt-1" />
          </div>
        ))}
      </div>
    </div>

    {/* Horizontal section skeleton */}
    <div className="rounded-2xl p-3 pb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Skeleton className="w-24 h-4 rounded-md" />
          <Skeleton className="w-16 h-3 rounded-md mt-1" />
        </div>
        <Skeleton className="w-14 h-4 rounded-md" />
      </div>
      <div className="flex gap-2.5 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[130px]">
            <Skeleton className="w-[130px] h-[130px] rounded-xl mb-1.5" />
            <Skeleton className="w-20 h-3 rounded" />
            <Skeleton className="w-14 h-2 rounded mt-1" />
          </div>
        ))}
      </div>
    </div>

    {/* All Songs grid skeleton */}
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Skeleton className="w-20 h-4 rounded-md" />
          <Skeleton className="w-14 h-3 rounded-md mt-1" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-xl mb-1.5" />
            <Skeleton className="w-4/5 h-3 rounded" />
            <Skeleton className="w-3/5 h-2 rounded mt-1" />
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
      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl">
        <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
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
      <div key={i} className="flex flex-col items-center p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
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
    <Skeleton className="w-20 h-4 rounded-md mb-3" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
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
