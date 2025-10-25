
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
  { id: 'USR001', username: 'admin', password: 'password', role: 'Admin', lastLogin: '2024-07-29 10:00 AM' },
  { id: 'USR002', username: 'agent', password: 'password', role: 'Collection Agent', lastLogin: '2024-07-29 11:00 AM' },
];
const initialActivities: UserActivity[] = [];


// In-memory caches stored on the window object so synchronous helpers can
// still access recently-fetched data without relying on browser storage.
// We intentionally avoid using localStorage as the authoritative source.
const setWindowCache = (key: string, data: any) => {
    try { (window as any)[key] = data } catch (e) {}
};

const getWindowCache = <T>(key: string, initialData: T): T => {
    if (typeof window === 'undefined') return initialData
    try { return ((window as any)[key] ?? initialData) as T } catch (e) { return initialData }
}

// Synchronous current user accessor. This first checks a window-scoped
// session (set by useSession) and falls back to the legacy localStorage key.
export const getCurrentUserSync = (): User | null => {
    if (typeof window === 'undefined') return null;
    const w = (window as any).__currentSession;
    if (w) return w as User;
    return null;
}

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
        if (typeof window === 'undefined') {
            setUsers(initialUsers);
            setWindowCache('__usersCache', initialUsers);
            return;
        }

        fetch('/api/users')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                if (Array.isArray(json)) {
                    setUsers(json)
                    setWindowCache('__usersCache', json)
                    return
                }
                setUsers(initialUsers)
                setWindowCache('__usersCache', initialUsers)
            })
            .catch(() => {
                setUsers(initialUsers)
                setWindowCache('__usersCache', initialUsers)
            })
    }, []);

    useEffect(() => {
        refreshData();
        setIsLoaded(true);
        // expose a refresh hook for external callers (e.g., resetAllData)
        try { (window as any).__refreshUsers = refreshData } catch (e) {}
        return () => { try { delete (window as any).__refreshUsers } catch (e) {} };
    }, [refreshData]);

    const addUser = async (user: Omit<User, 'id' | 'lastLogin'>): Promise<User | null> => {
        try {
            const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) })
            if (!res.ok) return null
            const created = await res.json()
            refreshData()
            return created
        } catch (e) { return null }
    };

    const updateUser = async (userId: string, updatedData: Partial<Omit<User, 'id'>>) => {
        try {
            await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId, changes: updatedData }) })
            refreshData()
        } catch (e) {}
    }

    const deleteUser = async (userId: string) => {
        try {
            await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId, changes: { deleted: true } }) })
            refreshData()
        } catch (e) {}
    };

    return { users, isLoaded, addUser, updateUser, deleteUser };
};


export const useCompanyProfile = () => {
    const [profile, setProfile] = useState<CompanyProfile>(initialCompanyProfile);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshProfile = useCallback(() => {
        if (typeof window === 'undefined') {
            setProfile(initialCompanyProfile)
            setWindowCache('__companyProfile', initialCompanyProfile)
            return
        }
        fetch('/api/companyProfile')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                setProfile(Object.keys(json || {}).length ? json : initialCompanyProfile)
                setWindowCache('__companyProfile', Object.keys(json || {}).length ? json : initialCompanyProfile)
            })
            .catch(() => {
                setProfile(initialCompanyProfile)
                setWindowCache('__companyProfile', initialCompanyProfile)
            })
    }, []);

    useEffect(() => {
        refreshProfile();
        setIsLoaded(true);
        const handleStorageChange = () => refreshProfile();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => window.removeEventListener('local-storage-updated', handleStorageChange);
    }, [refreshProfile]);

    const updateProfile = (newProfile: CompanyProfile) => {
        fetch('/api/companyProfile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProfile) }).then(() => refreshProfile()).catch(() => {})
    };

    return { profile, updateProfile, isLoaded };
};

