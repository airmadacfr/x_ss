export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid tweet ID' });
  }

  const tweetUrl = `https://twitter.com/i/status/${id}`;
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&dnt=true`;

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Twitter API error: ${response.status}` });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
