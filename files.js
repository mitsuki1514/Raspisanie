/* ВКЛАДКА «Файлы»: выбор папки, общие функции работы с файлами (сохранение, хранилище дескрипторов),
   импорт нагрузки и «выписок» кафедр, автозагрузка. */
/* ===== Excel ===== */
function saveFile(name,data,type){
  function legacy(){var b=new Blob([data],{type:type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
  function viaClaude(){
    if(window.claude&&claude.use){
      claude.use("downloads").then(function(d){
        if(!d){legacy();return}
        d.save({filename:name,data:data}).catch(function(e){if(!e||e.code!=="declined")askAlert("Не удалось сохранить файл"+(e&&e.message?": "+e.message:""))});
      }).catch(legacy);
    }else legacy();
  }
  if(window.showSaveFilePicker){
    (async function(){
      try{
        var ext=name.split(".").pop(),acc={};acc[String(type).split(";")[0]]=["."+ext];
        var h=await showSaveFilePicker({id:"schedlast",suggestedName:name,types:[{description:ext.toUpperCase()+" файл",accept:acc}]});
        var w=await h.createWritable();await w.write(data);await w.close();
      }catch(e){if(e&&e.name==="AbortError")return;viaClaude()}
    })();
    return;
  }
  viaClaude();
}
/* три файла (расписание, преподаватели, группы) должны быть разными */
async function sameAs(h,list){for(var i=0;i<list.length;i++){var o=list[i];if(o&&o!==h&&o.isSameEntry){try{if(await o.isSameEntry(h))return true}catch(e){}}}return false}
var SAME_MSG="Этот файл уже занят другим разделом. Расписание групп, расписание преподавателей, справочник преподавателей, список групп и список предметов хранятся в пяти разных файлах — выбери другое имя.";
/* автосвязь с файлом: чтение при открытии, запись при каждом изменении */
var _idb=null;
function idb(cb){
  if(_idb)return cb(_idb);/* соединение открывается один раз */
  try{var r=indexedDB.open("schedb",1);r.onupgradeneeded=function(){r.result.createObjectStore("h")};
    r.onsuccess=function(){_idb=r.result;_idb.onclose=function(){_idb=null};_idb.onversionchange=function(){try{_idb.close()}catch(e){}_idb=null};cb(_idb)};
    r.onerror=function(){cb(null)}}catch(e){cb(null)}
}
function hGet(cb,k){idb(function(db){if(!db)return cb(null);try{var q=db.transaction("h").objectStore("h").get(k||"f");q.onsuccess=function(){cb(q.result||null)};q.onerror=function(){cb(null)}}catch(e){cb(null)}})}
function hSet(v,k){idb(function(db){if(db)try{db.transaction("h","readwrite").objectStore("h").put(v,k||"f")}catch(e){}})}
/* ===== загрузка нагрузки кафедры из Excel (колонки: Группа, ПЛАТОН, РЕАЛ, ДИСЦИПЛИНА КАЗ, ДИСЦИПЛИНА РУС, ГРУППЫ, КР, … ) ===== */
function loadPlan(rows,N){
  if(!rows||rows.length<2)return null;
  var hd=rows[0].map(function(x){return String(x==null?"":x).trim().toUpperCase()});
  function ix(n,d){var i=hd.indexOf(n);return i<0?d:i}
  var cG=ix("ГРУППА",0),cP=ix("ПЛАТОН",1),cR=ix("РЕАЛ",2),cK=ix("ДИСЦИПЛИНА КАЗ",3),cU=ix("ДИСЦИПЛИНА РУС",4),cL=ix("ГРУППЫ",5),cC=ix("КР",6),cN=ix("ПРИМЕЧАНИЕ",10),cLK=ix("ЛК",-1),cPR=ix("ПР",-1),cLB=ix("ЛБ",-1);
  var dept=REF.d.filter(function(d){return d.id===N})[0];if(!dept)return null;
  var progs={},own={},grSet={};
  REF.d.forEach(function(d){d.specs.forEach(function(x){progs[x]=1})});
  dept.specs.forEach(function(x){own[x]=1});
  GR.forEach(function(g){if(!isDeleted(g))grSet[g]=1});
  function toks(str){
    var out=[],re=/([А-ЯЁA-Z]{1,5})-(\d{2})(ск|вв|к|с)?(\([^()]*\))?/gi,m;str=String(str||"");
    while((m=re.exec(str))){var g0=nrm(m[1]+"-"+m[2]+(m[3]||"")),g=(m[4]&&grSet[g0+m[4]])?g0+m[4]:g0;if(progs[g0.split("-")[0]]&&out.indexOf(g)<0)out.push(g)}
    return out;
  }
  function tnames(str){return String(str==null?"":str).split(/[;\/]/).map(function(x){return x.replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim()}).filter(function(x){return x&&!/^вакан/i.test(x)})}
  function findT(nm){
    var low=nm.toLowerCase(),ex=REF.t.filter(function(t){return t.n.toLowerCase()===low});if(ex.length)return ex[0];
    if(nm.indexOf(".")>=0)return null;
    var c=REF.t.filter(function(t){return t.n.toLowerCase().split(/[\s.]/)[0]===low.split(/[\s.]/)[0]});
    if(c.length===1)return c[0];
    var cd=c.filter(function(t){return t.d===N});return cd.length===1?cd[0]:null;
  }
  var T={},subj={},addG={},skipG={},noteRows=0,used=0;
  for(var i=1;i<rows.length;i++){
    var r=rows[i];if(!r||!r.some(function(v){return String(v==null?"":v).trim()}))continue;
    if(String(r[cP]==null?"":r[cP]).trim().toUpperCase()==="ПЛАТОН")continue;/* повторная строка заголовков */
    used++;
    if(cN<r.length&&String(r[cN]==null?"":r[cN]).trim())noteRows++;
    var base=toks(r[cG])[0]||"",kz=base&&isKzGroup(base);
    var gl=toks(r[cL]);if(base&&gl.indexOf(base)<0)gl.push(base);
    var good=[];gl.forEach(function(g){
      if(own[g.split("-")[0]]){if(!grSet[g])addG[g]=1;good.push(g)}
      else if(grSet[g])good.push(g);else skipG[g]=1;
    });
    /* дисциплина — из «ДИСЦИПЛИНА РУС»; для групп с припиской «к» — из «ДИСЦИПЛИНА КАЗ» (если КАЗ пуст — РУС): выбирается для каждой группы отдельно */
    var gk=good.filter(function(g){return isKzGroup(g)}),gu=good.filter(function(g){return!isKzGroup(g)}),vr=[];
    if(gu.length)vr.push({kz:false,g:gu});if(gk.length)vr.push({kz:true,g:gk});if(!vr.length)vr.push({kz:!!kz,g:[]});
    var sK=String(r[cK]==null?"":r[cK]).trim(),sU=String(r[cU]==null?"":r[cU]).trim();
    vr.forEach(function(v){v.nm=tplSubj(((v.kz?(sK||sU):sU)).replace(/\s+/g," ").trim())});
    vr.forEach(function(v){
      if(!v.nm)return;
      var o=subj[v.nm]||(subj[v.nm]={cr:{}});var cr=parseFloat(String(r[cC]==null?"":r[cC]).replace(",","."));
      if(cr>0)o.cr[cr]=(o.cr[cr]||0)+1;
    });
    /* преподаватель — из столбца «ПЛАТОН» */
    var names=tnames(r[cP]);
    names.forEach(function(n0){
      var t=findT(n0),key=t?"t:"+t.n:"n:"+n0,e=T[key]||(T[key]={t:t,n:t?t.n:n0,s:{},g:{},h:{},sg:{}});
      vr.forEach(function(v){
        if(!v.nm)return;
        e.s[v.nm]=1;var hh=e.h[v.nm]||(e.h[v.nm]={}),sgo=e.sg[v.nm]||(e.sg[v.nm]={});
        [["lk",cLK],["pr",cPR],["lb",cLB]].forEach(function(p){if(p[1]<0)return;var x=parseFloat(String(r[p[1]]==null?"":r[p[1]]).replace(",","."));if(x>0)hh[p[0]]=Math.max(hh[p[0]]||0,x)});
        v.g.forEach(function(g){sgo[g]=1});
      });
      good.forEach(function(g){e.g[g]=1});
    });
  }
  var P={N:N,rows:used,noteRows:noteRows,addGroups:Object.keys(addG),skipGroups:Object.keys(skipG),subjects:Object.keys(subj),cr:{},crConflict:0,T:[]};
  Object.keys(subj).forEach(function(n){
    var ks=Object.keys(subj[n].cr);if(!ks.length)return;
    ks.sort(function(a,b){return subj[n].cr[b]-subj[n].cr[a]});P.cr[n]=+ks[0];if(ks.length>1)P.crConflict++;
  });
  Object.keys(T).forEach(function(k){
    var e=T[k],mode=!e.t?"new":((e.t.d===N||!e.t.d)?"replace":"merge");
    P.T.push({t:e.t,n:e.n,mode:mode,s:Object.keys(e.s),g:Object.keys(e.g),h:e.h,sg:Object.keys(e.sg).reduce(function(o,k){o[k]=Object.keys(e.sg[k]);return o},{})});
  });
  return P;
}
/* ===== выписка (шаблон): блоки «группа → строки дисциплин»; столбцы ПЛАТОН, РЕАЛ, ДИСЦИПЛИНА КАЗ/РУС, Семестр, ГРУППЫ, КР, ЛК, ПР, ЛБ ===== */
var TPL_H=15;
/* часов за семестр на одну пару в неделю: ЛК 45 / ПР 30 / ЛБ 15 = 3 / 2 / 1 пар в неделю (максимум); не кратное 15 округляется вверх */
function tplIs(rows){var h=(rows[0]||[]).map(function(x){return String(x==null?"":x).trim().toUpperCase()});return h.indexOf("ПЛАТОН")===0&&h.indexOf("ГРУППА")<0&&h.indexOf("СЕМЕСТР")>=0}
function tplFlat(rows){
  var out=[["Группа","ПЛАТОН","РЕАЛ","ДИСЦИПЛИНА КАЗ","ДИСЦИПЛИНА РУС","ГРУППЫ","КР","ЛК","ПР","ЛБ"]],base="";
  for(var i=1;i<rows.length;i++){
    var r=rows[i]||[];function c(k){return String(r[k]==null?"":r[k]).trim()}
    if(c(0).toUpperCase()==="ПЛАТОН"&&(c(1).toUpperCase()==="РЕАЛ"||c(3).toUpperCase().indexOf("ДИСЦИПЛИНА")===0))continue;/* повторная строка заголовков таблицы между блоками групп */
    var rest=false;for(var k=1;k<10;k++)if(c(k)){rest=true;break}
    if(!rest){if(c(0))base=c(0);continue}/* строка-заголовок блока: в ней только группа */
    out.push([base,c(0),c(1),c(2),c(3),c(5),c(6),c(7),c(8),c(9)]);
  }
  return out;
}
/* «Алгоритмы, структуры данных и программирование» ↔ «Алгоритмы, СД и прогр.»: каждое слово сокращения — начало слова полного названия (заглавные 2–3 буквы — первые буквы слов) */
function abMatch(ab,full){
  var STOP={"и":1,"және":1,"в":1,"на":1,"для":1,"русский":1,"орыс":1};
  function tk(x){return String(x).replace(/\./g," ").split(/[\s,]+/).filter(Boolean)}
  var a=tk(ab),f=tk(full).map(function(w){return w.replace(/[()]/g,"").toLowerCase()}),fi=0;
  for(var i=0;i<a.length;i++){
    var o=a[i],t=o.toLowerCase();
    if(o.length>=2&&o.length<=3&&o===o.toUpperCase()&&/[А-ЯЁA-Z]/.test(o)){
      var L=o.length;if(fi+L<=f.length&&f.slice(fi,fi+L).map(function(w){return w.charAt(0)}).join("")===t){fi+=L;continue}
    }
    while(fi<f.length&&STOP[f[fi]]&&f[fi]!==t)fi++;
    if(fi<f.length&&f[fi].indexOf(t)===0)fi++;else return false;
  }
  for(;fi<f.length;fi++)if(!STOP[f[fi]])return false;
  return true;
}
var TPL_ALIAS={"Физическая культура":"Физкультура"};
function tplSubj(nm){
  if(!nm)return nm;
  var all=subjAll();if(all.indexOf(nm)>=0)return nm;
  if(TPL_ALIAS[nm]&&all.indexOf(TPL_ALIAS[nm])>=0)return TPL_ALIAS[nm];
  var kz=isKzSubj(nm),c=all.filter(function(x){return isKzSubj(x)===kz&&abMatch(x,nm)});
  return c.length===1?c[0]:nm;
}
function tplExtra(t,e,full){
  Object.keys(e.h||{}).forEach(function(sub){
    var h=e.h[sub],o=(t.ty&&t.ty[sub])||{},ch=false;
    [["Лек","lk"],["Пр","pr"],["Лаб","lb"]].forEach(function(p){
      var v=h[p[1]];if(!(v>0))return;
      o[p[0]]={n:Math.max(1,Math.min(10,Math.ceil(v/TPL_H-1e-9))),r:(o[p[0]]&&o[p[0]].r)||""};ch=true;
    });
    if(ch){if(!t.ty)t.ty={};t.ty[sub]=o}
  });
  if(full)Object.keys(e.sg||{}).forEach(function(sub){
    var l=e.sg[sub];if(!l||!l.length||t.s.indexOf(sub)<0)return;
    if(!t.tg)t.tg={};
    if(l.length<t.g.length&&l.every(function(g){return t.g.indexOf(g)>=0}))t.tg[sub]=gSort(l.slice());else delete t.tg[sub];
  });
}
function tplDept(rows){/* кафедра, к программам которой относится больше всего блоков файла */
  var cnt={};
  rows.slice(1).forEach(function(r){var m=/^\s*([А-ЯЁA-Z]{1,5})-\d{2}/i.exec(String(r[0]||""));if(!m)return;var p=nrm(m[1]);REF.d.forEach(function(d){if(d.specs.indexOf(p)>=0)cnt[d.id]=(cnt[d.id]||0)+1})});
  var best="",bn=0;Object.keys(cnt).forEach(function(k){if(cnt[k]>bn){bn=cnt[k];best=k}});return best;
}
function applyPlan(P){
  var N=P.N;
  P.addGroups.forEach(addGroup);
  var have={};subjAll().forEach(function(x){have[x]=1});
  if(!REF.sbj)REF.sbj=[];
  P.subjects.forEach(function(x){if(!have[x]){REF.sbj.push(x);have[x]=1}});
  REF.sbj.sort(byr);
  if(!REF.cr)REF.cr={};
  Object.keys(P.cr).forEach(function(n){if(!REF.cr[n])REF.cr[n]=P.cr[n]});
  function progsOf(gl,extra){var o=(extra||[]).slice();gl.forEach(function(g){var p=g.split("-")[0];if(o.indexOf(p)<0)o.push(p)});return o}
  P.T.forEach(function(e){
    var gl=gSort(e.g.slice()),sl=e.s.slice().sort(byr),t=e.t;
    if(e.mode==="new"){var nt={n:e.n,f:"",d:N,sp:progsOf(gl),g:gl,s:sl};REF.t.push(nt);tplExtra(nt,e,true);return}
    if(e.mode==="replace"&&!P.keepAll){
      if(!t.d)t.d=N;
      if(sl.length)t.s=sl;
      if(gl.length){t.g=gl;t.sp=progsOf(gl)}
      tplExtra(t,e,true);
      return;
    }
    sl.forEach(function(x){if(t.s.indexOf(x)<0)t.s.push(x)});t.s.sort(byr);
    gl.forEach(function(x){if(t.g.indexOf(x)<0)t.g.push(x)});t.g=gSort(t.g.slice());t.sp=progsOf(gl,t.sp||[]);
    if(!t.d)t.d=N;tplExtra(t,e,e.mode!=="merge");
  });
  REF.t.sort(byn);
  pruneAll();
  rsave();renderR();refreshAll();
  rsync(true);psync(true);gsync(true);
  return {RH:!!RH,PH:!!PH,GH:!!GH};
}
function loadPlanText(P){
  var c={replace:0,new:0,merge:0};P.T.forEach(function(e){c[e.mode]++});
  var newSub=0,have={};subjAll().forEach(function(x){have[x]=1});P.subjects.forEach(function(x){if(!have[x])newSub++});
  return "Кафедра «"+P.N+"». Строк в файле: "+P.rows+".\n\n"
    +(P.keepAll?"Преподавателей кафедры дополнить по файлу (предметы и группы добавляются, ничего не удаляется): ":"Преподавателей кафедры обновить по файлу (предметы и группы заменяются): ")+c.replace+"\n"
    +"Добавить новых преподавателей: "+c.new+"\n"
    +"Дополнить преподавателей других кафедр (ничего не удаляется): "+c.merge+"\n"
    +"Новых предметов (названия как в файле): "+newSub+"\n"
    +"Новых групп: "+P.addGroups.length+(P.skipGroups.length?"\nГрупп других программ, которых нет в списке, пропущено: "+P.skipGroups.length:"")+"\n"
    +(P.crConflict?"Предметов с разными кредитами в разных строках (взято чаще встречающееся): "+P.crConflict+"\n":"")
    +(P.noteRows?"Строк с пометками «плохо читается / сверить с оригиналом»: "+P.noteRows+"\n":"")
    +"\nПреподаватели кафедры, которых нет в файле, не меняются. Применить?";
}
$("rnl").onclick=function(){$("nlf").click()};
/* ===== папка «расписание» (рядом с Конструктор_расписания.html и папкой «выписки»): сюда после импорта сохраняются gruppy.xlsx, predmety.xlsx, prepodavateli.xlsx, raspisanie2.xlsx (и расписание преподавателей) ===== */
/* ===== выбор папок «расписание» и «выписки»: для обеих папок один и тот же код ===== */
var OUT_DIR="расписание",VYP_DIR="выписки",ROOTH=null;
function hGetP(k){return new Promise(function(r){hGet(r,k)})}
/* окно с кнопкой: showDirectoryPicker можно вызвать только сразу после клика, поэтому, если «свежего» клика уже нет, выбор папки открывается из этого окна */
function pickDirModal(msg){
  return new Promise(function(res){
    var ov=document.createElement("div");ov.className="modal-ov";
    var bx=document.createElement("div");bx.className="modal-bx";
    bx.innerHTML='<div class="msg"></div><div class="btns"><button class="g" type="button" data-x="0">Отмена</button><button type="button" data-x="1">Выбрать папку</button></div>';
    bx.querySelector(".msg").textContent=msg;
    ov.appendChild(bx);document.body.appendChild(ov);
    bx.querySelector('[data-x="0"]').onclick=function(){ov.remove();res({h:null})};
    bx.querySelector('[data-x="1"]').onclick=function(){
      var pr;try{pr=showDirectoryPicker({mode:"readwrite",id:"sched"})}catch(e){ov.remove();res({err:e});return}
      pr.then(function(h){ov.remove();res({h:h})},function(e){ov.remove();res(e&&e.name==="AbortError"?{h:null}:{err:e})});
    };
  });
}
/* выбор папки: сразу по клику (как в «полном» варианте), а если браузер не принимает вызов без свежего клика — через окно с кнопкой */
async function askDir(msg){
  if(!window.showDirectoryPicker)return{err:{name:"",message:"браузер не умеет выбирать папку, нужен Edge или Chrome"}};
  var ua=navigator.userActivation;
  if(!ua||ua.isActive){
    try{return{h:await showDirectoryPicker({mode:"readwrite",id:"sched"})}}
    catch(e){if(e&&e.name==="AbortError")return{h:null};if(!e||e.name!=="SecurityError")return{err:e}}
  }
  return pickDirModal(msg);
}
/* в выбранной папке ищем нужную: сама папка (если так называется), её подпапка с таким именем, иначе выбранная папка как есть */
async function folderIn(h,name){
  if(String(h.name).toLowerCase()===name)return h;
  try{return await h.getDirectoryHandle(name)}catch(e){}
  return h;
}
/* общий выбор для «расписание» и «выписки»: возвращает {root: выбранная папка, dir: найденная папка} или null */
async function chooseFolder(name,msg){
  var r=await askDir(msg);
  if(r.err){askAlert("Не удалось открыть выбор папки"+(r.err.name?" ("+r.err.name+(r.err.message?": "+r.err.message:"")+")":"")+".\nБраузер не разрешает выбирать системные папки целиком (Рабочий стол, Документы, Загрузки) — выбери вложенную папку: саму «"+name+"» или ту, внутри которой она лежит.");return null}
  if(!r.h)return null;
  var d=await folderIn(r.h,name);
  if(d!==r.h){ROOTH=r.h;hSet(r.h,"r")}/* общая папка, где лежат и «расписание», и «выписки» */
  return{root:r.h,dir:d};
}
async function rwOk(h){try{var o={mode:"readwrite"};if(await h.queryPermission(o)==="granted")return true;return (await h.requestPermission(o))==="granted"}catch(e){return false}}
/* подключение папки «расписание»: файлы gruppy / predmety / prepodavateli / raspisanie2 читаются и сохраняются в ней */
async function connectSched(msg){
  var c=await chooseFolder(OUT_DIR,msg||("Выбери папку «"+OUT_DIR+"» (или папку, внутри которой она лежит). В ней хранятся gruppy.xlsx, predmety.xlsx, prepodavateli.xlsx, raspisanie2.xlsx."));
  if(!c)return false;
  if(!(await bindDir(c.dir,true)))return false;
  hSet(c.dir,"d");
  try{hSet(await c.root.getDirectoryHandle(VYP_DIR),"v")}catch(e){}/* если рядом есть «выписки» — запоминаем и её */
  return true;
}
async function ensureOutDir(){
  if(!window.showDirectoryPicker)return true;/* браузер без доступа к папкам: остаётся скачивание файлов */
  if(DIRH&&await rwOk(DIRH))return true;
  /* сначала пробуем уже известную общую папку, потом просим выбрать */
  var cands=[];if(ROOTH)cands.push(ROOTH);
  try{var sr=await hGetP("r");if(sr&&cands.indexOf(sr)<0)cands.push(sr)}catch(e){}
  for(var i=0;i<cands.length;i++){
    try{if(!(await rwOk(cands[i])))continue;var sub=await folderIn(cands[i],OUT_DIR);if(await bindDir(sub,true)){hSet(sub,"d");return true}}catch(e){}
  }
  return await connectSched("Данные сохраняются в папку «"+OUT_DIR+"». Выбери её (или папку, внутри которой она лежит): в ней появятся gruppy.xlsx, predmety.xlsx, prepodavateli.xlsx, raspisanie2.xlsx.");
}
async function importPlanFile(f){
  if(!f)return;
  if(!window.XLSX){askAlert("Библиотека Excel не загрузилась.");return}
  try{
    var wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:""});
    var tpl=tplIs(rows),N=$("ed2").value;
    if(tpl){rows=tplFlat(rows);N=tplDept(rows)||N}
    var P=loadPlan(rows,N);
    if(!P){askAlert("В файле нет данных или кафедра не выбрана.");return}
    if(tpl)P.keepAll=true;/* выписка только дополняет данные */
    if(await askConfirm((tpl?"Шаблон выписки «"+f.name+"».\n":"")+loadPlanText(P))){
      if(!(await ensureOutDir()))return;
      P=loadPlan(rows,N);if(tpl)P.keepAll=true;
      var st=applyPlan(P),miss=[];
      if(!st.RH)miss.push("справочник преподавателей");if(!st.PH)miss.push("предметы");if(!st.GH)miss.push("группы");
      if(!miss.length)askAlert("Готово. Данные сохранены в папку «"+(DIRH?DIRH.name:OUT_DIR)+"»: gruppy.xlsx, predmety.xlsx, prepodavateli.xlsx, raspisanie2.xlsx.");
      else if(await askConfirm("Изменения применены, но не подключены файлы: "+miss.join(", ")+".\nСейчас они сохранены только в браузере. Скачать эти файлы как Excel?")){
        if(!st.RH)rDownload();if(!st.PH)pDownload();if(!st.GH)gDownload();
      }
    }
  }catch(e){askAlert("Не удалось прочитать файл нагрузки: "+e.message)}
}
$("nlf").onchange=function(){var f=this.files&&this.files[0];this.value="";importPlanFile(f)};
/* ===== выписки кафедр: все файлы Excel в папке «выписки» (шаблон как «шаблокн выписки.xlsx») ===== */
function vstat(t){var e=$("vk");if(e)e.textContent=t}
function tplRowsOfBook(wb){/* все листы книги, оформленные по шаблону выписки, одним списком */
  var out=null;
  wb.SheetNames.forEach(function(n){
    var rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:""});
    if(!tplIs(rows))return;
    var fl=tplFlat(rows);out=out?out.concat(fl.slice(1)):fl;
  });
  return out;
}
function planBrief(P,name){
  var c={replace:0,"new":0,merge:0};P.T.forEach(function(e){c[e.mode]++});
  var have={};subjAll().forEach(function(x){have[x]=1});
  var ns=P.subjects.filter(function(x){return !have[x]}).length;
  return "• "+name+" — кафедра «"+P.N+"», строк: "+P.rows+"; преподавателей дополнить: "+(c.replace+c.merge)+", новых: "+c["new"]+"; новых предметов: "+ns+"; новых групп: "+P.addGroups.length;
}
async function importExtractsRun(){
  if(!window.XLSX){askAlert("Библиотека Excel не загрузилась.");return}
  var d=null,hs=null;
  /* читаем список файлов; если папка недоступна (например, сохранённая ссылка устарела) — пробуем следующий вариант */
  async function tryDir(h){if(!h)return false;try{var l=[];for await(var en of h.values()){if(en.kind==="file"&&/\.xlsx$/i.test(en.name)&&en.name.charAt(0)!=="~")l.push(en)}d=h;hs=l;return true}catch(e){return false}}
  async function perm(h){try{var pr=await h.queryPermission({mode:"read"});if(pr!=="granted")pr=await h.requestPermission({mode:"read"});return pr==="granted"}catch(e){return false}}
  async function child(h){try{return await h.getDirectoryHandle(VYP_DIR)}catch(e){return null}}
  /* по кнопке всегда открывается окно выбора папки «выписки» (или папки, где она лежит) */
  /* по кнопке — тот же выбор папки, что и для «расписание» */
  var c=await chooseFolder(VYP_DIR,"Выбери папку «"+VYP_DIR+"» с файлами выписок (или папку, внутри которой она лежит).");
  if(!c)return;
  if(!(await tryDir(c.dir))){askAlert("Не удалось прочитать папку «"+c.dir.name+"».");return}
  hSet(d,"v");
  hs.sort(function(a,b){return COL_RU.compare(a.name,b.name)});
  if(!hs.length){askAlert("В папке «"+d.name+"» нет файлов Excel (.xlsx).");return}
  var items=[],bad=[],sigs=[];
  for(var i=0;i<hs.length;i++){
    try{
      var f=await hs[i].getFile(),wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),fl=tplRowsOfBook(wb);
      if(!fl){bad.push(hs[i].name);continue}
      items.push({name:hs[i].name,rows:fl,N:tplDept(fl)||$("ed2").value});sigs.push(hs[i].name+":"+f.size+":"+f.lastModified);
    }catch(e){bad.push(hs[i].name)}
  }
  if(!items.length){askAlert("В папке «"+d.name+"» нет файлов по шаблону выписки (первый столбец «ПЛАТОН», есть столбец «Семестр»)."+(bad.length?"\nПропущены: "+bad.join(", "):""));return}
  var lines=[];
  items.forEach(function(it){var P=loadPlan(it.rows,it.N);if(P){P.keepAll=true;lines.push(planBrief(P,it.name))}else lines.push("• "+it.name+" — пропущен (нет данных или кафедра не найдена)")});
  if(!(await askConfirm("Папка «"+d.name+"»: файлов по шаблону — "+items.length+(bad.length?" (не по шаблону, пропущены: "+bad.join(", ")+")":"")+".\n\n"+lines.join("\n")+"\n\nДанные только добавляются, ничего не удаляется. Применить?")))return;
  if(!(await ensureOutDir()))return;
  var done=0,st=null;
  items.forEach(function(it){var P=loadPlan(it.rows,it.N);if(!P)return;P.keepAll=true;st=applyPlan(P);done++});
  try{localStorage.setItem(VSIG_KEY,sigs.join("|"))}catch(e){}
  vstat("Выписки: папка «"+d.name+"», загружено файлов: "+done+", "+new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}));
  if(st){var miss=[];if(!st.RH)miss.push("справочник преподавателей");if(!st.PH)miss.push("предметы");if(!st.GH)miss.push("группы");
    if(!miss.length)askAlert("Готово. Загружено файлов: "+done+". Данные сохранены в папку «"+(DIRH?DIRH.name:OUT_DIR)+"»: gruppy.xlsx, predmety.xlsx, prepodavateli.xlsx, raspisanie2.xlsx.");
    else if(await askConfirm("Загружено файлов: "+done+", но не подключены файлы: "+miss.join(", ")+".\nСейчас они сохранены только в браузере. Скачать эти файлы как Excel?")){
      if(!st.RH)rDownload();if(!st.PH)pDownload();if(!st.GH)gDownload();
    }}
}
var _vbusy=false;
async function importExtracts(){if(_vbusy)return;_vbusy=true;try{await importExtractsRun()}finally{_vbusy=false}}
$("vyb").onclick=importExtracts;
/* ===== автозагрузка выписок: при подключении папки (и при каждом открытии страницы) читаем подпапку «выписки», если файлы изменились ===== */
var VSIG_KEY="vypsig1";
/* импорт выписок только загружает данные; пары расставляются кнопкой «Добавить в расписание» */
/* расставляет расписание по нагрузке только что загруженных преподавателей (уже стоящие пары не трогаются) */
async function vypDirSilent(){
  var d=null,need=null;
  try{
    if(DIRH){
      if(String(DIRH.name).toLowerCase()===VYP_DIR)d=DIRH;
      else{try{d=await DIRH.getDirectoryHandle(VYP_DIR)}catch(e){d=null}}
    }
    if(!d){/* общая папка (где страница, «выписки» и «расписание») */
      var rt=ROOTH||await hGetP("r");
      if(rt){var pr=await rt.queryPermission({mode:"read"});if(pr==="granted"){try{d=await rt.getDirectoryHandle(VYP_DIR)}catch(e){d=null}}else need=rt}
    }
    if(!d){
      var sv=await hGetP("v");
      if(sv){var pm=await sv.queryPermission({mode:"read"});if(pm==="granted")d=sv;else if(!need)need=sv}
    }
  }catch(e){d=null}
  if(d){try{var it=d.values();await it.next()}catch(e){d=null}}/* устаревшая ссылка на папку не годится */
  return{d:d,need:need};
}
async function autoImportExtracts(){
  if(_vbusy||!window.XLSX)return;_vbusy=true;
  try{
    var r0=await vypDirSilent(),d=r0.d;
    if(!d){
      if(r0.need){var e=$("vk");if(e&&!e.querySelector("button")){var b=document.createElement("button");b.className="g";b.textContent="Подключить папку «"+r0.need.name+"» (выписки)";
        b.onclick=async function(){try{if(await r0.need.requestPermission({mode:"read"})==="granted"){b.remove();_vbusy=false;autoImportExtracts()}}catch(x){}};
        e.textContent="";e.appendChild(b)}}
      return;
    }
    var hs=[];
    for await(var en of d.values()){if(en.kind==="file"&&/\.xlsx$/i.test(en.name)&&en.name.charAt(0)!=="~")hs.push(en)}
    hs.sort(function(a,b){return COL_RU.compare(a.name,b.name)});
    var items=[],sigs=[];
    for(var i=0;i<hs.length;i++){
      try{
        var f=await hs[i].getFile(),wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),fl=tplRowsOfBook(wb);
        if(!fl)continue;
        items.push({name:hs[i].name,rows:fl,N:tplDept(fl)||$("ed2").value});sigs.push(hs[i].name+":"+f.size+":"+f.lastModified);
      }catch(x){}
    }
    if(!items.length){vstat("Выписки: в папке «"+d.name+"» нет файлов по шаблону выписки");return}
    var sig=sigs.join("|"),prev="";try{prev=localStorage.getItem(VSIG_KEY)||""}catch(x){}
    if(prev===sig){vstat("Выписки: папка «"+d.name+"», изменений нет (файлов: "+items.length+")");return}
    var done=0;
    items.forEach(function(it){var P=loadPlan(it.rows,it.N);if(!P)return;P.keepAll=true;applyPlan(P);done++});
    try{localStorage.setItem(VSIG_KEY,sig)}catch(x){}
    vstat("Выписки загружены автоматически: папка «"+d.name+"», файлов: "+done+", "+new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}));
  }catch(e){vstat("Выписки: не удалось прочитать папку"+(e&&e.message?" ("+e.message+")":""))}
  finally{_vbusy=false}
}
/* режим «папка»: один раз выбираем папку — файлы raspisanie2.xlsx и prepodavateli.xlsx ищутся в ней по имени */
var SCHED_FILE="raspisanie2.xlsx",REF_FILE="prepodavateli.xlsx";
var DIRH=null;
async function bindDir(dir,first){
  DIRH=dir;var cur=SCHED_FILE;/* cur — файл, с которым работаем сейчас (для понятного сообщения об ошибке) */
  try{
    var fh=await dir.getFileHandle(SCHED_FILE,{create:true});
    var f=await fh.getFile();
    var load=f.size>0&&!!window.XLSX;
    if(load&&first&&S.entries.length)load=await askConfirm("В папке уже есть «"+SCHED_FILE+"».\nОК — загрузить расписание из него.\nОтмена — перезаписать файл текущим расписанием.");
    if(load){try{apply(parseXlsx(await f.arrayBuffer()))}catch(e){}}
    FH=fh;status("Папка «"+dir.name+"»: расписание сохраняется в «"+SCHED_FILE+"» автоматически");sync(true);
    cur=REF_FILE;var rh=await dir.getFileHandle(REF_FILE,{create:true});
    var rf=await rh.getFile();
    var rl=rf.size>0&&!!window.XLSX;
    if(rl&&first)rl=await askConfirm("В папке уже есть «"+REF_FILE+"».\nОК — загрузить справочник из него.\nОтмена — перезаписать файл текущим справочником.");
    if(rl){try{applyRef(parseRef(await rf.arrayBuffer()))}catch(e){}}
    RH=rh;rst("Преподаватели: папка «"+dir.name+"», файл «"+REF_FILE+"» сохраняется автоматически");rsync(true);
    cur=GR_FILE;var gh=await dir.getFileHandle(GR_FILE,{create:true});
    var gf=await gh.getFile();
    var gl=gf.size>0&&!!window.XLSX;
    if(gl&&first&&GR.length)gl=await askConfirm("В папке уже есть «"+GR_FILE+"».\nОК — загрузить список групп из него.\nОтмена — перезаписать файл текущим списком.");
    var gok=true;
    if(gl){try{gApply(gParse(await gf.arrayBuffer()))}catch(e){gok=false;gstat("Не удалось прочитать «"+GR_FILE+"» в папке: "+(e&&e.message?e.message:"неверный формат")+". Файл не изменён и не подключён.")}}
    if(gok){GH=gh;gstat("Папка «"+dir.name+"»: группы сохраняются в «"+GR_FILE+"» автоматически");gsync(true)}
    cur=PR_FILE;var ph=await dir.getFileHandle(PR_FILE,{create:true});
    var pf=await ph.getFile();
    var pl=pf.size>0&&!!window.XLSX,pok=true;
    if(pl){try{pApply(pParse(await pf.arrayBuffer()))}catch(e){pok=false;pstat("Не удалось прочитать «"+PR_FILE+"» в папке: "+(e&&e.message?e.message:"неверный формат")+". Файл не изменён и не подключён.")}}
    if(pok){PH=ph;pstat("Папка «"+dir.name+"»: предметы сохраняются в «"+PR_FILE+"» автоматически");psync(true)}
    try{var th=await dir.getFileHandle(TCH_FILE,{create:true});TH=th;tkst("Папка «"+dir.name+"»: расписание преподавателей сохраняется в «"+TCH_FILE+"» автоматически");tsync(true)}catch(e){tkst("Не удалось подключить «"+TCH_FILE+"» в папке")}
    setTimeout(autoImportExtracts,0);
    return true;
  }catch(e){
    var nm=e&&e.name||"",locked=/NotReadable|NoModification|InvalidState|Security/i.test(nm);
    status("Не удалось открыть файл «"+cur+"» в папке «"+(dir&&dir.name)+"»"+(nm?" ("+nm+(e.message?": "+e.message:"")+")":"")+"."+(locked?" Возможно, файл открыт в Excel или другой программе — закрой его и подключи папку снова.":""));
    return false;
  }
}
async function pickDir(){await connectSched()}
$("dirb").onclick=pickDir;
function autoOpenAll(){
  if(!window.showDirectoryPicker){autoOpen0();autoOpenR0();autoOpenG0();autoOpenP0();autoOpenT0();return}
  hGet(async function(d){
    if(!d){autoOpen0();autoOpenR0();autoOpenG0();autoOpenP0();autoOpenT0();return}
    try{
      if(await d.queryPermission({mode:"readwrite"})==="granted"){bindDir(d,false)}
      else{
        var b=document.createElement("button");b.className="g";b.textContent="Подключить папку «"+d.name+"»";
        b.onclick=async function(){try{if(await d.requestPermission({mode:"readwrite"})==="granted"){b.remove();bindDir(d,false)}}catch(e){}};
        $("lk").textContent="";$("lk").appendChild(b);
      }
    }catch(e){autoOpen0();autoOpenR0();autoOpenG0();autoOpenP0();autoOpenT0()}
  },"d");
}
