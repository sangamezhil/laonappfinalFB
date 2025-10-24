import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(CUSTOMERS_FILE)) {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify([]), 'utf-8')
  }
}

function readCustomers() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(CUSTOMERS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeCustomers(data: any[]) {
  ensureDataFile()
  fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function generateCustomerId(customers: any[]) {
  const ids = customers
    .map(c => c.id)
    .filter(Boolean)
    .map((id: string) => parseInt(id.replace(/^CUST/, ''), 10))
    .filter(n => !isNaN(n))
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1
  return `CUST${String(next).padStart(3, '0')}`
}

export async function GET() {
  const customers = readCustomers()
  return NextResponse.json(customers)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const customers = readCustomers()

    // Accept client-provided id if present and not already used; otherwise generate
    const now = new Date().toISOString().split('T')[0]
    let id = payload?.id
    if (id) {
      // ensure not duplicate
      const exists = customers.some((c: any) => c.id === id)
      if (exists) {
        // fall back to generated id
        id = generateCustomerId(customers)
      }
    } else {
      id = generateCustomerId(customers)
    }

    const newCustomer = {
      id,
      registrationDate: now,
      profilePicture: payload?.profilePicture || 'https://placehold.co/100x100',
      ...payload,
    }

    const updated = [...customers, newCustomer]
    writeCustomers(updated)

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (err) {
    console.error('POST /api/customers error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
