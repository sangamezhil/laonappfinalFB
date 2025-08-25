
'use client';
import { useState, useEffect, useCallback } from 'react';
import { addDays, addWeeks, addMonths, parseISO, isToday, isBefore, startOfToday } from 'date-fns';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  address: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  idType: 'Aadhaar Card' | 'PAN Card' | 'Ration Card' | 'Voter ID' | 'Bank Passbook' | 'Gas Book';
  idNumber: string;
  secondaryIdType: 'Aadhaar Card' | 'PAN Card' | 'Ration Card' | 'Voter ID' | 'Bank Passbook' | 'Gas Book';
  secondaryIdNumber: string;
  occupation: string;
  monthlyIncome: number;
  profilePicture: string;
  registrationDate: string;
};

export type Loan = {
  id: string;
  customerId: string;
  customerName: string;
  groupName?: string;
  groupId?: string;
  groupLeaderName?: string;
  loanType: 'Personal' | 'Group';
  amount: number;
  interestRate: number;
  term: number; 
  status: 'Pending' | 'Active' | 'Overdue' | 'Closed' | 'Missed';
  disbursalDate: string;
  weeklyRepayment: number; 
  totalPaid: number;
  outstandingAmount: number;
  collectionFrequency: 'Daily' | 'Weekly' | 'Monthly';
  members?: string[];
  assignedTo?: string; // Username of the collection agent
  nextDueDate?: string;
};

export type User = {
    id: string;
    username: string;
    role: 'Admin' | 'Collection Agent';
    lastLogin: string;
};

export type UserActivity = {
    id: string;
    timestamp: string;
    username: string;
    action: string;
    details: string;
};

export type Collection = {
    id: string;
    loanId: string;
    customer: string;
    amount: number;
    date: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'UPI';
    collectedBy: string; // username of collector
};

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
};

const initialCompanyProfile: CompanyProfile = {
    name: 'LoanTrack Lite',
    address: '123 Business Avenue, Suite 100, City, State 12345',
    phone: '1234567890',
    email: 'contact@loantracklite.com',
    logoUrl: ''
}

const initialCustomers: Customer[] = [];
const initialLoans: Loan[] = [];
const initialCollections: Collection[] = [];
const initialUsers: User[] = [
  { id: 'USR001', username: 'admin', role: 'Admin', lastLogin: '2024-07-29 10:00 AM' },
  { id: 'USR002', username: 'agent', role: 'Collection Agent', lastLogin: '2024-07-29 11:00 AM' },
];


const getFromStorage = <T>(key: string, initialData: T): T => {
    if (typeof window === 'undefined') return initialData;
    const stored = localStorage.getItem(key);
    try {
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error(`Error parsing ${key} from localStorage`, e);
    }
    setInStorage(key, initialData);
    return initialData;
};

const setInStorage = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('local-storage-updated'));
};

const calculateNextDueDate = (loan: Loan): string | undefined => {
    if (loan.status !== 'Active' && loan.status !== 'Overdue') {
        return undefined;
    }
    
    const installmentsPaid = loan.totalPaid > 0 && loan.weeklyRepayment > 0 
        ? Math.floor(loan.totalPaid / loan.weeklyRepayment) 
        : 0;

    const startDate = parseISO(loan.disbursalDate);
    let nextDueDate: Date;
    
    if (loan.collectionFrequency === 'Daily') {
        const daysToAdd = installmentsPaid === 0 ? 2 : installmentsPaid + 1;
        nextDueDate = addDays(startDate, daysToAdd);
    } else if (loan.collectionFrequency === 'Weekly') {
        // For the very first payment, add 8 days to push it to the next week.
        // For subsequent payments, add weeks normally.
        if (installmentsPaid === 0) {
            nextDueDate = addDays(startDate, 8);
        } else {
            nextDueDate = addWeeks(startDate, installmentsPaid + 1);
        }
    } else if (loan.collectionFrequency === 'Monthly') {
        const monthsToAdd = installmentsPaid === 0 ? 2 : installmentsPaid + 1;
        nextDueDate = addMonths(startDate, monthsToAdd);
    } else {
        return undefined;
    }
    
    return nextDueDate.toISOString().split('T')[0];
};

const updateLoanStatusOnLoad = (loan: Loan): Loan => {
    if (loan.status === 'Active' && loan.nextDueDate) {
        const nextDueDate = parseISO(loan.nextDueDate);
        if (isBefore(nextDueDate, startOfToday())) {
            return { ...loan, status: 'Overdue' };
        }
    }
    return loan;
};


