
'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useLoans, Loan } from '@/lib/data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, IndianRupee, Landmark, Users } from 'lucide-react'
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

const recentCollections = [
  { id: 'COLL001', loanId: 'LOAN001', customer: 'Ravi Kumar', amount: 5000, date: '2024-07-28' },
  { id: 'COLL002', loanId: 'LOAN004', customer: 'Sahara Group', amount: 5000, date: '2024-07-27' },
  { id: 'COLL003', loanId: 'LOAN002', customer: 'Priya Sharma', amount: 2500, date: '2024-07-25' },
];

export default function CollectionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loans } = useLoans();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [dueDates, setDueDates] = useState<{ current: Date | null, next: Date | null }>({ current: null, next: null });

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    },
  });

  const selectedLoanId = form.watch('loanId');

  useEffect(() => {
    if (selectedLoanId) {
      const loan = loans.find(l => l.id === selectedLoanId);
      if (loan) {
        setSelectedLoan(loan);
        form.setValue('amount', loan.weeklyRepayment);

        const installmentsPaid = Math.floor(loan.totalPaid / loan.weeklyRepayment);
        const startDate = new Date(loan.disbursalDate);
        let currentDueDate: Date | null = null;
        let nextDueDate: Date | null = null;
        
        if (loan.collectionFrequency === 'Daily') {
          currentDueDate = addDays(startDate, installmentsPaid);
          nextDueDate = addDays(startDate, installmentsPaid + 1);
        } else if (loan.collectionFrequency === 'Weekly') {
          currentDueDate = addWeeks(startDate, installmentsPaid);
          nextDueDate = addWeeks(startDate, installmentsPaid + 1);
        } else if (loan.collectionFrequency === 'Monthly') {
          currentDueDate = addMonths(startDate, installmentsPaid);
          nextDueDate = addMonths(startDate, installmentsPaid + 1);
        }
        setDueDates({ current: currentDueDate, next: nextDueDate });

      } else {
        setSelectedLoan(null);
        setDueDates({ current: null, next: null });
        form.reset();
      }
    } else {
      setSelectedLoan(null);
      setDueDates({ current: null, next: null });
       form.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoanId, loans]);

  function onSubmit(data: CollectionFormValues) {
    console.log(data);
    toast({
      title: 'Collection Recorded',
      description: `Payment of ₹${data.amount} for loan ${data.loanId} has been recorded.`,
    });
    form.reset();
    setSelectedLoan(null);
    setDueDates({ current: null, next: null });
  }

  const getLoanDisplayName = (loan: any) => {
    if (loan.loanType === 'Group') {
      return `${loan.groupName} (Leader: ${loan.customerName}) - ${loan.id}`
    }
    return `${loan.customerName} - ${loan.id}`
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
                <FormField control={form.control} name="loanId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan / Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a loan" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loans.filter(l => l.status === 'Active' || l.status === 'Overdue').map(loan => (
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
                        <span className="font-semibold">₹{selectedLoan.weeklyRepayment.toLocaleString('en-IN')}</span>
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
                        <span className="font-semibold">₹{selectedLoan.outstandingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Collected (₹)</FormLabel>
                    <FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl>
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
                <Button type="submit" className="w-full">Record Collection</Button>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount (₹)</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCollections.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.customer}</div>
                      <div className="text-sm text-muted-foreground">{c.loanId}</div>
                    </TableCell>
                    <TableCell>₹{c.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{c.date}</TableCell>
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
