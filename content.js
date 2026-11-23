'use strict';
const $=(selector,root=document)=>root.querySelector(selector);
const app=$('#app'),frame=$('#frame'),view=$('#view'),header=$('#header');
const overlay=$('#overlay'),agent=$('#agent'),orb=$('#orb');
const icon = (name, extra = '') =>
  `<svg aria-hidden="true" class="${extra}"><use href="#i-${name}"/></svg>`;
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
const tile = (name, tone = '') => `<span class="tile ${tone}">${icon(name)}</span>`;
const routeButton = (action, id, name, title, sub = '', tone = '') => `
  <button type="button" class="item" data-action="${action}" data-id="${id}">
    ${tile(name, tone)}
    <span><strong>${escapeHtml(title)}</strong>${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</span>
    ${icon('next', 'chevron')}
  </button>`;
const actionIcon = (action, name, label, id = '', buttonClass = 'icon-button') => `
  <button type="button" class="${buttonClass}" data-action="${action}" data-id="${id}" aria-label="${label}" title="${label}">
    ${icon(name)}
  </button>`;

const moments = {
  snail:{title:'等一只蜗牛慢慢过路',date:'11 月 19 日',time:'16:30',group:'自然观察',copy:'在青禾公园的步道上，她蹲下来，看着小蜗牛慢慢爬过一片落叶。等到它钻进草丛，才起身继续走。',advice:'可以和她再走一次这条小路，问问她，上次是怎样发现蜗牛的。',images:[['snail-wide','步道上的相遇'],['snail-detail','落叶旁的蜗牛'],['snail','蹲下来等一等']]},
  leaf:{title:'捡起三片不一样的秋天',date:'11 月 19 日',time:'15:42',group:'自然观察',copy:'她把沿路捡到的三片叶子摆在本子上，先比较形状，又沿着叶脉慢慢描了一遍。',advice:'让她挑一片最特别的叶子，说说自己用了哪些线索分辨它。',images:[['leaves','把秋天装进本子'],['leaves-detail','三片叶子的纹路']]},
  bag:{title:'出门前，自己整理好书包',date:'11 月 19 日',time:'08:12',group:'生活小习惯',copy:'出门前主动检查了课本、水杯和作业，把第二天要交的纸放进透明文件袋。',advice:'下次让她自己决定检查的顺序，收好后一起回顾哪一步最管用。',images:[['backpack','出门前的准备'],['backpack-detail','书包里的物品']]},
  lunch:{title:'午饭里的小发现',date:'11 月 12 日',time:'12:15',group:'餐桌上的发现',copy:'她数了数盘子里的颜色，发现西蓝花像一棵小树，还为家人介绍了今天的午餐。',advice:'下次盛饭时，可以邀请她给两种食材取个形状相近的小名。',images:[['lunch','一起吃午餐'],['lunch-detail','餐桌上的颜色']]}
};
Object.assign(moments,{
  play:{activity:{companions:['小禾','豆豆'],minutes:27},title:'和小伙伴玩了一场传球',date:'11 月 19 日',time:'17:32',group:'一起玩耍',copy:'小禾把球轻轻推过来，她接住，再传给豆豆。三个人在公园里轮流传球，直到约好的回家时间。',advice:'可以问问她，哪一次传球配合得最好？让她自己讲讲当时是怎么做的。',images:[['play','树荫下的传球'],['play-pass','轮到我接球']]},
  chalk:{title:'给大家画了一条跳格子路线',date:'11 月 19 日',time:'16:55',group:'一起玩耍',copy:'她和小伙伴用粉笔画出方格，商量好从哪里出发，然后轮流试走了一遍。',advice:'下次请她给新朋友讲一遍规则，听听她会怎么介绍。',images:[['chalk','一起画路线'],['chalk-step','跳进下一格']]}
});
const todayIds=['play','chalk','snail','leaf','bag'];
const themes = {
  explore:{title:'自然观察',ids:['snail','leaf'],cover:'snail-wide',isNew:true,origin:'小思整理',description:'从路过一只蜗牛，到认真比较一片叶子，收下散步时停下来的那些片刻。'},
  routine:{title:'生活小习惯',ids:['bag'],cover:'backpack',isNew:true,origin:'家长收藏',description:'记录孩子开始自己动手、记住顺序、完成日常小事的时刻。'},
  table:{title:'餐桌上的发现',ids:['lunch'],cover:'lunch',isNew:false,origin:'家长收藏',description:'在家常饭菜里，看看孩子发现了哪些新鲜事。'}
};
const imageUrl = name => 'assets/' + name + '.jpg';
const photo = (name, alt = '', cls = '') => `<img class="${cls}" src="${imageUrl(name)}" alt="${escapeHtml(alt)}" draggable="false">`;
const momentData = id => ({...(demo.sources[id] || moments[id]), ...demo.edits[id]});
const weeklySteps = [4720,6830,5930,5110,7620,5520,6420];


