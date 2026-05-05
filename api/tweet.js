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

    // Extract image URLs from the syndication response
    const images = [];

    // photos array
    if (data.photos && Array.isArray(data.photos)) {
      data.photos.forEach(p => {
        if (p.url) images.push(p.url);
      });
    }

    // mediaDetails
    if (data.mediaDetails && Array.isArray(data.mediaDetails)) {
      data.mediaDetails.forEach(m => {
        if (m.media_url_https && m.type === 'photo') {
          images.push(m.media_url_https + '?name=large');
        }
        // video thumbnail
        if (m.type === 'video' && m.media_url_https) {
          images.push(m.media_url_https + '?name=large');
        }
      });
    }

    // entities.media
    if (data.entities?.media) {
      data.entities.media.forEach(m => {
        if (m.media_url_https && !images.includes(m.media_url_https)) {
          images.push(m.media_url_https + '?name=large');
        }
      });
    }

    // Deduplicate
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
