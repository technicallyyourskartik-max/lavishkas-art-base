"use strict";

/* ==========================================================================
   EDIT ME: studio settings
   Fill these in and the booking flow goes live. Until then the site runs in
   "preview mode" and shows a small yellow note on the payment screen.
   ========================================================================== */
const LAB = {
  studioName: "Lavishka’s Art Base",
  address: "B-54, Sector 18, Kavi Nagar, Ghaziabad",

  whatsapp: "",            // country code + number, no "+" or spaces. Example: "919876543210"
  upiId: "",               // the studio's UPI ID. Example: "lavishka@okhdfcbank"
  payeeName: "Lavishkas Art Base", // name shown in the customer's UPI app
  paymentLink: "",         // optional: a Razorpay / Cashfree payment link for cards and netbanking
  instagram: "",           // optional: handle without @. Example: "lavishkas.artbase"

  seatsPerBatch: 8,
  weekendsAhead: 6         // how many weekends of dates the booking form offers
};

/* ==========================================================================
   EDIT ME: workshops, prices and weekend timetable
   `when` = which day it runs and the start time (24-hour). Prices are drafts.
   ========================================================================== */
const CATEGORIES = [
  { id: "paint",   name: "Painting and illustration" },
  { id: "mixed",   name: "Mixed media and crafts" },
  { id: "textile", name: "Textiles and fibre arts" }
];
const WORKSHOPS = [
  { id: "canvas",     cat: "paint",   name: "Acrylic Canvas Painting", img: "canvas.jpg",   pos: "50% 50%",
    alt: "A bowl of mixed acrylic paint with a brush resting in it",
    blurb: "Paint a canvas of your own in acrylics, with step-by-step guidance on colour and brushwork.",
    mins: 90,  age: "6+",   price: 699,  when: { sat: "11:00", sun: "11:00" } },
  { id: "watercolor", cat: "paint",   name: "Watercolour Studio",    img: "watercolor.jpg", pos: "62% 45%",
    alt: "A hand painting with a fine brush on watercolour paper",
    blurb: "Learn fluid colour mixing and wet-on-wet washes, then finish a small botanical or floral painting to take home.",
    mins: 90,  age: "12+",  price: 649,  when: { sat: "15:30", sun: "15:30" } },
  { id: "pour",       cat: "paint",   name: "Alcohol Ink and Pouring Art", img: "pour.jpg", pos: "50% 48%",
    alt: "Swirling marbled colour in red, blue and yellow around a small flower",
    blurb: "See how ink and paint flow, spread and blend as you tilt and guide them across paper or canvas to make a vibrant abstract.",
    mins: 90,  age: "10+",  price: 899,  when: { sat: "14:30" } },
  { id: "mosaic",     cat: "mixed",   name: "Mosaic Art",            img: "mosaic.jpg",   pos: "50% 50%",
    alt: "Rounded mosaic tiles in cream, black, blue and orange laid close together",
    blurb: "Arrange coloured glass, tiles or mirror pieces onto a backing or lamp base to build a geometric or abstract design.",
    mins: 120, age: "12+",  price: 1499, when: { sat: "12:30" } },
  { id: "candle",     cat: "mixed",   name: "Candle Making and Scent Blending", img: "candle.jpg", pos: "50% 55%",
    alt: "Amber glass jars with a lit candle on a blue shelf",
    blurb: "Learn wax temperatures and wick placement, blend your own fragrance and pour a candle in a glass or concrete vessel.",
    mins: 120, age: "12+",  price: 1199, when: { sat: "17:30" } },
  { id: "block",      cat: "textile", name: "Block Printing and Stamping", img: "block.jpg", pos: "50% 45%",
    alt: "Hands pressing a carved block onto cloth, in black and white",
    blurb: "Stamp patterns with hand-carved blocks and eco-friendly textile ink on a tote bag, scarf or T-shirt.",
    mins: 120, age: "10+",  price: 999,  when: { sun: "17:30" } },
  { id: "cyanotype",  cat: "textile", name: "Cyanotype Sun Printing", img: "cyanotype.jpg", pos: "50% 50%",
    alt: "A blue cyanotype print of plant stems rinsing in a white tray",
    blurb: "Lay leaves and flowers on treated paper or fabric and let the sun develop a blue and white print without a camera.",
    mins: 90,  age: "8+",   price: 799,  when: { sun: "12:30" } }
];


