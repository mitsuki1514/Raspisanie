/* ===== ВЫБОР КАФЕДРЫ / ГРУППЫ / ПРЕПОДАВАТЕЛЯ для вкладки «Расписание» ===== */
var SF={d:"",sp:[],g:[],t:"",s:""},SFON=false;
function sfSpecs(d){var o=REF.d.filter(function(x){return x.id===d})[0];return o?o.specs:[]}
function sfInDept(g,d){return sfSpecs(d).indexOf(specOf(g))>=0}
function sfAny(){return!!(SF.d||SF.sp.length||SF.g.length||SF.t||SF.s)}
function sfTeacher(n){return REF.t.filter(function(t){return t.n===n&&(!SF.d||(t.d||"")===SF.d)})[0]||REF.t.filter(function(t){return t.n===n})[0]}
/* пара подходит под выбранные условия */
function sfEntryOk(e){
  if(SF.t&&e.tc!==SF.t)return false;
  if(SF.g.length&&SF.g.indexOf(e.g)<0)return false;
  if(SF.sp.length&&SF.sp.indexOf(specOf(e.g))<0)return false;
  if(SF.s&&e.s!==SF.s)return false;
  if(SF.d&&!SF.g.length&&!SF.t&&!sfInDept(e.g,SF.d))return false;
  return true;
}
/* группы, которым разрешена расстановка при выбранных условиях (null — без ограничений) */
function sfGroupScope(noG){
  if(SF.g.length&&!noG)return SF.g.slice();
  if(SF.sp.length){var l0=[];SF.sp.forEach(function(sp){groupsOf(sp).forEach(function(g){if(l0.indexOf(g)<0)l0.push(g)})});return l0}
  if(SF.d){var l=[];sfSpecs(SF.d).forEach(function(sp){groupsOf(sp).forEach(function(g){if(l.indexOf(g)<0)l.push(g)})});return l}
  return null;
}
/* группы, которые показываются в таблице при выбранных условиях */
function sfShowGroups(have){
  if(SF.g.length)return SF.g.slice().sort(gcmp);
  var l=[];
  function add(g){if(g&&l.indexOf(g)<0&&!isDeleted(g))l.push(g)}
  if(SF.t){
    var t=sfTeacher(SF.t);
    Object.keys(have).forEach(function(g){if(S.entries.some(function(e){return e.g===g&&e.tc===SF.t}))add(g)});
    if(t)(t.g||[]).forEach(add);
    if(SF.d)l=l.filter(function(g){return sfInDept(g,SF.d)||S.entries.some(function(e){return e.g===g&&e.tc===SF.t})});
  }else if(SF.d||SF.sp.length){
    (sfGroupScope()||[]).forEach(add);Object.keys(have).forEach(function(g){if(SF.sp.length?SF.sp.indexOf(specOf(g))>=0:sfInDept(g,SF.d))add(g)});
  }
  return l.sort(gcmp);
}
/* заполнение списков выбора (каскад: кафедра → группа / преподаватель) */
function sfFill(){
  var d=$("sfd"),g=$("sfg"),t=$("sft"),sb=$("sfs"),sp=$("sfp");if(!d||!g||!t||!sb||!sp)return;
  if(SF.d&&!REF.d.some(function(x){return x.id===SF.d}))SF.d="";
  d.innerHTML='<option value="">Все кафедры</option>'+REF.d.map(function(x){return'<option value="'+esc(x.id)+'">'+esc(x.id)+"</option>"}).join("");
  d.value=SF.d;
  var spl=[];
  if(SF.d)spl=sfSpecs(SF.d).slice();else REF.d.forEach(function(x){x.specs.forEach(function(q){if(spl.indexOf(q)<0)spl.push(q)})});
  SF.sp=SF.sp.filter(function(x){return spl.indexOf(x)>=0});
  sp.innerHTML=spl.map(function(x){return'<label class="chip sp" style="color:var(--tx)"><input type="checkbox" style="display:none" value="'+esc(x)+'"'+(SF.sp.indexOf(x)>=0?" checked":"")+"> "+esc(x)+"</label>"}).join("")||'<span class="mu">нет</span>';

  var gs=(SF.d||SF.sp.length)?(sfGroupScope(true)||[]):GR.filter(function(x){return!isDeleted(x)}).slice().sort(gcmp);
  SF.g=SF.g.filter(function(x){return gs.indexOf(x)>=0});
  var gc=$("sfgc");
  if(gc)gc.innerHTML=SF.g.length?SF.g.slice().sort(gcmp).map(function(x){return'<span class="chip ok" data-g="'+esc(x)+'">'+esc(x)+' <b title="Убрать группу">×</b></span>'}).join(""):"";
  if(gc){gc.style.minHeight=SF.g.length?"":"0";gc.style.display=SF.g.length?"":"none"}
  g.innerHTML='<option value="">Выбрать группу…</option>'+gs.filter(function(x){return SF.g.indexOf(x)<0}).map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+"</option>"}).join("");
  g.value="";
  /* преподаватели выбранной кафедры / группы */
  var base=REF.t.filter(function(x){
    if(SF.d&&(x.d||"")!==SF.d)return false;
    if(SF.sp.length&&!SF.sp.some(function(p){return(x.sp||[]).indexOf(p)>=0||(x.g||[]).some(function(q){return specOf(q)===p})}))return false;
    if(SF.g.length&&!SF.g.some(function(q){return(x.g||[]).indexOf(q)>=0||S.entries.some(function(e){return e.tc===x.n&&e.g===q})}))return false;
    return true;
  });
  /* предметы: у выбранного преподавателя; иначе у преподавателей кафедры / группы; иначе все */
  var sm={},sl=[];
  function addS(x){if(x&&!sm[x]){sm[x]=1;sl.push(x)}}
  if(SF.t){var ct=sfTeacher(SF.t);if(ct)(ct.s||[]).forEach(addS)}
  else if(SF.d||SF.sp.length||SF.g.length)base.forEach(function(x){(x.s||[]).forEach(addS)});
  else{(REF.sbj||[]).forEach(addS);REF.t.forEach(function(x){(x.s||[]).forEach(addS)});S.entries.forEach(function(e){addS(e.s)})}
  if(SF.s&&!sm[SF.s])sl.push(SF.s);
  sl.sort(byr);
  sb.innerHTML='<option value="">Все предметы</option>'+sl.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+"</option>"}).join("");
  sb.value=SF.s;
  var seen={},tl=[];
  base.forEach(function(x){
    if(SF.s&&(x.s||[]).indexOf(SF.s)<0&&!S.entries.some(function(e){return e.tc===x.n&&e.s===SF.s}))return;
    if(!seen[x.n]){seen[x.n]=1;tl.push(x.n)}
  });
  if(SF.t&&!seen[SF.t])tl.push(SF.t);
  tl.sort(byr);
  t.innerHTML='<option value="">Все преподаватели</option>'+tl.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+"</option>"}).join("");
  t.value=SF.t;
}
function sfApply(){render();var w=$("warn");if(w)w.textContent=""}
(function(){
  function on(id,fn){var e=$(id);if(e)e.onchange=fn}
  on("sfd",function(){SF.d=$("sfd").value;
    if(SF.d)SF.sp=SF.sp.filter(function(x){return sfSpecs(SF.d).indexOf(x)>=0});
    if(SF.t&&SF.d&&!REF.t.some(function(x){return x.n===SF.t&&(x.d||"")===SF.d}))SF.t="";
    sfFill();sfApply()});
  var spb=$("sfp");if(spb)spb.addEventListener("change",function(){
    SF.sp=Array.prototype.map.call(spb.querySelectorAll("input:checked"),function(c){return c.value});
    sfFill();sfApply()});
  on("sfg",function(){var v=$("sfg").value;if(v&&SF.g.indexOf(v)<0){SF.g.push(v);var a=$("gr");if(a)a.value=v}sfFill();sfApply()});
  var gcb=$("sfgc");if(gcb)gcb.addEventListener("click",function(e){var x=e.target.closest("b"),c=e.target.closest(".chip");if(!x||!c)return;var g=c.getAttribute("data-g");SF.g=SF.g.filter(function(q){return q!==g});sfFill();sfApply()});
  var ga=$("sfga");if(ga)ga.onclick=function(){SF.g=((SF.d||SF.sp.length)?(sfGroupScope(true)||[]):GR.filter(function(x){return!isDeleted(x)})).slice().sort(gcmp);sfFill();sfApply()};
  var gn=$("sfgn");if(gn)gn.onclick=function(){SF.g=[];sfFill();sfApply()};
  try{combo($("sfg"),270)}catch(e){}
  try{combo($("sft"))}catch(e){}
  try{combo($("sfd"))}catch(e){}
  try{combo($("sfs"))}catch(e){}
  on("sft",function(){SF.t=$("sft").value;if(SF.t&&SF.s){var tt=sfTeacher(SF.t);if(tt&&(tt.s||[]).indexOf(SF.s)<0&&!S.entries.some(function(e){return e.tc===SF.t&&e.s===SF.s}))SF.s=""}sfFill();sfApply()});
  on("sfs",function(){SF.s=$("sfs").value;sfFill();sfApply()});
  var b=$("sfall");if(b)b.onclick=function(){SF.d=SF.t=SF.s="";SF.sp=[];SF.g=[];sfFill();sfApply()};
})();
/* ВКЛАДКА «Расписание»: форма добавления занятий, подбор времени и проверка конфликтов, таблица групп, перетаскивание, печать,
   экспорт/связь с файлом расписания (Excel). */
function maxDay(s,tc){var m=parseInt(REF&&REF.mx&&REF.mx[s],10),b=m>0?m:MAXD;return(tc&&teacherOneDay(tc))?Math.max(b,S.pairs):b}
/* у группы всего в день — не больше S.pairs (8) пар; одного предмета в день — не больше maxDay (по умолчанию 2) */
function subjDayN(g,s,d,list){var n=0;(list||S.entries).forEach(function(e){if(e.g===g&&e.s===s&&e.day===d)n+=slots(e).length});return n}
function dayLimitErr(tmp,gl,days){var err="";
  gl.forEach(function(g){days.forEach(function(d){if(err)return;
    var n=0,per={},cap={};
    tmp.forEach(function(e){if(e.g===g&&e.day===d){var k=slots(e).length;n+=k;per[e.s]=(per[e.s]||0)+k;cap[e.s]=Math.max(cap[e.s]||0,maxDay(e.s,e.tc))}});
    if(n>S.pairs){err="У группы "+g+" в "+DN[d]+" будет больше "+S.pairs+" пар.";return}
    for(var s in per)if(per[s]>cap[s]){err="У группы "+g+" в "+DN[d]+" будет больше "+cap[s]+" пар предмета «"+s+"».";return}
  })});
  return err}
