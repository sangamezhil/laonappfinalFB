
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useLoans } from '@/lib/data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const collectionSchema = z.object({
  loanId: z.string().nonempty({ message: 'Please select a loan.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  collectionDate: z.date({ required_error: 'A collection date is required.' }),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'UPI']),
  nextDueDate: z.date().optional(),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

const recentCollections = [
  { id: 'COLL001', loanId: 'LOAN001', customer: 'Ravi Kumar', amount: 1120, date: '2024-07-28' },
  { id: 'COLL002', loanId: 'LOAN004', customer: 'Sahara Group', amount: 6800, date: '2024-07-27' },
  { id: 'COLL003', loanId: 'LOAN002', customer: 'Priya Sharma', amount: 1406.25, date: '2024-07-25' },
];

export default function CollectionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loans } = useLoans();
  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
  });

  function onSubmit(data: CollectionFormValues) {
    console.log(data);
    toast({
      title: 'Collection Recorded',
      description: `Payment of ₹${data.amount} for loan ${data.loanId} has been recorded.`,
    });
    form.reset();
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
                          <SelectItem key={loan.id} value={loan.id}>{loan.customerName} - {loan.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
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
                 <FormDescription>Any overdue or missed dues will be automatically tracked.</FormDescription>
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
