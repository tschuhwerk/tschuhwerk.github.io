console.log('Site redesign loaded');] });
  watched.forEach(s => io.observe(s));

  // Projects: render from inline JSON
  const dataEl = document.getElementById('projects-data');
  const target = document.getElementById('projects');
  if(dataEl && target){
    try{
      const { items=[] } = JSON.parse(dataEl.textContent || '{}');
      items.forEach(p => {
        const card = document.createElement('article');
        card.className = 'project';
        card.innerHTML = `
          <h3>${p.title ?? ''}</h3>
          <div class="stack">${p.stack ?? ''}</div>
          <p class="desc">${p.desc ?? ''}</p>
          ${p.link ? `<div class="actions"><a class="btn" href="${p.link}">View</a></div>` : ''}
        `;
        target.appendChild(card);
      });
    }catch(e){ console.warn('Project data parse error', e); }
  }
})();
// End redesign
