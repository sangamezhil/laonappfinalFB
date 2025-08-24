
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
import { useUserActivity, useCompanyProfile, useUsers } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'

type User = {
    id: string;
    username: string;
    role: string;
    lastLogin: string;
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { users } = useUsers()
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

    setTimeout(() => {
      const foundUser = users.find(user => user.username.toLowerCase() === username.toLowerCase() && password === user.username);
      
      if (foundUser) {
        localStorage.setItem('loggedInUser', JSON.stringify(foundUser));
        logActivity('User Login', `User ${foundUser.username} logged in.`);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${foundUser.username}!`,
        })

        if (foundUser.role === 'Admin') {
            router.push('/dashboard')
        } else if (foundUser.role === 'Collection Agent') {
            router.push('/dashboard');
        } else {
            router.push('/dashboard');
        }

      } else {
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
                placeholder="Enter your username"
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
                placeholder="Enter your password"
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
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
