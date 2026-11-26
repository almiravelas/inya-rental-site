# Hi.Inya Rental

A static site for Inya's closet rental, rebuilt from the Canva design. It's plain HTML, CSS and JavaScript with no build step, so it runs on Vercel's free (Hobby) plan as is.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page shell: header, footer, fonts |
| `styles.css` | All styling |
| `app.js` | Collection grid, detail pages, photo carousel, calendar |
| `products.js` | **Your pieces, prices and booked dates. Edit this one.** |
| `images/` | Product photos |
| `admin.html`, `admin.js`, `admin.css` | The admin page at `/admin` |
| `api/admin.js` | Publishes pieces from the admin page to GitHub |
| `proxy.js`, `lib/auth.js` | Admin password check |

## Adding pieces (admin page)

Go to `/admin` on the site (it isn't linked from the public pages) and sign in. Add photos, fill in the details, and click **Publish**. The piece is live in about a minute.

Behind the scenes, the page shrinks photos to 1600px JPEGs, then `api/admin.js` saves them to `images/` and adds the piece to `products.js` in one commit on GitHub, "Add <name> (from admin)". Vercel deploys that commit like any other. To undo a piece, revert that commit on GitHub. Run `git pull` before editing files on your computer, so you have the pieces added from the admin page.

### One-time setup in Vercel

In your Vercel project, go to **Settings → Environment Variables** (free on the Hobby plan) and add:

- `ADMIN_PASSWORD`: a long password (12+ characters). Until it's set, `/admin` stays locked for everyone.
- `ADMIN_USER`: optional username. Defaults to `inya`.
- `GITHUB_TOKEN`: lets the admin page save to GitHub. To make one:
  1. On github.com go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
  2. Name it `hi-inya-admin` and pick an expiration (up to a year; set a reminder to replace it).
  3. Under **Repository access**, choose **Only select repositories** and pick `inya-rental-site`.
  4. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**. Leave everything else as is.
  5. Generate it, copy it, and paste it into Vercel as `GITHUB_TOKEN`. Don't put it anywhere else.

Then redeploy. Your browser asks for the username and password the first time you open `/admin`.

`proxy.js` checks the password on Vercel's servers before sending anything under `/admin` or `/api`, and `api/admin.js` checks it again. On your own computer nothing is locked and **Publish** won't work, because it only runs on Vercel.

## Updating pieces and the calendar

To edit or remove a piece, or change its dates, open `products.js`. Each piece looks like this:

```js
{
  id: "dahlia",
  category: "dress",              // "dress" or "top"
  name: "The Dahlia Contrast Godet Maxi",
  brand: "Ever New",
  size: "S / EU 36 / UK 8 / US 4",
  price: "500 (2 days) · 550 (3 days)",
  images: ["images/dahlia-1.jpg", "images/dahlia-2.jpg"],
  booked: [["2026-11-20", "2026-11-22"]],   // a range of days
  laundering: ["2026-11-19", "2026-11-23"], // single days
}
```

Commit and push, and Vercel redeploys on its own in under a minute.

## Deploy to Vercel (free)

1. Create a new GitHub repo (for example `inya-rental`) and upload all of these files. On github.com you can drag the files onto **Add file → Upload files**.
2. Go to vercel.com, sign in with GitHub, and click **Add New → Project**.
3. Pick the repo and click **Deploy**. Leave Framework Preset as **Other**, with no build command.
4. You get a link like `inya-rental.vercel.app`. You can rename it under **Settings → Domains**.

Or use the CLI from this folder: `npx vercel` (first time), then `npx vercel --prod`.

## Photos

The current photos were cropped from a screen recording, so they're a little soft. For sharper ones, replace the files in `images/` with the originals using the same names, or add new names to `products.js`. Portrait photos around 4:5 look best.