/* ==========================================================================
   helpers
   ========================================================================== */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const pad = n => String(n).padStart(2, "0");
const DAYNAME = { sat: "Saturday", sun: "Sunday" };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const getW = id => WORKSHOPS.find(w => w.id === id);

function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}
function addMins(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
const fmtDate     = d => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(d);
const fmtDateLong = d => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(d);
const toIso   = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const dayKey  = d => (d.getDay() === 6 ? "sat" : d.getDay() === 0 ? "sun" : null);

/** Upcoming dates (today onwards) on which workshop `w` runs. Skips slots that already started today. */
function upcoming(w) {
  const out = [], now = new Date();
  for (let i = 0; i < LAB.weekendsAhead * 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = dayKey(d);
    if (!key || !w.when[key]) continue;
    const [h, m] = w.when[key].split(":").map(Number);
    if (new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m) <= now) continue;
    out.push({ date: d, key, start: w.when[key] });
  }
  return out;
}
function nextDateFor(key) {
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (dayKey(d) === key) return d;
  }
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    return ok;
  }
}

/* ==========================================================================
   workshops grid + filters
   ========================================================================== */
function renderCards() {
  $("#workshop-grid").innerHTML = CATEGORIES.map(c => {
    const list = WORKSHOPS.filter(w => w.cat === c.id);
    if (!list.length) return "";
    return `
    <div class="cat">
      <div class="cat__head"><h3>${c.name}</h3><span>${list.length} ${list.length > 1 ? "workshops" : "workshop"}</span></div>
      ${list.map(w => `
      <article class="wk reveal">
        <figure class="wk__img"><img src="assets/img/${w.img}" width="960" height="720" loading="lazy" alt="${esc(w.alt)}" style="--pos:${w.pos}"></figure>
        <div class="wk__body">
          <h4>${w.name}</h4>
          <p class="wk__blurb">${w.blurb}</p>
        </div>
        <div class="wk__aside">
          <dl class="wk__facts">
            <div><dt>Length</dt><dd>${w.mins} minutes</dd></div>
            <div><dt>Ages</dt><dd>${w.age}</dd></div>
            <div><dt>Runs on</dt><dd>${Object.keys(w.when).map(k => DAYNAME[k]).join(" and ")}</dd></div>
          </dl>
          <div class="wk__foot">
            <div class="price">${inr(w.price)}<small>per person</small></div>
            <a class="btn" href="#book" data-book="${w.id}">Book</a>
          </div>
        </div>
      </article>`).join("")}
    </div>`;
  }).join("");
}

/* ==========================================================================
   weekend plan
   ========================================================================== */
function renderDays() {
  $("#days").innerHTML = ["sat", "sun"].map(k => {
    const rows = WORKSHOPS.filter(w => w.when[k]).sort((a, b) => a.when[k].localeCompare(b.when[k]));
    const next = nextDateFor(k);
    return `
      <section class="day reveal" aria-label="${DAYNAME[k]}">
        <div class="day__head">
          <h3>${DAYNAME[k]}</h3>
          <span>Next: ${fmtDate(next)}</span>
        </div>
        <ul class="slots">
          ${rows.map(w => `
            <li class="slot">
              <div class="slot__time">${fmtTime(w.when[k])}</div>
              <div class="slot__what"><b>${w.name}</b><small>${w.mins} minutes, ${inr(w.price)} per person</small></div>
              <a class="btn btn--sm btn--ghost" href="#book" data-book="${w.id}" data-day="${k}" aria-label="Book ${esc(w.name)} on ${DAYNAME[k]}">Book</a>
            </li>`).join("")}
        </ul>
      </section>`;
  }).join("");
}

/* ==========================================================================
   booking form
   ========================================================================== */
const form = $("#book-form");
const payBox = $("#pay");
let people = 2;

function fillWorkshops() {
  $("#f-workshop").innerHTML = WORKSHOPS.map(w => `<option value="${w.id}">${w.name} (${inr(w.price)} each)</option>`).join("");
}
function fillDates(preferKey) {
  const w = getW($("#f-workshop").value);
  const opts = upcoming(w);
  const sel = $("#f-date");
  const prevIso = sel.value;
  sel.innerHTML = opts.map(o => `<option value="${toIso(o.date)}" data-key="${o.key}">${fmtDate(o.date)}</option>`).join("");
  const want = (preferKey && opts.find(o => o.key === preferKey)) || opts.find(o => toIso(o.date) === prevIso);
  if (want) sel.value = toIso(want.date);
}

