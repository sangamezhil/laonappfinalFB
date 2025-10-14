
'use client';
import { useState, useEffect, useCallback } from 'react';
import { addDays, addWeeks, addMonths, parseISO, isToday, isBefore, startOfToday, isAfter, startOfDay } from 'date-fns';

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
  addedBy?: string;
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
  disbursalAmount: number;
  interestRate: number;
  term: number; 
  status: 'Pending' | 'Active' | 'Overdue' | 'Closed' | 'Missed' | 'Pre-closed';
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
    password?: string;
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
    loanId: string; // For personal loan, this is loanId. For group loan, this is groupId.
    customer: string; // Customer name or Group name
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

export type Investment = {
    id: string;
    date: string;
    description: string;
    amount: number;
}

export type Expense = {
    id: string;
    date: string;
    description: string;
    amount: number;
}

export type Financials = {
    investments: Investment[];
    expenses: Expense[];
};

const initialCompanyProfile: CompanyProfile = {
    name: 'LoanTrack Lite',
    address: '123 Business Avenue, Suite 100, City, State 12345',
    phone: '1234567890',
    email: 'contact@loantracklite.com',
    logoUrl: ''
}

const initialFinancials: Financials = {
    investments: [],
    expenses: [],
}

const initialCustomers: Customer[] = [];
const initialLoans: Loan[] = [];
const initialCollections: Collection[] = [];
const initialUsers: User[] = [
  { id: 'USR001', username: 'admin', password: 'admin', role: 'Admin', lastLogin: '2024-07-29 10:00 AM' },
  { id: 'USR002', username: 'agent', password: 'password', role: 'Collection Agent', lastLogin: '2024-07-29 11:00 AM' },
];
const initialActivities: UserActivity[] = [];


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
    if (loan.status === 'Closed' || loan.status === 'Pre-closed' || loan.status === 'Pending') {
        return undefined;
    }
    
    const installmentsPaid = loan.totalPaid > 0 && loan.weeklyRepayment > 0 
        ? Math.floor(loan.totalPaid / loan.weeklyRepayment) 
        : 0;

    const startDate = parseISO(loan.disbursalDate);
    let nextDueDate: Date;
    
    if (loan.collectionFrequency === 'Daily') {
        nextDueDate = addDays(startDate, installmentsPaid + 1);
    } else if (loan.collectionFrequency === 'Weekly') {
        // The first due date is exactly one week from disbursal. Each subsequent payment pushes it another week.
        nextDueDate = addWeeks(startDate, installmentsPaid + 1);
    } else if (loan.collectionFrequency === 'Monthly') {
        nextDueDate = addMonths(startDate, installmentsPaid + 1);
    } else {
        return undefined;
    }
    
    return nextDueDate.toISOString().split('T')[0];
};

