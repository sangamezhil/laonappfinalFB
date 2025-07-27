
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
import { useCompanyProfile, Customer } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'

export default function CustomerLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { profile, isLoaded: profileLoaded } = useCompanyProfile();

  useEffect(() => {
    if (profileLoaded && profile.name) {
      document.title = `${profile.name} | Customer Login`;
    }
  }, [profile, profileLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      let customerToLogin: Customer | null = null;
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('customers');
          const storedCustomers: Customer[] = stored ? JSON.parse(stored) : [];
          
          const foundCustomer = storedCustomers.find(
            customer => customer.name === username && customer.idNumber === password
          );

          if (foundCustomer) {
            customerToLogin = foundCustomer;
          }
      }
      
      if (customerToLogin) {
        localStorage.setItem('loggedInCustomer', JSON.stringify(customerToLogin));
        toast({
          title: "Login Successful",
          description: `Welcome back, ${customerToLogin.name}!`,
        })
        router.push('/customer/dashboard')
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
            <CardTitle className="text-2xl font-headline">{profile.name} Customer Portal</CardTitle>
          ) : (
            <Skeleton className="w-48 h-8 mx-auto" />
          )}
          <CardDescription>Enter your credentials to view your loan details.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Full Name</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your full name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Primary ID Number</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your primary ID number"
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
            <Button variant="link" size="sm" onClick={() => router.push('/login')}>
                Staff Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
