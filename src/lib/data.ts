
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
  loanType: 'Personal' | 'Group';
  amount: number;
  interestRate: number;
  term: number; // in weeks
  status: 'Pending' | 'Active' | 'Overdue' | 'Closed';
  disbursalDate: string;
  weeklyRepayment: number;
  totalPaid: number;
  outstandingAmount: number;
};

const initialCustomers: Customer[] = [
  { id: 'CUST001', name: 'Ravi Kumar', email: 'ravi.kumar@example.com', phone: '9876543210', address: '123, MG Road, Bangalore', idType: 'Aadhaar Card', idNumber: '1234 5678 9012', occupation: 'Software Engineer', monthlyIncome: 80000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-01-15' },
  { id: 'CUST002', name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '8765432109', address: '456, Main Street, Mumbai', idType: 'PAN Card', idNumber: 'ABCDE1234F', occupation: 'Graphic Designer', monthlyIncome: 65000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-02-20' },
  { id: 'CUST003', name: 'Amit Singh', email: 'amit.singh@example.com', phone: '7654321098', address: '789, Park Avenue, Delhi', idType: 'Voter ID', idNumber: 'XYZ1234567', occupation: 'Marketing Manager', monthlyIncome: 95000, profilePicture: 'https://placehold.co/100x100', registrationDate: '2023-03-10' },
];

const initialLoans: Loan[] = [
  { id: 'LOAN001', customerId: 'CUST001', customerName: 'Ravi Kumar', loanType: 'Personal', amount: 50000, interestRate: 12, term: 50, status: 'Active', disbursalDate: '2023-05-01', weeklyRepayment: 1120, totalPaid: 22400, outstandingAmount: 33600 },
  { id: 'LOAN002', customerId: 'CUST002', customerName: 'Priya Sharma', loanType: 'Personal', amount: 25000, interestRate: 15, term: 20, status: 'Overdue', disbursalDate: '2023-06-15', weeklyRepayment: 1406.25, totalPaid: 11250, outstandingAmount: 16875 },
  { id: 'LOAN003', customerId: 'CUST001', customerName: 'Ravi Kumar', loanType: 'Personal', amount: 100000, interestRate: 10, term: 50, status: 'Closed', disbursalDate: '2022-01-20', weeklyRepayment: 2200, totalPaid: 110000, outstandingAmount: 0 },
  { id: 'LOAN004', customerId: 'GRP001', customerName: 'Suresh Patel (Leader)', groupName: 'Sahara Group', loanType: 'Group', amount: 200000, interestRate: 18, term: 40, status: 'Active', disbursalDate: '2023-07-01', weeklyRepayment: 6800, totalPaid: 81600, outstandingAmount: 180400 },
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
        if (!isLoaded) {
            localStorage.setItem('customers', JSON.stringify(data));
        }
        setCustomers(data);
        setIsLoaded(true);
    }, [isLoaded]);

    const addCustomer = (customer: Omit<Customer, 'id' | 'registrationDate' | 'profilePicture'>) => {
        const currentCustomers = getCustomersFromStorage();
        const newIdNumber = currentCustomers.length + 1;
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
        if(!isLoaded) {
            localStorage.setItem('loans', JSON.stringify(data));
        }
        setLoans(data);
        setIsLoaded(true);
    }, [isLoaded]);

    const addLoan = (loan: Omit<Loan, 'id'>) => {
        const currentLoans = getLoansFromStorage();
        const newIdNumber = currentLoans.length + 1;
        const newLoan: Loan = {
            ...loan,
            id: `LOAN${String(newIdNumber).padStart(3, '0')}`,
        };
        const updatedLoans = [...currentLoans, newLoan];
        localStorage.setItem('loans', JSON.stringify(updatedLoans));
        setLoans(updatedLoans);
    };

    return { loans, addLoan, isLoaded };
}


export function getCustomerById(id: string) {
  return getCustomersFromStorage().find(c => c.id === id);
}

export function getLoansByCustomerId(customerId: string) {
  return getLoansFromStorage().filter(l => l.customerId === customerId);
}
