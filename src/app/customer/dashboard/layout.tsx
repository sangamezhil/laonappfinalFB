
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { useCompanyProfile, Customer } from '@/lib/data'
import { getAvatarColor } from '@/lib/utils'

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const { profile, isLoaded: profileLoaded } = useCompanyProfile();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCustomer = localStorage.getItem('loggedInCustomer');
      if (storedCustomer) {
        setCustomer(JSON.parse(storedCustomer));
      } else {
        router.push('/customer/login');
      }
    }
  }, [router]);
  
  React.useEffect(() => {
    if (profileLoaded && profile.name) {
      document.title = `${profile.name} | Customer Portal`;
    }
  }, [profile, profileLoaded]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInCustomer');
    router.push('/customer/login');
  };

  if (!customer || !profileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
        <header className="flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-2">
                <Logo logoUrl={profile.logoUrl} />
                <span className="text-lg font-semibold font-headline">{profile.name}</span>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                     <Avatar className="w-8 h-8 border">
                        <AvatarFallback className={getAvatarColor(customer.name)}>
                            {customer.name.substring(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline">{customer.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </Button>
            </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
    </>
  )
}
