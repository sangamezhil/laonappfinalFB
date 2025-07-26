
'use client'

import React, { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCustomers, useLoans } from '@/lib/data'

const personalLoanSchema = z.object({
  customerId: z.string().nonempty({ message: 'Please select a customer.' }),
  loanAmount: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(10).max(20),
  repaymentTerm: z.coerce.number().min(10).max(50),
  docCharges: z.coerce.number().nonnegative().optional(),
  insuranceCharges: z.coerce.number().nonnegative().optional(),
});

const groupLoanSchema = z.object({
  groupName: z.string().min(3, { message: 'Group name is required.' }),
  groupLeader: z.string().min(3, { message: 'Group leader is required.' }),
  groupSize: z.enum(['5', '10', '15', '20']),
  loanAmount: z.coerce.number().positive(),
  interestRate: z.coerce.number().min(10).max(20),
  repaymentTerm: z.coerce.number().min(10).max(50),
  docCharges: z.coerce.number().nonnegative(),
  insuranceCharges: z.coerce.number().nonnegative(),
  members: z.string().min(10, { message: 'Please list group members.' }),
});

const DisbursalCalculator = ({ control, loanType }: { control: any, loanType: 'personal' | 'group' }) => {
  const [loanAmount, interestRate, docCharges, insuranceCharges, groupSize] = useWatch({
    control,
    name: ['loanAmount', 'interestRate', 'docCharges', 'insuranceCharges', 'groupSize'],
  });

  const principal = parseFloat(loanAmount) || 0;
  const interest = (principal * (parseFloat(interestRate) || 0)) / 100;
  const docs = parseFloat(docCharges) || 0;
  const insurance = parseFloat(insuranceCharges) || 0;
  
  const totalDeductions = interest + docs + insurance;
  const disbursalAmount = principal - totalDeductions;
  const size = parseInt(groupSize) || 1;
  const perMemberAmount = disbursalAmount / size;

  if (principal === 0) return null;

  return (
    <div className="p-4 mt-4 border rounded-lg bg-secondary/50">
      <h4 className="mb-2 font-semibold">Loan Calculation</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Principal Amount:</span> <span>₹{principal.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Interest ({interestRate}%):</span> <span>- ₹{interest.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Documentation Charges:</span> <span>- ₹{docs.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Insurance Charges:</span> <span>- ₹{insurance.toLocaleString('en-IN')}</span></div>
        <div className="flex justify-between pt-2 mt-2 font-bold border-t"><span>Net Disbursal Amount:</span> <span>₹{disbursalAmount.toLocaleString('en-IN')}</span></div>
        {loanType === 'group' && size > 1 && (
            <div className="flex justify-between text-primary"><span>Amount per Member:</span> <span>₹{perMemberAmount.toLocaleString('en-IN')}</span></div>
        )}
      </div>
    </div>
  );
};


export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { customers } = useCustomers();
  const { addLoan } = useLoans();

  const personalForm = useForm<z.infer<typeof personalLoanSchema>>({ resolver: zodResolver(personalLoanSchema) });
  const groupForm = useForm<z.infer<typeof groupLoanSchema>>({ resolver: zodResolver(groupLoanSchema) });

  const onPersonalSubmit = (data: z.infer<typeof personalLoanSchema>) => {
    const customer = customers.find(c => c.id === data.customerId);
    if (!customer) {
        toast({ variant: 'destructive', title: "Customer not found" });
        return;
    }
    const weeklyRepayment = (data.loanAmount + (data.loanAmount * data.interestRate / 100)) / data.repaymentTerm;

    addLoan({
        customerId: data.customerId,
        customerName: customer.name,
        loanType: 'Personal',
        amount: data.loanAmount,
        interestRate: data.interestRate,
        term: data.repaymentTerm,
        status: 'Pending',
        disbursalDate: new Date().toISOString().split('T')[0],
        weeklyRepayment: weeklyRepayment,
        totalPaid: 0,
        outstandingAmount: data.loanAmount + (data.loanAmount * data.interestRate / 100)
    });
    toast({ title: "Personal Loan Submitted", description: `Loan for customer ID ${data.customerId} is now pending approval.` });
    router.push('/dashboard/loans');
  };

  const onGroupSubmit = (data: z.infer<typeof groupLoanSchema>) => {
    const weeklyRepayment = (data.loanAmount + (data.loanAmount * data.interestRate / 100)) / data.repaymentTerm;
    addLoan({
        customerId: `GRP_${data.groupName.replace(/\s/g, '')}`,
        customerName: data.groupLeader,
        groupName: data.groupName,
        loanType: 'Group',
        amount: data.loanAmount,
        interestRate: data.interestRate,
        term: data.repaymentTerm,
        status: 'Pending',
        disbursalDate: new Date().toISOString().split('T')[0],
        weeklyRepayment: weeklyRepayment,
        totalPaid: 0,
        outstandingAmount: data.loanAmount + (data.loanAmount * data.interestRate / 100)
    });
    toast({ title: "Group Loan Submitted", description: `Loan for ${data.groupName} is now pending approval.` });
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
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.id}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="loanAmount" render={({ field }) => (
                    <FormItem><FormLabel>Loan Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="interestRate" render={({ field }) => (
                    <FormItem><FormLabel>Interest Rate (%)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10% - 20%" /></SelectTrigger></FormControl>
                    <SelectContent>{Array.from({ length: 11 }, (_, i) => 10 + i).map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="repaymentTerm" render={({ field }) => (
                    <FormItem><FormLabel>Repayment Term (Weeks)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10 - 50 Weeks" /></SelectTrigger></FormControl>
                    <SelectContent>{[10, 12, 15, 20, 25, 30, 40, 50].map(term => <SelectItem key={term} value={String(term)}>{term} Weeks</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="docCharges" render={({ field }) => (
                    <FormItem><FormLabel>Documentation Charges (₹)</FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={personalForm.control} name="insuranceCharges" render={({ field }) => (
                    <FormItem><FormLabel>Insurance Charges (₹)</FormLabel><FormControl><Input type="number" placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormField control={groupForm.control} name="groupLeader" render={({ field }) => (
                        <FormItem><FormLabel>Group Leader</FormLabel><FormControl><Input placeholder="Enter group leader's name" {...field} /></FormControl><FormMessage /></FormItem>
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
                        <FormItem><FormLabel>Total Loan Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 200000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="interestRate" render={({ field }) => (
                        <FormItem><FormLabel>Interest Rate (%)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10% - 20%" /></SelectTrigger></FormControl>
                        <SelectContent>{Array.from({ length: 11 }, (_, i) => 10 + i).map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="repaymentTerm" render={({ field }) => (
                        <FormItem><FormLabel>Repayment Term (Weeks)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="10 - 50 Weeks" /></SelectTrigger></FormControl>
                        <SelectContent>{[10, 12, 15, 20, 25, 30, 40, 50].map(term => <SelectItem key={term} value={String(term)}>{term} Weeks</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="docCharges" render={({ field }) => (
                        <FormItem><FormLabel>Documentation Charges (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter doc charges" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="insuranceCharges" render={({ field }) => (
                        <FormItem><FormLabel>Insurance Charges (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter insurance charges" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={groupForm.control} name="members" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Group Members</FormLabel><FormControl><Textarea placeholder="List all group members, one per line." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
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
