
'use client';
import { useState, useEffect } from 'react';

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
  groupId?: string; // To link group members' loans
  groupLeaderName?: string; // To display leader in collections
  loanType: 'Personal' | 'Group';
  amount: number;
  interestRate: number;
  term: number; 
  status: 'Pending' | 'Active' | 'Overdue' | 'Closed' | 'Missed';
  disbursalDate: string;
  weeklyRepayment: number; 
  totalPaid: number;
  outstandingAmount: number;
  collectionFrequency?: 'Daily' | 'Weekly' | 'Monthly';
  members?: string[]; // Kept for historical data if needed, but new logic won't heavily rely on it
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
};

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
};

const initialCompanyProfile: CompanyProfile = {
    name: 'Your Company Name',
    address: '123 Business Avenue, Suite 100, City, State 12345',
    phone: '123-456-7890',
    email: 'contact@yourcompany.com',
    logoUrl: 'https://placehold.co/150x50'
}

const initialCustomers: Customer[] = [];


const initialLoans: Loan[] = [];

const initialCollections: Collection[] = [];

const getFromStorage = <T>(key: string, initialData: T): T => {
    if (typeof window === 'undefined') return initialData;
    const stored = localStorage.getItem(key);
    try {
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error(`Error parsing ${key} from localStorage`, e);
    }
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
};

const setInStorage = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
};

export const useCompanyProfile = () => {
    const [profile, setProfile] = useState<CompanyProfile>(initialCompanyProfile);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const data = getFromStorage('companyProfile', initialCompanyProfile);
        setProfile(data);
        setIsLoaded(true);
    }, []);

    const updateProfile = (newProfile: CompanyProfile) => {
        setInStorage('companyProfile', newProfile);
        setProfile(newProfile);
    };

    return { profile, updateProfile, isLoaded };
};


export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const data = getFromStorage('customers', initialCustomers);
        setCustomers(data);
        setIsLoaded(true);
    }, []);

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
        setCustomers(updatedCustomers);
        return newCustomer;
    };

    const deleteCustomer = (customerId: string) => {
        const currentCustomers = getFromStorage('customers', initialCustomers);
        const updatedCustomers = currentCustomers.filter(c => c.id !== customerId);
        setInStorage('customers', updatedCustomers);
        setCustomers(updatedCustomers);
    };

    return { customers, addCustomer, deleteCustomer, isLoaded };
};

export const useLoans = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

     useEffect(() => {
        const data = getFromStorage('loans', initialLoans);
        setLoans(data);
        setIsLoaded(true);
    }, []);

    const addLoan = (loan: Omit<Loan, 'id'> | Omit<Loan, 'id'>[]): Loan[] => {
        const currentLoans = getFromStorage('loans', initialLoans);
        
        const generateLoanId = () => {
            return Math.floor(100000000000 + Math.random() * 900000000000).toString();
        }

        const loansToAdd: Loan[] = [];
        
        if (Array.isArray(loan)) {
            loan.forEach(l => {
                loansToAdd.push({
                    ...l,
                    id: generateLoanId(),
                });
            });
        } else {
            loansToAdd.push({
                ...loan,
                id: generateLoanId(),
            });
        }

        const updatedLoans = [...currentLoans, ...loansToAdd];
        setInStorage('loans', updatedLoans);
        setLoans(updatedLoans);
        return loansToAdd;
    };
    
    const updateLoanStatus = (loanId: string, status: Loan['status']) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.map(loan => 
            loan.id === loanId ? { ...loan, status: status } : loan
        );
        setInStorage('loans', updatedLoans);
        setLoans(updatedLoans);
    };

    const updateLoanPayment = (loanId: string, amount: number) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.map(loan => {
            if (loan.id === loanId) {
                const newTotalPaid = loan.totalPaid + amount;
                const newOutstandingAmount = loan.outstandingAmount - amount;
                return {
                    ...loan,
                    totalPaid: newTotalPaid,
                    outstandingAmount: newOutstandingAmount,
                    status: newOutstandingAmount <= 0 ? 'Closed' : loan.status,
                };
            }
            return loan;
        });
        setInStorage('loans', updatedLoans);
        setLoans(updatedLoans);
    }
    
    const deleteLoan = (loanId: string) => {
        const currentLoans = getFromStorage('loans', initialLoans);
        const updatedLoans = currentLoans.filter(loan => loan.id !== loanId);
        setInStorage('loans', updatedLoans);
        setLoans(updatedLoans);
    };

    return { loans, addLoan, isLoaded, updateLoanStatus, updateLoanPayment, deleteLoan };
}

export const useUserActivity = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const data = getFromStorage<UserActivity[]>('userActivities', []);
        setActivities(data);
        setIsLoaded(true);
    }, []);

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
        setActivities(updatedActivities);
    };

    return { activities, isLoaded, logActivity };
};

export const useCollections = () => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const data = getFromStorage('collections', initialCollections);
        const sortedCollections = data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCollections(sortedCollections);
        setIsLoaded(true);
    }, []);

    const addCollection = (collection: Omit<Collection, 'id'>): Collection => {
        const currentCollections = getFromStorage('collections', initialCollections);
        const newCollection: Collection = {
            ...collection,
            id: `COLL${Date.now()}`,
        };
        const updatedCollections = [newCollection, ...currentCollections].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInStorage('collections', updatedCollections);
        setCollections(updatedCollections);
        return newCollection;
    };

    const deleteCollection = (collectionId: string) => {
        const currentCollections = getFromStorage('collections', initialCollections);
        const updatedCollections = currentCollections.filter(c => c.id !== collectionId);
        setInStorage('collections', updatedCollections);
        setCollections(updatedCollections);
    };

    return { collections, isLoaded, addCollection, deleteCollection };
}


export function getCustomerById(id: string) {
  const customers = getFromStorage('customers', initialCustomers);
  return customers.find(c => c.id === id);
}

export function getLoansByCustomerId(customerId: string) {
  const loans = getFromStorage('loans', initialLoans);
  return loans.filter(l => l.customerId === customerId);
}
