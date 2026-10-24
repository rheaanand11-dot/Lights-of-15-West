// windows.js — owned by Person A.
// The 15 West facade at night. Everything starts dark; the cursor is a flashlight
// that reveals which windows were lit. Tap a window with a story to read what
// was happening inside that room.

(function () {
  // Which building and which observation the facade shows (see lights.json).
  // Each floor has room positions 00-21, left to right, so room 605 sits at
  // position 05 on floor 6. Positions listed in "walls" are solid wall, not
  // windows: 10 floors x (22 - 3) = the 190 windows we counted.
  const FACADE = {
    building: '15west', floors: 10, rooms: 22, walls: [4, 8, 16],
    day: 'Monday', time: '23:00',
  };
  const LIGHT_RADIUS = 190; // size of the flashlight, in pixels
  const OUTLINE_MS = 1600; // how long the outline takes to draw
  const WINDOW_STEP_MS = 7; // gap between one window appearing and the next
  const TOUCH_SLOP = 18; // how near a finger has to land to a window on phones, in pixels

  const root = document.getElementById('windows');
  if (!root) return;

  Promise.all([getJSON('lights.json'), getJSON('stories.json')])
    .then(([lights, stories]) => build(lights, stories.stories))
    .catch((err) => {
      root.innerHTML = '<p class="windows-error">Could not load the data files. ' +
        'Open the site through a local server (see CLAUDE.md), not by double-clicking the file.</p>';
      console.error(err);
    });

  function build(lights, stories) {
    const observation = lights.observations.find((o) =>
      o.building === FACADE.building && o.day === FACADE.day && o.time === FACADE.time);
    const litCount = observation ? observation.lit : 0;

    // Each story goes in the window with its room number. Several stories can share a room.
    const storyAt = {};
    stories.forEach((s) => {
      const k = String(s.room);
      (storyAt[k] = storyAt[k] || []).push(s);
    });

    // Which windows are lit: every story window, then others picked at random
    // until the number matches the count in the data. The random picks are
    // "seeded", so the facade looks the same on every visit.
    const allKeys = [];
    for (let f = 1; f <= FACADE.floors; f++) {
      for (let p = 0; p < FACADE.rooms; p++) {
        if (!FACADE.walls.includes(p)) allKeys.push(roomNumber(f, p));
      }
    }
    const lit = new Set(Object.keys(storyAt));
    const random = seeded(15);
    while (lit.size < Math.min(litCount, allKeys.length)) {
      lit.add(allKeys[Math.floor(random() * allKeys.length)]);
    }

    root.innerHTML = `
      <p class="facade-hint">
        <span class="hint-mouse">Shine your light across 15 West. Click a flickering window to look inside.</span>
        <span class="hint-touch">Tap 15 West to shine a light. Tap a flickering window to look inside.</span>
      </p>
      <div class="facade" style="--columns: ${FACADE.rooms}">
        <div class="facade-fill"></div>
        <svg class="facade-outline" aria-hidden="true">
          <rect x="0" y="0" width="100%" height="100%" pathLength="1"/>
        </svg>
        <div class="facade-cornice"></div>
        <div class="facade-grid"></div>
        <div class="facade-base"></div>
        <div class="facade-light" aria-hidden="true"></div>
      </div>
      <dialog class="story-card" aria-label="Story from a lit window">
        <div class="story-card-panel">
          <button type="button" class="story-card-close" aria-label="Close story">&times;</button>
          <p class="story-card-text"></p>
          <p class="story-card-meta"></p>
          <button type="button" class="story-card-next" hidden>Later in this room &rarr;</button>
        </div>
      </dialog>`;

    const facade = root.querySelector('.facade');
    const grid = root.querySelector('.facade-grid');
    const base = root.querySelector('.facade-base');
    const dialog = root.querySelector('.story-card');
    const panel = root.querySelector('.story-card-panel');

    // Windows, top floor first. Story windows are buttons so they can be tapped
    // and reached with the keyboard; the others are plain shapes.
    const windows = [];
    for (let f = FACADE.floors; f >= 1; f--) {
      for (let p = 0; p < FACADE.rooms; p++) {
        if (FACADE.walls.includes(p)) {
          const wall = document.createElement('span');
          wall.className = 'window window--wall';
          grid.appendChild(wall);
          continue;
        }
        const room = roomNumber(f, p);
        const isLit = lit.has(room);
        const roomStories = storyAt[room] || [];
        const el = document.createElement(roomStories.length ? 'button' : 'span');
        el.className = 'window';
        // Drawing order: bottom floor first, left to right
        el.style.setProperty('--d', ((f - 1) * FACADE.rooms + p) * WINDOW_STEP_MS);
        if (isLit) {
          // Real windows glow in different whites and yellows
          el.classList.add('is-lit', 'tone-' + Math.floor(random() * 3));
        }
        if (roomStories.length) {
          el.type = 'button';
          el.classList.add('has-story');
          el.setAttribute('aria-label', `Lit window, floor ${f}, room ${room}`);
        }
        grid.appendChild(el);
        windows.push({ el, floor: f, room, lit: isLit, stories: roomStories, x: 0, y: 0, light: 0 });
      }
    }
    // Street-level arches
    for (let i = 0; i < 10; i++) base.appendChild(document.createElement('span'));

    // Remember where each window's center is, relative to the facade
    function measure() {
      const box = facade.getBoundingClientRect();
      windows.forEach((w) => {
        const r = w.el.getBoundingClientRect();
        w.x = r.left - box.left + r.width / 2;
        w.y = r.top - box.top + r.height / 2;
      });
    }
    measure();
    window.addEventListener('resize', measure);

    // Drawing the building in: first its outline, then the windows one by one
    // from the bottom floor up, then the wall fills in and the flashlight
    // switches on. It plays once, when the building scrolls into view.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let built = false;
    function startDrawing() {
      window.removeEventListener('scroll', checkInView);
      if (reduceMotion) {
        root.classList.add('is-outlining', 'is-windowing', 'is-built');
        built = true;
        return;
      }
      root.classList.add('is-outlining');
      setTimeout(() => root.classList.add('is-windowing'), OUTLINE_MS);
      const lastWindow = FACADE.floors * FACADE.rooms * WINDOW_STEP_MS;
      setTimeout(() => {
        root.classList.add('is-built');
        built = true;
      }, OUTLINE_MS + lastWindow + 300);
    }
    function checkInView() {
      const box = facade.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.75 && box.bottom > 0) startDrawing();
    }
    window.addEventListener('scroll', checkInView, { passive: true });
    checkInView();

    // The flashlight: windows close to (x, y) light up, fading out toward the edge
    function shine(x, y) {
      facade.classList.add('is-shining');
      facade.style.setProperty('--x', x + 'px');
      facade.style.setProperty('--y', y + 'px');
      windows.forEach((w) => {
        const t = Math.max(0, 1 - Math.hypot(w.x - x, w.y - y) / LIGHT_RADIUS);
        w.light = t * t * (3 - 2 * t); // soft edge
        w.el.style.setProperty('--light', w.light.toFixed(2));
      });
    }
    function darken() {
      facade.classList.remove('is-shining');
      windows.forEach((w) => {
        w.light = 0;
        w.el.style.setProperty('--light', 0);
      });
    }
    function pointIn(e) {
      const box = facade.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    }

    // Mouse: the light follows the cursor
    let frame = null;
    facade.addEventListener('pointermove', (e) => {
      if (!built || e.pointerType === 'touch') return;
      const p = pointIn(e);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => shine(p.x, p.y));
    });
    facade.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') darken();
    });

    // Phones have no hover, so a tap moves the light there. A tap only opens a
    // window that was already lit up by the flashlight, so the reveal comes first.
    let lastPointer = null;
    let tapTarget = null;
    facade.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType;
      if (!built || e.pointerType !== 'touch') return;
      const p = pointIn(e);
      const near = nearestStory(p.x, p.y);
      tapTarget = near && near.light > 0.3 ? near : null;
      shine(p.x, p.y);
    });
    facade.addEventListener('click', (e) => {
      if (!built) return;
      let w;
      if (lastPointer === 'touch') {
        w = tapTarget;
      } else {
        const el = e.target.closest('.window.has-story');
        w = el && windows.find((x) => x.el === el);
      }
      lastPointer = null;
      tapTarget = null;
      if (w) openStory(w);
    });
    function nearestStory(x, y) {
      let best = null;
      let bestDistance = Infinity;
      windows.forEach((w) => {
        if (!w.stories.length) return;
        const d = Math.hypot(w.x - x, w.y - y);
        if (d < bestDistance) {
          best = w;
          bestDistance = d;
        }
      });
      return best && bestDistance <= Math.max(TOUCH_SLOP, best.el.offsetWidth) ? best : null;
    }

    // Keyboard: tabbing to a story window shines the light on it
    grid.addEventListener('focusin', (e) => {
      const w = windows.find((x) => x.el === e.target);
      if (w) shine(w.x, w.y);
    });

    // The story card, one at a time. It grows out of the window you tapped.
    // A room with several stories gets a button to step through them in order.
    const nextButton = root.querySelector('.story-card-next');
    let current = null;
    function openStory(w, index = 0) {
      current = { w, index };
      const s = w.stories[index];
      panel.className = 'story-card-panel story-card-panel--' + s.color;
      panel.querySelector('.story-card-text').textContent = s.text;
      panel.querySelector('.story-card-meta').textContent =
        [s.time, `Floor ${w.floor}`, w.room].join(' · ');
      nextButton.hidden = w.stories.length < 2;
      nextButton.innerHTML = index < w.stories.length - 1
        ? 'Later in this room &rarr;'
        : '&larr; Earlier in this room';
      if (dialog.open) return;
      dialog.showModal();

      if (reduceMotion) return;
      const from = w.el.getBoundingClientRect();
      const to = panel.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      panel.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0.6 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 500, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
      );
    }
    nextButton.addEventListener('click', () => {
      openStory(current.w, (current.index + 1) % current.w.stories.length);
    });
    root.querySelector('.story-card-close').addEventListener('click', () => dialog.close());
    // Clicking the dark area around the card closes it too (Esc works on its own)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  function getJSON(url) {
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.json();
    });
  }

  // Floor 6, position 5 -> "605"
  function roomNumber(floor, position) {
    return floor + String(position).padStart(2, '0');
  }

  // A repeatable random number generator: the same seed gives the same numbers
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