function hasG(c,gs){return!!((c.g&&c.g.length)||subjGroups(c.s).length||(gs&&gs[0]))}
function effG(c,gs){return(c.g&&c.g.length)?c.g:(subjGroups(c.s).length?subjGroups(c.s):gs)}
var FH=null,st=null;
/* форма добавления занятий (#addCard) скрыта — её содержимое не пересчитывается */
function formOn(){var c=$("addCard");return!!c&&!c.hidden}
function offProg(){var e=$("gp");var sp=e?e.value:"";return!!sp&&sp!==COM&&!aisSpec(sp)}
function cGroup(){
  ensureGroups();
  fill("gd",REF.d.map(function(d){return[d.id,d.id]}));
  cSpec();cNum();if(formOn()){cSubj();fillSg()}
}
function numOf(g){return g.slice(g.indexOf("-")+1)}
/* специальности выбранной кафедры */
function cSpec(){
  var v=$("gd").value,d=REF.d.filter(function(x){return x.id===v})[0],sp=[];
  if(d)sp=d.specs;
  if(commonGroups().length&&sp.indexOf(COM)<0)sp=sp.concat([COM]);
  var hadBoxes=!!$("gpc").querySelector("input"),prev=gpRaw();
  fill("gp",sp.map(function(x){return[x,x]}));
  var keep0=prev.filter(function(x){return sp.indexOf(x)>=0});if(!keep0.length&&$("gp").value&&!hadBoxes)keep0=[$("gp").value];
  $("gpc").innerHTML=sp.map(function(x){return'<label class="chip'+(keep0.indexOf(x)>=0?" ok":"")+'" style="color:var(--tx)"><input type="checkbox" style="display:none" value="'+esc(x)+'"'+(keep0.indexOf(x)>=0?" checked":"")+"> "+esc(x)+"</label>"}).join("")||'<span class="mu">нет</span>';
  if(keep0.length)$("gp").value=keep0[0];
}
/* выбор образовательных программ галочками; можно снять все галочки — тогда выбраны все программы. gp (скрытый select) — первая отмеченная программа */
function gpRaw(){var el=$("gpc");return el?Array.prototype.map.call(el.querySelectorAll("input:checked"),function(c){return c.value}):[]}
/* если галочки сняты со всех программ — считаются выбранными все программы */
function gpSel(){var l=gpRaw();if(!l.length){var el=$("gpc");l=el?Array.prototype.map.call(el.querySelectorAll("input"),function(c){return c.value}):[]}if(!l.length&&$("gp").value)l=[$("gp").value];return l}
function gpAll(v){var l=$("gpc").querySelectorAll("input");if(!l.length)return;Array.prototype.forEach.call(l,function(c){c.checked=v});l[0].dispatchEvent(new Event("change",{bubbles:true}))}
$("gpall").onclick=function(){gpAll(true)};
$("gpnone").onclick=function(){gpAll(false)};
function gpChips(){Array.prototype.forEach.call($("gpc").querySelectorAll("input"),function(c){c.parentNode.classList.toggle("ok",c.checked)})}
function gpSet(sp){Array.prototype.forEach.call($("gpc").querySelectorAll("input"),function(c){c.checked=c.value===sp});gpChips();$("gp").value=sp;cNum()}
$("gpc").addEventListener("change",function(e){
  var cb=e.target;if(!cb||cb.type!=="checkbox")return;gpChips();
  $("gp").value=gpSel()[0];cNum();grChanged();
});
function cNum(){
  var m={},out=[];gpSel().forEach(function(sp){numbersOf(sp).forEach(function(n){if(!m[n]){m[n]=1;out.push(n)}})});
  out.sort(gcmp);
  fill("gn",out.map(function(n){return[n,n]}));setGr();
}
function setGr(){var sps=gpSel(),n=$("gn").value,p=sps.filter(function(sp){return numbersOf(sp).indexOf(n)>=0})[0]||sps[0]||$("gp").value;if(p&&$("gp").value!==p)$("gp").value=p;$("gr").value=p===COM?n:p+"-"+n}
function grChanged(){fillSg();cSubj();S.view="g:"+$("gr").value;render()}
$("gd").onchange=function(){cSpec();cNum();grChanged()};
$("gp").onchange=function(){cNum();grChanged()};
$("gn").onchange=function(){setGr();grChanged()};
function subjOfGroup(g){
  var sp=specOf(g),m={};
  var gb=isKzGroup(g)?baseGroup(g).replace(/[\u041aK]$/i,""):g;
  REF.t.forEach(function(t){var ok=t.g.length?(t.g.indexOf(g)>=0||t.g.indexOf(gb)>=0):(!t.sp.length||t.sp.indexOf(sp)>=0);if(ok)t.s.forEach(function(x){if(isKzSubj(x)===isKzGroup(g)&&tgOk(t,x,g))m[x]=1})});
  var nn=nrm(numOf(g));GS.forEach(function(r){if(isKzSubj(r.s)===isKzGroup(g)&&r.n.some(function(x){return nrm(x)===nn}))m[r.s]=1});
  return m;
}
function cSubj(){
  var chk=$("all").checked,sp=$("gp").value,all=chk||sp===COM,m={},list;
  var gps=gpSel();REF.t.forEach(function(t){if(all||!t.sp.length||gps.some(function(q){return t.sp.indexOf(q)>=0}))t.s.forEach(function(x){m[x]=1})});
  list=all?subjAll():Object.keys(m).sort(byr);
  if(!all){var kg=isKzGroup($("gr").value);list=list.filter(function(x){return isKzSubj(x)===kg})}
  if(offProg())list=[];
  fill("sb",list.map(function(x){return[x,x]}));cTeach();
}
function cTeach(){
  var el=$("tc"),cur=el.value,s=$("sb").value,all=$("all").checked;
  var cg=all?[]:($("gr").value?[$("gr").value]:[]);
  var l=offProg()?[]:REF.t.filter(function(t){return all||(t.s.indexOf(s)>=0&&cg.every(function(g){return tgOk(t,s,g)}))}).sort(byn);
  var o=function(t){return'<option value="'+esc(t.n)+'">'+esc(t.n)+"</option>"};
  var a=l.filter(function(t){return t.d}),b=l.filter(function(t){return!t.d});
  el.innerHTML=(a.length?'<optgroup label="Преподаватели кафедр">'+a.map(o).join("")+"</optgroup>":"")+(b.length?'<optgroup label="Другие преподаватели">'+b.map(o).join("")+"</optgroup>":"");
  if(cur)keep(el,cur);
}
$("sb").onchange=function(){cTeach();pv()};
$("all").onchange=function(){cSubj()};
function buildForm(){
  $("ty").innerHTML=TY.map(function(t,i){return'<label class="tp"><input type="checkbox" data-i="'+i+'"> '+t[1]+" <input type='number' min='1' max='10' value='1' title='Сколько пар в неделю' style='width:60px' disabled> <input type='text' size='5' placeholder='ауд.' disabled></label>"}).join("");
  cGroup();pv();
}
function parts(){
  var out=[],rm=$("ty").querySelectorAll("input[type=text]"),nm=$("ty").querySelectorAll("input[type=number]");
  Array.prototype.forEach.call($("ty").querySelectorAll("input[type=checkbox]"),function(c,i){
    if(!c.checked)return;
    var n=parseInt(nm[i].value,10);if(!(n>0))n=1;if(n>10)n=10;
    out.push({t:TY[i][0],n:n,r:rm[i].value.trim()})});
  return out;
}
/* блоки по ≤2 пары подряд: сначала полные блоки одного типа (2 лекции, 2 практики…), остатки по одной объединяются (лекция + практика) */
function makeBlocks(p,s,tc){
  var blocks=[],singles=[],MAXD=maxDay(s,tc);
  p.forEach(function(x){
    var n=x.n;
    while(n>=MAXD){var b=[];for(var k=0;k<MAXD;k++)b.push({t:x.t,r:x.r});blocks.push(b);n-=MAXD}
    for(;n>0;n--)singles.push({t:x.t,r:x.r});
  });
  for(var i=0;i<singles.length;i+=MAXD)blocks.push(singles.slice(i,i+MAXD));
  /* порядок недели: сначала блоки только из лекций, затем смешанные (лекция + практика), в конце практики / лабораторные */
  var rk=function(b){var l=b.filter(function(x){return x.t==="Лек"}).length;return l===b.length?0:(l?1:2)};
  return blocks.map(function(b,i){return{b:b,i:i}}).sort(function(x,y){return rk(x.b)-rk(y.b)||x.i-y.i}).map(function(x){return x.b});
}
/* ===== кредиты → пары в неделю: 2–3 кр. = 2 пары в неделю, 4–5 = 3 пары, 6–7 = 4 пары; блоки по ≤2 пары подряд, каждый в свой день ===== */
function creditPairs(s){var c=parseFloat(REF.cr&&REF.cr[s]);if(!(c>0))return 0;return c<4?2:(c<6?3:4)}
/* порядок пар по недельной нагрузке: сначала 2 лекции, затем лекция + практика/лабораторная */
function planSlots(types,N){
  var oth=types.filter(function(t){return t!=="Лек"}),hasL=types.indexOf("Лек")>=0,out=[],i;
  if(!hasL){for(i=0;i<N;i++)out.push(oth[i%oth.length]);return out}
  if(!oth.length){for(i=0;i<N;i++)out.push("Лек");return out}
  if(N<=2){out.push("Лек");out.push(oth[0]);return out.slice(0,N)}
  out.push("Лек","Лек");
  var rest=N-2;
  if(oth.length===1){if(rest===1)out.push(oth[0]);else{out.push("Лек");out.push(oth[0])}}
  else for(i=0;i<rest;i++)out.push(oth[i%oth.length]);
  return out;
}
/* следующий блок (до 2 пар подряд) с учётом уже поставленных пар предмета у группы */
function nextBlock(g,s,p){
  var N=creditPairs(s);if(!N||!p.length)return null;
  var plan=planSlots(p.map(function(x){return x.t}),N),have={};
  S.entries.forEach(function(e){if(e.g===g&&e.s===s)e.parts.forEach(function(x){have[x.t]=(have[x.t]||0)+x.n})});
  var rest=[];
  plan.forEach(function(t){if(have[t]>0)have[t]--;else rest.push(t)});
  var rm={};p.forEach(function(x){rm[x.t]=x.r});
  return{N:N,done:N-rest.length,block:rest.slice(0,maxDay(s)).map(function(t){return{t:t,r:rm[t]||""}})};
}
/* Числа подставляются по кредитам: всего пар в неделю N делится между отмеченными типами (лекции получают больше при нечётном N).
   Число, которое ты вписал сам, остаётся как есть, а остальное автоматически добирается до N (лекция 2 → практика сама станет 2 при 6 кр.). */
