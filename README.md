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

## Adding pieces (admin page)

Go to `/admin` on the site (it isn't linked from the public pages). Fill in a piece, add its photos, and click **Add piece**. Add as many as you like, then:

1. Click **Download products.js** and replace `products.js` in the repo with it.
2. Click each photo link and save it into `images/`. The names are already filled in.
3. Commit and push.

The site has no server, so the admin page can't change the live site on its own, and anyone who finds `/admin` can only make files on their own computer.

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