const updateLoanStatusOnLoad = (loan: Loan): Loan => {
    if (loan.status !== 'Active' && loan.status !== 'Overdue') {
        return loan;
    }

    const nextDueDate = loan.nextDueDate ? parseISO(loan.nextDueDate) : undefined;
    if (nextDueDate && isBefore(nextDueDate, startOfToday())) {
        return { ...loan, status: 'Overdue' };
    } else if (loan.status === 'Overdue') {
        // If it was overdue but the date is no longer in the past (e.g. after a payment), set to active
         if(nextDueDate && !isBefore(nextDueDate, startOfToday())) {
            return { ...loan, status: 'Active' };
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
            password: user.password || user.username,
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

export const useFinancials = () => {
    const [financials, setFinancials] = useState<Financials>(initialFinancials);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshFinancials = useCallback(() => {
        const data = getFromStorage('financials', initialFinancials);
        const safeData = {
            investments: Array.isArray(data.investments) ? data.investments : [],
            expenses: Array.isArray(data.expenses) ? data.expenses : [],
        };
        setFinancials(safeData);
    }, []);

    useEffect(() => {
        refreshFinancials();
        setIsLoaded(true);
        const handleStorageChange = () => refreshFinancials();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => window.removeEventListener('local-storage-updated', handleStorageChange);
    }, [refreshFinancials]);
    
    const addInvestment = (description: string, amount: number) => {
        const currentFinancials = getFromStorage('financials', initialFinancials);
        const newInvestment: Investment = {
            id: `INV-${Date.now()}`,
            date: new Date().toISOString(),
            description,
            amount
        };
        const updatedFinancials = {
            ...currentFinancials,
            investments: [newInvestment, ...(currentFinancials.investments || [])]
        };
        setInStorage('financials', updatedFinancials);
    };

    const addExpense = (description: string, amount: number) => {
        const currentFinancials = getFromStorage('financials', initialFinancials);
        const newExpense: Expense = {
            id: `EXP-${Date.now()}`,
            date: new Date().toISOString(),
            description,
            amount
        };
        const updatedFinancials = {
            ...currentFinancials,
            expenses: [newExpense, ...(currentFinancials.expenses || [])]
        };
        setInStorage('financials', updatedFinancials);
    };

    const deleteExpense = (expenseId: string) => {
        const currentFinancials = getFromStorage('financials', initialFinancials);
        const updatedExpenses = (currentFinancials.expenses || []).filter(exp => exp.id !== expenseId);
        const updatedFinancials = { ...currentFinancials, expenses: updatedExpenses };
        setInStorage('financials', updatedFinancials);
    };

    const resetFinancials = (data: Partial<Financials>) => {
        const currentFinancials = getFromStorage('financials', initialFinancials);
        const updatedFinancials = { ...currentFinancials, ...data };
        setInStorage('financials', updatedFinancials);
    };

    return { financials, addInvestment, addExpense, deleteExpense, resetFinancials, isLoaded };
};


export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshCustomers = useCallback(() => {
        const data = getFromStorage('customers', initialCustomers);
        setCustomers(data);
    }, []);

    useEffect(() => {
        // On first load, if there's no data, use initial data
        if(localStorage.getItem('customers') === null) {
          setInStorage('customers', initialCustomers);
        }
        
        refreshCustomers();
        setIsLoaded(true);
        const handleStorageChange = () => refreshCustomers();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage-updated', handleStorageChange);
        }
    }, [refreshCustomers]);

    const addCustomer = (customer: Omit<Customer, 'id' | 'registrationDate' | 'profilePicture' | 'addedBy'>): Customer => {
        if (typeof window === 'undefined') return customer as Customer;
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        
        const currentCustomers = getFromStorage('customers', initialCustomers);
        const newIdNumber = (currentCustomers.length > 0 ? Math.max(...currentCustomers.map(c => parseInt(c.id.replace('CUST','')))) : 0) + 1;
        const newCustomer: Customer = {
            ...customer,
            id: `CUST${String(newIdNumber).padStart(3, '0')}`,
            registrationDate: new Date().toISOString().split('T')[0],
            profilePicture: 'https://placehold.co/100x100',
            addedBy: loggedInUser.username || 'unknown'
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
        if (localStorage.getItem('loans') === null) {
            setInStorage('loans', initialLoans);
        }

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
        const updatedLoans = currentLoans.map(loan => {
            if (loan.id === loanId) {
                const updatedLoan = { ...loan, status: status };
                if (status === 'Closed' || status === 'Pre-closed') {
                    updatedLoan.totalPaid += updatedLoan.outstandingAmount;
                    updatedLoan.outstandingAmount = 0;
                }
                return updatedLoan;
            }
            return loan;
        });
        setInStorage('loans', updatedLoans);
    };

    const approveLoanWithLedgerId = (tempId: string, ledgerId: string): boolean => {
        const currentLoans = getFromStorage('loans', initialLoans);
        
        const trimmedLedgerId = ledgerId.trim();

        if (currentLoans.some(loan => loan.id === trimmedLedgerId || loan.groupId === trimmedLedgerId)) {
            return false; 
        }

        let loanFound = false;
        let updatedLoans;

        const tempLoan = currentLoans.find(l => l.id === tempId);
        
        if (!tempLoan) return false;

        // Group Loan Approval
        if (tempLoan.loanType === 'Group' && tempLoan.groupId) {
            const tempGroupId = tempLoan.groupId;
            const groupLoans = currentLoans.filter(l => l.groupId === tempGroupId);
            
            if (groupLoans.length === 0) return false;
            
            loanFound = true;
            const groupName = groupLoans[0].groupName?.replace(/\s/g, '') || 'GROUP';
            const finalLoans: Loan[] = [];
            const otherLoans = currentLoans.filter(l => l.groupId !== tempGroupId);
            
            groupLoans.forEach((l, index) => {
                const newMemberLoanId = `${trimmedLedgerId}-${groupName}-${index + 1}`;
                const activeLoan = {
                    ...l,
                    id: newMemberLoanId,
                    groupId: trimmedLedgerId, 
                    status: 'Active' as 'Active',
                    disbursalDate: new Date().toISOString().split('T')[0]
                };
                finalLoans.push({
                    ...activeLoan,
                    nextDueDate: calculateNextDueDate(activeLoan)
                });
            });
            updatedLoans = [...otherLoans, ...finalLoans];
        } else { // Personal Loan Approval
            updatedLoans = currentLoans.map(loan => {
                if (loan.id === tempId) {
                    loanFound = true;
                    const activeLoan = { 
                        ...loan, 
                        id: trimmedLedgerId,
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
        }

        if (loanFound) {
            setInStorage('loans', updatedLoans);
        }
        
        return loanFound;
    };

    const updateLoanPayment = (loanId: string | null, amount: number, groupId?: string) => {
        const currentLoans = getFromStorage('loans', initialLoans);

        const processLoanUpdate = (loan: Loan, paymentAmount: number) => {
            const newTotalPaid = loan.totalPaid + paymentAmount;
            const newOutstandingAmount = loan.outstandingAmount - paymentAmount;
            
            let tempLoan = { ...loan, totalPaid: newTotalPaid, outstandingAmount: newOutstandingAmount };
            
            const nextDueDate = calculateNextDueDate(tempLoan);
            tempLoan.nextDueDate = nextDueDate;

            let newStatus = tempLoan.status;
            if (newOutstandingAmount <= 0) {
                newStatus = 'Closed';
            } else if (nextDueDate && isBefore(startOfDay(parseISO(nextDueDate)), startOfToday())) {
                newStatus = 'Overdue';
            } else {
                newStatus = 'Active';
            }

            return { ...tempLoan, status: newStatus };
        };

        if (groupId) {
            const groupLoans = currentLoans.filter(l => l.groupId === groupId && (l.status === 'Active' || l.status === 'Overdue'));
            if (groupLoans.length === 0) return;
            
            const amountPerMember = amount / groupLoans.length;

            const updatedLoans = currentLoans.map(loan => {
                if (loan.groupId === groupId) {
                    return processLoanUpdate(loan, amountPerMember);
                }
                return loan;
            });
            setInStorage('loans', updatedLoans);

        } else if (loanId) {
            const updatedLoans = currentLoans.map(loan => {
                if (loan.id === loanId) {
                    return processLoanUpdate(loan, amount);
                }
                return loan;
            });
            setInStorage('loans', updatedLoans);
        }
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
        const data = getFromStorage<UserActivity[]>('userActivities', initialActivities);
        setActivities(data);
    }, []);

    useEffect(() => {
        if (localStorage.getItem('userActivities') === null) {
            setInStorage('userActivities', initialActivities);
        }
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
        
        const currentActivities = getFromStorage<UserActivity[]>('userActivities', initialActivities);
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
        if (localStorage.getItem('collections') === null) {
            setInStorage('collections', initialCollections);
        }
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

        const isGroup = collectionToDelete.loanId.startsWith('GRP');
        const amountToRevert = collectionToDelete.amount;

        const currentLoans = getFromStorage('loans', initialLoans);
        
        const updatedLoans = currentLoans.map(loan => {
            let shouldUpdate = false;
            let amountPerMember = 0;

            if (isGroup && loan.groupId === collectionToDelete.loanId) {
                const groupLoans = currentLoans.filter(l => l.groupId === collectionToDelete.loanId);
                amountPerMember = groupLoans.length > 0 ? amountToRevert / groupLoans.length : 0;
                shouldUpdate = true;
            } else if (!isGroup && loan.id === collectionToDelete.loanId) {
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                const revertAmount = isGroup ? amountPerMember : amountToRevert;
                const newTotalPaid = loan.totalPaid - revertAmount;
                const newOutstandingAmount = loan.outstandingAmount + revertAmount;

                let tempLoan = {
                    ...loan,
                    totalPaid: newTotalPaid,
                    outstandingAmount: newOutstandingAmount,
                };
                
                const nextDueDateString = calculateNextDueDate(tempLoan);
                tempLoan.nextDueDate = nextDueDateString;
                
                let newStatus = tempLoan.status;
                if (newOutstandingAmount <= 0) {
                  newStatus = 'Closed';
                } else if (nextDueDateString && isBefore(startOfDay(parseISO(nextDueDateString)), startOfToday())) {
                    newStatus = 'Overdue';
                } else {
                    newStatus = 'Active';
                }
                
                return { ...tempLoan, status: newStatus };
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

// Function to clear all data from local storage
export const resetAllData = () => {
    if (typeof window === 'undefined') return;
    setInStorage('customers', initialCustomers);
    setInStorage('loans', initialLoans);
    setInStorage('collections', initialCollections);
    setInStorage('userActivities', initialActivities);
    setInStorage('companyProfile', initialCompanyProfile);
    setInStorage('financials', initialFinancials);
    // We don't reset users, but you could add it here if needed:
    // setInStorage('users', initialUsers);
    
    // Trigger a refresh
    window.dispatchEvent(new Event('local-storage-updated'));
};
