/* Routes */
const DASHBOARD_URL = 'analytics_admin.html'; // Back to Dashboard target

/* Elements */
const canvas = document.getElementById('canvas');
const menuBtn = document.getElementById('btnMenu');
const menu = document.getElementById('menu');
const dateIcon = document.getElementById('dateIcon');
const dueDateInput = document.getElementById('dueDate');

/* State */
const state = {
  meta:{ assignTo:'', dueDate:'', published:false },
  questions:[]
};
const uid = ()=>'q_'+Math.random().toString(36).slice(2,9);

/* Templates */
const TEMPLATES = {
  multiple_choice:()=>({id:uid(),type:'multiple_choice',text:'',options:['Option 1','Option 2','Option 3']}),
  likert:()=>({id:uid(),type:'likert',text:''}),
  short_answer:()=>({id:uid(),type:'short_answer',text:''}),
  paragraph:()=>({id:uid(),type:'paragraph',text:''})
};

/* ---------- Render questions ---------- */
function render(){
  canvas.innerHTML='';
  state.questions.forEach((q,i)=>{
    const card=document.createElement('div');
    card.className='q-card'; card.draggable=true; card.dataset.id=q.id;

    // drag to reorder
    card.addEventListener('dragstart', e=>{
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', q.id);
      const ghost=document.createElement('div'); ghost.className='ghost'; ghost.id='ghost';
      card.parentNode.insertBefore(ghost, card.nextSibling);
    });
    card.addEventListener('dragend', ()=>{
      card.classList.remove('dragging');
      const g=document.getElementById('ghost'); if(g) g.remove();
      // after drop, ensure numbers refresh
      render();
      persist();
    });
    card.addEventListener('dragover', e=>{
      e.preventDefault();
      const dragging=document.querySelector('.q-card.dragging');
      if(!dragging||dragging===card) return;
      const rect=card.getBoundingClientRect();
      const before=(e.clientY-rect.top)<rect.height/2;
      canvas.insertBefore(dragging, before?card:card.nextSibling);
    });
    card.addEventListener('drop', ()=>{
      syncOrderFromDOM();
      render(); // re-render to update numbering
    });

    // content
    const title=document.createElement('div');
    title.className='q-title';
    title.textContent=`Question ${i+1}: ${labelFor(q.type)}`;
    card.appendChild(title);

    const prompt=document.createElement('input');
    prompt.className='input'; prompt.placeholder='Enter your question here…';
    prompt.value=q.text||''; prompt.addEventListener('input',e=>{ q.text=e.target.value; persist(); });
    card.appendChild(prompt);

    if(q.type==='multiple_choice'){
      q.options.forEach((opt,idx)=>{
        const row=document.createElement('div');
        row.className='mc-opt';
        row.innerHTML=`<span class="mc-dot"></span><div class="input" contenteditable="true">${escapeHTML(opt)}</div>`;
        row.querySelector('[contenteditable]').addEventListener('input',e=>{
          q.options[idx]=e.target.textContent; persist();
        });
        card.appendChild(row);
      });
    }
    if(q.type==='likert'){
      const stars=document.createElement('div'); stars.className='star-row';
      stars.innerHTML='<i class="bi bi-star-fill star"></i>'.repeat(5);
      card.appendChild(stars);
    }
    if(q.type==='paragraph'){
      const ta=document.createElement('textarea'); ta.className='textarea'; ta.placeholder='Long answer text'; ta.disabled=true;
      card.appendChild(ta);
    }
    if(q.type==='short_answer'){
      const sa=document.createElement('input'); sa.className='input'; sa.placeholder='Short answer text'; sa.disabled=true;
      card.appendChild(sa);
    }

    const actions=document.createElement('div'); actions.className='q-actions';
    actions.innerHTML=`
      <button class="iconbtn" title="Duplicate"><i class="bi bi-files"></i></button>
      <button class="iconbtn" title="Delete"><i class="bi bi-trash3"></i></button>`;
    const [dup,del]=actions.querySelectorAll('button');
    dup.onclick=()=>duplicate(q.id);
    del.onclick=()=>removeQ(q.id);
    card.appendChild(actions);

    canvas.appendChild(card);
  });
}
const labelFor=t=>({multiple_choice:'Multiple Choice',likert:'Likert Scale',short_answer:'Short Answer',paragraph:'Paragraph'})[t]||t;

/* ---------- CRUD ---------- */
function add(type, index=null){
  const tpl=TEMPLATES[type]; if(!tpl) return;
  const newQ = tpl();
  if(index===null || index<0 || index>state.questions.length){
    state.questions.push(newQ);
  }else{
    state.questions.splice(index,0,newQ);
  }
  persist(); render();
}
function removeQ(id){ state.questions=state.questions.filter(q=>q.id!==id); persist(); render(); }
function duplicate(id){
  const i=state.questions.findIndex(q=>q.id===id);
  const copy=JSON.parse(JSON.stringify(state.questions[i])); copy.id=uid();
  state.questions.splice(i+1,0,copy); persist(); render();
}
function syncOrderFromDOM(){
  const ids=[...canvas.querySelectorAll('.q-card')].map(el=>el.dataset.id);
  state.questions.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)); persist();
}

/* ---------- Persistence ---------- */
function persist(){ localStorage.setItem('purple_survey_builder', JSON.stringify(state)); }
function restore(){
  const raw=localStorage.getItem('purple_survey_builder');
  if(raw){ const s=JSON.parse(raw); Object.assign(state.meta,s.meta||{}); state.questions=s.questions||[]; }
  else{ state.questions=[TEMPLATES.short_answer(), TEMPLATES.likert(), TEMPLATES.multiple_choice()]; }
}

