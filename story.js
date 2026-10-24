// story.js — owned by Person B.
// Fills in the intro, narrative text, legend and credits.
// All the words live in STORY below, so editing copy never means touching HTML.
// Placeholder text until the Figma frames arrive.

(function () {
  const STORY = {
    intro: {
      kicker: 'A night in downtown Providence',
      title: 'How an art school keeps a city awake',
      dek: 'Long after the offices empty, the windows of 15 West stay lit.',
    },
    narrative: [
      'At 6 pm, Textron Tower and 15 West look about the same: rows of lit windows.',
      'By midnight, the office tower has gone dark. The dorm has not.',
      'Press play to watch one night, window by window.',
    ],
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

  fill('intro', `
    <p class="story-kicker">${STORY.intro.kicker}</p>
    <h1 class="story-title">${STORY.intro.title}</h1>
    <p class="story-dek">${STORY.intro.dek}</p>`);

  fill('narrative', STORY.narrative.map((p) => `<p>${p}</p>`).join(''));

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
