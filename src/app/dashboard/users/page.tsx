
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, MoreHorizontal, FileDown, Calendar as CalendarIcon } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUserActivity, useCustomers, useLoans, useCollections } from '@/lib/data'
import * as XLSX from 'xlsx';
import { format, isWithinInterval, parseISO } from 'date-fns'
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'


type UserRole = 'Admin' | 'Collection Agent';

type User = {
    id: string;
    username: string;
    role: UserRole;
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

const editUserSchema = userSchema.omit({ password: true }).extend({
  role: z.enum(['Collection Agent']),
});


const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


const initialUsers: User[] = [
  { id: 'USR001', username: 'admin', role: 'Admin', lastLogin: '2024-07-29 10:00 AM' },
  { id: 'USR002', username: 'agent_ramesh', role: 'Collection Agent', lastLogin: '2024-07-29 09:30 AM' },
];

const getUsersFromStorage = (): User[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('users');
    return stored ? JSON.parse(stored) : initialUsers;
}

const setUsersInStorage = (users: User[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('users', JSON.stringify(users));
}

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
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
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

  const { toast } = useToast();

  useEffect(() => {
    const data = getUsersFromStorage();
    if (!localStorage.getItem('users')) {
      setUsersInStorage(data);
    }
    setUsers(data);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setLoggedInUser(JSON.parse(storedUser));
    }
    setDownloadHistory(getHistoryFromStorage());
    setIsLoaded(true);
  }, []);
  
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
    if (data.role === 'Admin' && users.some(u => u.role === 'Admin')) {
        toast({
            variant: 'destructive',
            title: 'Admin Limit Reached',
            description: 'Only one Admin user can be created.',
        });
        return;
    }
    
    const newUser: User = {
        id: `USR${String(Date.now()).slice(-3)}`,
        username: data.username,
        role: data.role,
        lastLogin: 'Never'
    }
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setUsersInStorage(updatedUsers);
    logActivity('Create User', `Created new user: ${data.username} with role ${data.role}.`);
    toast({
      title: 'User Created',
      description: `User ${data.username} with role ${data.role} has been created.`,
    });
    setCreateDialogOpen(false);
    createForm.reset();
  }

  function handleEditUser(data: z.infer<typeof editUserSchema>) {
    if (!userToEdit) return;

    const updatedUsers = users.map(u => u.id === userToEdit.id ? {...u, username: data.username, role: data.role } : u);
    setUsers(updatedUsers);
    setUsersInStorage(updatedUsers);
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
    const updatedUsers = users.filter(u => u.id !== userToDelete.id);
    setUsers(updatedUsers);
    setUsersInStorage(updatedUsers);
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
        role: 'Collection Agent',
    });
    setEditDialogOpen(true);
  }

  function openResetPasswordDialog(user: User) {
    setUserToEdit(user);
    setResetPasswordOpen(true);
  }

  const downloadAllData = () => {
    const range = dateRange?.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : null;

    const filteredCustomers = range ? customers.filter(c => isWithinInterval(parseISO(c.registrationDate), range)) : customers;
    const filteredLoans = range ? loans.filter(l => isWithinInterval(parseISO(l.disbursalDate), range)) : loans;
    const filteredCollections = range ? collections.filter(c => isWithinInterval(parseISO(c.date), range)) : collections;

    const customerSheet = XLSX.utils.json_to_sheet(filteredCustomers);
    const loanSheet = XLSX.utils.json_to_sheet(filteredLoans);
    const collectionSheet = XLSX.utils.json_to_sheet(filteredCollections);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');
    XLSX.utils.book_append_sheet(workbook, loanSheet, 'Loans');
    XLSX.utils.book_append_sheet(workbook, collectionSheet, 'Collections');
    
    const fromDate = range ? format(range.start, 'yyyy-MM-dd') : 'start';
    const toDate = range ? format(range.end, 'yyyy-MM-dd') : 'end';
    const filename = `LoanTrackLite_Data_${fromDate}_to_${toDate}.xlsx`;

    XLSX.writeFile(workbook, filename);
    
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


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Create and manage users with different roles and permissions.
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
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
                      <FormControl><Input type="password" placeholder="Enter password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Collection Agent">Collection Agent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                <TableCell>{user.lastLogin}</TableCell>
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
                      <DropdownMenuItem onSelect={() => openEditDialog(user)}>Edit User</DropdownMenuItem>
                       <DropdownMenuItem onSelect={() => openResetPasswordDialog(user)}>Reset Password</DropdownMenuItem>
                       {loggedInUser?.role === 'Admin' && user.username !== loggedInUser.username && (
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
          {loggedInUser?.role === 'Admin' && (
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
          )}
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
                <FormControl><Input placeholder="Enter username" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={editForm.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Collection Agent">Collection Agent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
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

    
