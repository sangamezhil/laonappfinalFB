
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, MoreHorizontal, FileDown, Calendar as CalendarIcon, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useUserActivity, useCustomers, useLoans, useCollections, useCompanyProfile, useUsers, useFinancials } from '@/lib/data'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWithinInterval, parseISO } from 'date-fns'
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'


type User = {
    id: string;
    username: string;
    password?: string;
    role: 'Admin' | 'Collection Agent';
    lastLogin: string;
}

type LoggedInUser = {
  username: string;
  role: string;
}

type DownloadHistoryItem = {
    filename: string;
    date: string;
}

const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  role: z.enum(['Admin', 'Collection Agent']),
});

const editUserSchema = userSchema.omit({ password: true });

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


const getHistoryFromStorage = (): DownloadHistoryItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('downloadHistory');
    return stored ? JSON.parse(stored) : [];
}

const setHistoryInStorage = (history: DownloadHistoryItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('downloadHistory', JSON.stringify(history));
}

export default function UsersPage() {
  const { users, isLoaded, addUser, updateUser, deleteUser } = useUsers();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isResetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const { logActivity } = useUserActivity();
  const { customers } = useCustomers();
  const { loans } = useLoans();
  const { collections } = useCollections();
  const { profile: companyProfile } = useCompanyProfile();
  const { financials } = useFinancials();
  const router = useRouter();


  const { toast } = useToast();

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const agentCount = users.filter(u => u.role === 'Collection Agent').length;
  const isUserCreationDisabled = adminCount >= 1 && agentCount >= 2;


  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setLoggedInUser(parsedUser);
        if (parsedUser.role !== 'Admin') {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have permission to view this page.'
            });
            router.push('/dashboard');
            return;
        }
    } else {
        router.push('/login');
        return;
    }
    
    setDownloadHistory(getHistoryFromStorage());
  }, [router, toast]);
  
  const createForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', password: '', role: 'Collection Agent' },
  });

  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function handleCreateUser(data: z.infer<typeof userSchema>) {
    if (data.role === 'Admin' && adminCount >= 1) {
        createForm.setError("role", { type: "manual", message: "Admin role is full."});
        return;
    }
    if (data.role === 'Collection Agent' && agentCount >= 2) {
        createForm.setError("role", { type: "manual", message: "Collection Agent roles are full."});
        return;
    }
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
        createForm.setError("username", { type: "manual", message: "Username already exists."});
        return;
    }

    addUser({ username: data.username, password: data.password || data.username, role: data.role });
    logActivity('Create User', `Created new user: ${data.username}.`);
    toast({
      title: 'User Created',
      description: `User ${data.username} has been created.`,
    });
    setCreateDialogOpen(false);
    createForm.reset();
  }

  function handleEditUser(data: z.infer<typeof editUserSchema>) {
    if (!userToEdit) return;

    if (userToEdit.username === 'admin' && data.username !== 'admin') {
      toast({ variant: 'destructive', title: 'Action not allowed', description: 'Cannot change username of default admin.' });
      return;
    }

    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase() && u.id !== userToEdit.id)) {
        editForm.setError("username", { type: "manual", message: "Username already exists."});
        return;
    }

    updateUser(userToEdit.id, { username: data.username, role: data.role });
    logActivity('Edit User', `Updated user details for ${data.username}.`);
    toast({
      title: 'User Updated',
      description: `User ${data.username}'s details have been updated.`,
    });
    setEditDialogOpen(false);
    setUserToEdit(null);
  }

  function handleResetPassword(data: z.infer<typeof resetPasswordSchema>) {
    if (!userToEdit) return;
    
    updateUser(userToEdit.id, { password: data.password });

    logActivity('Reset Password', `Reset password for user ${userToEdit.username}.`);
    toast({
      title: 'Password Reset',
      description: `Password for ${userToEdit.username} has been updated.`,
    });
    setResetPasswordOpen(false);
    setUserToEdit(null);
    resetPasswordForm.reset();
  }

  function handleDeleteUser() {
    if (!userToDelete) return;
     if (userToDelete.username === 'admin') {
      toast({ variant: 'destructive', title: 'Action not allowed', description: 'Default admin user cannot be deleted.' });
      setUserToDelete(null);
      return;
    }
    deleteUser(userToDelete.id);
    logActivity('Delete User', `Deleted user: ${userToDelete.username}.`);
    toast({
        title: 'User Deleted',
        description: `User ${userToDelete.username} has been deleted.`,
    })
    setUserToDelete(null);
  }

  function openEditDialog(user: User) {
    setUserToEdit(user);
    editForm.reset({
        id: user.id,
        username: user.username,
        role: user.role,
    });
    setEditDialogOpen(true);
  }

  function openResetPasswordDialog(user: User) {
    setUserToEdit(user);
    setResetPasswordOpen(true);
  }

  const downloadAllData = () => {
    const doc = new jsPDF();
    const range = dateRange?.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : null;

    const filteredCustomers = range ? customers.filter(c => isWithinInterval(parseISO(c.registrationDate), range)) : customers;
    const filteredLoans = range ? loans.filter(l => isWithinInterval(parseISO(l.disbursalDate), range)) : loans;
    const filteredCollections = range ? collections.filter(c => isWithinInterval(parseISO(c.date), range)) : collections;
    const filteredInvestments = range ? financials.investments.filter(i => isWithinInterval(parseISO(i.date), range)) : financials.investments;
    const filteredExpenses = range ? financials.expenses.filter(e => isWithinInterval(parseISO(e.date), range)) : financials.expenses;


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

    const generatePdfContent = (startY: number) => {
        let finalY = startY;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Consolidated Data Report', doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });
        finalY += 8;
        
        doc.setFontSize(10);
        doc.text(`Date Range: ${range ? `${format(range.start!, 'dd/MM/yyyy')} to ${format(range.end!, 'dd/MM/yyyy')}`: 'All Time'}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });
        finalY += 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Financial Summary', 14, finalY);
        finalY += 5;

        // Financial Summary calculation
        const totalInvestment = filteredInvestments.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
        const totalDisbursed = filteredLoans.filter(l => l.status !== 'Pending').reduce((acc, loan) => acc + loan.disbursalAmount, 0);
        const totalCollected = filteredCollections.reduce((acc, collection) => acc + collection.amount, 0);
        const availableCash = totalInvestment - totalExpenses - totalDisbursed + totalCollected;

        autoTable(doc, {
            startY: finalY,
            body: [
                ['Total Investment:', `Rs. ${totalInvestment.toLocaleString('en-IN')}`],
                ['Total Expenses:', `Rs. ${totalExpenses.toLocaleString('en-IN')}`],
                ['Total Disbursed:', `Rs. ${totalDisbursed.toLocaleString('en-IN')}`],
                ['Total Collected:', `Rs. ${totalCollected.toLocaleString('en-IN')}`],
                ['Available Cash:', `Rs. ${availableCash.toLocaleString('en-IN')}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold' } },
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        const addSectionToPdf = (title: string, head: string[][], body: any[][]) => {
            if (body.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 14, finalY);
                finalY += 5;
                autoTable(doc, {
                    startY: finalY,
                    head: head,
                    body: body,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
                    styles: { fontSize: 8 },
                });
                finalY = (doc as any).lastAutoTable.finalY + 10;
            }
        };

        addSectionToPdf('Investments', [['Date', 'Description', 'Amount (Rs)']], filteredInvestments.map(i => [format(parseISO(i.date), 'dd/MM/yyyy'), i.description, i.amount.toLocaleString('en-IN')]));
        addSectionToPdf('Expenses', [['Date', 'Description', 'Amount (Rs)']], filteredExpenses.map(e => [format(parseISO(e.date), 'dd/MM/yyyy'), e.description, e.amount.toLocaleString('en-IN')]));
        addSectionToPdf('Customers', [['ID', 'Name', 'Mobile', 'ID Type', 'ID Number', 'Registered On']], filteredCustomers.map(c => [c.id, c.name, c.phone, c.idType, c.idNumber, c.registrationDate]));
        addSectionToPdf('Loans', [['ID', 'Customer', 'Type', 'Amount (Rs)', 'Status', 'Date']], filteredLoans.map(l => [l.id, l.customerName, l.loanType, l.amount.toLocaleString('en-IN'), l.status, l.disbursalDate]));
        addSectionToPdf('Collections', [['Loan ID', 'Customer', 'Amount (Rs)', 'Method', 'Date']], filteredCollections.map(c => [c.loanId, c.customer, c.amount.toLocaleString('en-IN'), c.paymentMethod, c.date]));
    };
    
    const fromDate = range ? format(range.start, 'yyyy-MM-dd') : 'start';
    const toDate = range ? format(range.end, 'yyyy-MM-dd') : 'end';
    const filename = `${companyProfile.name}_Data_${fromDate}_to_${toDate}.pdf`;

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
            generatePdfContent(40);
            doc.save(filename);
        };
        img.onerror = () => {
            addTextHeader();
            generatePdfContent(headerCursorY);
            doc.save(filename);
        };
    } else {
        addTextHeader();
        generatePdfContent(headerCursorY);
        doc.save(filename);
    }
    
    toast({
        title: 'Download Started',
        description: `${filename} is being downloaded.`,
    });
    
    const newHistoryItem: DownloadHistoryItem = { filename, date: new Date().toISOString() };
    const updatedHistory = [newHistoryItem, ...downloadHistory].slice(0, 5);
    setDownloadHistory(updatedHistory);
    setHistoryInStorage(updatedHistory);
    setDateRange(undefined);
  };

  if (!isLoaded || !loggedInUser || loggedInUser.role !== 'Admin') {
    return (
        <Card>
            <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                    <UserCog className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading user data or checking permissions...</p>
                    <Skeleton className="w-48 h-8" />
                </div>
            </CardContent>
        </Card>
    );
  }


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Create and manage user accounts. (1 Admin, 2 Agents max)
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div tabIndex={isUserCreationDisabled ? 0 : undefined}>
                    <DialogTrigger asChild>
                      <Button disabled={isUserCreationDisabled}>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                  </div>
                </TooltipTrigger>
                {isUserCreationDisabled && (
                  <TooltipContent>
                    <p>User limit reached (1 Admin, 2 Agents).</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user account.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4 py-4">
                  <FormField control={createForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input placeholder="Enter username" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={createForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Defaults to username if empty" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Admin" disabled={adminCount >= 1}>Admin (Limit: 1)</SelectItem>
                            <SelectItem value="Collection Agent" disabled={agentCount >= 2}>Collection Agent (Limit: 2)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">Create User</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.username === 'admin' && loggedInUser.username !== 'admin'}>
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                       <DropdownMenuItem onSelect={() => openEditDialog(user)}>Edit User</DropdownMenuItem>
                       <DropdownMenuItem onSelect={() => openResetPasswordDialog(user)}>Reset Password</DropdownMenuItem>
                       {loggedInUser?.username !== user.username && user.username !== 'admin' && (
                        <DropdownMenuItem onSelect={() => setUserToDelete(user)} className="text-destructive">Delete User</DropdownMenuItem>
                       )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
          <div className="pt-4 border-t w-full space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Data Exports</h3>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <Popover>
                      <PopoverTrigger asChild>
                      <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                          )}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                          dateRange.to ? (
                              <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                              </>
                          ) : (
                              format(dateRange.from, "LLL dd, y")
                          )
                          ) : (
                          <span>Pick a date range</span>
                          )}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                      />
                      </PopoverContent>
                  </Popover>
                  <Button variant="outline" onClick={downloadAllData}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Data
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Select a date range to export filtered data. If no range is selected, all data will be exported.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Last 5 Downloads</h3>
              {downloadHistory.length > 0 ? (
                  <ul className="space-y-2">
                      {downloadHistory.map((item, index) => (
                          <li key={index} className="text-sm flex justify-between items-center p-2 rounded-md bg-muted/50">
                              <span>{item.filename}</span>
                              <span className="text-muted-foreground">{format(parseISO(item.date), 'dd MMM yyyy, HH:mm')}</span>
                          </li>
                      ))}
                  </ul>
              ) : (
                  <p className="text-sm text-muted-foreground">No download history yet.</p>
              )}
            </div>
          </div>
      </CardFooter>
    </Card>

    <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user's details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4 py-4">
            <FormField control={editForm.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl><Input placeholder="Enter username" {...field} disabled={userToEdit?.username === 'admin'} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={userToEdit?.username === 'admin'}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Collection Agent">Collection Agent</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={isResetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Reset Password for {userToEdit?.username}</DialogTitle>
            <DialogDescription>
                Enter a new password for the user.
            </DialogDescription>
            </DialogHeader>
            <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4 py-4">
                <FormField control={resetPasswordForm.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={resetPasswordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancel</Button>
                    <Button type="submit">Reset Password</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user account for <span className="font-bold">{userToDelete?.username}</span>. You cannot delete your own account.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
