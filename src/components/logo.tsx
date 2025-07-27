
import React from 'react';
import Image from 'next/image';

export function Logo({ className, logoUrl }: { className?: string, logoUrl?: string | null }) {
  if (logoUrl) {
    // Using a wrapper div to constrain the image, as Next.js Image component needs a sized parent
    // or direct width/height props to avoid layout shift.
    // The `w-8 h-8` matches the typical size of the SVG.
    return (
      <div className={className || 'w-8 h-8 relative'}>
         <Image 
            src={logoUrl} 
            alt="Company Logo"
            fill
            sizes="32px"
            className="object-contain" 
        />
      </div>
    )
  }

  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App Logo"
    >
      <path
        d="M16 3.5L3.5 10L16 16.5L28.5 10L16 3.5Z"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 22L16 28.5L28.5 22"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 16L16 22.5L28.5 16"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