export const useFinancials = () => {
    const [financials, setFinancials] = useState<Financials>(initialFinancials);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshFinancials = useCallback(() => {
        if (typeof window === 'undefined') {
            setFinancials(initialFinancials)
            setWindowCache('__financialsCache', initialFinancials)
            return
        }
        fetch('/api/financials')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                const safeData = {
                    investments: Array.isArray(json.investments) ? json.investments : [],
                    expenses: Array.isArray(json.expenses) ? json.expenses : [],
                }
                setFinancials(safeData)
                setWindowCache('__financialsCache', safeData)
            })
            .catch(() => {
                setFinancials(initialFinancials)
                setWindowCache('__financialsCache', initialFinancials)
            })
    }, []);

    useEffect(() => {
        refreshFinancials();
        setIsLoaded(true);
        const handleStorageChange = () => refreshFinancials();
        window.addEventListener('local-storage-updated', handleStorageChange);
        return () => window.removeEventListener('local-storage-updated', handleStorageChange);
    }, [refreshFinancials]);
    
    const addInvestment = (description: string, amount: number) => {
        const newInvestment: Investment = { id: `INV-${Date.now()}`, date: new Date().toISOString(), description, amount }
        const current = getWindowCache('__financialsCache', initialFinancials)
        const payload = { investments: [newInvestment, ...(current.investments || [])], expenses: current.expenses || [] }
        fetch('/api/financials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(() => refreshFinancials()).catch(() => {})
    };

    const addExpense = (description: string, amount: number) => {
        const newExpense: Expense = { id: `EXP-${Date.now()}`, date: new Date().toISOString(), description, amount }
        const current = getWindowCache('__financialsCache', initialFinancials)
        const payload = { investments: current.investments || [], expenses: [newExpense, ...(current.expenses || [])] }
        fetch('/api/financials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(() => refreshFinancials()).catch(() => {})
    };

    const deleteExpense = (expenseId: string) => {
        const current = getWindowCache('__financialsCache', initialFinancials)
        const updatedExpenses = (current.expenses || []).filter((exp: Expense) => exp.id !== expenseId)
        fetch('/api/financials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investments: current.investments || [], expenses: updatedExpenses }) }).then(() => refreshFinancials()).catch(() => {})
    };

    const resetFinancials = (data: Partial<Financials>) => {
        const current = getWindowCache('__financialsCache', initialFinancials)
        const updated = { ...current, ...data }
        fetch('/api/financials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }).then(() => refreshFinancials()).catch(() => {})
    };

    return { financials, addInvestment, addExpense, deleteExpense, resetFinancials, isLoaded };
};


export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

        const refreshCustomers = useCallback(() => {
                // Use server API exclusively for authoritative data. Maintain an
                // in-memory cache for synchronous reads.
                if (typeof window === 'undefined') {
                    setCustomers(initialCustomers)
                    setWindowCache('__customersCache', initialCustomers)
                    return;
                }

                fetch('/api/customers')
                    .then(async (res) => {
                        if (!res.ok) throw new Error('API not available')
                        const json = await res.json()
                        if (Array.isArray(json)) {
                            setCustomers(json)
                            setWindowCache('__customersCache', json)
                            return
                        }
                        setCustomers(initialCustomers)
                        setWindowCache('__customersCache', initialCustomers)
                    })
                    .catch(() => {
                        setCustomers(initialCustomers)
                        setWindowCache('__customersCache', initialCustomers)
                    })
        }, []);

    useEffect(() => {
        refreshCustomers();
        setIsLoaded(true);
        try { (window as any).__refreshCustomers = refreshCustomers } catch (e) {}
        return () => { try { delete (window as any).__refreshCustomers } catch (e) {} };
    }, [refreshCustomers]);

        const addCustomer = (customer: Omit<Customer, 'id' | 'registrationDate' | 'profilePicture' | 'addedBy'>): Customer => {
                if (typeof window === 'undefined') return customer as Customer;
                const loggedInUser = getCurrentUserSync() || { username: 'unknown' };

                const payload = { ...customer, addedBy: loggedInUser.username || 'unknown' }
                const tempId = `TEMP_${Date.now()}`
                const tempCustomer: Customer = { id: tempId, registrationDate: new Date().toISOString().split('T')[0], profilePicture: 'https://placehold.co/100x100', ...payload }
                const curr = getWindowCache('__customersCache', initialCustomers)
                const updatedCustomers = [...curr, tempCustomer]
                setWindowCache('__customersCache', updatedCustomers)
                setCustomers(updatedCustomers)

                fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tempCustomer) })
                    .then(async (res) => {
                        if (!res.ok) return
                        try {
                            const created = await res.json()
                            const nowCurr = getWindowCache('__customersCache', initialCustomers)
                            const reconciled = nowCurr.map((c: Customer) => c.id === tempId ? created : c)
                            setWindowCache('__customersCache', reconciled)
                            setCustomers(reconciled)
                        } catch (e) {}
                    }).catch(() => {})

                return tempCustomer;
        };

    const deleteCustomer = (customerId: string) => {
        const curr = getWindowCache('__customersCache', initialCustomers)
        const updated = curr.filter((c: Customer) => c.id !== customerId)
        setWindowCache('__customersCache', updated)
        setCustomers(updated)
        fetch('/api/customers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: customerId }) }).catch(() => {})
    };

    return { customers, addCustomer, deleteCustomer, isLoaded };
};

