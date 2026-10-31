/* ВКЛАДКА «Предметы»: список предметов, кредиты, группы и преподаватели предмета, объединение дублей, файл predmety.xlsx. */
/* закрепления групп за предметом на вкладке «Предметы» больше нет: группы предмету задаются у преподавателя */
function subjGroups(x){return[]}
function mxOf(x){var m=REF.mx&&REF.mx[x];return m>0?+m:""}
function subjAll(){var m={};(REF.sbj||[]).forEach(function(x){m[x]=1});if(!PSRC)REF.t.forEach(function(t){t.s.forEach(function(x){m[x]=1})});return Object.keys(m).sort(byr)}
function sbjSet(){var m={};(REF.sbj||[]).forEach(function(x){m[x]=1});return m}
/* убирает у преподавателей предметы и группы, которых нет в подключённых файлах предметов / групп */
function pruneAll(){
  var ch=false;
  if(PSRC){var A=sbjSet();REF.t.forEach(function(t){var n=t.s.filter(function(x){return A[x]});if(n.length!==t.s.length){t.s=n;ch=true}});
    REF.d.forEach(function(d){if(d.sj){var n=d.sj.filter(function(x){return A[x]});if(n.length!==d.sj.length){d.sj=n;ch=true}}});
    ["cr","mx","sg"].forEach(function(k){var o=REF[k];if(o)Object.keys(o).forEach(function(n){if(!A[n]){delete o[n];ch=true}})})}
  if(GSRC){var G={};GR.forEach(function(g){if(!isDeleted(g))G[g]=1});
    REF.t.forEach(function(t){if(tClean(t,function(g){return G[g]}))ch=true});
    if(REF.sg)Object.keys(REF.sg).forEach(function(n){var l=REF.sg[n].filter(function(g){return G[g]});if(l.length!==REF.sg[n].length){ch=true;if(l.length)REF.sg[n]=l;else delete REF.sg[n]}})}
  try{localStorage.setItem("schedref1",JSON.stringify(REF))}catch(e){}
  return ch;
}
/* предметы одной группы: у преподавателей, которые ведут эту группу (если группы у преподавателя не указаны — по специальности) */
/* язык: группа с «К» на конце номера (21К) — казахская; предмет казахский, если в названии есть казахские буквы или оно начинается с «Тау» */
function isKzGroup(g){return /[\u041aK]$/i.test(baseGroup(String(g||"")))}
function isKzSubj(s){if(/^(Санд\. микропр|Жылутехникасы|Техн\. проц\. авт)/.test(s))return true;return /[\u04d9\u0493\u049b\u04a3\u04e9\u04af\u04b1\u04bb\u0456\u04d8\u0492\u049a\u04a2\u04e8\u04ae\u04b0\u04ba\u0406]/.test(s)||/^\u0422\u0430\u0443[\s-]/.test(s)||KZW.test(s)}
/* казахские названия без специальных букв (Жылу техникасы, Саясаттану, Шахталарды жобалау …) */
var KZW=/(^|[\s.,\/(])(жылу|жобала|саясат|электржетек|электртехн|аппараттар|материалтану|материалд|негіздер)|(^|[\s.,\/(])(мен|және|жалпы)($|[\s.,)])/i;
/* ===== файл предметов и кредитов (predmety.xlsx) ===== */
var PH=null,pt=null,PR_FILE="predmety.xlsx";
function pstat(t){$("pk").textContent=t}
function pXlsx(){
  var sl=(REF.sbj||[]).slice();if(!PSRC){Object.keys(REF.cr||{}).forEach(function(x){if(sl.indexOf(x)<0)sl.push(x)});subjAll().forEach(function(x){if(sl.indexOf(x)<0)sl.push(x)})}
  sl.sort(byr);
  var w=XLSX.utils.aoa_to_sheet([["Предмет","Кредиты за семестр","Макс. пар в день","Группы"]].concat(sl.map(function(x){return[x,crOf(x)?+crOf(x):"",mxOf(x),((REF.sg&&REF.sg[x])||[]).join(", ")]}))),wb=XLSX.utils.book_new();
  w["!cols"]=[{wch:40},{wch:20},{wch:18},{wch:50}];XLSX.utils.book_append_sheet(wb,w,"Предметы");
  return XLSX.write(wb,{bookType:"xlsx",type:"array"});
}
function pParse(buf){
  var wb=XLSX.read(buf,{type:"array"}),w=wb.Sheets["Предметы"]||wb.Sheets[wb.SheetNames[0]];
  if(!w)throw new Error("в файле нет листа с предметами");
  var rr=XLSX.utils.sheet_to_json(w,{header:1,defval:""}).slice(1),sbj=[],cr={},mx={},sg={};
  rr.forEach(function(r){var n=String(r[0]==null?"":r[0]).trim();if(!n)return;if(sbj.indexOf(n)<0)sbj.push(n);var c=parseFloat(String(r[1]).replace(",",".")),m=parseInt(r[2],10),g=String(r[3]==null?"":r[3]).split(",").map(function(x){return x.trim()}).filter(Boolean);if(c>0)cr[n]=c;if(m>0)mx[n]=m;if(g.length)sg[n]=g});
  if(!sbj.length)throw new Error("в файле не найдено ни одного предмета (нужен лист «Предметы», названия в первом столбце)");
  return{sbj:sbj,cr:cr,mx:mx,sg:sg};
}
function pApply(o){
  PSRC=true;
  var _sd=(REF.d||[]).filter(function(d){return d.id===SOC_DEPT})[0],_sk=_sd&&_sd.sj?_sd.sj.slice():[];
  REF.sbj=o.sbj.slice();_sk.forEach(function(x){if(REF.sbj.indexOf(x)<0)REF.sbj.push(x)});REF.sbj.sort(byr);REF.cr=Object.assign({},o.cr||{});REF.mx=Object.assign({},o.mx||{});REF.sg=Object.assign({},o.sg||{});
  pruneAll();
  try{rsync();renderR();refreshAll();if(!$("tabP").hidden)renderP();render()}catch(e){if(window.console)console.error(e)}
}
function psync(now){
  if(!PH||!window.XLSX)return;clearTimeout(pt);
  pt=setTimeout(async function(){try{var w=await PH.createWritable();await w.write(pXlsx());await w.close();pstat("Предметы: файл: «"+PH.name+"» обновлён "+new Date().toLocaleTimeString().slice(0,5))}catch(e){pstat("Не удалось записать файл предметов «"+PH.name+"»")}},now?0:400);
}
function pDownload(){if(window.XLSX)saveFile(PR_FILE,pXlsx(),XM);else askAlert("Библиотека Excel не загрузилась.")}
async function pLink(sa){
  if(!window.showSaveFilePicker||!window.XLSX){pDownload();return}
  try{
    var h=await showSaveFilePicker({id:"schedlast",suggestedName:PR_FILE,types:[{description:"Excel",accept:{[XM]:[".xlsx"]}}]});
    if(await sameAs(h,[FH,RH,GH,TH])){askAlert(SAME_MSG);return}
    var f=await h.getFile();
    if(f.size>0&&!sa){
      var o;try{o=pParse(await f.arrayBuffer())}catch(e){askAlert("Не удалось прочитать файл предметов «"+h.name+"»: "+(e&&e.message?e.message:"неверный формат")+".\nФайл не изменён и не подключён.");return}
      if(await askConfirm("В файле уже есть список предметов.\nОК — загрузить его из файла.\nОтмена — перезаписать файл текущим списком."))pApply(o);
    }
    PH=h;hSet(h,"p");pstat("Предметы связаны с файлом «"+h.name+"»: правки сохраняются автоматически");psync(true);
  }catch(e){if(!e||e.name!=="AbortError")pDownload()}
}
async function openP(h){
  try{if(!window.XLSX)throw new Error("библиотека Excel не загрузилась");var f=await h.getFile();if(f.size>0)pApply(pParse(await f.arrayBuffer()));PH=h;pstat("Предметы связаны с файлом «"+h.name+"»: правки сохраняются автоматически");psync(true)}
  catch(e){pstat("Не удалось прочитать файл предметов «"+h.name+"»: "+(e&&e.message?e.message:"неверный формат")+". Файл не изменён.")}
}
function autoOpenP0(){
  if(!window.showSaveFilePicker)return;
  hGet(async function(h){
    if(!h)return;
    try{
      if(await h.queryPermission({mode:"readwrite"})==="granted")openP(h);
      else{var b=document.createElement("button");b.className="g";b.textContent="Подключить файл предметов «"+h.name+"»";
        b.onclick=async function(){try{if(await h.requestPermission({mode:"readwrite"})==="granted"){b.remove();openP(h)}}catch(e){}};
        $("pk").textContent="";$("pk").appendChild(b)}
    }catch(e){}
  },"p");
}
$("psv").onclick=function(){if(window.showSaveFilePicker)pLink(!!PH);else pDownload()};
$("pdl").onclick=pDownload;
$("pld").onclick=function(){$("pfi").click()};
$("pfi").onchange=function(){var f=this.files[0];this.value="";if(!f||!window.XLSX)return;var rd=new FileReader();rd.onload=function(){var o;try{o=pParse(rd.result)}catch(e){askAlert("Не удалось прочитать файл предметов: "+(e&&e.message?e.message:"неверный формат")+".");return}pApply(o);psync()};rd.readAsArrayBuffer(f)};
/* ===== вкладка «Предметы»: новый предмет, кредиты, закрепление преподавателей ===== */
var PSEL="",PNEW=false,PPREV="",PNG=[],PNT=[];
var PALL=true,PKEEP="",PKEEPSP=false;
/* «Алгебра и геометрия(лекция)» -> «Алгебра и геометрия» */
function renderP(){
  /* кафедра и специальности — общие с вкладкой «Для преподавателей» (главные — на «Кафедры и группы») */
  $("ed3").innerHTML='<option value="__all">Все кафедры</option>'+$("ed").innerHTML.replace(/<option value="__new__">[^<]*<\/option>/,"");$("ed3").value=PALL?"__all":$("ed").value;
  if(PALL)$("es3").innerHTML='<span class="mu">—</span>';
  else{
    $("es3").innerHTML=$("es").innerHTML;
    var src=$("es").querySelectorAll("input");
    Array.prototype.forEach.call($("es3").querySelectorAll("input"),function(c,i){c.checked=src[i]?src[i].checked:false});
  }
  var d=$("ed").value,sps=PALL?[]:esSel();
  var dep=REF.d.filter(function(x){return x.id===d})[0],dsj=(dep&&dep.sj)||[];
  /* предметы специальности — так же, как на вкладке «Расписание»: у преподавателей, которые ведут группы этой специальности
     (если группы у преподавателя не указаны — по его специальностям), плюс общие предметы групп этой специальности */
  var teachOk=function(t){
    if(!sps.length)return true;
    return sps.some(function(sp){return t.g.length?t.g.some(function(g){return specOf(g)===sp}):(!t.sp.length||t.sp.indexOf(sp)>=0)});
  };
  var all;
  if(PALL)all=subjAll();
  else{
    var m={};
    if(d===AISD){REF.t.forEach(function(t){if((t.d||"")===d&&teachOk(t))t.s.forEach(function(x){m[x]=1})});
    sps.forEach(function(sp){groupsOf(sp).forEach(function(g){var nn=nrm(numOf(g));GS.forEach(function(r){if(r.n.some(function(x){return nrm(x)===nn}))m[r.s]=1})})})}
    dsj.forEach(function(x){m[x]=1});
    all=Object.keys(m).sort(byr);
  }
  var lst=all.slice();
  if(PKEEP){if(lst.indexOf(PKEEP)<0)lst.unshift(PKEEP);PSEL=PKEEP;PKEEP=""}
  /* смена специальности не должна сбрасывать выбранный предмет, даже если у этой специальности его нет в списке */
  if(PKEEPSP){PKEEPSP=false;if(PSEL&&lst.indexOf(PSEL)<0&&subjAll().indexOf(PSEL)>=0){lst.push(PSEL);lst.sort(byr)}}
  if(lst.indexOf(PSEL)<0)PSEL=lst[0]||"";
  if(!PALL&&d!==AISD&&!dsj.length){lst=[];PSEL=""}
  if(PNEW)PSEL="";$("ps").innerHTML='<option value="__new__">＋ Новый предмет…</option>'+lst.map(function(x){return'<option value="'+esc(x)+'">'+esc(x)+"</option>"}).join("");$("ps").value=PNEW?"__new__":PSEL;$("pnw").style.display=PNEW?"":"none";[$("pc"),$("pm")].forEach(function(e){e.parentNode.style.display=PNEW?"none":""});$("pd").style.display=PNEW?"none":"";
  $("pc").disabled=!PSEL;$("pc").value=PSEL?crOf(PSEL):"";$("pm").disabled=!PSEL;$("pm").value=PSEL?mxOf(PSEL):"";
  $("pd").disabled=!PSEL;
  var ts=PNEW?REF.t.filter(function(t){return PNT.indexOf(t.n)>=0}).sort(byn):(PSEL&&(PALL||d===AISD||dsj.length)?REF.t.filter(function(t){return t.s.indexOf(PSEL)>=0}).sort(byn):[]);
  $("pl").innerHTML=ts.length?ts.map(function(t){var chip='<span class="chip">'+esc(t.n)+'<b data-n="'+esc(t.n)+'" title="Открепить">×</b></span>';
    if(PNEW||!PSEL)return chip;
    return'<div class="ptr" data-tn="'+esc(t.n)+'" data-i="'+REF.t.indexOf(t)+'" style="margin:0 0 12px">'+(ts.length>1?'<div class="mu" style="margin:0 0 4px">'+esc(t.n)+'</div>':'')+tyBlock(t,PSEL)+"</div>"}).join(""):'<p class="mu" style="margin:0 0 8px">'+(PSEL?"Пока никто не закреплён.":(PNEW?"Пока никто не выбран.":"Выбери или добавь предмет."))+"</p>";
  $("pg").innerHTML=PNEW?"":pgBlock(ts,PSEL);
  $("pat").innerHTML=(PNEW||!PSEL||!ts.length)?"":ts.map(function(t){return'<span class="chip">'+esc(t.n)+'<b data-n="'+esc(t.n)+'" title="Открепить">×</b></span>'}).join("");
  var pa=REF.t.filter(function(t){return PNEW?PNT.indexOf(t.n)<0:(PSEL&&t.s.indexOf(PSEL)<0)}).sort(byn);
  $("pta").innerHTML='<option value="">Выбери преподавателя…</option>'+pa.map(function(t){return'<option value="'+esc(t.n)+'">'+esc(t.n)+"</option>"}).join("");
  $("pta").disabled=(!PSEL&&!PNEW)||!pa.length;$("ptb").disabled=$("pta").disabled;var _cl=$("pclr");if(_cl)_cl.disabled=PNEW||!PSEL;var _pa=$("padd");if(_pa)_pa.disabled=PNEW||!PSEL||!ts.length;var _ci=$("pta").parentNode.querySelector(".cbi");if(_ci)_ci.disabled=$("pta").disabled;
}
function pSave(){rsave();renderP();refreshAll();render()}
/* ===== объединение предметов: «Алгебра и геометрия ( лек)» + «Алгебра и геометрия ( пр)» → «Алгебра и геометрия» ===== */
function mergeSubjects(froms,to){
  var set={};froms.forEach(function(x){if(x&&x!==to)set[x]=1});
  var list=Object.keys(set);if(!list.length||!to)return false;
  var ch=false;
  function hit(x){return set[x]===1}
  /* список предметов */
  var had=false;(REF.sbj||[]).forEach(function(x){if(hit(x))had=true});
  if(had||(REF.sbj||[]).indexOf(to)<0){REF.sbj=(REF.sbj||[]).filter(function(x){return!hit(x)});if(REF.sbj.indexOf(to)<0)REF.sbj.push(to);REF.sbj.sort(byr);ch=true}
  /* занятия (t.ty) и закрепление групп (t.tg) преподавателей переходят на новое название */
  REF.t.forEach(function(t){
    var hasTo=t.s.indexOf(to)>=0;
    list.forEach(function(x){
      var hasX=t.s.indexOf(x)>=0;
      if(t.ty&&t.ty[x]){var o=t.ty[to]||{};Object.keys(t.ty[x]).forEach(function(k){if(!o[k])o[k]=t.ty[x][k]});t.ty[to]=o;delete t.ty[x];ch=true}
      if(t.tg&&t.tg[x]){
        var gx=t.tg[x],gt=t.tg[to]||[];delete t.tg[x];ch=true;
        /* нет списка = «все группы»: если у одного из предметов он есть, остаётся «все группы» */
        if(!(hasTo&&!gt.length)){var u=gt.slice();gx.forEach(function(g){if(u.indexOf(g)<0)u.push(g)});t.tg[to]=gSort(u)}
      }else if(hasX&&t.tg&&t.tg[to]){delete t.tg[to];ch=true}
      if(hasX)hasTo=true;
    });
    if(t.tg&&!Object.keys(t.tg).length)delete t.tg;
  });
  /* преподаватели */
  REF.t.forEach(function(t){
    if(!t.s.some(hit))return;
    var n=[];t.s.forEach(function(x){x=hit(x)?to:x;if(n.indexOf(x)<0)n.push(x)});t.s=n.sort(byr);ch=true;
  });
  /* предметы кафедр */
  REF.d.forEach(function(d){if(!d.sj||!d.sj.some(hit))return;var n=[];d.sj.forEach(function(x){x=hit(x)?to:x;if(n.indexOf(x)<0)n.push(x)});d.sj=n.sort(byr);ch=true});
  /* кредиты, лимит пар в день, группы предмета */
  ["cr","mx"].forEach(function(k){var o=REF[k];if(!o)return;
    list.forEach(function(x){if(o[x]!=null){if(!o[to])o[to]=o[x];delete o[x];ch=true}})});
  if(REF.sg)list.forEach(function(x){if(REF.sg[x]){var u=(REF.sg[to]||[]).slice();REF.sg[x].forEach(function(g){if(u.indexOf(g)<0)u.push(g)});REF.sg[to]=gSort(u);delete REF.sg[x];ch=true}});
  /* общие предметы по номерам групп */
  var seen={},gs=[];GS.forEach(function(r){var s2=hit(r.s)?to:r.s;if(s2!==r.s)ch=true;
    if(seen[s2]){r.n.forEach(function(x){if(seen[s2].n.indexOf(x)<0)seen[s2].n.push(x)})}else{var c={s:s2,n:r.n.slice()};seen[s2]=c;gs.push(c)}});
  GS=gs;
  /* занятия в расписании */
  var se=false;(S.entries||[]).forEach(function(e){if(hit(e.s)){e.s=to;se=true;ch=true}});
  if(PSEL&&hit(PSEL))PSEL=to;
  if(!ch)return false;
  try{localStorage.setItem("schedgs1",JSON.stringify(GS))}catch(e){}
  if(se)save();
  return true;
}
/* известные дубли: объединяются автоматически, если встретились в данных */
/* сокращённые названия предметов: старые полные названия заменяются автоматически (в справочнике, расписании, кредитах) */
var KNOWN_MERGES=[{from:["Алгебра и геометрия ( лек)","Алгебра и геометрия ( пр)"],to:"Алгебра и геометрия"},
{from:["Информационно-коммуникационные технологии"],to:"ИКТ"},
{from:["Аппараттық-коммуникациялық технологиялар"],to:"Ақпар.-коммун. технол."},
{from:["Программирование на языке C++"],to:"Программирование на C++"},
{from:["C++ тілінде бағдарламалау"],to:"С++ тілінде бағдарл."},
{from:["Информационные системы в управлении проектами"],to:"ИС в упр. проектами"},
{from:["Жобаларды басқарудағы ақпараттық жүйелер"],to:"Жобаларды басқарудағы ақпар. жүйелер"},
{from:["Основы экономики и предпринимательство"],to:"Основы экономики и предпринимательства"},
{from:["Технология программирования"],to:"Технол. прогр."},
{from:["Бағдарламалау технологиялары"],to:"Бағдарл. техн."},
{from:["Автоматизация технологических процессов и производств"],to:"АТП и произв."},
{from:["Жылу электр станциялары объектілерін автоматтандыру және басқару"],to:"ЖЭС об. автом. және басқару"},
{from:["Архитектура компьютерных систем"],to:"Архитектура комп. систем"},
{from:["Программирование микроконтроллеров"],to:"Прогр. микроконтроллеров"},
{from:["Микроконтроллерлерді бағдарламалау"],to:"Микроконтролл. бағдарламалау"},
{from:["Разработка и тестирование Web приложений"],to:"Разр. и тестир. Web прил."},
{from:["Архитектура СУБД"],to:"Архитектура и СУБД"},
{from:["Защита информации в автоматизированных системах управления"],to:"Защита информ. в АСУ"},
{from:["Автоматтандырылған басқару жүйелеріндегі ақпаратты қорғау"],to:"Автом. басқару жүйел. ақпар. қорғау"},
{from:["Еңбекті қорғау және өндірістік экология"],to:"Еңбекті қорғау және өнд. экол."},
{from:["Исследование операций"],to:"Иссл. операции"},
{from:["Основы искусственного интеллекта"],to:"Основы искусств. интеллекта"},
{from:["Жасанды интеллект негіздері"],to:"ЖИ негіздері"},
{from:["Численные методы в искусственном интеллекте"],to:"Численные методы в ИИ"},
{from:["Жасанды интеллекттегі сандық әдістер"],to:"ЖИ сандық әдістер"},
{from:["Микропроцессорные комплексы в системах управления"],to:"МК в СУ"},
{from:["Автоматизация и управление объектов тепловых электрических станций"],to:"А и У об. ТЭС"},
{from:["Проектирование систем автоматизации технологических процессов и производств"],to:"Проектир. систем автом. технол. проц. и произв."},
{from:["IT-инфраструктура"],to:"IT инфраструктура"},
{from:["Технологии виртуальной и дополненной реальности"],to:"Техн. виртуальн. и доп. реал."},
{from:["Виртуалды және кеңейтілген шындық технологиялары"],to:"Виртуалды және кеңейтілген шындық технол."},
{from:["Теория информации и передача данных"],to:"Теория информ. и ПД"},
{from:["Ақпарат теориясы және деректерді беру"],to:"Ақпар. теор. және дер. беру"},
{from:["Охрана труда и промышленная экология"],to:"Охрана труда и ПЭ"},
{from:["Дискретная математика"],to:"Дискр. математика"},
{from:["Алгоритмы, структуры данных и программирование"],to:"Алгоритмы, СД и прогр."},
{from:["Алгоритмдер, деректер құрылымы және бағдарламалау"],to:"Алгоритм, дер. құр. бағд"},
{from:["Қазақстан тарихы"],to:"Қаз. тарихы"},
{from:["Автоматтандырылған жүйелердегі оңтайландыру және басқару әдістері"],to:"АЖО және БӘ"},
{from:["Теория вероятностей и математическая статистика"],to:"Теор. вер. и мат. стат."},
{from:["Ықтималдықтар теориясы және математикалық статистика"],to:"Ықтималд. теор. және матем. статистика"},
{from:["Жылу техникасы"],to:"Жылутехникасы"},
{from:["Автоматты реттеудің сызықтық жүйелері"],to:"Авт. рет. сыз. жүйе"},
{from:["Басқару жүйелеріндегі микропроцессорлық кешендер"],to:"Басқ. жүйе микропр. кеш."},
{from:["Автоматизированные информационно-управляющие системы"],to:"АИУС"},
{from:["Автоматтандырылған ақпараттық-басқару жүйелері"],to:"Автом. ақпар.-басқару жүйелері"},
{from:["Основы надежности систем управления"],to:"Основы надежн. систем упр."},
{from:["Басқару жүйелерінің сенімділік негіздері"],to:"Басқару жүйел. сенімд. негізд."},
{from:["Линейные системы автоматического регулирования"],to:"Линейные САР"},
{from:["Иностранный язык"],to:"Иностр. язык"},
{from:["Казахский (русский) язык"],to:"Казахский язык"},
{from:["Қазақ (орыс) тілі"],to:"Орыс тілі"},
{from:["Сандық және микропроцессорлық техника"],to:"Санд. микропр. тех."},
{from:["Проектирование автоматизированных систем управления"],to:"Проектир. АСУ"},
{from:["Разработка мобильных приложений для Android"],to:"Разраб. моб. прил. для Android"},
{from:["Основы компьютерного моделирования"],to:"Основы комп. моделир."},
{from:["Компьютерлік модельдеу негіздері"],to:"Комп. модельдеу негіздері"},
{from:["Компьютерные программы в автоматизации"],to:"Комп. пр. в авт."},
{from:["Автоматтандырудағы компьютерлік бағдарламалар"],to:"Авт. комп. бағд."},
{from:["Промышленные контроллеры, микроконтроллеры и языки программирования"],to:"Пром. контр., микроконт. и яз. пр."},
{from:["Системы управления базами данных"],to:"СУБД"},
{from:["Методы оптимизации и управления в автоматизированных системах"],to:"Методы оптим. и упр. в АС"},
{from:["Физическая культура"],to:"Физкультура"},
{from:["Промышленная электроника"],to:"Пром. электроника"},
{from:["Өндірістік электроника"],to:"Өнд. электроника"},
{from:["Технологии разработки программного обеспечения"],to:"Техн. разр. пр. обесп."},
{from:["Бағдарламалық қамтамасыз етуді әзірлеу технологиялары"],to:"Бағдарл. қамтамасыз етуді әзірлеу технол."},
{from:["Деректер қорын басқару жүйелерінің архитектурасы"],to:"Дер. қорын басқару ЖА"},
{from:["Автоматтандырылған басқару жүйелерін жобалау"],to:"Автом. басқару жүйел. жобалау"},
{from:["Цифровая и микропроцессорная техника"],to:"Цифр. и микропр. техника"},
{from:["Технологиялық процестерді автоматтандыру және өндірістерді"],to:"Техн. проц. авт."},
{from:["Искусственный интеллект и интеллектуальные системы"],to:"ИИ и интеллект. системы"},
{from:["Базы данных в информационных системах"],to:"БД в ИС"},
{from:["Вычислительные системы и сети"],to:"Вычисл. системы и сети"},
{from:["Операционные системы"],to:"ОС"}],_km=false;
function applyKnownMerges(){
  if(_km)return false;_km=true;var any=false;
  try{KNOWN_MERGES.forEach(function(m){if(mergeSubjects(m.from,m.to))any=true});if(any){gsave();rsave()}}catch(e){if(window.console)console.error(e)}
  _km=false;return any;
}
function setCr(sub,v){var c=parseFloat(String(v).replace(",","."));if(!REF.cr)REF.cr={};if(c>0)REF.cr[sub]=c;else delete REF.cr[sub]}
$("ed3").onchange=function(){var v=this.value;if(v==="__all")PALL=true;else{PALL=false;$("ed").value=v}renderR();renderP()};
$("es3").addEventListener("change",function(){
  var a=this.querySelectorAll("input"),b=$("es").querySelectorAll("input");
  Array.prototype.forEach.call(a,function(c,i){if(b[i])b[i].checked=c.checked});PKEEPSP=true;renderP();
});
$("ps").onchange=function(){
  if(this.value==="__new__"){PPREV=PSEL;PNEW=true;PSEL="";renderP();$("pn").focus();return}
  PNEW=false;PNG=[];PNT=[];PSEL=this.value;renderP()};
$("pnx").onclick=function(){PNG=[];PNT=[];PNEW=false;PSEL=PPREV;$("pn").value="";$("pnc").value="";renderP()};
$("pc").onchange=function(){if(!PSEL)return;setCr(PSEL,this.value);pSave()};
$("pm").onchange=function(){if(!PSEL)return;var v=parseInt(this.value,10);if(!REF.mx)REF.mx={};if(v>0)REF.mx[PSEL]=Math.min(v,S.pairs);else delete REF.mx[PSEL];pSave()};
function addSubj(v,cr){
  v=String(v).trim().replace(/\s+/g," ");if(!v){askAlert("Впиши название предмета.");return}
  if(!REF.sbj)REF.sbj=[];
  var ex=subjAll().filter(function(x){return x.toLowerCase()===v.toLowerCase()})[0];
  if(ex)v=ex;else{REF.sbj.push(v);REF.sbj.sort(byr)}
  if(!PALL){var dp=REF.d.filter(function(x){return x.id===$("ed").value})[0];if(dp&&dp.sj&&dp.sj.indexOf(v)<0)dp.sj.push(v)}
  if(cr!==undefined&&cr!=="")setCr(v,cr);
  PNT.forEach(function(n){var t=REF.t.filter(function(x){return x.n===n})[0];if(t&&t.s.indexOf(v)<0){t.s.push(v);t.s.sort(byr)}});
  PNG=[];PNT=[];
  $("pn").value="";$("pnc").value="";PNEW=false;PSEL=v;PKEEP=v;pSave();
}
$("pna").onclick=function(){addSubj($("pn").value,$("pnc").value)};
$("pn").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();$("pna").click()}});
/* группы ПРЕДМЕТА: объединение групп всех прикреплённых преподавателей. Клик по группе закрепляет её за предметом (✓) у всех преподавателей, у кого она есть, или снимает */
function pgBlock(ts,sub){
  if(!sub)return"";
  var head='<div class="f" style="max-width:100%;margin:6px 0 0"><span style="font-size:13px;color:var(--mu)">Группы предмета</span>';
  var ns=!PALL&&!esSel().length;/* специальности не отмечены — показываем только уже закреплённые группы */
  var m={},on={};
  ts.forEach(function(t){var as=tgAssigned(t,sub);t.g.forEach(function(g){if(!PALL&&!gVis(t,g))return;if(ns&&as.indexOf(g)<0)return;m[g]=1;if(as.indexOf(g)>=0)on[g]=1})});
  /* отмечены специальности — показываем ВСЕ группы этих специальностей (преподавателю группа добавится при нажатии) */
  if(!PALL&&!ns&&ts.length)esSel().forEach(function(sp){groupsOf(sp).forEach(function(g){m[g]=1})});
  var l=gSort(Object.keys(m));
  if(!l.length)return head+'<p class="mu u8">'+(ns?"Закреплённых групп нет. Отметь специальность, чтобы выбрать группы.":(ts.length?"У прикреплённых преподавателей нет групп — добавь их на вкладке «Для преподавателей».":"Группы появятся, когда за предметом закрепят преподавателя."))+"</p></div>";
  return head+'<div style="display:flex;flex-wrap:wrap;align-items:center;margin-top:6px">'
   +l.map(function(g){return'<span class="chip'+(on[g]?" ok":"")+'" data-pg="tog" data-g="'+esc(g)+'" data-on="'+(on[g]?1:0)+'" title="Нажми, чтобы закрепить группу за предметом «'+esc(sub)+'» или открепить">'+esc(g)+"</span>"}).join("")
   +'</div><div class="row" style="margin:6px 0 0"><button type="button" data-pg="all" title="Закрепить за предметом все группы выбранных специальностей (если ни одна не отмечена — всех специальностей кафедры)">Выбрать все</button><button class="g" type="button" data-pg="none" title="Снять закрепление со всех групп">Снять все</button>'+'</div></div>';
}
/* краткая строка у преподавателя: какие группы он ведёт по предмету */
/* диалог с несколькими вариантами; возвращает выбранное значение или null */
function askChoice(msg,opts){
  return new Promise(function(res){
    var ov=document.createElement("div");ov.className="modal-ov";
    var bx=document.createElement("div");bx.className="modal-bx";
    bx.innerHTML='<div class="msg"></div><div class="btns" style="flex-direction:column;align-items:stretch"></div>';
    bx.querySelector(".msg").textContent=msg;
    var bb=bx.querySelector(".btns");
    function done(v){ov.remove();res(v)}
    opts.forEach(function(o){var b=document.createElement("button");b.type="button";if(!o.main)b.className="g";b.textContent=o.l;b.onclick=function(){done(o.v)};bb.appendChild(b)});
    var cb=document.createElement("button");cb.type="button";cb.className="g";cb.textContent="Отмена";cb.onclick=function(){done(null)};bb.appendChild(cb);
    ov.appendChild(bx);document.body.appendChild(ov);
    ov.onclick=function(e){if(e.target===ov)done(null)};
  });
}
/* «Очистить»: у преподавателя убирает из составленного расписания только пары этого предмета (S.entries); занятия, группы и прочие данные не трогает.
   «Полностью» — ещё и кредиты, макс. пар в день, занятия, закреплённые группы и прикреплённых преподавателей. Сам предмет остаётся в списке. */