export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshData = useCallback(() => {
        const data = getFromStorage('users', initialUsers);
        if (localStorage.getItem('users') === null) {
            setInStorage('users', initialUsers);
        }
        setUsers(data);
    }, []);

    useEffect(() => {
        refreshData();
        setIsLoaded(true);
        const handleStorageChange = () => refreshData();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => window.removeEventListener('local-storage-updated', handleStorageChange);
    }, [refreshData]);

    const addUser = (user: Omit<User, 'id' | 'lastLogin'>): User => {
        const currentUsers = getFromStorage('users', initialUsers);
        const newIdNumber = (currentUsers.length > 0 ? Math.max(...currentUsers.map(c => parseInt(c.id.replace('USR','')))) : 0) + 1;
        const newUser: User = {
            ...user,
            id: `USR${String(newIdNumber).padStart(3, '0')}`,
            lastLogin: 'Never',
        };
        const updatedUsers = [...currentUsers, newUser];
        setInStorage('users', updatedUsers);
        return newUser;
    };

    const updateUser = (userId: string, updatedData: Partial<Omit<User, 'id'>>) => {
        const currentUsers = getFromStorage('users', initialUsers);
        const updatedUsers = currentUsers.map(u => u.id === userId ? { ...u, ...updatedData } : u);
        setInStorage('users', updatedUsers);
    }

    const deleteUser = (userId: string) => {
        const currentUsers = getFromStorage('users', initialUsers);
        const updatedUsers = currentUsers.filter(u => u.id !== userId);
        setInStorage('users', updatedUsers);
    };

    return { users, isLoaded, addUser, updateUser, deleteUser };
};


export const useCompanyProfile = () => {
    const [profile, setProfile] = useState<CompanyProfile>(initialCompanyProfile);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshProfile = useCallback(() => {
        const data = getFromStorage('companyProfile', initialCompanyProfile);
        setProfile(data);
    }, []);

    useEffect(() => {
        refreshProfile();
        setIsLoaded(true);
        const handleStorageChange = () => refreshProfile();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => window.removeEventListener('local-storage-updated', handleStorageChange);
    }, [refreshProfile]);

    const updateProfile = (newProfile: CompanyProfile) => {
        setInStorage('companyProfile', newProfile);
    };

    return { profile, updateProfile, isLoaded };
};


export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshCustomers = useCallback(() => {
        const data = getFromStorage('customers', initialCustomers);
        setCustomers(data);
    }, []);

    useEffect(() => {
        refreshCustomers();
        setIsLoaded(true);
        const handleStorageChange = () => refreshCustomers();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage-updated', handleStorageChange);
        }
    }, [refreshCustomers]);

    const addCustomer = (customer: Omit<Customer, 'id' | 'registrationDate' | 'profilePicture'>): Customer => {
        const currentCustomers = getFromStorage('customers', initialCustomers);
        const newIdNumber = (currentCustomers.length > 0 ? Math.max(...currentCustomers.map(c => parseInt(c.id.replace('CUST','')))) : 0) + 1;
        const newCustomer: Customer = {
            ...customer,
            id: `CUST${String(newIdNumber).padStart(3, '0')}`,
            registrationDate: new Date().toISOString().split('T')[0],
            profilePicture: 'https://placehold.co/100x100',
        };
        const updatedCustomers = [...currentCustomers, newCustomer];
        setInStorage('customers', updatedCustomers);
        return newCustomer;
    };

    const deleteCustomer = (customerId: string) => {
        const currentCustomers = getFromStorage('customers', initialCustomers);
        const updatedCustomers = currentCustomers.filter(c => c.id !== customerId);
        setInStorage('customers', updatedCustomers);
    };

    return { customers, addCustomer, deleteCustomer, isLoaded };
};

