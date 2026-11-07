// Recognises the video links products may carry: YouTube, Google Drive (shared video) or a direct video file.
// Anything else is rejected, so only trusted embed hosts ever reach the storefront.
function parseVideo(input) {
  let u;
  try { u = new URL(String(input || '').trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = null;

  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else id = (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,15})/) || [])[1];
  }
  if (id && /^[\w-]{6,15}$/.test(id)) return { type: 'youtube', id, url: u.toString() };

  if (host === 'drive.google.com') {
    id = (u.pathname.match(/\/file\/d\/([\w-]+)/) || [])[1] || u.searchParams.get('id');
    if (id && /^[\w-]{10,}$/.test(id)) return { type: 'drive', id, url: u.toString() };
  }
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { type: 'file', url: u.toString() };
  return null;
}

module.exports = { parseVideo };
