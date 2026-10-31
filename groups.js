/* ВКЛАДКА «Кафедры и группы»: список групп GR, кафедры/специальности/группы (создание, удаление), сохранение gruppy.xlsx и справочника. */
/* каскад: кафедра -> специальность -> группа -> предмет -> преподаватель */
/* набор удалённых групп пересобирается только когда массив заменён или изменилась его длина */
var _dgA=null,_dgN=-1,_dgS=Object.create(null);
function isDeleted(g){
  var a=S.deletedGroups;if(!a||!a.length)return false;
  if(a!==_dgA||a.length!==_dgN){_dgA=a;_dgN=a.length;_dgS=Object.create(null);a.forEach(function(x){_dgS[x]=1})}
  return _dgS[g]===1;
}
/* ЕДИНЫЙ список групп: GR (отдельный файл gruppy.xlsx). Им пользуются и «Расписание», и «Справочник». */
function gcmp(a,b){return COL_NUM.compare(a,b)}
function ensureGroups(){
  var ch=false,have=Object.create(null);
  GR.forEach(function(g){have[g]=1});
  function add(g){if(g&&!have[g]&&!isDeleted(g)){GR.push(g);have[g]=1;ch=true}}
  if(!GSRC)REF.t.forEach(function(t){t.g.forEach(add)});
  (S.customGroups||[]).forEach(add);
  if(S.customGroups&&S.customGroups.length){S.customGroups=[];try{localStorage.setItem("sched4b",JSON.stringify(S))}catch(e){}}
  if(!GSRC)(S.entries||[]).forEach(function(e){add(e.g)});
  if(ch){GR.sort(gcmp);gsave()}
}
function addGroup(g){
  ensureGroups();
  if(S.deletedGroups)S.deletedGroups=S.deletedGroups.filter(function(x){return x!==g});
  if(GR.indexOf(g)<0){GR.push(g);GR.sort(gcmp);gsave()}
}
/* убирает группы (keep(g)==false) у преподавателя: из t.g и из закреплений t.tg; специальность, у которой не осталось групп, снимается из t.sp */
function tClean(t,keep){
  var old=t.g.slice(),ch=false;
  t.g=old.filter(keep);if(t.g.length!==old.length)ch=true;
  if(t.tg){Object.keys(t.tg).forEach(function(k){var l=t.tg[k].filter(keep);if(l.length!==t.tg[k].length){ch=true;if(l.length)t.tg[k]=l;else delete t.tg[k]}});if(!Object.keys(t.tg).length)delete t.tg}
  if(ch&&t.g.length&&t.sp)old.filter(function(g){return!keep(g)}).forEach(function(g){var sp=specOf(g);if(t.sp.indexOf(sp)>=0&&!t.g.some(function(x){return specOf(x)===sp}))t.sp=t.sp.filter(function(x){return x!==sp})});
  return ch;
}
function removeGroup(g){
  ensureGroups();
  if(!S.deletedGroups)S.deletedGroups=[];
  if(S.deletedGroups.indexOf(g)<0)S.deletedGroups.push(g);
  GR=GR.filter(function(x){return x!==g});
  REF.t.forEach(function(t){tClean(t,function(x){return x!==g})});
  S.entries=S.entries.filter(function(e){return e.g!==g});
  gsave();rsave();save();
}
var RNEW=false,RPREV="",RLAST="";
/* «＋ Новая кафедра…» в списке кафедр: как «＋ Новый преподаватель…» и «＋ Новый предмет…» */
var DNEW=false,DPREV="",DLAST="";
var COM="Общие группы";
/* служебный «раздел» для групп без образовательной программы (21С, 31 …) */
function commonGroups(){return GR.filter(function(g){return g.indexOf("-")<0&&!isDeleted(g)}).sort(gcmp)}
function groupsOf(sp){if(sp===COM)return commonGroups();var pre=sp+"-";return GR.filter(function(g){return g.indexOf(pre)===0&&!isDeleted(g)}).sort(gcmp)}
function specOf(g){return g.split("-")[0]}
function suffixesOf(sp){
  var m={"К":1,"ВВ":1,"С":1,"СК":1},pre=sp+"-";
  groupsOf(sp).forEach(function(g){
    if(g.indexOf(pre)!==0)return;
    var x=g.slice(pre.length).match(/^\d+([^()]*)$/);
    if(x&&x[1])m[x[1].toUpperCase()]=1;
  });
  return Object.keys(m);
}
function baseGroup(g){return g.replace(/\([^)]*\)$/,"")}
function numbersOf(sp){
  if(sp===COM)return commonGroups();
  var pre=sp+"-",seen={},out=[];
  function add(g){
    if(g.indexOf(pre)!==0||g.length<=pre.length||g.charAt(pre.length)==="("||isDeleted(g))return;
    var n=g.slice(pre.length);if(!seen[n]){seen[n]=1;out.push(n)}
  }
  groupsOf(sp).forEach(add);
  return out.sort(gcmp);
}
/* создание группы / дубля / подгруппы. cur — выбранная группа целиком (БИС-41К). Возвращает имя созданной группы или "" */
function mkGroup(name,sp,cur){
  if(sp===COM){
    name=nrm(name.replace(/\s+/g,""));/* заглавные, латинская C → русская С */
    if(!name){askAlert("Впиши название общей группы (например 21С).");return""}
    if(name.indexOf("-")>=0){askAlert("В названии общей группы не должно быть дефиса (например 21С). Если нужна группа образовательной программы — выбери её в поле «Специальность».");return""}
    addGroup(name);save();return name;
  }
  var low=name.toLowerCase(),pre=sp.toLowerCase();
  if(low.indexOf(pre+"-")===0)name=name.slice(sp.length+1).trim();
  else if(low.indexOf(pre+" ")===0)name=name.slice(sp.length+1).trim();
  if(!name){askAlert("Впиши номер новой группы (например 51 или 21К).");return""}
  /* если в названии есть цифра и нет скобок — это группа, иначе подгруппа (имя студента) */
  var isNum=/\d/.test(name)&&!/[()]/.test(name);
  if(isNum){
    name=name.replace(/\s+/g,"");
    var ng=sp+"-"+name;
    addGroup(ng);save();return ng;
  }
  /* короткий суффикс (к, вв, с, ск): дубль выбранной группы «11» -> «11К» */
  var curN=cur&&cur.indexOf(sp+"-")===0?cur.slice(sp.length+1):"",dm=curN.match(/^\d+/),suf=name.replace(/\s+/g,"").toUpperCase();
  if(dm&&!/[()]/.test(name)&&suffixesOf(sp).indexOf(suf)>=0){
    var ng2=sp+"-"+dm[0]+suf,src=cur;
    addGroup(ng2);
    if(ng2!==src&&!S.entries.some(function(e){return e.g===ng2}))
      S.entries.filter(function(e){return e.g===src}).forEach(function(e){
        S.entries.push({g:ng2,s:e.s,tc:e.tc,day:e.day,start:e.start,parts:e.parts.map(function(x){return{t:x.t,n:x.n,r:x.r}})});
      });
    syncTeacherGroups(ng2);
    save();return ng2;
  }
  if(!curN){askAlert("Сначала выбери группу, для которой создаётся подгруппа. Если списка групп нет, создай группу: впиши её номер (например 11) и нажми «+ Создать».");return""}
  var orig=sp+"-"+baseGroup(curN),full=orig+"("+name+")";
  addGroup(full);
  if(!S.entries.some(function(e){return e.g===full}))S.entries.filter(function(e){return e.g===orig}).forEach(function(e){
    S.entries.push({g:full,s:e.s,tc:e.tc,day:e.day,start:e.start,parts:e.parts.map(function(x){return{t:x.t,n:x.n,r:x.r}})});
  });
  syncTeacherGroups(full);
  save();return full;
}
/* ===== файл списка групп (gruppy.xlsx) ===== */
var GH=null,gt=null,GR_FILE="gruppy.xlsx";
function gstat(t){$("gk").textContent=t}
function gsave(){try{localStorage.setItem("schedgr1",JSON.stringify(GR));localStorage.setItem("schedgs1",JSON.stringify(GS))}catch(e){}gsync()}
function gXlsx(){var w=XLSX.utils.aoa_to_sheet([["Группа"]].concat(GR.map(function(g){return[g]}))),wb=XLSX.utils.book_new();w["!cols"]=[{wch:20}];XLSX.utils.book_append_sheet(wb,w,"Группы");
  var w2=XLSX.utils.aoa_to_sheet([["Предмет","Номера групп (через запятую)"]].concat(GS.map(function(r){return[r.s,r.n.join(", ")]})));w2["!cols"]=[{wch:30},{wch:30}];XLSX.utils.book_append_sheet(wb,w2,"Общие предметы");
  return XLSX.write(wb,{bookType:"xlsx",type:"array"})}
