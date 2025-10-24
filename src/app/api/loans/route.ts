import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOANS_FILE = path.join(DATA_DIR, 'loans.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(LOANS_FILE)) fs.writeFileSync(LOANS_FILE, JSON.stringify([]), 'utf-8')
}

function readLoans() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(LOANS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeLoans(data: any[]) {
  ensureDataFile()
  fs.writeFileSync(LOANS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET() {
  const loans = readLoans()
  return NextResponse.json(loans)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const loans = readLoans()

    const toAdd = Array.isArray(payload) ? payload : [payload]
    const added = toAdd.map((p: any) => ({ ...p }))
    const updated = [...loans, ...added]
    writeLoans(updated)
    return NextResponse.json(added, { status: 201 })
  } catch (err) {
    console.error('POST /api/loans error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json()
    const loans = readLoans()

    // Support multiple actions: { action: 'approve', tempId, ledgerId } or
    // { action: 'update', id, changes } or { action: 'payment', id/groupId, amount }
    const { action } = payload || {}

    if (action === 'approve') {
      const { tempId, ledgerId } = payload
      if (!tempId || !ledgerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

      const tempLoan = loans.find((l: any) => l.id === tempId)
      if (!tempLoan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

      // Personal loan
      if (!tempLoan.groupId) {
        const updated = loans.map((l: any) => l.id === tempId ? { ...l, id: ledgerId, status: 'Active', disbursalDate: new Date().toISOString().split('T')[0] } : l)
        writeLoans(updated)
        return NextResponse.json({ success: true })
      }

      // Group loan: update all with same groupId
      const tempGroupId = tempLoan.groupId
      const groupLoans = loans.filter((l: any) => l.groupId === tempGroupId)
      if (groupLoans.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      const groupName = (groupLoans[0].groupName || 'GROUP').replace(/\s/g, '')
      const otherLoans = loans.filter((l: any) => l.groupId !== tempGroupId)
      const finalLoans: any[] = []
      groupLoans.forEach((l: any, index: number) => {
        const newMemberLoanId = `${ledgerId}-${groupName}-${index + 1}`
        finalLoans.push({ ...l, id: newMemberLoanId, groupId: ledgerId, status: 'Active', disbursalDate: new Date().toISOString().split('T')[0] })
      })
      const updated = [...otherLoans, ...finalLoans]
      writeLoans(updated)
      return NextResponse.json({ success: true })
    }

    if (action === 'update') {
      const { id, changes } = payload
      if (!id || !changes) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const updated = loans.map((l: any) => l.id === id ? { ...l, ...changes } : l)
      writeLoans(updated)
      return NextResponse.json({ success: true })
    }

    if (action === 'payment') {
      const { id, groupId, amount } = payload
      if (!amount) return NextResponse.json({ error: 'Missing amount' }, { status: 400 })
      let updated
      if (groupId) {
        const groupLoans = loans.filter((l: any) => l.groupId === groupId)
        if (groupLoans.length === 0) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
        const amountPerMember = amount / groupLoans.length
        updated = loans.map((l: any) => l.groupId === groupId ? { ...l, totalPaid: (l.totalPaid || 0) + amountPerMember, outstandingAmount: (l.outstandingAmount || 0) - amountPerMember } : l)
      } else {
        updated = loans.map((l: any) => l.id === id ? { ...l, totalPaid: (l.totalPaid || 0) + amount, outstandingAmount: (l.outstandingAmount || 0) - amount } : l)
      }
      writeLoans(updated)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('PATCH /api/loans error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
