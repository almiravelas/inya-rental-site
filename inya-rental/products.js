/*
  HI.INYA — product list
  ----------------------
  This is the only file you need to edit to add, remove or update pieces.

  Fields
    id          short unique id, used in the link (e.g. #item-dahlia)
    category    "dress" or "top"  (decides which tab it shows under)
    name        full name shown on the detail page
    shortName   optional, shorter name for the collection card
    brand       shown on the card and in the details table
    size        text shown in the details table
    price       text shown in the details table
    images      list of photo paths for the detail page carousel
    cover       optional, photo for the collection card (default: first image)
    booked      dates that are rented out
    laundering  dates the piece is being cleaned

  Dates are "YYYY-MM-DD". For a run of days use a pair: ["2026-11-20", "2026-11-22"]
*/

window.INYA_PRODUCTS = [
  {
    id: "dahlia",
    category: "dress",
    name: "The Dahlia Contrast Godet Maxi",
    brand: "Ever New",
    size: "S / EU 36 / UK 8 / US 4",
    price: "500 (2 days) · 550 (3 days)",
    images: ["images/dahlia-1.jpg", "images/dahlia-2.jpg", "images/dahlia-3.jpg"],
    booked: [["2026-11-20", "2026-11-22"]],
    laundering: ["2026-11-19", "2026-11-23"],
  },
  {
    id: "diana",
    category: "dress",
    name: "Diana Bow Dress",
    brand: "The Editor's Market",
    size: "As listed on the brand's page",
    price: "400 (2 days) · 450 (3 days)",
    images: ["images/diana-1.jpg", "images/diana-2.jpg", "images/diana-3.jpg"],
    booked: [],
    laundering: [],
  },
  {
    id: "michael-leyva",
    category: "top",
    name: "Michael Leyva Top",
    brand: "Plains & Prints x Michael Leyva",
    size: "PH M / UK 10 / US 6",
    price: "350 (2 days) · 400 (3 days)",
    images: ["images/michael-1.jpg", "images/michael-2.jpg", "images/michael-3.jpg"],
    booked: [],
    laundering: [],
  },
  {
    id: "sidney",
    category: "top",
    name: "Sidney Tencel Top",
    brand: "Love Bonito",
    size: "TBA",
    price: "TBA",
    images: ["images/sidney-1.jpg"],
    booked: [],
    laundering: [],
  },
  {
    id: "gianna",
    category: "top",
    name: "Gianna Wrap Halter Brown Top",
    shortName: "Gianna Wrap Halter Top",
    brand: "Love Bonito",
    size: "S",
    price: "300 (2 days) · 350 (3 days)",
    cover: "images/gianna-2.jpg",
    images: ["images/gianna-1.jpg", "images/gianna-2.jpg"],
    booked: [],
    laundering: [],
  },
];

/* Where the "Book your dress" button sends people */
window.INYA_CONFIG = {
  instagram: "hi.inya",
  bookingLink: "https://ig.me/m/hi.inya", // opens an Instagram DM
};
