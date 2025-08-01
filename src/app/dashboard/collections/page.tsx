
'use client'

import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useLoans, Loan, useUserActivity, useCollections, Collection, useCustomers } from '@/lib/data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, IndianRupee, Landmark, Users, Phone, Search, Trash2, MoreHorizontal } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn, getAvatarColor } from '@/lib/utils'
import { format, addDays, addWeeks, addMonths } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const collectionSchema = z.object({
  loanId: z.string().nonempty({ message: 'Please select a loan.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  collectionDate: z.date({
    required_error: "A collection date is required.",
  }),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'UPI']),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

type User = {
  username: string;
  role: string;
}

function CollectionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { loans, updateLoanPayment } = useLoans();
  const { customers } = useCustomers();
  const { logActivity } = useUserActivity();
  const { collections, addCollection, deleteCollection } = useCollections();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [dueDates, setDueDates] = useState<{ current: Date | null, next: Date | null }>({ current: null, next: null });
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [collectionToConfirm, setCollectionToConfirm] = useState<CollectionFormValues | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  
  const loanIdFromQuery = searchParams.get('loanId');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const activeAndOverdueLoans = React.useMemo(() => {
    return loans.filter(l => l.status === 'Active' || l.status === 'Overdue')
  }, [loans]);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      loanId: '',
      amount: '' as any,
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    },
  });
  
  const { formState, setValue, control } = form;

  const selectedLoanIdInForm = form.watch('loanId');

  const updateLoanDetails = useCallback((loanId: string | null) => {
    const loan = loanId ? loans.find(l => l.id === loanId) : null;
    setSelectedLoan(loan || null);

    if (loan) {
      setValue('amount', loan.weeklyRepayment, { shouldValidate: true });

      const installmentsPaid = loan.totalPaid > 0 ? Math.floor(loan.totalPaid / loan.weeklyRepayment) : 0;
      const startDate = new Date(loan.disbursalDate);
      let currentDueDate: Date | null = null;
      let nextDueDate: Date | null = null;
      
      if (loan.collectionFrequency === 'Daily') {
        currentDueDate = addDays(startDate, installmentsPaid + 1);
        nextDueDate = addDays(startDate, installmentsPaid + 2);
      } else if (loan.collectionFrequency === 'Weekly') {
        currentDueDate = addWeeks(startDate, installmentsPaid + 1);
        nextDueDate = addWeeks(startDate, installmentsPaid + 2);
      } else if (loan.collectionFrequency === 'Monthly') {
        currentDueDate = addMonths(startDate, installmentsPaid + 2);
      }
      setDueDates({ current: currentDueDate, next: nextDueDate });
    } else {
      setDueDates({ current: null, next: null });
    }
  }, [loans, setValue]);

  useEffect(() => {
    const loanIdToProcess = loanIdFromQuery || selectedLoanIdInForm;

    if (loanIdToProcess && loanIdToProcess !== (selectedLoan?.id ?? '')) {
      updateLoanDetails(loanIdToProcess);
      
      if (loanIdFromQuery) {
        setValue('loanId', loanIdFromQuery, { shouldValidate: true, shouldDirty: true });
        
        const currentPath = window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: currentPath, url: currentPath }, '', currentPath);
      }
    } else if (!loanIdToProcess && selectedLoan) {
        handleClear();
    }
  }, [loanIdFromQuery, selectedLoanIdInForm, updateLoanDetails, setValue, selectedLoan]);


  const handlePhoneSearch = () => {
    if (!phoneSearch || phoneSearch.length < 10) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    const customer = customers.find(c => c.phone === phoneSearch);
    if (!customer) {
      toast({ variant: 'destructive', title: 'Customer Not Found', description: 'No customer found with this phone number.' });
      return;
    }
    const activeLoan = loans.find(l => l.customerId === customer.id && (l.status === 'Active' || l.status === 'Overdue'));
    if (activeLoan) {
      setValue('loanId', activeLoan.id, { shouldValidate: true });
    } else {
      toast({ title: 'No Active Loan', description: `${customer.name} does not have an active loan.` });
    }
  };

  const handleClear = () => {
    form.reset({
      loanId: '',
      amount: '' as any,
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    });
    setValue('loanId', '');
    setSelectedLoan(null);
    setPhoneSearch('');
    setDueDates({ current: null, next: null });
  }

  function onAttemptSubmit(data: CollectionFormValues) {
    setCollectionToConfirm(data);
  }

  function handleConfirmCollection() {
    if (!collectionToConfirm) return;
    const data = collectionToConfirm;

    const loan = loans.find(l => l.id === data.loanId);
    if (!loan) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected loan not found.' });
        return;
    }
    
    updateLoanPayment(data.loanId, data.amount);
    logActivity('Record Collection', `Recorded payment of ₹${data.amount} for loan ${data.loanId} (${loan.customerName}).`);

    addCollection({
      loanId: data.loanId,
      customer: loan.loanType === 'Group' ? `${loan.groupName} (${loan.customerName})` : loan.customerName,
      amount: data.amount,
      date: format(data.collectionDate, 'yyyy-MM-dd'),
      paymentMethod: data.paymentMethod
    });

    toast({
      title: 'Collection Recorded',
      description: <>Payment of <IndianRupee className="inline-block w-4 h-4" /> {data.amount.toLocaleString('en-IN')} for loan {data.loanId} has been recorded.</>,
    });

    setCollectionToConfirm(null);
    handleClear();
  }
  
  const confirmDelete = () => {
    if (collectionToDelete) {
      deleteCollection(collectionToDelete.id);
      toast({
        title: 'Collection Deleted',
        description: `The collection record has been successfully deleted.`,
      });
      setCollectionToDelete(null);
    }
  };

  const getLoanDisplayName = (loan: Loan) => {
    const customer = customers.find(c => c.id === loan.customerId);
    const phone = customer ? `(${customer.phone})` : '';

    if (loan.loanType === 'Group') {
      return `${loan.customerName} ${phone} (${loan.groupName}) - ${loan.id}`
    }
    return `${loan.customerName} ${phone} - ${loan.id}`
  }

  return (
    <>
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAttemptSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>Collection Entry</CardTitle>
                <CardDescription>Record a new payment from a customer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeAndOverdueLoans.length === 0 && (
                  <div className="p-4 text-center rounded-md bg-secondary text-muted-foreground">
                    There are no active or overdue loans to collect payments for.
                  </div>
                )}
                <div className="flex gap-2">
                    <div className="relative w-full">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            type="tel" 
                            placeholder="Search by phone number..." 
                            value={phoneSearch} 
                            onChange={(e) => setPhoneSearch(e.target.value)}
                            className="pl-9"
                            disabled={activeAndOverdueLoans.length === 0}
                        />
                    </div>
                    <Button type="button" onClick={handlePhoneSearch} disabled={activeAndOverdueLoans.length === 0}><Search className="w-4 h-4" /></Button>
                </div>


                <FormField control={form.control} name="loanId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan / Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={activeAndOverdueLoans.length === 0}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a loan" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeAndOverdueLoans.map(loan => (
                          <SelectItem key={loan.id} value={loan.id}>{getLoanDisplayName(loan)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedLoan && (
                  <Card className="bg-secondary/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base">Loan Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          Due Amount
                        </span>
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedLoan.weeklyRepayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Current Due Date
                        </span>
                        <span className="font-semibold">{dueDates.current ? format(dueDates.current, 'PPP') : 'N/A'}</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Next Due Date
                        </span>
                        <span className="font-semibold">{dueDates.next ? format(dueDates.next, 'PPP') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Landmark className="w-4 h-4" /> Outstanding</span>
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedLoan.outstandingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">Amount Collected <IndianRupee className="w-4 h-4" /></FormLabel>
                    <FormControl><Input type="number" placeholder="Enter amount" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                    control={control}
                    name="collectionDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Collection Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                 <CardDescription>Any overdue or missed dues will be automatically tracked.</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={handleClear}>Clear</Button>
                <Button type="submit" disabled={!selectedLoanIdInForm || formState.isSubmitting}>Record Collection</Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Recent Collections</CardTitle>
                    <CardDescription>History of the latest payments received.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / Group</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      Amount
                    </div>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map(c => {
                    const avatarName = c.customer.split('(')[0].trim();
                    return (
                        <TableRow key={c.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border">
                                        <AvatarFallback className={getAvatarColor(avatarName)}>
                                            {avatarName.substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{c.customer}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                              <div className="items-center">
                                <IndianRupee className="inline-block w-4 h-4 mr-1" />
                                {c.amount.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                              </div>
                            </TableCell>
                            <TableCell>{c.paymentMethod}</TableCell>
                            <TableCell className="font-mono text-xs">{c.loanId}</TableCell>
                            <TableCell>{format(new Date(c.date), 'dd MMM yyyy')}</TableCell>
                             <TableCell>
                                {user?.role === 'Admin' && (
                                  <Button variant="ghost" size="icon" onClick={() => setCollectionToDelete(c)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                      <span className="sr-only">Delete</span>
                                  </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
    
    <AlertDialog open={!!collectionToConfirm} onOpenChange={(open) => !open && setCollectionToConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Collection</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              Please review the details before confirming the collection.
              <div className="py-4 space-y-2 text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold">{selectedLoan?.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan ID:</span>
                  <span className="font-semibold font-mono text-xs">{selectedLoan?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" /> {collectionToConfirm?.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-semibold">{dueDates.current ? format(dueDates.current, 'PPP') : 'N/A'}</span>
                </div>
              </div>
              This action cannot be undone.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCollectionToConfirm(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCollection}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!collectionToDelete} onOpenChange={(open) => !open && setCollectionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the collection record for <span className="font-bold">{collectionToDelete?.customer}</span> of <IndianRupee className="inline-block w-4 h-4 mx-1" /> <span className="font-bold">{collectionToDelete?.amount.toLocaleString('en-IN')}</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}


export default function CollectionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionsPageContent />
    </Suspense>
  )
}

    
