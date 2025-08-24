
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Landmark,
  ClipboardCheck,
  UserCog,
  LogOut,
  ChevronDown,
  History,
} from 'lucide-react'

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'
import { useUserActivity, useCompanyProfile } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'


const allMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/loans', label: 'Loans', icon: Landmark },
  { href: '/dashboard/collections', label: 'Collections', icon: ClipboardCheck },
  { href: '/dashboard/users', label: 'Users', icon: UserCog },
  { href: '/dashboard/activity', label: 'Activity Log', icon: History },
]

type User = {
  username: string;
  role: string;
}

function DashboardSidebar() {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();
    
    const handleLinkClick = () => {
        setOpenMobile(false);
    }
    
    return (
        <SidebarMenu>
            {allMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
    )

}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const { logActivity } = useUserActivity();
  const { profile, isLoaded: profileLoaded } = useCompanyProfile();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  React.useEffect(() => {
    if (profileLoaded && profile.name) {
      document.title = `${profile.name} | Dashboard`;
    }
  }, [profile, profileLoaded]);

  const handleLogout = () => {
    logActivity('User Logout', `User ${user?.username} logged out.`);
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  if (!user || !profileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="p-4 space-y-4 border rounded-md">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="w-full h-8" />
              <Skeleton className="w-full h-8" />
              <Skeleton className="w-full h-8" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo logoUrl={profile.logoUrl} />
            <span className="text-lg font-semibold font-headline">{profile.name}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <DashboardSidebar />
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenuButton onClick={handleLogout}>
            <LogOut />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b bg-card">
          <SidebarTrigger />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  {profile.logoUrl ? (
                    <AvatarImage src={profile.logoUrl} alt={profile.name} />
                  ) : (
                     <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <span className="hidden md:inline">{user.username}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Company Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