var _fcSub="";
function fillCounts(){
  var sb=$("sb").value,N=sb?creditPairs(sb):0;
  var cb=$("ty").querySelectorAll("input[type=checkbox]"),nm=$("ty").querySelectorAll("input[type=number]");
  if(sb!==_fcSub){_fcSub=sb;Array.prototype.forEach.call(nm,function(x){delete x.dataset.man})}
  var man=[],auto=[],sum=0;
  Array.prototype.forEach.call(cb,function(c,i){
    if(!c.checked){delete nm[i].dataset.man;return}
    if(nm[i].dataset.man){var v=parseInt(nm[i].value,10);if(v>0)sum+=v;man.push(i)}else auto.push(i);
  });
  if(!N||!auto.length)return;
  var R=Math.max(auto.length,N-sum),k=auto.length,base=Math.floor(R/k),ex=R%k;
  auto.forEach(function(i,j){nm[i].value=Math.max(1,base+(j<ex?1:0))});
}
$("ty").addEventListener("input",function(e){
  if(e.target.type==="number"&&e.isTrusted){e.target.dataset.man="1";fillCounts()}
});
var _fcKey="";
function pv(){
  var key=$("sb").value+"|"+Array.prototype.map.call($("ty").querySelectorAll("input[type=checkbox]"),function(c){return c.checked?1:0}).join("");
  if(key!==_fcKey){_fcKey=key;fillCounts()}
  var p=parts(),s=$("sb").value,g=(_gMan?parseSg().g[0]:"")||$("gr").value;
  if(!p.length){$("pv").textContent="";return}
  var bl=makeBlocks(p,s,$("tc").value),tot=p.reduce(function(a,x){return a+x.n},0);
  var txt="Добавится "+tot+" пар: "+bl.map(function(b){return b.map(function(x){return FN[x.t]}).join(" + ")}).join(" | ")+(bl.length>1?" · блоки в разные дни, через день":"")+(maxDay(s,$("tc").value)!==MAXD?" · до "+maxDay(s,$("tc").value)+" пар в день подряд"+(teacherOneDay($("tc").value)?" (у преподавателя один рабочий день)":""):"")+" · день и пару подберу сам";
  var N=s?creditPairs(s):0;
  if(N&&g){var have=0;S.entries.forEach(function(e){if(e.g===g&&e.s===s)have+=slots(e).length});txt+=" (по кредитам "+N+" пар в неделю, уже стоит "+have+")"}
  $("pv").textContent=txt;
}
$("ty").addEventListener("change",function(e){
  if(e.target.type==="checkbox")Array.prototype.forEach.call(e.target.closest(".tp").querySelectorAll("select,input[type=text],input[type=number]"),function(x){x.disabled=!e.target.checked});
  pv();
});
$("ty").addEventListener("input",pv);
function slots(e){var o=[],p=e.start;e.parts.forEach(function(x){for(var k=0;k<x.n;k++)o.push({d:e.day,p:p++,t:x.t,r:x.r||e.r||""})});return o}
/* уровень ослабления ограничений при принудительной расстановке: 0 — обычный; 1 — без лимита «пар в день»; 2 — + допускается наложение у преподавателя (аудитории по-прежнему не накладываются); 3 — + игнорируются выходные дни преподавателя */
var RELAX=0;
function conflict(ne,pool){
  var ns=slots(ne),arr=pool||S.entries;
  for(var i=0;i<arr.length;i++){
    var e=arr[i];if(e.day!==ne.day)continue;
    var es=slots(e);
    for(var j=0;j<ns.length;j++)for(var k=0;k<es.length;k++){
      if(ns[j].p!==es[k].p)continue;
      var w=DN[ne.day]+", "+ns[j].p+" пара";
      if(e.g===ne.g)return"У группы "+ne.g+" уже есть занятие: "+w+".";
      var nr=ns[j].r,er=es[k].r,common=e.s===ne.s&&e.tc===ne.tc&&er===nr;
      if(!common){
        if(e.tc===ne.tc&&RELAX<2)return label(ne.tc)+" уже занят(а): "+w+", группа "+e.g+".";
        if(nr&&er&&er.toLowerCase()===nr.toLowerCase())return"Аудитория "+nr+" занята: "+w+", группа "+e.g+".";
      }
    }
  }
  return"";
}
/* автоподбор времени: день и пара выбираются случайно из свободных вариантов, с равномерной нагрузкой по дням */
/* число разных занятий у преподавателя в каждой клетке (>1 — наложение; общая пара нескольких групп считается за одно) */
function tcMap(){var m={},seen={};S.entries.forEach(function(e){slots(e).forEach(function(x){var k=e.tc+"|"+e.day+"|"+x.p,id=k+"|"+e.s+"|"+String(x.r||"").toLowerCase();if(seen[id])return;seen[id]=1;m[k]=(m[k]||0)+1})});return m}
function dayOcc(g,d){var o={};S.entries.forEach(function(e){if(e.g===g&&e.day===d)slots(e).forEach(function(x){o[x.p]=1})});return o}
/* порядок занятий у группы по предмету: все лекции раньше практик и лабораторных (проверяются только новые пары относительно уже стоящих) */
function ordBounds(gs,s){
  return gs.map(function(g){
    var maxL=-1,minO=1e9;
    S.entries.forEach(function(e){if(e.g!==g||e.s!==s)return;slots(e).forEach(function(x){var v=x.d*100+x.p;if(x.t==="Лек"){if(v>maxL)maxL=v}else if(v<minO)minO=v})});
    return{maxL:maxL,minO:minO};
  });
}
function ordOk(gs,s,d,st,p,bnd){
  if(RELAX>=3)return true;
  var nl=[],no=[],pos=st,i;
  p.forEach(function(q){for(var k=0;k<q.n;k++){(q.t==="Лек"?nl:no).push(d*100+pos);pos++}});
  bnd=bnd||ordBounds(gs,s);
  for(i=0;i<gs.length;i++){
    var maxL=bnd[i].maxL,minO=bnd[i].minO;
    if(nl.some(function(v){return v>minO})||no.some(function(v){return v<maxL}))return false;
  }
  if(nl.length&&no.length&&Math.max.apply(null,nl)>Math.min.apply(null,no))return false;
  return true;
}
function pickTime(gs,s,tc,p,tot,used,lo,hi,soft){
  used=used||[];if(lo==null)lo=0;if(hi==null)hi=S.days-1;if(soft==null)soft=S.days;
  var cand=[],best=1e9,tr=REF.t.filter(function(x){return x.n===tc})[0],nd=(tr&&tr.nd)||[];
  /* в этой функции расписание не меняется, поэтому записи по дням и границы порядка «лекции раньше практик» считаются один раз */
  var pools=[],i0;for(i0=0;i0<S.days;i0++)pools.push([]);
  S.entries.forEach(function(e){if(pools[e.day])pools[e.day].push(e)});
  var bnd=RELAX>=3?null:ordBounds(gs,s),np=p.map(function(q){return{t:q.t,n:q.n,r:q.r}}),cap=maxDay(s,tc);
  for(var d=0;d<S.days;d++){
    if((RELAX<3&&nd.indexOf(d)>=0)||d<lo||d>hi)continue;
    var occ=gs.map(function(g){return dayOcc(g,d)});
    if(occ.some(function(o){return Object.keys(o).length+tot>S.pairs}))continue;
    if(RELAX<1&&gs.some(function(g){return subjDayN(g,s,d)+tot>cap}))continue;
    var load=Math.max.apply(null,occ.map(function(o){return Object.keys(o).length}))+(d===5?100:0);
    var pool=pools[d];
    var same=gs.some(function(g0){return pool.some(function(e0){return e0.g===g0&&e0.s===s})});
    var exD=0;if(RELAX>=1)gs.forEach(function(g){exD=Math.max(exD,subjDayN(g,s,d)+tot-cap)});
    for(var st=1;st+tot-1<=S.pairs;st++){
      var gap=0;
      occ.forEach(function(o){var n=Object.keys(o).length;gap+=n?((o[st-1]||o[st+tot])?0:1):(st>3?1:0)});
      if(!ordOk(gs,s,d,st,p,bnd))continue;
      var ok=true;
      for(var i=0;i<gs.length&&ok;i++){
        if(conflict({g:gs[i],s:s,tc:tc,day:d,start:st,parts:np},pool))ok=false;
      }
      if(!ok)continue;
      var near=0;used.forEach(function(u){if(u===d)near+=1000;else if(Math.abs(u-d)===1)near+=300});
      /* общая пара: тот же преподаватель ведёт тот же предмет у другой группы в это время — группа встаёт вместе с ней (преподаватель не тратит отдельное время) */
      var join=pool.some(function(e0){
        if(e0.tc!==tc||e0.s!==s||gs.indexOf(e0.g)>=0)return false;
        var ps=slots(e0).map(function(x){return x.p});
        for(var q=st;q<=st+tot-1;q++)if(ps.indexOf(q)<0)return false;
        return true;
      });
      var ovl=0;
      if(RELAX>=2&&!join)pool.forEach(function(e0){if(e0.tc!==tc||gs.indexOf(e0.g)>=0)return;if(slots(e0).some(function(x){return x.p>=st&&x.p<=st+tot-1}))ovl++});
      var ex=exD;
      var lecB=p.length&&p[0].t==="Лек"?d*60+st:0;
      var sc=load*100+gap+lecB+(same?150:0)+near+(d>soft?200:0)-(join?(RELAX>=1?20000:2000):0)+ovl*5000+(ex>0?ex*400:0)+(RELAX>=3&&nd.indexOf(d)>=0?20000:0);
      if(sc<best){best=sc;cand=[]}
      if(sc===best)cand.push({d:d,st:st});
    }
  }
  return cand.length?cand[Math.floor(Math.random()*cand.length)]:null;
}
var Q=[];
/* ===== группы предмета: как в справочнике преподавателя (список через запятую + выбор из сохранённых групп) ===== */
var _gMan=false;
/* true — список групп в поле набран/выбран вручную; false — подставляется выбранная выше группа */
function gKey(x){return String(x).trim().toUpperCase().replace(/[ABCEHKMOPTXY]/g,function(c){return"\u0410\u0412\u0421\u0415\u041d\u041a\u041c\u041e\u0420\u0422\u0425\u0423".charAt("ABCEHKMOPTXY".indexOf(c))})}
function parseSg(){
  var raw=$("sgt").value.split(/[,;\n]+/).map(function(x){return x.trim()}).filter(Boolean),map={},g=[],bad=[];
  GR.forEach(function(x){if(!isDeleted(x))map[gKey(x)]=x});
  raw.forEach(function(x){var m=map[gKey(x)];if(m){if(g.indexOf(m)<0)g.push(m)}else if(bad.indexOf(x)<0)bad.push(x)});
  return{g:g,bad:bad}
}
function renderSgl(){
  var p=parseSg(),h=p.g.map(function(g){return'<span class="chip">'+esc(g)+' <b data-sg="'+esc(g)+'" title="Убрать">\u00d7</b></span>'}).join("")
    +p.bad.map(function(g){return'<span class="chip" style="border-color:#d9480f;color:#d9480f" title="Такой группы нет в списке">'+esc(g)+' ⚠ <b data-sg="'+esc(g)+'" title="Убрать">\u00d7</b></span>'}).join("");
  $("sgl").innerHTML=h||'<span class="mu">Выбери кафедру, программу и группу и нажми «+ Добавить группу»</span>';
}
/* группы, выбранные в форме, назначаются сразу всем предметам набора */
function syncGrp(){
  var q=_gMan?parseSg():{g:[],bad:[]};
  Q.forEach(function(c){c.g=q.g.slice();c.bad=q.bad.slice()});
  syncActive();renderQ();pv();
}
$("sgl").addEventListener("click",function(e){
  var g=e.target.dataset&&e.target.dataset.sg;if(g==null)return;
  var p=parseSg(),l=p.g.filter(function(x){return x!==g}),bad=p.bad.filter(function(x){return x!==g});
  if(!l.length&&!bad.length){_gMan=false;autoSg()}else{$("sgt").value=l.concat(bad).join(", ");_gMan=true;fitSg()}
  syncGrp();
});
function fitSg(){var a=$("sgt");a.style.height="auto";a.style.height=a.scrollHeight+2+"px";renderSgl()}
function autoSg(){if(_gMan)return;var sg=subjGroups($("sb").value),G=sg.join(", ");/* выбранная группа сама в список не подставляется — только по «+ Добавить группу» */if($("sgt").value!==G){$("sgt").value=G;fitSg()}else renderSgl()}
function fillSg(){
  var dv=$("gd").value,sps=[];
  REF.d.filter(function(d){return d.id===dv}).concat(REF.d.filter(function(d){return d.id!==dv})).forEach(function(d){d.specs.forEach(function(x){if(sps.indexOf(x)<0)sps.push(x)})});
  var h='<option value="">+ Выбрать из сохранённых групп</option>';
  sps.forEach(function(sp){var l=groupsOf(sp);if(l.length)h+='<optgroup label="'+esc(sp)+'">'+l.map(function(g){return'<option value="'+esc(g)+'">'+esc(g)+"</option>"}).join("")+"</optgroup>"});
  var cg=commonGroups();if(cg.length)h+='<optgroup label="'+esc(COM)+'">'+cg.map(function(g){return'<option value="'+esc(g)+'">'+esc(g)+"</option>"}).join("")+"</optgroup>";
  var el=$("sgs");el.innerHTML=h;el.value="";
}
combo($("sgs"));
/* «+ Добавить группу»: выбранная сверху группа дописывается в список групп предмета; потом можно выбрать другую кафедру / программу / группу */
$("sga").onclick=function(){
  var g=$("gr").value,w=$("warn");
  if(!g){w.textContent="Сначала выбери группу.";return}
  w.textContent="";
  var n=$("gn").value,add=[];gpSel().forEach(function(sp){if(numbersOf(sp).indexOf(n)>=0)add.push(sp===COM?n:sp+"-"+n)});
  if(!add.length)add=[g];
  var p=parseSg(),l=p.g.slice();add.forEach(function(x){if(l.indexOf(x)<0)l.push(x)});l.sort(gcmp);
  $("sgt").value=l.concat(p.bad).join(", ");_gMan=true;fitSg();syncGrp();
};
$("sgd").onclick=function(){
  var n=$("gn").value,rm=[],w=$("warn");
  gpSel().forEach(function(sp){if(numbersOf(sp).indexOf(n)>=0)rm.push(sp===COM?n:sp+"-"+n)});
  if(!rm.length&&$("gr").value)rm=[$("gr").value];
  var p=parseSg(),l=p.g.filter(function(x){return rm.indexOf(x)<0});
  if(l.length===p.g.length){w.textContent="Этой группы нет в списке групп предмета.";return}
  w.textContent="";
  if(!l.length&&!p.bad.length){_gMan=false;autoSg()}else{$("sgt").value=l.concat(p.bad).join(", ");_gMan=true;fitSg()}
  syncGrp();
};
$("sgs").addEventListener("change",function(){
  var v=this.value;if(!v)return;
  var p=_gMan?parseSg():{g:[],bad:[]},l=p.g.slice();if(l.indexOf(v)<0)l.push(v);l.sort(gcmp);
  $("sgt").value=l.concat(p.bad).join(", ");_gMan=true;this.value="";fitSg();syncGrp();
});
$("sgt").addEventListener("input",function(){_gMan=true;fitSg();syncGrp()});
$("sgt").addEventListener("change",function(){if(!this.value.trim()){_gMan=false;autoSg()}syncGrp()});
$("sgt").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();this.blur()}});
window.addEventListener("resize",fitSg);
var QA=-1;
/* индекс предмета набора, который сейчас открыт в форме; -1 — ни один */
function clearTypes(keepG){Array.prototype.forEach.call($("ty").querySelectorAll(".tp"),function(tp){var c=tp.querySelector("input[type=checkbox]"),n=tp.querySelector("input[type=number]"),r=tp.querySelector("input[type=text]");c.checked=false;n.value=1;delete n.dataset.man;n.disabled=true;r.value="";r.disabled=true});if(!keepG){_gMan=false;autoSg()}}
function setOpt(el,v){keep(el,v);if(el.value!==v){var o=document.createElement("option");o.value=o.textContent=v;el.appendChild(o);el.value=v}}
/* показывает в форме сохранённые настройки предмета: преподаватель, типы, число пар, аудитории */
function loadCfg(c){
  setOpt($("sb"),c.s);_fcSub=c.s;cTeach();setOpt($("tc"),c.tc);
  clearTypes();
  var cb=$("ty").querySelectorAll("input[type=checkbox]"),nm=$("ty").querySelectorAll("input[type=number]"),rm=$("ty").querySelectorAll("input[type=text]");
  c.p.forEach(function(x){for(var i=0;i<TY.length;i++)if(TY[i][0]===x.t){cb[i].checked=true;nm[i].value=x.n;nm[i].dataset.man="1";nm[i].disabled=false;rm[i].value=x.r||"";rm[i].disabled=false}});
  _gMan=!!((c.g&&c.g.length)||(c.bad&&c.bad.length));
  if(_gMan){$("sgt").value=c.g.concat(c.bad||[]).join(", ");fitSg()}else autoSg();
  pv();
}
function renderQ(){
  var box=$("qb");box.hidden=!Q.length;
  box.innerHTML=Q.length?'<span class="mu" style="margin-right:8px">Предметы:</span>'+Q.map(function(c,i){
    var t=c.p.length?esc(c.p.map(function(x){return FN[x.t]+" ×"+x.n}).join(", ")):"<em>типы не выбраны</em>";
    return'<span class="chip'+(i===QA?" on":"")+'" data-c="'+i+'" title="Нажми, чтобы открыть и изменить этот предмет">'+esc(c.s)+((c.bad&&c.bad.length)?" ⚠":"")+' <b data-q="'+i+'" title="Убрать из набора">\u00d7</b></span>'}).join(""):"";
}
$("qb").addEventListener("mousedown",function(e){
  e.preventDefault();
  var d=e.target.dataset||{};
  if(d.q!==undefined){var i=+d.q;Q.splice(i,1);if(QA===i){QA=-1;clearTypes()}else if(QA>i)QA--;renderQ();pv();return}
  var ch=e.target.closest(".chip");if(!ch)return;
  var k=+ch.dataset.c;if(!Q[k])return;
  QA=k;loadCfg(Q[k]);renderQ();$("warn").textContent="";
});
function curCfg(){var q=_gMan?parseSg():{g:[],bad:[]};return{s:$("sb").value,tc:$("tc").value,p:parts(),g:q.g,bad:q.bad}}
function sameCfg(a,b){return a.s===b.s&&a.tc===b.tc&&JSON.stringify(a.p)===JSON.stringify(b.p)&&JSON.stringify(a.g||[])===JSON.stringify(b.g||[])}
function curGroups(){return{gs:[$("gr").value]}}
/* пока открыт предмет набора, всё, что меняешь в форме (преподаватель, типы, число пар, аудитории), сразу записывается в него */
function syncActive(){
  if(QA<0)return;
  if(!Q[QA]||Q[QA].s!==$("sb").value){QA=-1;renderQ();return}
  Q[QA]=curCfg();renderQ();
}
$("ty").addEventListener("change",syncActive);
$("ty").addEventListener("input",syncActive);
$("tc").addEventListener("change",syncActive);
/* выбор другого предмета в списке закрывает открытый предмет набора и даёт чистую форму для следующего */
var _sbc=$("sb").onchange;
$("sb").onchange=function(){
  /* группы, добавленные вручную, остаются для следующего предмета; если у предмета есть свои сохранённые группы (вкладка «Предметы») — подставляются они */
  if(QA>=0&&Q[QA]&&Q[QA].s!==$("sb").value){QA=-1;clearTypes(true);renderQ()}
  _sbc.call(this);
  if(QA<0&&subjGroups($("sb").value).length){_gMan=false;autoSg()}
  fromTeacherCfg();
};
/* данные вкладки «Для преподавателей» (занятия t.ty и закреплённые группы t.tg) подставляются в форму вкладки «Расписание»
   при выборе предмета и преподавателя; _fromT — форма сейчас заполнена из этих данных (не правилась вручную) */
