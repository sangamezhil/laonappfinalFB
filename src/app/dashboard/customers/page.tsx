
'use client';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCustomers } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersPage() {
  const { customers, isLoaded } = useCustomers();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage your customers and view their loan histories.</CardDescription>
          </div>
          <Link href="/dashboard/customers/new" passHref>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>ID Type</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Registered On</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoaded ? (
               Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="grid gap-1">
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-32 h-3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="w-24 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-20 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-28 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-24 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-8 h-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="hidden w-10 h-10 sm:flex">
                        <AvatarImage src={customer.profilePicture} alt={customer.name} data-ai-hint="person avatar" />
                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-0.5">
                        <Link href={`/dashboard/customers/${customer.id}`} className="font-medium hover:underline">
                          {customer.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.occupation}</TableCell>
                  <TableCell>{customer.idType}</TableCell>
                  <TableCell>{customer.idNumber}</TableCell>
                  <TableCell>{customer.registrationDate}</TableCell>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
