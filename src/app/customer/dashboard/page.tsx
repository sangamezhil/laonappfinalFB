
'use client'

import { useState, useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { getCustomerById, getLoansByCustomerId, Customer, Loan, useCollections, Collection } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { User, Briefcase, IndianRupee, Hash, Calendar, Phone, Cake, VenetianMask, FileText, Wallet, Percent, CalendarClock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn, getAvatarColor } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type LoanWithDetails = Loan & {
  nextDueDate: Date | null;
  collections: Collection[];
};

export default function CustomerDashboardPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [loansWithDetails, setLoansWithDetails] = useState<LoanWithDetails[]>([]);
  const { collections } = useCollections();
  
  useEffect(() => {
    const storedCustomer = localStorage.getItem('loggedInCustomer');
    if (storedCustomer) {
        const customerData: Customer = JSON.parse(storedCustomer);
        const cust = getCustomerById(customerData.id);

        if (cust) {
            setCustomer(cust);
            const customerLoans = getLoansByCustomerId(cust.id);
            
            const detailedLoans = customerLoans.map(loan => {
            const installmentsPaid = loan.totalPaid > 0 && loan.weeklyRepayment > 0 ? Math.floor(loan.totalPaid / loan.weeklyRepayment) : 0;
            const startDate = new Date(loan.disbursalDate);
            let nextDueDate: Date | null = null;
            
            if (loan.status === 'Active' || loan.status === 'Overdue') {
                if (loan.collectionFrequency === 'Daily') {
                nextDueDate = addDays(startDate, installmentsPaid + 1);
                } else if (loan.collectionFrequency === 'Weekly') {
                nextDueDate = addWeeks(startDate, installmentsPaid + 1);
                } else if (loan.collectionFrequency === 'Monthly') {
                nextDueDate = addMonths(startDate, installmentsPaid + 1);
                }
            }

            const loanCollections = collections.filter(c => c.loanId === loan.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return { ...loan, nextDueDate, collections: loanCollections };
            });

            setLoansWithDetails(detailedLoans);
        } else {
            setCustomer(null);
        }
    } else {
        router.push('/customer/login');
    }
  }, [collections, router]);

  if (customer === undefined) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-full" />
                        <div>
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>Loan History</CardTitle>
                  <CardDescription>A complete record of all your loans.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!customer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border">
              <AvatarFallback className={cn("text-xl font-bold", getAvatarColor(customer.name))}>
                {customer.name.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">Welcome, {customer.name}</CardTitle>
              <CardDescription>{customer.email} • {customer.phone}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Loan History</CardTitle>
          <CardDescription>A complete record of all loans taken by you.</CardDescription>
        </CardHeader>
        <CardContent>
          {loansWithDetails.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {loansWithDetails.map((loan) => (
                <AccordionItem value={loan.id} key={loan.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs">{loan.id}</span>
                        <span>{loan.loanType === 'Group' ? `${loan.groupName}` : 'Personal Loan'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.amount.toLocaleString('en-IN')}</span>
                         <Badge variant={
                            loan.status === 'Active' ? 'secondary' :
                            loan.status === 'Overdue' ? 'destructive' :
                            loan.status === 'Closed' ? 'default' :
                            'outline'
                         } className={loan.status === 'Closed' ? 'bg-green-600 text-white' : ''}>
                          {loan.status}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-4 space-y-6 rounded-md bg-muted/50">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Disbursal Date</span>
                                <span className="font-semibold flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(loan.disbursalDate), 'PPP')}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Total Paid</span>
                                <span className="font-semibold text-green-600 flex items-center gap-1"><Wallet className="w-4 h-4" /> <IndianRupee className="w-4 h-4" />{loan.totalPaid.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Outstanding</span>
                                <span className="font-semibold text-destructive flex items-center gap-1"><IndianRupee className="w-4 h-4" /> <IndianRupee className="w-4 h-4" />{loan.outstandingAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Next Due Date</span>
                                <span className="font-semibold flex items-center gap-1"><CalendarClock className="w-4 h-4" /> {loan.nextDueDate ? format(loan.nextDueDate, 'PPP') : 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">{loan.collectionFrequency} Repayment</span>
                                <span className="font-semibold flex items-center gap-1"><IndianRupee className="w-4 h-4" /> {loan.weeklyRepayment.toLocaleString('en-IN')}</span>
                            </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Interest Rate</span>
                                <span className="font-semibold flex items-center gap-1"><Percent className="w-4 h-4" /> {loan.interestRate}%</span>
                            </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground">Term</span>
                                <span className="font-semibold flex items-center gap-1"><CalendarClock className="w-4 h-4" /> {loan.term} {loan.collectionFrequency === 'Daily' ? 'Days' : loan.collectionFrequency === 'Weekly' ? 'Weeks' : 'Months'}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="mb-2 font-semibold">Payment History</h4>
                            {loan.collections.length > 0 ? (
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loan.collections.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>{format(new Date(c.date), 'PPP')}</TableCell>
                                        <TableCell><IndianRupee className="inline w-3 h-3 mr-1"/>{c.amount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell>{c.paymentMethod}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            ) : (
                                <div className="text-sm text-center text-muted-foreground py-4">No payments recorded for this loan yet.</div>
                            )}
                        </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center text-muted-foreground py-8">
                <FileText className="mx-auto w-12 h-12 mb-4" />
                <p>No loan history found.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