function snapshot() {
  const w = getW($("#f-workshop").value);
  const opt = $("#f-date").selectedOptions[0];
  const date = opt ? fromIso(opt.value) : null;
  const key = opt ? opt.dataset.key : null;
  const start = key ? w.when[key] : null;
  const total = w.price * people;
  return { w, date, key, start, end: start ? addMins(start, w.mins) : null, people, total };
}

function updateTicket() {
  const s = snapshot();
  $("#t-title").textContent = s.w.name;
  $("#t-art").src = "assets/img/" + s.w.img;
  $("#t-art").alt = s.w.alt;
  $("#t-art").style.objectPosition = s.w.pos;
  $("#t-when").textContent = s.date ? `${fmtDate(s.date)}, ${fmtTime(s.start)}` : "Pick a day";
  $("#f-time").textContent = s.date ? `${DAYNAME[s.key]}, ${fmtTime(s.start)} to ${fmtTime(s.end)}` : "";
  $("#t-seats").textContent = s.people;
  $("#t-each").textContent = inr(s.w.price);
  $("#t-total").textContent = inr(s.total);
  $("#f-people").textContent = s.people;
  $("#t-now").textContent = `You pay ${inr(s.total)} in full to confirm your ${s.people > 1 ? "seats" : "seat"}.`;
  $("#p-minus").disabled = people <= 1;
  $("#p-plus").disabled = people >= LAB.seatsPerBatch;
}

function setErr(field, msg) {
  $("#err-" + field).textContent = msg;
  $("#fld-" + field).classList.toggle("has-error", !!msg);
  $("#f-" + field).setAttribute("aria-invalid", msg ? "true" : "false");
}
function validate() {
  const name = $("#f-name").value.trim();
  const phone = $("#f-phone").value.trim();
  setErr("name", name.length < 2 ? "Enter your full name." : "");
  setErr("phone", /^[6-9]\d{9}$/.test(phone) ? "" : "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.");
  const bad = $("#fld-name.has-error input, #fld-phone.has-error input");
  if (bad) { bad.focus(); return false; }
  return true;
}

function makeRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  return "LAB-" + [...buf].map(b => alphabet[b % alphabet.length]).join("");
}

