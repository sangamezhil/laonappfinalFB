'use client'

import * as React from 'react'
import { TrendingUp, Users, Landmark, AlertCircle, CheckCircle, Wallet, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'

const chartData = [
  { month: 'January', disbursed: 186000, collected: 80000 },
  { month: 'February', disbursed: 305000, collected: 200000 },
  { month: 'March', disbursed: 237000, collected: 120000 },
  { month: 'April', disbursed: 73000, collected: 190000 },
  { month: 'May', disbursed: 209000, collected: 130000 },
  { month: 'June', disbursed: 214000, collected: 140000 },
]

const chartConfig = {
  disbursed: {
    label: 'Disbursed (₹)',
    color: 'hsl(var(--primary))',
  },
  collected: {
    label: 'Collected (₹)',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig

const recentLoans = [
  { id: 'LOAN005', customer: 'Sita Devi', amount: '₹30,000', status: 'Pending', date: '2024-07-28' },
  { id: 'LOAN001', customer: 'Ravi Kumar', amount: '₹50,000', status: 'Active', date: '2024-07-25' },
  { id: 'LOAN002', customer: 'Priya Sharma', amount: '₹25,000', status: 'Overdue', date: '2024-07-22' },
  { id: 'LOAN004', customer: 'Sahara Group', amount: '₹2,00,000', status: 'Active', date: '2024-07-20' },
  { id: 'LOAN003', customer: 'Ravi Kumar', amount: '₹1,00,000', status: 'Closed', date: '2024-07-15' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,254</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Landmark className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">832</div>
            <p className="text-xs text-muted-foreground">+15 since last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">48</div>
            <p className="text-xs text-muted-foreground">-5 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Closed Loans</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,731</div>
            <p className="text-xs text-muted-foreground">+50 this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Disbursement & Collection Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="disbursed" fill="var(--color-disbursed)" radius={4} />
                <Bar dataKey="collected" fill="var(--color-collected)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20 text-primary"><TrendingUp/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Disbursed</p>
                        <p className="text-xl font-bold">₹12,27,000</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-accent/20 text-accent"><Wallet/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Outstanding</p>
                        <p className="text-xl font-bold">₹8,45,500</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="p-2 text-green-700 bg-green-500/20"><FileText/></div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Collected</p>
                        <p className="text-xl font-bold">₹3,81,500</p>
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
              {recentLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.id}</TableCell>
                  <TableCell>{loan.customer}</TableCell>
                  <TableCell>{loan.amount}</TableCell>
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
                  <TableCell>{loan.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
