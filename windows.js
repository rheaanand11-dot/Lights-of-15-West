// windows.js — owned by Person A.
// 15 West at night with the buildings around it. The buildings draw
// themselves in, then their lit windows glow (the neighbors dimmer than
// 15 West). The cursor is a flashlight over the whole street; tap a 15 West window with a story
// to read what was happening inside that room. A switch turns 15 West's
// lights off to show how much darker the block gets.

(function () {
  // Which building and which observation the facade shows (see lights.json).
  // Each floor has room positions 00-21, left to right, so room 605 sits at
  // position 05 on floor 6. Positions listed in "walls" are solid wall, not
  // windows: 10 floors x (22 - 3) = the 190 windows we counted.
  const FACADE = {
    building: '15west', floors: 10, rooms: 22, walls: [4, 8, 16],
    day: 'Monday', time: '23:00', label: 'Monday, 11 PM',
  };
  const MAIN_WIDTH = 50; // 15 West's share of the skyline's width, in %

  // The buildings around 15 West, left to right on each side. Window totals
  // and lit counts come from lights.json, at the same day and time as 15 West
  // unless "when" says otherwise (those stay out of the block total).
  // floors x columns is the shape of the window grid; spare spots past the
  // total are wall. width = share of the skyline's width, in % (keep both
  // sides adding up to about the same, so 15 West stays in the middle).
  // window = a window's width / height. look = extra styling in windows.css.
  // label = the short name written under the building.
  const NEIGHBORS = {
    left: [
      { id: 'darroweverett', label: 'DarrowEverett', floors: 25, columns: 15, width: 8.5, window: '1 / 1.9', arches: 4, look: 'purple-wash' },
      { id: 'textron', label: 'Textron Tower', floors: 42, columns: 23, width: 8, window: '1 / 5', arches: 3 },
      { id: 'usmarshals', label: 'US Marshals', floors: 2, columns: 13, width: 7.5, window: '1 / 3', arches: 5, look: 'floodlit' },
    ],
    right: [
      { id: 'bartongilman', label: 'Barton Gilman', floors: 34, columns: 18, width: 7.5, window: '1 / 4.6', arches: 3, look: 'crown' },
      { id: 'metropark', label: 'Metropark', floors: 10, columns: 16, width: 6.5, window: '1 / 3', arches: 4, look: 'warm' },
      // Homewood Suites: no Monday 11 PM count yet, so it shows Sunday 9 PM.
      // Its total window count is an estimate (estimatedWindows in lights.json).
      { id: 'homewood', label: 'Homewood Suites', floors: 15, columns: 8, width: 5.5, window: '1 / 2.4', arches: 2,
        when: { day: 'Sunday', time: '21:00', label: 'Sunday, 9 PM' } },
      { id: 'merchants', label: 'Merchants Bank', floors: 5, columns: 8, width: 5, window: '1 / 2', arches: 3 },
    ],
  };
  const LIGHT_RADIUS = 110; // size of the flashlight, in pixels (matches .facade-light in windows.css)
  const ZOOM_IN = 2.25; // how far the magnifier button zooms in (2.25 = 225%)
  const MAX_ZOOM = 2.5; // the most a trackpad pinch can zoom in
  const MOUSE_SLOP = 14; // how near the cursor has to be to a story window to open it, in pixels
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
    const offOrder = seeded(7); // separate, so the lit windows and colors stay the same
    while (lit.size < Math.min(litCount, allKeys.length)) {
      lit.add(allKeys[Math.floor(random() * allKeys.length)]);
    }

    root.innerHTML = `
      <h2 class="windows-heading">Lit Windows by Building in Downtown Providence at Night</h2>
      <p class="facade-hint">
        <span class="hint-mouse">Shine your light across the street. Click a flickering window on 15 West to look inside.</span>
        <span class="hint-touch">Tap a building to shine a light. Tap a flickering window on 15 West to look inside.</span>
      </p>
      <div class="skyline">
        <div class="skyline-glow" aria-hidden="true"></div>
        <div class="skyline-cursor" aria-hidden="true"></div>
        <button type="button" class="skyline-zoom" aria-label="Zoom in on the street" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10" cy="10" r="6.5"/>
            <path d="M15 15l6 6"/>
            <path class="skyline-zoom-plus" d="M10 7v6"/>
            <path d="M7 10h6"/>
          </svg>
        </button>
        <div class="skyline-row">
          <div class="facade facade--main" role="group" aria-label="15 West"
               style="--columns: ${FACADE.rooms}; width: ${MAIN_WIDTH}%">
            <div class="facade-fill"></div>
            <svg class="facade-outline" aria-hidden="true">
              <rect x="0" y="0" width="100%" height="100%" pathLength="1"/>
            </svg>
            <div class="facade-cornice"></div>
            <div class="facade-grid"></div>
            <div class="facade-base"></div>
            <div class="facade-light" aria-hidden="true"></div>
          </div>
        </div>
      </div>
      <div class="skyline-controls" style="--main-width: ${MAIN_WIDTH}%">
        <label class="windows-switch">
          <span>15 West</span>
          <input type="checkbox" role="switch" checked aria-label="15 West lights">
          <span class="windows-switch-track" aria-hidden="true"></span>
        </label>
        <p class="skyline-count" aria-live="polite"></p>
      </div>
      <dialog class="story-card" aria-label="Story from a lit window">
        <div class="story-card-panel">
          <button type="button" class="story-card-close" aria-label="Close story">&times;</button>
          <p class="story-card-text"></p>
          <p class="story-card-meta"></p>
          <button type="button" class="story-card-next" hidden>Later in this room &rarr;</button>
        </div>
      </dialog>`;

    // The heading fades and grows in as it scrolls onto the screen, and fades
    // back out as it leaves, like the crime rings in the opening section
    const heading = root.querySelector('.windows-heading');
    function fadeHeading() {
      const box = heading.getBoundingClientRect();
      const h = window.innerHeight;
      heading.classList.toggle('is-visible', box.top < h * 0.88 && box.bottom > h * 0.12);
    }
    window.addEventListener('scroll', fadeHeading, { passive: true });
    window.addEventListener('resize', fadeHeading);
    fadeHeading();

    const facade = root.querySelector('.facade--main');
    const grid = facade.querySelector('.facade-grid');
    const base = facade.querySelector('.facade-base');
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
        let tone = null; // the color of its light, if lit
        const roomStories = storyAt[room] || [];
        const el = document.createElement(roomStories.length ? 'button' : 'span');
        el.className = 'window';
        // Drawing order: bottom floor first, left to right
        el.style.setProperty('--d', ((f - 1) * FACADE.rooms + p) * WINDOW_STEP_MS);
        if (isLit) {
          // Real windows glow in different whites and yellows
          tone = pickTone(random());
          el.classList.add('is-lit', 'tone-' + tone);
          // How long it waits before going out when the lights are switched off
          el.style.setProperty('--off', (offOrder() * 1.6).toFixed(2) + 's');
        }
        if (roomStories.length) {
          el.type = 'button';
          el.classList.add('has-story');
          el.style.setProperty('--fd', (-random() * 2.6).toFixed(2) + 's'); // flicker out of sync
          el.setAttribute('aria-label', `Lit window, floor ${f}, room ${room}`);
        }
        grid.appendChild(el);
        windows.push({ el, floor: f, room, lit: isLit, tone, stories: roomStories, x: 0, y: 0, light: 0 });
      }
    }
    // Street-level arches
    for (let i = 0; i < 10; i++) base.appendChild(document.createElement('span'));

    // The neighbors, on either side of 15 West
    const skyline = root.querySelector('.skyline');
    const skylineRow = root.querySelector('.skyline-row');
    const neighborWindows = []; // every neighbor window, for the flashlight
    let neighborsLit = 0;
    NEIGHBORS.left.forEach((b) => skylineRow.insertBefore(buildNeighbor(b), facade));
    NEIGHBORS.right.forEach((b) => skylineRow.appendChild(buildNeighbor(b)));

    function buildNeighbor(b) {
      const info = lights.buildings.find((x) => x.id === b.id);
      const when = b.when || FACADE;
      const obs = lights.observations.find((o) =>
        o.building === b.id && o.day === when.day && o.time === when.time);
      const total = info.windows || info.estimatedWindows;
      const litHere = obs ? obs.lit : 0;
      // Only counts from the same moment as 15 West go into the block total
      if (!b.when) neighborsLit += litHere;

      const el = document.createElement('div');
      el.className = 'facade facade--neighbor' + (b.look ? ' facade--' + b.look : '');
      el.style.width = b.width + '%';
      el.style.setProperty('--columns', b.columns);
      el.style.setProperty('--window', b.window);
      el.style.setProperty('--arches', b.arches);
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${info.name}: ${litHere} of ${info.windows ? '' : 'about '}${total} windows lit` +
        (b.when ? ` (${b.when.label})` : ''));
      el.innerHTML = `
        <div class="facade-fill"></div>
        <svg class="facade-outline" aria-hidden="true">
          <rect x="0" y="0" width="100%" height="100%" pathLength="1"/>
        </svg>
        <div class="facade-cornice"></div>
        <div class="facade-grid"></div>
        <div class="facade-base"></div>
        <div class="facade-light" aria-hidden="true"></div>
        <p class="facade-label" aria-hidden="true">${b.label}</p>`;

      // Which windows are lit: picked at random (seeded, so it's the same on
      // every visit) until the number matches the count in the data
      const pick = seeded(total * 7 + litHere);
      const litWindows = new Set();
      while (litWindows.size < Math.min(litHere, total)) {
        litWindows.add(Math.floor(pick() * total));
      }

      // Windows, top floor first. They draw in at the same pace as 15 West,
      // so every building finishes at the same moment.
      const g = el.querySelector('.facade-grid');
      const slots = b.floors * b.columns;
      const spare = slots - total;
      const step = (FACADE.floors * FACADE.rooms * WINDOW_STEP_MS) / slots;
      for (let i = 0; i < slots; i++) {
        const w = document.createElement('span');
        if (i < spare) {
          w.className = 'window window--wall';
        } else {
          w.className = 'window';
          const fromBottom = b.floors - 1 - Math.floor(i / b.columns);
          w.style.setProperty('--d', Math.round((fromBottom * b.columns + (i % b.columns)) * step));
          if (litWindows.has(i - spare)) w.classList.add('is-lit', 'tone-' + pickTone(pick()));
          neighborWindows.push({ el: w, x: 0, y: 0, light: 0 });
        }
        g.appendChild(w);
      }
      const arches = el.querySelector('.facade-base');
      for (let i = 0; i < b.arches; i++) arches.appendChild(document.createElement('span'));
      return el;
    }

    // Every window on the street, 15 West's and the neighbors', for the flashlight
    const allWindows = windows.concat(neighborWindows);
    const facades = [...root.querySelectorAll('.facade')].map((el) => ({ el, x: 0, y: 0 }));

    // Zooming in. The buildings (.skyline-row) are scaled up inside the street's
    // frame, which crops them. "scale" is how far in we are (1 = normal) and
    // "focus" is the spot we zoom toward. Zooming glides a little every frame,
    // so it's gradual. Once zoomed in, the view stays still until you drag it
    // (mouse or finger) to look somewhere else.
    //
    // Two kinds of position are used below: "screen" = where something shows
    // inside the street's frame right now, and "street" = where it would be
    // without any zoom. Window positions and the flashlight use street positions.
    const zoom = { scale: 1, target: 1, fx: 0, fy: 0, focusX: null, focusY: null, moving: false };
    function rowOrigin() {
      return { x: skylineRow.offsetLeft, y: skylineRow.offsetTop };
    }
    function shift() {
      const o = rowOrigin();
      return { x: -(zoom.fx - o.x) * (zoom.scale - 1), y: -(zoom.fy - o.y) * (zoom.scale - 1) };
    }
    function toStreet(x, y) {
      const o = rowOrigin();
      const t = shift();
      return { x: o.x + (x - o.x - t.x) / zoom.scale, y: o.y + (y - o.y - t.y) / zoom.scale };
    }
    function toScreen(x, y) {
      const o = rowOrigin();
      const t = shift();
      return { x: o.x + t.x + zoom.scale * (x - o.x), y: o.y + t.y + zoom.scale * (y - o.y) };
    }

    // Remember where each window's center is, and where each building's corner
    // is, on the street
    function measure() {
      const box = skyline.getBoundingClientRect();
      allWindows.forEach((w) => {
        const r = w.el.getBoundingClientRect();
        const p = toStreet(r.left - box.left + r.width / 2, r.top - box.top + r.height / 2);
        w.x = p.x;
        w.y = p.y;
      });
      facades.forEach((f) => {
        const r = f.el.getBoundingClientRect();
        const p = toStreet(r.left - box.left, r.top - box.top);
        f.x = p.x;
        f.y = p.y;
      });
      // Line the switch and count up exactly under 15 West (the buildings
      // either side aren't quite the same width, so it sits a little off
      // the middle). On phones they span the whole screen instead.
      const controls = root.querySelector('.skyline-controls');
      if (window.matchMedia('(min-width: 701px)').matches) {
        const main = facades.find((f) => f.el === facade);
        const mainCenter = main.x + facade.offsetWidth / 2;
        controls.style.translate = `${mainCenter - skyline.clientWidth / 2}px 0`;
      } else {
        controls.style.translate = '';
      }
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
        measure(); // in case the layout shifted while it drew in
      }, OUTLINE_MS + lastWindow + 300);
    }
    function checkInView() {
      const box = facade.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.75 && box.bottom > 0) startDrawing();
    }
    window.addEventListener('scroll', checkInView, { passive: true });
    checkInView();

    // The flashlight: windows on any building close to (x, y) light up, fading
    // out toward the edge. (x, y) is a street position (see "Zooming in").
    function shine(x, y) {
      skyline.classList.add('is-shining');
      // The cursor ring isn't zoomed, so it goes where the spot shows on screen
      const ring = toScreen(x, y);
      skyline.style.setProperty('--x', ring.x + 'px');
      skyline.style.setProperty('--y', ring.y + 'px');
      // Each building's pool of light is placed from its own corner
      facades.forEach((f) => {
        f.el.style.setProperty('--x', x - f.x + 'px');
        f.el.style.setProperty('--y', y - f.y + 'px');
      });
      allWindows.forEach((w) => {
        const t = Math.max(0, 1 - Math.hypot(w.x - x, w.y - y) / LIGHT_RADIUS);
        const light = t * t * (3 - 2 * t); // soft edge
        if (light === 0 && w.light === 0) return; // far away and already dark: skip it
        w.light = light;
        w.el.style.setProperty('--light', light.toFixed(2));
      });
    }
    function darken() {
      skyline.classList.remove('is-shining');
      allWindows.forEach((w) => {
        if (w.light === 0) return;
        w.light = 0;
        w.el.style.setProperty('--light', 0);
      });
    }
    function pointIn(e) {
      const box = skyline.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top };
    }

    // Mouse: the light follows the cursor anywhere over the buildings. The
    // 15 West story window under (or right next to) the cursor is remembered,
    // and the cursor ring shows it.
    let frame = null;
    let storyUnderCursor = null;
    let pointer = null; // where the mouse is in the street's frame, while it's over the buildings
    function follow(p) {
      const s = toStreet(p.x, p.y);
      shine(s.x, s.y);
      storyUnderCursor = isDark() ? null : nearestStory(s.x, s.y, MOUSE_SLOP);
      skyline.classList.toggle('is-on-story', !!storyUnderCursor);
    }
    skylineRow.addEventListener('pointermove', (e) => {
      if (!built || e.pointerType === 'touch') return;
      pointer = pointIn(e);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => follow(pointer));
    });
    skylineRow.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      pointer = null;
      cancelAnimationFrame(frame);
      darken();
      storyUnderCursor = null;
      skyline.classList.remove('is-on-story');
    });

    // Point the zoom at a spot in the street's frame
    function lookAt(p) {
      zoom.focusX = p.x;
      zoom.focusY = p.y;
      if (zoom.scale === 1 && zoom.target === 1) {
        // Not zoomed: nothing moves, so just remember the spot
        zoom.fx = p.x;
        zoom.fy = p.y;
        return;
      }
      startZooming();
    }
    // Glide the zoom a little toward its target every frame until it gets there
    function startZooming() {
      if (zoom.moving) return;
      zoom.moving = true;
      requestAnimationFrame(stepZoom);
    }
    function stepZoom() {
      // Share of the remaining distance covered each frame: zooming in and out
      // both take about 0.2 seconds, for the button and the trackpad alike
      const ease = reduceMotion ? 1 : 0.3;
      const fx = zoom.focusX ?? zoom.fx;
      const fy = zoom.focusY ?? zoom.fy;
      zoom.scale += (zoom.target - zoom.scale) * ease;
      zoom.fx += (fx - zoom.fx) * ease;
      zoom.fy += (fy - zoom.fy) * ease;
      const done = Math.abs(zoom.target - zoom.scale) < 0.002 &&
        Math.abs(fx - zoom.fx) < 0.5 && Math.abs(fy - zoom.fy) < 0.5;
      if (done) {
        zoom.scale = zoom.target;
        zoom.fx = fx;
        zoom.fy = fy;
      }
      applyZoom();
      zoom.moving = !done;
      if (!done) requestAnimationFrame(stepZoom);
    }
    function applyZoom() {
      const t = shift();
      skylineRow.style.transform = zoom.scale === 1 ? '' :
        `translate(${t.x}px, ${t.y}px) scale(${zoom.scale})`;
      skyline.classList.toggle('is-scaled', zoom.scale !== 1);
      if (pointer) follow(pointer); // keep the light on whatever is under the cursor
    }

    // Dragging while zoomed in (press and move the mouse, or swipe a finger)
    // slides the view, like moving a photo around
    let drag = null;
    let dragged = false; // true right after a drag, so letting go doesn't open a story
    skylineRow.addEventListener('pointerdown', (e) => {
      dragged = false;
      if (!built || zoom.target <= 1.01) return;
      drag = { x: e.clientX, y: e.clientY, distance: 0 };
      skylineRow.setPointerCapture(e.pointerId);
    });
    skylineRow.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.distance += Math.abs(dx) + Math.abs(dy);
      if (drag.distance > 6) {
        dragged = true;
        skyline.classList.add('is-dragging');
        slideBy(dx, dy);
      }
    });
    function endDrag() {
      drag = null;
      skyline.classList.remove('is-dragging');
    }
    skylineRow.addEventListener('pointerup', endDrag);
    skylineRow.addEventListener('pointercancel', endDrag);

    // Move the view by (dx, dy) pixels, without sliding past the street's edges
    function slideBy(dx, dy) {
      if (zoom.scale <= 1) return;
      const o = rowOrigin();
      const fx = Math.min(o.x + skylineRow.offsetWidth, Math.max(o.x, zoom.fx - dx / (zoom.scale - 1)));
      const fy = Math.min(o.y + skylineRow.offsetHeight, Math.max(o.y, zoom.fy - dy / (zoom.scale - 1)));
      zoom.fx = zoom.focusX = fx;
      zoom.fy = zoom.focusY = fy;
      applyZoom();
    }
    function zoomTo(target) {
      zoom.target = target;
      const zoomed = target > 1.01;
      skyline.classList.toggle('is-zoomed', zoomed);
      zoomButton.setAttribute('aria-pressed', zoomed);
      zoomButton.setAttribute('aria-label', zoomed ? 'Zoom back out' : 'Zoom in on the street');
      startZooming();
    }

    // The magnifier button: one click zooms in toward the middle of the
    // street (then the view follows the cursor), another click zooms back out
    const zoomButton = root.querySelector('.skyline-zoom');
    zoomButton.addEventListener('click', () => {
      if (zoom.target > 1.01) return zoomTo(1);
      lookAt({ x: skyline.clientWidth / 2, y: skylineRow.offsetHeight * 0.55 });
      zoomTo(ZOOM_IN);
    });

    // Trackpad: pinching two fingers apart zooms in where the fingers are,
    // step by step. Pinching them together zooms all the way back out in one
    // go, so one small pinch is enough. While zoomed in, a plain two-finger swipe slides the view (no need
    // to press). Once the view reaches the street's top or bottom edge, a
    // swipe up or down scrolls the page again, so nobody gets stuck.
    let pinchOutAt = 0; // when the last pinch zoomed back out
    skylineRow.addEventListener('wheel', (e) => {
      if (!built) return;
      if (!e.ctrlKey) {
        if (zoom.target <= 1.01 || zoom.scale <= 1) return; // not zoomed: scroll the page as usual
        const before = { x: zoom.fx, y: zoom.fy };
        slideBy(-e.deltaX, -e.deltaY);
        if (zoom.fx !== before.x || zoom.fy !== before.y) e.preventDefault();
        return;
      }
      e.preventDefault();
      // Pinching in: straight back to normal, as quickly as the magnifier
      // button. (A trackpad sends tiny amounts, so any amount counts.)
      if (e.deltaY > 0) {
        if (zoom.target > 1) {
          zoomTo(1);
          pinchOutAt = performance.now();
        }
        return;
      }
      // Ignore the last flutters of that pinch, so it doesn't zoom back in
      if (performance.now() - pinchOutAt < 500) return;
      const p = pointIn(e);
      lookAt(p);
      // 0.03 = how strongly the fingers zoom: a short pinch is enough to get close
      const target = Math.min(MAX_ZOOM, Math.max(1, zoom.target * Math.exp(-e.deltaY * 0.03)));
      zoomTo(target < 1.02 ? 1 : target);
    }, { passive: false });

    // The 15 West lights switch. It starts on. Off, 15 West goes dark, the glow
    // over the street fades, and the count shows how few windows are left lit.
    const lightsSwitch = root.querySelector('.windows-switch input');
    const count = root.querySelector('.skyline-count');
    function isDark() {
      return root.classList.contains('is-dark');
    }
    let switchingOff = null;
    function updateSwitch() {
      const on = lightsSwitch.checked;
      // Switching off: the windows go out slowly, one by one (windows.css),
      // for the next few seconds; after that the flashlight reacts quickly again
      clearTimeout(switchingOff);
      root.classList.toggle('is-switching-off', !on);
      if (!on) switchingOff = setTimeout(() => root.classList.remove('is-switching-off'), 4200);
      root.classList.toggle('is-dark', !on);
      count.innerHTML = on
        ? `<strong>${litCount + neighborsLit}</strong> windows lit on the block &middot; ${FACADE.label}`
        : `<strong>${neighborsLit}</strong> windows lit without 15 West`;
      if (!on) {
        storyUnderCursor = null;
        skyline.classList.remove('is-on-story');
      }
    }
    lightsSwitch.addEventListener('change', updateSwitch);
    updateSwitch();

    // Phones have no hover, so a tap moves the light there. A tap only opens a
    // window that was already lit up by the flashlight, so the reveal comes first.
    let lastPointer = null;
    let tapTarget = null;
    skylineRow.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType;
      if (!built || e.pointerType !== 'touch') return;
      const tap = pointIn(e);
      const p = toStreet(tap.x, tap.y);
      const near = isDark() ? null : nearestStory(p.x, p.y, TOUCH_SLOP);
      tapTarget = near && near.light > 0.3 ? near : null;
      shine(p.x, p.y);
    });
    skylineRow.addEventListener('click', (e) => {
      if (!built || isDark()) return; // no stories while 15 West's lights are off
      if (dragged) { // that was the end of a drag, not a click
        dragged = false;
        lastPointer = null;
        tapTarget = null;
        return;
      }
      let w;
      if (lastPointer === 'touch') {
        w = tapTarget;
      } else {
        const el = e.target.closest('.window.has-story');
        w = (el && windows.find((x) => x.el === el)) || storyUnderCursor;
      }
      lastPointer = null;
      tapTarget = null;
      if (w) openStory(w);
    });
    function nearestStory(x, y, slop) {
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
      // Close enough if within half a window of its center, plus the slop
      return best && bestDistance <= best.el.offsetHeight / 2 + slop ? best : null;
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
      // The card is the same color as the window it came from
      panel.className = 'story-card-panel story-card-panel--' + w.tone;
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

  // Window light colors and how often each appears (out of 100), from the
  // photo of 15 West at night. The colors themselves are in windows.css.
  const TONES = [
    ['cool', 32], ['amber', 22], ['cream', 14], ['dim', 11],
    ['bright', 8], ['blinds', 8], ['purple', 3], ['blue', 2],
  ];
  function pickTone(r) {
    let n = r * 100;
    for (const [name, share] of TONES) {
      if ((n -= share) < 0) return name;
    }
    return TONES[0][0];
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
