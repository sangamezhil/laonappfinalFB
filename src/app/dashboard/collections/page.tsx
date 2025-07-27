
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
import { CalendarIcon, IndianRupee, Landmark, Users, Phone, Search } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format, addDays, addWeeks, addMonths } from 'date-fns'

const collectionSchema = z.object({
  loanId: z.string().nonempty({ message: 'Please select a loan.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  collectionDate: z.date({ required_error: 'A collection date is required.' }),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'UPI']),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

function CollectionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { loans, updateLoanPayment } = useLoans();
  const { customers } = useCustomers();
  const { logActivity } = useUserActivity();
  const { collections, addCollection } = useCollections();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [dueDates, setDueDates] = useState<{ current: Date | null, next: Date | null }>({ current: null, next: null });

  const activeAndOverdueLoans = React.useMemo(() => {
    return loans.filter(l => l.status === 'Active' || l.status === 'Overdue')
  }, [loans]);

  const loanIdFromQuery = searchParams.get('loanId');

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      loanId: loanIdFromQuery || '',
      amount: '' as any,
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    },
  });

  const selectedLoanIdInForm = form.watch('loanId');

  const updateLoanDetails = useCallback((loan: Loan | null) => {
    setSelectedLoan(loan);
    if (loan) {
      form.setValue('amount', loan.weeklyRepayment, { shouldValidate: true });

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
      form.reset({
        loanId: '',
        amount: '' as any,
        paymentMethod: 'Cash',
        collectionDate: new Date(),
      });
    }
  }, [form]);

  useEffect(() => {
    if (loanIdFromQuery) {
        const loan = loans.find(l => l.id === loanIdFromQuery);
        updateLoanDetails(loan || null);
        form.setValue('loanId', loanIdFromQuery, { shouldValidate: true });

        // Clean up URL by removing the query parameter
        const currentPath = window.location.pathname;
        router.replace(currentPath, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanIdFromQuery]);

  useEffect(() => {
      const loan = loans.find(l => l.id === selectedLoanIdInForm);
      if (loan) {
          updateLoanDetails(loan);
      } else {
          // If the loanId becomes invalid (e.g., cleared), reset details
          updateLoanDetails(null);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoanIdInForm]);



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
      form.setValue('loanId', activeLoan.id, { shouldValidate: true });
    } else {
      toast({ title: 'No Active Loan', description: `${customer.name} does not have an active loan.` });
    }
  };


  function onSubmit(data: CollectionFormValues) {
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
    });

    toast({
      title: 'Collection Recorded',
      description: `Payment of ₹${data.amount.toLocaleString('en-IN')} for loan ${data.loanId} has been recorded.`,
    });
    form.reset({
        loanId: '',
        amount: '' as any,
        paymentMethod: 'Cash',
        collectionDate: new Date(),
    });
    setSelectedLoan(null);
  }

  const getLoanDisplayName = (loan: Loan) => {
    const customer = customers.find(c => c.id === loan.customerId);
    const phone = customer ? `(${customer.phone})` : '';

    if (loan.loanType === 'Group') {
      return `${loan.customerName} ${phone} (${loan.groupName}) - ${loan.id}`
    }
    return `${loan.customerName} ${phone} - ${loan.id}`
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedLoan.weeklyRepayment.toLocaleString('en-IN')}</span>
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
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedLoan.outstandingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Collected (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="Enter amount" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="collectionDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Collection Date</FormLabel>
                        <Popover><PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />
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
              <CardFooter>
                <Button type="submit" className="w-full" disabled={!selectedLoanIdInForm}>Record Collection</Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
            <CardDescription>History of the latest payments received.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / Group</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.customer}</div>
                    </TableCell>
                    <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{c.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono text-xs">{c.loanId}</TableCell>
                    <TableCell>{format(new Date(c.date), 'dd MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default function CollectionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollectionsPageContent />
    </Suspense>
  )
}