async function pClear(){
  var sub=PSEL,ts=REF.t.filter(function(t){return t.s.indexOf(sub)>=0}).sort(byn);
  if(!sub)return;
  function cnt(n){return(S.entries||[]).filter(function(e){return e.s===sub&&(n===null||e.tc===n)}).length}
  var opts=ts.map(function(t){return{v:t.n,l:t.n+" — пар в расписании: "+cnt(t.n)}});
  if(ts.length>1)opts.push({v:"__all",l:"Убрать пары у всех преподавателей"});
  opts.push({v:"__full",l:"Очистить полностью"});
  var v=await askChoice("Предмет «"+sub+"».\nУ преподавателя убираются только пары этого предмета из составленного расписания. «Полностью» — ещё и кредиты, пары в день, занятия, группы и прикреплённые преподаватели.",opts);
  if(v===null||PSEL!==sub)return;
  if(v==="__full"&&!(await askConfirm("Очистить предмет «"+sub+"» полностью?\nБудут убраны кредиты, макс. пар в день, занятия, закреплённые группы, все прикреплённые преподаватели и пары предмета из расписания. Сам предмет останется в списке.")))return;
  if(v==="__full"||v==="__all")S.entries=(S.entries||[]).filter(function(e){return e.s!==sub});
  else S.entries=(S.entries||[]).filter(function(e){return!(e.s===sub&&e.tc===v)});
  if(v==="__full"){
    ts.forEach(function(t){
      if(t.ty){delete t.ty[sub];if(!Object.keys(t.ty).length)delete t.ty}
      if(t.tg){delete t.tg[sub];if(!Object.keys(t.tg).length)delete t.tg}
      t.s=t.s.filter(function(x){return x!==sub});
    });
    if(REF.cr)delete REF.cr[sub];if(REF.mx)delete REF.mx[sub];if(REF.sg)delete REF.sg[sub];
  }
  save();pSave();
}
/* «Добавить в расписание» на вкладке «Предметы»: расставляет пары ТОЛЬКО этого предмета и только у выбранного преподавателя (или у всех его преподавателей).
   Берутся занятия и группы, заданные здесь же; уже стоящие пары не трогаются. */
