
'use client';

import React from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCustomers, useLoans, Customer } from '@/lib/data'
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type User = {
  username: string;
  role: string;
}

export default function CustomersPage() {
  const { customers, deleteCustomer, isLoaded } = useCustomers();
  const { loans } = useLoans();
  const { toast } = useToast();
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const handleDeleteClick = (customer: Customer) => {
    const activeLoans = loans.filter(loan => loan.customerId === customer.id && (loan.status === 'Active' || loan.status === 'Overdue' || loan.status === 'Pending'));
    if (activeLoans.length > 0) {
      toast({
        variant: "destructive",
        title: "Deletion Not Allowed",
        description: `${customer.name} has active loans and cannot be deleted.`,
      });
    } else {
      setCustomerToDelete(customer);
    }
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      toast({
        title: 'Customer Deleted',
        description: `${customerToDelete.name} has been successfully deleted.`,
      });
      setCustomerToDelete(null);
    }
  };
  
  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Manage your customers and view their loan histories.</CardDescription>
          </div>
          {user?.role === 'Admin' && (
            <Link href="/dashboard/customers/new" passHref>
                <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Customer
                </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
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
                    <div className="grid gap-1">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-32 h-3" />
                    </div>
                  </TableCell>
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
                    <div className="grid gap-0.5">
                      <Link href={`/dashboard/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">{customer.email}</div>
                    </div>
                  </TableCell>
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
                        {user?.role === 'Admin' && (
                            <DropdownMenuItem onSelect={() => handleDeleteClick(customer)} className="text-destructive">Delete</DropdownMenuItem>
                        )}
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

    <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer account for <span className="font-bold">{customerToDelete?.name}</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
