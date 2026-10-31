/* ВКЛАДКА «Для преподавателей»: справочник преподавателей (нагрузка, группы, дни), таблица и печать расписания преподавателей,
   файлы prepodavateli.xlsx и raspisanie_prepodavatelei.xlsx. */
/* занятия преподавателя по предметам: t.ty = {предмет: {Лек:{n:пар в неделю,r:аудитория}, Пр:{...}, Лаб:{...}}}; как набор предметов на вкладке «Расписание» */
/* максимум пар в день у одной группы (по умолчанию) */
/* свой максимум пар в день для предмета (вкладка «Предметы»): REF.mx[предмет] */
/* преподаватель отмечен только в один день недели (вкладка «Для преподавателей» → «Может быть в дни») — пары его предмета в этот день не ограничены двумя */
function teacherOneDay(tc){
  var t=REF&&REF.t&&REF.t.filter(function(x){return x.n===tc})[0];if(!t)return false;
  var nd=(t.nd||[]).filter(function(d,i,a){return d>=0&&d<S.days&&a.indexOf(d)===i});
  return S.days-nd.length===1;
}
/* группа, в которой преподаватель ведёт занятия, записывается ему в справочник */
function syncTeacherGroups(g){
  var ch=false;
  S.entries.forEach(function(e){
    if(e.g!==g)return;
    var T=REF.t.filter(function(t){return t.n===e.tc})[0];
    if(T&&T.g.indexOf(g)<0){T.g.push(g);gSort(T.g);spFromGroups(T);ch=true}
  });
  if(ch)rsave();
}
/* закрепление предмета за группами: если у предмета в t.tg есть список групп — предмет ведётся только у них; нет списка — у всех групп преподавателя */
function tgOk(t,x,g){var a=t.tg&&t.tg[x];if(!a||!a.length)return true;var gb=isKzGroup(g)?baseGroup(g).replace(/[\u041aK]$/i,""):g;return a.indexOf(g)>=0||a.indexOf(gb)>=0||a.indexOf(baseGroup(g))>=0}
/* ===== Расписание преподавателей: считается из S.entries, поэтому всегда совпадает с общим расписанием ===== */
function tchData(){
  var cell={},have={};
  S.entries.forEach(function(e){
    if(!e.tc)return;have[e.tc]=1;
    slots(e).forEach(function(x){
      var k=e.tc+"|"+x.d+"|"+(x.p-1),arr=cell[k]||(cell[k]=[]),key=e.s+"|"+x.t+"|"+(x.r||""),f=arr.filter(function(a){return a.key===key})[0];
      if(f){if(f.g.indexOf(e.g)<0)f.g.push(e.g)}else arr.push({key:key,s:e.s,t:x.t,r:x.r||"",g:[e.g]});
    });
  });
  return{cell:cell,have:have};
}
function tchBlocks(have){
  var l=Object.keys(have).sort(byr);
  return l.length?[{dept:"",name:"Все преподаватели",teachers:l}]:[];
}
function tchCell(list,tn,d,p){
  return list.map(function(a){return'<div class="c"'+(tn!==undefined?' draggable="true" data-t="'+esc(tn)+'" data-d="'+d+'" data-p="'+(p+1)+'" data-s="'+esc(a.s)+'"':"")+'>'+(tn!==undefined?'<span class="rm noprint" data-tr="1" data-t="'+esc(tn)+'" data-d="'+d+'" data-p="'+(p+1)+'" data-s="'+esc(a.s)+'" title="Убрать эту пару">×</span>':"")+esc(a.g.join(", "))+(a.r?" <b>"+esc(a.r)+"</b>":"")+"</div>"}).join("");
}
function tchHead(P,dept){
  return'<div class="xu">"Утверждаю"<br>Проректор по УМР ____________ Имангазинова Д.К.</div><div class="xt">Р А С П И С А Н И Е занятий на '+P.half+' полугодие '+P.yr+' уч. год'+(dept?'<br>Кафедра "'+esc(dept)+'"':"")+'</div>';
}
var TSEL="",TMODE="",TDEPT="";
/* режим таблицы: "" — все преподаватели; "dept" — преподаватели кафедры после «Для всей кафедры»; "one" — только выбранный преподаватель */
function tchFilter(l){
  if(TMODE==="dept")return l.filter(function(n){var t=REF.t.filter(function(x){return x.n===n})[0];return t&&(t.d||"")===TDEPT});
  if(TMODE==="one")return l.filter(function(n){return n===SELN});
  return l;
}
function updTB(){var b=$("tbla");if(!b)return;b.textContent=TMODE==="dept"?("Для преподавателя"+(SELN?" «"+SELN+"»":"")):"Для всей кафедры"}
function renderTS(){
  var D=tchData(),bl=tchBlocks(D.have),sel=$("td"),box=$("txw");
  sel.innerHTML=bl.map(function(b){return"<option>"+esc(b.name)+"</option>"}).join("");
  if(!bl.length){box.innerHTML='<p class="mu" style="color:#555;padding:8px">Пока нет занятий: расписание преподавателей появится здесь после того, как занятия будут поставлены в расписание.</p>';return}
  if(!bl.some(function(b){return b.name===TSEL}))TSEL=bl[0].name;
  sel.value=TSEL;
  var b=bl.filter(function(x){return x.name===TSEL})[0],tl=tchFilter(b.teachers),P=xjPeriod();
  if(!tl.length){box.innerHTML='<p class="mu" style="color:#555;padding:8px">У выбранного преподавателя (кафедры) пока нет занятий в расписании.</p>';updTB();return}
  var dm=gDims("txw"),tw=80+dm.rem+dm.cw*tl.length;
  var h='<div class="xh">'+tchHead(P,b.dept)+'</div><table style="table-layout:fixed;width:'+tw+'px;min-width:'+tw+'px"><colgroup><col style="width:34px"><col style="width:'+(46+dm.rem)+'px">'+tl.map(function(){return'<col style="width:'+dm.cw+'px">'}).join("")+'</colgroup><thead><tr><th class="hd">дни неде-ли</th><th class="hd">время</th>'+tl.map(function(t){return'<th class="tpick" data-tn="'+esc(t)+'" style="cursor:pointer" title="Нажми, чтобы открыть этого преподавателя в поле «Преподаватель»">'+esc(t)+"</th>"}).join("")+"</tr></thead><tbody>";
  for(var d=0;d<S.days;d++){
    for(var p=0;p<S.pairs;p++){
      var tm=String(PT[p]||"").split(":");
      h+='<tr'+(p===0?' class="ds"':"")+">"+(p===0?'<td class="dn" rowspan="'+S.pairs+'"><div>'+DK[d][0]+" - "+DK[d][1]+"</div></td>":"")+'<td class="tm">'+(tm.length>1?tm[0]+" <sup>"+tm[1]+"</sup>":esc(PT[p]||String(p+1)))+"</td>";
      tl.forEach(function(t){var c=D.cell[t+"|"+d+"|"+p];h+='<td data-t="'+esc(t)+'" data-d="'+d+'" data-p="'+(p+1)+'">'+(c?tchCell(c,t,d,p):"")+"</td>"});
      h+="</tr>";
    }
    h+='<tr class="sep"><td colspan="'+(2+tl.length)+'"></td></tr>';
  }
  box.innerHTML=h+"</tbody></table>";
}
/* ===== расписание строится из нагрузки преподавателей: предметы t.s, занятия t.ty, группы из списка групп преподавателя t.g ===== */
function tchPlan(t){
  var items=[],skipped=[];
  t.s.forEach(function(s){
    var cf=t.ty&&t.ty[s],p=cf?tyParts(cf):[];
    if(!p.length){skipped.push(s);return}
    var gs=t.g.filter(function(g){return!isDeleted(g)&&isKzSubj(s)===isKzGroup(g)&&tgOk(t,s,g)});
    if(!gs.length)gs=subjGroups(s).slice();
    if(SFON){var sc=sfGroupScope();if(sc)gs=gs.filter(function(g){return sc.indexOf(g)>=0});if(!gs.length)return}
    if(!gs.length){skipped.push(s+" (нет групп)");return}
    items.push({s:s,gs:gs,p:p});
  });
  return{items:items,skipped:skipped};
}
/* то же, что кнопка «Добавить в расписание» на вкладке «Расписание»: каждый предмет ставится через placeCfg сразу всем его группам;
   если общего времени у всех групп нет — сначала по образовательным программам, затем по одной группе. Что удалось — остаётся, остальное в отчёте */
