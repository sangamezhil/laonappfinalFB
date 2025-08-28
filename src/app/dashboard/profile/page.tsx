
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { useCompanyProfile, useFinancials, useUserActivity, Expense, Investment } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, Trash2, IndianRupee, Edit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';


const companyProfileSchema = z.object({
  name: z.string().min(3, { message: "Company name must be at least 3 characters." }),
  address: z.string().min(10, { message: "Address is too short." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone number must be 10 digits." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  logoUrl: z.string().optional().or(z.literal('')),
})

const investmentSchema = z.object({
    description: z.string().min(3, 'Description is required.'),
    amount: z.coerce.number().positive('Amount must be a positive number.'),
})

const expenseSchema = z.object({
  description: z.string().min(3, 'Description is required.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
})


type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>
type InvestmentFormValues = z.infer<typeof investmentSchema>
type ExpenseFormValues = z.infer<typeof expenseSchema>

type User = {
  username: string;
  role: string;
}

export default function CompanyProfilePage() {
  const { profile, updateProfile, isLoaded: profileLoaded } = useCompanyProfile()
  const { financials, addInvestment, addExpense, deleteExpense, isLoaded: financialsLoaded } = useFinancials()
  const { logActivity } = useUserActivity()
  const { toast } = useToast()
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [investmentToConfirm, setInvestmentToConfirm] = useState<InvestmentFormValues | null>(null);

  const profileForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: profile,
  })

  const investmentForm = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: { description: '', amount: undefined }
  })
  
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: '', amount: undefined }
  })
  
  const totalInvestments = (financials.investments || []).reduce((sum, inv) => sum + inv.amount, 0);
  const totalExpenses = (financials.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);

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
  }, [profile, profileLoaded, profileForm, financials, financialsLoaded])


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
  
  function onAttemptInvestmentSubmit(data: InvestmentFormValues) {
    setInvestmentToConfirm(data);
  }

  function handleConfirmInvestment() {
    if(!investmentToConfirm) return;
    addInvestment(investmentToConfirm.description, investmentToConfirm.amount);
    logActivity('Add Investment', `Added investment: ${investmentToConfirm.description} - ${investmentToConfirm.amount.toLocaleString('en-IN')}`);
    toast({ title: 'Investment Added', description: `${investmentToConfirm.description} has been added.`});
    investmentForm.reset();
    setInvestmentToConfirm(null);
  }

  function onAddExpense(data: ExpenseFormValues) {
    addExpense(data.description, data.amount);
    logActivity('Add Expense', `Added expense: ${data.description} - ${data.amount.toLocaleString('en-IN')}`);
    toast({ title: 'Expense Added', description: `${data.description} has been added to expenses.`});
    expenseForm.reset();
  }

  const handleDeleteExpense = () => {
    if(!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    logActivity('Delete Expense', `Deleted expense: ${expenseToDelete.description}`);
    toast({ title: 'Expense Deleted', description: `${expenseToDelete.description} has been removed.`});
    setExpenseToDelete(null);
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
                        <FormMessage />
                    </FormItem>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button type="submit">Save</Button>
            </CardFooter>
            </Card>
        </form>
        </Form>
        
        <Card>
            <CardHeader>
                <CardTitle>Financials</CardTitle>
                <CardDescription>Manage investment and expense records.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Investments Section */}
                    <div className="space-y-6">
                        <Form {...investmentForm}>
                            <form onSubmit={investmentForm.handleSubmit(onAttemptInvestmentSubmit)} className="space-y-4">
                                <h3 className="text-lg font-medium">Log Investment</h3>
                                <FormField
                                    control={investmentForm.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Investment Description</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g., Initial Capital, Personal Funds" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={investmentForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1">Amount <IndianRupee className="w-4 h-4" /></FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="Enter amount" {...field} value={field.value ?? ''}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit">Add Investment</Button>
                                </div>
                            </form>
                        </Form>
                         <div className="pt-6 border-t">
                            <h3 className="text-lg font-medium mb-2">Investment History</h3>
                            <div className="flex items-baseline justify-between p-2 mb-4 rounded-lg bg-secondary">
                                <p className="text-sm font-medium">Total Investments:</p>
                                <p className="text-lg font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{totalInvestments.toLocaleString('en-IN')}</p>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(financials.investments || []).length > 0 ? (
                                        (financials.investments || []).map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>{format(new Date(inv.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell>{inv.description}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-1"><IndianRupee className="w-4 h-4"/>{inv.amount.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No investments recorded yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                     </div>

                     {/* Expenses Section */}
                     <div className="space-y-6">
                        <Form {...expenseForm}>
                            <form onSubmit={expenseForm.handleSubmit(onAddExpense)} className="space-y-4">
                                <h3 className="text-lg font-medium">Log Expense</h3>
                                <FormField
                                    control={expenseForm.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expense Description</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g., Office Rent, Salaries" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={expenseForm.control}
                                    name="amount"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1">Amount <IndianRupee className="w-4 h-4" /></FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="Enter amount" {...field} value={field.value ?? ''}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit">Add Expense</Button>
                                </div>
                            </form>
                        </Form>
                        <div className="pt-6 border-t">
                            <h3 className="text-lg font-medium mb-2">Expense History</h3>
                            <div className="flex items-baseline justify-between p-2 mb-4 rounded-lg bg-secondary">
                                <p className="text-sm font-medium">Running Total Expenses:</p>
                                <p className="text-lg font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{totalExpenses.toLocaleString('en-IN')}</p>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(financials.expenses || []).length > 0 ? (
                                        (financials.expenses || []).map(exp => (
                                            <TableRow key={exp.id}>
                                                <TableCell>{format(new Date(exp.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell>{exp.description}</TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-1"><IndianRupee className="w-4 h-4"/>{exp.amount.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => setExpenseToDelete(exp)}>
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No expenses recorded yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                     </div>
                 </div>
            </CardContent>
        </Card>

        <AlertDialog open={!!investmentToConfirm} onOpenChange={() => setInvestmentToConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Investment</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div>
                            Please review the details before adding the investment.
                            <div className="py-4 space-y-2 text-foreground">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Description:</span>
                                    <span className="font-semibold text-right">{investmentToConfirm?.description}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{investmentToConfirm?.amount.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            This action cannot be undone.
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmInvestment}>Confirm & Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the expense: <span className="font-semibold">{expenseToDelete?.description}</span> for <span className="font-semibold">{expenseToDelete?.amount.toLocaleString('en-IN')}</span>. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
