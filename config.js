/* ============================================================
   MR ZF — CENTRAL CONFIGURATION
   ------------------------------------------------------------
   This is YOUR control panel. Everything business-specific
   lives in this one file. You normally never need to touch
   any other file to run your store.

   HOW TO EDIT:
   1. Change the value between the quotes " ".
   2. Keep the quotes and keep the comma at the end.
   3. Save / Commit — your live website updates automatically.

   The 3 things you MUST update before sharing your website:
     1. whatsappNumber  → your real WhatsApp Business number
     2. bookingUrl      → your Google Calendar booking link
     3. your founder photo (see README → "Add your founder photo")
   ============================================================ */

window.MRZF_CONFIG = {

  /* ---------- BRAND ---------- */
  brandName: "Mr ZF",
  ownerName: "Zulkaif Akbar",

  /* Shown under the logo and in the footer. Change it any time. */
  tagline: "Modern Style. Your Signature.",

  /* Thin bar at the very top of every page. */
  announcement: "Pakistan-wide orders — Order directly on WhatsApp",

  /* ---------- CONTACT ---------- */

  /* Your WhatsApp number in INTERNATIONAL format but:
     - NO "+" sign
     - NO spaces, dashes or brackets
     Example: Pakistani number +92 300 1234567  →  "923001234567"
     ⚠ REPLACE THE X LETTERS BELOW WITH YOUR REAL NUMBER. */
  whatsappNumber: "923XXXXXXXXX",

  /* How your number is shown to humans on the Contact page. */
  whatsappDisplay: "+92 3XX XXXXXXX",

  /* Business email — used by the "Email Us" buttons. */
  email: "zulkaifakbar6@gmail.com",

  /* ---------- APPOINTMENTS ---------- */

  /* Paste your Google Calendar "Appointment schedule" booking link here.
     It looks like: https://calendar.google.com/calendar/u/0/appointments/schedules/XXXXXXXX
     How to get it: README → "Set up your appointment system".
     Leave it as "" (empty) and the website shows a friendly
     "booking not set up yet" message instead of a broken link. */
  bookingUrl: "",

  /* ---------- SHOP ---------- */
  currency: "PKR",

  /* ---------- SOCIAL MEDIA (optional) ---------- */
  /* Paste your profile links between the quotes.
     If a link is left empty "", that icon is hidden automatically.
     Do NOT put "#" or fake links. */
  social: {
    instagramUrl: "",
    facebookUrl:  "",
    tiktokUrl:    ""
  },

  /* ---------- PDF DOCUMENTS (optional) ---------- */
  /* Upload a PDF into  assets/documents/  on GitHub, then add an
     entry here and it appears automatically on the Product page.

     Example (remove the // at the line start to switch it on):
     documents: [
       { name: "Size Guide (PDF)",  file: "assets/documents/size-guide.pdf"  },
       { name: "Full Catalogue (PDF)", file: "assets/documents/catalogue.pdf" }
     ],
     If the list stays empty, no document links are shown — no broken links. */
  documents: []

};