/* ---------- payment helpers ---------- */
const PLACEHOLDER_UPI = "your-upi-id@bank";
const upiConfigured = () => !!LAB.upiId;
function upiLink(b) {
  const q = new URLSearchParams({
    pa: LAB.upiId || PLACEHOLDER_UPI,
    pn: LAB.payeeName,
    am: b.total.toFixed(2),
    cu: "INR",
    tn: `${b.ref} ${b.w.name}`
  });
  return "upi://pay?" + q.toString().replace(/\+/g, "%20");
}
function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), m = 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="UPI payment QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#151A22"/></svg>`;
}
function waText(b) {
  return [
    `Hi ${LAB.studioName}! I'd like to book a seat.`,
    "",
    `Workshop: ${b.w.name}`,
    `When: ${fmtDateLong(b.date)}, ${fmtTime(b.start)}`,
    `People: ${b.people}`,
    `Name: ${b.name}`,
    `Phone: ${b.phone}`,
    b.notes ? `Notes: ${b.notes}` : null,
    `Total: ${inr(b.total)}`,
    `Paid in full: ${inr(b.total)}`,
    `Booking ref: ${b.ref}`,
    "",
    "Payment screenshot attached."
  ].filter(x => x !== null).join("\n");
}
function calUrl(b) {
  const stamp = (d, hhmm) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${hhmm.replace(":", "")}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.w.name} at ${LAB.studioName}`,
    dates: `${stamp(b.date, b.start)}/${stamp(b.date, b.end)}`,
    ctz: "Asia/Kolkata",
    location: LAB.address,
    details: `Booking ref ${b.ref}. ${b.people} seat${b.people > 1 ? "s" : ""}.`
  });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

let lastBooking = null;
function showPay(b) {
  lastBooking = b;
  const preview = !LAB.upiId || !LAB.whatsapp;
  const first = esc(b.name.split(/\s+/)[0]);
  const upi = upiLink(b);
  const upiShown = LAB.upiId || PLACEHOLDER_UPI;
  const wa = LAB.whatsapp ? `https://wa.me/${LAB.whatsapp}?text=${encodeURIComponent(waText(b))}` : "";

  payBox.innerHTML = `
    <div class="pay__head">
      <h3>Complete your booking, ${first}.</h3>
      <p>Reference <strong class="ref">${b.ref}</strong>. ${b.people} ${b.people > 1 ? "seats" : "seat"} for ${b.w.name} on ${fmtDate(b.date)} at ${fmtTime(b.start)}.</p>
    </div>

    ${preview ? `<p class="notice"><strong>Preview.</strong> Payments are not switched on yet, so nothing on this screen takes money. The studio can enable them by adding a UPI ID and WhatsApp number in <code>js/main.js</code>.</p>` : ""}

    <section class="pay__step">
      <h4><span class="n">1</span>Pay by UPI</h4>
      <div class="pay__amount">${inr(b.total)}</div>
      <div class="pay__row">
        <div class="qr only-desktop" id="qr">${qrSvg(upi)}</div>
        <div class="stack">
          <a class="btn only-touch" href="${upi}">Open my UPI app</a>
          ${LAB.paymentLink ? `<a class="btn btn--ghost" href="${esc(LAB.paymentLink)}" target="_blank" rel="noopener">Pay by card or netbanking</a>` : ""}
          <div class="upi-id"><code>${esc(upiShown)}</code><button type="button" class="chip" data-copy="${esc(upiShown)}">Copy UPI ID</button></div>
          <p class="hint">Scan with Google Pay, PhonePe, Paytm or any UPI app. The amount and your reference are filled in for you.</p>
        </div>
      </div>
    </section>

    <section class="pay__step">
      <h4><span class="n">2</span>Send us the screenshot</h4>
      ${wa
        ? `<a class="btn btn--whatsapp btn--wide" href="${wa}" target="_blank" rel="noopener">Send booking on WhatsApp</a>`
        : `<button type="button" class="btn btn--wide" data-copy-booking>Copy booking message</button>`}
      <p class="hint">Your seat is confirmed once we reply. We hold it for you in the meantime.</p>
    </section>

    <ul class="policy" aria-label="Booking rules">
      <li>You are paying in full, so there is nothing more to pay at the studio.</li>
      <li>Move your booking once for free if you tell us 24 hours before.</li>
      <li>Inside 24 hours, the payment is not refundable.</li>
    </ul>

    <div class="stack">
      <a class="btn btn--ghost btn--wide" href="${calUrl(b)}" target="_blank" rel="noopener">Add to Google Calendar</a>
      <button type="button" class="linkbtn" data-edit>Change something</button>
    </div>`;

  form.hidden = true;
  payBox.hidden = false;
  $("#book-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showForm() {
  payBox.hidden = true;
  form.hidden = false;
  $("#book-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function initBooking() {
  fillWorkshops();
  fillDates();
  updateTicket();

  $("#f-workshop").addEventListener("change", () => { fillDates(); updateTicket(); });
  $("#f-date").addEventListener("change", updateTicket);
  $("#p-minus").addEventListener("click", () => { people = Math.max(1, people - 1); updateTicket(); });
  $("#p-plus").addEventListener("click", () => { people = Math.min(LAB.seatsPerBatch, people + 1); updateTicket(); });
  $("#f-phone").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); });
  ["name", "phone"].forEach(f => $("#f-" + f).addEventListener("input", () => {
    if ($("#fld-" + f).classList.contains("has-error")) validate();
  }));

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate()) return;
    const s = snapshot();
    if (!s.date) return;
    showPay({ ...s, ref: makeRef(), name: $("#f-name").value.trim(), phone: $("#f-phone").value.trim(), notes: $("#f-notes").value.trim() });
  });

  // schedule and card buttons pre-fill the form
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-book]");
    if (btn) {
      $("#f-workshop").value = btn.dataset.book;
      fillDates(btn.dataset.day);
      updateTicket();
      if (!payBox.hidden) { payBox.hidden = true; form.hidden = false; }
    }
    const copy = e.target.closest("[data-copy]");
    if (copy) copyText(copy.dataset.copy).then(ok => toast(ok ? "Copied!" : "Couldn’t copy. Select it and copy by hand."));
    if (e.target.closest("[data-copy-booking]") && lastBooking) {
      copyText(waText(lastBooking)).then(ok => toast(ok ? "Booking message copied" : "Couldn’t copy"));
    }
    if (e.target.closest("[data-edit]")) showForm();
  });
}

