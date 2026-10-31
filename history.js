// history.js — owner not assigned yet (see CLAUDE.md).
// The opening section, "Where the Light Falls": the background to our story,
// before the 15 West facade. All the words live in HISTORY below.
// Design: the "ds3 data vis 1.ai" poster.

(function () {
  const HISTORY = {
    title: 'Where the light falls',
    lede: [
      'Downtown goes dark after work.',
      'One in five US offices now sits empty.',
      'Jane Jacobs called lit windows “eyes upon the street”, a quiet kind of watching.',
      'Research links light to lower crime, but darkness only moves elsewhere.',
      'Who keeps the street lit now?',
    ],
    offices: 'Only 1 in 5 empty offices is lit at night',
    crime: {
      caption: 'Better lighting is linked to less crime',
      rings: ['36% less crime', '21% less crime', '14% less crime'], // outer to inner
    },
    displacement: 'Crime moves to darker blocks',
    rightLight: {
      title: 'The right light, not the brightest',
      text: 'Brighter isn’t safer. Lights that are too bright cause glare: they dazzle your eyes and make everything around them harder to see.',
    },
    sources: [
      'CBRE, U.S. Office Figures Q2 2026',
      'Welsh & Farrington, “Effects of Improved Street Lighting on Crime,” Campbell Systematic Reviews, 2008',
      'Chalfin, Hansen, Lerner & Parker, “Reducing Crime Through Environmental Design,” Journal of Quantitative Criminology, 2022',
      'Jacobs, The Death and Life of Great American Cities, 1961',
      'DarkSky International, “Light Pollution: Safety,” darksky.org',
    ],
  };

  const root = document.getElementById('history');
  if (!root) return;

  // Each "step" fills the screen. Only the step in the middle of the screen is
  // shown; scrolling fades it out and brings in the next one.
  root.innerHTML = `
    <div class="history-step history-step--intro">
      <div class="history-ray" aria-hidden="true"></div>
      <div class="history-title-wrap">
        <div class="history-glow" aria-hidden="true"></div>
        <h1 class="history-title">${titleWithFlicker(HISTORY.title)}</h1>
      </div>
      <p class="history-lede">
        ${HISTORY.lede.map((line, i) => `<span style="--i: ${i}">${line}</span>`).join('')}
      </p>
      <p class="history-scroll-hint" aria-hidden="true">Scroll &darr;</p>
    </div>

    <figure class="history-step fig-offices">
      <div class="offices">
        ${[0, 1, 2, 3, 4].map((i) =>
          `<span class="office${i === 2 ? ' office--lit' : ''}" style="--i: ${i}"></span>`).join('')}
      </div>
      <figcaption>${HISTORY.offices}</figcaption>
    </figure>

    <figure class="history-step fig-crime">
      <div class="rings">
        ${HISTORY.crime.rings.map((label, i) =>
          `<div class="ring ring--${i + 1}" style="--i: ${i}"><span>${label}</span></div>`).join('')}
      </div>
      <figcaption>${HISTORY.crime.caption}</figcaption>
    </figure>

    <figure class="history-step fig-displacement">
      <svg class="blocks" viewBox="0 0 120 130" role="img"
           aria-label="Lit blocks above, with crime moving down into darker blocks below"></svg>
      <figcaption>${HISTORY.displacement}</figcaption>
    </figure>

    <figure class="history-step history-step--scrub fig-right-light">
      <div class="history-sticky">
        <div class="light-frame"><div class="light-panel"></div></div>
        <p class="light-readout">Light <span>0</span>%</p>
        <figcaption>${HISTORY.rightLight.title}</figcaption>
        <p class="light-explainer">${HISTORY.rightLight.text}</p>
      </div>
    </figure>`;

  // Sources go at the very bottom of the page, not here
  const sources = document.getElementById('sources');
  if (sources) {
    sources.innerHTML =
      `<p class="history-sources"><strong>Sources:</strong> ${HISTORY.sources.join(' · ')}</p>`;
  }

  drawBlocks(root.querySelector('.blocks'));
  followScroll(root.querySelectorAll('.history-step'));
  aimRay();

  // The opening ray of light comes from just past the top-right corner of the
  // screen and lands on the title. Work out the angle from that corner to the
  // title, so the ray hits it on any screen size.
  function aimRay() {
    const ray = root.querySelector('.history-ray');
    const title = root.querySelector('.history-title');
    function aim() {
      const box = ray.getBoundingClientRect();
      const t = title.getBoundingClientRect();
      const sourceX = box.width * 1.04;
      const sourceY = -box.height * 0.06;
      const targetX = t.left - box.left + t.width / 2;
      const targetY = t.top - box.top + t.height / 2;
      // Angle the way CSS measures it: 0deg points up, turning clockwise
      const angle = (Math.atan2(targetX - sourceX, -(targetY - sourceY)) * 180) / Math.PI;
      ray.style.setProperty('--ray-angle', ((angle + 360) % 360).toFixed(1) + 'deg');
      ray.style.setProperty('--spot-x', ((targetX / box.width) * 100).toFixed(1) + '%');
      ray.style.setProperty('--spot-y', ((targetY / box.height) * 100).toFixed(1) + '%');
    }
    aim();
    window.addEventListener('resize', aim);
  }

  // The title's last word ("falls") flickers like a light switching on: once
  // the page has loaded and its fonts are in (so you see it happen, not a
  // half-drawn page), and again whenever the title comes back into view.
  // The first time, it waits for the opening ray of light to reach the title
  // (about 3 seconds, see "The opening, in order" in history.css).
  // The flicker itself is in history.css.
  const RAY_ARRIVES_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3000;
  const flicker = root.querySelector('.history-title-flicker');
  const intro = root.querySelector('.history-step--intro');
  function flickerOn() {
    flicker.classList.remove('is-flickering');
    void flicker.offsetWidth; // let the browser notice, so the flicker restarts
    flicker.classList.add('is-flickering');
  }
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const pageLoaded = new Promise((done) => {
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done);
  });
  const rayArrived = new Promise((done) => setTimeout(done, RAY_ARRIVES_MS));
  Promise.all([fontsReady, pageLoaded, rayArrived]).then(() => {
    if (intro.classList.contains('is-visible')) flickerOn();
    // From then on, flicker each time the title scrolls back into view
    new MutationObserver(() => {
      const visible = intro.classList.contains('is-visible');
      if (visible && !intro.dataset.wasVisible) flickerOn();
      intro.dataset.wasVisible = visible ? 'yes' : '';
    }).observe(intro, { attributes: true, attributeFilter: ['class'] });
    intro.dataset.wasVisible = intro.classList.contains('is-visible') ? 'yes' : '';
  });

  function titleWithFlicker(title) {
    const words = title.split(' ');
    const last = words.pop();
    return `${words.join(' ')} <span class="history-title-flicker">${last}</span>`;
  }

  // Lit (orange) blocks above, lines dropping to dark (purple) blocks below.
  // Positions are [column, row] on a 10-unit grid, traced from the poster.
  function drawBlocks(svg) {
    const lit = [
      [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2],
      [3, 1.5], [3, 2.5], [3, 3.5], [4, 1], [4, 2], [4, 3],
      [5, 0], [6, 0], [7, 0], [5, 1], [6, 1], [7, 1], [5, 2], [6, 2], [7, 2],
    ];
    const dark = [
      [4.6, 6.2], [4.6, 7.2], [5.6, 8.1], [6.6, 8.1], [7.6, 8.1],
      [3.6, 9.2], [4.6, 9.2], [5.6, 9.2], [6.6, 9.2], [8.6, 9.2], [9.6, 9.2],
      [3.6, 10.1], [4.6, 10.1], [8.6, 10.1], [9.6, 10.1],
      [3.6, 11], [4.6, 11], [8.6, 11], [9.6, 11],
    ];
    const lines = [[3, 3.5, 9], [5, 2, 7.6], [7, 2, 7.6]]; // [column, from row, to row]
    const x = (c) => 8 + c * 10;
    const y = (r) => 8 + r * 10;

    svg.innerHTML = `
      <defs>
        <radialGradient id="lit-dot">
          <stop offset="0%" stop-color="#ffd27a"/>
          <stop offset="100%" stop-color="#ff9a1f"/>
        </radialGradient>
        <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2"/>
        </filter>
      </defs>
      ${lines.map(([c, from, to], i) =>
        `<line class="drop" style="--i: ${i}" x1="${x(c)}" y1="${y(from)}" x2="${x(c)}" y2="${y(to)}" pathLength="1"/>`).join('')}
      ${dark.map(([c, r], i) =>
        `<circle class="dark-dot" style="--i: ${i}" cx="${x(c)}" cy="${y(r)}" r="3.6" filter="url(#dot-glow)"/>`).join('')}
      ${lit.map(([c, r], i) =>
        `<circle class="lit-dot" style="--i: ${i}" cx="${x(c)}" cy="${y(r)}" r="4.6" fill="url(#lit-dot)"/>`).join('')}`;
  }

  // On every scroll: show the step crossing the middle of the screen, hide the
  // rest. In the "right light" step, scrolling turns the white panel up from 0%
  // to 100%.
  function followScroll(steps) {
    const panel = root.querySelector('.light-panel');
    const readout = root.querySelector('.light-readout span');
    let frame = null;

    function update() {
      const middle = window.innerHeight / 2;
      steps.forEach((step) => {
        const box = step.getBoundingClientRect();
        step.classList.toggle('is-visible', box.top < middle && box.bottom > middle);

        if (step.classList.contains('history-step--scrub')) {
          // 0 when the step reaches the top of the screen, 1 when its end does.
          // The last 15% stays at full light so you can take it in.
          const travel = box.height - window.innerHeight;
          const progress = Math.min(1, Math.max(0, -box.top / (travel * 0.85)));
          panel.style.setProperty('--light', progress.toFixed(3));
          readout.textContent = Math.round(progress * 100);
        }
      });
    }

    window.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