/* причина, почему занятие группы не встало: разбор по дням недели (те же проверки, что в pickTime) */
function whyFail(g,sb,tc,p){
  var bl=makeBlocks(p,sb,tc),npairs=0;bl.forEach(function(b){npairs+=b.length});
  if(!npairs)return "нет занятий для расстановки";
  var tr=REF.t.filter(function(x){return x.n===tc})[0],nd=(tr&&tr.nd)||[];
  var rooms=p.map(function(x){return String(x.r||"").toLowerCase()}).filter(Boolean);
  var off=0,total=0,grpBusy=0,capOut=0,tchBusy=0,roomBusy=0,okSl=0,cap=maxDay(sb,tc),tl={},tN=0;
  S.entries.forEach(function(e){if(e.tc===tc)slots(e).forEach(function(x){if(!tl[x.d+"|"+x.p]){tl[x.d+"|"+x.p]=1;tN++}})});
  var freeTxt=[],capacity=0;
  for(var d=0;d<S.days;d++){
    if(nd.indexOf(d)>=0){off++;continue}
    var occ=dayOcc(g,d),capFull=subjDayN(g,sb,d)+1>cap,fr=[];
    for(var pp=1;pp<=S.pairs;pp++){
      total++;
      if(occ[pp]){grpBusy++;continue}
      if(capFull){capOut++;continue}
      var tb=S.entries.some(function(e){return e.day===d&&e.tc===tc&&e.s!==sb&&slots(e).some(function(x){return x.p===pp})});
      if(tb){tchBusy++;continue}
      var rb=rooms.length&&S.entries.some(function(e){return e.day===d&&!(e.s===sb&&e.tc===tc)&&slots(e).some(function(x){return x.p===pp&&x.r&&rooms.indexOf(String(x.r).toLowerCase())>=0})});
      if(rb){roomBusy++;continue}
      okSl++;fr.push(pp);
    }
    if(fr.length){freeTxt.push(DN[d]+": "+fr.join(","));capacity+=Math.min(fr.length,cap)}
  }
  if(!total)return "преподаватель не может ни в один день недели (все дни отмечены выходными)";
  var r=["нужно пар в неделю: "+npairs];
  r.push("у преподавателя занято клеток: "+tN+" из "+(S.days-off)*S.pairs);
  r.push("занято у самой группы: "+grpBusy);
  if(capOut)r.push("лимит пар предмета в день ("+cap+"): "+capOut);
  r.push("занято у преподавателя другими предметами: "+tchBusy);
  if(roomBusy)r.push("занята аудитория: "+roomBusy);
  r.push("свободно для постановки: "+okSl+(freeTxt.length?" ("+freeTxt.join("; ")+")":""));
  if(okSl>=npairs&&capacity<npairs)r.push("из-за лимита «Макс. пар в день» ("+cap+") в свободные дни помещается только "+capacity);
  else if(okSl>=npairs)r.push("клеток хватает, но их не удалось разложить по дням");
  else r.push("свободных клеток меньше, чем нужно пар: у преподавателя не хватает времени");
  return r.join("; ");
}
/* диалог со списком нерасставленных занятий и причиной по каждому */
function showUnplaced(list,redo){
  if(!list||!list.length)return;
  var ov=document.createElement("div");ov.className="modal-ov";
  var bx=document.createElement("div");bx.className="modal-bx";bx.style.maxWidth="860px";
  var rows=list.map(function(x){return'<tr><td style="padding:6px 8px;border-top:1px solid var(--bd);vertical-align:top">'+esc(x.t)+'</td><td style="padding:6px 8px;border-top:1px solid var(--bd);vertical-align:top">'+esc(x.s)+'</td><td style="padding:6px 8px;border-top:1px solid var(--bd);vertical-align:top;white-space:nowrap">'+esc(x.g)+'</td><td style="padding:6px 8px;border-top:1px solid var(--bd);vertical-align:top;color:#d9480f">'+esc(x.why)+"</td></tr>"}).join("");
  bx.innerHTML='<div style="font-weight:700;margin-bottom:8px">Не поместилось: '+list.length+'</div><div style="max-height:60vh;overflow:auto;margin-bottom:14px"><table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr style="text-align:left;color:var(--mu)"><th style="padding:6px 8px">Преподаватель</th><th style="padding:6px 8px">Предмет</th><th style="padding:6px 8px">Группа</th><th style="padding:6px 8px">Причина</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="btns">'+(redo?'<button type="button" data-x="2">Расставить заново</button>':'')+'<button type="button" class="g" data-x="1">Закрыть</button></div>';
  ov.appendChild(bx);document.body.appendChild(ov);
  function done(){ov.remove()}
  bx.querySelector('[data-x="1"]').onclick=done;
  var rb=bx.querySelector('[data-x="2"]');
  if(rb)rb.onclick=function(){done();redo()};
  ov.onclick=function(e){if(e.target===ov)done()};
}
/* «Расставить заново»: убираем из расписания занятия этих преподавателей по предметам, которые расставляет tchBuild, и расставляем снова (время подбирается с долей случайности) */
function tchRebuild(list,only){
  var pairs=[];
  list.forEach(function(t){tchPlan(t).items.forEach(function(it){if(only&&it.s!==only)return;pairs.push(t.n+"\u0001"+it.s)})});
  S.entries=S.entries.filter(function(e){return pairs.indexOf(e.tc+"\u0001"+e.s)<0});
  tchBuild(list,only);
  if(!$("tabR").hidden)renderTS();
}
/* only — название предмета: тогда расставляются только пары этого предмета (у выбранных преподавателей) */
/* расстановка с автоповтором: если после перестановки остались нарушения, результат этого запуска откатывается и расстановка делается заново
   (время подбирается с долей случайности) — до 10 попыток, пока не получится без нарушений; в итоге остаётся лучший вариант */
