
'use client'

import React from 'react'
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
import { useCustomers, useLoans, useUserActivity } from '@/lib/data'
import { IndianRupee } from 'lucide-react'

const personalLoanSchema = z.object({
  customerId: z.string().nonempty({ message: 'Please select a customer.' }),
  loanAmount: z.coerce.number().positive(),
  collectionFrequency: z.enum(['Daily', 'Weekly', 'Monthly']),
  repaymentTerm: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(12).max(20),
  docCharges: z.coerce.number().nonnegative().optional(),
  insuranceCharges: z.coerce.number().nonnegative().optional(),
});

const groupLoanSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name is required.' }),
  groupLeaderId: z.string().nonempty({ message: 'Please select a group leader.' }),
  groupSize: z.enum(['5', '10', '15', '20']),
  loanAmount: z.coerce.number().positive(), // This is the total loan amount for the group
  interestRate: z.coerce.number().min(10).max(20),
  repaymentTerm: z.coerce.number().min(10).max(50),
  docCharges: z.coerce.number().nonnegative().optional(),
  insuranceCharges: z.coerce.number().nonnegative().optional(),
  members: z.array(z.object({ customerId: z.string().nonempty("Please select a member") })).min(1, 'Please add members'),
});

const DisbursalCalculator = ({ control, loanType }: { control: any, loanType: 'personal' | 'group' }) => {
  const [loanAmount, interestRate, docCharges, insuranceCharges, groupSize] = useWatch({
    control,
    name: ['loanAmount', 'interestRate', 'docCharges', 'insuranceCharges', 'groupSize'],
  });

  const principal = parseFloat(loanAmount) || 0;
  const size = parseInt(groupSize) || 1;
  const perMemberPrincipal = loanType === 'group' ? principal / size : principal;
  
  const interest = (perMemberPrincipal * (parseFloat(interestRate) || 0)) / 100;
  const docs = (parseFloat(docCharges) || 0) / (loanType === 'group' ? size : 1);
  const insurance = (parseFloat(insuranceCharges) || 0) / (loanType === 'group' ? size : 1);
  
  const totalDeductions = interest + docs + insurance;
  const disbursalAmount = perMemberPrincipal - totalDeductions;
  
  const totalGroupDisbursal = disbursalAmount * (loanType === 'group' ? size : 1);

  if (principal === 0) return null;

  return (
    <div className="p-4 mt-4 border rounded-lg bg-secondary/50">
      <h4 className="mb-2 font-semibold">Loan Calculation</h4>
      {loanType === 'group' && <div className="flex justify-between"><span>Total Group Principal:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{principal.toLocaleString('en-IN')}</span></div>}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Principal per Member:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{perMemberPrincipal.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Interest ({interestRate}%):</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{interest.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Doc Charges (per member):</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{docs.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Insurance (per member):</span> <span className='flex items-center'>- <IndianRupee className='w-4 h-4 mx-1'/>{insurance.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Net Disbursal per Member:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{disbursalAmount.toLocaleString('en-IN')}</span></div>
        {loanType === 'group' && size > 1 && (
            <div className="flex justify-between pt-2 mt-2 font-bold text-primary"><span>Total Net Disbursal for Group:</span> <span className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{totalGroupDisbursal.toLocaleString('en-IN')}</span></div>
        )}
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

  const personalForm = useForm<z.infer<typeof personalLoanSchema>>({ 
    resolver: zodResolver(personalLoanSchema),
    defaultValues: {
      collectionFrequency: 'Weekly',
      interestRate: 12,
      repaymentTerm: 10,
      loanAmount: '' as any,
      docCharges: '' as any,
      insuranceCharges: '' as any,
    }
  });

  const groupForm = useForm<z.infer<typeof groupLoanSchema>>({ 
    resolver: zodResolver(groupLoanSchema),
    defaultValues: {
      members: [],
      groupSize: '5',
      interestRate: 10,
      repaymentTerm: 10,
      loanAmount: '' as any,
      docCharges: '' as any,
      insuranceCharges: '' as any,
    }
   });

  const { fields, append, remove } = useFieldArray({
    control: groupForm.control,
    name: "members"
  });

  const groupSize = useWatch({ control: groupForm.control, name: 'groupSize' });
  const selectedMembers = useWatch({ control: groupForm.control, name: 'members' });
  const groupLeaderId = useWatch({ control: groupForm.control, name: 'groupLeaderId' });

  const availableCustomers = React.useMemo(() => {
    const activeLoanCustomerIds = new Set(loans.filter(l => l.status === 'Active' || l.status === 'Overdue').map(l => l.customerId));
    const selectedMemberIds = new Set(selectedMembers?.map(m => m.customerId).filter(Boolean));
    if(groupLeaderId) selectedMemberIds.add(groupLeaderId);
    
    return customers.filter(c => !activeLoanCustomerIds.has(c.id) && !selectedMemberIds.has(c.id));
  }, [customers, loans, selectedMembers, groupLeaderId]);

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


  const collectionFrequency = useWatch({
      control: personalForm.control,
      name: 'collectionFrequency',
  });

  React.useEffect(() => {
      if (collectionFrequency === 'Daily') {
          personalForm.setValue('interestRate', 20);
          personalForm.setValue('repaymentTerm', 70);
      } else if (collectionFrequency === 'Weekly') {
          personalForm.setValue('interestRate', 12);
          personalForm.setValue('repaymentTerm', 10);
      } else if (collectionFrequency === 'Monthly') {
          personalForm.setValue('interestRate', 20);
          personalForm.setValue('repaymentTerm', 1);
      }
  }, [collectionFrequency, personalForm]);


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

    const totalLoanValue = data.loanAmount;
    const repaymentAmount = totalLoanValue / data.repaymentTerm;

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
        outstandingAmount: totalLoanValue,
        collectionFrequency: data.collectionFrequency,
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

    const existingLoan = loans.find(l => l.customerId && allMemberIds.includes(l.customerId) && l.status !== 'Closed');
    if(existingLoan) {
        toast({ variant: 'destructive', title: "Member Has Active Loan", description: `One or more members in this group already have an active loan.` });
        return;
    }

    const size = parseInt(data.groupSize);
    const perMemberAmount = data.loanAmount / size;
    const weeklyRepayment = perMemberAmount / data.repaymentTerm;
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
            amount: perMemberAmount,
            interestRate: data.interestRate,
            term: data.repaymentTerm,
            status: 'Pending' as 'Pending',
            disbursalDate: new Date().toISOString().split('T')[0],
            weeklyRepayment: weeklyRepayment,
            totalPaid: 0,
            outstandingAmount: perMemberAmount,
            collectionFrequency: 'Weekly' as 'Weekly',
        };
    });
    
    const newLoans = addLoan(loansToCreate);
    logActivity('Create Group Loan', `Submitted group loan application for ${data.groupName} with ${newLoans.length} members.`);
    toast({ title: "Group Loan Submitted", description: `Individual loans for ${data.groupName} are now pending approval.` });
    router.push('/dashboard/loans');
  };

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
                        <SelectContent>{customers.filter(c => !loans.some(l => l.customerId === c.id && l.status !== 'Closed')).map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.id}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="loanAmount" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Loan Amount <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={personalForm.control} name="collectionFrequency" render={({ field }) => (
                    <FormItem><FormLabel>Collection Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="interestRate" render={({ field }) => (
                    <FormItem><FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="repaymentTerm" render={({ field }) => (
                    <FormItem><FormLabel>Repayment Term ({collectionFrequency === 'Daily' ? 'Days' : collectionFrequency === 'Weekly' ? 'Weeks' : 'Months'})</FormLabel>
                    <FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="docCharges" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Documentation Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="insuranceCharges" render={({ field }) => (
                    <FormItem><FormLabel className="flex items-center gap-1">Insurance Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
                        <FormItem><FormLabel>Interest Rate (%)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10% - 20%" /></SelectTrigger></FormControl>
                        <SelectContent>{Array.from({ length: 11 }, (_, i) => 10 + i).map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="repaymentTerm" render={({ field }) => (
                        <FormItem><FormLabel>Repayment Term (Weeks)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10 - 50 Weeks" /></SelectTrigger></FormControl>
                        <SelectContent>{[10, 12, 15, 20, 25, 30, 40, 50].map(term => <SelectItem key={term} value={String(term)}>{term} Weeks</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                     <FormField control={groupForm.control} name="docCharges" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1">Total Documentation Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="insuranceCharges" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center gap-1">Total Insurance Charges <IndianRupee className="w-4 h-4" /></FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="space-y-4">
                  <FormField control={groupForm.control} name="groupLeaderId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Leader</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a group leader" /></SelectTrigger></FormControl>
                           <SelectContent>{customers.filter(c => !loans.some(l => (l.customerId === c.id) && (l.status === 'Active' || l.status === 'Overdue'))).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                                  <FormControl><SelectTrigger><SelectValue placeholder={`Select Member ${index + 1}`} /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {availableCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
