export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  const { url } = req.body
  if (!url) return res.status(400).json({error:'url required'})

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SouthOrNot/1.0)' },
      signal: AbortSignal.timeout(8000)
    })
    const html = await response.text()
    // Strip HTML tags, collapse whitespace, limit to 3000 chars
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
    res.status(200).json({ text })
  } catch(err) {
    res.status(500).json({ error: 'Could not fetch URL: ' + err.message })
  }
}
