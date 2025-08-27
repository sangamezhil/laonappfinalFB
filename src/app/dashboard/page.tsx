
'use client'

import * as React from 'react'
import { TrendingUp, Users, Landmark, AlertCircle, CheckCircle, Wallet, FileText, IndianRupee, UserCheck, User, Group, PiggyBank, CreditCard, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { useLoans, useCustomers, useCollections, useFinancials, Loan, Customer, User as AuthUser } from '@/lib/data'
import { format, parseISO, isToday } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Button } from '@/components/ui/button'


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

const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const formattedValue = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(payload.value);

    return (
        <g transform={`translate(${x},${y})`}>
            <foreignObject x={-70} y={-10} width={65} height={20} className="overflow-visible">
                <div className="flex items-center justify-end w-full gap-1 text-xs text-muted-foreground">
                    <IndianRupee className="w-3 h-3" />
                    <span>{formattedValue}</span>
                </div>
            </foreignObject>
        </g>
    );
};

function AdminDashboard() {
  const { loans, isLoaded: loansLoaded } = useLoans()
  const { customers, isLoaded: customersLoaded } = useCustomers()
  const { collections, isLoaded: collectionsLoaded } = useCollections();
  const { financials, isLoaded: financialsLoaded } = useFinancials();

  const chartData = React.useMemo(() => {
    if (!loansLoaded || !collectionsLoaded) return [];

    const monthlyData: { [key: string]: { month: string; disbursed: number; collected: number } } = {};

    loans.forEach(loan => {
      if (loan.status !== 'Pending') {
          const month = format(parseISO(loan.disbursalDate), 'yyyy-MM');
          if (!monthlyData[month]) {
            monthlyData[month] = { month: format(parseISO(loan.disbursalDate), 'MMM yyyy'), disbursed: 0, collected: 0 };
          }
          monthlyData[month].disbursed += loan.disbursalAmount;
      }
    });
    
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
    if (!loansLoaded || !financialsLoaded) return {
        totalCustomers: 0,
        activePersonalLoans: 0,
        activeGroupLoans: 0,
        overdueLoans: 0,
        closedLoans: 0,
        totalDisbursed: 0,
        totalOutstanding: 0,
        totalCollected: 0,
        totalInvestment: 0,
        totalExpenses: 0,
        availableCash: 0,
        recentLoans: [],
    };
    
    const activeLoans = loans.filter(l => l.status === 'Active');
    const activePersonalLoans = activeLoans.filter(l => l.loanType === 'Personal').length;
    const activeGroupLoans = new Set(activeLoans.filter(l => l.loanType === 'Group').map(l => l.groupId)).size;

    const overdueLoans = loans.filter(l => l.status === 'Overdue');
    const closedLoans = loans.filter(l => l.status === 'Closed' || l.status === 'Pre-closed');
    
    const totalDisbursed = loans.filter(l => l.status !== 'Pending').reduce((acc, loan) => acc + loan.disbursalAmount, 0);
    const totalOutstanding = loans.reduce((acc, loan) => acc + loan.outstandingAmount, 0);
    const totalCollected = loans.reduce((acc, loan) => acc + loan.totalPaid, 0);

    const availableCash = (financials.totalInvestment + totalCollected) - (totalDisbursed + financials.totalExpenses);

    const recentLoans = [...loans]
        .sort((a,b) => new Date(b.disbursalDate).getTime() - new Date(a.disbursalDate).getTime())
        .slice(0,5);

    return {
        totalCustomers: customers.length,
        activePersonalLoans,
        activeGroupLoans,
        overdueLoans: overdueLoans.length,
        closedLoans: closedLoans.length,
        totalDisbursed,
        totalOutstanding,
        totalCollected,
        totalInvestment: financials.totalInvestment,
        totalExpenses: financials.totalExpenses,
        availableCash,
        recentLoans,
    }

  }, [loans, customers, loansLoaded, financials, financialsLoaded])
  
   if (!loansLoaded || !customersLoaded || !collectionsLoaded || !financialsLoaded) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid gap-4 md:grid-cols-1">
                 <Skeleton className="h-40" />
            </div>
             <Skeleton className="h-80" />
             <Skeleton className="h-96" />
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Active Personal Loans</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activePersonalLoans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Group Loans</CardTitle>
            <Group className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeGroupLoans}</div>
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
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-500/20 text-blue-700"><PiggyBank/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Investment</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-500/20 text-orange-700"><CreditCard/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/20 text-green-700"><Banknote/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Available Cash</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.availableCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary"><TrendingUp/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Disbursed</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-accent/20 text-accent"><Wallet/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Outstanding</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 text-green-700 bg-green-500/20"><FileText/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Collected</p>
                        <p className="text-xl font-bold flex items-center"><IndianRupee className="w-5 h-5 mr-1" />{summary.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Monthly Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                          dataKey="month"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                      />
                      <YAxis 
                        tick={<CustomYAxisTick />}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="disbursed" fill="var(--color-disbursed)" radius={4} />
                      <Bar dataKey="collected" fill="var(--color-collected)" radius={4} />
                  </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
      </Card>

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
                      loan.status === 'Pre-closed' ? 'outline' :
                      'outline'
                    }
                    className={
                        loan.status === 'Closed' ? 'bg-green-600 text-white' : 
                        loan.status === 'Pre-closed' ? 'bg-blue-600 text-white' : ''
                    }
                    >
                      {loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(parseISO(loan.disbursalDate), 'PPP')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function AgentDashboard({ user }: { user: AuthUser }) {
    const { loans, isLoaded: loansLoaded } = useLoans();
    const { customers, isLoaded: customersLoaded } = useCustomers();

    const agentLoans = React.useMemo(() => {
        return loans.filter(loan => loan.assignedTo === user.username);
    }, [loans, user.username]);

    const summary = React.useMemo(() => {
        const activeLoans = agentLoans.filter(l => l.status === 'Active');
        const overdueLoans = agentLoans.filter(l => l.status === 'Overdue');
        const todaysCollections = agentLoans.filter(l => {
            if (!l.nextDueDate) return false;
            try {
                // The date from localStorage is a string 'YYYY-MM-DD', which parseISO handles correctly.
                return isToday(parseISO(l.nextDueDate));
            } catch (e) {
                console.error("Invalid date format for nextDueDate", l.nextDueDate);
                return false;
            }
        });

        return {
            activeLoans: activeLoans.length,
            overdueLoans: overdueLoans.length,
            todaysCollections: todaysCollections.length,
            todaysDueList: todaysCollections,
            overdueList: overdueLoans,
        };
    }, [agentLoans]);
    
    if (!loansLoaded || !customersLoaded) {
      return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
             <Skeleton className="h-80" />
             <Skeleton className="h-96" />
        </div>
      )
    }

    const getCustomer = (customerId: string): Customer | undefined => customers.find(c => c.id === customerId);

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle>Welcome, {user.username}!</CardTitle>
                    <CardDescription>Here is your summary for today.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
                        <Wallet className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.todaysCollections}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                        <UserCheck className="w-4 h-4 text-muted-foreground" />
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
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Today's Due Collections</CardTitle>
                    <CardDescription>Customers with payments scheduled for today.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Due Amount</TableHead>
                                <TableHead>Loan ID</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summary.todaysDueList.length > 0 ? summary.todaysDueList.map(loan => {
                                const customer = getCustomer(loan.customerId);
                                return (
                                    <TableRow key={loan.id}>
                                        <TableCell>{loan.customerName}</TableCell>
                                        <TableCell>{customer?.phone}</TableCell>
                                        <TableCell className='flex items-center'><IndianRupee className='w-4 h-4 mr-1'/>{loan.weeklyRepayment.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className='font-mono text-xs'>{loan.id}</TableCell>
                                        <TableCell>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/collections?loanId=${loan.id}`}>Collect</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">No collections due today.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Overdue Customers</CardTitle>
                    <CardDescription>Customers who have missed their payment deadlines.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Outstanding</TableHead>
                                <TableHead>Loan ID</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summary.overdueList.length > 0 ? summary.overdueList.map(loan => {
                                 const customer = getCustomer(loan.customerId);
                                return (
                                <TableRow key={loan.id}>
                                    <TableCell>{loan.customerName}</TableCell>
                                    <TableCell>{customer?.phone}</TableCell>
                                    <TableCell className='flex items-center text-destructive'><IndianRupee className='w-4 h-4 mr-1'/>{loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
                                    <TableCell className='font-mono text-xs'>{loan.id}</TableCell>
                                    <TableCell>
                                        <Button asChild variant="outline" size="sm">
                                           <Link href={`/dashboard/customers/${loan.customerId}`}>View Profile</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">No overdue loans.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function DashboardPage() {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('loggedInUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setIsLoading(false);
        }
    }, []);

    if (isLoading) {
        return (
             <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-96" />
            </div>
        )
    }

    if (user?.role === 'Admin') {
        return <AdminDashboard />;
    }

    if (user?.role === 'Collection Agent') {
        return <AgentDashboard user={user} />;
    }

    return (
      <div className="flex items-center justify-center h-full">
        <p>You do not have a role assigned. Please contact an administrator.</p>
      </div>
    );
}
