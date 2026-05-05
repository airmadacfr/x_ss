export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id || !/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid tweet ID' });

  try {
    // Twitter's public syndication API — no auth needed
    const synUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=fr&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue&token=x`;
    const synRes = await fetch(synUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://platform.twitter.com/',
        'Origin': 'https://platform.twitter.com'
      }
    });

    if (!synRes.ok) return res.status(synRes.status).json({ error: `Syndication API error: ${synRes.status}` });

    const data = await synRes.json();

    // Extract image URLs — use ONE source only, in priority order
    // to avoid duplicates (photos, mediaDetails and entities all contain the same images)
    const images = [];

    if (data.mediaDetails && Array.isArray(data.mediaDetails) && data.mediaDetails.length > 0) {
      // Best source: mediaDetails has type info
      data.mediaDetails.forEach(m => {
        if (m.media_url_https && (m.type === 'photo' || m.type === 'video')) {
          images.push(m.media_url_https + '?name=large');
        }
      });
    } else if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
      // Fallback: photos array
      data.photos.forEach(p => { if (p.url) images.push(p.url); });
    }
    // Never use entities.media as it duplicates the above

    const unique = [...new Set(images)];

    return res.status(200).json({
      images: unique,
      text: data.text || data.full_text || '',
      created_at: data.created_at || '',
      favorite_count: data.favorite_count || 0,
      retweet_count: data.retweet_count || 0,
      reply_count: data.reply_count || 0,
      user: data.user ? {
        name: data.user.name,
        screen_name: data.user.screen_name,
        profile_image_url: data.user.profile_image_url_https,
        verified: data.user.verified || data.user.is_blue_verified
      } : null
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
