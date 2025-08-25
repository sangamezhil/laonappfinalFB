
'use client';

import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { useCompanyProfile, CompanyProfile } from '@/lib/data';

// This function can be defined outside the component as it doesn't depend on its state.
const updateTitleAndFavicon = (profile: CompanyProfile) => {
  if (typeof window === 'undefined') return;
  document.title = profile.name || 'LoanTrack Lite';
  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = profile.logoUrl || '/favicon.ico';
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We use the hook to get the initial profile and loaded state
  const { profile, isLoaded } = useCompanyProfile();
  
  useEffect(() => {
    if (isLoaded) {
      updateTitleAndFavicon(profile);
    }
  }, [profile, isLoaded]);

  return (
    <html lang="en">
      <head>
        {/* The initial title can be set here, but it will be overridden by the useEffect */}
        <title>LoanTrack Lite</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