function gParse(buf){
  var wb=XLSX.read(buf,{type:"array"});
  function rowsOf(n){var w=wb.Sheets[n];return w?XLSX.utils.sheet_to_json(w,{header:1,defval:""}):[]}
  var rows=rowsOf("Группы"),k;
  for(k=0;k<wb.SheetNames.length&&!rows.length;k++)rows=rowsOf(wb.SheetNames[k]);
  var u=[];
  rows.forEach(function(r){var g=String(r[0]==null?"":r[0]).trim();if(!g||/^групп[аы]?$/i.test(g)||u.indexOf(g)>=0)return;u.push(g)});
  if(!u.length)throw new Error("в файле не найдено ни одной группы (нужен лист «Группы», группы в первом столбце)");
  u.sort(gcmp);
  try{
    var w2=wb.Sheets["Общие предметы"];
    if(w2){var gs=XLSX.utils.sheet_to_json(w2,{header:1,defval:""}).slice(1).map(function(r){return{s:String(r[0]==null?"":r[0]).trim(),n:String(r[1]==null?"":r[1]).split(/[,;]/).map(function(x){return x.trim()}).filter(Boolean)}}).filter(function(r){return r.s&&r.n.length});u.gs=gs}
  }catch(e){}
  return u}
function gApply(a){var g=a.gs;GSRC=true;GR=a.slice();if(S.deletedGroups&&S.deletedGroups.length){S.deletedGroups=S.deletedGroups.filter(function(x){return a.indexOf(x)<0});try{localStorage.setItem("sched4b",JSON.stringify(S))}catch(e){}}if(g)GS=fixGS(g);try{localStorage.setItem("schedgr1",JSON.stringify(GR));localStorage.setItem("schedgs1",JSON.stringify(GS))}catch(e){}try{ensureGroups();if(pruneAll())rsync();renderR();refreshAll()}catch(e){if(window.console)console.error(e)}}
function gsync(now){
  if(!GH||!window.XLSX)return;clearTimeout(gt);
  gt=setTimeout(async function(){try{var w=await GH.createWritable();await w.write(gXlsx());await w.close();gstat("Группы: файл: «"+GH.name+"» обновлён "+new Date().toLocaleTimeString().slice(0,5))}catch(e){gstat("Не удалось записать файл групп «"+GH.name+"»")}},now?0:400);
}
function gDownload(){if(window.XLSX)saveFile(GR_FILE,gXlsx(),XM);else askAlert("Библиотека Excel не загрузилась.")}
async function gLink(sa){
  if(!window.showSaveFilePicker||!window.XLSX){gDownload();return}
  try{
    var h=await showSaveFilePicker({id:"schedlast",suggestedName:GR_FILE,types:[{description:"Excel",accept:{[XM]:[".xlsx"]}}]});
    if(await sameAs(h,[FH,RH,PH,TH])){askAlert(SAME_MSG);return}
    var f=await h.getFile();
    if(f.size>0&&!sa){
      var a;try{a=gParse(await f.arrayBuffer())}catch(e){askAlert("Не удалось прочитать файл групп «"+h.name+"»: "+(e&&e.message?e.message:"неверный формат")+".\nФайл не изменён и не подключён.");return}
      if(await askConfirm("В файле уже есть список групп.\nОК — загрузить его из файла.\nОтмена — перезаписать файл текущим списком."))gApply(a);
    }
    GH=h;hSet(h,"g");gstat("Группы связаны с файлом «"+h.name+"»: правки сохраняются автоматически");gsync(true);
  }catch(e){if(!e||e.name!=="AbortError")gDownload()}
}
async function openG(h){
  try{if(!window.XLSX)throw new Error("библиотека Excel не загрузилась");var f=await h.getFile();if(f.size>0)gApply(gParse(await f.arrayBuffer()));GH=h;gstat("Группы связаны с файлом «"+h.name+"»: правки сохраняются автоматически");gsync(true)}
  catch(e){gstat("Не удалось прочитать файл групп «"+h.name+"»: "+(e&&e.message?e.message:"неверный формат")+". Файл не изменён.")}
}
function autoOpenG0(){
  if(!window.showSaveFilePicker)return;
  hGet(async function(h){
    if(!h)return;
    try{
      if(await h.queryPermission({mode:"readwrite"})==="granted")openG(h);
      else{var b=document.createElement("button");b.className="g";b.textContent="Подключить файл групп «"+h.name+"»";
        b.onclick=async function(){try{if(await h.requestPermission({mode:"readwrite"})==="granted"){b.remove();openG(h)}}catch(e){}};
        $("gk").textContent="";$("gk").appendChild(b)}
    }catch(e){}
  },"g");
}
$("gsv").onclick=function(){if(window.showSaveFilePicker)gLink(!!GH);else gDownload()};
$("gdl").onclick=gDownload;
$("gld").onclick=function(){$("gfi").click()};
$("gfi").onchange=function(){var f=this.files[0];this.value="";if(!f||!window.XLSX)return;var rd=new FileReader();rd.onload=function(){var a;try{a=gParse(rd.result)}catch(e){askAlert("Не удалось прочитать файл групп: "+(e&&e.message?e.message:"неверный формат")+".");return}gApply(a);gsave()};rd.readAsArrayBuffer(f)};
function esSel(){return Array.prototype.map.call($("es").querySelectorAll("input:checked"),function(c){return c.value})}
function renderR(nd,ns){
  fillFull();
  var ed=$("ed"),es=$("es"),had=ed.options.length>0,cd=nd!==undefined?nd:(DNEW?DPREV:ed.value),cs=ns!==undefined?(ns?[ns]:[]):esSel();
  ed.innerHTML='<option value="__new__">＋ Новая кафедра…</option>'+REF.d.map(function(d){return'<option value="'+esc(d.id)+'">'+esc(d.id)+"</option>"}).join("")+'';
  if(had||nd!==undefined)keep(ed,cd);
  if(ed.value==="__new__")ed.value=REF.d.length?REF.d[0].id:"";
  var dep=REF.d.filter(function(d){return d.id===ed.value})[0];
  es.innerHTML=(dep?dep.specs:[]).map(function(x){return'<label class="chip sp" style="color:var(--tx)"><input type="checkbox" style="display:none" value="'+esc(x)+'"'+(cs.indexOf(x)>=0?" checked":"")+"> "+esc(x)+"</label>"}).join("")||'<span class="mu">нет</span>';
  $("dl").innerHTML=subjAll().map(function(x){return'<option value="'+esc(x)+'">'}).join("");
  renderT();
  if(!DNEW)DLAST=ed.value;
  $("dnw").style.display=DNEW?"":"none";$("rowg").style.display=DNEW?"none":"";
  if(DNEW)ed.value="__new__";
}
function renderG(){
  ensureGroups();
  var dv=$("ed").value,sp=[];
  REF.d.forEach(function(d){if(d.id===dv)d.specs.forEach(function(x){if(sp.indexOf(x)<0)sp.push(x)})});
  if(sp.indexOf(COM)<0)sp.push(COM);
  var es=$("rsp"),cs=(RNEW||es.value==="__new__")?RPREV:es.value;
  es.innerHTML='<option value="__new__">＋ Добавить…</option>'+sp.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+"</option>"}).join("");keep(es,cs);
  if(RNEW)es.value="__new__";else{if(es.value==="__new__"&&es.options.length>1)es.value=es.options[1].value;RLAST=es.value}
  $("esw").style.display=RNEW?"":"none";$("rgw").style.display=RNEW?"none":"";$("rgnw").style.display=RNEW?"none":"";$("rgd").style.display=RNEW?"none":"";
  var g=$("rg"),cg=g.value;
  g.innerHTML=(es.value?groupsOf(es.value):[]).map(function(x){return'<option value="'+esc(x)+'">'+esc(es.value===COM?x:x.slice(es.value.length+1))+"</option>"}).join("");keep(g,cg);
}
$("rsp").onchange=function(){
  if(this.value==="__new__"){RPREV=RLAST;RNEW=true;renderG();$("esn").focus();return}
  RNEW=false;renderG()};
