
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { CalendarIcon, IndianRupee } from 'lucide-react'
import { format, parse } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useCustomers, useUserActivity } from '@/lib/data'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

const kycFormSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: "Gender is required."}),
  dob: z.string().transform((val, ctx) => {
    try {
      const parsed = parse(val, 'ddMMyyyy', new Date());
      if (isNaN(parsed.getTime())) {
          throw new Error("Invalid date");
      }
       if (parsed > new Date() || parsed < new Date("1900-01-01")) {
         throw new Error("Invalid date range");
      }
      return parsed;
    } catch(e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date. Use DDMMYYYY format.",
      });
      return z.NEVER;
    }
  }),
  email: z.string().email({ message: 'Please enter a valid email address.' }).optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be 10 digits.' }),
  secondaryPhone: z.string().regex(/^\d{10}$/, { message: 'Secondary phone number must be 10 digits.' }),
  address: z.string().min(10, { message: 'Address is too short.' }),
  idType: z.enum(['Aadhaar Card', 'PAN Card', 'Ration Card', 'Voter ID', 'Bank Passbook', 'Gas Book']),
  idNumber: z.string().min(5, { message: 'ID number is required.' }),
  secondaryIdType: z.enum(['Aadhaar Card', 'PAN Card', 'Ration Card', 'Voter ID', 'Bank Passbook', 'Gas Book']),
  secondaryIdNumber: z.string().min(5, { message: 'Secondary ID number is required.' }),
  occupation: z.string().optional(),
  monthlyIncome: z.coerce.number().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.idType === 'Aadhaar Card') {
    if (!/^\d{12}$/.test(data.idNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aadhaar number must be 12 numeric digits.",
        path: ['idNumber'],
      });
    }
  }
   if (data.secondaryIdType === 'Aadhaar Card') {
    if (!/^\d{12}$/.test(data.secondaryIdNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aadhaar number must be 12 numeric digits.",
        path: ['secondaryIdNumber'],
      });
    }
  }
  if (data.idType === data.secondaryIdType) {
     ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Secondary ID type must be different from the primary ID type.",
        path: ['secondaryIdType'],
      });
  }
  if (data.phone === data.secondaryPhone) {
     ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Secondary phone number must be different from the primary phone number.",
        path: ['secondaryPhone'],
      });
  }
});

type KycFormValues = z.infer<typeof kycFormSchema>

type User = {
  username: string;
  role: string;
}

export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { addCustomer } = useCustomers();
  const { logActivity } = useUserActivity();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
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


  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      fullName: '',
      gender: 'Male',
      dob: '',
      email: '',
      phone: '',
      secondaryPhone: '',
      address: '',
      occupation: '',
      idNumber: '',
      idType: 'Aadhaar Card',
      secondaryIdType: 'PAN Card',
      secondaryIdNumber: ''
    },
  })

  function onSubmit(data: { dob: Date } & Omit<KycFormValues, 'dob'>) {
    const newCustomer = addCustomer({
      name: data.fullName, 
      dob: format(data.dob, 'yyyy-MM-dd'),
      gender: data.gender,
      email: data.email || '',
      phone: data.phone,
      secondaryPhone: data.secondaryPhone,
      address: data.address,
      idType: data.idType,
      idNumber: data.idNumber,
      secondaryIdType: data.secondaryIdType,
      secondaryIdNumber: data.secondaryIdNumber,
      occupation: data.occupation || '', 
      monthlyIncome: data.monthlyIncome || 0, 
    });
    logActivity('Create Customer', `Registered new customer: ${newCustomer.name} (${newCustomer.id})`);
    toast({
      title: 'Customer Registered',
      description: `${data.fullName} has been successfully registered.`,
    })
    router.push('/dashboard/customers')
  }

  if (!user || user.role !== 'Admin') {
    return <div className='p-4'>Checking permissions...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>New Customer Registration (KYC)</CardTitle>
            <CardDescription>Fill in the details to register a new customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input placeholder="DDMMYYYY" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="10-digit mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="secondaryPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="10-digit mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary ID Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                        <SelectItem value="PAN Card">PAN Card</SelectItem>
                        <SelectItem value="Ration Card">Ration Card</SelectItem>
                        <SelectItem value="Voter ID">Voter ID</SelectItem>
                        <SelectItem value="Bank Passbook">Bank Passbook</SelectItem>
                        <SelectItem value="Gas Book">Gas Book</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="secondaryIdType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary ID Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                        <SelectItem value="PAN Card">PAN Card</SelectItem>
                        <SelectItem value="Ration Card">Ration Card</SelectItem>
                        <SelectItem value="Voter ID">Voter ID</SelectItem>
                        <SelectItem value="Bank Passbook">Bank Passbook</SelectItem>
                        <SelectItem value="Gas Book">Gas Book</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter secondary ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Software Engineer, Farmer" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Monthly Income <IndianRupee className="w-4 h-4" /> (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter monthly income" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">Register Customer</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