async function pPlace(){
  var sub=PSEL,ts=REF.t.filter(function(t){return t.s.indexOf(sub)>=0}).sort(byn);
  if(!sub||!ts.length)return;
  var opts=ts.map(function(t){return{v:t.n,l:t.n}});
  if(ts.length>1)opts.push({v:"__all",l:"Для всех преподавателей"});
  var v=await askChoice("Добавить в расписание пары предмета «"+sub+"».\nРасставляются только пары этого предмета; уже стоящие пары не трогаются.",opts);
  if(v===null||PSEL!==sub)return;
  var list=v==="__all"?ts:ts.filter(function(t){return t.n===v}),m=$("pmsg"),r;
  m.style.whiteSpace="pre-line";m.textContent="";
  try{r=tchBuild(list,sub)}catch(e){m.textContent="Не удалось расставить расписание: "+(e&&e.message||"ошибка");return}
  var out=[];
  if(r.cnt)out.push("Поставлено: "+r.cnt+".");
  if(r.had)out.push("Уже стояло в расписании: "+r.had+".");
  if(r.tries>1)out.push("Расстановка повторена с другим подбором времени: попыток "+r.tries+".");
  if(r.fixed)out.push("Исправлено перестановкой пар (были с нарушением): "+r.fixed+".");
  if(r.forced&&r.forced.length)out.push("Поставлено с нарушением ограничений: "+r.forced.length+" (лимит пар в день или наложение у преподавателя, аудитории не накладываются; наложения подсвечены красным).");
  if(r.forced&&r.forced.length)out.push(forcedInfo(r.forced));
  if(r.bad.length)out.push("Не поместилось: "+r.bad.length+" (подробности в окне).");
  if(!out.length&&!r.missList.length)out.push("Нечего ставить: у выбранного преподавателя нет занятий по этому предмету.");
  m.textContent=out.join("\n");missAppend(m,r.missList);
}
/* «Выбрать все»: группы отмеченных специальностей; если специальности не отмечены — всех специальностей кафедры */
function pgAllOk(g){
  if(PALL)return true;
  var sps=esSel();if(!sps.length)sps=Array.prototype.map.call($("es").querySelectorAll("input"),function(c){return c.value});
  return g.indexOf("-")<0||sps.some(function(x){return g.indexOf(x+"-")===0});
}
$("pclr").onclick=function(){pClear()};
$("padd").onclick=function(){pPlace()};
$("pg").addEventListener("click",function(e){
  var bt=e.target.closest("[data-pg]");if(!bt||!PSEL)return;
  var a=bt.dataset.pg,g=bt.dataset.g,off=bt.dataset.on==="1";
  REF.t.filter(function(t){return t.s.indexOf(PSEL)>=0}).forEach(function(t){
    if(a==="all"){
      var al=t.g.filter(function(x){return pgAllOk(x)});
      if(!PALL){var sp0=esSel();if(!sp0.length)sp0=Array.prototype.map.call($("es").querySelectorAll("input"),function(c){return c.value});
        sp0.forEach(function(sp){groupsOf(sp).forEach(function(x){if(al.indexOf(x)<0)al.push(x);if(t.g.indexOf(x)<0)t.g.push(x)})});t.g=gSort(t.g.slice())}
      tgSet(t,PSEL,al);
    }
    else if(a==="none")tgSet(t,PSEL,[]);
    else if(a==="tog"){
      if(t.g.indexOf(g)<0){if(off)return;t.g.push(g);t.g=gSort(t.g.slice())}
      var ls=tgAssigned(t,PSEL).slice(),ix=ls.indexOf(g);
      if(off){if(ix>=0)ls.splice(ix,1)}else if(ix<0)ls.push(g);
      tgSet(t,PSEL,ls);
    }
  });
  pSave();
});
function pUnpin(e){
  var n=e.target.dataset&&e.target.dataset.n;if(!n)return;
  if(PNEW){PNT=PNT.filter(function(x){return x!==n});renderP();return}
  var t=REF.t.filter(function(x){return x.n===n})[0];if(!t)return;
  t.s=t.s.filter(function(x){return x!==PSEL});if(t.tg){delete t.tg[PSEL];if(!Object.keys(t.tg).length)delete t.tg}pSave();
}
$("pl").addEventListener("click",pUnpin);$("pat").addEventListener("click",pUnpin);
/* занятия преподавателя по этому предмету: лекции / практики / лабораторные, число пар в неделю и аудитория */
$("pl").addEventListener("change",function(e){
  var el=e.target,r=el.closest(".ptr");
  if(!r||!el.dataset||!el.dataset.k||el.dataset.k.slice(0,2)!=="ty")return;
  tyEdit(el,r);
});
$("pl").addEventListener("input",function(e){
  var el=e.target;if(!el.dataset||!e.isTrusted)return;
  var r=el.closest(".ptr"),t=r&&REF.t[+r.dataset.i];if(!t||!PSEL)return;
  if(el.dataset.k==="tyn"){el.dataset.man="1";tyFill(r,PSEL);tySave(r,t,PSEL)}
  else if(el.dataset.k==="tyr")tySave(r,t,PSEL);
});
/* поле «Добавить преподавателя»: список с поиском — можно вводить фамилию с клавиатуры */
combo($("pta"));
$("ptb").onclick=function(){
  var n=$("pta").value;if(PNEW&&n){if(PNT.indexOf(n)<0)PNT.push(n);renderP();return}
  if(!PSEL||!n)return;
  var t=REF.t.filter(function(x){return x.n===n})[0];if(!t)return;
  if(t.s.indexOf(PSEL)<0){t.s.push(PSEL);t.s.sort(byr)}pSave();
};
$("pd").onclick=async function(){
  if(!PSEL)return;
  var used=S.entries.some(function(e){return e.s===PSEL});
  if(!(await askConfirm('Удалить предмет "'+PSEL+'" из справочника и у всех преподавателей?'+(used?"\nЗанятия по нему в расписании останутся.":""))))return;
  REF.sbj=(REF.sbj||[]).filter(function(x){return x!==PSEL});if(REF.cr)delete REF.cr[PSEL];if(REF.mx)delete REF.mx[PSEL];if(REF.sg)delete REF.sg[PSEL];
  REF.d.forEach(function(d){if(d.sj)d.sj=d.sj.filter(function(x){return x!==PSEL})});
  REF.t.forEach(function(t){t.s=t.s.filter(function(x){return x!==PSEL});if(t.tg){delete t.tg[PSEL];if(!Object.keys(t.tg).length)delete t.tg}});
  PSEL="";pSave();
};
/* кнопка «Сохранить» на вкладке «Предметы»: predmety.xlsx */
$("psv2").onclick=async function(){
  var m=$("pmsg");m.textContent="";
  if(!window.showSaveFilePicker){pDownload();return}
  /* как при сохранении расписания: каждый раз открывается окно «Сохранить как» */
  await pLink(!!PH);
};
/* ===== занятия преподавателя по предмету: лекции / практики / лабораторные (t.ty[предмет]) — назначаются на вкладке «Предметы» ===== */
function tyCfg(t,s){return(t.ty&&t.ty[s])||{}}
function tyParts(o){return TY.filter(function(y){return o[y[0]]}).map(function(y){return{t:y[0],n:o[y[0]].n,r:o[y[0]].r||""}})}
/* число пар по кредитам (как на вкладке «Расписание»): всего N пар в неделю делится между отмеченными типами; вписанное вручную остаётся */
function tyAuto(codes,N){var o={},k=codes.length;if(!k||!N)return o;var R=Math.max(k,N),b=Math.floor(R/k),ex=R%k;codes.forEach(function(c,j){o[c]=Math.max(1,b+(j<ex?1:0))});return o}
function tyFill(r,s){
  var N=creditPairs(s);if(!N)return;
  var cb=r.querySelectorAll('.tyb [data-k="tyc"]'),nm=r.querySelectorAll('.tyb [data-k="tyn"]');
  var man=0,auto=[];
  Array.prototype.forEach.call(cb,function(c,i){
    if(!c.checked){delete nm[i].dataset.man;return}
    if(nm[i].dataset.man){var v=parseInt(nm[i].value,10);if(v>0)man+=v}else auto.push(i)});
  if(!auto.length)return;
  var R=Math.max(auto.length,N-man),k=auto.length,b=Math.floor(R/k),ex=R%k;
  auto.forEach(function(i,j){nm[i].value=Math.max(1,b+(j<ex?1:0))});
}
function tyBlock(t,cs){
  if(!cs)return"";
  var cf=tyCfg(t,cs),au=tyAuto(TY.filter(function(y){return cf[y[0]]}).map(function(y){return y[0]}),creditPairs(cs));
  return'<div class="ty tyb" style="margin-top:12px">'+TY.map(function(y){var c=cf[y[0]];return'<label class="tp" data-t="'+y[0]+'"><input type="checkbox" data-k="tyc"'+(c?" checked":"")+"> "+y[1]+' <input type="number" data-k="tyn" min="1" max="10" value="'+(c?c.n:1)+'" title="Сколько пар в неделю (по умолчанию считается по кредитам)" style="width:60px"'+((c&&au[y[0]]&&c.n!==au[y[0]])?' data-man="1"':"")+(c?"":" disabled")+'> <input type="text" data-k="tyr" size="5" placeholder="ауд." value="'+esc(c?c.r:"")+'"'+(c?"":" disabled")+"></label>"}).join("")+'</div>';
}
function tyRead(r){
  var o={};
  Array.prototype.forEach.call(r.querySelectorAll(".tyb .tp"),function(q){
    if(!q.querySelector('[data-k="tyc"]').checked)return;
    var n=parseInt(q.querySelector('[data-k="tyn"]').value,10);if(!(n>0))n=1;if(n>10)n=10;
    o[q.dataset.t]={n:n,r:q.querySelector('[data-k="tyr"]').value.trim()}});
  return o;
}
function tyEdit(el,r){
  var t=REF.t[+r.dataset.i],s=PSEL,k=el.dataset.k;if(!t||!s)return;
  var tp=el.closest(".tp");
  if(k==="tyc"&&tp){Array.prototype.forEach.call(tp.querySelectorAll('[data-k="tyn"],[data-k="tyr"]'),function(x){x.disabled=!el.checked})}
  if(k==="tyc"||k==="tyn")tyFill(r,s);
  tySave(r,t,s);
}
/* всё, что отмечено или введено, сразу записывается в справочник — отдельной кнопки не нужно */
function tySave(r,t,s){
  if(!s)return;
  var o=tyRead(r);
  if(Object.keys(o).length){if(!t.ty)t.ty={};t.ty[s]=o}else if(t.ty){delete t.ty[s];if(!Object.keys(t.ty).length)delete t.ty}
  rsave();
}
function tyStr(t){var o=t.ty||{};return Object.keys(o).map(function(s){return s+"|"+TY.filter(function(y){return o[s][y[0]]}).map(function(y){var c=o[s][y[0]];return y[0]+":"+c.n+(c.r?":"+c.r:"")}).join("|")}).join("; ")}
function tyParse(v){var o={};String(v||"").split(";").forEach(function(p){var a=p.split("|"),s=a[0].trim(),m={};a.slice(1).forEach(function(q){var b=q.split(":"),k=b[0].trim();if(!TY.some(function(y){return y[0]===k}))return;var n=parseInt(b[1],10);m[k]={n:n>0?Math.min(n,10):1,r:b.slice(2).join(":").trim()}});if(s&&Object.keys(m).length)o[s]=m});return o}
