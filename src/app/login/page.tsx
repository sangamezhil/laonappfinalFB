
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Logo } from '@/components/logo'
import { useUserActivity, useCompanyProfile } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'

// Basic User type to match what's in users/page.tsx
type User = {
    id: string;
    username: string;
    role: string;
    lastLogin: string;
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { logActivity } = useUserActivity();
  const { profile, isLoaded: profileLoaded } = useCompanyProfile();


  useEffect(() => {
    if (profileLoaded && profile.name) {
      document.title = profile.name;
    }
  }, [profile, profileLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Mock authentication that checks localStorage
    setTimeout(() => {
      let userToLogin: User | null = null;
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('users');
          const storedUsers: User[] = stored ? JSON.parse(stored) : [];
          
          const foundUser = storedUsers.find(user => user.username === username);

          // Note: We are not checking password for this mock implementation.
          if (foundUser) {
            userToLogin = foundUser;
          } else if (username === 'admin' && password === 'admin' && storedUsers.find(u => u.username === 'admin') === undefined) {
            // Fallback for initial login if 'admin' doesn't exist yet
            userToLogin = { id: 'USR001', username: 'admin', role: 'Admin', lastLogin: new Date().toISOString() };
          }
      }
      
      if (userToLogin) {
        localStorage.setItem('loggedInUser', JSON.stringify(userToLogin));
        logActivity('User Login', `User ${userToLogin.username} logged in.`);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userToLogin.username}!`,
        })
        router.push('/dashboard')
      }
      else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid username or password.",
        })
        setIsLoading(false)
      }
    }, 1000)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             {profileLoaded ? <Logo logoUrl={profile.logoUrl} /> : <Skeleton className="w-8 h-8 rounded-full" /> }
          </div>
          {profileLoaded ? (
            <CardTitle className="text-2xl font-headline">{profile.name}</CardTitle>
          ) : (
            <Skeleton className="w-48 h-8 mx-auto" />
          )}
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="e.g., admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="e.g., admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Button variant="link" size="sm" onClick={() => router.push('/customer/login')}>
                Are you a customer? Login here
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
