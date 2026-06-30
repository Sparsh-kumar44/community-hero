import React from 'react';

export function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
      <div className="h-48 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl mb-4"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-1"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-4"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-24"></div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white border border-slate-250 dark:bg-slate-900 dark:border-slate-800 p-6 rounded-3xl">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start space-x-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