var _fromT=false;
function fromTeacherCfg(){
  if(QA>=0)return;
  var sn=$("sb").value,tn=$("tc").value,t=REF.t.filter(function(x){return x.n===tn})[0];
  var it=(t&&sn&&t.s.indexOf(sn)>=0)?tchPlan(t).items.filter(function(x){return x.s===sn})[0]:null;
  if(!it){if(_fromT){_fromT=false;clearTypes()}return}
  loadCfg({s:sn,tc:tn,p:it.p,g:it.gs,bad:[]});
  _fromT=true;
}
$("ty").addEventListener("change",function(e){if(e.isTrusted)_fromT=false});
$("ty").addEventListener("input",function(e){if(e.isTrusted)_fromT=false});
$("tc").addEventListener("change",function(){fromTeacherCfg()});
$("qadd").onclick=function(){
  var w=$("warn"),c=curCfg(),G=curGroups();w.style.whiteSpace="";w.textContent="";
  if(!hasG(c,G.gs)||!c.s||!c.tc){w.textContent=c.g.length?"Выбери предмет и преподавателя.":"Выбери группу, предмет и преподавателя.";return}
  var ex=-1;Q.forEach(function(q,i){if(q.s===c.s&&q.tc===c.tc)ex=i});
  if(ex>=0){QA=ex;loadCfg(Q[ex]);renderQ();w.textContent="Этот предмет уже в наборе — он открыт, отметь для него типы занятий.";return}
  Q.push(c);QA=Q.length-1;renderQ();pv();
  w.textContent="Предмет добавлен. Отметь лекции / практики / лабораторные, затем выбери другой предмет в списке и снова нажми «+ Добавить предмет». Переключаться между предметами можно по меткам выше.";
};
/* ставит один предмет блоками (лек+лек раньше недели, чем лек+практика); при неудаче откатывает только его */
function placeCfg(gs,s,tc,p){return placeCfgL(gs,s,tc,p,0)}
/* lvl — уровень ослабления ограничений (см. RELAX); по умолчанию 0 */
function placeCfgL(gs,s,tc,p,lvl){
  RELAX=lvl||0;try{return placeCfg0(gs,s,tc,p)}finally{RELAX=0}
}
function placeCfg0(gs,s,tc,p){
  var bl=makeBlocks(p,s,tc),before=S.entries.length,msgs,ok,used;
  function plan(ordered){
    S.entries.length=before;msgs=[];ok=true;used=[];var prev=-1;
    S.entries.forEach(function(e){if(gs.indexOf(e.g)>=0&&e.s===s&&used.indexOf(e.day)<0)used.push(e.day)});
    for(var bi=0;bi<bl.length;bi++){
      var bp=buildParts(bl[bi]),tot=bp.reduce(function(a,x){return a+x.n},0),r=bl.length-1-bi;
      var pk=ordered?pickTime(gs,s,tc,bp,tot,used.concat(prev>=0?[prev]:[]).filter(function(u,i,a){return a.indexOf(u)===i}),prev+1,S.days-1-r,S.days-1-2*r):pickTime(gs,s,tc,bp,tot,used);
      if(!pk){ok=false;return}
      var day=pk.d,start=pk.st;used.push(day);prev=day;
      gs.forEach(function(x){S.entries.push({g:x,s:s,tc:tc,day:day,start:start,parts:bp.map(function(q){return{t:q.t,n:q.n,r:q.r}})})});
      var names=[];bp.forEach(function(q){for(var k=0;k<q.n;k++)names.push(FN[q.t])});
      msgs.push(names.join(" + ")+": "+DN[day]+", "+start+(tot>1?"–"+(start+tot-1):"")+" пара");
    }
  }
  plan(bl.length>1);if(!ok&&bl.length>1)plan(false);
  /* пары не обязаны идти подряд: если блоки не встали, ставим каждую пару отдельно */
  if(!ok&&bl.some(function(b){return b.length>1})){var sg=[];bl.forEach(function(b){b.forEach(function(x){sg.push([x])})});bl=sg;plan(false)}
  if(!ok){S.entries.length=before;return null}
  return msgs;
}
$("qclr").onclick=function(){Q=[];QA=-1;clearTypes(true);renderQ();pv();
  _gMan=false;autoSg();fitSg();syncActive();
  $("warn").textContent=""};
/* «Добавить в расписание»: расписание строится из данных вкладки «Для преподавателей» —
   для каждого преподавателя берутся его предметы (t.s), число лекций/практик/лабораторных (t.ty) и закреплённые группы (t.tg).
   Уже стоящие пары не трогаются: добавляется только то, чего в расписании ещё нет. */
$("add").onclick=function(){
  var w=$("warn");w.style.whiteSpace="pre-line";w.textContent="";
  var list=REF.t.filter(function(t){return t.s&&t.s.length});
  if(SF.s)list=list.filter(function(t){return(t.s||[]).indexOf(SF.s)>=0});
  if(SF.t){var l2=list.filter(function(t){return t.n===SF.t&&(!SF.d||(t.d||"")===SF.d)});list=l2.length?l2:list.filter(function(t){return t.n===SF.t})}
  if(!list.length&&sfAny()){w.textContent="Для выбранных условий нет преподавателей с предметами.";return}
  if(!list.length){w.textContent="На вкладке «Для преподавателей» нет предметов. Заполни нагрузку преподавателей или загрузи выписки на вкладке «Файлы».";return}
  var r;
  SFON=sfAny();
  try{r=tchBuild(list,SF.s||undefined)}catch(e){SFON=false;w.textContent="Не удалось расставить расписание: "+(e&&e.message||"ошибка");return}
  SFON=false;
  var out=[];
  if(r.had)out.push("Уже стояли в расписании: "+r.had+".");
  if(r.tries>1)out.push("Расстановка повторена с другим подбором времени: попыток "+r.tries+".");
  if(r.forced&&r.forced.length)out.push("Поставлено с нарушением ограничений: "+r.forced.length+" (лимит пар в день или наложение у преподавателя, аудитории не накладываются; наложения подсвечены красным).");
  if(r.forced&&r.forced.length)out.push(forcedInfo(r.forced));
  if(r.bad.length)out.push("Не поместилось: "+r.bad.length+" (подробности в окне).");
  if(!out.length&&!r.cnt&&!r.fixed&&!r.missList.length)out.push("Нечего ставить: у преподавателей нет предметов с заданными занятиями.");
  w.textContent=out.join("\n");missAppend(w,r.missList);
};
$("clr").onclick=async function(){
  if(SF.s||SF.t){
    var what=(SF.s?"по предмету «"+SF.s+"»":"")+(SF.s&&SF.t?" у ":"")+(SF.t?"преподавателя «"+SF.t+"»":"");
    var del=S.entries.filter(sfEntryOk);
    if(!del.length){var w0=$("warn");if(w0)w0.textContent="Занятий "+what+" в расписании нет.";return}
    if(!(await askConfirm("Удалить из расписания занятия "+what+"?\nБудет удалено пар: "+del.length+".")))return;
    S.entries=S.entries.filter(function(e){return!sfEntryOk(e)});save();render();sfFill();return;
  }
  if(S.entries.length&&!(await askConfirm("Удалить всё расписание (все группы)?")))return;S.entries=[];save();render()};
