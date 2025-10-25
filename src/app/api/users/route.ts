import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'users.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]), 'utf-8')
}

function readData() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeData(data: any[]) {
  ensureDataFile()
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function generateUserId(users: any[]) {
  const ids = users.map(u => u.id).filter(Boolean).map((id: string) => parseInt(id.replace(/^USR/, ''), 10)).filter(n => !isNaN(n))
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1
  return `USR${String(next).padStart(3, '0')}`
}

export async function GET() {
  const data = readData()
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const users = readData()
    let id = payload?.id
    if (!id) id = generateUserId(users)
    const newUser = { id, ...payload }
    const updated = [...users, newUser]
    writeData(updated)
    return NextResponse.json(newUser, { status: 201 })
  } catch (err) {
    console.error('POST /api/users error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json()
    const { id, changes } = payload || {}
    if (!id || !changes) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const users = readData()
    const updated = users.map((u: any) => u.id === id ? { ...u, ...changes } : u)
    writeData(updated)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/users error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
