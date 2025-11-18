// SCRIPT POUR LE MENU BURGER
(function () {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.getElementById('primary-navigation');

  if (!navbar || !toggle || !menu) return;

  // Position dynamique du menu mobile (évite les valeurs magiques comme 72px)
  function placeMenuUnderNavbar() {
    const h = navbar.getBoundingClientRect().height;
    menu.style.top = h + 'px';
  }

  // Scroll lock sans jump
  function lockScroll() {
    const scrollY = window.scrollY || window.pageYOffset;
    document.body.dataset.scrollY = String(scrollY);
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function unlockScroll() {
    const y = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.dataset.scrollY = '';
    window.scrollTo(0, y); // restaure la position exacte
  }

  function setOpen(isOpen) {
    navbar.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');

    if (window.matchMedia('(max-width: 768px)').matches) {
      if (isOpen) {
        placeMenuUnderNavbar();
        lockScroll();
      } else {
        unlockScroll();
      }
    }
  }

  toggle.addEventListener('click', () => setOpen(!navbar.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 769px)').matches) setOpen(false);
    else placeMenuUnderNavbar();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  // Place correctement le menu au chargement
  placeMenuUnderNavbar();
})();


// SCRIPT DE CONNEXION FRONTEND ET BACKEND
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_BASE = isLocal ? 'http://localhost:3000' : '';


// SCRIPT POUR LE FORULAIRE DE TELECHARGEMENT
document.addEventListener('DOMContentLoaded', () => {
  // On cible spécifiquement le formulaire du guide
  const form = document.querySelector('form[action="/subscribe"], form[data-api="subscribe"]');
  if (!form) return;

  const requiredInputs = form.querySelectorAll('input[required]');

  // Élément pour afficher le message global (succès / erreur serveur)
  let statusEl = form.querySelector('.form-status');
  if (!statusEl) {
    statusEl = document.createElement('p');
    statusEl.className = 'form-status';
    statusEl.setAttribute('aria-live', 'polite');
    // tu peux changer la position si tu préfères
    form.appendChild(statusEl);
  }

  // --- helpers ---
  const emailIsValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function getLabelEl(input) {
    // 1) label englobant
    const wrapping = input.closest('label');
    if (wrapping) return wrapping;
    // 2) label associé via for=
    if (input.id) {
      try {
        return form.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      } catch {
        return form.querySelector(`label[for="${input.id}"]`);
      }
    }
    return null;
  }

  function getAnchorForError(input) {
    // si un label est associé (wrapping ou via for), on insère après le label
    const label = getLabelEl(input);
    return label || input;
  }

  function findExistingError(anchor) {
    const next = anchor.nextElementSibling;
    return next && next.classList && next.classList.contains('form-error') ? next : null;
  }

  function showError(input, message) {
    clearError(input);

    const anchor = getAnchorForError(input);
    const error = document.createElement('div');
    error.className = 'form-error';
    error.role = 'alert';
    error.setAttribute('aria-live', 'polite');

    // id unique pour aria-describedby
    const baseId = (input.name || input.id || 'field') + '-error';
    let errorId = baseId, i = 1;
    while (document.getElementById(errorId)) {
      errorId = `${baseId}-${i++}`;
    }
    error.id = errorId;
    error.textContent = message;

    input.setAttribute('aria-invalid', 'true');
    // relie le champ au message
    const describedBy = (input.getAttribute('aria-describedby') || '').trim();
    input.setAttribute('aria-describedby', (describedBy ? describedBy + ' ' : '') + errorId);

    anchor.insertAdjacentElement('afterend', error);
  }

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    // enlève l'id du message de aria-describedby si présent
    const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (describedBy.length) {
      // supprime ceux qui existent dans le DOM et sont .form-error
      const keep = [];
      for (const id of describedBy) {
        const el = document.getElementById(id);
        if (el && el.classList && el.classList.contains('form-error')) {
          el.remove();
        } else {
          keep.push(id);
        }
      }
      if (keep.length) input.setAttribute('aria-describedby', keep.join(' '));
      else input.removeAttribute('aria-describedby');
    } else {
      // fallback: supprime l'éventuelle erreur voisine
      const anchor = getAnchorForError(input);
      const err = findExistingError(anchor);
      if (err) err.remove();
    }
  }

  function validateField(input) {
    const isCheckbox = input.type === 'checkbox';
    const value = isCheckbox ? input.checked : input.value.trim();
    let message = '';

    if (isCheckbox) {
      if (!value) message = 'Vous devez cocher cette case pour continuer.';
    } else {
      if (!value) message = 'Ce champ est obligatoire.';
      else if (input.type === 'email' && !emailIsValid(value)) {
        message = 'Veuillez saisir une adresse e-mail valide.';
      }
    }

    if (message) { showError(input, message); return false; }
    clearError(input); return true;
  }

  // --- Validation + appel backend au submit ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.classList.remove('form-status--error', 'form-status--success');

    let allValid = true;
    requiredInputs.forEach((input) => {
      if (!validateField(input)) allValid = false;
    });

    if (!allValid) {
      const firstInvalid = form.querySelector('input[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Tous les champs sont OK → on envoie au backend
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Forcer la valeur de consent en booléen cohérent
    const consentInput = form.querySelector('#consent');
    if (consentInput) {
      payload.consent = consentInput.checked;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || 'Une erreur est survenue. Merci de réessayer.');
      }

      // Succès : message de validation
      statusEl.textContent = json.message || 'Merci ! Le document vous est envoyé par email. Bonne lecture !';
      statusEl.classList.add('form-status--success');
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');

      form.reset();
      requiredInputs.forEach((input) => clearError(input));
    } catch (err) {
      statusEl.textContent = err.message || 'Erreur lors de l’envoi. Merci de réessayer.';
      statusEl.classList.add('form-status--error');
      statusEl.setAttribute('role', 'alert');
      statusEl.setAttribute('aria-live', 'assertive');
    }
  });

  // Effacement des erreurs au fil de la correction
  requiredInputs.forEach((input) => {
    const handler = () => validateField(input);
    if (input.type === 'checkbox') {
      input.addEventListener('change', handler);
      input.addEventListener('blur', handler);
    } else {
      input.addEventListener('input', handler);
      input.addEventListener('blur', handler);
    }
  });
});


// SCRIPT DE TRI
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('[data-testimonial-toggle]');
  const filterItems   = document.querySelectorAll('.categories-nav .category-btn');
  const testimonials  = document.querySelectorAll('.testimonial-card');

  function applyFilter(tag) {
    testimonials.forEach(card => {
      const cardTag = card.dataset.testimonialTag;
      const shouldShow = tag === 'all' || cardTag === tag;
      card.style.display = shouldShow ? '' : 'none';
    });
  }

  function handleFilterClick(event) {
    const span = event.currentTarget;
    const li   = span.closest('.category-btn');
    const tag  = span.dataset.testimonialToggle;

    filterItems.forEach(item => item.classList.remove('is-active'));
    if (li) li.classList.add('is-active');

    applyFilter(tag);
  }

  // --- listeners sur les SPAN (clic + clavier) ---
  filterButtons.forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');

    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleFilterClick(event);
      }
    });
  });

  // --- faire remonter le clic du LI vers le SPAN ---
  filterItems.forEach(li => {
    const span = li.querySelector('[data-testimonial-toggle]');
    if (!span) return;

    li.addEventListener('click', (event) => {
      // si on a cliqué directement sur le span,
      // son propre handler va déjà se charger du filtre
      if (event.target === span) return;

      span.click(); // déclenche le clic "normal" du span
    });
  });

  // filtre par défaut
  applyFilter('all');
});