/* ПЕЧАТЬ: как в эксель-расписании — дни слева, время, затем столбцы групп; по 4 группы и по 3 дня на лист (А4, книжная) */
var DK=[["Дүйсенбі","Понедельник"],["Сейсенбі","Вторник"],["Сәрсенбі","Среда"],["Бейсенбі","Четверг"],["Жұма","Пятница"],["Сенбі","Суббота"]];
var TYA={"Лек":"лек","Пр":"пр","Лаб":"лаб"};
/* подгонка каждого листа печати по размеру A4 книжная (поля 7 мм): ширина 730px, высота 1066px */
/* все строки таблицы одной высоты (по самой высокой) */
/* высота строк на экране: не меньше стандартной, чтобы таблица выглядела одинаково при любом выборе */
var ROWH=71;
function eqRows(tb,min){
  var list=[],m=min||0;
  Array.prototype.forEach.call(tb.querySelectorAll("tbody tr"),function(r){if(r.classList.contains("sep"))return;r.style.height="";list.push(r)});
  list.forEach(function(r){if(r.offsetHeight>m)m=r.offsetHeight});
  if(m>0)list.forEach(function(r){r.style.height=m+"px"});
}
function fitPrint(pp){
  var AVW=730,AVH=1066;
  pp.style.cssText="display:block;position:absolute;left:0;top:0;visibility:hidden;width:"+AVW+"px";
  Array.prototype.forEach.call(pp.querySelectorAll(".pgx"),function(el){
    var s=1;
    for(;s>0.4;s-=0.02){
      el.style.zoom="1";el.style.width=(AVW/s)+"px";
      Array.prototype.forEach.call(el.querySelectorAll("table"),eqRows);
      if(el.offsetHeight*s<=AVH)break;
    }
    el.style.width=(AVW/s)+"px";el.style.zoom="1";
    Array.prototype.forEach.call(el.querySelectorAll("table"),eqRows);
    el.style.zoom=String(s);
  });
  pp.style.cssText="";
}
$("prn").onclick=function(){
  if(!$("tabR").hidden){printTeachers();return}
  if(!S.entries.length){askAlert("Расписание пусто — печатать нечего.");return}
  /* печатаем ВСЕ группы: по кафедрам, до 4 групп в таблице; дни блоками Пн–Вт–Ср и Чт–Пт–Сб (по одному листу); шапка «Утверждаю» — на листе Пн–Ср каждого набора групп */
  var cell={},have={},MAXG=4,DPP=3;
  S.entries.forEach(function(e){have[e.g]=1;slots(e).forEach(function(x){cell[e.g+"|"+x.d+"|"+(x.p-1)]={e:e,t:x.t,r:x.r}})});
  var blocks=xjBlocks(Object.keys(have)),P=xjPeriod(),h="",firstPage=true;
  blocks.forEach(function(bl){
    var gl=bl.groups.filter(function(g){return have[g]});
    for(var i=0;i<gl.length;i+=MAXG){
      var ch=gl.slice(i,i+MAXG),hdr=false;/* шапка — на первом листе каждого набора групп (Пн–Ср) */
      for(var d0=0;d0<S.days;d0+=DPP){
        var dp=[];for(var k=d0;k<d0+DPP&&k<S.days;k++)dp.push(k);
        var any=dp.some(function(d){return ch.some(function(g){for(var p=0;p<S.pairs;p++)if(cell[g+"|"+d+"|"+p])return true;return false})});
        if(!any)continue;
        h+='<div class="pgx'+(firstPage?"":" brk")+'">';firstPage=false;
        if(!hdr){hdr=true;h+='<div class="xh"><div class="xu">"Утверждаю"<br>Проректор по УМР ____________ Имангазинова Д.К.</div><div class="xt">Р А С П И С А Н И Е занятий на '+P.half+' полугодие '+P.yr+' уч. год'+(bl.dept?'<br>Кафедра "'+esc(bl.dept)+'"':"")+'</div></div>'}
        h+='<div class="ps"><table><colgroup><col style="width:34px"><col style="width:46px">'+ch.map(function(){return"<col>"}).join("")+'</colgroup><thead><tr><th class="hd">дни неде-ли</th><th class="hd">время</th>'+ch.map(function(g){return"<th>"+esc(g)+"</th>"}).join("")+"</tr></thead><tbody>";
        dp.forEach(function(d){
          for(var p=0;p<S.pairs;p++){
            var tm=String(PT[p]||"").split(":");
            h+='<tr'+(p===0?' class="ds"':"")+">"+(p===0?'<td class="dn" rowspan="'+S.pairs+'"><div>'+DK[d][0]+" - "+DK[d][1]+"</div></td>":"")+'<td class="tm">'+(tm.length>1?tm[0]+" <sup>"+tm[1]+"</sup>":esc(PT[p]||String(p+1)))+"</td>";
            ch.forEach(function(g){var it=cell[g+"|"+d+"|"+p];
              h+=it?"<td><div class=\"c\">"+esc(it.e.s)+" ("+TYA[it.t]+")"+"<i>"+esc(it.e.tc)+(it.r?" <b>"+esc(it.r)+"</b>":"")+"</i></div></td>":"<td></td>"});
            h+="</tr>";
          }
        });
        h+="</tbody></table></div></div>";
      }
    }
  });
  if(!h){askAlert("Расписание пусто — печатать нечего.");return}
  var pp=$("pp");pp.innerHTML='<div class="xl">'+h+"</div>";
  fitPrint(pp);
  var done=function(){pp.innerHTML="";window.removeEventListener("afterprint",done)};
  window.addEventListener("afterprint",done);
  window.print();
};
/* ===== перетаскивание пар между клетками (с обменом местами) ===== */
function takeSlot(arr,g,d,p){
  for(var i=0;i<arr.length;i++){
    var e=arr[i];if(e.g!==g||e.day!==d)continue;
    var sl=slots(e),hit=sl.filter(function(x){return x.p===p})[0];if(!hit)continue;
    var keep=sl.filter(function(x){return x.p!==p}),groups=[],cur=null;
    keep.forEach(function(x){if(cur&&x.p===cur[cur.length-1].p+1)cur.push(x);else{cur=[x];groups.push(cur)}});
    var repl=groups.map(function(gr){return{g:e.g,s:e.s,tc:e.tc,day:e.day,start:gr[0].p,parts:buildParts(gr)}});
    arr.splice.apply(arr,[i,1].concat(repl));
    return{g:e.g,s:e.s,tc:e.tc,t:hit.t,r:hit.r};
  }
  return null;
}
function mkSlotEntry(it,d,p){return{g:it.g,s:it.s,tc:it.tc,day:d,start:p,parts:[{t:it.t,n:1,r:it.r}]}}
function mergeAdj(arr,gl){
  var again=true;
  while(again){again=false;
    outer:for(var i=0;i<arr.length;i++){var a=arr[i];if(gl.indexOf(a.g)<0)continue;
      var aend=a.start+a.parts.reduce(function(x,y){return x+y.n},0);
      for(var j=0;j<arr.length;j++){var b=arr[j];
        if(i===j||b.g!==a.g||b.s!==a.s||b.tc!==a.tc||b.day!==a.day||b.start!==aend)continue;
        var sl=slots(a).concat(slots(b));
        a.parts=buildParts(sl);arr.splice(j,1);again=true;break outer}
    }
  }
}
function moveSlot(sd,sp,dd,dp,mg){
  var w=$("warn");w.textContent="";
  if(sd===dd&&sp===dp)return;
  var gl=[mg],W=JSON.parse(JSON.stringify(S.entries)),placed=[],swapped=false;
  gl.forEach(function(g){
    var a=takeSlot(W,g,sd,sp);if(!a)return;
    var b=takeSlot(W,g,dd,dp);
    placed.push(mkSlotEntry(a,dd,dp));if(b){placed.push(mkSlotEntry(b,sd,sp));swapped=true}
  });
  if(!placed.length)return;
  var err="";
  /* выходные дни преподавателей */
  placed.forEach(function(ne){if(err)return;var tr=REF.t.filter(function(x){return x.n===ne.tc})[0];
    if(tr&&tr.nd&&tr.nd.indexOf(ne.day)>=0)err=ne.tc+": "+DN[ne.day]+" — выходной день преподавателя."});
  /* максимум пар в день у группы */
  if(!err){err=dayLimitErr(W.concat(placed),gl,[sd,dd])}
  /* пересечения по группе, преподавателю и аудитории */
  var bak=S.entries;
  if(!err){S.entries=W;
    for(var i=0;i<placed.length;i++){var m=conflict(placed[i]);if(m){err=m;break}S.entries.push(placed[i])}
  }
  if(err){S.entries=bak;w.textContent="Не получилось переместить: "+err;return}
  mergeAdj(S.entries,gl);
  w.textContent=swapped?"Пары поменялись местами.":"Пара перенесена.";
  save();render();
}
(function(){
  var tb=$("tb"),DR=null,last=null;
  function clr(){if(last){last.classList.remove("dov");last=null}}
  tb.addEventListener("dragstart",function(e){
    var c=e.target.closest&&e.target.closest(".c");if(!c)return;
    DR={g:c.dataset.g,d:+c.dataset.d,p:+c.dataset.p};
    e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain","slot")}catch(x){}
    c.classList.add("drg");
  });
  tb.addEventListener("dragend",function(){DR=null;clr();Array.prototype.forEach.call(tb.querySelectorAll(".drg"),function(x){x.classList.remove("drg")})});
  tb.addEventListener("dragover",function(e){
    if(!DR)return;var td=e.target.closest("td");if(!td||td.dataset.d===undefined||td.dataset.g!==DR.g)return;
    e.preventDefault();e.dataTransfer.dropEffect="move";
    if(last!==td){clr();td.classList.add("dov");last=td}
  });
  tb.addEventListener("dragleave",function(e){if(!tb.contains(e.relatedTarget))clr()});
  tb.addEventListener("drop",function(e){
    if(!DR)return;var td=e.target.closest("td");if(!td||td.dataset.d===undefined||td.dataset.g!==DR.g)return;
    e.preventDefault();var s=DR;DR=null;clr();
    moveSlot(s.d,s.p,+td.dataset.d,+td.dataset.p,s.g);
  });
})();
$("tb").addEventListener("click",function(e){
  var r=e.target.closest(".rm");
  if(r){
    var ei=+r.dataset.e;
    removeSlot(ei,+r.dataset.d,+r.dataset.p);
    save();render();return}
  /* клик по самой карточке больше ничего не удаляет: убирать пару — только крестиком */
});
function buildParts(group){
  var out=[];
  group.forEach(function(s){var l=out[out.length-1];if(l&&l.t===s.t&&l.r===s.r)l.n++;else out.push({t:s.t,n:1,r:s.r})});
  return out;
}
function removeSlot(ei,day,pair){
  var e=S.entries[ei];if(!e)return;
  var keep=slots(e).filter(function(s){return!(s.d===day&&s.p===pair)});
  var groups=[],cur=null;
  keep.forEach(function(s){if(cur&&s.p===cur[cur.length-1].p+1)cur.push(s);else{cur=[s];groups.push(cur)}});
  var repl=groups.map(function(gr){return{g:e.g,s:e.s,tc:e.tc,day:e.day,start:gr[0].p,parts:buildParts(gr)}});
  S.entries.splice.apply(S.entries,[ei,1].concat(repl));
}
function vf(){return"g:"+$("gr").value}
function layout(){
  var g=[],v=vf(),m=v.charAt(0),k=v.slice(2);
  for(var d=0;d<7;d++)g.push([]);
  S.entries.forEach(function(e,ei){
    if(m==="g"?e.g!==k:e.tc!==k)return;
    slots(e).forEach(function(s){g[s.d][s.p-1]={e:ei,t:s.t,r:s.r}});
  });
  return g;
}
function gotoGroup(g){
  var sp=specOf(g),dd=REF.d.filter(function(d){return d.specs.indexOf(sp)>=0})[0];
  if(dd&&$("gd").value!==dd.id){$("gd").value=dd.id;cSpec()}
  var opt=$("gp").querySelector('option[value="'+sp+'"]');
  if(opt){gpSet(sp);var n=g.slice(sp.length+1);if($("gn").querySelector('option[value="'+n+'"]'))$("gn").value=n;setGr();cSubj()}
  render();
}
/* в видимой части блока помещается ровно 5 групп и они занимают всю ширину блока:
   ширина столбца = (ширина блока − «дни» и «время») / 5, остаток пикселей уходит в столбец «время» */
