// Smooth in-page scrolling already handled by CSS scroll-behavior.
// Add accessible hamburger toggle and reduced-motion guard.
(function(){
  const btn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('primary-nav');
  if(!btn || !nav) return;

  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const open = () => {
    nav.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    nav.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? close() : open();
  });

  // Close when clicking outside on small screens
  document.addEventListener('click', (e) => {
    if(window.innerWidth > 760) return;
    if(!nav.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      close();
    }
  });

  // Escape key closes menu
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') close();
  });
})();

// Tiny enhancement: smooth scroll for in-page links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id=a.getAttribute('href').slice(1);
    const el=document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
  })
});


// Theme toggle + Back-to-top (with reduced-motion support)
(function(){
  const root = document.documentElement;
  const btn = document.querySelector('.theme-toggle');
  const STORAGE_KEY = 'theme-pref'; // 'light' | 'dark'

  // Apply saved theme or fallback to system
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved === 'light' || saved === 'dark'){
    root.setAttribute('data-theme', saved);
    if(btn){ btn.setAttribute('aria-checked', saved === 'dark'); }
  }else{
    // No saved preference; don't set data-theme so media query rules apply.
    if(btn){
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      btn.setAttribute('aria-checked', prefersDark);
    }
  }

  if(btn){
    btn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      btn.setAttribute('aria-checked', String(next === 'dark'));
    });
  }

  // Back-to-top button
  const toTop = document.querySelector('.to-top');
  if(toTop){
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const showAt = 400;
    const onScroll = () => { toTop.hidden = window.scrollY < showAt; };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();

    toTop.addEventListener('click', ()=>{
      const opts = { top: 0 };
      if(!mql.matches) opts.behavior = 'smooth';
      window.scrollTo(opts);
    });
  }
})();

// Scroll-spy (updates nav aria-current and class) + "t" to scroll-to-top
(function(){
  const nav = document.getElementById('primary-nav');
  if(!nav) return;
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));

  // Map section id -> link
  const map = new Map();
  links.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    if(id) map.set(id, a);
  });

  const sections = Array.from(document.querySelectorAll('main [id]'))
    .filter(el => map.has(el.id));

  // Observer highlights the section mostly in view
  let activeId = null;
  const io = new IntersectionObserver((entries) => {
    // Pick the entry with highest intersection ratio
    let best = null;
    for(const e of entries){
      if(!best || e.intersectionRatio > best.intersectionRatio){
        best = e;
      }
    }
    if(best && best.isIntersecting){
      const id = best.target.id;
      if(id !== activeId){
        activeId = id;
        // reset all
        links.forEach(a => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        const link = map.get(id);
        if(link){
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'page');
        }
      }
    }
  }, { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });

  sections.forEach(s => io.observe(s));

  // Keyboard shortcut: press "t" to scroll to top (ignore when typing)
  const isTypingTarget = (el) => {
    if(!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable || tag === 'SELECT';
  };

  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (isTypingTarget(document.activeElement)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      const opts = { top: 0 };
      if(!mql.matches) opts.behavior = 'smooth';
      window.scrollTo(opts);
    }
  });
})();

// Auto-ID for new sections + nav click animation & immediate active state
(function(){
  // --- Auto-assign IDs to sections/articles lacking them ---
  const taken = new Set(Array.from(document.querySelectorAll('[id]')).map(el => el.id));
  const slugify = (s) => s.toLowerCase()
    .trim()
    .replace(/[\s\W]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'section';
  const ensureUnique = (base) => {
    let id = base, n = 2;
    while (taken.has(id) || document.getElementById(id)) { id = `${base}-${n++}`; }
    taken.add(id);
    return id;
  };

  const candidates = document.querySelectorAll('main section, main article');
  candidates.forEach(el => {
    if (!el.id) {
      const h = el.querySelector('h2, h3, h1');
      if (h && h.textContent) {
        const base = slugify(h.textContent);
        el.id = ensureUnique(base);
      }
    }
  });

  // --- Nav click animation + immediate 'active' and aria-current ---
  const nav = document.getElementById('primary-nav');
  if(!nav) return;
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));

  links.forEach(a => {
    a.addEventListener('click', () => {
      // click animation
      a.classList.remove('click-anim'); // restart animation if rapid clicks
      // force reflow
      void a.offsetWidth;
      a.classList.add('click-anim');

      // immediate active state for responsiveness
      links.forEach(l => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    });
  });
})();

// --- Auto-generate internal nav links from sections/articles ---
(function(){
  const nav = document.getElementById('primary-nav');
  if(!nav) return;

  // Utility: create element
  const el = (tag, attrs={}, children=[]) => {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    }
    children.forEach(c => n.appendChild(c));
    return n;
  };

  // Collect existing anchors; keep "external" ones (non-#) to re-append after internal links
  const existing = Array.from(nav.querySelectorAll('a'));
  const external = existing.filter(a => !a.getAttribute('href') || !a.getAttribute('href').startsWith('#'));

  // Build internal list from sections/articles in DOM order
  const sections = Array.from(document.querySelectorAll('main section[id], main article[id]'));
  const internal = sections.map(s => {
    // Find a heading for label
    const h = s.querySelector('h2, h3, h1');
    const label = (h && h.textContent.trim()) || s.id;
    return { id: s.id, label };
  });

  // Remove all anchors to rebuild (preserve external by re-appending after)
  existing.forEach(a => a.remove());

  // Append internal anchors
  internal.forEach(({id, label}) => {
    nav.appendChild(el('a', { href: `#${id}` , text: label }));
  });

  // Append a separator if there will be both internal and external links
  if (internal.length && external.length) {
    const sep = document.createElement('span');
    sep.setAttribute('aria-hidden', 'true');
    sep.style.flexBasis = '100%'; // line break on small screens
    sep.style.height = '0';
    nav.appendChild(sep);
  }

  // Re-append external anchors at the end in their original order
  external.forEach(a => nav.appendChild(a));

  // Re-bind behaviors for new links:
  // 1) click underline animation + immediate active state
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const rebindClickAnim = () => {
    links.forEach(a => {
      a.addEventListener('click', () => {
        a.classList.remove('click-anim');
        void a.offsetWidth; // restart
        a.classList.add('click-anim');

        links.forEach(l => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }, { passive: true });
    });
  };
  rebindClickAnim();

  // 2) notify existing scroll-spy to remap: dispatch a custom event
  document.dispatchEvent(new CustomEvent('nav-regenerated'));
})();
