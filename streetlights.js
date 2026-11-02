// streetlights.js — owned by Anna.
// "Buildings' Windows Light in Street Light Equivalent": each building's lit
// windows turned into street lights (1 street light ≈ 10 lit windows ≈ 25 m
// of lit street). Each building gets a lamp whose triangle of light falls on
// a row of 12 pavement squares, one per street light (25 m each): the more
// lights, the wider the triangle. Buttons switch between the four nights we
// counted, each in its own gradient; the night's lamps sit four to a row and
// all switch on together when they scroll into view.

(function () {
  // The nights we counted (see lights.json), each with its gradient in base.css
  const NIGHTS = [
    { id: 'friday', day: 'Friday', time: '20:00', label: 'Friday, 8 PM' },
    { id: 'saturday', day: 'Saturday', time: '21:00', label: 'Saturday, 9 PM' },
    { id: 'sunday', day: 'Sunday', time: '21:00', label: 'Sunday, 9 PM' },
    { id: 'monday', day: 'Monday', time: '23:00', label: 'Monday, 11 PM' },
  ];
  // Short names, as written under the buildings in the street section. Only
  // these buildings get a lamp (Homewood Suites is left out of this section).
  const NAMES = {
    '15west': '15 West', darroweverett: 'Turks Head Building', textron: 'Textron Tower',
    usmarshals: 'Federal Building', bartongilman: 'One Financial Plaza', metropark: 'Banigan Building',
    merchants: 'Merchants Bank',
  };
  // The words on the first screen
  const TEXT = {
    heading: 'Building Light in Illustrative Streetlight Equivalents',
    body: 'Unlike streetlights, lit windows don’t have a clearly defined range of illumination. ' +
      'But what if their collective glow could be experienced as a walk down a lit street at night?',
  };
  // The bold arrow of the page links (see .page-link-arrow in base.css), pointing up
  const ARROW_UP = '<svg class="page-link-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/></svg>';
  const WINDOWS_PER_LIGHT = 10; // 1 street light ≈ 10 lit windows
  const METERS_PER_LIGHT = 25; // ≈ 25 m of lit street
  const SQUARES = 12; // pavement squares under each lamp: one per street light

  // Where things sit in each drawing (its viewBox is 420 x 330). The lamp is
  // Anna's "street lamp 2.svg", shrunk to LAMP.scale and placed at LAMP.x/y.
  const LAMP = { x: 300, y: 18, scale: 0.215 };
  const BULB = { x: LAMP.x + 146 * LAMP.scale, y: LAMP.y + 59.5 * LAMP.scale }; // the light comes from here
  const GROUND = LAMP.y + 1164 * LAMP.scale; // the street, level with the lamp's foot
  const SQUARE = (BULB.x - 12) / SQUARES; // width of one pavement square

  const root = document.getElementById('streetlights');
  if (!root) return;

  fetch('lights.json')
    .then((res) => {
      if (!res.ok) throw new Error(`lights.json: ${res.status}`);
      return res.json();
    })
    .then(build)
    .catch((err) => console.error(err));

  function build(lights) {
    root.innerHTML = `
      <!-- First screen: the headline, what it's about, and the key -->
      <div class="streetlights-screen streetlights-screen--intro">
        <h2 class="streetlights-heading">${TEXT.heading}</h2>
        <p class="streetlights-body">${TEXT.body}</p>
        <p class="streetlights-key">
          <span class="streetlights-key-swatch" aria-hidden="true"></span>
          = 1&nbsp;street light ≈ 10&nbsp;lit windows ≈ 25&nbsp;m of lit street
        </p>
        <p class="streetlights-scroll-hint" aria-hidden="true">Scroll &darr;</p>
      </div>
      <svg class="streetlights-defs" aria-hidden="true" focusable="false">
        <defs>
          <!-- The lamp's static shading, from "street lamp 2.svg" -->
          <linearGradient id="sl-lamp" gradientUnits="userSpaceOnUse" x1="111.65" y1="582" x2="604.29" y2="582">
            <stop offset="0.22" class="sl-lamp-light"/>
            <stop offset="0.56" class="sl-lamp"/>
            <stop offset="0.97" class="sl-lamp-dark"/>
          </linearGradient>
          <!-- Film grain inside the light, like the poster reference -->
          <filter id="sl-grain" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="soft"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="grain"/>
            <feComposite in="soft" in2="grain" operator="arithmetic" k1="1.1" k2="0.5" k3="0" k4="0"/>
          </filter>
          <!-- A soft halo for the bulb, the lit squares and the meters -->
          <filter id="sl-glow" x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="4"/>
          </filter>
        </defs>
      </svg>
      <!-- Second screen: the night buttons and every lamp, all on one screen -->
      <div class="streetlights-screen streetlights-screen--lamps">
      <div class="streetlights-lamps-group">
      <div class="streetlights-nights" role="group" aria-label="Night">
        ${NIGHTS.map((n) => `
          <button type="button" class="streetlights-night streetlights-night--${n.id}" data-night="${n.id}" aria-pressed="false">${n.label}</button>`).join('')}
      </div>
      <svg class="streetlights-defs" aria-hidden="true" focusable="false">
        <defs>
          <!-- The light: the picked night's gradient, from the bulb down to the street -->
          <linearGradient id="sl-beam" gradientUnits="userSpaceOnUse" x1="0" y1="${BULB.y}" x2="0" y2="${GROUND}">
            <stop offset="0" class="sl-stop-1"/>
            <stop offset="0.5" class="sl-stop-2"/>
            <stop offset="1" class="sl-stop-3"/>
          </linearGradient>
        </defs>
      </svg>
      <ul class="streetlights-grid"></ul>
      </div>
      </div>
      <!-- A small "Back to top" at the very bottom of the page, under the lamps
           (handy on phones, where the lamps scroll) -->
      <div class="streetlights-top-row">
        <button type="button" class="streetlights-top">Back to top ${ARROW_UP}</button>
      </div>`;

    const grid = root.querySelector('.streetlights-grid');
    const buttons = [...root.querySelectorAll('.streetlights-night')];

    // Show one night: a lamp per building that was counted that night, most
    // street lights first, four to a row. Only the picked night's button
    // wears its gradient.
    function show(night) {
      NIGHTS.forEach((n) => root.classList.toggle('is-' + n.id, n === night));
      buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.night === night.id));
      const buildings = lights.observations
        .filter((o) => o.day === night.day && o.time === night.time && NAMES[o.building])
        .map((o) => ({ id: o.building, lit: o.lit }))
        .sort((a, b) => b.lit - a.lit);
      grid.innerHTML = buildings.map((b, i) => card(b, i)).join('');
      onScroll(); // lamps already on screen switch on straight away
    }
    buttons.forEach((b) => b.addEventListener('click', () => {
      show(NIGHTS.find((n) => n.id === b.dataset.night));
    }));
    const topButton = root.querySelector('.streetlights-top');
    topButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // When the lamps come into view they all switch on at the same time
    // (the timing is in streetlights.css). Once they've all
    // scrolled fully off the screen they switch off, so coming back lights
    // them up anew.
    const heading = root.querySelector('.streetlights-heading');
    function onScroll() {
      const h = window.innerHeight;
      const box = heading.getBoundingClientRect();
      heading.classList.toggle('is-visible', box.top < h * 0.88 && box.bottom > h * 0.12);
      const g = grid.getBoundingClientRect();
      const lamps = grid.querySelectorAll('.streetlight');
      if (g.top < h * 0.8 && g.bottom > 0) lamps.forEach((el) => el.classList.add('is-on'));
      else if (g.top > h || g.bottom < 0) lamps.forEach((el) => el.classList.remove('is-on'));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    show(NIGHTS[0]);
  }

  // One building: the lamp, its triangle of light, the row of pavement
  // squares (lit ones highlighted), the meters of lit street, and a caption
  // (n = its place in the order, so the lamps switch on one after another)
  function card(b, n) {
    const streetLights = Math.max(1, Math.min(SQUARES, Math.round(b.lit / WINDOWS_PER_LIGHT)));
    const meters = Math.round((b.lit / WINDOWS_PER_LIGHT) * METERS_PER_LIGHT);
    const name = NAMES[b.id] || b.id;
    const reach = streetLights * SQUARE; // how far the light spreads along the street

    // Pavement squares, right to left from under the bulb; the lit ones are
    // the building's street lights
    let squares = '';
    for (let i = 0; i < SQUARES; i++) {
      const x = BULB.x - (i + 1) * SQUARE + 1;
      const lit = i < streetLights;
      squares += `<rect class="sl-square${lit ? ' is-lit' : ''}" style="--i: ${i}"
        x="${x.toFixed(1)}" y="${GROUND + 3}" width="${(SQUARE - 2).toFixed(1)}" height="9"/>`;
    }
    const litRow = `<rect class="sl-squares-glow" filter="url(#sl-glow)"
      x="${(BULB.x - reach).toFixed(1)}" y="${GROUND + 3}" width="${reach.toFixed(1)}" height="9"/>`;

    // The triangle of light: straight down from the bulb, out to the last lit square
    const beam = [[BULB.x, BULB.y], [BULB.x, GROUND], [BULB.x - reach, GROUND]]
      .map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

    // The meters, centered under the light
    const metersX = (BULB.x - reach / 2).toFixed(1);
    const metersY = GROUND + 42;

    const plural = streetLights === 1 ? 'street light' : 'street lights';
    return `
      <li class="streetlight" style="--n: ${n}">
        <svg viewBox="0 0 420 ${metersY + 12}" role="img"
             aria-label="${name}: ${b.lit} lit windows, about ${streetLights} ${plural} or ${meters} m of lit street">
          <polygon class="sl-beam" fill="url(#sl-beam)" filter="url(#sl-grain)" points="${beam}"/>
          ${litRow}
          ${squares}
          <text class="sl-meters-glow" x="${metersX}" y="${metersY}" text-anchor="middle" filter="url(#sl-glow)">${meters} m</text>
          <text class="sl-meters" x="${metersX}" y="${metersY}" text-anchor="middle">${meters} m</text>
          <g transform="translate(${LAMP.x} ${LAMP.y}) scale(${LAMP.scale})">
            <rect class="sl-bulb-glow" x="5.5" y="34.46" width="145.11" height="24.99" rx="1.28" filter="url(#sl-glow)"/>
            <rect class="sl-bulb" x="5.5" y="34.46" width="145.11" height="24.99" rx="1.28"/>
            <path class="sl-lamp" d="M450.6,1026.44V27.55c0-7.17-5.86-13.03-13.03-13.03-3.58,0-6.84,1.47-9.2,3.83-3.72,3.72-3.83,8.32-3.83,9.2,0,7.28,0,14.57,0,21.85l-69.42-29.45c-4.88-2.07-10.1-3.24-15.4-3.44l-185.06-7.16c-.5-1.13-.97-2.02-1.18-2.34C149.21.39,142.67.03,141.73,0H14.79C6.66,0,0,8.02,0,17.83s6.66,17.83,14.79,17.83h126.94c5.36,0,10.03-3.51,12.62-8.69l180.93,7.74c7.5.32,14.87,1.97,21.79,4.87l67.45,28.29c-.01,319.52-.01,639.04,0,958.56h-19.59v137.58h69.23v-137.58h-23.57Z"/>
          </g>
        </svg>
        <p class="streetlight-caption">${name} replaces ${streetLights} ${plural}</p>
      </li>`;
  }
})();
