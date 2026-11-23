'use strict';
const storageKey='xiaosi-family-feed-v3';
const demoDate='2026-11-19';
const minute=60000, day=1440*minute;
const base=Date.UTC(2026,10,19,17,40);
const unique=()=>crypto.randomUUID();
const outputs={moments:'瞬间',themes:'新增主题',growth:'成长概览',sport:'本周运动',dailySport:'今日运动',progress:'最近的进步',reminder:'提醒'};
const presetDefs=[
  {id:'daily',title:'每日瞬间',type:'moments',frequency:'event'},
  {id:'growth',title:'成长概览',type:'growth',frequency:'weekly',day:'5',time:'20:00'},
  {id:'sport',title:'本周运动',type:'sport',frequency:'weekly',day:'5',time:'19:30'},
  {id:'themes',title:'新增主题',type:'themes',frequency:'event'},
  {id:'progress',title:'最近的进步',type:'progress',frequency:'weekly',day:'5',time:'20:30'}
];
const sampleSports=[
  {id:'sample-daily-steps',type:'dailySport',steps:4860,at:Date.UTC(2026,10,19,15,35)},
  {id:'sample-weekly-steps',type:'sport',at:Date.UTC(2026,10,13,19,45)}
];
function fresh(){
  const cards=todayIds.map(ref=>({id:'m-'+ref,type:'moments',ref,at:Date.parse(demoDate+'T'+moments[ref].time+':00Z')}));
  cards.push(...sampleSports.map(card=>({...card})),{id:'t-explore',type:'themes',ref:'explore',at:Date.UTC(2026,10,19,14,5)},
    {id:'g-week',type:'growth',at:Date.UTC(2026,10,13,20)},
    {id:'m-lunch',type:'moments',ref:'lunch',at:Date.UTC(2026,10,12,12,15)});
  const tasks=presetDefs.slice(0,2).map(t=>({...t,enabled:true}));
  return {clock:base,cards,tasks,sources:{},edits:{},stars:[],topics:[],logs:tasks.map(t=>({id:unique(),taskId:t.id,title:t.title,action:'默认开启',at:base}))};
}
function load(){
  const initial=fresh();
  try{
    const current=JSON.parse(localStorage.getItem(storageKey));
    if(current&&Array.isArray(current.cards)&&Array.isArray(current.tasks)){
      for(const sample of sampleSports){
        if(!current.cards.some(card=>card.id===sample.id))current.cards.push({...sample});
      }
      return current;
    }
    const prev=JSON.parse(localStorage.getItem('xiaosi-workbench-preview-v1'));
    if(prev){
      initial.edits=prev.edits||{};
      for(const t of prev.tasks||[]) if(t.custom || t.type==='reminder'){
        initial.tasks.push({...t,custom:true,prompt:t.prompt||t.title});
        initial.logs.push({id:unique(),taskId:t.id,title:t.title,action:'从上一版演示带入',at:base});
      }
      for(const c of [...(prev.cards||[])].reverse()){
        if(!c.prompt||c.id?.startsWith('seed-'))continue;
        initial.topics.push({id:unique(),key:'legacy-'+c.id,title:c.prompt,at:base,turns:[{q:c.prompt,a:c.message||('已生成'+(outputs[c.type]||'卡片')+'。'),source:'上一版交互稿',at:base}]});
      }
    }
  }catch{}
  return initial;
}
let demo=load();
function saveDemo(){try{localStorage.setItem(storageKey,JSON.stringify(demo));}catch{showToast('浏览器存储已满，本次更改仅在当前页面保留');}}
function stamp(at){return new Date(at).toISOString().slice(0,16);}
function clockDay(){return stamp(demo.clock).slice(0,10);}
function timeAt(at){return stamp(at).slice(11);}
function dateAt(at){return stamp(at).slice(5,10).replace('-','/');}
const cardById=id=>demo.cards.find(c=>c.id===id);
const taskById=id=>demo.tasks.find(t=>t.id===id);
const sortedCards=()=>[...demo.cards].sort((a,b)=>b.at-a.at);
const esc=escapeHtml;
const btn=(action,id,label,cls='')=>`<button class="${cls}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
function textInfo(c){
  if(c.type==='moments'){const m=momentData(c.ref);return {title:m.title,copy:m.copy,cover:m.images[0][0],tag:m.group};}
  if(c.type==='themes'){const t=themes[c.ref];return {title:t.title,copy:t.description,cover:t.cover,tag:'新增主题'};}
  const report=reportData(c);
  if(c.type==='dailySport')return {title:'今天的运动记录',copy:'截至推送时间的累计步数。',tag:'当日累计'};
  if(c.type==='sport')return {title:'这一周，走了多少步？',copy:'七日步数、活动变化和陪伴建议。',tag:'运动周报'};
  if(c.type==='growth')return {title:report.older?'餐桌上的小小发现':'在玩耍中，学会轮流和等待',copy:report.older?'这周，她试着用颜色和形状介绍一顿午饭。':'从轮流传球到等待蜗牛，把这一周的成长连起来看。',cover:report.older?'lunch-detail':'play-pass',tag:'成长周报'};
  if(c.type==='progress')return {title:'这周值得记住的进步',copy:'从具体瞬间回看她如何与同伴合作、独立完成小事。',tag:'进步周报'};
  return {title:c.label||'家庭提醒',copy:c.description||'已到约定的提醒时间。',tag:'家长任务'};
}
let route={page:'home',id:''},galleryIndex=0,historyMode='chats';
const nav=[],unfolded=new Set(),reportOpen=new Set();
let toastTimer,returnFocus,callTimer,callPhase='idle',callStart=0;
const pageNames={home:'家庭动态',moment:'瞬间详情',theme:'主题',favorites:'我的收藏',tasks:'任务',history:'聊天记录',topic:'历史对话',tasklog:'任务记录',report:'周报',reminder:'提醒',calls:'和孩子通话',records:'记录',themes:'主题',moments:'瞬间',profile:'我的',companion:'陪伴'};
function go(page,id='',top=0){
  closeAssistant();closeOverlay(false);
  if(route.page==='calls'&&page!=='calls')stopCall();
  route={page,id};app.dataset.page=page;galleryIndex=0;
  renderHeader();renderView(false);view.scrollTop=top;view.focus({preventScroll:true});
}
function enter(page,id=''){nav.push({...route,top:view.scrollTop,photo:galleryIndex});go(page,id);}
function back(){const r=nav.pop();if(!r){go('home');return;}go(r.page,r.id,r.top);if(r.page==='moment'&&r.photo){galleryIndex=r.photo;renderView();}}
function goHome(){nav.length=0;go('home');}
function renderHeader(){
  const isHome=route.page==='home';
  header.innerHTML=`${actionIcon(isHome?'drawer':'back',isHome?'menu':'back',isHome?'打开侧边栏':'返回')}<h2>${pageNames[route.page]}</h2>
    ${isHome?`<div class="navtools">${actionIcon('call','phone','和孩子通话')}${actionIcon('tasks','clock','定时任务')}</div>`:''}`;
  document.title=(route.page==='report'&&cardById(route.id)?.type==='dailySport'?'今日运动':pageNames[route.page])+' · 小思';
  if(route.page==='report'&&cardById(route.id)?.type==='dailySport')header.querySelector('h2').textContent='今日运动';
}
function renderView(keep=true){
  const previous=view.scrollTop;
  const pages={home:feedView,moment:momentView,theme:themeView,tasks:tasksView,favorites:favoritesView,history:historyView,topic:topicView,tasklog:taskLogView,report:reportView,reminder:reminderView,calls:callsView,records:recordsView,moments:()=>momentRows(Object.keys({...moments,...demo.sources}).reverse()),themes:themesView,
    profile:()=>`<div class="profile">${photo('parent','家长头像')}<h3>演示家长</h3></div>`,
    companion:()=>`<h3>最近的位置记录</h3>${mapTool('青禾公园 · 儿童活动区')}`};
  view.innerHTML=pages[route.page]();
  if(keep)view.scrollTop=previous;
}
function showToast(message){const t=$('#toast');t.textContent=message;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2000);}
function openOverlay(content,label){
  if(overlay.hidden)returnFocus=document.activeElement;
  overlay.innerHTML=`<button class="backdrop" data-action="dismiss" aria-label="关闭${label}" tabindex="-1"></button>${content}`;overlay.hidden=false;frame.inert=true;
  $('[role=dialog]',overlay)?.focus({preventScroll:true});
}
function closeOverlay(restore=true){
  if(overlay.hidden)return;
  stopTaskMic(true);overlay.hidden=true;overlay.innerHTML='';frame.inert=false;
  if(restore)(returnFocus?.isConnected?returnFocus:view).focus({preventScroll:true});
}
function sheet(title,body){openOverlay(`<section class="sheet" tabindex="-1" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2>${actionIcon('dismiss','close','关闭')}</header>${body}</section>`,title);}
function drawer(){
  openOverlay(`<aside class="drawer" tabindex="-1" role="dialog" aria-modal="true" aria-label="侧边栏"><header>${btn('navigate','profile',photo('parent','')+'<span>我的<small>演示家长</small></span>','identity')}${actionIcon('dismiss','close','关闭侧边栏')}</header>
    ${[['history','chat','聊天记录'],['favorites','save','我的收藏'],['companion','heart','陪伴'],['calls','phone','通话'],['records','record','记录']].map(([p,i,t])=>routeButton('navigate',p,i,t)).join('')}
    <button class="reset" data-action="reset">重置演示</button></aside>`,'侧边栏');
}
function groupCards(cards){
  const groups=[],latest=new Map();
  for(const card of cards){
    const key=card.type==='reminder'?'reminder-'+(card.taskId||card.id):card.type;
    const group=latest.get(key);
    if(group && group[0].at-card.at <= 120*minute){group.push(card);}
    else{const next=[card];latest.set(key,next);groups.push(next);}
  }
  return groups;
}
function star(c){
  const saved=demo.stars.includes(c.id);
  return `<button class="star" data-action="star" data-id="${c.id}" aria-label="${saved?'取消收藏':'收藏卡片'}" aria-pressed="${saved}">${icon('save')}</button>`;
}
const isReport=type=>['growth','progress','sport','dailySport'].includes(type);

function previewFiles(c,info){
  if(c.type==='growth'||c.type==='moments')return [info.cover];
  if(c.type!=='themes'&&c.type!=='progress')return [];
  const refs=c.type==='themes'?themes[c.ref].ids:reportData(c).refs;
  const galleries=refs.map(id=>momentData(id).images);
  // Prefer one cover per moment before adding detail shots from those same moments.
  const covers=galleries.flatMap(images=>images.slice(0,1));
  const pictures=[...covers,...galleries.flat()];
  const files=[...new Set(pictures.map(([name])=>name))].slice(0,3);
  if(files.length===3)return files;
  const cover=info.cover||files[0];
  return cover?[cover]:[];
}
function cardLayout(c,files){
  if(!files.length)return 'text';
  if(files.length===3)return 'triptych';
  return c.type==='growth'?'wide':'aside';
}
function summaryMeta(c,info){
  if(c.type==='moments')return info.tag+' · '+momentData(c.ref).images.length+' 张图';
  if(c.type==='themes')return themes[c.ref].ids.length+' 个收录瞬间';
  if(c.type==='growth')return reportPeriod(c);
  if(c.type==='progress')return reportData(c).refs.length+' 条成长记录';
  return '';
}
function cardSummary(c,info,files){
  if(c.type==='sport'||c.type==='dailySport'){
    const daily=c.type==='dailySport';
    const total=daily?c.steps:reportData(c).steps.reduce((sum,n)=>sum+n,0);
    return `<span class="step-summary"><span class="metric-label">${daily?'今日累计':'七日累计'}</span><strong>${total.toLocaleString('en-US')} <i>步</i></strong></span>`;
  }
  const meta=summaryMeta(c,info);
  const images=files.length?`<span class="preview-images">${files.map(file=>photo(file)).join('')}</span>`:'';
  return `<span class="card-summary"><strong>${esc(info.title)}</strong>${meta?`<small>${esc(meta)}</small>`:''}</span>${images}`;
}
function cardHtml(c,stackSize=0){
  const info=textInfo(c),files=previewFiles(c,info);
  const report=isReport(c.type),open=report&&reportOpen.has(c.id);
  const marker={moments:'moment',themes:'theme',reminder:'bell'}[c.type]||'chart';
  const detailLabel=c.type==='dailySport'?'明细':'周报';
  const pushed=stamp(c.at).slice(0,10)===clockDay()?timeAt(c.at):dateAt(c.at)+' '+timeAt(c.at);
  return `<article class="feed-card type-${c.type}" data-layout="${cardLayout(c,files)}" data-card="${c.id}">
    <header><span class="kind">${icon(marker)}${outputs[c.type]}</span>${star(c)}</header>
    <button class="read-card" data-action="open-card" ${report?`aria-expanded="${open}"`:''} data-id="${c.id}">
      ${cardSummary(c,info,files)}
    </button>
    ${open?`<div class="inline-report">${reportBody(c,true)}${btn('read-report',c.id,'查看完整'+detailLabel+' ↗','link')}</div>`:''}
    <footer class="card-foot"><time datetime="${stamp(c.at)}" title="${stamp(c.at).replace('T',' ')} 推送">${pushed}</time>
      ${stackSize?btn('stack',c.id,icon('stack')+`展开 ${stackSize} 张`+icon('down'),'stack-trigger'):''}
      ${report?`<button class="report-toggle" data-action="open-card" data-id="${c.id}" aria-expanded="${open}">${open?'收起':'展开'+detailLabel} ${icon('down')}</button>`:''}
    </footer></article>`;
}
function feedView(){
  let lastDate='';
  // Sort revealed members alongside other card types, keeping each collapsed stack at its newest timestamp.
  const rows=groupCards(sortedCards().filter(c=>!c.hidden)).flatMap(group=>{
    const first=group[0],open=unfolded.has(first.id);
    return (open?group:[first]).map(card=>({card,first,group,open}));
  }).sort((a,b)=>b.card.at-a.card.at);
  const runs=[];
  for(const row of rows){
    const previous=runs.at(-1);
    if(previous&&previous[0].first===row.first&&dateAt(previous[0].card.at)===dateAt(row.card.at))previous.push(row);
    else runs.push([row]);
  }
  return runs.map(run=>{
    const {card,first,group,open}=run[0],multi=group.length>1,date=stamp(card.at).slice(0,10);
    const label=date!==lastDate?`<h3 class="date-line">${date===clockDay()?'今天':dateAt(card.at)}<small>${date===clockDay()?dateAt(card.at)+' · ':''}${weekdayNames[new Date(card.at).getUTCDay()]}</small></h3>`:'';
    lastDate=date;
    return label+`<section class="feed-group ${multi&&!open?'stacked':''}" data-group="${card.id}">${multi&&open&&first===card?btn('stack',first.id,icon('stack')+`${group.length} 张${outputs[first.type]}卡 · 收起`,'collapse-stack'):''}
      ${open?run.map(row=>cardHtml(row.card)).join(''):cardHtml(first,multi?group.length:0)}</section>`;
  }).join('')||'<p class="empty">还没有收到卡片。</p>';
}
function favoritesView(){const cards=demo.stars.map(cardById).filter(Boolean);return cards.length?cards.map(c=>`<div class="saved-entry">${cardHtml(c)}</div>`).join(''):'<p class="empty">还没有收藏。点卡片右上角的书签，就能在这里找到它。</p>';}
function toggleStar(id){
  if(!cardById(id))return;
  const starred=demo.stars.includes(id);
  demo.stars=starred?demo.stars.filter(x=>x!==id):[id,...demo.stars];
  saveDemo();renderView();showToast(starred?'已取消收藏':'已加入我的收藏');
}
function openCard(id,button){const c=cardById(id);if(!c)return;
  if(button?.closest('.feed-card')&&isReport(c.type)){
    if(reportOpen.has(id))reportOpen.delete(id);else reportOpen.add(id);
    renderView();return;
  }
  if(c.type==='moments')enter('moment',c.ref);
  else if(c.type==='themes')enter('theme',c.ref);
  else if(c.type==='reminder')enter('reminder',id);
  else enter('report',id);
}
function reportPeriod(c){return dateAt(c.at-6*day)+' — '+dateAt(c.at);}
function reportData(c){
  const older=c.at<Date.UTC(2026,10,16);
  return {older,steps:older?[4220,5360,4810,5920,4510,6200,5680]:weeklySteps,refs:older?['lunch']:['play','bag','snail']};
}
function sportMini(c){return `<div class="sport-mini"><strong>${reportData(c).steps.reduce((a,b)=>a+b,0).toLocaleString()}<small> 步 / 七天</small></strong><span>${reportData(c).steps.map(n=>`<i style="height:${n/200}px"></i>`).join('')}</span></div>`;}
function reportView(){return reportBody(cardById(route.id));}
function reportBody(c,inline=false){
  const data=reportData(c),info=textInfo(c);
  const head=inline?'':`<div class="report-header"><small>${outputs[c.type]}　/　${reportPeriod(c)}</small><h3>${esc(info.title)}</h3>${star(c)}</div>`;
  if(c.type==='dailySport')return `<div class="block">${inline?'':'<h3>今日运动</h3>'}<h4>截至 ${timeAt(c.at)} 的运动记录</h4><p>当日累计 ${c.steps.toLocaleString('en-US')} 步。</p><h4>活动时段</h4><p>上午 ${Math.round(c.steps*.42).toLocaleString('en-US')} 步 · 午后 ${(c.steps-Math.round(c.steps*.42)).toLocaleString('en-US')} 步</p></div>`;
  if(c.type==='sport')return head+(inline?'':sportMini(c))+`<div class="block"><h4>每日步数</h4><div class="step-chart">${data.steps.map((n,i)=>btn('step',String(i),`<i style="height:${n/110}px"></i><small>${dateAt(c.at-(6-i)*day).slice(-2)}日</small>`)).join('')}</div><p class="step-readout" aria-live="polite">${dateAt(c.at)}　${data.steps[6].toLocaleString()} 步</p><h4>七日热量预估</h4><p>约 1,320 千卡 · 示例估算</p><h4>陪伴建议</h4><p>挑一天一起散步，让孩子决定路线和休息的时机。</p></div>`;
  return head+`${info.cover&&!inline?photo(info.cover,'','report-cover'):''}<div class="block"><p>${esc(info.copy)}</p><h4>${c.type==='progress'?'本周的进步记录':'这一周的瞬间'}</h4>${momentRows(data.refs)}${c.type==='progress'&&!data.older?'<h4>更早的进步</h4>'+momentRow('lunch'):''}</div>`;
}
function reminderView(){const c=cardById(route.id);return `<div class="block">${star(c)}<h3>${esc(c.label)}</h3><p>${esc(textInfo(c).copy)}</p><small>${dateAt(c.at)}　${timeAt(c.at)}</small></div>`;}
function recordsView(){return routeButton('navigate','moments','moment','瞬间记录')+routeButton('navigate','themes','theme','全部主题');}
function scheduleText(t){
  if(t.frequency==='event')return t.type==='themes'?'新主题收录时推送':'每个瞬间生成时推送';
  if(t.frequency==='weekly')return `每${weekdayNames[Number(t.day)]} ${t.time}`;
  if(t.frequency==='daily')return '每天 '+t.time;
  return `${t.date} ${t.time} · 仅一次`;
}
function logTask(t,action,cardId=''){demo.logs.unshift({id:unique(),taskId:t.id,title:t.title,action,at:demo.clock,cardId,rule:scheduleText(t)});}
function taskRow(t){
  return `<article class="task" data-task="${t.id}"><header>${icon(t.frequency==='event'?'moment':'clock')}<div><strong>${esc(t.title)}</strong><small>${esc(scheduleText(t))}${t.completed?' · 已完成':''}</small></div>
    <button class="switch" role="switch" aria-checked="${t.enabled}" data-action="toggle-task" data-id="${t.id}" aria-label="启用${esc(t.title)}" ${t.completed?'disabled':''}></button></header>
    <footer>${t.custom||t.frequency!=='event'?btn('edit-task',t.id,t.custom?'编辑任务':'修改时间','link'):'<small>实时更新</small>'}
    <button class="link" data-action="fire" data-id="${t.id}" ${t.enabled?'':'disabled'}>${t.frequency==='event'?'模拟生成':'模拟到点'}</button></footer></article>`;
}
function tasksView(){
  const available=presetDefs.filter(p=>!taskById(p.id));
  return `<h3 class="section-label">已添加的任务</h3>${demo.tasks.map(taskRow).join('')}
    ${available.length?`<h3 class="section-label">可添加的预设</h3>${available.map(t=>`<article class="preset"><div><strong>${t.title}</strong><small>${scheduleText(t)}</small></div>${btn('add-preset',t.id,'＋ 添加','outline')}</article>`).join('')}`:''}
    <button class="fab" data-action="new-task" aria-label="新建自定义任务">＋</button>`;
}
function addPreset(id){
  const def=presetDefs.find(p=>p.id===id);if(!def||taskById(id))return;
  const task={...def,enabled:true};demo.tasks.push(task);logTask(task,'添加预设');saveDemo();renderView();showToast('已添加'+task.title);
}
function editTask(id){
  const t=taskById(id);if(t.custom){customTask(id);return;}
  sheet('修改推送时间',`<form id="preset-form" data-id="${id}" class="form"><label>每周哪天<select name="day">${optionsFrom(weekdayNames,t.day)}</select></label><label>时间<input type="time" required name="time" value="${t.time}"></label><button class="primary">保存设置</button></form>`);
}
function nextTime(t){
  if(t.frequency==='event')return demo.clock+minute;
  const now=new Date(demo.clock),[hour,min]=t.time.split(':').map(Number);
  let target=t.frequency==='once'?Date.parse(t.date+'T'+t.time+':00Z'):Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),hour,min);
  if(t.frequency==='weekly')target+=((Number(t.day)-now.getUTCDay()+7)%7)*day;
  if(t.frequency!=='once'&&target<=demo.clock)target+=(t.frequency==='weekly'?7:1)*day;
  return Math.max(target,demo.clock+minute);
}
function deliver(type,at,task=null){
  const c={id:unique(),type,at,taskId:task?.id||''};
  if(type==='moments'){
    const examples=['chalk','play','leaf','snail','bag'],ref=examples[Object.keys(demo.sources).length%examples.length];
    c.ref='s-'+c.id;
    demo.sources[c.ref]={...moments[ref],baseRef:ref,time:timeAt(at),date:`${new Date(at).getUTCMonth()+1} 月 ${new Date(at).getUTCDate()} 日`};
  }
  if(type==='themes'){const ids=Object.keys(themes);c.ref=ids[demo.cards.filter(c=>c.type==='themes').length%ids.length];}
  if(type==='dailySport')c.steps=weeklySteps.at(-1);
  if(type==='reminder'){c.label=task?.prompt||task?.title||'家庭提醒';c.description='按约定的时间送达这张提醒卡。';}
  demo.cards.unshift(c);return c;
}
function fireTask(id){
  const task=taskById(id);if(!task?.enabled ||task.completed)return;
  demo.clock=nextTime(task);
  const c=deliver(task.type,demo.clock,task);
  if(task.frequency==='once'){task.enabled=false;task.completed=true;}
  logTask(task,'推送卡片',c.id);saveDemo();goHome();showToast('新卡片已送达');
}
function callsView(){
  const elapsed=Math.max(0,Math.floor((Date.now()-callStart)/1000));
  return `<div class="call-view"><div class="call-icon">${icon('phone')}</div><small>模拟通话</small><h3>孩子的手表</h3><p aria-live="polite">${callPhase==='dial'?'正在呼叫…':callPhase==='connected'?'通话中　'+String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0'):'通话已结束'}</p>
    ${callPhase==='idle'?btn('call','','再次呼叫','primary'):btn('hangup','','挂断','hangup')}</div>`;
}
function stopCall(){clearInterval(callTimer);callPhase='idle';}
function startCall(){
  if(route.page!=='calls') enter('calls');
  stopCall();callPhase='dial';callStart=Date.now();renderView();
  callTimer=setInterval(()=>{if(callPhase==='dial'&&Date.now()-callStart>1100){callPhase='connected';callStart=Date.now();}if(route.page==='calls')renderView();},500);
}
function historyView(){
  const tabs=`<div class="tabs">${[['chats','历史聊天'],['tasks','历史任务']].map(([id,t])=>`<button data-action="history-mode" data-id="${id}" aria-pressed="${historyMode===id}">${t}</button>`).join('')}</div>`;
  if(historyMode==='chats')return tabs+([...demo.topics].sort((a,b)=>b.at-a.at).map(t=>routeButton('topic',t.id,'chat',t.title,`${t.turns.length} 轮 · ${t.turns.at(-1)?.q}`)).join('')||'<p class="empty">问过小思后，这里会按话题保存对话。</p>');
  const latest=new Map();for(const l of demo.logs){if(!latest.has(l.taskId))latest.set(l.taskId,l);}
  return tabs+[...latest.values()].map(l=>routeButton('tasklog',l.taskId,'clock',l.title,`${l.action} · ${dateAt(l.at)} ${timeAt(l.at)}`)).join('');
}
function topicView(){
  const t=demo.topics.find(t=>t.id===route.id);
  return `<h3 class="topic-heading">${esc(t.title)}</h3><div class="transcript">${t.turns.map(turn=>`<div class="question">${esc(turn.q)}</div><div class="reply"><small>小思</small><p>${esc(turn.a)}</p>${turn.place?mapTool(turn.place):''}${turn.cardId?btn('open-card',turn.cardId,'查看生成的卡片','link'):''}<small>${esc(turn.source)}</small></div>`).join('')}</div>`;
}
function taskLogView(){
  const task=taskById(route.id);
  return `<h3 class="topic-heading">${esc(task?.title||'历史任务')}</h3>${demo.logs.filter(l=>l.taskId===route.id).map(l=>`<section class="log"><small>${dateAt(l.at)}　${timeAt(l.at)}</small><h4>${esc(l.action)}</h4><p>${esc(l.rule||scheduleText(task))}</p>${l.cardId?btn('open-card',l.cardId,'查看这次推送的卡片','link'):''}</section>`).join('')}`;
}
const places={
  play:'青禾公园 · 儿童活动区',chalk:'青禾公园 · 儿童活动区',
  snail:'青禾公园 · 东侧步道',leaf:'青禾公园 · 林间小径'
};
function mapTool(place){
  const [x,y]=place.includes('东侧')?[224,47]:place.includes('林间')?[91,48]:[181,72];
  return `<figure class="map-tool" aria-label="${esc(place)}示意地图"><svg viewBox="0 0 300 124" role="img" aria-label="公园内的位置">
    <rect width="300" height="124" fill="#e8e5dc"/><path d="M20 10L83 5l22 34-19 43-67-4zM145 0l129 6 1 29-44 19-91-7z" fill="#ccd3ba"/>
    <path d="M0 111Q51 78 87 87T161 118" fill="none" stroke="#b8cfd6" stroke-width="15"/>
    <path d="M-10 62Q39 27 90 43T189 58Q247 18 315 35M117 -9Q101 49 139 77T228 136" fill="none" stroke="#fffaf0" stroke-width="9"/>
    <rect x="156" y="68" width="67" height="35" rx="15" fill="#ddc4a9"/><rect x="162" y="74" width="54" height="23" rx="10" fill="none" stroke="#f6eadb"/>
    <g transform="translate(${x} ${y})"><circle r="14" fill="#dc51382c"/><circle r="6" fill="#b8382b" stroke="white" stroke-width="2"/></g></svg><figcaption>${icon('location')}${esc(place)}<small>示意图</small></figcaption></figure>`;
}
function contextHere(){
  const visibleReport=[...view.querySelectorAll('.inline-report')].find(n=>{const rect=n.getBoundingClientRect(),v=view.getBoundingClientRect();return rect.bottom>v.top+30&&rect.top<v.bottom-30;});
  if(visibleReport){const card=cardById(visibleReport.closest('[data-card]').dataset.card);return {kind:card.type,ref:card.id,title:outputs[card.type]};}
  if(route.page==='moment')return {kind:'moment',ref:route.id,title:momentData(route.id).title};
  if(route.page==='theme')return {kind:'theme',ref:route.id,title:themes[route.id].title};
  if(route.page==='report'||route.page==='reminder'){const c=cardById(route.id);return {kind:c.type,ref:c.id,title:outputs[c.type]};}
  return {kind:route.page,ref:route.id,title:pageNames[route.page]};
}
function suggestionsFor(ctx,answered=false){
  if(ctx.kind==='moment'){
    const m=momentData(ctx.ref),ref=m.baseRef||ctx.ref;
    if(ref==='play')return answered?['他们是在哪玩的？','和谁玩了多久？']:['和哪些小朋友玩？玩了多久？','他们是在哪玩的？'];
    return ['这个瞬间发生了什么？',places[ref]?'这是在哪里？':'我可以怎么陪伴？'];
  }
  if(ctx.kind==='theme')return ['这里收录了哪些瞬间？','这个主题讲了什么？'];
  if(ctx.kind==='tasks'||ctx.kind==='tasklog')return ['现在有哪些任务？','帮我提醒孩子整理书包'];
  if(ctx.kind==='favorites')return ['我收藏了哪些卡片？','给我一张本周运动卡'];
  if(ctx.kind==='dailySport')return ['今天走了多少步？'];
  if(ctx.kind==='sport')return ['这周走了多少步？','哪天走得最多？'];
  if(ctx.kind==='growth'||ctx.kind==='progress')return ['这周有哪些进步？','相关瞬间有哪些？'];
  if(ctx.kind==='calls')return ['现在通话是什么状态？','帮我提醒孩子整理书包'];
  if(ctx.kind==='topic'||ctx.kind==='history')return ['最近聊了什么？','给我一张本周运动卡'];
  return ['最近有哪些瞬间？','给我一张本周运动卡','帮我提醒孩子整理书包'];
}
function findAnswer(q,ctx){
  const result=(a,source,extra={})=>({a,source,...extra});
  if(/提醒|创建任务/.test(q))return result('可以。打开任务设置，确认提醒内容、时间和频率后就会加入任务列表。','任务设置',{configure:q});
  if(/(生成|做|给我|推送).*(运动|进步|成长).*(卡|报)/.test(q)){
    demo.clock+=minute;const type=/运动/.test(q)?identifyRequest(q):/进步/.test(q)?'progress':'growth';
    const card=deliver(type,demo.clock);
    return result('已经把「'+outputs[type]+'」卡送到家庭动态。','生成卡片 · 演示',{cardId:card.id});
  }
  if(ctx.kind==='moment'){
    const m=momentData(ctx.ref),ref=m.baseRef||ctx.ref;
    if(/哪儿|在哪|哪里|地点|位置|地图/.test(q)){
      const place=places[ref];return place?result('记录的位置是'+place.replace(' · ','的')+'。','查阅该瞬间的位置记录',{place}):result('这条瞬间没有记录地点。','该瞬间的位置记录');
    }
    if(/谁|哪些小朋友|名字|多久|多长|几分钟/.test(q)){
      if(m.activity){
        const end=m.time, endMinutes=Number(end.slice(0,2))*60+Number(end.slice(3)),start=(endMinutes-m.activity.minutes+1440)%1440;
        const from=String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0');
        return result(`她和${m.activity.companions.join('、')}一起传球，从 ${from} 到 ${end}，一共 ${m.activity.minutes} 分钟。`,'同行记录与活动起止时间 · 演示');
      }
      return result('这条瞬间没有足够的同行人和时长记录。'+m.copy,'查阅当前瞬间');
    }
    if(/建议|陪伴|引导/.test(q))return result(m.advice,'该瞬间的陪伴建议');
    if(/瞬间|什么|发生|说说|讲讲/.test(q))return result(m.copy,'当前瞬间配文');
  }
  if(ctx.kind==='theme'){const t=themes[ctx.ref];return result(/哪些|收录/.test(q)?t.ids.map(id=>'「'+momentData(id).title+'」').join('、')+'，共 '+t.ids.length+' 个瞬间。':t.description,'当前主题的收录记录');}
  if(ctx.kind==='dailySport'){
    const c=cardById(ctx.ref);return result('截至 '+timeAt(c.at)+'，今天累计走了 '+c.steps.toLocaleString('en-US')+' 步。','今日运动记录');
  }
  if(ctx.kind==='sport'||/步数|走了多少/.test(q)){
    const c=cardById(ctx.ref)||{at:demo.clock},steps=reportData(c).steps;
    const max=Math.max(...steps),at=c.at-(6-steps.indexOf(max))*day;
    return result(/最多/.test(q)?dateAt(at)+' 走得最多，共 '+max.toLocaleString()+' 步。':'近七天共 '+steps.reduce((a,b)=>a+b,0).toLocaleString()+' 步。','查阅七日步数记录');
  }
  if(['growth','progress'].includes(ctx.kind)){const c=cardById(ctx.ref);return result(textInfo(c).copy+' 对应的记录有'+reportData(c).refs.map(id=>'「'+momentData(id).title+'」').join('、')+'。','周报关联瞬间');}
  if(/任务/.test(q))return result('已开启的任务有：'+(demo.tasks.filter(t=>t.enabled).map(t=>t.title+'（'+scheduleText(t)+'）').join('、')||'暂无')+'。','查阅任务列表');
  if(/收藏/.test(q))return result(demo.stars.length?'收藏里有'+demo.stars.map(id=>'「'+textInfo(cardById(id)).title+'」').join('、')+'。':'收藏夹还是空的。点卡片右上角的书签就能收好它。','查阅我的收藏');
  if(/聊了什么|聊天记录/.test(q))return result(demo.topics.length?'最近的话题是「'+[...demo.topics].sort((a,b)=>b.at-a.at)[0].title+'」。':'还没有已保存的话题。','查看话题记录');
  if(/通话/.test(q))return result(callPhase==='connected'?'当前演示通话已接通。':callPhase==='dial'?'正在呼叫孩子的手表。':'当前没有进行中的通话。','当前通话状态');
  if(/瞬间|最近发生/.test(q))return result('最新的三条记录是'+sortedCards().filter(c=>c.type==='moments').slice(0,3).map(c=>'「'+textInfo(c).title+'」').join('、')+'。','检索看板瞬间');
  return result('现有演示记录无法确认这一点。可以点下方的问题，围绕当前页面继续问。','查阅当前页面');
}
let resetVersion=0;
let session=null,hold=null,swipe=null,ignoreGalleryClick=0,suppressOrbClick=false;
function openAssistant(){
  if(session)return;
  const ctx=contextHere();
  session={ctx,turn:null,busy:false,topicId:null};
  frame.inert=true;if(!overlay.hidden)overlay.inert=true;
  agent.hidden=false;app.classList.add('asking');orb.setAttribute('aria-expanded','true');drawAnswer();
  $('.answer-panel',agent).focus({preventScroll:true});
}
function closeAssistant(){
  if(!session)return;
  session=null;agent.hidden=true;agent.innerHTML='';overlay.inert=false;
  frame.inert=!overlay.hidden;app.classList.remove('asking');orb.setAttribute('aria-expanded','false');
  if(route.page==='history'||route.page==='home')renderView();
  orb.focus({preventScroll:true});
}
function drawAnswer(){
  if(!session)return;
  const {ctx,turn,busy}=session;
  const suggestions=suggestionsFor(ctx,Boolean(turn));
  agent.innerHTML=`<button class="agent-mask" data-action="end-agent" aria-label="结束提问" tabindex="-1"></button>
    <section class="answer-panel" role="dialog" aria-modal="true" aria-label="问小思" tabindex="-1">
      <header><span class="agent-name"><i></i> 小思</span><small>${esc(ctx.title)}</small>${actionIcon('end-agent','close','收起回答')}</header>
      <div class="answer-body" aria-live="polite">${busy?'<p class="searching"><i></i> 正在查阅相关记录…</p>':turn?`<p class="direct-answer">${esc(turn.a)}</p>${turn.place?mapTool(turn.place):''}<small class="source">${esc(turn.source)}</small>
        ${turn.cardId?btn('show-result',turn.cardId,'查看卡片 ↗','link'):''}${turn.configure?btn('configure-agent','', '设置提醒 ↗','link'):''}`:'<p class="direct-answer">想了解什么？</p>'}</div>
      <div class="question-chips">${suggestions.map(q=>`<button data-action="ask" data-id="${esc(q)}" ${busy?'disabled':''}>${esc(q)}</button>`).join('')}</div>
      <form id="ask-form" class="ask-form"><input maxlength="180" name="q" placeholder="${turn?'继续追问…':'问问小思…'}" autocomplete="off" aria-label="输入问题" ${busy?'disabled':''}><button aria-label="发送问题" ${busy?'disabled':''}>↑</button></form>
    </section>`;
}
function ask(q){
  q=q.trim();if(!q)return;openAssistant();
  const current=session,version=resetVersion;if(current.busy)return;
  current.busy=true;drawAnswer();
  setTimeout(()=>{
    if(version!==resetVersion)return;
    const result=findAnswer(q,current.ctx),turn={q,...result,at:demo.clock};
    const topicKey=current.ctx.kind+':'+current.ctx.ref+(['home','tasks','favorites','history'].includes(current.ctx.kind)?':'+q:'');
    let topic=demo.topics.find(t=>t.id===current.topicId)||demo.topics.find(t=>t.key===topicKey);
    if(!topic){
      const title=current.ctx.kind==='moment'||current.ctx.kind==='theme'?current.ctx.title:q;
      topic={id:unique(),key:topicKey,title,turns:[],at:demo.clock};
      demo.topics.unshift(topic);
    }
    topic.turns.push(turn);topic.at=demo.clock;current.topicId=topic.id;current.turn=turn;current.busy=false;saveDemo();
    if(session===current)drawAnswer();
    else if(route.page==='home'||route.page==='history'||route.page==='topic')renderView();
  },460);
}
function endHold(send){
  if(!hold)return;
  const finished=hold;hold=null;clearTimeout(finished.timer);
  $('#orb-hint').hidden=true;orb.classList.remove('holding');
  if(!finished.long)return;
  suppressOrbClick=true;
  if(send&&!finished.cancel){
    openAssistant();ask(suggestionsFor(session.ctx,Boolean(session.turn))[0]);
  }
  setTimeout(()=>{suppressOrbClick=false;},400);
}
orb.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0)return;
  suppressOrbClick=false;orb.setPointerCapture(e.pointerId);
  hold={id:e.pointerId,y:e.clientY,cancel:false,long:false};
  hold.timer=setTimeout(()=>{if(!hold)return;hold.long=true;orb.classList.add('holding');
    $('#orb-hint').textContent='松开发送示例 · 上滑取消';$('#orb-hint').hidden=false;
  },280);
});
orb.addEventListener('pointermove',e=>{if(!hold?.long)return;hold.cancel=hold.y-e.clientY>55;$('#orb-hint').textContent=hold.cancel?'松开取消':'松开发送示例 · 上滑取消';});
orb.addEventListener('pointerup',()=>endHold(true));
orb.addEventListener('pointercancel',()=>endHold(false));
orb.addEventListener('contextmenu',e=>e.preventDefault());
orb.addEventListener('touchend',e=>{if(hold?.long||suppressOrbClick)e.preventDefault();},{passive:false});
orb.addEventListener('click',()=>{if(!suppressOrbClick){if(session)closeAssistant();else openAssistant();}});
view.addEventListener('pointerdown',e=>{if(e.target.closest('.full-picture'))swipe={x:e.clientX,y:e.clientY};});
view.addEventListener('pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.5){ignoreGalleryClick=performance.now()+350;selectPhoto(galleryIndex+(dx<0?1:-1));}});
view.addEventListener('pointercancel',()=>{swipe=null;});
function scene(id){
  goHome();
  if(id==='tasks'){enter('tasks');return;}
  if(id==='ask'){enter('moment','play');openAssistant();return;}
  if(id==='growth'){
    view.querySelector('.type-growth')?.scrollIntoView({block:'start'});
    return;
  }
  const group=groupCards(sortedCards()).find(group=>group.some(c=>c.id==='m-play'));
  if(group){unfolded.add(group[0].id);renderView();view.querySelector(`[data-group="${group[0].id}"]`)?.scrollIntoView({block:'start'});}
}
const actions={
  scene,drawer,back,dismiss:()=>closeOverlay(),tasks:()=>enter('tasks'),call:startCall,hangup:()=>{stopCall();renderView();},
  navigate:id=>{closeOverlay(false);if(id==='calls')startCall();else enter(id);},
  star:toggleStar,stack:id=>{const group=view.querySelector(`[data-group="${id}"]`);
    const offset=group?.getBoundingClientRect().top-view.getBoundingClientRect().top;
    if(unfolded.has(id))unfolded.delete(id);else unfolded.add(id);renderView();
    if(offset<0)view.querySelector(`[data-group="${id}"]`)?.scrollIntoView({block:'start'});
  },
  'read-report':id=>enter('report',id),'open-card':openCard,'open-moment':id=>enter('moment',id),'open-theme':id=>enter('theme',id),
  'full-image':()=>{if(performance.now()>ignoreGalleryClick)openGallery();},'photo-select':selectPhoto,
  'photo-prev':()=>selectPhoto(galleryIndex-1),'photo-next':()=>selectPhoto(galleryIndex+1),'edit-moment':editMoment,
  'new-task':()=>customTask(),'edit-task':editTask,'add-preset':addPreset,fire:fireTask,
  'toggle-task':id=>{const t=taskById(id);if(t.completed)return;t.enabled=!t.enabled;logTask(t,t.enabled?'开启任务':'暂停任务');saveDemo();renderView();},
  'task-mic':toggleTaskMic,'task-example':sampleTask,ask,'end-agent':closeAssistant,
  'configure-agent':()=>{const prompt=session.turn.configure;closeAssistant();if(route.page!=='tasks')enter('tasks');customTask();const f=$('#custom-task-form');f.elements.prompt.value=prompt;applyPrompt(f);},
  'show-result':id=>{closeAssistant();openCard(id);},
  'history-mode':id=>{historyMode=id;renderView();},topic:id=>enter('topic',id),tasklog:id=>enter('tasklog',id),
  step:(id,b)=>{const c=cardById(b.closest('[data-card]')?.dataset.card||route.id),block=b.closest('.block');$('.step-chart',block).querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('.step-readout',block).textContent=dateAt(c.at-(6-Number(id))*day)+'　'+reportData(c).steps[id].toLocaleString()+' 步';},
  reset:()=>{resetVersion++;closeAssistant();demo=fresh();saveDemo();unfolded.clear();reportOpen.clear();historyMode='chats';goHome();showToast('已重置演示');}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)actions[b.dataset.action]?.(b.dataset.id,b);});
document.addEventListener('change',e=>{if(e.target.name==='frequency'&&e.target.form?.id==='custom-task-form')syncFrequency(e.target.form);});
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(f.id==='ask-form')ask(f.elements.q.value);
  if(f.id==='edit-moment-form')saveMoment(f);
  if(f.id==='custom-task-form')saveCustomTask(f);
  if(f.id==='preset-form'){const t=taskById(f.dataset.id);t.day=f.elements.day.value;t.time=f.elements.time.value;logTask(t,'修改时间');saveDemo();closeOverlay(false);renderView();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(session)closeAssistant();else if(!overlay.hidden)closeOverlay();else if(nav.length)back();return;}
  if(!session&&route.page==='moment'&&(overlay.hidden||$('.gallery-dialog',overlay))&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();selectPhoto(galleryIndex+(e.key==='ArrowLeft'?-1:1));}
  const layer=session?agent:!overlay.hidden?overlay:null;
  if(e.key==='Tab'&&layer){const focusable=[...$('[role=dialog]',layer).querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select:not(:disabled)')].filter(n=>!n.closest('[hidden]'));
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1),active=document.activeElement;
    if(e.shiftKey&&(active===first||!focusable.includes(active))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
  }
});
go('home');
