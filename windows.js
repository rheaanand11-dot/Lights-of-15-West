// windows.js — owned by Person A.
// The 15 West facade at night. Everything starts dark; the cursor is a flashlight
// that reveals which windows were lit. Tap a lit window to read what was
// happening inside that room.

(function () {
  // Which building and which observation the facade shows (see data/lights.json).
  // 10 floors x 19 windows = the 190 windows we counted.
  const FACADE = { building: '15west', floors: 10, columns: 19, day: 'Monday', time: '23:00' };
  const LIGHT_RADIUS = 150; // size of the flashlight, in pixels
  const TOUCH_SLOP = 18; // how near a finger has to land to a window on phones, in pixels

  const root = document.getElementById('windows');
  if (!root) return;

  Promise.all([getJSON('data/lights.json'), getJSON('data/stories.json')])
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

    // Each story belongs to one window: room 605 = floor 6, 6th window from the left.
    // A story can name its window with "column" instead. Several stories can share a window.
    const storyAt = {};
    stories.forEach((s) => {
      const k = key(s.floor, s.column || (Number(s.room) % 100) + 1);
      (storyAt[k] = storyAt[k] || []).push(s);
    });

    // Which windows are lit: every story window, then others picked at random
    // until the number matches the count in the data. The random picks are
    // "seeded", so the facade looks the same on every visit.
    const allKeys = [];
    for (let f = 1; f <= FACADE.floors; f++) {
      for (let c = 1; c <= FACADE.columns; c++) allKeys.push(key(f, c));
    }
    const lit = new Set(Object.keys(storyAt));
    const random = seeded(15);
    while (lit.size < Math.min(litCount, allKeys.length)) {
      lit.add(allKeys[Math.floor(random() * allKeys.length)]);
    }

    root.innerHTML = `
      <p class="facade-hint">
        <span class="hint-mouse">Shine your light across 15 West. Click a lit window to look inside.</span>
        <span class="hint-touch">Tap 15 West to shine a light. Tap a lit window to look inside.</span>
      </p>
      <div class="facade" style="--columns: ${FACADE.columns}">
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

    // Windows, top floor first. Lit windows are buttons so they can be tapped
    // and reached with the keyboard; dark ones are plain shapes.
    const windows = [];
    for (let f = FACADE.floors; f >= 1; f--) {
      for (let c = 1; c <= FACADE.columns; c++) {
        const k = key(f, c);
        const isLit = lit.has(k);
        const roomStories = storyAt[k] || [];
        const room = roomStories.length ? roomStories[0].room : `${f}${String(c - 1).padStart(2, '0')}`;
        const el = document.createElement(isLit ? 'button' : 'span');
        el.className = 'window';
        if (isLit) {
          el.type = 'button';
          // Real windows glow in different whites and yellows
          el.classList.add('is-lit', 'tone-' + Math.floor(random() * 3));
          if (roomStories.length) el.classList.add('has-story');
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
      if (e.pointerType === 'touch') return;
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
      if (e.pointerType !== 'touch') return;
      const p = pointIn(e);
      const near = nearestLit(p.x, p.y);
      tapTarget = near && near.light > 0.3 ? near : null;
      shine(p.x, p.y);
    });
    facade.addEventListener('click', (e) => {
      let w;
      if (lastPointer === 'touch') {
        w = tapTarget;
      } else {
        const el = e.target.closest('.window.is-lit');
        w = el && windows.find((x) => x.el === el);
      }
      lastPointer = null;
      tapTarget = null;
      if (w) openStory(w);
    });
    function nearestLit(x, y) {
      let best = null;
      let bestDistance = Infinity;
      windows.forEach((w) => {
        if (!w.lit) return;
        const d = Math.hypot(w.x - x, w.y - y);
        if (d < bestDistance) {
          best = w;
          bestDistance = d;
        }
      });
      return best && bestDistance <= Math.max(TOUCH_SLOP, best.el.offsetWidth) ? best : null;
    }

    // Keyboard: tabbing to a lit window shines the light on it
    grid.addEventListener('focusin', (e) => {
      const w = windows.find((x) => x.el === e.target);
      if (w) shine(w.x, w.y);
    });

    // The story card, one at a time. It grows out of the window you tapped.
    // A room with several stories gets a button to step through them in order.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextButton = root.querySelector('.story-card-next');
    let current = null;
    function openStory(w, index = 0) {
      current = { w, index };
      const s = w.stories[index];
      panel.className = 'story-card-panel story-card-panel--' + (s ? s.color : 'unknown');
      panel.querySelector('.story-card-text').textContent = s
        ? s.text
        : 'Someone was awake here too. We didn’t catch their story.';
      panel.querySelector('.story-card-meta').textContent =
        [s ? s.time : formatTime(FACADE.time), `Floor ${w.floor}`, w.room].join(' · ');
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

  function key(floor, column) {
    return floor + '-' + column;
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

  // "23:00" -> "11:00 PM"
  function formatTime(t) {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
})();