function tchBuild(list,only){
  var snap=JSON.stringify(S.entries),t0=Date.now(),best=null,bestS=null,n=0,prio={};
  for(var a=0;a<10;a++){
    if(a)S.entries=JSON.parse(snap);
    /* преподаватели, у которых в прошлых попытках остались нарушения (любые), ставятся раньше остальных — пока в расписании больше всего свободных клеток */
    var ord=a?list.slice().sort(function(x,y){return(prio[y.n]||0)-(prio[x.n]||0)}):list;
    var r=tchBuild0(ord,only,true);n++;
    r.forced.forEach(function(f){prio[f.t]=(prio[f.t]||0)+1});
    var sc=r.forced.length*1000+r.bad.length;
    if(!best||sc<best.sc){best={r:r,sc:sc};bestS=JSON.stringify(S.entries)}
    if(!r.forced.length||Date.now()-t0>25000)break;
  }
  S.entries=JSON.parse(bestS);
  save();render();
  var res=best.r;res.tries=n;
  if(res.badList.length)showUnplaced(res.badList,function(){tchRebuild(list,only)});
  return res;
}
function tchBuild0(list,only,quiet){
  var lines=[],miss=[],bad=[],badList=[],forced=[],missList=[],cnt=0,had=0,used={};
  /* два прохода: сначала предметы с лекциями, затем только практики / лабораторные — чтобы лекции стояли в неделе раньше */
  [1,2].forEach(function(ph){list.forEach(function(t){
    var pl=tchPlan(t);
    if(only){pl.items=pl.items.filter(function(it){return it.s===only});pl.skipped=pl.skipped.filter(function(x){return x===only||x.indexOf(only+" (")===0})}
    if(ph===1&&pl.skipped.length){miss.push(t.n+": "+pl.skipped.join(", "));
      pl.skipped.forEach(function(x){var ng=/ \(нет групп\)$/.test(x);missList.push({t:t.n,s:ng?x.replace(/ \(нет групп\)$/,""):x,why:ng?"не указаны группы":"не заданы пары (лекции / практики / лабораторные)"})})}
    pl.items.forEach(function(it){
      if((ph===1)!==it.p.some(function(q){return q.t==="Лек"}))return;
      /* уже стоящие пары не трогаем: добавляем только группы, у которых этого предмета у преподавателя ещё нет в расписании */
      var need=it.gs.filter(function(g){return!S.entries.some(function(e){return e.tc===t.n&&e.s===it.s&&e.g===g})});
      if(!need.length){had++;return}
      var put=function(gl){var m=placeCfg(gl,it.s,t.n,it.p);if(m){gl.forEach(function(g){used[g]=1});lines.push(t.n+" — "+it.s+" ["+gl.join(", ")+"]: "+m.join("; "))}return!!m};
      var done=false,fail=[];
      if(put(need))done=true;
      else{
        var bp={},ord=[];need.forEach(function(g){var k=specOf(g);if(!bp[k]){bp[k]=[];ord.push(k)}bp[k].push(g)});
        var rest=[];
        if(ord.length>1)ord.forEach(function(k){if(put(bp[k]))done=true;else rest=rest.concat(bp[k])});else rest=need.slice();
        var left=[];
        rest.forEach(function(g){if(put([g]))done=true;else left.push(g)});
        /* обычная расстановка не удалась — ослабляем ограничения по шагам (1: без лимита пар в день; 2: допускается наложение у преподавателя, аудитории по-прежнему не накладываются; 3: и в выходные преподавателя).
           На каждом шаге сначала все оставшиеся группы ставятся одной общей парой (один предмет и один преподаватель), затем по одной */
        var fput=function(gl,lv){var m=placeCfgL(gl,it.s,t.n,it.p,lv);if(m){gl.forEach(function(g){used[g]=1});done=true;gl.forEach(function(g){forced.push({t:t.n,s:it.s,g:g,lv:lv})});lines.push(t.n+" — "+it.s+" ["+gl.join(", ")+"] (с нарушением, ур."+lv+"): "+m.join("; "))}return!!m};
        for(var lv=1;lv<=3&&left.length;lv++){
          if(left.length>1&&fput(left,lv)){left=[];break}
          left=left.filter(function(g){return!fput([g],lv)});
        }
        left.forEach(function(g){fail.push(g);badList.push({t:t.n,s:it.s,g:g,why:whyFail(g,it.s,t.n,it.p)})});
      }
      if(done)cnt++;
      if(fail.length)bad.push(t.n+" — «"+it.s+"»: "+fail.join(", "));
    });
  })});
  /* пары, поставленные с нарушением, переставляем в места без нарушений */
  var fixed=0;
  if(forced.length){try{var rr=repairForced(forced,quiet?2500:8000);fixed=rr.fixed;forced=rr.left}catch(e){if(window.console)console.error(e)}}
  Object.keys(used).forEach(function(g){syncTeacherGroups(g)});
  /* при повторных попытках tchBuild сохранение и перерисовка делаются один раз в конце */
  if(!quiet){if(cnt)save();render()}
  if(badList.length&&!quiet)showUnplaced(badList,function(){tchRebuild(list,only)});
  return{lines:lines,miss:miss,cnt:cnt,had:had,bad:bad,badList:badList,forced:forced,fixed:fixed,missList:missList};
}
/* предметы, которые не поставлены из-за незаполненной нагрузки: список со ссылками на заполнение на вкладке «Предметы» */
function missAppend(el,list){
  if(!el||!list||!list.length)return;
  var by={},ord=[];list.forEach(function(x){if(!by[x.t]){by[x.t]=[];ord.push(x.t)}by[x.t].push(x)});
  var h='<div style="margin-top:8px"><b>Не поставлено — нужно заполнить ('+list.length+'):</b> нажми на предмет, откроется вкладка «Предметы».</div>'
    +ord.map(function(n){return'<div style="margin-top:4px">'+esc(n)+': '+by[n].map(function(x){return'<a href="#" class="ml" data-s="'+esc(x.s)+'" data-t="'+esc(x.t)+'" style="color:var(--ac);text-decoration:underline" title="'+esc(x.why)+'">'+esc(x.s)+'</a> <span class="mu">('+esc(x.why)+')</span>'}).join("; ")+'</div>'}).join("");
  var d=document.createElement("div");d.style.whiteSpace="normal";d.innerHTML=h;el.appendChild(d);
}
function openSubjFill(s,tn){
  PALL=true;PNEW=false;PKEEP=s;tab("p");
  setTimeout(function(){
    var rows=document.querySelectorAll("#pl .ptr"),el=null;
    Array.prototype.forEach.call(rows,function(r){if(r.getAttribute("data-tn")===tn)el=r});
    el=el||document.getElementById("pl");if(!el)return;
    el.scrollIntoView({behavior:"smooth",block:"center"});
    el.style.outline="2px solid var(--ac)";el.style.outlineOffset="4px";setTimeout(function(){el.style.outline=""},2500);
  },50);
}
document.addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest("a.ml");if(!a)return;
  e.preventDefault();openSubjFill(a.getAttribute("data-s"),a.getAttribute("data-t"));
});
function tmsg(t,err){var el=$("tmsg");el.style.whiteSpace="pre-line";el.style.color=err?"#d9480f":"";el.textContent=t}
$("tbla").onclick=function(){
  /* только переключает вид таблицы (вся кафедра / выбранный преподаватель); расписание не создаёт */
  if(TMODE==="dept"){TMODE="one"}
  else{TMODE="dept";TDEPT=$("ed").value}
  renderTS();updTB();
};
/* «Стереть данные»: у выбранного преподавателя убираются все предметы и закреплённые за ними группы;
   число лекций / практик / лабораторных (t.ty) остаётся и вернётся, если предмет добавить снова */
