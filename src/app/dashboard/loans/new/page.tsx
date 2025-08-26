
'use client'

import React, { useCallback, useMemo } from 'react'
import { useForm, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCustomers, useLoans, useUserActivity, Customer } from '@/lib/data'
import { IndianRupee } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const personalLoanSchema = z.object({
  customerId: z.string().nonempty({ message: 'Please select a customer.' }),
  loanAmount: z.coerce.number().positive(),
  collectionFrequency: z.enum(['Weekly']),
  repaymentTerm: z.literal(40),
  interestRate: z.literal(30),
  docCharges: z.coerce.number().positive({ message: 'Documentation charges are required.' }),
  insuranceCharges: z.coerce.number().positive({ message: 'Insurance charges are required.' }),
});

const groupLoanSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name is required.' }),
  groupLeaderId: z.string().nonempty({ message: 'Please select a group leader.' }),
  groupSize: z.enum(['5', '10', '15', '20']),
  loanAmount: z.coerce.number().positive(),
  interestRate: z.literal(30),
  repaymentTerm: z.literal(40),
  docCharges: z.coerce.number().positive({ message: 'Documentation charges are required.' }),
  insuranceCharges: z.coerce.number().positive({ message: 'Insurance charges are required.' }),
  members: z.array(z.object({ customerId: z.string().nonempty("Please select a member") })).min(1, 'Please add members'),
});

type User = {
  username: string;
  role: string;
}

