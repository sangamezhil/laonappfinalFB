
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { useCompanyProfile, useFinancials, useUserActivity } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Trash2, IndianRupee } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const companyProfileSchema = z.object({
  name: z.string().min(3, { message: "Company name must be at least 3 characters." }),
  address: z.string().min(10, { message: "Address is too short." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  logoUrl: z.string().optional().or(z.literal('')),
})

const financialsSchema = z.object({
  totalInvestment: z.coerce.number().min(0, { message: "Investment must be a positive number." }).optional(),
  totalExpenses: z.coerce.number().min(0, { message: "Expenses must be a positive number." }).optional(),
})

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>
type FinancialsFormValues = z.infer<typeof financialsSchema>

type User = {
  username: string;
  role: string;
}

export default function CompanyProfilePage() {
  const { profile, updateProfile, isLoaded: profileLoaded } = useCompanyProfile()
  const { financials, updateFinancials, isLoaded: financialsLoaded } = useFinancials()
  const { logActivity } = useUserActivity()
  const { toast } = useToast()
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const profileForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: profile,
  })

  const financialsForm = useForm<FinancialsFormValues>({
    resolver: zodResolver(financialsSchema),
    defaultValues: financials,
  })

  useEffect(() => {
     if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.role !== 'Admin') {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have permission to view this page.'
            });
            router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [router, toast]);
  
  useEffect(() => {
    if (profileLoaded) {
      profileForm.reset(profile)
      if (profile.logoUrl) {
          setLogoPreview(profile.logoUrl)
      }
    }
     if (financialsLoaded) {
      financialsForm.reset(financials)
    }
  }, [profile, financials, profileLoaded, financialsLoaded, profileForm, financialsForm])

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast({ variant: "destructive", title: "Image too large", description: "Please upload an image smaller than 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        profileForm.setValue('logoUrl', dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = () => {
    setLogoPreview(null);
    profileForm.setValue('logoUrl', '', { shouldValidate: true });
    toast({
        title: "Logo Removed",
        description: "The logo has been cleared. Click 'Save' to confirm.",
    });
  }

  function onProfileSubmit(data: CompanyProfileFormValues) {
    const profileData = {
      name: data.name.toUpperCase(),
      address: data.address,
      phone: data.phone,
      email: data.email,
      logoUrl: data.logoUrl,
    };
    
    updateProfile(profileData);

    logActivity('Update Company Profile', 'Updated company profile details.')
    toast({
      title: 'Profile Updated',
      description: 'Your company profile has been successfully updated.',
    })
    
    setTimeout(() => {
        window.location.reload();
    }, 1000)
  }

  function onFinancialsSubmit(data: FinancialsFormValues) {
    const financialData = {
        totalInvestment: data.totalInvestment || 0,
        totalExpenses: data.totalExpenses || 0
    }

    updateFinancials(financialData);

    logActivity('Update Financials', 'Updated financial details.')
    toast({
      title: 'Financials Updated',
      description: 'Your company financial information has been successfully updated.',
    })
  }

  if (!profileLoaded || !financialsLoaded || !user || user.role !== 'Admin') {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
        <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <Card>
            <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Manage your company's information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                            <Input 
                                placeholder="Enter company name" 
                                {...field}
                                value={(field.value ?? '').toUpperCase()}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                            <Input placeholder="10-digit mobile number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="contact@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="address"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Company Address</FormLabel>
                            <FormControl>
                            <Input placeholder="Enter full company address" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormItem className="md:col-span-2 space-y-2">
                        <FormLabel>Company Logo</FormLabel>
                        <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-md border flex items-center justify-center bg-muted/50">
                            {logoPreview ? (
                            <Image src={logoPreview} alt="Logo preview" width={96} height={96} className="object-contain rounded-md" />
                            ) : (
                            <span className="text-xs text-muted-foreground">Preview</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <FormControl>
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Logo
                                <input id="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/gif" onChange={handleLogoChange} />
                                </label>
                            </Button>
                            </FormControl>
                            {logoPreview && (
                                <Button variant="destructive" type="button" onClick={handleDeleteLogo}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Logo
                                </Button>
                            )}
                        </div>
                        </div>
                        <FormDescription>Upload a logo for your company (PNG, JPG, GIF, max 1MB).</FormDescription>
                    </FormItem>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit">Save</Button>
            </CardFooter>
            </Card>
        </form>
        </Form>
        
        <Form {...financialsForm}>
        <form onSubmit={financialsForm.handleSubmit(onFinancialsSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Financials</CardTitle>
                    <CardDescription>Enter total investment and expense figures.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={financialsForm.control}
                            name="totalInvestment"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1">Total Investment <IndianRupee className="w-4 h-4" /></FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="Enter total investment amount" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={financialsForm.control}
                            name="totalExpenses"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1">Total Expenses <IndianRupee className="w-4 h-4" /></FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="Enter total expense amount" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit">Save</Button>
                </CardFooter>
            </Card>
        </form>
        </Form>
    </div>
  )
}