var G_VIS=5;
function FILL(n,x){var r="";while(n-->0)r+=x;return r}
function gDims(id){
  var x=$(id||"xw"),w=x&&x.parentNode,W=w?w.clientWidth:0;
  if(!W)return{cw:200,rem:0};
  var cw=Math.max(90,Math.floor((W-80)/G_VIS));
  return{cw:cw,rem:Math.max(0,W-80-cw*G_VIS)};
}
function gCw(){return gDims().cw}
function gFit(){
  var tb=$("tb");if(!tb)return;var cols=tb.querySelectorAll("col");if(cols.length<3)return;
  var d=gDims(),m=1,tw=80+d.rem+d.cw*m*(cols.length-2);
  cols[1].style.width=(46+d.rem)+"px";
  var cx=d.cw*m;for(var i=2;i<cols.length;i++)cols[i].style.width=cx+"px";
  tb.style.width=tw+"px";tb.style.minWidth=tw+"px";
}
function tFit(){
  var x=$("txw"),tb=x&&x.querySelector("table");if(!tb)return;var cols=tb.querySelectorAll("col");if(cols.length<3)return;
  var d=gDims("txw"),tw=80+d.rem+d.cw*(cols.length-2);
  cols[1].style.width=(46+d.rem)+"px";
  for(var i=2;i<cols.length;i++)cols[i].style.width=d.cw+"px";
  tb.style.width=tw+"px";tb.style.minWidth=tw+"px";
}
window.addEventListener("resize",function(){gFit();tFit()});
/* расписание ПРЕПОДАВАТЕЛЯ или ПРЕДМЕТА: один столбец. Преподаватель — в клетках предмет и группы; только предмет — в клетках преподаватель и группы */
function sfRenderTeacher(){
  var P=xjPeriod(),byT=!!SF.t&&!SF.s,t=SF.t?sfTeacher(SF.t):null,dept=SF.d||(t&&t.d)||(SF.sp.length&&(REF.d.filter(function(d){return d.specs.indexOf(SF.sp[0])>=0})[0]||{}).id)||"",cell={};
  S.entries.forEach(function(e){
    if(!sfEntryOk(e))return;
    slots(e).forEach(function(x){
      var k=x.d+"|"+(x.p-1),arr=cell[k]||(cell[k]=[]),key=(byT?e.s:e.tc)+"|"+x.t+"|"+(x.r||""),f=arr.filter(function(a){return a.key===key})[0];
      if(f){if(f.g.indexOf(e.g)<0)f.g.push(e.g)}else arr.push({key:key,n:byT?e.s:e.tc,t:x.t,r:x.r||"",g:[e.g]});
    });
  });
  var hd=tchHead(P,dept);
  if(SF.t&&SF.s)hd=hd.replace(/<\/div>$/,'<br>Преподаватель: '+esc(SF.t)+"</div>");
  $("xhd").innerHTML=hd;
  var nf=0,dm=gDims(),cw=dm.cw,tw=80+dm.rem+cw;
  $("tb").style.cssText="table-layout:fixed;width:"+tw+"px;min-width:"+tw+"px";
  var h='<colgroup><col style="width:34px"><col style="width:'+(46+dm.rem)+'px"><col style="width:'+cw+'px">'+FILL(nf,'<col style="width:'+cw+'px">')+'</colgroup><thead><tr><th class="hd">дни неде-ли</th><th class="hd">время</th><th class="cur">'+esc(byT?SF.t:SF.s)+'</th>'+FILL(nf,'<th class="fl"></th>')+'</tr></thead><tbody>';
  for(var d=0;d<S.days;d++){
    for(var p=0;p<S.pairs;p++){
      var tm=String(PT[p]||"").split(":"),c=cell[d+"|"+p]||[];
      h+="<tr"+(p===0?' class="ds"':"")+">"+(p===0?'<td class="dn" rowspan="'+S.pairs+'"><div>'+DK[d][0]+" - "+DK[d][1]+"</div></td>":"")+'<td class="tm">'+(tm.length>1?tm[0]+" <sup>"+tm[1]+"</sup>":esc(PT[p]||String(p+1)))+"</td><td>"
        +c.map(function(a){return'<div class="c">'+esc(a.n)+" ("+TYA[a.t]+")<i>"+esc(a.g.join(", "))+(a.r?" <b>"+esc(a.r)+"</b>":"")+"</i></div>"}).join("")+"</td>"+FILL(nf,"<td></td>")+"</tr>";
    }
    h+='<tr class="sep"><td colspan="'+(3+nf)+'"></td></tr>';
  }
  $("tb").innerHTML=h+"</tbody>";
  gFit();if(formOn())pv();if(!$("tabR").hidden)renderTS();
}
/* Таблица как лист в Excel: все группы кафедры/специальностей рядом, дни друг под другом */
function render(){
  if(formOn())autoSg();
  if(SF.t||SF.s){sfRenderTeacher();return}
  var anchor=$("gr").value,cell={},have={},flt=sfAny();
  S.entries.forEach(function(e,ei){have[e.g]=1;if(flt&&!sfEntryOk(e))return;slots(e).forEach(function(x){cell[e.g+"|"+x.d+"|"+(x.p-1)]={e:e,ei:ei,t:x.t,r:x.r}})});
  if(anchor)have[anchor]=1;
  var bl,gl,P=xjPeriod();
  if(flt){
    gl=sfShowGroups(have);
    var ft=SF.t?sfTeacher(SF.t):null,fdept=SF.d||((SF.g.length||SF.sp.length)?(REF.d.filter(function(d){return d.specs.indexOf(SF.g.length?specOf(SF.g[0]):SF.sp[0])>=0})[0]||{}).id:(ft&&ft.d))||"";
    bl={dept:fdept,groups:gl};
  }else{
    bl=xjBlocks(Object.keys(have)).filter(function(b){return b.groups.indexOf(anchor)>=0})[0];gl=bl?bl.groups:(anchor?[anchor]:[]);
  }
  var cur={};if(!flt||gl.indexOf(anchor)>=0)cur[anchor]=1;
  $("xhd").innerHTML='<div class="xu">"Утверждаю"<br>Проректор по УМР ____________ Имангазинова Д.К.</div><div class="xt">Р А С П И С А Н И Е занятий на '+P.half+' полугодие '+P.yr+' уч. год'+(bl&&bl.dept?'<br>Кафедра "'+esc(bl.dept)+'"':"")+(SF.t?'<br>Преподаватель: '+esc(SF.t):"")+'</div>';
  /* фиксированная ширина столбцов: таблица не сжимается под экран, лишнее прокручивается в блоке */
  var nf=0,dm=gDims(),cw=dm.cw,tw=80+dm.rem+cw*gl.length;$("tb").style.cssText="table-layout:fixed;width:"+tw+"px;min-width:"+tw+"px";
  var h='<colgroup><col style="width:34px"><col style="width:'+(46+dm.rem)+'px">'+gl.map(function(){return'<col style="width:'+cw+'px">'}).join("")+FILL(nf,'<col style="width:'+cw+'px">')+'</colgroup><thead><tr><th class="hd">дни неде-ли</th><th class="hd">время</th>'+gl.map(function(g){return'<th class="'+(cur[g]?"cur":"")+'" onclick="gotoGroup(this.dataset.g)" data-g="'+esc(g)+'" title="Выбрать группу">'+esc(g)+"</th>"}).join("")+FILL(nf,'<th class="fl"></th>')+"</tr></thead><tbody>";
  var TCM=tcMap();
  for(var d=0;d<S.days;d++){
    for(var p=0;p<S.pairs;p++){
      var tm=String(PT[p]||"").split(":");
      h+='<tr'+(p===0?' class="ds"':"")+">"+(p===0?'<td class="dn" rowspan="'+S.pairs+'"><div>'+DK[d][0]+" - "+DK[d][1]+"</div></td>":"")+'<td class="tm">'+(tm.length>1?tm[0]+" <sup>"+tm[1]+"</sup>":esc(PT[p]||String(p+1)))+"</td>";
      gl.forEach(function(g){
        var it=cell[g+"|"+d+"|"+p],a='data-g="'+esc(g)+'" data-d="'+d+'" data-p="'+(p+1)+'"';
        if(it){var ei=it.ei;
          var cf=TCM[it.e.tc+"|"+d+"|"+(p+1)]>1;
          h+="<td "+a+'><div class="c'+(cf?" cf":"")+'"'+(cf?' title="Наложение: преподаватель занят в это время в другой группе"':"")+' draggable="true" data-e="'+ei+'" '+a+'><span class="rm noprint" data-e="'+ei+'" '+a+' title="Убрать эту пару">×</span>'+esc(it.e.s)+" ("+TYA[it.t]+")"+"<i>"+esc(it.e.tc)+(it.r?" <b>"+esc(it.r)+"</b>":"")+"</i></div></td>";
        }else h+="<td "+a+"></td>";
      });
      h+=FILL(nf,"<td></td>")+"</tr>";
    }
    h+='<tr class="sep"><td colspan="'+(2+gl.length+nf)+'"></td></tr>';
  }
  $("tb").innerHTML=h+"</tbody>";
  if(flt&&!gl.length)$("tb").innerHTML='<tbody><tr><td class="mu" style="height:48px;min-width:300px">Для выбранных условий групп нет.</td></tr></tbody>';
  gFit();if(formOn())pv();if(!$("tabR").hidden)renderTS();
}
function status(t){$("lk").textContent=t}
function makeXlsx(){
  var fr=[["Группа","День","Пара","Тип","Предмет","Преподаватель","Аудитория"]],body=[];
  S.entries.forEach(function(e){slots(e).forEach(function(s){body.push([e.g,DN[s.d],s.p,FN[s.t],e.s,e.tc,s.r||""])})});
  body.sort(function(a,b){return gcmp(a[0],b[0])||DN.indexOf(a[1])-DN.indexOf(b[1])||a[2]-b[2]});
  fr=fr.concat(body);
  if(!window.XLSX)return{rows:fr};
  var g=layout(),m=vf().charAt(0),gr=[[vf().charAt(0)==="g"?"Группа "+vf().slice(2):"Преподаватель "+label(vf().slice(2))].concat(DN.slice(0,S.days))];
  for(var p=0;p<S.pairs;p++){
    var r=[(p+1)+" пара"];
    for(var d=0;d<S.days;d++){var it=g[d][p];if(it){var e=S.entries[it.e];r.push(e.s+" ("+FN[it.t]+"), "+(m==="g"?e.tc:e.g)+(it.r?", ауд. "+it.r:""))}else r.push("")}
    gr.push(r);
  }
  var ws=XLSX.utils.aoa_to_sheet(fr),ws2=XLSX.utils.aoa_to_sheet(gr),wb=XLSX.utils.book_new();
  ws["!cols"]=[{wch:12},{wch:6},{wch:6},{wch:14},{wch:30},{wch:22},{wch:12}];
  ws2["!cols"]=[{wch:24}].concat(DN.slice(0,S.days).map(function(){return{wch:34}}));
  XLSX.utils.book_append_sheet(wb,ws,"Занятия");
  XLSX.utils.book_append_sheet(wb,ws2,"Расписание");
  return{buf:XLSX.write(wb,{bookType:"xlsx",type:"array"}),rows:fr};
}
/* ===== Оформленный Excel: как в образце «1 полугодие Расписание» (библиотека ExcelJS) =====
   Лист на кафедру: колонка «дни недели» (вертикально), «время», далее колонки групп.
   Между днями — тонкая чёрная полоса. Лист «Занятия» (скрытый) нужен, чтобы расписание можно было загрузить обратно. */
