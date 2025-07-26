
'use client'

import React from 'react';
import Link from 'next/link'
import { PlusCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useLoans, useUserActivity, Loan } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type User = {
  username: string;
  role: string;
}

const LoanTable = ({ loans, user, handleApprove, handlePreclose }: { loans: Loan[], user: User | null, handleApprove: (id: string) => void, handlePreclose: (id: string) => void }) => {
    const router = useRouter();
    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan ID</TableHead>
              <TableHead>Customer / Group</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outstanding (₹)</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{loan.customerName}</div>
                    {loan.loanType === 'Group' && <div className="text-sm text-muted-foreground">{loan.groupName}</div>}
                  </TableCell>
                  <TableCell>{loan.loanType}</TableCell>
                  <TableCell>₹{loan.amount.toLocaleString('en-IN')}</TableCell>
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
                  <TableCell>₹{loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="w-4 h-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {loan.status === 'Pending' && user?.role === 'Admin' && (
                          <DropdownMenuItem onSelect={() => handleApprove(loan.id)}>
                            Approve Loan
                          </DropdownMenuItem>
                        )}
                        {(loan.status === 'Active' || loan.status === 'Overdue') && user?.role === 'Admin' && (
                          <DropdownMenuItem onSelect={() => handlePreclose(loan.id)}>
                            Preclose Loan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onSelect={() => router.push(`/dashboard/customers/${loan.customerId}`)}
                          disabled={loan.loanType === 'Group'}
                        >
                          View Customer
                        </DropdownMenuItem>
                        {(loan.status === 'Active' || loan.status === 'Overdue') &&
                          <DropdownMenuItem onSelect={() => router.push(`/dashboard/collections?loanId=${loan.id}`)}>
                            Record Payment
                          </DropdownMenuItem>
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
    )
}

export default function LoansPage() {
  const { loans, isLoaded, updateLoanStatus } = useLoans();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const { logActivity } = useUserActivity();

  const activeLoans = React.useMemo(() => loans.filter(l => l.status === 'Active' || l.status === 'Overdue' || l.status === 'Pending'), [loans]);
  const closedLoans = React.useMemo(() => loans.filter(l => l.status === 'Closed'), [loans]);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const handleApprove = (loanId: string) => {
    updateLoanStatus(loanId, 'Active');
    logActivity('Approve Loan', `Approved loan ${loanId}.`);
    toast({
      title: 'Loan Approved',
      description: `Loan ${loanId} has been activated.`,
    });
  };

  const handlePreclose = (loanId: string) => {
    updateLoanStatus(loanId, 'Closed');
    logActivity('Preclose Loan', `Pre-closed loan ${loanId}.`);
    toast({
      title: 'Loan Pre-closed',
      description: `Loan ${loanId} has been marked as closed.`,
    });
  };

  if (!isLoaded) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                     <Skeleton className="h-10 w-44" />
                </div>
            </CardHeader>
            <CardContent>
                 <Skeleton className="h-10 w-[200px] mb-4" />
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Loan ID</TableHead>
                            <TableHead>Customer / Group</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Outstanding (₹)</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                            <TableCell><Skeleton className="w-20 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-40 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-16 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-24 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-16 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-24 h-5" /></TableCell>
                            <TableCell><Skeleton className="w-8 h-8 rounded-full" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Loans</CardTitle>
            <CardDescription>
              Track and manage all loan applications.
            </CardDescription>
          </div>
          {user?.role === 'Admin' && (
            <Link href="/dashboard/loans/new" passHref>
                <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                New Loan Application
                </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
            <TabsList>
                <TabsTrigger value="active">Active & Overdue</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                <LoanTable loans={activeLoans} user={user} handleApprove={handleApprove} handlePreclose={handlePreclose} />
            </TabsContent>
            <TabsContent value="closed">
                <LoanTable loans={closedLoans} user={user} handleApprove={handleApprove} handlePreclose={handlePreclose} />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