$("esx").onclick=function(){RNEW=false;$("esn").value="";renderG()};
$("esn").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("esa").click()}});
$("rga").onclick=function(){
  var v=$("rgn").value.trim(),sp=$("rsp").value;
  if(!sp){askAlert("Сначала выбери образовательную программу.");return}
  if(!v){askAlert("Впиши номер новой группы (например 51 или 21К), суффикс для дубля (к, вв, с, ск) или имя студента для подгруппы.");return}
  var ng=mkGroup(v,sp,$("rg").value);
  if(!ng)return;
  $("rgn").value="";renderT();cGroup();grChanged();$("rg").value=ng;
};
$("rgn").addEventListener("keydown",function(e){if(e.key==="Enter")$("rga").click()});
$("rgd").onclick=async function(){
  var g=$("rg").value;if(!g)return;
  if(!(await askConfirm('Удалить группу "'+g+'"? Всё её расписание будет стёрто, отменить нельзя.')))return;
  removeGroup(g);renderT();cGroup();grChanged();
};
/* «Удалить все, кроме основных»: остаются только 11, 11С, 21, 21С, 31, 31С, 41 (у любой образовательной программы и общие группы);
   подгруппы, дубли и остальные группы (31ВВ, 41К, 21С(Иванов) …) удаляются вместе с их расписанием */