var XJ_FONT="Times New Roman",XJ_ERR=null;
function xjPeriod(){var d=new Date(),y=d.getFullYear(),m=d.getMonth(),a=m>=7?y:y-1;return{half:(m>=7||m===0)?"I":"II",yr:a+"-"+(a+1)}}
function dataRows(){
  var fr=[["Группа","День","Пара","Тип","Предмет","Преподаватель","Аудитория"]],body=[];
  S.entries.forEach(function(e){slots(e).forEach(function(s){body.push([e.g,DN[s.d],s.p,FN[s.t],e.s,e.tc,s.r||""])})});
  body.sort(function(a,b){return gcmp(a[0],b[0])||DN.indexOf(a[1])-DN.indexOf(b[1])||a[2]-b[2]});
  return fr.concat(body);
}
/* группы по кафедрам — так же, как при печати */
function xjBlocks(all){
  var used={},blocks=[];
  REF.d.forEach(function(d){
    var l=all.filter(function(g){return!used[g]&&d.specs.indexOf(g.split("-")[0])>=0});
    l.sort(function(a,b){var x=d.specs.indexOf(a.split("-")[0]),y=d.specs.indexOf(b.split("-")[0]);return x-y||gcmp(a,b)});
    l.forEach(function(g){used[g]=1});
    if(l.length){
      var sp=d.specs.filter(function(s){return l.some(function(g){return g.split("-")[0]===s})});
      blocks.push({dept:d.id,name:sp.join(", ")||d.id,groups:l});
    }
  });
  var rest=all.filter(function(g){return!used[g]}).sort(gcmp);
  var oth=rest.filter(function(g){return g.indexOf("-")>=0}),com=rest.filter(function(g){return g.indexOf("-")<0});
  if(oth.length)blocks.push({dept:"",name:"Прочие",groups:oth});
  if(com.length)blocks.push({dept:"",name:COM,groups:com});
  return blocks;
}
function xjSheetName(n,taken){
  var b=String(n).replace(/[\\\/\?\*\[\]:]/g,"").trim().slice(0,31)||"Лист",r=b,i=2;
  while(taken[r.toLowerCase()]){var s=" ("+i+")";r=b.slice(0,31-s.length)+s;i++}
  taken[r.toLowerCase()]=1;return r;
}
function xjLines(s,cpl){return String(s).split("\n").reduce(function(a,l){return a+Math.max(1,Math.ceil(l.length/cpl))},0)}
async function makeXlsxFancy(mode){
  var wb=new ExcelJS.Workbook();wb.creator="Конструктор расписания";
  var P=xjPeriod(),SZ=16,GW=50,CPL=34,PAIRS=S.pairs,DAYS=S.days;
  var thin={style:"thin"},med={style:"medium"};
  var cell={},have={};
  S.entries.forEach(function(e){have[e.g]=1;slots(e).forEach(function(x){cell[e.g+"|"+x.d+"|"+(x.p-1)]={e:e,t:x.t,r:x.r}})});
  var blocks=xjBlocks(Object.keys(have)),taken={};
  function fnt(sz,o){var f={name:XJ_FONT,size:sz};if(o)for(var k in o)f[k]=o[k];return f}
  function al(o){var a={horizontal:"center",vertical:"middle",wrapText:true};if(o)for(var k in o)a[k]=o[k];return a}
  var white={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFFFFF"}},black={type:"pattern",pattern:"solid",fgColor:{argb:"FF000000"}};

  function addSheets(blocks,teach){
  blocks.forEach(function(bl){
    var gl=teach?bl.teachers:bl.groups,n=gl.length,last=2+n;
    var ws=wb.addWorksheet(xjSheetName((teach?"Преп. ":"")+bl.name,taken),{
      views:[{state:"frozen",xSplit:2,ySplit:2,zoomScale:70}],
      pageSetup:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,
        margins:{left:0.2,right:0.2,top:0.3,bottom:0.3,header:0.1,footer:0.1},printTitlesRow:"1:2"}
    });
    var tlast=Math.max(last,5);/* заголовок занимает не меньше двух колонок после «Утверждаю» */
    ws.getColumn(1).width=8.5;ws.getColumn(2).width=9.5;
    for(var c=3;c<=tlast;c++)ws.getColumn(c).width=GW;

    /* строка 1: «Утверждаю» + заголовок */
    var l1="Р А С П И С А Н И Е   занятий   "+(teach?"преподавателей   ":"")+"на   "+P.half+" полугодие   "+P.yr+"   уч. год",l2=bl.dept?"Кафедра \""+bl.dept+"\"":"";
    var tw=(tlast-3)*GW,tsz=Math.max(14,Math.min(32,Math.floor(tw*7/(Math.max(l1.length,l2.length)*0.55))));
    var cplT=Math.max(10,Math.floor(tw*7/(tsz*0.55)));
    var ut=ws.getCell(1,1);
    if(!teach)ut.value="\"Утверждаю\"\nПроректор по УМР ____________ Имангазинова Д.К.";
    ut.font=fnt(14,{bold:true});ut.alignment=al({horizontal:"left",vertical:"top"});
    for(var c1=1;c1<=tlast;c1++)ws.getCell(1,c1).border={bottom:med};
    var tt=ws.getCell(1,4);
    tt.value=teach?l2:(l2?l1+"\n"+l2:l1);tt.font=fnt(tsz,{bold:true});tt.alignment=al();
    ws.getRow(1).height=teach?(l2?40:6):Math.max(60,(xjLines(l1,cplT)+(l2?xjLines(l2,cplT):0))*tsz*1.35+10);
    ws.mergeCells(1,1,1,3);
    ws.mergeCells(1,4,1,tlast);

    /* строка 2: шапка */
    var h=ws.getRow(2);h.height=47;
    var a2=ws.getCell(2,1);a2.value="дни неде-ли";a2.font=fnt(12,{bold:true});a2.alignment=al();a2.border={left:med,right:thin,top:med,bottom:med};
    var b2=ws.getCell(2,2);b2.value="время";b2.font=fnt(12,{bold:true});b2.alignment=al();b2.border={left:thin,right:med,top:med,bottom:med};
    gl.forEach(function(g,i){var c=ws.getCell(2,3+i);c.value=g;c.font=fnt(18,{bold:true});c.alignment=al();c.fill=white;c.border={left:med,right:med,top:med,bottom:med}});

    /* дни */
    for(var d=0;d<DAYS;d++){
      var base=3+d*(PAIRS+1);
      for(var p=0;p<PAIRS;p++){
        var r=base+p,first=p===0,lastp=p===PAIRS-1,maxL=1;
        var bd=function(){return{left:med,right:med,top:first?med:thin,bottom:lastp?med:thin}};
        /* день недели (одна объединённая ячейка на весь день) */
        var ca=ws.getCell(r,1);
        if(first)ca.value=DK[d][0]+" - "+DK[d][1];
        ca.font=fnt(16,{bold:true});ca.alignment=al({textRotation:90});ca.border={left:med,right:med,top:med,bottom:med};
        /* время: «8» и надстрочные «15» */
        var cb=ws.getCell(r,2),tm=String(PT[p]||"").split(":");
        cb.value=tm.length>1?{richText:[{text:tm[0]+" ",font:fnt(16,{bold:true})},{text:tm[1],font:fnt(16,{bold:true,vertAlign:"superscript"})}]}:String(PT[p]||(p+1));
        cb.font=fnt(16,{bold:true});cb.alignment=al();cb.border=bd();
        /* занятия групп */
        gl.forEach(function(g,i){
          var c=ws.getCell(r,3+i),it=teach?null:cell[g+"|"+d+"|"+p],tl=teach?TD.cell[g+"|"+d+"|"+p]:null;
          c.font=fnt(SZ);c.alignment=al();c.fill=white;c.border=bd();
          if(tl&&tl.length){
            var runs2=[],tot=0;
            tl.forEach(function(a,k){
              var gs=a.g.slice().sort(gcmp).join(", "),t1=a.s+" ("+TYA[a.t]+")"+(a.r?" "+a.r:"");
              if(k)runs2.push({text:"\n",font:fnt(SZ)});
              runs2.push({text:a.s+" ("+TYA[a.t]+")",font:fnt(SZ)});
              if(a.r)runs2.push({text:" "+a.r,font:fnt(SZ,{bold:true})});
              tot+=xjLines(t1,CPL);
            });
            c.value={richText:runs2};maxL=Math.max(maxL,tot);
          }else if(it){
            var e=it.e,l1t=e.s+" ("+TYA[it.t]+")"+(it.r?" "+it.r:""),runs=[{text:e.s+" ("+TYA[it.t]+")",font:fnt(SZ)}];
            if(it.r)runs.push({text:" "+it.r,font:fnt(SZ,{bold:true})});
            if(e.tc)runs.push({text:"\n"+e.tc,font:fnt(SZ,{italic:true})});
            c.value={richText:runs};
            maxL=Math.max(maxL,xjLines(l1t,CPL)+(e.tc?xjLines(e.tc,CPL):0));
          }
        });
        ws.getRow(r).height=Math.max(50,maxL*21+10);
      }
      ws.mergeCells(base,1,base+PAIRS-1,1);
      /* чёрная разделительная полоса между днями */
      var sr=base+PAIRS;ws.getRow(sr).height=4;
      for(var c2=1;c2<=last;c2++){var sc=ws.getCell(sr,c2);sc.fill=black}
      if(d%2===1&&d<DAYS-1){try{ws.getRow(sr).addPageBreak()}catch(e){}}/* печать по два дня на страницу */
    }
  });

  }
  if(mode!=="teach")addSheets(blocks,false);
  if(mode==="teach"){var TD=tchData(),tblocks=tchBlocks(TD.have);
  addSheets(tblocks,true);}

  /* лист «Занятия» — данные для загрузки обратно; если других листов нет, он остаётся видимым */
  if(mode!=="teach"){
  var rows=dataRows(),wd=wb.addWorksheet("Занятия",{state:blocks.length?"hidden":"visible"});
    rows.forEach(function(r,i){var row=wd.addRow(r);if(i===0)row.font={bold:true}});
    [12,6,6,14,30,22,12].forEach(function(w,i){wd.getColumn(i+1).width=w});
  }

  var buf=await wb.xlsx.writeBuffer();
  return new Uint8Array(buf).buffer;/* чистый ArrayBuffer — как у SheetJS */
}
async function buildXlsx(){
  XJ_ERR=null;
  await ensureExcelJS();
  if(window.ExcelJS){
    try{return{buf:await makeXlsxFancy(),rows:dataRows(),fancy:true}}catch(e){XJ_ERR=e;console.error(e)}
  }else XJ_ERR=new Error("библиотека ExcelJS не загрузилась (нет интернета?)");
  return makeXlsx();
}
function parseXlsx(buf){
  var wb=XLSX.read(buf,{type:"array"}),ws=wb.Sheets["Занятия"]||wb.Sheets[wb.SheetNames[0]];
  var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
  var RV={"лекция":"Лек","практика":"Пр","лабораторная":"Лаб"},OR={"Лек":0,"Пр":1,"Лаб":2},ent=[],cur=null,found=0;
  for(var i=1;i<rows.length;i++){
    var r=rows[i],g=String(r[0]).trim(),d=DN.indexOf(String(r[1]).trim()),p=+r[2],t=RV[String(r[3]).trim().toLowerCase()],s=String(r[4]).trim(),tc=String(r[5]).trim(),rm=String(r[6]).trim();
    if(!g||d<0||!p||!t||!s||!tc)continue;
    found++;
    if(cur&&cur.g===g&&cur.day===d&&cur.s===s&&cur.tc===tc&&p===cur.end+1&&OR[t]>=cur.o){
      var lp=cur.parts[cur.parts.length-1];if(lp.t===t&&lp.r===rm)lp.n++;else cur.parts.push({t:t,n:1,r:rm});
    }else{cur={g:g,s:s,tc:tc,day:d,start:p,parts:[{t:t,n:1,r:rm}]};ent.push(cur)}
    cur.end=p;cur.o=OR[t];
  }
  if(!found)throw 0;
  ent.forEach(function(e){delete e.end;delete e.o});
  return ent;
}
function apply(ent){
  S.entries=ent;S.view="";
  /* группы, пришедшие из файла, не должны считаться удалёнными */
  if(S.deletedGroups)S.deletedGroups=S.deletedGroups.filter(function(g){return!ent.some(function(e){return e.g===g})});
  var cur=$("gr").value;
  save();cGroup();
  /* если выбранной группы нет в загруженных данных — переключаемся на первую группу из файла */
  if(!ent.some(function(e){return e.g===cur})&&ent.length){
    var g0=ent[0].g,sp=specOf(g0),dd=REF.d.filter(function(d){return d.specs.indexOf(sp)>=0})[0];
    if(dd&&$("gd").value!==dd.id){$("gd").value=dd.id;cSpec()}
    var opt=$("gp").querySelector('option[value="'+sp+'"]');
    if(opt){gpSet(sp);$("gn").value=g0.slice(sp.length+1);setGr();cSubj()}
  }
  render();
}
async function loadFile(f){
  if(!f)return;
  if(!window.XLSX){askAlert("Библиотека Excel не загрузилась. Проверь подключение к интернету.");return}
  if(S.entries.length&&!(await askConfirm("Заменить текущее расписание данными из файла?")))return;
  var rd=new FileReader();
  rd.onload=function(){try{apply(parseXlsx(rd.result))}catch(e){askAlert("Не удалось прочитать файл. Нужен Excel-файл, сохранённый на этом сайте.")}};
  rd.readAsArrayBuffer(f);
}
document.addEventListener("dragover",function(e){e.preventDefault()});
document.addEventListener("drop",function(e){e.preventDefault();if(e.dataTransfer&&e.dataTransfer.files.length)loadFile(e.dataTransfer.files[0])});
function sync(now){
  tsync(now);
  if(!FH)return;clearTimeout(st);
  st=setTimeout(async function(){
    try{
      var x=await buildXlsx();if(!x.buf)return;
      var w=await FH.createWritable();await w.write(x.buf);await w.close();
      status("Расписание для студентов: файл: «"+FH.name+"» обновлён "+new Date().toLocaleTimeString().slice(0,5)+(x.fancy?"":" (упрощённый вид: "+(XJ_ERR&&XJ_ERR.message||"нет ExcelJS")+")"));
    }catch(e){status("Не удалось записать файл «"+FH.name+"»")}
  },now?0:400);
}
async function readLinked(h){
  var f=await h.getFile();
  if(f.size>0&&window.XLSX){try{apply(parseXlsx(await f.arrayBuffer()));return true}catch(e){}}
  return false;
}
async function openLinked(h){
  try{await readLinked(h);FH=h;status("Связано с файлом «"+h.name+"»: изменения сохраняются автоматически");sync(true)}
  catch(e){status("Не удалось открыть файл «"+h.name+"»")}
}
async function linkFile(sa){
  try{
    var h=await showSaveFilePicker({id:"schedlast",suggestedName:"raspisanie2.xlsx",types:[{description:"Excel",accept:{[XM]:[".xlsx"]}}]});
    if(await sameAs(h,[RH,GH,PH,TH])){askAlert(SAME_MSG);return}
    var f=await h.getFile();
    if(f.size>0&&!sa&&window.XLSX){
      try{var ent=parseXlsx(await f.arrayBuffer());
        if(!S.entries.length||(await askConfirm("В файле уже есть расписание.\nОК — загрузить его из файла.\nОтмена — перезаписать файл текущим расписанием.")))apply(ent)}catch(e){}
    }
    FH=h;hSet(h);status("Связано с файлом «"+h.name+"»: изменения сохраняются автоматически");sync(true);
  }catch(e){if(!e||e.name!=="AbortError"){var x=await buildXlsx();if(x.buf)saveFile("raspisanie2.xlsx",x.buf,XM)}}
}
$("sv").onclick=async function(){
  if(window.showSaveFilePicker){linkFile(!!FH);return}
  var x=await buildXlsx();
  if(x.buf&&!x.fancy)askAlert("Не удалось сделать оформленный Excel ("+(XJ_ERR&&XJ_ERR.message||"неизвестная ошибка")+"). Сохранён упрощённый файл.");
  if(x.buf)saveFile("raspisanie2.xlsx",x.buf,XM);
  else{var q=function(s){return'"'+String(s).replace(/"/g,'""')+'"'};
    saveFile("raspisanie2.csv","\uFEFF"+x.rows.map(function(r){return r.map(q).join(";")}).join("\r\n"),"text/csv;charset=utf-8")}
};
function autoOpen0(){
  if(!window.showSaveFilePicker)return;
  hGet(async function(h){
    if(!h)return;
    try{
      if(await h.queryPermission({mode:"readwrite"})==="granted"){openLinked(h)}
      else{
        var b=document.createElement("button");b.className="g";b.textContent="Подключить файл «"+h.name+"»";
        b.onclick=async function(){try{if(await h.requestPermission({mode:"readwrite"})==="granted"){b.remove();openLinked(h)}}catch(e){}};
        $("lk").textContent="";$("lk").appendChild(b);
      }
    }catch(e){}
  });
}
/* колесо мыши над расписанием листает его только вправо / влево (страница при этом не прокручивается);
   два щелчка колеса = одна группа */
(function(){
  function hs(w,step){
    if(!w)return;
    w.addEventListener("wheel",function(e){
      if(e.ctrlKey)return;
      var max=w.scrollWidth-w.clientWidth;if(max<=0)return;
      var dy=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
      if(!dy)return;
      if(e.deltaMode===1)dy*=100/3;else if(e.deltaMode===2)dy*=100*10;
      var half=step()/2;/* один щелчок колеса (≈100) = пол-группы */
      w.scrollLeft=Math.max(0,Math.min(max,w.scrollLeft+dy/100*half));
      e.preventDefault();
    },{passive:false});
  }
  hs($("xw")&&$("xw").parentNode,gCw);
  hs($("txw")&&$("txw").parentNode,function(){return gDims("txw").cw});
})();

/* ===== АВТОИСПРАВЛЕНИЕ: пары, поставленные с нарушением (лимит пар в день / наложение у преподавателя / выходной преподавателя),
   переносятся в свободные места без нарушений. Если свободного места нет — освобождаем клетку, сдвигая мешающие пары (цепочка переносов). ===== */
var _RJ=[],_RT=0;
function rpUnitKey(e){return e.tc+"\u0001"+e.s+"\u0001"+e.day+"\u0001"+e.start+"\u0001"+JSON.stringify(e.parts)}
/* «пара» = одно занятие, общее для нескольких групп (один преподаватель, предмет, время) */
function rpUnits(){var m={},ord=[];S.entries.forEach(function(e){var k=rpUnitKey(e);if(!m[k]){m[k]=[];ord.push(k)}m[k].push(e)});return ord.map(function(k){return m[k]})}
function rpNd(tc){var t=REF.t.filter(function(x){return x.n===tc})[0];return(t&&t.nd)||[]}
function rpWhy(U,TCM){
  var e0=U[0],w=[];
  if(rpNd(e0.tc).indexOf(e0.day)>=0)w.push("выходной преподавателя");
  if(slots(e0).some(function(x){return TCM[e0.tc+"|"+e0.day+"|"+x.p]>1}))w.push("наложение у преподавателя");
  if(U.some(function(e){return subjDayN(e.g,e.s,e.day)>maxDay(e.s,e.tc)}))w.push("лимит пар в день");
  return w;
}
function rpBad(U,TCM){return rpWhy(U,TCM).length>0}
function rpSet(U,d,st){_RJ.push({U:U,d:U[0].day,s:U[0].start});U.forEach(function(e){e.day=d;e.start=st})}
function rpUndo(mark){while(_RJ.length>mark){var j=_RJ.pop();j.U.forEach(function(e){e.day=j.d;e.start=j.s})}}
/* можно ли поставить пару U в (день d, начало st) без нарушений; S.entries не должен содержать саму U */
function rpCan(U,d,st,tot){
  var e0=U[0];
  if(rpNd(e0.tc).indexOf(d)>=0||st+tot-1>S.pairs)return false;
  var old=RELAX;RELAX=0;
  try{
    for(var i=0;i<U.length;i++){var e=U[i];
      if(subjDayN(e.g,e.s,d)+tot>maxDay(e.s,e.tc))return false;
      if(!ordOk([e.g],e.s,d,st,e.parts))return false;
      if(conflict({g:e.g,s:e.s,tc:e.tc,day:d,start:st,parts:e.parts}))return false}
  }finally{RELAX=old}
  return true;
}
function rpScore(U,d,st,tot){
  var sc=d===5?300:0,e0=U[0];
  U.forEach(function(e){
    var o=dayOcc(e.g,d),n=Object.keys(o).length;
    sc+=n*100+((n&&!(o[st-1]||o[st+tot]))?1:0)+(!n&&st>3?1:0);
    if(S.entries.some(function(x){return x.g===e.g&&x.s===e0.s&&x.day===d}))sc+=150;
  });
  return sc+_RT*Math.random()*200;
}
function rpUnitOf(units,e){return units.filter(function(q){return q.indexOf(e)>=0})[0]}
/* пары, мешающие поставить U в (d,st): по времени (группа, преподаватель, аудитория) и по лимиту пар предмета в день */
function rpBlockers(U,d,st,tot,units){
  var e0=U[0],gs=U.map(function(e){return e.g}),rooms=slots(e0).map(function(x){return String(x.r||"").toLowerCase()}).filter(Boolean),res=[];
  function add(e){var u=rpUnitOf(units,e);if(u&&u!==U&&res.indexOf(u)<0)res.push(u)}
  S.entries.forEach(function(e){
    if(U.indexOf(e)>=0||e.day!==d)return;
    var sl=slots(e);
    if(!sl.some(function(x){return x.p>=st&&x.p<=st+tot-1}))return;
    var common=e.s===e0.s&&e.tc===e0.tc,hit=gs.indexOf(e.g)>=0||(e.tc===e0.tc&&!common)
      ||sl.some(function(x){return x.p>=st&&x.p<=st+tot-1&&x.r&&rooms.indexOf(String(x.r).toLowerCase())>=0});
    if(hit)add(e);
  });
  /* лимит предмета в день: если после переноса U превысит его — мешают другие пары этого предмета у этой группы в этот день */
  U.forEach(function(g0){
    var cur=0,same=[];
    S.entries.forEach(function(e){if(U.indexOf(e)<0&&e.g===g0.g&&e.s===g0.s&&e.day===d){cur+=slots(e).length;same.push(e)}});
    if(cur+tot>maxDay(g0.s,g0.tc))same.forEach(add);
  });
  return res;
}
/* перенести пару U в место без нарушений; depth — сколько ещё уровней можно сдвигать соседние пары; chain — пары, которые трогать нельзя */
function rpMove(U,depth,chain){
  if(Date.now()>_RT0)return false;
  var all=S.entries,tot=slots(U[0]).length,d0=U[0].day,s0=U[0].start,pos=[];
  S.entries=all.filter(function(e){return U.indexOf(e)<0});
  for(var d=0;d<S.days;d++)for(var st=1;st+tot-1<=S.pairs;st++){
    if(d===d0&&st===s0)continue;
    if(rpCan(U,d,st,tot))pos.push({d:d,st:st,sc:rpScore(U,d,st,tot)});
  }
  S.entries=all;
  if(pos.length){
    pos.sort(function(a,b){return a.sc-b.sc||a.d-b.d||a.st-b.st});
    rpSet(U,pos[0].d,pos[0].st);return true;
  }
  if(depth<=0)return false;
  /* свободного места нет: освобождаем клетку, сдвигая мешающие пары */
  var units=rpUnits(),ch=chain.concat([U]),cand=[];
  var inCh=function(b){return ch.some(function(c){return c===b||c.some(function(e){return b.indexOf(e)>=0})})};
  for(var d=0;d<S.days;d++){
    if(rpNd(U[0].tc).indexOf(d)>=0)continue;
    for(var st=1;st+tot-1<=S.pairs;st++){
      if(d===d0&&st===s0)continue;
      var bl=rpBlockers(U,d,st,tot,units);
      if(!bl.length||bl.length>3||bl.some(inCh))continue;
      cand.push({d:d,st:st,bl:bl,sc:bl.length*1000+rpScore(U,d,st,tot)});
    }
  }
  cand.sort(function(a,b){return a.sc-b.sc});
  for(var c=0;c<cand.length&&c<60;c++){
    var k=cand[c],mark=_RJ.length,ok=true;
    rpSet(U,k.d,k.st);
    for(var i=0;i<k.bl.length&&ok;i++)ok=rpMove(k.bl[i],depth-1,ch);
    if(ok){var tm=tcMap();ok=!rpBad(U,tm)&&k.bl.every(function(b){return!rpBad(b,tm)})}
    if(ok)return true;
    rpUndo(mark);
    if(Date.now()>_RT0)break;
  }
  return false;
}
var _RT0=0;
/* forced — список {t,s,g} из tchBuild; возвращает {fixed, left}; у left[i].why — причина, по которой нарушение осталось */
function repairForced(forced,ms){
  var fs={};(forced||[]).forEach(function(f){fs[f.t+"\u0001"+f.s+"\u0001"+f.g]=1});
  var isF=function(U){return U.some(function(e){return fs[e.tc+"\u0001"+e.s+"\u0001"+e.g]})};
  _RJ=[];_RT0=Date.now()+(ms||8000);
  for(var it=0;it<8;it++){
    _RT=it>1?1:0;/* со второго круга в выбор места добавляется случайность */
    var changed=false,us=rpUnits().filter(isF);
    for(var i=0;i<us.length;i++){
      var U=us[i];
      if(!rpBad(U,tcMap()))continue;
      for(var dp=1;dp<=4&&rpBad(U,tcMap());dp++){
        var mark=_RJ.length;
        if(rpMove(U,dp,[])&&!rpBad(U,tcMap())){changed=true;break}
        rpUndo(mark);
        if(Date.now()>_RT0)break;
      }
      /* общая пара нескольких групп не переносится целиком — разделяем её и переносим группы по одной (каждая встаёт куда может, в том числе к другой общей паре) */
      if(rpBad(U,tcMap())&&U.length>1){
        var mS=_RJ.length,okS=true;
        for(var q=0;q<U.length&&okS;q++){
          var one=[U[q]],done=false;
          for(var dp=0;dp<=2&&!done;dp++){var m3=_RJ.length;if(rpMove(one,dp,[])){done=true}else rpUndo(m3)}
          okS=done;
        }
        if(okS){var tmS=tcMap();okS=U.every(function(e){return!rpBad([e],tmS)})}
        if(okS)changed=true;else rpUndo(mS);
      }
      if(!rpBad(U,tcMap()))continue;
      /* не вышло сдвинуть саму пару — сдвигаем те, с которыми она накладывается / из-за которых превышен лимит */
      var tot=slots(U[0]).length,bl=rpBlockers(U,U[0].day,U[0].start,tot,rpUnits()).filter(function(b){return!isF(b)});
      for(var k=0;k<bl.length;k++){
        var m2=_RJ.length;
        for(var dp=1;dp<=3;dp++){
          if(rpMove(bl[k],dp,[U])){var tm=tcMap();if(!rpBad(U,tm)&&!rpBad(bl[k],tm)){changed=true;break}}
          rpUndo(m2);
          if(Date.now()>_RT0)break;
        }
        if(!rpBad(U,tcMap()))break;
      }
    }
    if(!changed||Date.now()>_RT0)break;
  }
  _RJ=[];_RT=0;
  var TCM=tcMap(),us2=rpUnits(),left=[];
  (forced||[]).forEach(function(f){
    var w=[];
    us2.forEach(function(U){if(U.some(function(e){return e.tc===f.t&&e.s===f.s&&e.g===f.g})){rpWhy(U,TCM).forEach(function(x){if(w.indexOf(x)<0)w.push(x)})}});
    if(w.length){
      var nd=rpNd(f.t),busy=0,pre=f.t+"|";
      var load=0;Object.keys(TCM).forEach(function(k){if(k.indexOf(pre)===0){busy++;load+=TCM[k]}});
      var tot=(S.days-nd.filter(function(x){return x<S.days}).length)*S.pairs;
      left.push({t:f.t,s:f.s,g:f.g,lv:f.lv,why:w.join(", ")+" (у преподавателя занято клеток: "+busy+" из "+tot+(load>tot?"; пар в неделю "+load+" — больше, чем клеток, без наложения не уместить":(busy>=tot?"; свободных клеток нет, без наложения не уместить":""))+")"+(busy>=tot?" — нагрузка не помещается в неделю, перестановкой не исправить: сократите нагрузку, объедините группы в общую пару или передайте часть другому преподавателю":"")});
    }
  });
  return{fixed:(forced||[]).length-left.length,left:left};
}
/* строки с перечнем оставшихся нарушений для сообщения */
function forcedInfo(list){
  if(!list||!list.length)return"";
  var l=list.slice(0,8).map(function(f){return"• "+f.t+" — "+f.s+" ["+f.g+"]: "+(f.why||"нарушение")});
  if(list.length>8)l.push("… и ещё "+(list.length-8));
  return l.join("\n");
}
