
'use client'

import Link from 'next/link'
import { PlusCircle, MoreHorizontal } from 'lucide-react'
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
import { useLoans } from '@/lib/data'

export default function LoansPage() {
  const { loans } = useLoans();
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
          <Link href="/dashboard/loans/new" passHref>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Loan Application
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan ID</TableHead>
              <TableHead>Customer / Group</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{loan.customerName}</div>
                  {loan.groupName && <div className="text-sm text-muted-foreground">{loan.groupName}</div>}
                </TableCell>
                <TableCell>{loan.loanType}</TableCell>
                <TableCell>₹{loan.amount.toLocaleString('en-IN')}</TableCell>
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
                <TableCell>₹{loan.outstandingAmount.toLocaleString('en-IN')}</TableCell>
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
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Record Payment</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