const DisbursalCalculator = ({ control, loanType }: { control: any; loanType: 'personal' | 'group' }) => {
  const [loanAmount, interestRate, docCharges, insuranceCharges, groupSize, repaymentTerm] = useWatch({
    control,
    name: [
      'loanAmount',
      'interestRate',
      'docCharges',
      'insuranceCharges',
      'groupSize',
      'repaymentTerm',
    ],
  });

  const principal = parseFloat(loanAmount) || 0;
  if (principal === 0) return null;
  const term = parseInt(repaymentTerm) || 1;

  if (loanType === 'group') {
    const size = parseInt(groupSize) || 1;
    const perMemberPrincipal = principal / size;
    const docsPerMember = (parseFloat(docCharges) || 0) / size;
    const insurancePerMember = (parseFloat(insuranceCharges) || 0) / size;
    
    const totalDeductionsPerMember = docsPerMember + insurancePerMember;
    const disbursalAmountPerMember = perMemberPrincipal - totalDeductionsPerMember;
    const totalGroupDisbursal = disbursalAmountPerMember * size;
    
    const interestPerMember = (perMemberPrincipal * (parseFloat(interestRate) || 0)) / 100;
    const totalRepayablePerMember = perMemberPrincipal + interestPerMember;
    const repaymentAmountPerMember = totalRepayablePerMember / term;

    return (
      <div className="p-4 mt-4 border rounded-lg bg-secondary/50">
        <h4 className="mb-2 font-semibold">Loan Calculation (per Member)</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Principal per Member:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{perMemberPrincipal.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Doc Charges (per member):</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{docsPerMember.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Insurance (per member):</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{insurancePerMember.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Net Disbursal per Member:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{disbursalAmountPerMember.toLocaleString('en-IN')}</span></div>
          {size > 1 && (
              <div className="flex justify-between pt-2 mt-2 font-bold text-primary"><span>Total Net Disbursal for Group:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{totalGroupDisbursal.toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Total Repayable per Member (Principal + Interest):</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{totalRepayablePerMember.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between pt-2 mt-2 font-bold text-green-700 border-t border-green-300">
              <span>Weekly Repayment Amount per Member:</span> 
              <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{repaymentAmountPerMember.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    );
  }

  // Personal Loan Calculation
  const docs = parseFloat(docCharges) || 0;
  const insurance = parseFloat(insuranceCharges) || 0;
  const totalDeductions = docs + insurance;
  const disbursalAmount = principal - totalDeductions;
  
  const interest = (principal * (parseFloat(interestRate) || 0)) / 100;
  const totalRepayable = principal + interest;
  const repaymentAmount = totalRepayable / term;
  
  return (
    <div className="p-4 mt-4 border rounded-lg bg-secondary/50">
      <h4 className="mb-2 font-semibold">Loan Calculation</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Principal Amount:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{principal.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Doc Charges:</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{docs.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Insurance:</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{insurance.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Net Disbursal Amount:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{disbursalAmount.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Total Repayable Amount (Principal + Interest):</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{totalRepayable.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between pt-2 mt-2 font-bold text-green-700 border-t border-green-300">
            <span>Weekly Repayment Amount:</span> 
            <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{repaymentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};


export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { customers } = useCustomers();
  const { loans, addLoan } = useLoans();
  const { logActivity } = useUserActivity();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } else {
        router.push('/login');
      }
    }
  }, [router]);


  const personalForm = useForm<z.infer<typeof personalLoanSchema>>({ 
    resolver: zodResolver(personalLoanSchema),
    defaultValues: {
      collectionFrequency: 'Weekly',
      interestRate: 30,
      repaymentTerm: 40,
      loanAmount: undefined,
      docCharges: undefined,
      insuranceCharges: undefined,
    }
  });

  const groupForm = useForm<z.infer<typeof groupLoanSchema>>({ 
    resolver: zodResolver(groupLoanSchema),
    defaultValues: {
      members: [],
      groupSize: '5',
      interestRate: 30,
      repaymentTerm: 40,
      loanAmount: undefined,
      docCharges: undefined,
      insuranceCharges: undefined,
    }
   });

  const { fields, append, remove } = useFieldArray({
    control: groupForm.control,
    name: "members"
  });

  const groupSize = useWatch({ control: groupForm.control, name: 'groupSize' });
  const selectedMembers = useWatch({ control: groupForm.control, name: 'members' });
  const groupLeaderId = useWatch({ control: groupForm.control, name: 'groupLeaderId' });

  const eligibleCustomers = useMemo(() => {
    const activeLoanCustomerIds = new Set(loans.filter(l => l.status === 'Active' || l.status === 'Overdue').map(l => l.customerId));
    return customers.filter(c => !activeLoanCustomerIds.has(c.id));
  }, [customers, loans]);
  
  const getAvailableMembers = useCallback((currentIndex: number): Customer[] => {
      const selectedMemberIds = new Set(selectedMembers?.map((m, i) => i === currentIndex ? null : m.customerId).filter(Boolean));
      if (groupLeaderId) selectedMemberIds.add(groupLeaderId);
      
      return eligibleCustomers.filter(c => !selectedMemberIds.has(c.id));
  }, [eligibleCustomers, groupLeaderId, selectedMembers]);


  React.useEffect(() => {
    const size = parseInt(groupSize) -1; // -1 because leader is separate
    if (fields.length > size) {
      for (let i = fields.length - 1; i >= size; i--) {
        remove(i);
      }
    } else if (fields.length < size) {
      for (let i = fields.length; i < size; i++) {
        append({ customerId: "" }, { shouldFocus: false });
      }
    }
  }, [groupSize, fields, append, remove]);


  const onPersonalSubmit = (data: z.infer<typeof personalLoanSchema>) => {
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) {
        toast({ variant: 'destructive', title: "Customer not found" });
        return;
    }

    const existingLoan = loans.find(l => l.customerId === data.customerId && l.status !== 'Closed');
    if (existingLoan) {
        toast({ variant: 'destructive', title: "Loan Exists", description: `${customer.name} already has an active loan (${existingLoan.id}).` });
        return;
    }

    const interest = (data.loanAmount * data.interestRate) / 100;
    const totalRepayable = data.loanAmount + interest;
    const repaymentAmount = totalRepayable / data.repaymentTerm;

    const newLoans = addLoan({
        customerId: data.customerId,
        customerName: customer.name,
        loanType: 'Personal',
        amount: data.loanAmount,
        interestRate: data.interestRate,
        term: data.repaymentTerm,
        status: 'Pending',
        disbursalDate: new Date().toISOString().split('T')[0],
        weeklyRepayment: repaymentAmount,
        totalPaid: 0,
        outstandingAmount: totalRepayable,
        collectionFrequency: data.collectionFrequency,
        assignedTo: 'agent',
    });
    const newLoan = Array.isArray(newLoans) ? newLoans[0] : newLoans;
    logActivity('Create Personal Loan', `Submitted loan application ${newLoan.id} for ${customer.name}.`);
    toast({ title: "Personal Loan Submitted", description: `Loan for customer ${customer.name} is now pending approval.` });
    router.push('/dashboard/loans');
  };

  const onGroupSubmit = (data: z.infer<typeof groupLoanSchema>) => {
    const leader = customers.find(c => c.id === data.groupLeaderId);
    if (!leader) {
      toast({ variant: "destructive", title: "Group Leader not found" });
      return;
    }
    const allMemberIds = [data.groupLeaderId, ...data.members.map(m => m.customerId)];
    if(new Set(allMemberIds).size !== allMemberIds.length) {
      toast({ variant: "destructive", title: "Duplicate Members", description: "Each customer can only be in the group once." });
      return;
    }
  
    const activeLoanCustomerIds = new Set(loans.filter(l => l.status === 'Active' || l.status === 'Overdue').map(l => l.customerId));
    const membersWithActiveLoans = allMemberIds.filter(id => activeLoanCustomerIds.has(id));

    if(membersWithActiveLoans.length > 0) {
        const memberNames = membersWithActiveLoans.map(id => customers.find(c => c.id === id)?.name || id).join(', ');
        toast({ 
            variant: 'destructive', 
            title: "Members Have Active Loans", 
            description: `The following members already have active or overdue loans: ${memberNames}.`
        });
        return;
    }

    const size = parseInt(data.groupSize);
    const perMemberPrincipal = data.loanAmount / size;
    const interestPerMember = (perMemberPrincipal * data.interestRate) / 100;
    const totalRepayablePerMember = perMemberPrincipal + interestPerMember;
    const weeklyRepayment = totalRepayablePerMember / data.repaymentTerm;

    const groupId = `GRP_${data.groupName.replace(/\s/g, '')}_${Date.now()}`;

    const loansToCreate = allMemberIds.map(memberId => {
        const member = customers.find(c => c.id === memberId);
        return {
            customerId: member!.id,
            customerName: member!.name,
            groupName: data.groupName,
            groupId: groupId,
            groupLeaderName: leader.name,
            loanType: 'Group' as 'Group',
            amount: perMemberPrincipal,
            interestRate: data.interestRate,
            term: data.repaymentTerm,
            status: 'Pending' as 'Pending',
            disbursalDate: new Date().toISOString().split('T')[0],
            weeklyRepayment: weeklyRepayment,
            totalPaid: 0,
            outstandingAmount: totalRepayablePerMember,
            collectionFrequency: 'Weekly' as 'Weekly',
            assignedTo: 'agent',
        };
    });
    
    const newLoans = addLoan(loansToCreate);
    logActivity('Create Group Loan', `Submitted group loan application for ${data.groupName} with ${newLoans.length} members.`);
    toast({ title: "Group Loan Submitted", description: `Individual loans for ${data.groupName} are now pending approval.` });
    router.push('/dashboard/loans');
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
            <p>Loading...</p>
            <Skeleton className="w-full h-64" />
        </CardContent>
    </Card>
    )
  }

  if (user.role !== 'Admin') {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to create new loans.</CardDescription>
            </CardHeader>
             <CardContent>
                <Button onClick={() => router.back()}>Go Back</Button>
            </CardContent>
        </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Loan Application</CardTitle>
        <CardDescription>Select loan type and fill in the details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Personal Loan</TabsTrigger>
            <TabsTrigger value="group">Group Loan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <Form {...personalForm}>
              <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={personalForm.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a registered customer" /></SelectTrigger></FormControl>
                        <SelectContent>{eligibleCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.id}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="loanAmount" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Loan Amount <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={personalForm.control} name="collectionFrequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Frequency</FormLabel>
                      <FormControl>
                        <Input readOnly {...field} value="Weekly" className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={personalForm.control} name="repaymentTerm" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Repayment Term (Weeks)</FormLabel>
                        <FormControl>
                            <Input readOnly value="40 Weeks" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="interestRate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                            <Input readOnly value="30%" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={personalForm.control} name="docCharges" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Documentation Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Enter doc charges" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="insuranceCharges" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Insurance Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Enter insurance charges" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DisbursalCalculator control={personalForm.control} loanType="personal" />
                <CardFooter className="px-0 pt-6 flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button><Button type="submit">Submit Application</Button></CardFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="group">
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-6 pt-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={groupForm.control} name="groupName" render={({ field }) => (
                        <FormItem><FormLabel>Group Name</FormLabel><FormControl><Input placeholder="Enter group name" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="groupSize" render={({ field }) => (
                        <FormItem><FormLabel>Group Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select group size" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="5">5 Members</SelectItem>
                            <SelectItem value="10">10 Members</SelectItem>
                            <SelectItem value="15">15 Members</SelectItem>
                            <SelectItem value="20">20 Members</SelectItem>
                        </SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="loanAmount" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1">Total Group Loan Amount <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="e.g., 200000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="interestRate" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Interest Rate (%)</FormLabel>
                          <FormControl>
                              <Input readOnly value="30%" className="bg-muted" />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={groupForm.control} name="repaymentTerm" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Repayment Term (Weeks)</FormLabel>
                            <FormControl>
                                <Input readOnly value="40 Weeks" className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={groupForm.control} name="docCharges" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1">Documentation Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Enter doc charges" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="insuranceCharges" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1">Insurance Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Enter insurance charges" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="space-y-4">
                  <FormField control={groupForm.control} name="groupLeaderId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Leader</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group leader">
                                {field.value ? eligibleCustomers.find(c => c.id === field.value)?.name : "Select a group leader"}
                                </SelectValue>
                            </SelectTrigger>
                            </FormControl>
                           <SelectContent>{getAvailableMembers(-1).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div>
                      <FormLabel>Group Members (excluding leader)</FormLabel>
                      <div className="space-y-2 mt-2">
                        {fields.map((item, index) => (
                           <FormField key={item.id} control={groupForm.control} name={`members.${index}.customerId`} render={({ field }) => (
                            <FormItem>
                               <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={`Select Member ${index + 1}`}>
                                        {field.value ? customers.find(c => c.id === field.value)?.name : `Select Member ${index + 1}`}
                                      </SelectValue>
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {getAvailableMembers(index).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                               <FormMessage />
                             </FormItem>
                          )} />
                        ))}
                      </div>
                    </div>
                </div>
                <DisbursalCalculator control={groupForm.control} loanType="group" />
                <CardFooter className="px-0 pt-6 flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button><Button type="submit">Submit Application</Button></CardFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
