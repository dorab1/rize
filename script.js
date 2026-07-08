(() => {
  "use strict";

  // ============================================================
  // Yandex Forms — вставьте ссылку на готовую форму сюда.
  // Пример: "https://forms.yandex.ru/u/XXXXXXXXXXXXXXXXXXXX/"
  // Пока строка пустая, модалка показывает вежливую заглушку.
  // ============================================================
  const YANDEX_FORM_URL = "https://forms.yandex.ru/u/6a4d3f5649af4715d120b5d0?iframe=1";

  // ---------------- Reduced motion ----------------
  const capsuleVideo = document.getElementById("capsule-video");
  if (capsuleVideo && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    capsuleVideo.removeAttribute("autoplay");
    capsuleVideo.pause();
  }

  // ---------------- Mobile nav ----------------
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.hidden = expanded;
    });
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.hidden = true;
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------------- Waitlist modal ----------------
  const modal = document.getElementById("waitlist-modal");
  const frame = document.getElementById("yandex-form-frame");
  const fallback = document.getElementById("modal-fallback");
  const openButtons = document.querySelectorAll(".js-open-modal");
  let lastFocused = null;

  function focusableIn(root) {
    return Array.from(
      root.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hasAttribute("hidden"));
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusableIn(modal.querySelector(".modal__panel"));
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;

    if (YANDEX_FORM_URL) {
      frame.src = YANDEX_FORM_URL;
      frame.hidden = false;
      fallback.hidden = true;
    } else {
      frame.hidden = true;
      fallback.hidden = false;
    }

    modal.setAttribute("data-open", "true");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    document.addEventListener("keydown", onKeydown);

    const closeBtn = modal.querySelector(".modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("data-open", "false");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
    if (frame) frame.src = "";
  }

  openButtons.forEach((btn) => btn.addEventListener("click", openModal));
  modal?.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));

  // ---------------- Footer year ----------------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
