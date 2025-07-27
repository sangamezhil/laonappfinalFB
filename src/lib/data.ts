
'use client';
import { useState, useEffect } from 'react';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  address: string;
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

const initialCustomers: Customer[] = [
  { id: 'CUST001', name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone: '9876543210', secondaryPhone: '9876543211', address: '123, MG Road, Bangalore', idType: 'Aadhaar Card', idNumber: '1234 5678 9012', secondaryIdType: 'PAN Card', secondaryIdNumber: 'ABCDE1234F', occupation: 'Software Engineer', monthlyIncome: 80000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-01-15' },
  { id: 'CUST002', name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '8765432109', secondaryPhone: '8765432108', address: '456, Main Street, Mumbai', idType: 'PAN Card', idNumber: 'ABCDE1234F', secondaryIdType: 'Aadhaar Card', secondaryIdNumber: '2345 6789 0123', occupation: 'Graphic Designer', monthlyIncome: 65000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-02-20' },
  { id: 'CUST003', name: 'Amit Singh', email: 'amit.singh@example.com', phone: '7654321098', secondaryPhone: '7654321097', address: '789, Park Avenue, Delhi', idType: 'Voter ID', idNumber: 'XYZ1234567', secondaryIdType: 'Aadhaar Card', secondaryIdNumber: '3456 7890 1234', occupation: 'Marketing Manager', monthlyIncome: 95000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-03-10' },
  { id: 'CUST004', name: 'Sunita Devi', email: 'sunita.devi@example.com', phone: '6543210987', secondaryPhone: '6543210986', address: '101, Civil Lines, Pune', idType: 'Aadhaar Card', idNumber: '9876 5432 1098', secondaryIdType: 'Ration Card', secondaryIdNumber: 'RATION5678', occupation: 'Teacher', monthlyIncome: 50000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-04-05' },
  { id: 'CUST005', name: 'Rajesh Verma', email: 'rajesh.verma@example.com', phone: '5432109876', secondaryPhone: '5432109875', address: '202, JVPD Scheme, Mumbai', idType: 'PAN Card', idNumber: 'FGHIJ5678K', secondaryIdType: 'Bank Passbook', secondaryIdNumber: 'BANKPASS123', occupation: 'Businessman', monthlyIncome: 120000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-05-12' },
  { id: 'CUST006', name: 'Anita Desai', email: 'anita.desai@example.com', phone: '4321098765', secondaryPhone: '4321098764', address: '303, Koramangala, Bangalore', idType: 'Voter ID', idNumber: 'LMN8765432', secondaryIdType: 'Aadhaar Card', secondaryIdNumber: '4567 8901 2345', occupation: 'Doctor', monthlyIncome: 150000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-06-18' },
  { id: 'CUST007', name: 'Sanjay Gupta', email: 'sanjay.gupta@example.com', phone: '3210987654', secondaryPhone: '3210987653', address: '404, Salt Lake, Kolkata', idType: 'Aadhaar Card', idNumber: '8765 4321 0987', secondaryIdType: 'PAN Card', secondaryIdNumber: 'GHIJK2345L', occupation: 'Architect', monthlyIncome: 110000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-07-22' },
  { id: 'CUST008', name: 'Meena Kumari', email: 'meena.kumari@example.com', phone: '2109876543', secondaryPhone: '2109876542', address: '505, Anna Nagar, Chennai', idType: 'Bank Passbook', idNumber: '9988776655', secondaryIdType: 'Gas Book', secondaryIdNumber: 'GASBOOK987', occupation: 'Homemaker', monthlyIncome: 25000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-08-01' },
];

const initialLoans: Loan[] = [
  { id: '239847298347', customerId: 'CUST001', customerName: 'Ravi Kumar', loanType: 'Personal', amount: 50000, interestRate: 12, term: 10, status: 'Active', disbursalDate: '2023-05-01', weeklyRepayment: 5000, totalPaid: 25000, outstandingAmount: 25000, collectionFrequency: 'Weekly' },
  { id: '987234987234', customerId: 'CUST002', customerName: 'Priya Sharma', loanType: 'Personal', amount: 25000, interestRate: 20, term: 70, status: 'Overdue', disbursalDate: '2023-06-15', weeklyRepayment: 357.14, totalPaid: 10000, outstandingAmount: 15000, collectionFrequency: 'Daily' },
  { id: '192837498234', customerId: 'CUST003', customerName: 'Amit Singh', loanType: 'Personal', amount: 100000, interestRate: 12, term: 10, status: 'Closed', disbursalDate: '2022-01-20', weeklyRepayment: 10000, totalPaid: 100000, outstandingAmount: 0, collectionFrequency: 'Weekly' },
  { id: '498729384729', customerId: 'CUST004', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Sunita Devi' },
  { id: '347298347298', customerId: 'CUST005', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Rajesh Verma' },
  { id: '982347293847', customerId: 'CUST006', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Anita Desai' },
  { id: '109283748293', customerId: 'CUST007', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Sanjay Gupta' },
  { id: '569837459234', customerId: 'CUST008', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Meena Kumari' },
];

const initialCollections: Collection[] = [
  { id: 'COLL001', loanId: '239847298347', customer: 'Ravi Kumar', amount: 5000, date: '2024-07-28' },
  { id: 'COLL002', loanId: '498729384729', customer: 'Sahara Group', amount: 5000, date: '2024-07-27' },
  { id: 'COLL003', loanId: '987234987234', customer: 'Priya Sharma', amount: 2500, date: '2024-07-25' },
];

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

    return { loans, addLoan, isLoaded, updateLoanStatus, updateLoanPayment };
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
        setCollections(data);
        setIsLoaded(true);
    }, []);

    const addCollection = (collection: Omit<Collection, 'id'>): Collection => {
        const currentCollections = getFromStorage('collections', initialCollections);
        const newCollection: Collection = {
            ...collection,
            id: `COLL${Date.now()}`,
        };
        const updatedCollections = [newCollection, ...currentCollections];
        setInStorage('collections', updatedCollections);
        setCollections(updatedCollections);
        return newCollection;
    };

    return { collections, isLoaded, addCollection };
}


export function getCustomerById(id: string) {
  const customers = getFromStorage('customers', initialCustomers);
  return customers.find(c => c.id === id);
}

export function getLoansByCustomerId(customerId: string) {
  const loans = getFromStorage('loans', initialLoans);
  return loans.filter(l => l.customerId === customerId);
}
