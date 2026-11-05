// Move the original figure rather than maintaining duplicate images or links.
// Without JavaScript every preview remains inside its native details element.
export function setupProjectPreviews(work, {
  desktop = window.matchMedia('(min-width: 901px)'),
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'),
} = {}) {
  const slot = work?.querySelector('.work-preview');
  if (!slot) return () => {};
  const entries = [...work.querySelectorAll('.project')].map((project) => ({
    project,
    description: project.querySelector('.project-description'),
    figure: project.querySelector('.project-preview'),
  })).filter(({ description, figure }) => description && figure);
  if (!entries.length) return () => {};
  let selected = entries.find(({ project }) => project.open) || entries[0];

  function placeFigures(animate = false) {
    for (const entry of entries) {
      const target = desktop.matches && entry === selected ? slot : entry.description;
      if (entry.figure.parentElement !== target) {
        entry.figure.getAnimations?.().forEach((animation) => animation.cancel());
        target.prepend(entry.figure);
      }
    }
    work.classList.toggle('has-work-preview', desktop.matches);
    selected.figure.querySelector('img').loading = 'eager';
    if (animate && desktop.matches && !reducedMotion.matches && !work.hidden) {
      selected.figure.animate?.([
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 240, easing: 'ease-out' });
    }
  }

  const handlers = entries.map((entry) => {
    const onToggle = () => {
      if (!entry.project.open || selected === entry) return;
      selected = entry;
      placeFigures(true);
    };
    entry.project.addEventListener('toggle', onToggle);
    return () => entry.project.removeEventListener('toggle', onToggle);
  });
  const onResize = () => placeFigures();
  desktop.addEventListener('change', onResize);
  placeFigures();
  return () => {
    handlers.forEach((remove) => remove());
    desktop.removeEventListener('change', onResize);
    for (const { figure, description } of entries) {
      figure.getAnimations?.().forEach((animation) => animation.cancel());
      description.prepend(figure);
    }
    work.classList.remove('has-work-preview');
  };
}
