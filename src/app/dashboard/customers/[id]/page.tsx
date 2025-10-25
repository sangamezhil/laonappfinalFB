
'use client'

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getCustomerById, getLoansByCustomerId, Customer, Loan, useCollections, Collection, useCompanyProfile, useFinancials, useLoans } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { User, Briefcase, IndianRupee, Hash, Calendar, Phone, Cake, VenetianMask, FileText, Wallet, Percent, CalendarClock, FileDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn, getAvatarColor } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LoanWithDetails = Omit<Loan, 'nextDueDate'> & {
  nextDueDate: Date | null;
  collections: Collection[];
};

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile: companyProfile } = useCompanyProfile();
  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [loansWithDetails, setLoansWithDetails] = useState<LoanWithDetails[]>([]);
  const { collections } = useCollections();
  const { financials } = useFinancials();
  const { loans } = useLoans();
  
  useEffect(() => {
    if (customerId) {
      const cust = getCustomerById(customerId);
      if (cust) {
        setCustomer(cust);
        const customerLoans = getLoansByCustomerId(customerId);
        
        const detailedLoans = customerLoans.map(loan => {
          const installmentsPaid = loan.totalPaid > 0 && loan.weeklyRepayment > 0 ? Math.floor(loan.totalPaid / loan.weeklyRepayment) : 0;
          const startDate = new Date(loan.disbursalDate);
          let nextDueDate: Date | null = null;
          
          if (loan.status === 'Active' || loan.status === 'Overdue') {
            if (loan.collectionFrequency === 'Daily') {
              nextDueDate = addDays(startDate, installmentsPaid + 1);
            } else if (loan.collectionFrequency === 'Weekly') {
              nextDueDate = addDays(startDate, installmentsPaid + 8);
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
    }
  }, [customerId, collections]);

  const handleDownload = () => {
    if (!customer) return;

    const downloadableLoans = loansWithDetails.filter(loan => 
      loan.status === 'Active' || loan.status === 'Overdue'
    );

    if (downloadableLoans.length === 0) {
        alert('No active or overdue loans available to download.');
        return;
    }

    downloadableLoans.forEach(loan => {
        const doc = new jsPDF();
        
        // Header
        let headerCursorY = 20;
        
        const addTextHeader = () => {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(companyProfile.name, 14, headerCursorY);
            headerCursorY += 6;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(companyProfile.address, 14, headerCursorY);
            headerCursorY += 8;
        };

        if (companyProfile.logoUrl) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = companyProfile.logoUrl;
            img.onload = () => {
                doc.addImage(img, 'PNG', 14, 15, 18, 18);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(companyProfile.name, 38, 22);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(companyProfile.address, 38, 28);
                headerCursorY = 40;
                generatePdfContent(doc, headerCursorY, loan);
                doc.save(`Repayment_Schedule_${loan.id}_${customer.name}.pdf`);
            };
            img.onerror = () => {
                console.error("Error loading logo, falling back to text header.");
                addTextHeader();
                generatePdfContent(doc, headerCursorY, loan);
                doc.save(`Repayment_Schedule_${loan.id}_${customer.name}.pdf`);
            };
        } else {
            addTextHeader();
            generatePdfContent(doc, headerCursorY, loan);
            doc.save(`Repayment_Schedule_${loan.id}_${customer.name}.pdf`);
        }
    });
  };

  const generatePdfContent = (doc: jsPDF, startY: number, loan: LoanWithDetails) => {
    if (!customer) return;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Repayment Schedule', doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${format(new Date(), 'dd/MM/yyyy')}`, 195, 20, { align: 'right' });
    doc.text(`Page : 1`, 195, 25, { align: 'right' });

    let finalY = startY + 8;
    
    // Financial Summary calculation
    const totalInvestment = financials.investments.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = financials.expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalDisbursed = loans.filter(l => l.status !== 'Pending').reduce((acc, loan) => acc + loan.disbursalAmount, 0);
    const totalCollected = collections.reduce((acc, collection) => acc + collection.amount, 0);
    const availableCash = totalInvestment - totalExpenses - totalDisbursed + totalCollected;

    autoTable(doc, {
        startY: finalY,
        body: [
            [
                { content: 'Total Investment:', styles: { fontStyle: 'bold' } }, `Rs. ${totalInvestment.toLocaleString('en-IN')}`,
                { content: 'Total Expenses:', styles: { fontStyle: 'bold' } }, `Rs. ${totalExpenses.toLocaleString('en-IN')}`,
                { content: 'Available Cash:', styles: { fontStyle: 'bold' } }, `Rs. ${availableCash.toLocaleString('en-IN')}`
            ]
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1, halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 2: { halign: 'left' }, 4: { halign: 'left' } },
    didDrawPage: (data) => {
      doc.setDrawColor(200);
      // typings for autotable data are loose; cast to any to access runtime properties
      const d: any = data;
      doc.rect(d.settings.margin.left, d.cursor?.y ?? 0, doc.internal.pageSize.width - d.settings.margin.left - d.settings.margin.right, d.table?.height ?? 0);
    }
    });

    finalY = (doc as any).lastAutoTable.finalY + 8;


    autoTable(doc, {
        startY: finalY,
        body: [
            [
                { content: 'Customer:', styles: { fontStyle: 'bold' } },
                customer.name,
                { content: 'Phone Number:', styles: { fontStyle: 'bold' } },
                customer.phone,
            ],
            [
                { content: 'Loan Agreement Number:', styles: { fontStyle: 'bold' } },
                loan.id,
                { content: 'Loan Type:', styles: { fontStyle: 'bold' } },
                `${loan.loanType} Loan`,
            ],
            [
                { content: 'Tenure:', styles: { fontStyle: 'bold' } },
                `${loan.term} ${loan.collectionFrequency}s`,
                { content: 'Amount Financed:', styles: { fontStyle: 'bold' } },
                `Rs. ${loan.amount.toLocaleString('en-IN')}`,
            ],
             [
                { content: 'Installment Amount:', styles: { fontStyle: 'bold' } },
                `Rs. ${loan.weeklyRepayment.toLocaleString('en-IN')}`,
                { content: 'Frequency:', styles: { fontStyle: 'bold' } },
                 loan.collectionFrequency,
            ],
            [
                { content: 'Loan Status:', styles: { fontStyle: 'bold' } },
                loan.status,
                { content: '', styles: { fontStyle: 'bold' } },
                '',
            ],
        ],
        theme: 'plain',
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 40 },
          3: { cellWidth: 'auto' },
        }
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 8;
    
    if (loan.collections.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Instl No', 'Due Date', 'Installment Amount', 'Payment Method']],
            body: loan.collections.map((c, index) => [
                index + 1,
                format(new Date(c.date), 'dd/MM/yyyy'), 
                `Rs. ${c.amount.toLocaleString('en-IN')}`, 
                c.paymentMethod
            ]),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
            styles: { fontSize: 8 },
        });
        finalY = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.text('No payment history for this loan.', 14, finalY);
        finalY += 8;
    }

    autoTable(doc, {
        startY: finalY,
        theme: 'plain',
        body: [
            ['Total Paid:', `Rs. ${loan.totalPaid.toLocaleString('en-IN')}`],
            ['Balance Due:', `Rs. ${loan.outstandingAmount.toLocaleString('en-IN')}`],
        ],
        styles: { fontStyle: 'bold', fontSize: 8 }
    });
  }

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border">
                <AvatarFallback className={cn("text-xl font-bold", getAvatarColor(customer.name))}>
                    {customer.name.substring(0, 2)}
                </AvatarFallback>
                </Avatar>
                <div>
                <CardTitle className="text-3xl font-headline">{customer.name}</CardTitle>
                <CardDescription>{customer.email} • {customer.phone} / {customer.secondaryPhone}</CardDescription>
                </div>
            </div>
            <Button variant="outline" onClick={handleDownload}>
              <FileDown className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{customer.address}</span>
            </div>
             <div className="flex items-center gap-2">
              <VenetianMask className="w-4 h-4" />
              <span>Gender: <strong>{customer.gender}</strong></span>
            </div>
             <div className="flex items-center gap-2">
              <Cake className="w-4 h-4" />
              <span>Date of Birth: <strong>{customer.dob ? format(new Date(customer.dob), 'PPP') : 'N/A'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Occupation: <strong>{customer.occupation}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              <span>Monthly Income: <strong className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{customer.monthlyIncome.toLocaleString('en-IN')}</strong></span>
            </div>
             <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span>{customer.idType}: <strong>{customer.idNumber}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span>{customer.secondaryIdType}: <strong>{customer.secondaryIdNumber}</strong></span>
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
          {loansWithDetails.length > 0 ? (
            <Accordion type="single" collapsible className="w-full"
              {...loansWithDetails.length > 0 && {defaultValue: loansWithDetails[0].id}}
            >
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
                            loan.status === 'Pre-closed' ? 'outline' :
                            'outline'
                         } className={
                            loan.status === 'Closed' ? 'bg-green-600 text-white' : 
                            loan.status === 'Pre-closed' ? 'bg-blue-600 text-white' : ''
                         }>
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
                        
                        {(loan.status === 'Active' || loan.status === 'Overdue') &&
                          <div className="flex justify-end">
                            <Button onClick={() => window.location.href = `/dashboard/collections?loanId=${loan.id}`}>Record Payment</Button>
                          </div>
                        }

                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="text-center text-muted-foreground py-8">
                <FileText className="mx-auto w-12 h-12 mb-4" />
                <p>No loan history found for this customer.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
