
export const ScrollIntersector = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
  entries.forEach((entry) => {
    if(entry.target.getAttribute('is-hidden-parent')) {
      if(entry.isIntersecting) {
        // @ts-ignore
        if(entry.target.hiddenChild) {
          ScrollIntersector.unobserve(entry.target);
          // @ts-ignore
          entry.target.appendChild(entry.target.hiddenChild as HTMLElement);
          // @ts-ignore
          ScrollIntersector.observe(entry.target.hiddenChild);
        }
      }
    } else {
      if(!(entry.isIntersecting) && entry.target.parentElement) {
        ScrollIntersector.unobserve(entry.target);
        ScrollIntersector.observe(entry.target.parentElement);
        entry.target.parentElement.setAttribute('is-hidden-parent', 'true');
        // @ts-ignore
        entry.target.parentElement.hiddenChild = entry.target;
        entry.target.parentElement.removeChild(entry.target);
      }
    }
  });
}, {
  root: document.body,
  threshold: 0.05
});
