
'use client'

import React from 'react';
import Link from 'next/link'
import { PlusCircle, MoreHorizontal, ChevronDown, ChevronRight, IndianRupee } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type User = {
  username: string;
  role: string;
}

type GroupedLoan = {
    isGroup: true;
    groupName: string;
    groupId: string;
    loans: Loan[];
    totalAmount: number;
    totalOutstanding: number;
    status: Loan['status'];
} | {
    isGroup: false;
    loan: Loan;
}

const LoanTable = ({ loans, user, handleApprove, handlePreclose }: { loans: Loan[], user: User | null, handleApprove: (id: string) => void, handlePreclose: (id: string) => void }) => {
    const router = useRouter();

    const groupedLoans = React.useMemo(() => {
        const groups: Record<string, GroupedLoan> = {};
        const personalLoans: GroupedLoan[] = [];

        loans.forEach(loan => {
            if (loan.loanType === 'Group' && loan.groupId) {
                if (!groups[loan.groupId]) {
                    groups[loan.groupId] = {
                        isGroup: true,
                        groupId: loan.groupId,
                        groupName: loan.groupName || 'Unknown Group',
                        loans: [],
                        totalAmount: 0,
                        totalOutstanding: 0,
                        status: 'Pending', // Default status, will be updated
                    };
                }
                const group = groups[loan.groupId];
                if (group.isGroup) {
                    group.loans.push(loan);
                    group.totalAmount += loan.amount;
                    group.totalOutstanding += loan.outstandingAmount;
                }
            } else {
                personalLoans.push({ isGroup: false, loan });
            }
        });

        // Determine overall status for each group
        Object.values(groups).forEach(group => {
            if (group.isGroup) {
                if (group.loans.some(l => l.status === 'Overdue')) group.status = 'Overdue';
                else if (group.loans.some(l => l.status === 'Active')) group.status = 'Active';
                else if (group.loans.every(l => l.status === 'Closed')) group.status = 'Closed';
                else group.status = 'Pending';
            }
        });

        return [...Object.values(groups), ...personalLoans];
    }, [loans]);

    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Loan/Group ID</TableHead>
              <TableHead>Customer / Group</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                Amount
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                Outstanding
              </TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedLoans.map((item) => (
              item.isGroup ? (
                <Collapsible asChild key={item.groupId} className="border-b">
                  <>
                    <TableRow className="bg-muted/50 hover:bg-muted/80">
                      <TableCell className="font-medium">
                        <CollapsibleTrigger asChild>
                            <button className="flex items-center w-full gap-2">
                                <ChevronRight className="w-4 h-4 transition-transform [&[data-state=open]]:rotate-90"/>
                                {item.groupId}
                            </button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>{item.groupName}</TableCell>
                      <TableCell>Group</TableCell>
                      <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.totalAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === 'Active' ? 'secondary' :
                          item.status === 'Overdue' ? 'destructive' :
                          item.status === 'Closed' ? 'default' :
                          'outline'
                        } className={item.status === 'Closed' ? 'bg-green-600 text-white' : ''}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.totalOutstanding.toLocaleString('en-IN')}</TableCell>
                      <TableCell>&nbsp;</TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <>
                        {item.loans.map(loan => {
                          const isLeader = loan.customerName === loan.groupLeaderName;
                          return (
                            <TableRow key={loan.id} className={cn("bg-background hover:bg-muted/50", isLeader && "bg-primary/10 hover:bg-primary/20" )}>
                              <TableCell className="pl-12 text-xs font-mono text-muted-foreground">{loan.id}</TableCell>
                              <TableCell>
                                <div className='flex items-center gap-2'>
                                  {loan.customerName}
                                  {isLeader && <Badge variant="secondary" size="sm">Leader</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">Member</TableCell>
                              <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.amount.toLocaleString('en-IN')}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  loan.status === 'Active' ? 'secondary' :
                                  loan.status === 'Overdue' ? 'destructive' :
                                  loan.status === 'Closed' ? 'default' :
                                  'outline'
                                } className={loan.status === 'Closed' ? 'bg-green-600 text-white' : ''}>
                                  {loan.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
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
                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/customers/${loan.customerId}`)}>
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
                          )
                        })}
                      </>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ) : ( // Personal Loan
                <TableRow key={item.loan.id}>
                  <TableCell className="font-mono text-xs">{item.loan.id}</TableCell>
                  <TableCell>{item.loan.customerName}</TableCell>
                  <TableCell>{item.loan.loanType}</TableCell>
                  <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.loan.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <Badge variant={
                      item.loan.status === 'Active' ? 'secondary' :
                      item.loan.status === 'Overdue' ? 'destructive' :
                      item.loan.status === 'Closed' ? 'default' :
                      'outline'
                    } className={item.loan.status === 'Closed' ? 'bg-green-600 text-white' : ''}>
                      {item.loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
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
                        {item.loan.status === 'Pending' && user?.role === 'Admin' && (
                          <DropdownMenuItem onSelect={() => handleApprove(item.loan.id)}>
                            Approve Loan
                          </DropdownMenuItem>
                        )}
                        {(item.loan.status === 'Active' || item.loan.status === 'Overdue') && user?.role === 'Admin' && (
                          <DropdownMenuItem onSelect={() => handlePreclose(item.loan.id)}>
                            Preclose Loan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => router.push(`/dashboard/customers/${item.loan.customerId}`)}>
                          View Customer
                        </DropdownMenuItem>
                        {(item.loan.status === 'Active' || item.loan.status === 'Overdue') &&
                          <DropdownMenuItem onSelect={() => router.push(`/dashboard/collections?loanId=${item.loan.id}`)}>
                            Record Payment
                          </DropdownMenuItem>
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
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
                        <Skeleton className="w-24 h-8 mb-2" />
                        <Skeleton className="w-72 h-4" />
                    </div>
                     <Skeleton className="w-44 h-10" />
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
                <TabsTrigger value="active">Active &amp; Overdue</TabsTrigger>
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
