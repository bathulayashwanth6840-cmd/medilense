'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items = [], className = '' }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  // Filter out redundant initial Dashboard if already present
  const displayItems = items[0]?.label === 'Dashboard' ? items.slice(1) : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs text-slate-500 dark:text-slate-400 mb-6 overflow-x-auto whitespace-nowrap pb-1 ${className}`}
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition font-medium"
      >
        <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Dashboard</span>
      </Link>

      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-300 dark:text-slate-600 shrink-0" />
            {item.href && !isLast && !item.active ? (
              <Link
                href={item.href}
                className="hover:text-teal-600 dark:hover:text-teal-400 transition font-medium truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`font-semibold truncate max-w-[240px] ${
                  isLast || item.active
                    ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-200/50 dark:border-teal-800/40'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