export const useLoans = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshLoans = useCallback(() => {
        // Use server API as the authoritative store for loans. Keep an in-memory
        // cache for synchronous helpers and optimistic updates.
        if (typeof window === 'undefined') {
            setLoans(initialLoans)
            setWindowCache('__loansCache', initialLoans)
            return
        }

        fetch('/api/loans')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                if (Array.isArray(json)) {
                    const data = json.map((loan: Loan) => {
                        const loanWithCalculatedDueDate = { ...loan, nextDueDate: calculateNextDueDate(loan) };
                        const updatedLoan = updateLoanStatusOnLoad(loanWithCalculatedDueDate);
                        return updatedLoan;
                    })
                    setLoans(data)
                    setWindowCache('__loansCache', data)
                    return
                }
                setLoans(initialLoans)
                setWindowCache('__loansCache', initialLoans)
            })
            .catch(() => {
                setLoans(initialLoans)
                setWindowCache('__loansCache', initialLoans)
            })
    }, []);

     useEffect(() => {
        refreshLoans();
        setIsLoaded(true);
        try { (window as any).__refreshLoans = refreshLoans } catch (e) {}
        return () => { try { delete (window as any).__refreshLoans } catch (e) {} };
    }, [refreshLoans]);

    const addLoan = (loan: Omit<Loan, 'id'> | Omit<Loan, 'id'>[]): Loan[] => {
        const generateLoanId = () => `TEMP_${Math.floor(1000 + Math.random() * 9000)}`;
        const loansToAdd: Loan[] = (Array.isArray(loan) ? loan : [loan]).map(l => ({ ...l, id: generateLoanId() }));
        const curr = getWindowCache('__loansCache', initialLoans)
        const updated = [...curr, ...loansToAdd]
        setWindowCache('__loansCache', updated)
        setLoans(updated)
        fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loansToAdd) }).then(() => refreshLoans()).catch(() => {})
        return loansToAdd
    };
    
    const updateLoanStatus = async (loanId: string, status: Loan['status']) => {
        try {
            await fetch('/api/loans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: loanId, changes: { status } }) })
            await refreshLoans()
        } catch (e) {}
    };

    const approveLoanWithLedgerId = async (tempId: string, ledgerId: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/loans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', tempId, ledgerId }) })
            if (!res.ok) return false
            await refreshLoans()
            return true
        } catch (e) { return false }
    };

    const updateLoanPayment = async (loanId: string | null, amount: number, groupId?: string) => {
        try {
            await fetch('/api/loans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'payment', id: loanId, groupId, amount }) })
            await refreshLoans()
        } catch (e) {}
    }
    
    const deleteLoan = (loanId: string) => {
        const curr = getWindowCache('__loansCache', initialLoans)
        const updated = curr.filter((l: Loan) => l.id !== loanId)
        setWindowCache('__loansCache', updated)
        setLoans(updated)
        // best-effort: mark deleted on server
        fetch('/api/loans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: loanId, changes: { deleted: true } }) }).catch(() => {})
    };

    return { loans, addLoan, isLoaded, updateLoanStatus, approveLoanWithLedgerId, updateLoanPayment, deleteLoan };
}

export const useUserActivity = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshActivities = useCallback(() => {
        if (typeof window === 'undefined') {
            setActivities(initialActivities)
            setWindowCache('__activitiesCache', initialActivities)
            return
        }
        fetch('/api/userActivities')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                const data = Array.isArray(json) ? json : initialActivities
                setActivities(data)
                setWindowCache('__activitiesCache', data)
            })
            .catch(() => {
                setActivities(initialActivities)
                setWindowCache('__activitiesCache', initialActivities)
            })
    }, []);

    useEffect(() => {
        refreshActivities();
        setIsLoaded(true);
        try { (window as any).__refreshActivities = refreshActivities } catch (e) {}
        return () => { try { delete (window as any).__refreshActivities } catch (e) {} };
    }, [refreshActivities]);

    const logActivity = (action: string, details: string) => {
    if (typeof window === 'undefined') return;
    const user = getCurrentUserSync();
    if (!user) return;
        const newActivity: UserActivity = { id: `ACT_${Date.now()}`, timestamp: new Date().toISOString(), username: user.username, action, details }
        const curr = getWindowCache('__activitiesCache', initialActivities)
        const updatedActivities = [newActivity, ...curr]
        setWindowCache('__activitiesCache', updatedActivities)
        setActivities(updatedActivities)
        fetch('/api/userActivities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newActivity) }).catch(() => {})
    };

    return { activities, isLoaded, logActivity };
};