$("tera").onclick=async function(){
  var t=REF.t.filter(function(x){return x.n===SELN})[0];
  if(!t){tmsg("Выбери преподавателя.",true);return}
  if(!t.s.length&&!(t.tg&&Object.keys(t.tg).length)){tmsg("У преподавателя «"+t.n+"» нет заполненных предметов.");return}
  if(!(await askConfirm("Стереть у преподавателя «"+t.n+"» все предметы?\nКоличество лекций, практик и лабораторных сохранится.")))return;
  t.s=[];delete t.tg;
  rsave();renderR();refreshAll();
  tmsg("Предметы и группы преподавателя «"+t.n+"» стёрты. Количество лекций, практик и лабораторных сохранено.");
};
/* «Добавить в расписание» у преподавателя: расставляются пары выбранного предмета (отмечен жирным среди предметов) или всех предметов этого преподавателя; уже стоящие пары не трогаются */
$("tadd").onclick=async function(){
  var t=REF.t.filter(function(x){return x.n===SELN})[0];
  if(!t){tmsg("Выбери преподавателя.",true);return}
  if(!t.s.length){tmsg("У преподавателя «"+t.n+"» нет предметов.",true);return}
  var cs=tgCur(t),opts=[];
  if(cs)opts.push({v:"one",l:"Предмет «"+cs+"»"});
  if(t.s.length>1)opts.push({v:"all",l:"Все предметы преподавателя"});
  var v=await askChoice("Добавить в расписание пары преподавателя «"+t.n+"».\nУже стоящие пары не трогаются.",opts);
  if(v===null)return;
  var r;try{r=tchBuild([t],v==="one"?cs:undefined)}catch(e){tmsg("Не удалось расставить расписание: "+(e&&e.message||"ошибка"),true);return}
  var out=[];
  if(r.cnt)out.push("Поставлено: "+r.cnt+".");
  if(r.had)out.push("Уже стояло в расписании: "+r.had+".");
  if(r.tries>1)out.push("Расстановка повторена с другим подбором времени: попыток "+r.tries+".");
  if(r.fixed)out.push("Исправлено перестановкой пар (были с нарушением): "+r.fixed+".");
  if(r.forced&&r.forced.length)out.push("Поставлено с нарушением ограничений: "+r.forced.length+" (лимит пар в день или наложение у преподавателя, аудитории не накладываются; наложения подсвечены красным).");
  if(r.forced&&r.forced.length)out.push(forcedInfo(r.forced));
  if(r.bad.length)out.push("Не поместилось: "+r.bad.length+" (подробности в окне).");
  if(!out.length&&!r.missList.length)out.push("Нечего ставить: нет занятий по выбранному предмету.");
  tmsg(out.join("\n"));missAppend($("tmsg"),r.missList);renderTS();
};
$("tclr2").onclick=async function(){
  var t=REF.t.filter(function(x){return x.n===SELN})[0];if(!t)return;
  if(!S.entries.some(function(e){return e.tc===t.n})){tmsg("У преподавателя «"+t.n+"» в расписании нет занятий.");return}
  if(!(await askConfirm("Убрать из расписания все занятия преподавателя «"+t.n+"»?")))return;
  S.entries=S.entries.filter(function(e){return e.tc!==t.n});save();render();tmsg("Занятия преподавателя «"+t.n+"» убраны из расписания.");
};
$("txw").addEventListener("click",function(e){
  var r=e.target.closest(".rm");if(!r||!r.dataset.tr)return;
  var tn=r.dataset.t,d=+r.dataset.d,p=+r.dataset.p,sb=r.dataset.s;
  for(var i=S.entries.length-1;i>=0;i--){var en=S.entries[i];if(en.tc===tn&&en.s===sb&&en.day===d&&slots(en).some(function(x){return x.p===p}))removeSlot(i,d,p)}
  save();render();
});
/* перенос и обмен пар в таблице преподавателей: двигаются пары у всех групп, которые ведёт преподаватель в этой клетке */
function tchTake(W,tn,d,p,sb){
  var out=[];
  W.slice().forEach(function(e){
    if(e.tc!==tn||e.day!==d||(sb&&e.s!==sb)||!slots(e).some(function(x){return x.p===p}))return;
    var a=takeSlot(W,e.g,d,p);if(a)out.push(a);
  });
  return out;
}
function moveTSlot(tn,sd,sp,dd,dp,sb){
  if(sd===dd&&sp===dp)return;
  var W=JSON.parse(JSON.stringify(S.entries)),a=tchTake(W,tn,sd,sp,sb),b=tchTake(W,tn,dd,dp,null);
  if(!a.length)return;
  var placed=[],gl=[],err="";
  a.forEach(function(x){placed.push(mkSlotEntry(x,dd,dp));if(gl.indexOf(x.g)<0)gl.push(x.g)});
  b.forEach(function(x){placed.push(mkSlotEntry(x,sd,sp));if(gl.indexOf(x.g)<0)gl.push(x.g)});
  var tr=REF.t.filter(function(x){return x.n===tn})[0];
  if(tr&&tr.nd&&tr.nd.indexOf(dd)>=0)err=tn+": "+DN[dd]+" — выходной день преподавателя.";
  if(!err){err=dayLimitErr(W.concat(placed),gl,[sd,dd])}
  var bak=S.entries;
  if(!err){S.entries=W;
    for(var i=0;i<placed.length;i++){var m=conflict(placed[i]);if(m){err=m;break}S.entries.push(placed[i])}
  }
  if(err){S.entries=bak;tmsg("Не получилось переместить: "+err,true);return}
  mergeAdj(S.entries,gl);
  save();render();
  tmsg(b.length?"Пары поменялись местами.":"Пара перенесена.");
}
(function(){
  var box=$("txw"),DR=null,last=null;
  function clr(){if(last){last.classList.remove("dov");last=null}}
  box.addEventListener("dragstart",function(e){
    var c=e.target.closest&&e.target.closest(".c");if(!c||c.dataset.t===undefined)return;
    DR={t:c.dataset.t,d:+c.dataset.d,p:+c.dataset.p,s:c.dataset.s};
    e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain","slot")}catch(x){}
    c.classList.add("drg");
  });
  box.addEventListener("dragend",function(){DR=null;clr();Array.prototype.forEach.call(box.querySelectorAll(".drg"),function(x){x.classList.remove("drg")})});
  box.addEventListener("dragover",function(e){
    if(!DR)return;var td=e.target.closest("td");if(!td||td.dataset.d===undefined||td.dataset.t!==DR.t)return;
    e.preventDefault();e.dataTransfer.dropEffect="move";
    if(last!==td){clr();td.classList.add("dov");last=td}
  });
  box.addEventListener("dragleave",function(e){if(!box.contains(e.relatedTarget))clr()});
  box.addEventListener("drop",function(e){
    if(!DR)return;var td=e.target.closest("td");if(!td||td.dataset.d===undefined||td.dataset.t!==DR.t)return;
    e.preventDefault();var s0=DR;DR=null;clr();
    moveTSlot(s0.t,s0.d,s0.p,+td.dataset.d,+td.dataset.p,s0.s);
  });
})();
$("td").onchange=function(){TSEL=this.value;renderTS()};
$("tpr").onclick=function(){printTeachers()};
$("tdl").onclick=async function(){
  if(!Object.keys(tchData().have).length){askAlert("Расписание пусто — скачивать нечего.");return}
  if(!(await ensureExcelJS())){askAlert("Не удалось сделать оформленный Excel: библиотека ExcelJS не загрузилась (нет интернета?).");return}
  try{var buf=await makeXlsxFancy("teach");saveFile("raspisanie_prepodavatelei.xlsx",buf,XM)}
  catch(e){console.error(e);askAlert("Не удалось сделать файл: "+(e&&e.message?e.message:"ошибка"))}
};
/* печать расписания преподавателей: те же листы, что и для групп (до 8 преподавателей в таблице, по 2 дня на странице) */
function printTeachers(){
  var D=tchData(),bl=tchBlocks(D.have),P=xjPeriod(),AV=1065,MAXG=8,h="",firstPage=true;
  bl.forEach(function(b){
    var tl=b.teachers,hdr=false;
    for(var i=0;i<tl.length;i+=MAXG){
      var ch=tl.slice(i,i+MAXG),n=ch.length,cw=(80+200*n>AV)?Math.floor((AV-86)/n):200,pageOpen=false;
      for(var d0=0;d0<S.days;d0+=2){
        var dp=[d0,d0+1].filter(function(x){return x<S.days});
        var any=dp.some(function(d){return ch.some(function(t){for(var p=0;p<S.pairs;p++)if(D.cell[t+"|"+d+"|"+p])return true;return false})});
        if(!any)continue;
        if(!pageOpen){
          h+='<div'+(firstPage?"":' class="brk"')+'>';firstPage=false;pageOpen=true;
          if(!hdr){hdr=true;h+='<div class="xh">'+tchHead(P,b.dept)+"</div>"}
        }
        h+='<div class="ps"><table><colgroup><col style="width:34px"><col style="width:46px">'+ch.map(function(){return'<col style="width:'+cw+'px">'}).join("")+'</colgroup><thead><tr><th class="hd">дни неде-ли</th><th class="hd">время</th>'+ch.map(function(t){return"<th>"+esc(t)+"</th>"}).join("")+"</tr></thead><tbody>";
        dp.forEach(function(d){
          for(var p=0;p<S.pairs;p++){
            var tm=String(PT[p]||"").split(":");
            h+='<tr'+(p===0?' class="ds"':"")+">"+(p===0?'<td class="dn" rowspan="'+S.pairs+'"><div>'+DK[d][0]+" - "+DK[d][1]+"</div></td>":"")+'<td class="tm">'+(tm.length>1?tm[0]+" <sup>"+tm[1]+"</sup>":esc(PT[p]||String(p+1)))+"</td>";
            ch.forEach(function(t){var c=D.cell[t+"|"+d+"|"+p];h+="<td>"+(c?tchCell(c):"")+"</td>"});
            h+="</tr>";
          }
        });
        h+="</tbody></table></div>";
      }
      if(pageOpen)h+="</div>";
    }
  });
  if(!h){askAlert("Расписание пусто — печатать нечего.");return}
  var pp=$("pp");pp.innerHTML='<div class="xl">'+h+"</div>";pp.className="land";/* расписание преподавателей печатается на альбомном листе */
  var done=function(){pp.innerHTML="";pp.className="";window.removeEventListener("afterprint",done)};
  window.addEventListener("afterprint",done);
  window.print();
}
/* ===== вкладка «Справочник» ===== */
var RH=null,rt=null;
function rst(t){$("rk").textContent=t}
function applyRef(o){o=fixRef(o);
  if(PSRC||!o.sbj){o.sbj=REF.sbj||[];o.cr=REF.cr||{};o.mx=REF.mx||{};o.sg=REF.sg||{}}
  else{o.mx=Object.assign({},REF&&REF.mx||{},o.mx||{});o.sg=Object.assign({},REF&&REF.sg||{},o.sg||{})}
  if(Array.isArray(o.gr)&&!GR.length){GR=o.gr.slice();gsave()}delete o.gr;
  o.d.forEach(function(d){}); o.t.forEach(function(t){if(t.d&&!o.d.some(function(d){return d.id===t.d}))o.d.push({id:t.d,specs:[]})});
  REF=o;ensureSocial();pruneAll();renderR();refreshAll();
}
function refXlsx(){
  var a=[["Кафедра","Образовательная программа","Преподаватель","Полное ФИО","Группы","Предметы","Не может быть в дни","Занятия по предметам","Группы по предметам","Должность"]],b=[["Кафедра","Образовательные программы","Предметы кафедры"]];
  REF.t.forEach(function(t){a.push([t.d||"",t.sp.join(", "),t.n,t.f||"",t.g.join(", "),t.s.join("; "),(t.nd||[]).map(function(j){return DN[j]}).join(", "),tyStr(t),tgsStr(t),t.pos||""])});
  REF.d.forEach(function(d){b.push([d.id,d.specs.join(", "),(d.sj||[]).join("; ")])});
  var w1=XLSX.utils.aoa_to_sheet(a),w2=XLSX.utils.aoa_to_sheet(b),wb=XLSX.utils.book_new();
  w1["!cols"]=[{wch:24},{wch:14},{wch:24},{wch:34},{wch:40},{wch:70},{wch:22},{wch:60},{wch:60},{wch:30}];w2["!cols"]=[{wch:26},{wch:26},{wch:60}];
  XLSX.utils.book_append_sheet(wb,w1,"Преподаватели");XLSX.utils.book_append_sheet(wb,w2,"Кафедры");
  var sl=(REF.sbj||[]).slice();Object.keys(REF.cr||{}).forEach(function(x){if(sl.indexOf(x)<0)sl.push(x)});
  var w4=XLSX.utils.aoa_to_sheet([["Предмет","Кредиты за семестр","Макс. пар в день","Группы"]].concat(sl.map(function(x){return[x,crOf(x)?+crOf(x):"",mxOf(x),((REF.sg&&REF.sg[x])||[]).join(", ")]})));w4["!cols"]=[{wch:40},{wch:20},{wch:18},{wch:50}];if(!(PSRC||PH))XLSX.utils.book_append_sheet(wb,w4,"Предметы");
  return XLSX.write(wb,{bookType:"xlsx",type:"array"});
}
function parseRef(buf){
  var wb=XLSX.read(buf,{type:"array"}),w1=wb.Sheets["Преподаватели"],w2=wb.Sheets["Кафедры"];if(!w1)throw 0;
  var t=XLSX.utils.sheet_to_json(w1,{header:1,defval:""}).slice(1).filter(function(r){return String(r[2]).trim()}).map(function(r){return{d:String(r[0]).trim(),sp:L(r[1],","),n:String(r[2]).trim(),f:String(r[3]).trim(),g:L(r[4],","),s:L(r[5],";"),nd:L(r[6],",").map(function(x){return DN.indexOf(x)}).filter(function(j){return j>=0}),ty:tyParse(r[7]),tg:tgsParse(r[8]),pos:String(r[9]==null?"":r[9]).trim()}});
  var d=w2?XLSX.utils.sheet_to_json(w2,{header:1,defval:""}).slice(1).filter(function(r){return String(r[0]).trim()}).map(function(r){return{id:String(r[0]).trim(),specs:L(r[1],","),sj:L(r[2],";")}}):[];
  var w3=wb.Sheets["Группы"],o={d:d,t:t};
  if(w3)o.gr=XLSX.utils.sheet_to_json(w3,{header:1,defval:""}).slice(1).map(function(r){return String(r[0]).trim()}).filter(Boolean);
  var w4=wb.Sheets["Предметы"];
  if(w4){var rr=XLSX.utils.sheet_to_json(w4,{header:1,defval:""}).slice(1);
    o.sbj=rr.map(function(r){return String(r[0]).trim()}).filter(Boolean);
    o.cr={};o.mx={};o.sg={};rr.forEach(function(r){var n=String(r[0]).trim(),c=parseFloat(String(r[1]).replace(",",".")),m=parseInt(r[2],10),g=L(r[3],",");if(n&&c>0)o.cr[n]=c;if(n&&m>0)o.mx[n]=m;if(n&&g.length)o.sg[n]=g})}
  return o;
}
function rsync(now){
  if(!RH||!window.XLSX)return;clearTimeout(rt);
  rt=setTimeout(async function(){try{var w=await RH.createWritable();await w.write(refXlsx());await w.close();rst("Преподаватели: файл: «"+RH.name+"» обновлён "+new Date().toLocaleTimeString().slice(0,5))}catch(e){rst("Не удалось записать файл «"+RH.name+"»")}},now?0:400);
}
function rDownload(){if(window.XLSX)saveFile("prepodavateli.xlsx",refXlsx(),XM);else askAlert("Библиотека Excel не загрузилась.")}
async function rLink(sa){
  if(!window.showSaveFilePicker||!window.XLSX){rDownload();return}
  try{
    var h=await showSaveFilePicker({id:"schedlast",suggestedName:"prepodavateli.xlsx",types:[{description:"Excel",accept:{[XM]:[".xlsx"]}}]});
    if(await sameAs(h,[FH,GH,PH,TH])){askAlert(SAME_MSG);return}
    var f=await h.getFile();
    if(f.size>0&&!sa){try{var o=parseRef(await f.arrayBuffer());if(await askConfirm("В файле уже есть справочник.\nОК — загрузить его из файла.\nОтмена — перезаписать файл текущим справочником."))applyRef(o)}catch(e){}}
    RH=h;hSet(h,"r");rst("Преподаватели: связаны с файлом «"+h.name+"», правки сохраняются автоматически");rsync(true);
  }catch(e){if(!e||e.name!=="AbortError")rDownload()}
}
async function openR(h){
  try{if(!window.XLSX)throw 0;var f=await h.getFile();if(f.size>0)applyRef(parseRef(await f.arrayBuffer()));RH=h;rst("Преподаватели: связаны с файлом «"+h.name+"», правки сохраняются автоматически");rsync(true)}
  catch(e){rst("Не удалось открыть файл преподавателей «"+h.name+"»")}
}
function autoOpenR0(){
  if(!window.showSaveFilePicker)return;
  hGet(async function(h){
    if(!h)return;
    try{
      if(await h.queryPermission({mode:"readwrite"})==="granted")openR(h);
      else{var b=document.createElement("button");b.className="g";b.textContent="Подключить справочник «"+h.name+"»";
        b.onclick=async function(){try{if(await h.requestPermission({mode:"readwrite"})==="granted"){b.remove();openR(h)}}catch(e){}};
        $("rk").textContent="";$("rk").appendChild(b)}
    }catch(e){}
  },"r");
}
$("rsv").onclick=function(){if(window.showSaveFilePicker)rLink(!!RH);else rDownload()};
$("rdl").onclick=rDownload;
$("rld").onclick=function(){$("rfi").click()};
$("rfi").onchange=function(){var f=this.files[0];this.value="";if(!f||!window.XLSX)return;var rd=new FileReader();rd.onload=function(){try{applyRef(parseRef(rd.result));rsave()}catch(e){askAlert("Не удалось прочитать файл справочника.")}};rd.readAsArrayBuffer(f)};
var FULLN={"Кыдырбаева А.Б.": "Кыдырбаева Айгуль Бектурсыновна", "Акишев Т.Б.": "Акишев Толеутай Бодешович", "Джузбаева Б.Г.": "Джузбаева Бахыт Габидуллаевна", "Сиваракша Д.М.": "Сиваракша Далида Маратовна", "Семеньков М.Ю.": "Семеньков Михаил Юрьевич", "Асылова К.Б.": "Асылова Карлыгаш Баймухановна", "Быстрова С.В.": "Быстрова Светлана Владимировна", "Зозуля Е.С.": "Зозуля Елена Сергеевна", "Кожамжарова М.К.": "Кожамжарова Мейзгуль Кабшбековна", "Курманова Б.Т.": "Курманова Баян Тургалиевна", "Жалмагамбетова Д.К.": "Жалмагамбетова Динара Кайруллаевна", "Сейтканов С.С.": "Сейтканов Сабриден", "Абенов К.Б.": "Абенов Канат Бейсенбекович", "Ботаева Р.К.": "Ботаева Роза Кизатовна", "Ералимова Г.С.": "Ералимова Галина Сергеевна", "Жаназаров М.Ю.": "Жаназаров Марат Юсупович", "Идрисов Б.С.": "Идрисов Берикбай Серикбаевич", "Попова А.В.": "Попова Александра Викторовна", "Чердаков В.И.": "Чердаков Владимир Игоревич"};
/* «Семеньков Михаил Юрьевич» -> «Семеньков М.Ю.»; уже сокращённое оставляем как есть */
function abbr(v){var w=v.trim().split(/\s+/);if(w.length<2)return v.trim();var r=w.slice(1);
  if(r.every(function(x){return/^([^\s.]\.)+$/.test(x)||/^[^\s.]$/.test(x)}))return v.trim();
  return w[0]+" "+r.map(function(x){return x.charAt(0).toUpperCase()+"."}).join("")}
