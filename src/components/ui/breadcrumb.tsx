
"use client";

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

type BreadcrumbItem = {
  label: React.ReactNode;
  href: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn("mb-6", className)}>
      <ol className="flex items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
            {index === items.length - 1 ? (
              <span className="font-semibold text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