export const useCollections = () => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshCollections = useCallback(() => {
        if (typeof window === 'undefined') {
            setCollections(initialCollections)
            setWindowCache('__collectionsCache', initialCollections)
            return
        }
        fetch('/api/collections')
            .then(async (res) => {
                if (!res.ok) throw new Error('API not available')
                const json = await res.json()
                const data = Array.isArray(json) ? json : []
                const sortedCollections = data.sort((a: Collection, b: Collection) => new Date(b.date).getTime() - new Date(a.date).getTime())
                setCollections(sortedCollections)
                setWindowCache('__collectionsCache', sortedCollections)
            })
            .catch(() => {
                setCollections(initialCollections)
                setWindowCache('__collectionsCache', initialCollections)
            })
    }, []);

    useEffect(() => {
        refreshCollections();
        setIsLoaded(true);
        try { (window as any).__refreshCollections = refreshCollections } catch (e) {}
        return () => { try { delete (window as any).__refreshCollections } catch (e) {} };
    }, [refreshCollections]);

    const addCollection = (collection: Omit<Collection, 'id' | 'collectedBy'>): Collection => {
    if(typeof window === 'undefined') return collection as Collection;
    const loggedInUser = getCurrentUserSync() || { username: 'unknown' };
        const newCollection: Collection = { ...collection, id: `COLL${Date.now()}`, collectedBy: loggedInUser.username || 'unknown' }
        const curr = getWindowCache('__collectionsCache', initialCollections)
        const updatedCollections = [newCollection, ...curr]
        setWindowCache('__collectionsCache', updatedCollections)
        setCollections(updatedCollections)
        fetch('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCollection) }).catch(() => {})
        return newCollection;
    };

    const deleteCollection = (collectionId: string) => {
        const curr = getWindowCache('__collectionsCache', initialCollections)
        const collectionToDelete = curr.find((c: Collection) => c.id === collectionId)
        if (!collectionToDelete) return
        const updatedCollections = curr.filter((c: Collection) => c.id !== collectionId)
        setWindowCache('__collectionsCache', updatedCollections)
        setCollections(updatedCollections)
        fetch('/api/collections', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: collectionId }) }).then(() => { try { (window as any).__refreshLoans?.() } catch (e) {} }).catch(() => {})
    };


    return { collections, isLoaded, addCollection, deleteCollection };
}

export function getCustomerById(id: string): Customer | undefined {
    const customers = getWindowCache('__customersCache', initialCustomers);
    return customers.find((c: Customer) => c.id === id);
}

export function getLoansByCustomerId(customerId: string): Loan[] {
    const loans = getWindowCache('__loansCache', initialLoans);
    return loans.filter((l: Loan) => l.customerId === customerId);
}

// Function to clear all data from local storage
export const resetAllData = () => {
    if (typeof window === 'undefined') return;
    setWindowCache('__customersCache', initialCustomers);
    setWindowCache('__loansCache', initialLoans);
    setWindowCache('__collectionsCache', initialCollections);
    setWindowCache('__activitiesCache', initialActivities);
    setWindowCache('__companyProfile', initialCompanyProfile);
    setWindowCache('__financialsCache', initialFinancials);
    // Trigger any refresh hooks exposed by hooks
    try { (window as any).__refreshCustomers?.() } catch (e) {}
    try { (window as any).__refreshLoans?.() } catch (e) {}
    try { (window as any).__refreshCollections?.() } catch (e) {}
    try { (window as any).__refreshActivities?.() } catch (e) {}
    try { (window as any).__refreshFinancials?.() } catch (e) {}
    try { (window as any).__refreshProfile?.() } catch (e) {}
};
