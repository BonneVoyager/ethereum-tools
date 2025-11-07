function initSectionCollapsers(sections) {
  sections.forEach(({ header, container, storage, label }) => {
    const headerEl = document.getElementById(header);
    const containerEl = document.getElementById(container);
    if (!headerEl || !containerEl || !containerEl.parentNode) {
      return;
    }

    const parentSection = containerEl.parentNode;

    const applyState = (collapsed) => {
      parentSection.classList.toggle("collapsed", collapsed);
      headerEl.innerText = `${label} ${collapsed ? "" : ""}`;
    };

    headerEl.addEventListener("click", () => {
      const collapsed = !parentSection.classList.contains("collapsed");
      applyState(collapsed);
      localStorage.setItem(storage, collapsed);
    });

    if (localStorage.getItem(storage) === "true") {
      applyState(true);
    }
  });
}

module.exports = initSectionCollapsers;