const weekdayNames = ['周日','周一','周二','周三','周四','周五','周六'];
function momentRow(id) {
  const entry = momentData(id);
  return `<button class="album-row" data-action="open-moment" data-id="${id}">${photo(entry.images[0][0],'')}
    <span><small>${entry.date}　${entry.time}</small><strong>${escapeHtml(entry.title)}</strong><em>${entry.group} · ${entry.images.length} 张图</em></span>${icon('next','chevron')}</button>`;
}
function momentRows(ids) {return `<div class="album-list">${ids.map(momentRow).join('')}</div>`;}
function momentsView() {return momentRows(todayIds);}
function themeRows(weekly) {
  return `<div class="album-list">${Object.entries(themes).filter(([,t])=>!weekly || t.isNew).map(([id,t])=>`<button class="album-row theme-row" data-action="open-theme" data-id="${id}">
    ${photo(t.cover,'')}<span><small>${t.origin}</small><strong>${t.title}</strong><em>${t.ids.length} 个瞬间${t.isNew?' · 本周新增':''}</em></span>${icon('next','chevron')}</button>`).join('')}</div>`;
}
function themesView(){return themeRows(false);}
function themeView(){
  const t=themes[route.id];
  return `<article class="theme-hero">${photo(t.cover,t.title)}<div><small>${t.origin}　·　${t.ids.length} 个瞬间</small><h3>${t.title}</h3><p>${t.description}</p></div></article>
    <h3 class="section-title spaced">成长足迹</h3>${momentRows(t.ids)}`;
}
function momentView() {
  const m=momentData(route.id);
  const [file,caption]=m.images[galleryIndex];
  return `<article class="story">
    <div class="viewer ${['snail-wide','play','chalk'].includes(m.images[0][0])?'':'portrait-collection'}" tabindex="0" role="group" aria-label="瞬间图集，左右键翻页"><button class="full-picture" aria-label="放大查看${caption}" data-action="full-image">${photo(file,caption,'large-picture')}</button>
      <span class="page-count">${galleryIndex+1} / ${m.images.length}</span>
      <button class="prev" aria-label="上一张" data-action="photo-prev" ${galleryIndex===0?'disabled':''}>‹</button>
      <button class="next" aria-label="下一张" data-action="photo-next" ${galleryIndex===m.images.length-1?'disabled':''}>›</button></div>
    <div class="thumbs">${m.images.map(([file,caption],i)=>`<button aria-pressed="${galleryIndex===i}" aria-label="第${i+1}张，${caption}" data-action="photo-select" data-id="${i}">${photo(file,caption)}</button>`).join('')}<small>${caption}</small></div>
    <div class="story-copy"><small>${m.date}　${m.time}　/　${m.group}</small><h3>${escapeHtml(m.title)}</h3>
    <p>${escapeHtml(m.copy)}</p><button class="edit-caption" data-action="edit-moment">家长编辑</button></div>
    <aside class="ai-note"><strong>${icon('spark')}小思的陪伴建议</strong><p>${m.advice}</p></aside></article>`;
}
function selectPhoto(index) {
  if(route.page!=='moment') return;
  const max=momentData(route.id).images.length-1;
  const next=Math.min(max,Math.max(0,Number(index)));
  if(next===galleryIndex) return;
  galleryIndex=next;
  renderView();
  if(!overlay.hidden && $('.gallery-dialog',overlay)) openGallery();
  else $('.viewer',view).focus({preventScroll:true});
}
function openGallery() {
  const images=momentData(route.id).images;
  const [file,caption]=images[galleryIndex];
  openOverlay(`<section class="gallery-dialog" role="dialog" aria-modal="true" aria-label="查看原图" tabindex="-1">
    <header><small>${galleryIndex+1} / ${images.length}</small>${actionIcon('dismiss','close','关闭原图')}</header>
    <div class="lightbox-view">${photo(file,caption)}</div>
    <footer><button data-action="photo-prev" ${galleryIndex===0?'disabled':''}>上一张</button><span>${caption}</span><button data-action="photo-next" ${galleryIndex===images.length-1?'disabled':''}>下一张</button></footer>
  </section>`,'查看原图');
}
function editMoment() {
  const m=momentData(route.id);
  sheet('家长编辑',`<form id="edit-moment-form" class="form"><label>瞬间标题<input name="title" required maxlength="52" value="${escapeHtml(m.title)}"></label>
    <label>瞬间配文<textarea name="copy" required maxlength="600" rows="5">${escapeHtml(m.copy)}</textarea></label>
    <div class="form-row"><button type="button" class="outline" data-action="dismiss">取消</button><button class="primary">保存修改</button></div></form>`);
}
function saveMoment(form) {
  const title=form.elements.title.value.trim(),copy=form.elements.copy.value.trim();
  if(!title||!copy){showToast('请填写标题和配文');return;}
  demo.edits ||= {};
  demo.edits[route.id]={title,copy};
  saveDemo();closeOverlay(false);renderView();showToast('已保存到演示稿');
}
function identifyRequest(prompt) {
  if (/提醒/.test(prompt)) return 'reminder';
  if (/运动|步数|跑步|卡路里|热量/.test(prompt)) return /今日|今天/.test(prompt) ? 'dailySport' : 'sport';
  if (/进步|成长/.test(prompt)) return 'progress';
  if (/主题/.test(prompt)) return 'themes';
  if (/瞬间|今天发生|经历/.test(prompt)) return 'moments';
  return 'unknown';
}
function optionsFrom(entries,selected){
  return Object.entries(entries).map(([value,title])=>`<option value="${value}" ${String(selected)===value?'selected':''}>${title}</option>`).join('');
}
function customTask(id=''){
  const task=taskById(id)||{};
  sheet(id?'编辑定时任务':'新建定时任务',`<form id="custom-task-form" class="form" data-id="${id}">
    <label>想让小思定时做什么？<textarea name="prompt" maxlength="160" rows="2" placeholder="例如：每周五 18:00 汇总孩子的运动数据">${escapeHtml(task.prompt||'')}</textarea></label>
    <div class="mic-tools"><button class="pill" type="button" data-action="task-mic">${icon('mic')}<span>录语音</span></button>
    <button class="link" type="button" data-action="task-example">试用示例口述</button></div>
    <small class="mic-status" role="status"></small><audio controls hidden aria-label="任务录音回听"></audio>
    <label>到点生成<select name="kind">${optionsFrom(outputs,task.type||'moments')}</select></label>
    <div class="form-row"><label>触发时间<input type="time" name="time" required value="${task.time||'20:00'}"></label>
    <label>频率<select name="frequency">${optionsFrom({once:'仅一次',daily:'每天',weekly:'每周'},task.frequency||'daily')}</select></label></div>
    <label data-once>触发日期<input type="date" name="date" min="${clockDay()}" value="${task.date||clockDay()}"></label>
    <label data-weekly>每周哪天<select name="day">${optionsFrom(weekdayNames,task.day??'5')}</select></label>
    <button class="primary" type="submit">${id?'保存设置':'创建定时任务'}</button></form>`);
  const form=$('#custom-task-form');
  form.dataset.parsed=task.prompt||'';
  syncFrequency(form);
  if(task.audio) setTaskAudio(form,task.audio);
}
function syncFrequency(form){
  [['[data-once]','once'],['[data-weekly]','weekly']].forEach(([selector,value])=>{
    const field=$(selector,form), active=form.elements.frequency.value===value;
    field.hidden=!active;field.lastElementChild.disabled=!active;field.lastElementChild.required=active;
  });
}
function applyPrompt(form){
  const prompt=form.elements.prompt.value.trim();
  if(!prompt || form.dataset.parsed===prompt) return;
  form.dataset.parsed=prompt;
  const kind=/成长概览|成长总结/.test(prompt)?'growth':identifyRequest(prompt);
  if(kind!=='unknown') form.elements.kind.value=kind;
  const time=prompt.match(/([01]?\d|2[0-3])[:：]([0-5]\d)/);
  if(time) form.elements.time.value=time[1].padStart(2,'0')+':'+time[2];
  const day=prompt.match(/(?:每周|每星期)([一二三四五六日天])/);
  if(day){form.elements.frequency.value='weekly';form.elements.day.value=String('日一二三四五六'.indexOf(day[1].replace('天','日')));}
  else if(/每天|每日/.test(prompt)) form.elements.frequency.value='daily';
  else if(/仅一次|只提醒一次/.test(prompt)) form.elements.frequency.value='once';
  syncFrequency(form);
}
overlay.addEventListener('focusout',e=>{
  if(e.target.name==='prompt' && e.target.form?.id==='custom-task-form') applyPrompt(e.target.form);
});
function sampleTask(){
  const form=$('#custom-task-form');
  form.elements.prompt.value='每周五 18:00 帮我看看孩子这一周的运动数据';
  applyPrompt(form);
  $('.mic-status',form).textContent='已填入示例口述，可以继续编辑。';
}
let taskMic=null;
function setTaskAudio(form,data){
  form.recordedAudio=data;
  const player=$('audio',form);
  player.src=data;player.hidden=false;
}
function stopTaskMic(discard=false){
  if(!taskMic)return;
  const rec=taskMic;
  if(discard){rec.discard=true;taskMic=null;}
  clearTimeout(rec.timer);
  if(rec.recorder?.state==='recording')rec.recorder.stop();
  rec.stream?.getTracks().forEach(track=>track.stop());
}
async function toggleTaskMic(){
  const form=$('#custom-task-form');
  if(!form)return;
  const status=$('.mic-status',form),control=$('[data-action="task-mic"]',form);
  if(taskMic){if(taskMic.recorder)stopTaskMic();return;}
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){
    status.textContent='当前浏览器无法录音，可输入提示词或试用示例口述。';return;
  }
  const rec={form,discard:false};
  taskMic=rec;
  const submit=$('[type="submit"]',form);
  submit.disabled=true;
  status.textContent='正在等待麦克风权限…';
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    rec.stream=stream;
    if(rec.discard || !form.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
    const recorder=new MediaRecorder(stream,{audioBitsPerSecond:24000});
    rec.recorder=recorder;
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      clearTimeout(rec.timer);
      if(rec.discard || !form.isConnected)return;
      const reader=new FileReader();
      reader.onloadend=()=>{
        if(rec.discard || !form.isConnected)return;
        if(typeof reader.result==='string' && chunks.length){setTaskAudio(form,reader.result);status.textContent='录音已附上。可回听，并选择到点生成的卡片。';}
        else status.textContent='未收到录音，请重试或输入提示词。';
        taskMic=null;submit.disabled=false;control.querySelector('span').textContent='重新录音';
      };
      reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));
    };
    recorder.start();control.querySelector('span').textContent='结束录音';status.textContent='正在录音，最长 30 秒';
    rec.timer=setTimeout(()=>stopTaskMic(),30000);
  }catch(error){
    rec.stream?.getTracks().forEach(t=>t.stop());
    if(rec.discard)return;
    taskMic=null;submit.disabled=false;
    status.textContent='麦克风暂不可用，可输入提示词或试用示例口述。';
  }
}
function saveCustomTask(form){
  if(taskMic)return;
  const fields=new FormData(form),prompt=fields.get('prompt').trim();
  if(!prompt && !form.recordedAudio){$('.mic-status',form).textContent='请先写下提示词或录一段语音。';form.elements.prompt.focus();return;}
  const old=taskById(form.dataset.id), type=fields.get('kind');
  const task={...old,id:old?.id||unique(),custom:true,enabled:old?.completed?true:(old?.enabled??true),completed:false,
    type,prompt,title:prompt||`语音任务 · ${outputs[type]}`,frequency:fields.get('frequency'),date:fields.get('date')||demoDate,
    day:fields.get('day')||'5',time:fields.get('time'),audio:form.recordedAudio||''};
  const prev=demo.tasks;
  demo.tasks=old?prev.map(t=>t===old?task:t):[...prev,task];
  try{localStorage.setItem(storageKey,JSON.stringify(demo));}
  catch {demo.tasks=prev;showToast('本地存储不足，请缩短录音后重试');return;}
  logTask(task,old?'更新任务':'创建任务');saveDemo();
  closeOverlay(false);renderView();
  const created=view.querySelector(`[data-action="edit-task"][data-id="${task.id}"]`);
  created?.scrollIntoView({block:'nearest'});
  showToast(old?'已更新定时任务':'已添加定时任务');
}

