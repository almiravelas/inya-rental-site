/*
  Password protection for the admin page
  --------------------------------------
  Vercel runs this on its servers before sending /admin, so nobody can open
  the admin page (or its script) without the password. The public site is
  not affected.

  Set these in Vercel → your project → Settings → Environment Variables:
    ADMIN_PASSWORD   required. Use a long one (12+ characters).
    ADMIN_USER       optional. Defaults to "inya".

  If ADMIN_PASSWORD isn't set, the admin page stays locked for everyone.
  Which paths this covers is set under "proxy" in vercel.json.
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

// Compare two strings in constant time, so the response time
// doesn't leak how much of a guess was right.
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

export default async function proxy(request) {
  var password = process.env.ADMIN_PASSWORD;
  var user = process.env.ADMIN_USER || "inya";
  if (!password) return deny(503, "The admin page is locked: ADMIN_PASSWORD isn't set in Vercel.");

  var creds = decodeBasic(request.headers.get("authorization"));
  var okUser = await same(creds ? creds.user : "", user);
  var okPass = await same(creds ? creds.pass : "", password);
  if (!creds || !okUser || !okPass) return deny(401, "Sign in to open the admin page.");

  // Correct password: return nothing so Vercel serves the page as normal.
}
