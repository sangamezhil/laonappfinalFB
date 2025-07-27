
'use client'

import * as React from 'react'
import { TrendingUp, Users, Landmark, AlertCircle, CheckCircle, Wallet, FileText, Trash2, IndianRupee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useLoans, useCustomers, useCollections } from '@/lib/data'
import { format, parseISO } from 'date-fns'


const chartConfig = {
  disbursed: {
    label: 'Disbursed',
    color: 'hsl(var(--primary))',
  },
  collected: {
    label: 'Collected',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const { loans, isLoaded: loansLoaded } = useLoans()
  const { customers, isLoaded: customersLoaded } = useCustomers()
  const { collections, isLoaded: collectionsLoaded } = useCollections();

  const chartData = React.useMemo(() => {
    if (!loansLoaded || !collectionsLoaded) return [];

    const monthlyData: { [key: string]: { month: string; disbursed: number; collected: number } } = {};

    // Process disbursements from loans
    loans.forEach(loan => {
      if (loan.status !== 'Pending') {
          const month = format(parseISO(loan.disbursalDate), 'yyyy-MM');
          if (!monthlyData[month]) {
            monthlyData[month] = { month: format(parseISO(loan.disbursalDate), 'MMM yyyy'), disbursed: 0, collected: 0 };
          }
          monthlyData[month].disbursed += loan.amount;
      }
    });
    
    // Process collections
    collections.forEach(collection => {
        const month = format(parseISO(collection.date), 'yyyy-MM');
        if (!monthlyData[month]) {
            monthlyData[month] = { month: format(parseISO(collection.date), 'MMM yyyy'), disbursed: 0, collected: 0 };
        }
        monthlyData[month].collected += collection.amount;
    });

    return Object.values(monthlyData).sort((a,b) => a.month.localeCompare(b.month));

  }, [loans, collections, loansLoaded, collectionsLoaded]);


  const summary = React.useMemo(() => {
    if (!loansLoaded) return {
        totalCustomers: 0,
        activeLoans: 0,
        overdueLoans: 0,
        closedLoans: 0,
        totalDisbursed: 0,
        totalOutstanding: 0,
        totalCollected: 0,
        recentLoans: [],
    };
    
    const activeLoans = loans.filter(l => l.status === 'Active');
    const overdueLoans = loans.filter(l => l.status === 'Overdue');
    const closedLoans = loans.filter(l => l.status === 'Closed');
    
    const totalDisbursed = loans.reduce((acc, loan) => acc + loan.amount, 0);
    const totalOutstanding = loans.reduce((acc, loan) => acc + loan.outstandingAmount, 0);
    const totalCollected = loans.reduce((acc, loan) => acc + loan.totalPaid, 0);

    const recentLoans = [...loans]
        .sort((a,b) => new Date(b.disbursalDate).getTime() - new Date(a.disbursalDate).getTime())
        .slice(0,5);

    return {
        totalCustomers: customers.length,
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
        closedLoans: closedLoans.length,
        totalDisbursed,
        totalOutstanding,
        totalCollected,
        recentLoans,
    }

  }, [loans, customers, loansLoaded])


  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Landmark className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdueLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Closed Loans</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.closedLoans}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary"><TrendingUp/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Disbursed</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalDisbursed.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-accent/20 text-accent"><Wallet/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Outstanding</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalOutstanding.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 text-green-700 bg-green-500/20"><FileText/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Collected</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalCollected.toLocaleString('en-IN')}</p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loan Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recentLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-mono text-xs">{loan.id}</TableCell>
                  <TableCell>{loan.customerName}</TableCell>
                  <TableCell className="flex items-center"><IndianRupee className="w-4 h-4 mr-1" />{loan.amount.toLocaleString('en-IN')}</TableCell>
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
                  <TableCell>{loan.disbursalDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
