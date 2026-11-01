export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return response.status(500).json({ error: 'Telegram belum dikonfigurasi' })
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {}
    const name = String(body.name || '').trim().slice(0, 120)
    const origin = String(body.origin || '').trim().slice(0, 300)
    const destination = String(body.destination || '').trim().slice(0, 300)
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!name || !origin || !destination) {
      return response.status(400).json({ error: 'Data tracking tidak lengkap' })
    }

    const location = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `\nLokasi tujuan: https://www.google.com/maps?q=${latitude},${longitude}`
      : ''
    const text = [
      'Notifikasi Live Tracking',
      `Nama: ${name}`,
      `Dikirim dari: ${origin}`,
      `Diantar ke: ${destination}${location}`,
      `Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
    ].join('\n')

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })

    if (!telegramResponse.ok) {
      return response.status(502).json({ error: 'Telegram gagal menerima notifikasi' })
    }

    return response.status(200).json({ ok: true })
  } catch {
    return response.status(400).json({ error: 'Permintaan tidak valid' })
  }
}
