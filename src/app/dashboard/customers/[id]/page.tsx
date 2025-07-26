
'use client'

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { getCustomerById, getLoansByCustomerId, Customer, Loan } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { User, Briefcase, IndianRupee, Hash, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerProfilePage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    const customerId = params.id;
    const cust = getCustomerById(customerId);
    if (cust) {
      setCustomer(cust);
      const customerLoans = getLoansByCustomerId(customerId);
      setLoans(customerLoans);
    } else {
      setCustomer(null);
    }
  }, [params.id]);

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
                  <CardDescription>A complete record of all loans taken by this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount (₹)</TableHead>
                        <TableHead>Disbursal Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Skeleton className="h-5 w-1/2 mx-auto" />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
            <Avatar className="w-20 h-20">
              <AvatarImage src={customer.profilePicture} alt={customer.name} data-ai-hint="person avatar" />
              <AvatarFallback>{customer.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">{customer.name}</CardTitle>
              <CardDescription>{customer.email} &bull; {customer.phone}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{customer.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Occupation: <strong>{customer.occupation}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              <span>Monthly Income: <strong>₹{customer.monthlyIncome.toLocaleString('en-IN')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span>{customer.idType}: <strong>{customer.idNumber}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Customer Since: <strong>{customer.registrationDate}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
          <CardDescription>A complete record of all loans taken by {customer.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Disbursal Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.id}</TableCell>
                    <TableCell>{loan.loanType}</TableCell>
                    <TableCell>₹{loan.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{loan.disbursalDate}</TableCell>
                    <TableCell>
                      <Badge variant={
                        loan.status === 'Active' ? 'secondary' :
                        loan.status === 'Overdue' ? 'destructive' :
                        loan.status === 'Closed' ? 'default' :
                        'outline'
                      }
                      className={loan.status === 'Closed' ? 'bg-green-600 text-white' : ''}
                      >
                        {loan.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No loan history found for this customer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
