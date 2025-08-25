
'use client'

import React from 'react';
import Link from 'next/link'
import { PlusCircle, MoreHorizontal, ChevronDown, ChevronRight, IndianRupee, CheckCircle, Search, X, Trash2 } from 'lucide-react'
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge'
import { useLoans, useUserActivity, Loan, useCustomers, Customer } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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

const LoanTable = ({ 
    loans, 
    customers,
    user, 
    onApproveClick, 
    handlePreclose, 
    handleDelete,
    hasSearched,
    isSearching,
}: { 
    loans: Loan[], 
    customers: Customer[],
    user: User | null, 
    onApproveClick: (loan: Loan) => void,
    handlePreclose: (id: string) => void,
    handleDelete: (loanOrLoans: Loan | Loan[]) => void,
    hasSearched: boolean,
    isSearching: boolean
}) => {
    const router = useRouter();
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({...prev, [groupId]: !prev[groupId]}));
    }

    const getCustomerPhone = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.phone : '';
    }

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
                else if (group.loans.every(l => l.status === 'Pre-closed')) group.status = 'Pre-closed';
                else group.status = 'Pending';
            }
        });

        return [...Object.values(groups), ...personalLoans];
    }, [loans]);

    if (isSearching) {
        return <div className="text-center text-muted-foreground p-8">Searching...</div>
    }

    if (groupedLoans.length === 0) {
        if (hasSearched) {
            return <div className="text-center text-muted-foreground p-8">No loans found matching your search.</div>
        }
        return <div className="text-center text-muted-foreground p-8">Please enter a search query to see loans.</div>
    }

    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Loan/Group ID</TableHead>
              <TableHead>Customer / Group</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" /> Amount
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" /> Outstanding
                </div>
              </TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
            {groupedLoans.map((item) => (
              item.isGroup ? (
                <TableBody key={item.groupId} className='border-b'>
                    <TableRow className="bg-muted/50 hover:bg-muted/80">
                      <TableCell className="font-medium">
                        <button className="flex items-center w-full gap-2" onClick={() => toggleGroup(item.groupId)}>
                            {openGroups[item.groupId] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                            {item.groupId}
                        </button>
                      </TableCell>
                      <TableCell>{item.groupName}</TableCell>
                      <TableCell>Group</TableCell>
                      <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.totalAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === 'Active' ? 'secondary' :
                          item.status === 'Overdue' ? 'destructive' :
                          item.status === 'Closed' ? 'default' :
                          item.status === 'Pre-closed' ? 'outline' :
                          'outline'
                        } className={cn(
                            item.status === 'Closed' ? 'bg-green-600 text-white' : 
                            item.status === 'Pre-closed' ? 'bg-blue-600 text-white' : ''
                        )}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user?.role === 'Admin' && item.status === 'Pending' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => onApproveClick(item.loans[0])}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Group
                              </Button>
                               <Button variant="destructive" size="sm" onClick={() => handleDelete(item.loans)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {openGroups[item.groupId] && item.loans.map(loan => {
                        const isLeader = loan.customerName === loan.groupLeaderName;
                        return (
                        <TableRow key={loan.id} className={cn("bg-background hover:bg-muted/50", isLeader && "bg-primary/10 hover:bg-primary/20" )}>
                            <TableCell className="pl-12 text-xs font-mono text-muted-foreground">{loan.id}</TableCell>
                            <TableCell>
                                <div className='flex flex-col'>
                                    <div className='flex items-center gap-2'>
                                        {loan.customerName}
                                        {isLeader && <Badge variant="secondary" size="sm">Leader</Badge>}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{getCustomerPhone(loan.customerId)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">Member</TableCell>
                            <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.amount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                            <Badge variant={
                                loan.status === 'Active' ? 'secondary' :
                                loan.status === 'Overdue' ? 'destructive' :
                                loan.status === 'Closed' ? 'default' :
                                loan.status === 'Pre-closed' ? 'outline' :
                                'outline'
                            } className={cn(
                                loan.status === 'Closed' ? 'bg-green-600 text-white' : 
                                loan.status === 'Pre-closed' ? 'bg-blue-600 text-white' : ''
                            )}>
                                {loan.status}
                            </Badge>
                            </TableCell>
                            <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.outstandingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
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
                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/customers/${loan.customerId}`)}>
                                    View Customer
                                </DropdownMenuItem>
                                 {user?.role === 'Admin' && loan.status !== 'Active' && loan.status !== 'Overdue' && (
                                    <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleDelete(loan)} className="text-destructive">
                                        {loan.status === 'Pending' ? 'Cancel Application' : 'Delete Loan'}
                                    </DropdownMenuItem>
                                    </>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )
                    })}
                </TableBody>
              ) : ( // Personal Loan
                <TableBody key={item.loan.id}>
                    <TableRow>
                        <TableCell className="font-mono text-xs">{item.loan.id}</TableCell>
                        <TableCell>
                            <div className='flex flex-col'>
                                <span>{item.loan.customerName}</span>
                                <span className="text-xs text-muted-foreground">{getCustomerPhone(item.loan.customerId)}</span>
                            </div>
                        </TableCell>
                        <TableCell>{item.loan.loanType}</TableCell>
                        <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.loan.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                        <Badge variant={
                            item.loan.status === 'Active' ? 'secondary' :
                            item.loan.status === 'Overdue' ? 'destructive' :
                            item.loan.status === 'Closed' ? 'default' :
                            item.loan.status === 'Pre-closed' ? 'outline' :
                            'outline'
                        } className={cn(
                            item.loan.status === 'Closed' ? 'bg-green-600 text-white' : 
                            item.loan.status === 'Pre-closed' ? 'bg-blue-600 text-white' : ''
                        )}>
                            {item.loan.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{item.loan.outstandingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
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
                                <DropdownMenuItem onSelect={() => onApproveClick(item.loan)}>
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
                            {user?.role === 'Admin' && item.loan.status !== 'Active' && item.loan.status !== 'Overdue' && (
                                <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDelete(item.loan)} className="text-destructive">
                                    {item.loan.status === 'Pending' ? 'Cancel Application' : 'Delete Loan'}
                                </DropdownMenuItem>
                                </>
                            )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                </TableBody>
              )
            ))}
        </Table>
    )
}

export default function LoansPage() {
  const { loans, isLoaded, updateLoanStatus, approveLoanWithLedgerId, deleteLoan } = useLoans();
  const { customers, isLoaded: customersLoaded } = useCustomers();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const { logActivity } = useUserActivity();
  const [loanToDelete, setLoanToDelete] = React.useState<Loan | Loan[] | null>(null);
  const [loanToApprove, setLoanToApprove] = React.useState<Loan | null>(null);
  const [ledgerId, setLedgerId] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState('personal');


  const customerMap = React.useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  const filteredLoans = React.useMemo(() => {
    setIsSearching(true);
    if (!searchQuery) {
        setIsSearching(false);
        return [];
    }

    let loansToFilter = loans.filter(loan => 
        (currentTab === 'personal' && loan.loanType === 'Personal') ||
        (currentTab === 'group' && loan.loanType === 'Group')
    );
    
    const lowercasedQuery = searchQuery.toLowerCase();
    
    if (currentTab === 'group') {
        const groupLoanIds = new Set<string>();
        loansToFilter.forEach(loan => {
            if(loan.groupId) {
                const customer = customerMap.get(loan.customerId);
                if(customer?.phone.includes(lowercasedQuery) || loan.groupName?.toLowerCase().includes(lowercasedQuery) || loan.groupId.toLowerCase().includes(lowercasedQuery) || loan.id.toLowerCase().includes(lowercasedQuery)) {
                    groupLoanIds.add(loan.groupId);
                }
            }
        });
        loansToFilter = loans.filter(loan => loan.groupId && groupLoanIds.has(loan.groupId));
    } else { // personal
        loansToFilter = loansToFilter.filter(loan => {
            const customer = customerMap.get(loan.customerId);
            return customer?.phone.includes(lowercasedQuery) || customer?.name.toLowerCase().includes(lowercasedQuery) || loan.id.toLowerCase().includes(lowercasedQuery);
        });
    }
    
    setIsSearching(false);
    return loansToFilter;

  }, [searchQuery, loans, customerMap, currentTab]);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const onApproveClick = (loan: Loan) => {
    if (user?.role !== 'Admin') return;
    setLoanToApprove(loan);
  }

  const handleApprove = () => {
    if (!loanToApprove || !ledgerId.trim()) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Ledger Loan Number cannot be empty.",
        });
        return;
    }

    let success = false;
    let allSucceeded = true;
    if (loanToApprove.loanType === 'Group' && loanToApprove.groupId) {
        const groupLoans = loans.filter(l => l.groupId === loanToApprove.groupId);
        const groupLedgerId = ledgerId.trim();

        groupLoans.forEach((l, index) => {
           const newLedgerId = `${groupLedgerId}-${index + 1}`;
           const approvalSuccess = approveLoanWithLedgerId(l.id, newLedgerId, groupLedgerId);
            if (approvalSuccess) {
                logActivity('Approve Loan', `Approved loan ${l.id} with new ID ${newLedgerId}.`);
                success = true;
            } else {
                toast({
                    variant: "destructive",
                    title: "Approval Failed",
                    description: `A loan with the Ledger ID '${newLedgerId}' may already exist.`,
                });
                allSucceeded = false;
            }
        });

    } else {
        success = approveLoanWithLedgerId(loanToApprove.id, ledgerId.trim());
        if(success) {
            logActivity('Approve Loan', `Approved loan ${loanToApprove.id} with new ID ${ledgerId.trim()}.`);
        } else {
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: `A loan with the Ledger ID '${ledgerId.trim()}' already exists.`,
            });
        }
    }


    if (success && allSucceeded) {
        toast({
            title: 'Loan(s) Approved',
            description: `The application has been activated.`,
        });
    }
    
    setLoanToApprove(null);
    setLedgerId('');
  };

  const handlePreclose = (loanId: string) => {
    if (user?.role !== 'Admin') return;
    updateLoanStatus(loanId, 'Pre-closed');
    logActivity('Preclose Loan', `Pre-closed loan ${loanId}.`);
    toast({
      title: 'Loan Pre-closed',
      description: `Loan ${loanId} has been marked as pre-closed.`,
    });
  };

  const confirmDelete = () => {
    if (!loanToDelete || user?.role !== 'Admin') return;

    const loansToDelete = Array.isArray(loanToDelete) ? loanToDelete : [loanToDelete];

    loansToDelete.forEach(loan => {
        if (loan.status === 'Active' || loan.status === 'Overdue') {
            toast({
                variant: "destructive",
                title: "Deletion Not Allowed",
                description: `Active or Overdue loans cannot be deleted.`,
            });
            return;
        }
        deleteLoan(loan.id);
        logActivity('Delete Loan', `Deleted loan ${loan.id}.`);
    });

    const isGroup = Array.isArray(loanToDelete);
    const title = isGroup ? "Group Application Cancelled" : loanToDelete.status === 'Pending' ? 'Loan Application Cancelled' : 'Loan Deleted';
    const description = isGroup ? `The loan application for group ${loanToDelete[0].groupName} has been cancelled.` : `Loan ${loansToDelete[0].id} for ${loansToDelete[0].customerName} has been deleted.`;
    
    toast({
        title,
        description,
    });
    setLoanToDelete(null);
  };
  
  if (!isLoaded || !customersLoaded) {
    return (
        <Card>
            <CardHeader>
                <div className="space-y-2">
                    <Skeleton className="w-24 h-8" />
                    <Skeleton className="w-72 h-4" />
                </div>
                <div className="flex justify-between items-center pt-4">
                     <Skeleton className="h-10 w-[300px]" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-44 h-10" />
                        <Skeleton className="w-36 h-10" />
                    </div>
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

  const getDeleteDialogInfo = () => {
    if (!loanToDelete) return { title: 'Are you sure?', description: 'This action cannot be undone.'};
    
    const isGroup = Array.isArray(loanToDelete);
    if (isGroup) {
      return {
        title: `Cancel Group Application for ${loanToDelete[0].groupName}?`,
        description: 'This will cancel the pending loan applications for all members of this group. This action cannot be undone.'
      }
    }
    
    const loan = loanToDelete;
    if (loan.status === 'Pending') {
      return {
        title: 'Cancel Loan Application?',
        description: `This will permanently cancel the loan application ${loan.id} for ${loan.customerName}. This action cannot be undone.`
      }
    }

    return {
      title: 'Are you sure?',
      description: `This action will permanently delete the loan record ${loan.id} for ${loan.customerName}. This action cannot be undone.`
    }
  }
  const dialogInfo = getDeleteDialogInfo();


  return (
    <>
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <CardTitle>Loans</CardTitle>
          <CardDescription>
            Track and manage all loan applications.
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList>
              <TabsTrigger value="personal">Personal Loans</TabsTrigger>
              <TabsTrigger value="group">Group Loans</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={currentTab === 'personal' ? "Search by name, phone, or loan ID..." : "Search by group, phone, or ID..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 w-full"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {user?.role === 'Admin' && (
              <Link href="/dashboard/loans/new" passHref>
                <Button className="flex-shrink-0">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Loan
                </Button>
              </Link>
            )}
            
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LoanTable 
            loans={filteredLoans}
            customers={customers}
            user={user}
            onApproveClick={onApproveClick}
            handlePreclose={handlePreclose}
            handleDelete={setLoanToDelete}
            hasSearched={searchQuery.length > 0}
            isSearching={isSearching}
        />
      </CardContent>
    </Card>
     <AlertDialog open={!!loanToDelete} onOpenChange={(open) => !open && setLoanToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{dialogInfo.title}</AlertDialogTitle>
            <AlertDialogDescription>
                {dialogInfo.description}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                {Array.isArray(loanToDelete) || loanToDelete?.status === 'Pending' ? 'Yes, Cancel' : 'Yes, Delete'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <Dialog open={!!loanToApprove} onOpenChange={() => { setLoanToApprove(null); setLedgerId(''); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Approve {loanToApprove?.loanType} Loan Application</DialogTitle>
                <DialogDescription>
                    Enter the official ledger loan number base to approve this application. 
                    {loanToApprove?.loanType === 'Group' && ' Each member will get a sequential ID (e.g., LEDGER-1, LEDGER-2).'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ledger-id" className="text-right">
                        Ledger Number
                    </Label>
                    <Input
                        id="ledger-id"
                        value={ledgerId}
                        onChange={(e) => setLedgerId(e.target.value)}
                        className="col-span-3"
                        autoFocus
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setLoanToApprove(null); setLedgerId(''); }}>Cancel</Button>
                <Button onClick={handleApprove}>Approve</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