/* ===== кафедра «Социально-гуманитарных дисциплин»: добавляется, если её ещё нет; преподаватели с предметами не связаны ===== */
var SOC_DEPT="Социально-гуманитарных дисциплин";
var SOC_SUBJ=["История Казахстана (государственный экзамен)","Философия","Казахский (русский) язык","Иностранный язык","Политология","Социология","Психология","Культурология","Физическая культура","Основы права","Основы антикоррупционной культуры","Предпринимательское право","Банковское право","Антикоррупционное законодательство","Транспортное законодательство и право"];
var SOC_TCH=["Кошерова Куралай Кырымбаевна","Кебина Наталья Анатольевна","Муритова Асет Борибаевна","Тезекбаева Гульжан Амангельдиновна","Айтымова Айман Каирхановна","Бекіш Раухан Мухамедьяровна","Капаров Марат Егламбекович","Ташмуханбетов Серикбай Баженович","Кабдрахманов Болат Баянович","Магзумова Гульнар Калиевна","Мұсабекова Алдан Алтайқызы"];
function ensureSocial(){
  try{
    if(!REF||!Array.isArray(REF.d)||!Array.isArray(REF.t))return false;
    if(REF.d.some(function(d){return d.id===SOC_DEPT}))return false;
    if(!REF.sbj)REF.sbj=[];
    var dp={id:SOC_DEPT,specs:[],sj:[]};
    SOC_SUBJ.forEach(function(x){if(REF.sbj.indexOf(x)<0)REF.sbj.push(x);dp.sj.push(x)});
    REF.sbj.sort(byr);
    REF.d.push(dp);
    SOC_TCH.forEach(function(f){
      var n=abbr(f),t=REF.t.filter(function(x){return x.n===n})[0];
      if(t){if(!t.d)t.d=SOC_DEPT;return}
      REF.t.push({n:n,f:f,d:SOC_DEPT,sp:[],g:[],s:[]});
    });
    REF.t.sort(byn);
    return true;
  }catch(e){if(window.console)console.error(e);return false}
}
/* полные ФИО хранятся в справочнике (поле f); на экране показывается короткое имя */
function fillFull(){var ch=false;REF.t.forEach(function(t){if(!t.f&&FULLN[t.n]){t.f=FULLN[t.n];ch=true}});if(ch)rsave()}
var SELN="",TNEW=false,TPREV="";
function spOpts(t){var a=[];REF.d.forEach(function(d){if(t.d&&d.id!==t.d)return;d.specs.forEach(function(x){if(a.indexOf(x)<0)a.push(x)})});t.sp.forEach(function(x){if(a.indexOf(x)<0)a.push(x)});
  return a.map(function(x){return'<label style="display:flex;gap:4px;align-items:center;color:var(--tx);font-size:14px"><input type="checkbox" data-k="spc" value="'+esc(x)+'"'+(t.sp.indexOf(x)>=0?" checked":"")+"> "+esc(x)+"</label>"}).join("")||'<span class="mu">нет</span>'}
