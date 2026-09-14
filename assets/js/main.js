(() => {
  const $ = (id) => document.getElementById(id);

  function setMultiline(el, value) {
    if (!el || value == null) return;
    el.replaceChildren();
    String(value).split('\n').forEach((line, index) => {
      if (index) el.append(document.createElement('br'));
      el.append(document.createTextNode(line));
    });
  }

  function setBulletLine(el, value) {
    if (!el || value == null) return;
    el.replaceChildren();
    const parts = String(value).split('•').map((part) => part.trim()).filter(Boolean);
    parts.forEach((part, index) => {
      if (index) {
        el.append(document.createTextNode(' '));
        const bullet = document.createElement('b');
        bullet.textContent = '•';
        el.append(bullet, document.createTextNode(' '));
      }
      el.append(document.createTextNode(part));
    });
  }

  function whatsapp(phone, message) {
    const digits = String(phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`;
  }

  function setImage(id, src, alt) {
    const img = $(id);
    if (!img || !src) return;
    img.src = src;
    if (alt) img.alt = alt;
  }

  function applyConfig(c) {
    if (!c) return;
    if (c.site?.title) {
      document.title = c.site.title;
      $('site-title').textContent = c.site.title;
      $('site-logo').alt = c.site.title;
    }
    if (c.site?.description) $('site-description').setAttribute('content', c.site.description);
    setBulletLine($('site-modalities'), c.site?.modalities);
    setMultiline($('site-tagline'), c.site?.tagline);
    setImage('site-logo', c.site?.logo, c.site?.title);

    if (c.experimental) {
      setMultiline($('experimental-label'), c.experimental.label);
      $('experimental-link').href = whatsapp(c.experimental.phone, c.experimental.message);
      $('experimental-link').setAttribute('aria-label', `Agendar aula experimental com ${c.experimental.person || 'a equipe'} pelo WhatsApp`);
    }

    if (c.functional) {
      setMultiline($('functional-title'), c.functional.title);
      $('functional-subtitle').textContent = c.functional.subtitle || '';
      $('functional-link').href = whatsapp(c.functional.phone, c.functional.message);
      setImage('functional-image', c.functional.image, c.functional.title?.replace(/\n/g, ' '));
    }

    if (c.dance) {
      setMultiline($('dance-title'), c.dance.title);
      $('dance-subtitle').textContent = c.dance.subtitle || '';
      $('dance-link').href = whatsapp(c.dance.phone, c.dance.message);
      setImage('dance-image', c.dance.image, c.dance.title?.replace(/\n/g, ' '));
    }

    if (c.location) {
      $('location-title').textContent = c.location.title || '';
      $('location-subtitle').textContent = c.location.subtitle || '';
      if (c.location.url) $('location-link').href = c.location.url;
      setImage('location-image', c.location.image, c.location.title);
    }

    if (c.instagram) {
      $('instagram-title').textContent = c.instagram.title || '';
      $('instagram-subtitle').textContent = c.instagram.subtitle || '';
      if (c.instagram.url) $('instagram-link').href = c.instagram.url;
      setImage('instagram-image', c.instagram.image, c.instagram.title);
    }

    setBulletLine($('footer-center'), c.footer?.center);
    setMultiline($('benefit-1'), c.footer?.benefit1);
    setMultiline($('benefit-2'), c.footer?.benefit2);
    setMultiline($('benefit-3'), c.footer?.benefit3);
  }

  async function loadConfig() {
    try {
      const response = await fetch(`site-config.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      applyConfig(await response.json());
    } catch (_) {
      // Mantém o conteúdo padrão do HTML caso a configuração não possa ser carregada.
    }
  }

  function initMotion() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = document.querySelectorAll('.reveal');
    if (!reduced && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    const canTilt = !reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (canTilt) {
      document.querySelectorAll('.tilt-card').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(1100px) rotateX(${-y * 2.4}deg) rotateY(${x * 2.7}deg) translateY(-1px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
      });
    }
  }

  loadConfig();
  initMotion();
})();
