// story.js — owned by Person B.
// Fills in the legend.
// All the words live in STORY below, so editing copy never means touching HTML.
// (The old placeholder intro, narrative and credits were removed at Rhea's request.)

(function () {
  const STORY = {
    legend: [
      { swatch: 'on', label: 'Window lit' },
      { swatch: 'off', label: 'Window dark' },
    ],
  };

  fill('legend', `
    <ul class="legend-list">
      ${STORY.legend.map((item) => `
        <li><span class="legend-swatch legend-swatch--${item.swatch}"></span>${item.label}</li>`).join('')}
    </ul>`);

  function fill(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
})();
