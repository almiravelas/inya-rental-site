/*
  Password protection for the admin page and its API.
  Vercel runs this on its servers before sending anything under /admin or
  /api, so nobody can open them without the password. The public site is
  not affected. Paths are set under "proxy" in vercel.json; the password
  settings are explained in lib/auth.js.
*/
import { checkAuth } from "./lib/auth.js";

export default async function proxy(request) {
  var denied = await checkAuth(request);
  if (denied) return denied;
  // Correct password: return nothing so Vercel serves the page as normal.
}