function spFromGroups(t){var all=[].concat.apply([],REF.d.map(function(d){return d.specs}));t.g.forEach(function(g){var x=g.split("-")[0];if(all.indexOf(x)>=0&&t.sp.indexOf(x)<0)t.sp.push(x)})}
function growG(){Array.prototype.forEach.call(document.querySelectorAll("#tl textarea.gt"),function(a){a.style.height="auto";a.style.height=a.scrollHeight+2+"px"})}
/* какие специальности отмечены у преподавателя: по ним показываются группы */
function gVis(t,g){var sps=esSel();return!sps.length||g.indexOf("-")<0||sps.some(function(x){return g.indexOf(x+"-")===0})}
function gSort(a){a.sort(gcmp);return a}
/* сохранённые группы (справочник, созданные и стоящие в расписании) по отмеченным специальностям */
function gSaved(t){
  ensureGroups();
  var sps=esSel();if(!sps.length)sps=[].concat.apply([],REF.d.map(function(d){return d.specs}));var h="";
  sps.forEach(function(sp){
    var l=groupsOf(sp);
    if(l.length)h+='<optgroup label="'+esc(sp)+'">'+l.map(function(g){return'<option value="'+esc(g)+'">'+esc(g)+"</option>"}).join("")+"</optgroup>";
  });
  var cg=commonGroups();if(cg.length)h+='<optgroup label="'+esc(COM)+'">'+cg.map(function(g){return'<option value="'+esc(g)+'">'+esc(g)+"</option>"}).join("")+"</optgroup>";
  return h;
}
/* группы преподавателя: выбор «кафедра → образовательная программа → номер группы → + Добавить группу», как на вкладке «Расписание» */
var TGSEL={};
function tgSpecs(){
  var sp=esSel();
  if(!sp.length){var d=REF.d.filter(function(x){return x.id===$("ed").value})[0];sp=d?d.specs.slice():[]}
  return sp;
}
function tgNums(sp){
  var m={};sp.forEach(function(x){numbersOf(x).forEach(function(n){m[n]=1})});
  commonGroups().forEach(function(n){m[n]=1});
  return Object.keys(m).sort(gcmp);
}
function tgState(t){
  var st=TGSEL[t.n]||(TGSEL[t.n]={}),sp=tgSpecs(),nu=tgNums(sp);
  if(nu.indexOf(st.n)<0)st.n="";
  return{st:st,sp:sp,nu:nu};
}
function tgSel(t){
  var o=tgState(t);
  return'<label class="f"><select data-k="tgn" title="Выбери номер группы — она сразу добавится преподавателю у отмеченных образовательных программ (если ни одна не отмечена — у всех программ кафедры)"><option value=""'+(o.st.n?"":" selected")+'>Выбрать группу…</option>'+o.nu.map(function(x){return'<option value="'+esc(x)+'"'+(x===o.st.n?" selected":"")+">"+esc(x)+"</option>"}).join("")+'</select></label>';
}
/* добавляет преподавателю группы с выбранным номером (у отмеченных программ, иначе у всех программ кафедры) */
function tgAddNum(t){
  var o=tgState(t),n=o.st.n,ex={};GR.forEach(function(g){if(!isDeleted(g))ex[g]=1});
  var gl=o.sp.map(function(x){return x+"-"+n}).filter(function(g){return ex[g]});
  if(ex[n]&&n.indexOf("-")<0)gl.push(n);
  o.st.n="";
  if(!n||!gl.length){renderT();askAlert("Такой группы нет. Поставь галочки образовательных программ вверху или создай группу на вкладке «Кафедры и группы».");return}
  gl.forEach(function(g){if(t.g.indexOf(g)<0)t.g.push(g);addGroup(g)});gSort(t.g);spFromGroups(t);
  rsave();renderT();refreshAll();
}
/* закрепление предметов за группами преподавателя: t.tg = {предмет: [группы]}; если у предмета группы не выбраны — он у всех групп преподавателя */
function tgAssigned(t,s){return((t.tg&&t.tg[s])||[]).filter(function(g){return t.g.indexOf(g)>=0})}
/* предмет преподавателя, выбранный сейчас: группы, отмеченные галочкой, закрепляются за ним */
var TGCUR={};
function tgCur(t){var s=TGCUR[t.n];if(!s||t.s.indexOf(s)<0)s=t.s[0]||"";TGCUR[t.n]=s;return s}
function tgSet(t,sub,list){
  list=gSort(list.slice());
  if(!t.tg)t.tg={};
  if(list.length)t.tg[sub]=list;else delete t.tg[sub];
  if(!Object.keys(t.tg).length)delete t.tg;
}
function tgsStr(t){var o=t.tg||{};return Object.keys(o).filter(function(s){return o[s]&&o[s].length}).map(function(s){return s+"|"+o[s].join(",")}).join("; ")}
function tgsParse(v){var o={};String(v||"").split(";").forEach(function(p){var a=p.split("|"),s=a[0].trim(),g=(a[1]||"").split(",").map(function(x){return x.trim()}).filter(Boolean);if(s&&g.length)o[s]=g});return o}
function daySum(t){
  var all=DN.slice(0,S.days),sel=all.filter(function(x,j){return(t.nd||[]).indexOf(j)<0});
  return sel.length===all.length?"Все дни":(sel.length?sel.join(", "):"Нет дней");
}
function daySel(t){
  return'<div class="f"><span>Дни</span><div class="cbw dsw" style="min-width:150px"><button type="button" class="g dbtn" style="text-align:left" title="Выбери дни: клик — выбрать или снять день, двойной клик — оставить только этот день">'+esc(daySum(t))+' \u25be</button><div class="cbl dlist" hidden>'
   +'<div class="o dall'+(daySum(t)==="Все дни"?" cur":"")+'" style="user-select:none" title="Выбрать все дни"><span style="display:inline-block;width:18px;color:var(--ac)">'+(daySum(t)==="Все дни"?"\u2713":"")+"</span>Все дни</div>"
   +DN.slice(0,S.days).map(function(x,j){var on=(t.nd||[]).indexOf(j)<0;return'<div class="o dopt'+(on?" cur":"")+'" data-d="'+j+'" style="user-select:none"><span style="display:inline-block;width:18px;color:var(--ac)">'+(on?"\u2713":"")+"</span>"+x+"</div>"}).join("")
   +'</div></div></div>';
}
/* группы, показываемые у преподавателя: его собственные + все группы отмеченных специальностей (как на вкладке «Предметы») */
function tgShown(t){
  var l=t.g.filter(function(g){return gVis(t,g)});
  esSel().forEach(function(sp){groupsOf(sp).forEach(function(g){if(l.indexOf(g)<0)l.push(g)})});
  return gSort(l);
}
function tgChips(t){
  var l=tgShown(t),cs=tgCur(t),as=tgAssigned(t,cs);
  return'<div class="row" style="margin:0 0 6px"><div class="f" style="max-width:100%;flex-basis:100%"><span style="font-size:13px;color:var(--mu)">Группы</span><div style="display:flex;flex-wrap:wrap;align-items:center;margin-top:6px">'
   +(l.length?l.map(function(g){var own=t.g.indexOf(g)>=0;return'<span class="chip'+(as.indexOf(g)>=0?" ok":"")+'"'+' data-tg="tog" data-g="'+esc(g)+'" title="'+(own?(cs?"Нажми, чтобы закрепить группу за предметом «"+esc(cs)+"» или открепить":"Сначала добавь предмет"):"Группа ещё не добавлена преподавателю — нажми, чтобы добавить")+'">'+esc(g)+(own?' <b data-tg="x" data-g="'+esc(g)+'" title="Убрать группу у преподавателя">\u00d7</b>':"")+"</span>"}).join(""):'<span class="mu">Выбери группу в списке — она добавится сама</span>')
   +"</div>"+'<div class="row" style="margin:6px 0 0;align-items:flex-end">'+tgSel(t)+(l.length&&cs?'<button type="button" data-tg="all" title="Закрепить за предметом все показанные группы (недостающие добавятся преподавателю)">Выбрать все</button><button class="g" type="button" data-tg="none" title="Снять закрепление со всех групп">Снять все</button>':"")+"</div></div></div>";
}
function tgEdit(el,r){
  var t=REF.t[+r.dataset.i];if(!t)return;
  if(el.dataset.k==="tgn"){(TGSEL[t.n]||(TGSEL[t.n]={})).n=el.value;if(el.value)tgAddNum(t);return}
}
function tgClick(e){
  var b=e.target.closest("[data-tg]");if(!b)return;
  var r=b.closest(".tr");if(!r)return;var t=REF.t[+r.dataset.i];if(!t)return;
  var a=b.dataset.tg;
  if(a==="sel"){if(e.target.closest("[data-a]"))return;TGCUR[t.n]=b.dataset.s;renderT();return}
  if(a==="all"||a==="none"){
    e.preventDefault();var cs1=tgCur(t);if(!cs1)return;
    if(a==="all"){var sh=tgShown(t);sh.forEach(function(g){if(t.g.indexOf(g)<0){t.g.push(g);addGroup(g)}});gSort(t.g);spFromGroups(t);tgSet(t,cs1,sh)}else tgSet(t,cs1,[]);
    rsave();renderT();refreshAll();return;
  }
  if(a==="tog"){
    var cs0=tgCur(t),gg=b.dataset.g;
    if(t.g.indexOf(gg)<0){
      /* группа специальности, которой у преподавателя ещё нет: добавляем; если за предметом уже закреплены группы — закрепляем и её */
      var pre=cs0?tgAssigned(t,cs0).slice():[];
      t.g.push(gg);addGroup(gg);gSort(t.g);spFromGroups(t);
      if(pre.length){pre.push(gg);tgSet(t,cs0,pre)}
      rsave();renderT();refreshAll();return;
    }
    if(!cs0){askAlert("Сначала добавь преподавателю предмет и выбери его.");return}
    var ls=tgAssigned(t,cs0).slice(),ix=ls.indexOf(gg);
    if(ix>=0)ls.splice(ix,1);else ls.push(gg);
    tgSet(t,cs0,ls);rsave();renderT();refreshAll();return;
  }
  if(a==="x"){var g=b.dataset.g;tClean(t,function(x){return x!==g});rsave();renderT();refreshAll();return}
  if(a==="add"){tgAddNum(t)}
}
function renderT(){
  renderG();
  /* копии кафедры и специальностей на вкладке «Справочник» (главные — на вкладке «Кафедры и группы») */
  $("ed2").innerHTML=$("ed").innerHTML.replace(/<option value="__new__">[^<]*<\/option>/,"");$("ed2").value=$("ed").value;
  $("es2").innerHTML=$("es").innerHTML;
  Array.prototype.forEach.call($("es2").querySelectorAll("input"),function(c,i){c.checked=$("es").querySelectorAll("input")[i]?$("es").querySelectorAll("input")[i].checked:false});
  var d=$("ed").value,sps=esSel(),h="";
  var spOk=function(t){return!sps.length||sps.some(function(x){return t.sp.indexOf(x)>=0})};
  var lst=REF.t.filter(function(t){
    if((t.d||"")!==d)return false;
    return spOk(t)||t.n===SELN;
  });
  if(!TNEW&&!lst.some(function(t){return t.n===SELN}))SELN=lst.length?lst[0].n:"";
  $("tsel").innerHTML='<option value="__new__">＋ Новый преподаватель…</option>'+lst.map(function(t){return'<option value="'+esc(t.n)+'">'+esc(t.n)+"</option>"}).join("");$("tsel").value=TNEW?"__new__":SELN;
  $("tnw").style.display=TNEW?"":"none";$("tdel").style.display=TNEW?"none":"";
  (function(){var ct=REF.t.filter(function(t){return t.n===SELN&&(t.d||"")===d})[0]||REF.t.filter(function(t){return t.n===SELN})[0],ps={};
    REF.t.forEach(function(t){if(t.pos)ps[t.pos]=1});$("tposl").innerHTML=Object.keys(ps).sort().map(function(x){return'<option value="'+esc(x)+'">'}).join("");
    $("dsw0").innerHTML=(ct&&!TNEW)?daySel(ct):"";
    $("tposw").style.display=TNEW?"none":"";$("tpos").disabled=!ct;if(document.activeElement!==$("tpos"))$("tpos").value=ct&&ct.pos?ct.pos:""})();["tclr2","tera","tadd"].forEach(function(id){$(id).disabled=TNEW});
  var dopt=function(v){return REF.d.map(function(x){return'<option value="'+esc(x.id)+'"'+(x.id===v?" selected":"")+">"+esc(x.id)+"</option>"}).join("")};
  REF.t.forEach(function(t,i){
    if((t.d||"")!==d||t.n!==SELN){return}
    h+='<div class="tr" data-i="'+i+'" data-n="'+esc(t.n)+'">'+tgChips(t)
     +''
     +'<div class="row" style="margin:0 0 6px"><div class="f" style="max-width:100%;flex-basis:100%"><span style="font-size:13px;color:var(--mu)">Предметы</span></div></div>'+"<div>"+t.s.map(function(x,j){var ag=tgAssigned(t,x);return'<span class="chip'+(x===tgCur(t)?" on":"")+((t.ty&&t.ty[x])?" ok":"")+'" data-tg="sel" data-s="'+esc(x)+'" title="Нажми, чтобы выбрать предмет и закрепить за ним группы. Лекции / практики / лабораторные назначаются на вкладке «Предметы»">'+esc(x)+(ag.length?' <em title="Закреплён за группами: '+esc(ag.join(", "))+'">· гр.: '+ag.length+'</em>':"")+'<b data-a="rs" data-j="'+j+'" title="Убрать">×</b></span>'}).join("")+"</div>"
     +'<div class="row" style="margin:6px 0 0"><input type="text" list="dl" data-k="ns" size="30" placeholder="Выбрать предмет"><button class="g" data-a="as" type="button">+ Предмет</button></div>'+'</div>';
  });
  $("tl").innerHTML=TNEW?"":(h||'<p class="mu">Здесь пока нет преподавателей.</p>');growG();[].forEach.call($("tl").querySelectorAll("select"),function(x){combo(x)});
}
$("ed2").onchange=function(){PALL=false;$("ed").value=this.value;renderR()};
$("es2").addEventListener("change",function(){
  var a=this.querySelectorAll("input"),b=$("es").querySelectorAll("input");
  Array.prototype.forEach.call(a,function(c,i){if(b[i])b[i].checked=c.checked});renderT();
});
$("tsel").onchange=function(){
  if(this.value==="__new__"){TPREV=SELN;TNEW=true;SELN="";renderT();$("tnn").focus();return}
  TNEW=false;SELN=this.value;renderT();if(TMODE==="one")renderTS();updTB()};
