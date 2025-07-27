
'use client';

import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { useCompanyProfile, CompanyProfile } from '@/lib/data';

// This function can be defined outside the component as it doesn't depend on its state.
const updateTitleAndFavicon = (profile: CompanyProfile) => {
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
  const { profile: initialProfile, isLoaded } = useCompanyProfile();
  
  // We use a local state to handle dynamic updates from the storage event
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    // When the component loads, update the profile state
    // with the one from the hook once it's loaded.
     if (isLoaded) {
      setProfile(initialProfile);
    }
  }, [initialProfile, isLoaded]);

  useEffect(() => {
    // This effect runs whenever the profile state changes,
    // ensuring the title and favicon are updated.
    updateTitleAndFavicon(profile);
  }, [profile]);
  
  useEffect(() => {
    // This effect sets up the event listener to catch profile updates
    // from other tabs or components.
    const handleStorageChange = () => {
        const stored = localStorage.getItem('companyProfile');
        if (stored) {
            const newProfile = JSON.parse(stored);
            setProfile(newProfile);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