/* ---------- Toolbox: click + drag to canvas ---------- */
document.querySelectorAll('.tool').forEach(btn=>{
  btn.addEventListener('click', ()=> add(btn.dataset.type));
  btn.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('text/plain', 'tool:'+btn.dataset.type);
  });
});
canvas.addEventListener('dragover', e=>{
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  const draggingCard = document.querySelector('.q-card.dragging');
  if(data.startsWith('tool:') && !draggingCard){
    const nearest = getNearestCard(e.clientY);
    showGhostAt(nearest);
  }
});
canvas.addEventListener('drop', e=>{
  e.preventDefault();
  const data = e.dataTransfer.getData('text/plain');
  const draggingCard = document.querySelector('.q-card.dragging');
  removeGhost();
  if(data.startsWith('tool:') && !draggingCard){
    const nearest = getNearestCard(e.clientY);
    const index = nearest ? [...canvas.children].indexOf(nearest) : state.questions.length;
    add(data.split(':')[1], index);
  }
});
function getNearestCard(y){
  const cards = [...canvas.querySelectorAll('.q-card')];
  let nearest = null;
  for(const c of cards){
    const rect = c.getBoundingClientRect();
    if(y < rect.top + rect.height/2){ nearest = c; break; }
  }
  return nearest;
}
function showGhostAt(beforeEl){
  removeGhost();
  const g = document.createElement('div');
  g.className = 'ghost';
  if(beforeEl) canvas.insertBefore(g, beforeEl);
  else canvas.appendChild(g);
}
function removeGhost(){ const g = canvas.querySelector('.ghost'); if(g) g.remove(); }

/* ---------- Menu ---------- */
menuBtn.onclick=()=>{
  menu.classList.toggle('show');
  const close=e=>{ if(!menu.contains(e.target)&&e.target!==menuBtn){ menu.classList.remove('show'); document.removeEventListener('click',close);} };
  setTimeout(()=>document.addEventListener('click',close),0);
};

/* ---------- Top buttons ---------- */
// --- Modal helpers ---
const modal = document.getElementById('modalOverlay');
const openModal  = () => modal.classList.add('show');
const closeModal = () => modal.classList.remove('show');

// Open from "New survey"
document.getElementById('btnNew').onclick = openModal;

// Close actions
document.getElementById('modalCancel').onclick = closeModal;
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal(); // click outside the dialog
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

const topbar = document.querySelector('.topbar');
const obs = new IntersectionObserver(([e])=>{
  topbar.classList.toggle('is-stuck', e.intersectionRatio < 1);
}, {threshold:[1]});
obs.observe(topbar);

// Confirm -> clear and reload
document.getElementById('modalConfirm').onclick = () => {
  localStorage.removeItem('purple_survey_builder');
  location.reload();
};


document.getElementById('btnSave').onclick=()=>{ persist(); toast('Draft saved'); };
document.getElementById('btnPublish').onclick=()=> alert('Publish not wired yet. Use “Export JSON”.');
document.getElementById('btnExport').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(state.meta.title||'survey')+'.json'; a.click();
};
document.getElementById('btnPreview').onclick=preview;
document.getElementById('btnBack').onclick=()=>{ window.location.href = DASHBOARD_URL; };

/* ---------- Settings ---------- */
document.getElementById('assignTo').addEventListener('input',e=>{ state.meta.assignTo=e.target.value; persist(); });
dueDateInput.addEventListener('input',e=>{ state.meta.dueDate=e.target.value; persist(); });
document.getElementById('statusToggle').addEventListener('change',e=>{ state.meta.published=e.target.checked; persist(); });

/* Clickable calendar icon */
if (dateIcon) {
  dateIcon.addEventListener('click', ()=>{
    if (typeof dueDateInput.showPicker === 'function') {
      dueDateInput.showPicker(); // modern browsers
    } else {
      dueDateInput.focus();      // fallback
      dueDateInput.click?.();
    }
  });
}

/* ---------- Helpers ---------- */
function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.position='fixed'; t.style.bottom='16px'; t.style.right='16px';
  t.style.background='rgba(0,0,0,.75)'; t.style.color='#fff'; t.style.padding='10px 12px';
  t.style.borderRadius='10px'; t.style.fontSize='.9rem'; t.style.zIndex='9999';
  document.body.appendChild(t); setTimeout(()=>t.remove(),1600);
}
function preview(){
  const html = `
  <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Preview</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f3fb;margin:0;padding:24px}
    .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:16px;margin-bottom:12px}
    .btn{background:#B57EDC;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600}
    .row{margin-top:6px}
    .dot{display:inline-block;width:12px;height:12px;border:2px solid #c7b4e6;border-radius:999px;margin-right:8px}
    input[type="text"],textarea{width:100%;padding:10px;border:1px solid #e5d9f4;border-radius:10px}
    textarea{min-height:80px}
  </style></head><body>
  ${state.questions.map((q,i)=>`
    <div class="card">
      <div><strong>${i+1}. ${q.text || labelFor(q.type)}</strong></div>
      <div class="row">
      ${
        q.type==='short_answer' ? `<input type="text" placeholder="Your answer">` :
        q.type==='paragraph' ? `<textarea placeholder="Your answer"></textarea>` :
        q.type==='likert' ? Array.from({length:5}).map(()=>`<span class="bi bi-star" style="font-size:22px;color:#c7b4e6;margin-right:6px"></span>`).join('') :
        q.type==='multiple_choice' ? q.options.map(o=>`<div><span class="dot"></span>${escapeHTML(o)}</div>`).join('') : ''
      }
      </div>
    </div>
  `).join('')}
  <button class="btn">Submit</button>
  </body></html>`;
  const w=window.open(); w.document.write(html); w.document.close();
}
function escapeHTML(str=''){return str.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

/* ---------- Init ---------- */
restore();
render();