export const useLoans = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshLoans = useCallback(() => {
        let data = getFromStorage('loans', initialLoans);
        let loansNeedUpdate = false;
        data = data.map(loan => {
            const loanWithCalculatedDueDate = {
                ...loan,
                nextDueDate: calculateNextDueDate(loan)
            };
            const updatedLoan = updateLoanStatusOnLoad(loanWithCalculatedDueDate);
            if (updatedLoan.status !== loan.status) {
                loansNeedUpdate = true;
            }
            return updatedLoan;
        });

        setLoans(data);
        if (loansNeedUpdate) {
            setInStorage('loans', data);
        }
    }, []);

     useEffect(() => {
        refreshLoans();
        setIsLoaded(true);
        const handleStorageChange = () => refreshLoans();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage-updated', handleStorageChange);
        }
    }, [refreshLoans]);

    const addLoan = (loan: Omit<Loan, 'id'> | Omit<Loan, 'id'>[]): Loan[] => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const generateLoanId = () => `TEMP_${Math.floor(1000 + Math.random() * 9000)}`;
        
        const loansToAdd: Loan[] = (Array.isArray(loan) ? loan : [loan]).map(l => ({
            ...l,
            id: generateLoanId(),
        }));

        const updatedLoans = [...currentLoans, ...loansToAdd];
        setInStorage('loans', updatedLoans);
        return loansToAdd;
    };
    
    const updateLoanStatus = (loanId: string, status: Loan['status']) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.map(loan => 
            loan.id === loanId ? { ...loan, status: status } : loan
        );
        setInStorage('loans', updatedLoans);
    };

    const approveLoanWithLedgerId = (tempId: string, ledgerId: string): boolean => {
        const currentLoans = getFromStorage('loans', initialLoans);
        
        if (currentLoans.some(loan => loan.id === ledgerId)) {
            return false; 
        }

        let loanFound = false;
        const updatedLoans = currentLoans.map(loan => {
            if (loan.id === tempId) {
                loanFound = true;
                const activeLoan = { 
                    ...loan, 
                    id: ledgerId,
                    status: 'Active' as 'Active',
                    disbursalDate: new Date().toISOString().split('T')[0]
                };
                return {
                    ...activeLoan,
                    nextDueDate: calculateNextDueDate(activeLoan)
                };
            }
            return loan;
        });

        if (loanFound) {
            setInStorage('loans', updatedLoans);
        }
        
        return loanFound;
    };

    const updateLoanPayment = (loanId: string, amount: number) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.map(loan => {
            if (loan.id === loanId) {
                const newTotalPaid = loan.totalPaid + amount;
                const newOutstandingAmount = loan.outstandingAmount - amount;
                const newStatus = newOutstandingAmount <= 0 ? 'Closed' : 'Active';

                let tempLoan = {
                    ...loan,
                    totalPaid: newTotalPaid,
                    outstandingAmount: newOutstandingAmount,
                    status: newStatus,
                };
                
                const nextDueDate = calculateNextDueDate(tempLoan);

                return {
                    ...tempLoan,
                    nextDueDate: nextDueDate
                };
            }
            return loan;
        });
        
        setInStorage('loans', updatedLoans);
    }
    
    const deleteLoan = (loanId: string) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.filter(loan => loan.id !== loanId);
        setInStorage('loans', updatedLoans);
    };

    return { loans, addLoan, isLoaded, updateLoanStatus, approveLoanWithLedgerId, updateLoanPayment, deleteLoan };
}

export const useUserActivity = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshActivities = useCallback(() => {
        const data = getFromStorage<UserActivity[]>('userActivities', []);
        setActivities(data);
    }, []);

    useEffect(() => {
        refreshActivities();
        setIsLoaded(true);
        const handleStorageChange = () => refreshActivities();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage-updated', handleStorageChange);
        };
    }, [refreshActivities]);

    const logActivity = (action: string, details: string) => {
        if (typeof window === 'undefined') return;
        const storedUser = localStorage.getItem('loggedInUser');
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        const newActivity: UserActivity = {
            id: `ACT_${Date.now()}`,
            timestamp: new Date().toISOString(),
            username: user.username,
            action,
            details,
        };
        
        const currentActivities = getFromStorage<UserActivity[]>('userActivities', []);
        const updatedActivities = [newActivity, ...currentActivities];
        setInStorage('userActivities', updatedActivities);
    };

    return { activities, isLoaded, logActivity };
};

export const useCollections = () => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshCollections = useCallback(() => {
        const data = getFromStorage('collections', initialCollections);
        const sortedCollections = data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCollections(sortedCollections);
    }, []);

    useEffect(() => {
        refreshCollections();
        setIsLoaded(true);
        const handleStorageChange = () => refreshCollections();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage-updated', handleStorageChange);
        }
    }, [refreshCollections]);

    const addCollection = (collection: Omit<Collection, 'id' | 'collectedBy'>): Collection => {
        if(typeof window === 'undefined') return collection as Collection;
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        const currentCollections = getFromStorage('collections', initialCollections);
        const newCollection: Collection = {
            ...collection,
            id: `COLL${Date.now()}`,
            collectedBy: loggedInUser.username || 'unknown',
        };
        const updatedCollections = [newCollection, ...currentCollections];
        setInStorage('collections', updatedCollections);
        return newCollection;
    };

    const deleteCollection = (collectionId: string) => {
        const currentCollections = getFromStorage('collections', initialCollections);
        const collectionToDelete = currentCollections.find(c => c.id === collectionId);
        if (!collectionToDelete) return;
        
        // Revert loan payment
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.map(loan => {
            if (loan.id === collectionToDelete.loanId) {
                 const newTotalPaid = loan.totalPaid - collectionToDelete.amount;
                 const newOutstandingAmount = loan.outstandingAmount + collectionToDelete.amount;
                 return {
                     ...loan,
                     totalPaid: newTotalPaid,
                     outstandingAmount: newOutstandingAmount,
                     status: loan.status === 'Closed' ? 'Active' : loan.status,
                 };
            }
            return loan;
        });
        setInStorage('loans', updatedLoans);

        const updatedCollections = currentCollections.filter(c => c.id !== collectionId);
        setInStorage('collections', updatedCollections);
    };

    return { collections, isLoaded, addCollection, deleteCollection };
}

export function getCustomerById(id: string): Customer | undefined {
  const customers = getFromStorage('customers', initialCustomers);
  return customers.find(c => c.id === id);
}

export function getLoansByCustomerId(customerId: string): Loan[] {
  const loans = getFromStorage('loans', initialLoans);
  return loans.filter(l => l.customerId === customerId);
}
