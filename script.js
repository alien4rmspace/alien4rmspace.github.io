const yearElement = document.querySelector("#year");
const siteHeader = document.querySelector("[data-site-header]");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear().toString();
}

if (siteHeader) {
  const syncHeaderState = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  syncHeaderState();
  window.addEventListener("scroll", syncHeaderState, { passive: true });
}

const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealItems.forEach((item) => {
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => {
    item.classList.add("is-visible");
  });
}

const evidenceFrames = document.querySelectorAll(".project-evidence-frame");

if (evidenceFrames.length > 0) {
  const lightbox = document.createElement("div");
  lightbox.className = "project-lightbox";
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="project-lightbox-dialog" role="dialog" aria-modal="true" aria-labelledby="project-lightbox-title">
      <div class="project-lightbox-shell">
        <button class="project-lightbox-close" type="button" aria-label="Close image preview">&times;</button>
        <div class="project-lightbox-media">
          <img src="" alt="" />
        </div>
        <div class="project-lightbox-caption">
          <p class="project-lightbox-label">Image Preview</p>
          <h2 class="project-lightbox-title" id="project-lightbox-title"></h2>
          <p class="project-lightbox-body"></p>
        </div>
      </div>
    </div>
  `;

  document.body.append(lightbox);

  const lightboxDialog = lightbox.querySelector(".project-lightbox-dialog");
  const lightboxClose = lightbox.querySelector(".project-lightbox-close");
  const lightboxImage = lightbox.querySelector(".project-lightbox-media img");
  const lightboxTitle = lightbox.querySelector(".project-lightbox-title");
  const lightboxBody = lightbox.querySelector(".project-lightbox-body");
  let activeEvidenceFrame = null;

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    window.removeEventListener("keydown", handleLightboxKeydown);

    window.setTimeout(() => {
      lightbox.hidden = true;
      lightboxImage.src = "";
    }, 220);

    if (activeEvidenceFrame) {
      activeEvidenceFrame.focus();
      activeEvidenceFrame = null;
    }
  };

  function handleLightboxKeydown(event) {
    if (event.key === "Escape") {
      closeLightbox();
    }
  }

  const openLightbox = (frame) => {
    const image = frame.querySelector("img");
    const figure = frame.closest(".project-evidence-card");
    const title = figure?.querySelector("strong")?.textContent?.trim() || image.alt;
    const body = figure?.querySelector(".project-evidence-caption span:last-child")?.textContent?.trim() || image.alt;

    if (!image) {
      return;
    }

    activeEvidenceFrame = frame;
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = title;
    lightboxBody.textContent = body;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");

    window.requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
      lightboxClose.focus();
    });

    window.addEventListener("keydown", handleLightboxKeydown);
  };

  evidenceFrames.forEach((frame) => {
    const image = frame.querySelector("img");
    const figure = frame.closest(".project-evidence-card");
    const title = figure?.querySelector("strong")?.textContent?.trim() || image?.alt || "Project image";

    frame.tabIndex = 0;
    frame.setAttribute("role", "button");
    frame.setAttribute("aria-haspopup", "dialog");
    frame.setAttribute("aria-label", `Open image preview: ${title}`);

    frame.addEventListener("click", () => {
      openLightbox(frame);
    });

    frame.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(frame);
      }
    });
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || !lightboxDialog.contains(event.target)) {
      closeLightbox();
    }
  });

  lightboxClose.addEventListener("click", closeLightbox);
}
