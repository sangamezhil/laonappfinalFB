
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

const initialCustomers: Customer[] = [
  {
    id: 'CUST001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    secondaryPhone: '9876543211',
    address: '123 MG Road, Bangalore, Karnataka 560001',
    gender: 'Male',
    dob: '1990-05-15',
    idType: 'Aadhaar Card',
    idNumber: '123456789012',
    secondaryIdType: 'PAN Card',
    secondaryIdNumber: 'ABCDE1234F',
    occupation: 'Software Engineer',
    monthlyIncome: 80000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-01-10',
  },
  {
    id: 'CUST002',
    name: 'Sanya Verma',
    email: 'sanya.verma@example.com',
    phone: '9876543212',
    secondaryPhone: '9876543213',
    address: '456 Park Street, Kolkata, West Bengal 700016',
    gender: 'Female',
    dob: '1992-08-22',
    idType: 'Voter ID',
    idNumber: 'YTR1234567',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '234567890123',
    occupation: 'Graphic Designer',
    monthlyIncome: 65000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-02-15',
  },
  {
    id: 'CUST003',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    phone: '9876543214',
    secondaryPhone: '9876543215',
    address: '789 Juhu Beach, Mumbai, Maharashtra 400049',
    gender: 'Male',
    dob: '1988-11-30',
    idType: 'Aadhaar Card',
    idNumber: '345678901234',
    secondaryIdType: 'Bank Passbook',
    secondaryIdNumber: '987654321098',
    occupation: 'Marketing Manager',
    monthlyIncome: 95000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-03-20',
  },
  {
    id: 'CUST004',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '9876543216',
    secondaryPhone: '9876543217',
    address: '101 Sardar Patel Road, Ahmedabad, Gujarat 380009',
    gender: 'Female',
    dob: '1995-02-10',
    idType: 'PAN Card',
    idNumber: 'FGHIJ5678K',
    secondaryIdType: 'Voter ID',
    secondaryIdNumber: 'PQR9876543',
    occupation: 'Teacher',
    monthlyIncome: 45000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-04-05',
  },
  {
    id: 'CUST005',
    name: 'Amit Singh',
    email: 'amit.singh@example.com',
    phone: '9876543218',
    secondaryPhone: '9876543219',
    address: '212 Connaught Place, New Delhi, Delhi 110001',
    gender: 'Male',
    dob: '1985-07-25',
    idType: 'Aadhaar Card',
    idNumber: '456789012345',
    secondaryIdType: 'Ration Card',
    secondaryIdNumber: 'DL12345678',
    occupation: 'Businessman',
    monthlyIncome: 120000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-05-12',
  },
  {
    id: 'CUST006',
    name: 'Neha Gupta',
    email: 'neha.gupta@example.com',
    phone: '9876543220',
    secondaryPhone: '9876543221',
    address: '333 Anna Salai, Chennai, Tamil Nadu 600002',
    gender: 'Female',
    dob: '1993-01-18',
    idType: 'Voter ID',
    idNumber: 'TNZ9876543',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '567890123456',
    occupation: 'Doctor',
    monthlyIncome: 150000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-06-18',
  },
  {
    id: 'CUST007',
    name: 'Vikram Rathore',
    email: 'vikram.rathore@example.com',
    phone: '9876543222',
    secondaryPhone: '9876543223',
    address: '444 Hawa Mahal Road, Jaipur, Rajasthan 302002',
    gender: 'Male',
    dob: '1980-03-12',
    idType: 'Aadhaar Card',
    idNumber: '678901234567',
    secondaryIdType: 'PAN Card',
    secondaryIdNumber: 'KLMNO9012P',
    occupation: 'Architect',
    monthlyIncome: 110000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-07-22',
  },
  {
    id: 'CUST008',
    name: 'Anjali Desai',
    email: 'anjali.desai@example.com',
    phone: '9876543224',
    secondaryPhone: '9876543225',
    address: '555 Deccan Gymkhana, Pune, Maharashtra 411004',
    gender: 'Female',
    dob: '1998-09-05',
    idType: 'Bank Passbook',
    idNumber: '123123123123',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '789012345678',
    occupation: 'Student',
    monthlyIncome: 15000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-08-30',
  },
  {
    id: 'CUST009',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    phone: '9876543226',
    secondaryPhone: '9876543227',
    address: '666 Hazratganj, Lucknow, Uttar Pradesh 226001',
    gender: 'Male',
    dob: '1986-12-01',
    idType: 'Ration Card',
    idNumber: 'UP54321098',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '890123456789',
    occupation: 'Government Employee',
    monthlyIncome: 75000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-09-14',
  },
  {
    id: 'CUST010',
    name: 'Kavita Reddy',
    email: 'kavita.reddy@example.com',
    phone: '9876543228',
    secondaryPhone: '9876543229',
    address: '777 Banjara Hills, Hyderabad, Telangana 500034',
    gender: 'Female',
    dob: '1991-04-28',
    idType: 'Aadhaar Card',
    idNumber: '901234567890',
    secondaryIdType: 'PAN Card',
    secondaryIdNumber: 'PQRST3456Q',
    occupation: 'Accountant',
    monthlyIncome: 60000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-10-25',
  },
  {
    id: 'CUST011',
    name: 'Manoj Tiwari',
    email: 'manoj.tiwari@example.com',
    phone: '9876543230',
    secondaryPhone: '9876543231',
    address: '888 Bailey Road, Patna, Bihar 800001',
    gender: 'Male',
    dob: '1979-06-20',
    idType: 'Voter ID',
    idNumber: 'BRX1234567',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '012345678901',
    occupation: 'Farmer',
    monthlyIncome: 30000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-11-11',
  },
  {
    id: 'CUST012',
    name: 'Sunita Nair',
    email: 'sunita.nair@example.com',
    phone: '9876543232',
    secondaryPhone: '9876543233',
    address: '999 MG Road, Kochi, Kerala 682016',
    gender: 'Female',
    dob: '1987-10-15',
    idType: 'Aadhaar Card',
    idNumber: '112233445566',
    secondaryIdType: 'Gas Book',
    secondaryIdNumber: '987654321',
    occupation: 'Homemaker',
    monthlyIncome: 20000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2023-12-01',
  },
  {
    id: 'CUST013',
    name: 'Deepak Chopra',
    email: 'deepak.chopra@example.com',
    phone: '9876543234',
    secondaryPhone: '9876543235',
    address: '111 Sector 17, Chandigarh, 160017',
    gender: 'Male',
    dob: '1996-05-05',
    idType: 'PAN Card',
    idNumber: 'UVWXY7890R',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '223344556677',
    occupation: 'IT Professional',
    monthlyIncome: 90000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-01-08',
  },
  {
    id: 'CUST014',
    name: 'Ishita Iyer',
    email: 'ishita.iyer@example.com',
    phone: '9876543236',
    secondaryPhone: '9876543237',
    address: '222 Lavelle Road, Bangalore, Karnataka 560001',
    gender: 'Female',
    dob: '1994-03-25',
    idType: 'Aadhaar Card',
    idNumber: '334455667788',
    secondaryIdType: 'Voter ID',
    secondaryIdNumber: 'KA1234567',
    occupation: 'Lawyer',
    monthlyIncome: 130000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-02-19',
  },
  {
    id: 'CUST015',
    name: 'Arjun Reddy',
    email: 'arjun.reddy@example.com',
    phone: '9876543238',
    secondaryPhone: '9876543239',
    address: '333 Jubilee Hills, Hyderabad, Telangana 500033',
    gender: 'Male',
    dob: '1991-08-10',
    idType: 'Voter ID',
    idNumber: 'TSA7654321',
    secondaryIdType: 'PAN Card',
    secondaryIdNumber: 'ZYXWV9876S',
    occupation: 'Actor',
    monthlyIncome: 250000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-03-21',
  },
  {
    id: 'CUST016',
    name: 'Fatima Khan',
    email: 'fatima.khan@example.com',
    phone: '9876543240',
    secondaryPhone: '9876543241',
    address: '444 Charminar, Hyderabad, Telangana 500002',
    gender: 'Female',
    dob: '1989-11-20',
    idType: 'Aadhaar Card',
    idNumber: '445566778899',
    secondaryIdType: 'Bank Passbook',
    secondaryIdNumber: '456456456456',
    occupation: 'Shopkeeper',
    monthlyIncome: 40000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-04-15',
  },
  {
    id: 'CUST017',
    name: 'Suresh Menon',
    email: 'suresh.menon@example.com',
    phone: '9876543242',
    secondaryPhone: '9876543243',
    address: '555 Marine Drive, Mumbai, Maharashtra 400020',
    gender: 'Male',
    dob: '1975-04-14',
    idType: 'PAN Card',
    idNumber: 'TUVWX6789T',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '556677889900',
    occupation: 'Consultant',
    monthlyIncome: 180000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-05-28',
  },
  {
    id: 'CUST018',
    name: 'Divya Bhat',
    email: 'divya.bhat@example.com',
    phone: '9876543244',
    secondaryPhone: '9876543245',
    address: '666 Panjim, Goa 403001',
    gender: 'Female',
    dob: '2000-01-01',
    idType: 'Aadhaar Card',
    idNumber: '667788990011',
    secondaryIdType: 'Voter ID',
    secondaryIdNumber: 'GA9876543',
    occupation: 'Freelancer',
    monthlyIncome: 55000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-06-30',
  },
  {
    id: 'CUST019',
    name: 'Hari Prasad',
    email: 'hari.prasad@example.com',
    phone: '9876543246',
    secondaryPhone: '9876543247',
    address: '777 T. Nagar, Chennai, Tamil Nadu 600017',
    gender: 'Male',
    dob: '1982-09-09',
    idType: 'Voter ID',
    idNumber: 'TNY1234567',
    secondaryIdType: 'Aadhaar Card',
    secondaryIdNumber: '778899001122',
    occupation: 'Civil Engineer',
    monthlyIncome: 100000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-07-07',
  },
  {
    id: 'CUST020',
    name: 'Lakshmi Iyer',
    email: 'lakshmi.iyer@example.com',
    phone: '9876543248',
    secondaryPhone: '9876543249',
    address: '888 Mylapore, Chennai, Tamil Nadu 600004',
    gender: 'Female',
    dob: '1978-12-12',
    idType: 'Aadhaar Card',
    idNumber: '889900112233',
    secondaryIdType: 'Bank Passbook',
    secondaryIdNumber: '789789789789',
    occupation: 'Musician',
    monthlyIncome: 70000,
    profilePicture: 'https://placehold.co/100x100',
    registrationDate: '2024-07-15',
  },
];

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
