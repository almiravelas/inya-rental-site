/*
  Admin password check, shared by proxy.js (the admin page) and api/admin.js
  (publishing). Set in Vercel → Settings → Environment Variables:
    ADMIN_PASSWORD   required, 12+ characters
    ADMIN_USER       optional, defaults to "inya"
  If ADMIN_PASSWORD isn't set, everything admin stays locked.
*/

var REALM = "Hi.Inya admin";

function deny(status, message) {
  return new Response(message, {
    status: status,
    headers: {
      "WWW-Authenticate": 'Basic realm="' + REALM + '", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Constant-time comparison, so response timing doesn't leak partial matches.
async function same(a, b) {
  var enc = new TextEncoder();
  var ha = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  var hb = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));
  var diff = 0;
  for (var i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

function decodeBasic(header) {
  var m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header || "");
  if (!m) return null;
  try {
    var bytes = Uint8Array.from(atob(m[1]), function (c) { return c.charCodeAt(0); });
    var text = new TextDecoder().decode(bytes);
    var i = text.indexOf(":");
    return i < 0 ? null : { user: text.slice(0, i), pass: text.slice(i + 1) };
  } catch (e) {
    return null;
  }
}

// Returns a 401/503 Response to send back, or null when the login is correct.
export async function checkAuth(request) {
  var password = process.env.ADMIN_PASSWORD;
  var user = process.env.ADMIN_USER || "inya";
  if (!password) return deny(503, "The admin page is locked: ADMIN_PASSWORD isn't set in Vercel.");

  var creds = decodeBasic(request.headers.get("authorization"));
  var okUser = await same(creds ? creds.user : "", user);
  var okPass = await same(creds ? creds.pass : "", password);
  if (!creds || !okUser || !okPass) return deny(401, "Sign in to open the admin page.");
  return null;
}
