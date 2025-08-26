
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
import { CalendarIcon, IndianRupee, Landmark, Users, Phone, Search, Trash2, MoreHorizontal, X, Group } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn, getAvatarColor } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
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
  loanOrGroupId: z.string().nonempty({ message: 'Please select a loan or group.' }),
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

type SelectedLoanInfo = {
    isGroup: boolean;
    id: string;
    name: string;
    loans: Loan[];
    totalDue: number;
    totalOutstanding: number;
    currentDueDate: Date | null;
    nextDueDate: Date | null;
}

type LoanOption = {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  groupName?: string;
  leaderName?: string;
}

function CollectionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { loans, updateLoanPayment } = useLoans();
  const { customers } = useCustomers();
  const { logActivity } = useUserActivity();
  const { collections, addCollection, deleteCollection } = useCollections();
  const [selectedInfo, setSelectedInfo] = useState<SelectedLoanInfo | null>(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [collectionToConfirm, setCollectionToConfirm] = useState<CollectionFormValues | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [filteredOptions, setFilteredOptions] = useState<LoanOption[]>([]);
  
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
  
  const allLoanOptions = React.useMemo(() => {
    const personalLoanOptions: LoanOption[] = activeAndOverdueLoans
      .filter(l => l.loanType === 'Personal')
      .map(loan => {
        const customer = customers.find(c => c.id === loan.customerId);
        return {
          id: loan.id,
          name: loan.customerName,
          phone: customer?.phone || '',
          isGroup: false,
        };
      });

    const groupLoanOptions: LoanOption[] = [];
    const groupMap = new Map<string, LoanOption>();
    activeAndOverdueLoans.forEach(loan => {
      if (loan.loanType === 'Group' && loan.groupId) {
        if (!groupMap.has(loan.groupId)) {
          const leaderCustomer = customers.find(c => c.name === loan.groupLeaderName);
          groupMap.set(loan.groupId, {
            id: loan.groupId,
            name: loan.groupName || 'Unnamed Group',
            phone: leaderCustomer?.phone || '',
            isGroup: true,
            leaderName: loan.groupLeaderName,
          });
        }
      }
    });

    return [...Array.from(groupMap.values()), ...personalLoanOptions];
  }, [activeAndOverdueLoans, customers]);
  
  useEffect(() => {
    setFilteredOptions(allLoanOptions);
  }, [allLoanOptions]);


  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      loanOrGroupId: '',
      amount: '' as any,
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    },
  });
  
  const { formState, setValue, control } = form;

  const selectedLoanOrGroupIdInForm = form.watch('loanOrGroupId');

  const updateSelectionDetails = useCallback((id: string | null) => {
    if (!id) {
        setSelectedInfo(null);
        return;
    }
    
    const isGroup = id.startsWith('GRP') || !id.startsWith('CUST') && !id.startsWith('TEMP');
    let info: SelectedLoanInfo | null = null;
    
    if (isGroup) {
      const groupLoans = loans.filter(l => l.groupId === id);
      if (groupLoans.length > 0) {
        const firstLoan = groupLoans[0];
        const { currentDueDate, nextDueDate } = firstLoan.nextDueDate ? { currentDueDate: parseISO(firstLoan.disbursalDate), nextDueDate: parseISO(firstLoan.nextDueDate)} : {currentDueDate: null, nextDueDate: null};
        const totalDue = groupLoans.reduce((acc, l) => acc + l.weeklyRepayment, 0);
        const totalOutstanding = groupLoans.reduce((acc, l) => acc + l.outstandingAmount, 0);
        
        info = {
            isGroup: true,
            id: id,
            name: firstLoan.groupName || 'Group',
            loans: groupLoans,
            totalDue,
            totalOutstanding,
            currentDueDate,
            nextDueDate
        };
        setValue('amount', totalDue, { shouldValidate: true });
      }
    } else { // Personal Loan
      const loan = loans.find(l => l.id === id);
      if (loan) {
        const { currentDueDate, nextDueDate } = loan.nextDueDate ? { currentDueDate: parseISO(loan.disbursalDate), nextDueDate: parseISO(loan.nextDueDate)} : {currentDueDate: null, nextDueDate: null};

        info = {
            isGroup: false,
            id: loan.id,
            name: loan.customerName,
            loans: [loan],
            totalDue: loan.weeklyRepayment,
            totalOutstanding: loan.outstandingAmount,
            currentDueDate,
            nextDueDate
        };
        setValue('amount', loan.weeklyRepayment, { shouldValidate: true });
      }
    }

    setSelectedInfo(info);
  }, [loans, setValue]);

  useEffect(() => {
    const idToProcess = loanIdFromQuery || selectedLoanOrGroupIdInForm;

    if (idToProcess && idToProcess !== (selectedInfo?.id ?? '')) {
      updateSelectionDetails(idToProcess);
      
      if (loanIdFromQuery) {
        setValue('loanOrGroupId', loanIdFromQuery, { shouldValidate: true, shouldDirty: true });
        const currentPath = window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: currentPath, url: currentPath }, '', currentPath);
      }
    } else if (!idToProcess && selectedInfo) {
        handleClear();
    }
  }, [loanIdFromQuery, selectedLoanOrGroupIdInForm, updateSelectionDetails, setValue, selectedInfo]);


  const handlePhoneSearch = () => {
    if (!phoneSearch || phoneSearch.length < 10) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    const results = allLoanOptions.filter(option => option.phone.includes(phoneSearch));
    
    if(results.length > 0) {
      setFilteredOptions(results);
      if (results.length === 1) {
        setValue('loanOrGroupId', results[0].id, { shouldValidate: true });
      }
      toast({title: `${results.length} result(s) found`, description: "Please select from the filtered list."})
    } else {
      setFilteredOptions([]);
      toast({ variant: 'destructive', title: 'No Match Found', description: 'No active loans found for this phone number.' });
    }
  };

  const handleClear = () => {
    form.reset({
      loanOrGroupId: '',
      amount: '' as any,
      paymentMethod: 'Cash',
      collectionDate: new Date(),
    });
    setValue('loanOrGroupId', '');
    setSelectedInfo(null);
    setPhoneSearch('');
    setFilteredOptions(allLoanOptions);
  }

  function onAttemptSubmit(data: CollectionFormValues) {
    if (!data.loanOrGroupId || !selectedInfo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a loan or group before recording a collection.' });
      return;
    }
    setCollectionToConfirm(data);
  }

  function handleConfirmCollection() {
    if (!collectionToConfirm || !selectedInfo) return;
    const data = collectionToConfirm;

    if (selectedInfo.isGroup) {
        updateLoanPayment(null, data.amount, selectedInfo.id);
        logActivity('Record Group Collection', `Recorded payment of ₹${data.amount} for group ${selectedInfo.name} (${selectedInfo.id}).`);
    } else {
        updateLoanPayment(selectedInfo.id, data.amount);
        logActivity('Record Collection', `Recorded payment of ₹${data.amount} for loan ${selectedInfo.id} (${selectedInfo.name}).`);
    }

    addCollection({
      loanId: selectedInfo.isGroup ? selectedInfo.id : selectedInfo.loans[0].id,
      customer: selectedInfo.name,
      amount: data.amount,
      date: format(data.collectionDate, 'yyyy-MM-dd'),
      paymentMethod: data.paymentMethod
    });

    toast({
      title: 'Collection Recorded',
      description: <>Payment of <IndianRupee className="inline-block w-4 h-4" /> {data.amount.toLocaleString('en-IN')} for {selectedInfo.name} has been recorded.</>,
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

  const getLoanDisplayName = (option: LoanOption) => {
    if(option.isGroup) {
      return `${option.name} - ${option.leaderName} (${option.phone})`;
    }
    return `${option.name} (${option.phone}) - ${option.id}`
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
                <CardDescription>Record a new payment from a customer or group.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(allLoanOptions.length === 0) && (
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
                            className="pl-9 pr-8"
                            disabled={allLoanOptions.length === 0}
                        />
                         {phoneSearch && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => {
                                  setPhoneSearch('');
                                  setFilteredOptions(allLoanOptions);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <Button type="button" onClick={handlePhoneSearch} disabled={(allLoanOptions.length === 0) || !phoneSearch}><Search className="w-4 h-4" /></Button>
                </div>

                <FormField control={form.control} name="loanOrGroupId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan / Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={allLoanOptions.length === 0}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a loan or group" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredOptions.filter(o => o.isGroup).length > 0 && <FormLabel className='px-2 py-1.5 text-xs font-semibold'>Groups</FormLabel>}
                        {filteredOptions.filter(o => o.isGroup).map(option => (
                          <SelectItem key={option.id} value={option.id}>{getLoanDisplayName(option)}</SelectItem>
                        ))}
                        {filteredOptions.filter(o => !o.isGroup).length > 0 && <FormLabel className='px-2 py-1.5 text-xs font-semibold'>Personal Loans</FormLabel>}
                        {filteredOptions.filter(o => !o.isGroup).map(option => (
                          <SelectItem key={option.id} value={option.id}>{getLoanDisplayName(option)}</SelectItem>
                        ))}
                        {filteredOptions.length === 0 && phoneSearch && <div className="text-sm text-center text-muted-foreground p-2">No matching loans found.</div>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedInfo && (
                  <Card className="bg-secondary/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        {selectedInfo.isGroup ? <Group className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        {selectedInfo.name} Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          Due Amount
                        </span>
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedInfo.totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Current Due Date
                        </span>
                        <span className="font-semibold">{selectedInfo.currentDueDate ? format(selectedInfo.currentDueDate, 'PPP') : 'N/A'}</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          Next Due Date
                        </span>
                        <span className="font-semibold">{selectedInfo.nextDueDate ? format(selectedInfo.nextDueDate, 'PPP') : 'N.A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><Landmark className="w-4 h-4" /> Outstanding</span>
                        <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{selectedInfo.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                       {selectedInfo.isGroup && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" /> Members</span>
                           <span className="font-semibold">{selectedInfo.loans.length}</span>
                         </div>
                       )}
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
                <Button type="submit" disabled={!selectedLoanOrGroupIdInForm || formState.isSubmitting}>Record Collection</Button>
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
                  <TableHead>Loan/Group ID</TableHead>
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
                  <span className="text-muted-foreground">Customer/Group:</span>
                  <span className="font-semibold">{selectedInfo?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-semibold font-mono text-xs">{selectedInfo?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold flex items-center"><IndianRupee className="w-4 h-4 mr-1" /> {collectionToConfirm?.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-semibold">{selectedInfo?.currentDueDate ? format(selectedInfo.currentDueDate, 'PPP') : 'N/A'}</span>
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
                This action cannot be undone. This will permanently delete the collection record for <span className="font-bold">{collectionToDelete?.customer}</span> of <IndianRupee className="inline-block w-4 h-4 mx-1" /> <span className="font-bold">{collectionToDelete?.amount.toLocaleString('en-IN')}</span>. This will also revert the collected amount from the loan balance.
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

    
