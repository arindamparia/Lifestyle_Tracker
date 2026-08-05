import crypto from 'crypto';

/**
 * Triggers a Pusher Channels event using native Cloudflare fetch & crypto.
 * Zero external dependencies, ultra-fast, and compatible with Cloudflare Workers.
 */
export async function triggerPusherEvent({
  appId,
  key,
  secret,
  cluster,
  channel,
  event,
  data,
  socketId,
}) {
  const cleanAppId = (appId || '').replace(/^["']|["']$/g, '').trim();
  const cleanKey = (key || '').replace(/^["']|["']$/g, '').trim();
  const cleanSecret = (secret || '').replace(/^["']|["']$/g, '').trim();
  const cleanCluster = (cluster || '').replace(/^["']|["']$/g, '').trim();

  if (!cleanAppId || !cleanKey || !cleanSecret || !cleanCluster) {
    console.warn('[Pusher REST] Missing credentials:', {
      hasAppId: !!cleanAppId,
      hasKey: !!cleanKey,
      hasSecret: !!cleanSecret,
      hasCluster: !!cleanCluster,
    });
    return false;
  }

  const bodyObj = {
    name: event,
    channels: [channel],
    data: typeof data === 'string' ? data : JSON.stringify(data),
  };

  if (socketId) {
    bodyObj.socket_id = socketId;
  }

  const bodyStr = JSON.stringify(bodyObj);
  const bodyMd5 = crypto.createHash('md5').update(bodyStr, 'utf8').digest('hex');
  const authTimestamp = Math.floor(Date.now() / 1000);
  const authVersion = '1.0';

  const params = [
    `auth_key=${cleanKey}`,
    `auth_timestamp=${authTimestamp}`,
    `auth_version=${authVersion}`,
    `body_md5=${bodyMd5}`,
  ];

  const stringToSign = `POST\n/apps/${cleanAppId}/events\n${params.join('&')}`;
  const authSignature = crypto.createHmac('sha256', cleanSecret).update(stringToSign).digest('hex');

  const url = `https://api-${cleanCluster}.pusher.com/apps/${cleanAppId}/events?${params.join('&')}&auth_signature=${authSignature}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Pusher REST] Error ${res.status} triggering ${event}: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[Pusher REST] Network error triggering ${event}:`, err);
    return false;
  }
}
