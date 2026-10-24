// story.js — owned by Person B.
// Fills in the legend and credits.
// All the words live in STORY below, so editing copy never means touching HTML.
// (The old placeholder intro and narrative were removed at Rhea's request.)

(function () {
  const STORY = {
    legend: [
      { swatch: 'on', label: 'Window lit' },
      { swatch: 'off', label: 'Window dark' },
    ],
    credits: {
      authors: 'Made by Person A and Person B',
      course: 'Data Visualization, Rhode Island School of Design',
      note: 'Light observations collected from Westminster St. Sample data shown for now.',
    },
  };

  fill('legend', `
    <ul class="legend-list">
      ${STORY.legend.map((item) => `
        <li><span class="legend-swatch legend-swatch--${item.swatch}"></span>${item.label}</li>`).join('')}
    </ul>`);

  fill('credits', `
    <p>${STORY.credits.authors}</p>
    <p>${STORY.credits.course}</p>
    <p class="credits-note">${STORY.credits.note}</p>`);

  function fill(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
})();
