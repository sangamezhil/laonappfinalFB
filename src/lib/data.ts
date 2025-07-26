
'use client';
import { useState, useEffect } from 'react';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  idType: 'Aadhaar Card' | 'PAN Card' | 'Ration Card' | 'Voter ID' | 'Bank Passbook' | 'Gas Book';
  idNumber: string;
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

const initialCustomers: Customer[] = [
  { id: 'CUST001', name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone: '9876543210', address: '123, MG Road, Bangalore', idType: 'Aadhaar Card', idNumber: '1234 5678 9012', occupation: 'Software Engineer', monthlyIncome: 80000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-01-15' },
  { id: 'CUST002', name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '8765432109', address: '456, Main Street, Mumbai', idType: 'PAN Card', idNumber: 'ABCDE1234F', occupation: 'Graphic Designer', monthlyIncome: 65000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-02-20' },
  { id: 'CUST003', name: 'Amit Singh', email: 'amit.singh@example.com', phone: '7654321098', address: '789, Park Avenue, Delhi', idType: 'Voter ID', idNumber: 'XYZ1234567', occupation: 'Marketing Manager', monthlyIncome: 95000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-03-10' },
  { id: 'CUST004', name: 'Sunita Devi', email: 'sunita.devi@example.com', phone: '6543210987', address: '101, Civil Lines, Pune', idType: 'Aadhaar Card', idNumber: '9876 5432 1098', occupation: 'Teacher', monthlyIncome: 50000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-04-05' },
  { id: 'CUST005', name: 'Rajesh Verma', email: 'rajesh.verma@example.com', phone: '5432109876', address: '202, JVPD Scheme, Mumbai', idType: 'PAN Card', idNumber: 'FGHIJ5678K', occupation: 'Businessman', monthlyIncome: 120000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-05-12' },
  { id: 'CUST006', name: 'Anita Desai', email: 'anita.desai@example.com', phone: '4321098765', address: '303, Koramangala, Bangalore', idType: 'Voter ID', idNumber: 'LMN8765432', occupation: 'Doctor', monthlyIncome: 150000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-06-18' },
  { id: 'CUST007', name: 'Sanjay Gupta', email: 'sanjay.gupta@example.com', phone: '3210987654', address: '404, Salt Lake, Kolkata', idType: 'Aadhaar Card', idNumber: '8765 4321 0987', occupation: 'Architect', monthlyIncome: 110000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-07-22' },
  { id: 'CUST008', name: 'Meena Kumari', email: 'meena.kumari@example.com', phone: '2109876543', address: '505, Anna Nagar, Chennai', idType: 'Bank Passbook', idNumber: '9988776655', occupation: 'Homemaker', monthlyIncome: 25000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-08-01' },
];

const initialLoans: Loan[] = [
  { id: 'LOAN001', customerId: 'CUST001', customerName: 'Ravi Kumar', loanType: 'Personal', amount: 50000, interestRate: 12, term: 10, status: 'Active', disbursalDate: '2023-05-01', weeklyRepayment: 5000, totalPaid: 25000, outstandingAmount: 25000, collectionFrequency: 'Weekly' },
  { id: 'LOAN002', customerId: 'CUST002', customerName: 'Priya Sharma', loanType: 'Personal', amount: 25000, interestRate: 20, term: 70, status: 'Overdue', disbursalDate: '2023-06-15', weeklyRepayment: 357.14, totalPaid: 10000, outstandingAmount: 15000, collectionFrequency: 'Daily' },
  { id: 'LOAN003', customerId: 'CUST003', customerName: 'Amit Singh', loanType: 'Personal', amount: 100000, interestRate: 12, term: 10, status: 'Closed', disbursalDate: '2022-01-20', weeklyRepayment: 10000, totalPaid: 100000, outstandingAmount: 0, collectionFrequency: 'Weekly' },
  { id: 'LOAN004', customerId: 'CUST004', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Sunita Devi' },
  { id: 'LOAN005', customerId: 'CUST005', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Rajesh Verma' },
  { id: 'LOAN006', customerId: 'CUST006', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Anita Desai' },
  { id: 'LOAN007', customerId: 'CUST007', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Sanjay Gupta' },
  { id: 'LOAN008', customerId: 'CUST008', groupName: 'Sahara Group', groupId: 'GRP001', groupLeaderName: 'Suresh Patel', loanType: 'Group', amount: 40000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 1000, totalPaid: 12000, outstandingAmount: 28000, customerName: 'Meena Kumari' },
];

const getCustomersFromStorage = (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('customers');
    return stored ? JSON.parse(stored) : initialCustomers;
}

const getLoansFromStorage = (): Loan[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('loans');
    return stored ? JSON.parse(stored) : initialLoans;
}

export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const data = getCustomersFromStorage();
        if (!localStorage.getItem('customers')) {
            localStorage.setItem('customers', JSON.stringify(data));
        }
        setCustomers(data);
        setIsLoaded(true);
    }, []);

    const addCustomer = (customer: Omit<Customer, 'id' | 'registrationDate' | 'profilePicture'>) => {
        const currentCustomers = getCustomersFromStorage();
        const newIdNumber = (currentCustomers.length > 0 ? Math.max(...currentCustomers.map(c => parseInt(c.id.replace('CUST','')))) : 0) + 1;
        const newCustomer: Customer = {
            ...customer,
            id: `CUST${String(newIdNumber).padStart(3, '0')}`,
            registrationDate: new Date().toISOString().split('T')[0],
            profilePicture: 'https://placehold.co/100x100',
        };
        const updatedCustomers = [...currentCustomers, newCustomer];
        localStorage.setItem('customers', JSON.stringify(updatedCustomers));
        setCustomers(updatedCustomers);
    };

    return { customers, addCustomer, isLoaded };
};

export const useLoans = () => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

     useEffect(() => {
        const data = getLoansFromStorage();
        if(!localStorage.getItem('loans')) {
            localStorage.setItem('loans', JSON.stringify(data));
        }
        setLoans(data);
        setIsLoaded(true);
    }, []);

    const addLoan = (loan: Omit<Loan, 'id'> | Omit<Loan, 'id'>[]) => {
        const currentLoans = getLoansFromStorage();
        let lastIdNumber = (currentLoans.length > 0 ? Math.max(...currentLoans.map(l => parseInt(l.id.replace('LOAN','')))) : 0);
        
        const loansToAdd: Loan[] = [];
        
        if (Array.isArray(loan)) {
            loan.forEach(l => {
                lastIdNumber++;
                loansToAdd.push({
                    ...l,
                    id: `LOAN${String(lastIdNumber).padStart(3, '0')}`,
                });
            });
        } else {
            lastIdNumber++;
            loansToAdd.push({
                ...loan,
                id: `LOAN${String(lastIdNumber).padStart(3, '0')}`,
            });
        }

        const updatedLoans = [...currentLoans, ...loansToAdd];
        localStorage.setItem('loans', JSON.stringify(updatedLoans));
        setLoans(updatedLoans);
    };
    
    const updateLoanStatus = (loanId: string, status: Loan['status']) => {
        const currentLoans = getLoansFromStorage();
        const updatedLoans = currentLoans.map(loan => 
            loan.id === loanId ? { ...loan, status: status } : loan
        );
        localStorage.setItem('loans', JSON.stringify(updatedLoans));
        setLoans(updatedLoans);
    };

    return { loans, addLoan, isLoaded, updateLoanStatus };
}


export function getCustomerById(id: string) {
  const customers = getCustomersFromStorage();
  return customers.find(c => c.id === id);
}

export function getLoansByCustomerId(customerId: string) {
  const loans = getLoansFromStorage();
  return loans.filter(l => l.customerId === customerId);
}