function isMainGroup(g){
  var n=g.indexOf("-")>=0?g.slice(g.indexOf("-")+1):g;
  return /^(11|21|31|41)$/i.test(n)||/^(11|21|31)[СC]$/i.test(n);
}
function removeGroups(list){
  var set={};list.forEach(function(g){set[g]=1});
  ensureGroups();
  if(!S.deletedGroups)S.deletedGroups=[];
  list.forEach(function(g){if(S.deletedGroups.indexOf(g)<0)S.deletedGroups.push(g)});
  GR=GR.filter(function(x){return!set[x]});
  REF.t.forEach(function(t){tClean(t,function(x){return!set[x]})});
  S.entries=S.entries.filter(function(e){return!set[e.g]});
  gsave();rsave();save();
}
$("rgdx").onclick=async function(){
  ensureGroups();
  var del=GR.filter(function(g){return!isMainGroup(g)});
  if(!del.length){askAlert("Лишних групп нет: остались только основные (11, 11С, 21, 21С, 31, 31С, 41).");return}
  var ex=del.slice(0,12).join(", ")+(del.length>12?" и ещё "+(del.length-12):"");
  if(!(await askConfirm("Удалить все группы, кроме основных (11, 11С, 21, 21С, 31, 31С, 41)?\nБудет удалено групп: "+del.length+" из "+GR.length+".\n"+ex+"\nИх расписание будет стёрто, отменить нельзя.")))return;
  removeGroups(del);renderT();cGroup();grChanged();
};
$("ed").onchange=function(){
  if(this.value==="__new__"){DPREV=DLAST;DNEW=true;renderR();$("edn").focus();return}
  DNEW=false;PALL=false;renderR()};
