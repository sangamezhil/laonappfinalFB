import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'financials.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ investments: [], expenses: [] }), 'utf-8')
}

function readData() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return { investments: [], expenses: [] }
  }
}

function writeData(data: any) {
  ensureDataFile()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET() {
  const data = readData()
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    // Replace entire financials object when POSTed
    const updated = { ...payload }
    writeData(updated)
    return NextResponse.json(updated, { status: 201 })
  } catch (err) {
    console.error('POST /api/financials error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
