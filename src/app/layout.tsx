
'use client';

import { useEffect } from 'react';
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { useCompanyProfile } from '@/lib/data';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, isLoaded } = useCompanyProfile();

  useEffect(() => {
    if (isLoaded) {
      document.title = profile.name || 'LoanTrack Lite';
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = profile.logoUrl || '/favicon.ico'; // Fallback to a default if no logo
    }
  }, [profile, isLoaded]);

  return (
    <html lang="en">
      <head>
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
