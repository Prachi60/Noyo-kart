import React from 'react';

/**
 * Skeleton Loader for Dashboard Profile Header
 */
export const SkeletonProfileHeader = () => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 animate-pulse">
      {/* Avatar Skeleton */}
      <div className="w-16 h-16 rounded-full bg-gray-200 ds-skeleton shrink-0"></div>
      
      {/* Text Info Skeleton */}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="h-5 w-40 bg-gray-200 ds-skeleton rounded-lg"></div>
        <div className="h-4 w-28 bg-gray-200 ds-skeleton rounded-lg"></div>
      </div>
      
      {/* Right Side Action Skeleton */}
      <div className="w-10 h-10 rounded-xl bg-gray-200 ds-skeleton shrink-0"></div>
    </div>
  );
};

/**
 * Skeleton Loader for Dashboard Stats Grid
 */
export const SkeletonDashboardStats = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-gray-200 ds-skeleton"></div>
            <div className="w-10 h-4 bg-gray-200 ds-skeleton rounded-md"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 bg-gray-200 ds-skeleton rounded"></div>
            <div className="h-6 w-12 bg-gray-200 ds-skeleton rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Loader for List Layouts (e.g. Assigned Jobs, History list)
 */
export const SkeletonList = ({ count = 3, cardHeight = '100px' }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 animate-pulse"
          style={{ minHeight: cardHeight }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200 ds-skeleton shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-gray-200 ds-skeleton rounded"></div>
              <div className="h-3 w-1/2 bg-gray-200 ds-skeleton rounded"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 ds-skeleton rounded-lg"></div>
          </div>
          <div className="h-px bg-gray-100 w-full my-2"></div>
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-gray-200 ds-skeleton rounded"></div>
            <div className="h-3 w-16 bg-gray-200 ds-skeleton rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Card Loader
 */
export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4 animate-pulse ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 ds-skeleton"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-gray-200 ds-skeleton rounded"></div>
          <div className="h-3 w-1/3 bg-gray-200 ds-skeleton rounded"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-200 ds-skeleton rounded"></div>
        <div className="h-3 w-5/6 bg-gray-200 ds-skeleton rounded"></div>
        <div className="h-3 w-2/3 bg-gray-200 ds-skeleton rounded"></div>
      </div>
    </div>
  );
};
