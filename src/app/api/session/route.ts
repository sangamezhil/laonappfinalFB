import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8')
}

function readUsers() {
  ensureFiles()
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body || {}
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    const users = readUsers()
    const found = users.find((u: any) => u.username.toLowerCase() === String(username).toLowerCase() && u.password === password)
    if (!found) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    // Set a simple httpOnly cookie containing the user id. In a production app
    // use a secure session store and signed tokens.
    const cookie = `session=${found.id}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}`
    return NextResponse.json(found, { status: 200, headers: { 'Set-Cookie': cookie } })
  } catch (err) {
    console.error('POST /api/session error', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get('cookie') || ''
    const match = cookie.match(/session=([^;]+)/)
    if (!match) return NextResponse.json(null)
    const userId = match[1]
    const users = readUsers()
    const found = users.find((u: any) => u.id === userId) || null
    return NextResponse.json(found)
  } catch (err) {
    console.error('GET /api/session error', err)
    return NextResponse.json(null)
  }
}

export async function DELETE() {
  // Clear cookie
  const cookie = 'session=; Path=/; HttpOnly; Max-Age=0'
  return NextResponse.json({ success: true }, { headers: { 'Set-Cookie': cookie } })
}