$("edx").onclick=function(){DNEW=false;$("edn").value="";$("ed").value=DPREV;renderR()};
$("edn").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("eda").click()}});
$("eda").onclick=function(){
  var v=$("edn").value.trim();if(!v)return;
  if(REF.d.some(function(x){return x.id===v})){askAlert("Такая кафедра уже есть.");return}
  REF.d.push({id:v,specs:[]});$("edn").value="";DNEW=false;rsave();renderR(v,"");refreshAll();
};
$("edd").onclick=async function(){
  var v=$("ed").value;if(!v)return;
  if(!(await askConfirm('Удалить кафедру "'+v+'"? Преподаватели останутся, но окажутся без кафедры.')))return;
  REF.d=REF.d.filter(function(x){return x.id!==v});REF.t.forEach(function(t){if(t.d===v)t.d=""});rsave();renderR("","");refreshAll();
};
$("esa").onclick=function(){
  var d=REF.d.filter(function(x){return x.id===$("ed").value})[0],v=$("esn").value.trim();
  if(!d){askAlert("Сначала выбери кафедру.");return}
  if(!v)return;RNEW=false;RPREV=v;$("esn").value="";
  if(d.specs.indexOf(v)>=0){renderG();return}
  d.specs.push(v);rsave();renderR(d.id,v);refreshAll();
};
$("esd").onclick=async function(){
  var d=REF.d.filter(function(x){return x.id===$("ed").value})[0],v=$("rsp").value?[$("rsp").value]:[];if(!d)return;
  if(v[0]===COM){askAlert("«Общие группы» — служебный пункт для групп без образовательной программы, его удалить нельзя. Чтобы убрать такую группу, выбери её и нажми «Удалить текущую группу».");return}
  if(!v.length){askAlert("Выбери специальность в поле «Специальность» ниже, которую нужно удалить.");return}
  if(!(await askConfirm('Убрать '+(v.length>1?"образовательные программы":"образовательную программу")+' "'+v.join('", "')+'" из кафедры? '+(v.length>1?"Они пропадут":"Она пропадёт")+' из выбора групп, преподаватели останутся.')))return;
  d.specs=d.specs.filter(function(x){return v.indexOf(x)<0});rsave();renderR(d.id,"");refreshAll();
};
/* кнопка «Сохранить» на вкладке «Кафедры и группы»: справочник (prepodavateli.xlsx) + группы (gruppy.xlsx) */
$("ksv").onclick=async function(){
  var m=$("kmsg");m.textContent="";
  if(!window.showSaveFilePicker){rDownload();gDownload();return}
  /* как при сохранении расписания: каждый раз открывается окно «Сохранить как».
     Браузер разрешает одно такое окно за нажатие, поэтому файл групп выбирается после подтверждения в диалоге */
  var r0=RH;
  await rLink(!!RH);
  if(!RH||RH===r0)return;
  if(!(await askConfirm("Справочник преподавателей сохранён.\nТеперь выберите файл для списка групп.")))return;
  await gLink(!!GH);
};
