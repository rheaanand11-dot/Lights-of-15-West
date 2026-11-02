// pedestrians.js — owned by Anna.
// "How Do Lights Make Pedestrians Feel at Night?": what people walking past
// said about 15 West's lit windows. Each quote is a folder, and the folders
// are stacked like the stripes of a crosswalk, their tabs alternating left
// and right. Hovering a folder lights its tab; clicking it opens the folder
// to show the quote. One folder is open at a time.

(function () {
  const TEXT = {
    heading: 'How Do Lights Make Pedestrians Feel at Night?',
    body: 'People’s thoughts of how lit up windows of 15 West affect their perception ' +
      'of safety when the surrounding buildings go dark.',
  };
  // As written in the Figma frame
  const QUOTES = [
    'Definitely feels like the brightest building around the area',
    'It feels less lonely when walking at night',
    'It’s nice because the rest of downtown feel pretty dead',
    'Its so quiet, reminds you people actually live here',
    'I feel like it makes the place feel younger, like theres more life to it',
    'The lights make it less scary',
    'I definitely notice the windows more than the actual building',
    'Feels like a CCTV Camera',
    'Its the only building you can count on to have lights on late',
  ];
  // A folder's tab: flat on the side it shares with the folder's edge, with a
  // smooth slope down on the other side, like the reference folders
  const TAB_PATH = 'M0 28 V7 Q0 0 7 0 H136 C146 0 150 5 154 12 C159 21 164 28 180 28 Z';

  const root = document.getElementById('pedestrians');
  if (!root) return;

  root.innerHTML = `
    <h2 class="pedestrians-heading">${TEXT.heading}</h2>
    <p class="pedestrians-body">${TEXT.body}</p>
    <ol class="folders">
      ${QUOTES.map(folder).join('')}
    </ol>`;

  function folder(quote, i) {
    const n = String(i + 1).padStart(2, '0');
    const side = i % 2 === 0 ? 'left' : 'right'; // tabs alternate, like crosswalk stripes
    return `
      <li class="folder folder--${side}" style="--i: ${i}">
        <button type="button" class="folder-toggle" aria-expanded="false" aria-controls="quote-${n}"
                aria-label="Quote ${n}">
          <svg class="folder-tab" viewBox="0 0 180 28" preserveAspectRatio="none" aria-hidden="true">
            <path d="${TAB_PATH}"/>
          </svg>
          <span class="folder-stripe"><span class="folder-number">${n}</span></span>
        </button>
        <button type="button" class="folder-close" aria-label="Close quote ${n}">&times;</button>
        <div class="folder-panel" id="quote-${n}">
          <div class="folder-panel-inner">
            <p class="folder-quote">“${quote}”</p>
          </div>
        </div>
      </li>`;
  }

  // Opening and closing: one folder open at a time. Opening one closes the
  // one that was open; if that one is higher up the page, closing it would
  // pull everything up and make the new folder look like it opens upward.
  // So while the folders move, the page scrolls along to keep the clicked
  // folder's stripe still: every folder opens downward.
  const folders = [...root.querySelectorAll('.folder')];
  const MOVE_MS = 500; // a little longer than the open/close in pedestrians.css
  function setOpen(target) {
    const anchor = target || folders.find((f) => f.classList.contains('is-open'));
    const startTop = anchor ? anchor.getBoundingClientRect().top : 0;
    folders.forEach((f) => {
      const open = f === target;
      f.classList.toggle('is-open', open);
      f.querySelector('.folder-toggle').setAttribute('aria-expanded', open);
    });
    if (!anchor) return;
    const start = performance.now();
    (function keepStill(now) {
      const drift = anchor.getBoundingClientRect().top - startTop;
      if (Math.abs(drift) > 0.5) window.scrollBy(0, drift);
      if (now - start < MOVE_MS) requestAnimationFrame(keepStill);
    })(start);
  }
  folders.forEach((f) => {
    f.querySelector('.folder-toggle').addEventListener('click', () => {
      setOpen(f.classList.contains('is-open') ? null : f);
    });
    f.querySelector('.folder-close').addEventListener('click', () => setOpen(null));
  });

  // The gap above the heading: the same as between separate visualizations
  // (--space-section in base.css), counted from the last lamp's caption.
  // The lamps screen above is a full screen with the lamps in its middle, so
  // the empty space under them changes with the screen's height; the
  // padding here makes up the rest.
  function spaceAbove() {
    const captions = document.querySelectorAll('.streetlight-caption');
    const screen = document.querySelector('.streetlights-screen--lamps');
    if (!captions.length || !screen) return;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-section')) || 320;
    // Empty space between the last caption and the top of this section
    const below = root.getBoundingClientRect().top - captions[captions.length - 1].getBoundingClientRect().bottom;
    root.style.paddingTop = Math.max(16, gap - below) + 'px';
  }

  // The heading fades and grows in like the other headings, and the folders
  // slide in one after another as the list scrolls into view (again each
  // time you come back to it)
  const heading = root.querySelector('.pedestrians-heading');
  const list = root.querySelector('.folders');
  function onScroll() {
    const h = window.innerHeight;
    const box = heading.getBoundingClientRect();
    heading.classList.toggle('is-visible', box.top < h * 0.88 && box.bottom > h * 0.12);
    const l = list.getBoundingClientRect();
    if (l.top < h * 0.85 && l.bottom > 0) list.classList.add('is-on');
    else if (l.top > h || l.bottom < 0) list.classList.remove('is-on');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { spaceAbove(); onScroll(); });
  // The lamps above are drawn by streetlights.js once its data has loaded, and
  // redrawn when a night is picked: measure again whenever they change
  const lamps = document.getElementById('streetlights');
  if (lamps) {
    new MutationObserver(() => { spaceAbove(); onScroll(); })
      .observe(lamps, { childList: true, subtree: true });
  }
  spaceAbove();
  onScroll();
})();
