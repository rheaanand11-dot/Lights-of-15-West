// streetlights.js — owned by Anna.
// "Buildings' Windows Light in Street Light Equivalent": each building's lit
// windows turned into street lights (1 street light ≈ 10 lit windows ≈ 25 m
// of lit street), drawn as a lamp lighting up squares of pavement. Buttons
// switch between the four nights we counted, each with its own gradient.

(function () {
  // The nights we counted (see lights.json), each with its gradient in base.css
  const NIGHTS = [
    { id: 'friday', day: 'Friday', time: '20:00', label: 'Friday, 8 PM' },
    { id: 'saturday', day: 'Saturday', time: '21:00', label: 'Saturday, 9 PM' },
    { id: 'sunday', day: 'Sunday', time: '21:00', label: 'Sunday, 9 PM' },
    { id: 'monday', day: 'Monday', time: '23:00', label: 'Monday, 11 PM' },
  ];
  // Short names, as written under the buildings in the street section
  const NAMES = {
    '15west': '15 West', darroweverett: 'DarrowEverett', textron: 'Textron Tower',
    usmarshals: 'US Marshals', bartongilman: 'Barton Gilman', metropark: 'Metropark',
    merchants: 'Merchants Bank', homewood: 'Homewood Suites',
  };
  const WINDOWS_PER_LIGHT = 10; // 1 street light ≈ 10 lit windows
  const METERS_PER_LIGHT = 25; // ≈ 25 m of lit street
  // The pavement under each lamp: 4 x 3 squares, one per street light
  const COLUMNS = 4;
  const ROWS = 3;

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
      <h2 class="streetlights-heading">Buildings’ Windows Light in Street Light Equivalent</h2>
      <div class="streetlights-nights" role="group" aria-label="Night">
        ${NIGHTS.map((n) => `
          <button type="button" class="streetlights-night streetlights-night--${n.id}" data-night="${n.id}" aria-pressed="false">${n.label}</button>`).join('')}
      </div>
      <svg class="streetlights-defs" aria-hidden="true" focusable="false">
        <defs>
          <!-- The light: the night's gradient, from the bulb down to the pavement -->
          <linearGradient id="sl-beam" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="300">
            <stop offset="0" class="sl-stop-1"/>
            <stop offset="0.5" class="sl-stop-2" stop-opacity="0.85"/>
            <stop offset="1" class="sl-stop-3" stop-opacity="0.95"/>
          </linearGradient>
          <!-- The lamp's static shading -->
          <linearGradient id="sl-pole" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" class="sl-lamp-dark"/>
            <stop offset="0.45" class="sl-lamp"/>
            <stop offset="1" class="sl-lamp-dark"/>
          </linearGradient>
          <linearGradient id="sl-arm" gradientUnits="userSpaceOnUse" x1="262" y1="0" x2="352" y2="0">
            <stop offset="0" class="sl-lamp-light" stop-opacity="0.15"/>
            <stop offset="0.4" class="sl-lamp-light"/>
            <stop offset="1" class="sl-lamp"/>
          </linearGradient>
          <!-- Soft edges plus film grain inside the light, like the poster reference -->
          <filter id="sl-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="soft"/>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="grain"/>
            <feComposite in="soft" in2="grain" operator="arithmetic" k1="1.1" k2="0.5" k3="0" k4="0"/>
          </filter>
          <filter id="sl-glow" x="-100%" y="-300%" width="300%" height="700%">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>
      </svg>
      <ul class="streetlights-grid"></ul>
      <p class="streetlights-key">
        <span class="streetlights-key-swatch" aria-hidden="true"></span>
        = 1 street light ≈ 10 lit windows ≈ 25 m of lit street
      </p>`;

    const grid = root.querySelector('.streetlights-grid');
    const buttons = [...root.querySelectorAll('.streetlights-night')];

    // Show one night: a lamp per building that was counted that night,
    // most street lights first
    function show(night) {
      NIGHTS.forEach((n) => root.classList.toggle('is-' + n.id, n === night));
      buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.night === night.id));
      const buildings = lights.observations
        .filter((o) => o.day === night.day && o.time === night.time)
        .map((o) => ({ id: o.building, lit: o.lit }))
        .sort((a, b) => b.lit - a.lit);
      grid.innerHTML = buildings.map(card).join('');
    }

    buttons.forEach((b) => b.addEventListener('click', () => {
      show(NIGHTS.find((n) => n.id === b.dataset.night));
    }));
    show(NIGHTS[0]);

    // The heading fades and grows in like the street section's heading, and
    // the lamps switch on when they scroll into view
    const heading = root.querySelector('.streetlights-heading');
    function onScroll() {
      const h = window.innerHeight;
      const box = heading.getBoundingClientRect();
      heading.classList.toggle('is-visible', box.top < h * 0.88 && box.bottom > h * 0.12);
      const g = grid.getBoundingClientRect();
      if (g.top < h * 0.8 && g.bottom > 0) root.classList.add('is-on');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  // One building: the lamp, its light, the pavement squares it lights up,
  // the length of street that equals, and a caption
  function card(b) {
    const streetLights = Math.min(COLUMNS * ROWS, Math.round(b.lit / WINDOWS_PER_LIGHT));
    const meters = Math.round((b.lit / WINDOWS_PER_LIGHT) * METERS_PER_LIGHT);
    const name = NAMES[b.id] || b.id;

    // The squares: lit from the column nearest the lamp outward
    let squares = '';
    for (let c = 0; c < COLUMNS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const order = (COLUMNS - 1 - c) * ROWS + r; // nearest column first
        const lit = order < streetLights;
        squares += `<polygon class="sl-square${lit ? ' is-lit' : ''}" style="--i: ${order}"
          points="${square(c, r)}"/>`;
      }
    }

    // The beam: from the bulb down over the lit squares
    let beam = '';
    if (streetLights > 0) {
      const from = 1 - Math.ceil(streetLights / ROWS) / COLUMNS;
      const pts = [[226, 30], [258, 30], ground(1, 0, 6), ground(1, 1, 4), ground(from, 1), ground(from, 0)];
      beam = `<polygon class="sl-beam" filter="url(#sl-soft)" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;
    }

    // The length of street, along the pavement's left edge
    const a = ground(0, 1, -16);
    const z = ground(0, 0, -16);
    const angle = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
    const mid = [(a[0] + z[0]) / 2 - 8, (a[1] + z[1]) / 2 - 2];

    const plural = streetLights === 1 ? 'street light' : 'street lights';
    return `
      <li class="streetlight">
        <div class="streetlight-art">
          <svg viewBox="0 0 400 320" role="img"
               aria-label="${name}: ${b.lit} lit windows, about ${streetLights} ${plural} or ${meters} m of lit street">
            ${squares}
            ${beam}
            <line class="sl-edge" x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>
            <text class="sl-meters" transform="translate(${mid[0]} ${mid[1]}) rotate(${angle})" text-anchor="middle">${meters} m</text>
            <rect class="sl-pole" x="343" y="30" width="10" height="236" fill="url(#sl-pole)"/>
            <rect class="sl-base" x="337" y="258" width="22" height="44" rx="2" fill="url(#sl-pole)"/>
            <path class="sl-arm" d="M348 34 C 340 24, 320 22, 262 24" stroke="url(#sl-arm)"/>
            <rect class="sl-bulb-glow" x="218" y="20" width="46" height="12" rx="6" filter="url(#sl-glow)"/>
            <rect class="sl-bulb" x="222" y="22" width="40" height="8" rx="4"/>
          </svg>
        </div>
        <p class="streetlight-caption">${name} replaces ${streetLights} ${plural}</p>
      </li>`;
  }

  // A point on the pavement: u goes left (0) to right (1), v goes back (0) to
  // front (1). The pavement leans back to the right, like the sketch.
  function ground(u, v, dx = 0) {
    return [Math.round(75 + 240 * u - 45 * v + dx), Math.round(236 + 64 * v)];
  }

  // The corners of one pavement square, with a small gap around it
  function square(c, r) {
    const gap = 0.02;
    const u0 = c / COLUMNS + gap;
    const u1 = (c + 1) / COLUMNS - gap;
    const v0 = r / ROWS + gap * 1.5;
    const v1 = (r + 1) / ROWS - gap * 1.5;
    return [ground(u0, v0), ground(u1, v0), ground(u1, v1), ground(u0, v1)]
      .map((p) => p.join(',')).join(' ');
  }
})();