/* ==========================================================================
   contact bits (only shown once configured)
   ========================================================================== */
function initContacts() {
  const bits = [];
  const actions = $("#find-actions");
  if (LAB.whatsapp) {
    const cc = LAB.whatsapp.length > 10 ? LAB.whatsapp.slice(0, LAB.whatsapp.length - 10) : "91";
    const num = LAB.whatsapp.slice(-10);
    bits.push(`WhatsApp: <a href="https://wa.me/${LAB.whatsapp}" target="_blank" rel="noopener">+${cc} ${num.slice(0, 5)} ${num.slice(5)}</a>`);
    actions.insertAdjacentHTML("afterbegin", `<a class="btn btn--whatsapp" href="https://wa.me/${LAB.whatsapp}" target="_blank" rel="noopener">Message us on WhatsApp</a>`);
    const g = $("#group-cta");
    if (g) {
      g.href = `https://wa.me/${LAB.whatsapp}?text=${encodeURIComponent("Hi! I’d like to ask about a group booking at " + LAB.studioName + ".")}`;
      g.target = "_blank"; g.rel = "noopener"; g.textContent = "Message us on WhatsApp";
    }
  }
  if (LAB.instagram) bits.push(`Instagram: <a href="https://instagram.com/${LAB.instagram}" target="_blank" rel="noopener">@${LAB.instagram}</a>`);
  if (bits.length) {
    $("#footer-contact").innerHTML = bits.join("<br>");
    $("#footer-links").innerHTML = bits.join("<br>");
  }
}

/* ==========================================================================
   hero reserve bar: pre-fills the booking form and jumps to it
   ========================================================================== */
function initQuick() {
  const qw = $("#q-workshop"), qd = $("#q-date"), qp = $("#q-people");
  qw.innerHTML = WORKSHOPS.map(w => `<option value="${w.id}">${w.name}</option>`).join("");
  qp.innerHTML = Array.from({ length: LAB.seatsPerBatch }, (_, i) => `<option value="${i + 1}"${i + 1 === 2 ? " selected" : ""}>${i + 1}</option>`).join("");
  const fill = () => {
    qd.innerHTML = upcoming(getW(qw.value)).map(o => `<option value="${toIso(o.date)}">${fmtDate(o.date)}, ${fmtTime(o.start)}</option>`).join("");
  };
  qw.addEventListener("change", fill);
  fill();
  $("#quick").addEventListener("submit", e => {
    e.preventDefault();
    $("#f-workshop").value = qw.value;
    fillDates();
    if (qd.value) $("#f-date").value = qd.value;
    people = Number(qp.value);
    updateTicket();
    if (!payBox.hidden) { payBox.hidden = true; form.hidden = false; }
    $("#book").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* small facts that come from the config */
function initFacts() {
  $$("[data-seats]").forEach(el => { el.textContent = LAB.seatsPerBatch; });
}

/* ==========================================================================
   nav
   ========================================================================== */
function initNav() {
  const toggle = $("#nav-toggle"), links = $("#nav-links");
  const set = open => { links.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); };
  toggle.addEventListener("click", () => set(!links.classList.contains("is-open")));
  links.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
}

/* ==========================================================================
   motion: scroll reveals, a gentle hero parallax and the header rule.
   Everything here is skipped for visitors who ask for reduced motion.
   ========================================================================== */
function initMotion() {
  const header = $(".site-header");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = $("[data-parallax]");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle("is-scrolled", scrollY > 8);
      if (hero && !still && scrollY < innerHeight * 1.2) hero.style.setProperty("--py", Math.min(scrollY * 0.07, 80) + "px");
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const items = $$(".reveal");
  if (still || !("IntersectionObserver" in window)) { items.forEach(el => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(el => io.observe(el));
}

/* ---------- go ---------- */
renderCards();
renderDays();
initBooking();
initContacts();
initQuick();
initFacts();
initNav();
initMotion();