$("tpos").oninput=function(){
  var d=$("ed").value,ct=REF.t.filter(function(t){return t.n===SELN&&(t.d||"")===d})[0]||REF.t.filter(function(t){return t.n===SELN})[0];
  if(!ct)return;var v=this.value.replace(/\s+/g," ").trim();if(v)ct.pos=v;else delete ct.pos;rsave();
};
$("tnx").onclick=function(){TNEW=false;SELN=TPREV;$("tnn").value="";$("tnp").value="";renderT()};
/* клик по фамилии преподавателя в таблице расписания -> он выбирается в поле «Преподаватель» */
$("txw").addEventListener("click",function(e){
  var th=e.target.closest("th.tpick");if(!th)return;
  var n=th.dataset.tn,t=REF.t.filter(function(x){return x.n===n})[0];
  if(!t){askAlert("Преподавателя «"+n+"» нет в справочнике.");return}
  TNEW=false;SELN=n;
  var ed=$("ed"),d=t.d||"";
  if(ed.value!==d&&[].some.call(ed.options,function(o){return o.value===d})){ed.value=d;PALL=false;renderR()}else renderT();
  var ts=$("tsel");if(ts){ts.value=n;ts.scrollIntoView({behavior:"smooth",block:"center"})}
});
$("tdel").onclick=async function(){
  var i=REF.t.findIndex(function(t){return t.n===SELN});if(i<0)return;
  var t=REF.t[i];
  var ne=S.entries.filter(function(e){return e.tc===t.n}).length;
  if(!(await askConfirm('Удалить преподавателя "'+(t.f||t.n)+'"?'+(ne?"\nЕго занятия в расписании ("+ne+") тоже будут убраны.":""))))return;
  if(ne){S.entries=S.entries.filter(function(e){return e.tc!==t.n});save();render()}
  REF.t.splice(i,1);SELN="";rsave();renderT();refreshAll();
};
$("es").addEventListener("change",renderT);
$("tna").onclick=function(){
  var v=$("tnn").value.trim();if(!v)return;
  var fl=abbr(v)!==v?v:"";v=abbr(v);
  if(REF.t.some(function(t){return t.n===v})){askAlert("Такой преподаватель уже есть.");return}
  var nt={n:v,f:fl,d:$("ed").value,sp:esSel(),g:[],s:[]},np=$("tnp").value.replace(/\s+/g," ").trim();if(np)nt.pos=np;
  REF.t.push(nt);REF.t.sort(byn);
  TNEW=false;SELN=v;$("tnn").value="";$("tnp").value="";rsave();renderT();refreshAll();
  Array.prototype.forEach.call($("tl").querySelectorAll(".tr"),function(r){if(r.dataset.n===v){r.scrollIntoView({block:"center"});var f=r.querySelector('[data-k="nm"]');if(f)f.focus()}});
};
$("tl").addEventListener("input",function(e){if(e.target.classList.contains("gt"))growG()});
$("tl").addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target.classList.contains("gt")){e.preventDefault();e.target.blur()}});
window.addEventListener("resize",growG);
$("tnn").addEventListener("keydown",function(e){if(e.key==="Enter")$("tna").click()});
$("tnp").addEventListener("keydown",function(e){if(e.key==="Enter")$("tna").click()});
$("tl").addEventListener("change",function(e){
  var el=e.target,r=el.closest(".tr"),k=el.dataset.k;if(!r||!k||k==="ns"||k==="ns2")return;if(k.charAt(0)==="t"&&k.charAt(1)==="g"){tgEdit(el,r);return}
  var t=REF.t[+r.dataset.i],v=el.value.trim();
  if(k==="day"){t.nd=Array.prototype.map.call(r.querySelectorAll('[data-k="day"]'),function(c,j){return c.checked?-1:j}).filter(function(x){return x>=0});Array.prototype.forEach.call(r.querySelectorAll('[data-k="day"]'),function(c){c.parentNode.classList.toggle("ok",c.checked)});rsave();var dh=r.querySelector(".dnh");if(dh)dh.hidden=r.querySelectorAll('[data-k="day"]:checked').length!==1;return}
  if(k==="nm"&&t.f){if(!v){el.value=t.f;return}t.f=v}else if(k==="nm"){
    var sh=abbr(v);
    if(!v||REF.t.some(function(x){return x!==t&&x.n===sh})){el.value=t.f||t.n;return}
    S.entries.forEach(function(x){if(x.tc===t.n)x.tc=sh});if(SELN===t.n)SELN=sh;t.n=sh;if(sh!==v)t.f=v;save();REF.t.sort(byn);
  }else if(k==="spc")t.sp=Array.prototype.map.call(r.querySelectorAll('[data-k="spc"]:checked'),function(x){return x.value});else if(k==="g"){
    var typed=L(v,",");
    if(GSRC){var mp={},bad=[];GR.forEach(function(x){if(!isDeleted(x))mp[gKey(x)]=x});typed=typed.map(function(x){var m=mp[gKey(x)];if(!m)bad.push(x);return m}).filter(Boolean);
      if(bad.length)askAlert("Этих групп нет в файле групп: "+bad.join(", ")+". Сначала создай их на вкладке «Кафедры и группы».")}
    t.g=gSort(t.g.filter(function(g){return!gVis(t,g)}).concat(typed));if(!GSRC)t.g.forEach(addGroup);spFromGroups(t)}else if(k==="gs"){if(v&&t.g.indexOf(v)<0)t.g.push(v);if(v)addGroup(v);gSort(t.g);spFromGroups(t)}else t[k]=v;
  rsave();renderT();refreshAll();
});
$("tl").addEventListener("click",tgClick);
/* выбор дней преподавателя: клик — выбрать/снять день, двойной клик — оставить только этот день */
function curT(){var d=$("ed").value;return REF.t.filter(function(t){return t.n===SELN&&(t.d||"")===d})[0]||REF.t.filter(function(t){return t.n===SELN})[0]}
function daySet(r,t,sel){
  t.nd=[];for(var j=0;j<S.days;j++)if(sel.indexOf(j)<0)t.nd.push(j);
  rsave();
  Array.prototype.forEach.call(r.querySelectorAll(".dopt"),function(o){var on=sel.indexOf(+o.dataset.d)>=0;o.classList.toggle("cur",on);o.firstChild.textContent=on?"\u2713":""});
  var da=r.querySelector(".dall");if(da){var all=sel.length===S.days;da.classList.toggle("cur",all);da.firstChild.textContent=all?"\u2713":""}
  var b=r.querySelector(".dbtn");if(b)b.textContent=daySum(t)+" \u25be";
  var dh=r.querySelector(".dnh");if(dh)dh.hidden=!teacherOneDay(t.n);
}
$("dsw0").addEventListener("click",function(e){
  var btn=e.target.closest&&e.target.closest(".dbtn");
  if(btn){var l=btn.parentNode.querySelector(".dlist");var was=l.hidden;
    Array.prototype.forEach.call(document.querySelectorAll(".dlist"),function(x){x.hidden=true});l.hidden=!was;return}
  var al=e.target.closest&&e.target.closest(".dall");
  if(al){var r0=$("dsw0"),t0=curT();if(!t0)return;var all=[];for(var k=0;k<S.days;k++)all.push(k);daySet(r0,t0,all);return}
  var o=e.target.closest&&e.target.closest(".dopt");if(!o)return;
  var r=$("dsw0"),t=curT();if(!t)return;
  var sel=[];for(var j=0;j<S.days;j++)if((t.nd||[]).indexOf(j)<0)sel.push(j);
  var d=+o.dataset.d,ix=sel.indexOf(d);if(ix>=0)sel.splice(ix,1);else sel.push(d);
  daySet(r,t,sel);
});
$("dsw0").addEventListener("dblclick",function(e){
  var o=e.target.closest&&e.target.closest(".dopt");if(!o)return;
  var r=$("dsw0"),t=curT();if(!t)return;
  e.preventDefault();daySet(r,t,[+o.dataset.d]);
});
document.addEventListener("click",function(e){if(e.target.closest&&e.target.closest(".dsw"))return;Array.prototype.forEach.call(document.querySelectorAll(".dlist"),function(x){x.hidden=true})});
$("tl").addEventListener("click",async function(e){
  var b=e.target.closest("[data-a]");if(!b)return;
  var r=b.closest(".tr"),i=+r.dataset.i,t=REF.t[i],a=b.dataset.a;
  if(a==="rs"){var _rx=t.s.splice(+b.dataset.j,1)[0];if(t.ty){delete t.ty[_rx];if(!Object.keys(t.ty).length)delete t.ty}if(t.tg){delete t.tg[_rx];if(!Object.keys(t.tg).length)delete t.tg}}
  else if(a==="as"){var v=r.querySelector('[data-k="ns"]').value.trim();if(!v)return;if(PSRC&&!sbjSet()[v]){askAlert("Предмета «"+v+"» нет в файле предметов. Сначала добавь его на вкладке «Предметы».");return}if(t.s.indexOf(v)<0){t.s.push(v);t.s.sort(byr)}}
  else if(a==="dt"){if(!(await askConfirm('Удалить преподавателя "'+t.n+'"?')))return;REF.t.splice(i,1);SELN=""}
  rsave();renderR();refreshAll();
});
$("tl").addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target.dataset.k==="ns"){e.preventDefault();e.target.closest(".tr").querySelector('[data-a="as"]').click()}});
/* ===== отдельный файл расписания преподавателей (raspisanie_prepodavatelei.xlsx) ===== */
var TH=null,tht=null,TCH_FILE="raspisanie_prepodavatelei.xlsx";
function tkst(t){var e=$("tk");if(e)e.textContent=t}
function tsync(now){
  if(!TH)return;clearTimeout(tht);
  tht=setTimeout(async function(){
    try{
      if(!Object.keys(tchData().have).length){tkst("Расписание преподавателей пока пусто: файл «"+TH.name+"» не менялся");return}
      if(!(await ensureExcelJS()))throw new Error("библиотека ExcelJS не загрузилась (нет интернета?)");
      var buf=await makeXlsxFancy("teach");
      var w=await TH.createWritable();await w.write(buf);await w.close();
      tkst("Расписание преподавателей: файл: «"+TH.name+"» обновлён "+new Date().toLocaleTimeString().slice(0,5));
    }catch(e){tkst("Не удалось записать файл «"+TH.name+"»"+(e&&e.message?": "+e.message:""))}
  },now?0:600);
}
async function tLink(){
  if(!window.showSaveFilePicker){$("tdl").onclick();return}
  try{
    var h=await showSaveFilePicker({id:"schedlast",suggestedName:TCH_FILE,types:[{description:"Excel",accept:{[XM]:[".xlsx"]}}]});
    if(await sameAs(h,[FH,RH,GH,PH])){askAlert(SAME_MSG);return}
    TH=h;hSet(h,"t");tkst("Расписание преподавателей сохраняется в файл «"+h.name+"» автоматически");tsync(true);
  }catch(e){if(!e||e.name!=="AbortError")$("tdl").onclick()}
}
$("tsv").onclick=tLink;
function autoOpenT0(){
  if(!window.showSaveFilePicker)return;
  hGet(async function(h){
    if(!h)return;
    try{
      if(await h.queryPermission({mode:"readwrite"})==="granted"){TH=h;tkst("Расписание преподавателей сохраняется в файл «"+h.name+"» автоматически");tsync(true)}
      else{var b=document.createElement("button");b.className="g";b.textContent="Подключить файл преподавателей «"+h.name+"»";
        b.onclick=async function(){try{if(await h.requestPermission({mode:"readwrite"})==="granted"){b.remove();TH=h;tkst("Расписание преподавателей сохраняется в файл «"+h.name+"» автоматически");tsync(true)}}catch(e){}};
        $("tk").textContent="";$("tk").appendChild(b)}
    }catch(e){}
  },"t");
}
