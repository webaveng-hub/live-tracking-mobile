import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const port = Number(process.env.PORT || 3000)
const root = process.cwd()

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

async function readBody(request) {
  let raw = ''
  for await (const chunk of request) raw += chunk
  return JSON.parse(raw || '{}')
}

async function handleTelegram(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed' })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return sendJson(response, 500, { error: 'Telegram belum dikonfigurasi' })

  try {
    const body = await readBody(request)
    const name = String(body.name || '').trim().slice(0, 120)
    const origin = String(body.origin || '').trim().slice(0, 300)
    const destination = String(body.destination || '').trim().slice(0, 300)
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)
    if (!name || !origin || !destination) return sendJson(response, 400, { error: 'Data tracking tidak lengkap' })

    const location = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `\\nLokasi tujuan: https://www.google.com/maps?q=${latitude},${longitude}`
      : ''
    const text = [
      'Notifikasi Live Tracking',
      `Nama: ${name}`,
      `Dikirim dari: ${origin}`,
      `Diantar ke: ${destination}${location}`,
      `Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
    ].join('\\n')

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!telegramResponse.ok) return sendJson(response, 502, { error: 'Telegram gagal menerima notifikasi' })
    return sendJson(response, 200, { ok: true })
  } catch {
    return sendJson(response, 400, { error: 'Permintaan tidak valid' })
  }
}

const server = http.createServer(async (request, response) => {
  if (request.url === '/api/notify-telegram') return handleTelegram(request, response)

  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0]
  const filePath = normalize(join(root, requested))
  if (!filePath.startsWith(root)) return sendJson(response, 403, { error: 'Forbidden' })

  try {
    const content = await readFile(filePath)
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' }
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' })
    response.end(content)
  } catch {
    sendJson(response, 404, { error: 'Not found' })
  }
})

server.listen(port, () => console.log(`Live Tracking berjalan di http://localhost:${port}`))
