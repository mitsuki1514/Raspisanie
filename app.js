/* ЗАПУСК: переключение вкладок и начальная инициализация. Подключается последним. */
function tab(x){if(DNEW){DNEW=false;$("ed").value=DPREV}if(x==="s"){var ac=$("addCard"),ah=$("addS");if(ac&&ah&&ac.parentNode!==ah)ah.appendChild(ac)}if(x==="r")renderTS();$("tabS").hidden=x!=="s";$("tabK").hidden=x!=="k";$("tabR").hidden=x!=="r";$("tabP").hidden=x!=="p";$("tabF").hidden=x!=="f";$("t5").className=x==="f"?"":"g";$("t4").className=x==="p"?"":"g";$("t1").className=x==="s"?"":"g";$("t3").className=x==="k"?"":"g";$("t2").className=x==="r"?"":"g";if(x==="r"||x==="k"||x==="p")renderR();if(x==="p")renderP();if(x==="s")sfFill();if(x==="s"&&formOn()&&QA<0&&(_fromT||!parts().length))fromTeacherCfg()}
$("t1").onclick=function(){tab("s")};
$("t2").onclick=function(){tab("r")};
$("t3").onclick=function(){tab("k")};
$("t4").onclick=function(){tab("p")};
$("t5").onclick=function(){tab("f")};
/* список предметов — только по predmety.xlsx: при первом запуске берём его содержимое, затем убираем всё лишнее у преподавателей */
try{applyKnownMerges();if(localStorage.getItem("psrc1")!=="1"){REF.sbj=(DEF.sbj||[]).slice();REF.cr=Object.assign({},DEF.cr||{});REF.mx={};REF.sg={};localStorage.setItem("psrc1","1")}ensureSocial();pruneAll()}catch(e){if(window.console)console.error(e)}
/* чистка мусора от старых импортов: строки заголовков таблицы («ПЛАТОН», «ДИСЦИПЛИНА КАЗ/РУС») не должны быть преподавателем и предметом */
(function(){try{
  var bs=/^дисциплина\s*(каз|рус)$/i,bt=/^(платон|реал)$/i,ch=false;
  var n0=REF.t.length;REF.t=REF.t.filter(function(t){return!bt.test(String(t.n||"").trim())});if(REF.t.length!==n0)ch=true;
  REF.t.forEach(function(t){var n=(t.s||[]).length;t.s=(t.s||[]).filter(function(x){return!bs.test(String(x).trim())});if(t.s.length!==n)ch=true;
    [t.ty,t.tg].forEach(function(o){if(o)Object.keys(o).forEach(function(k){if(bs.test(String(k).trim())){delete o[k];ch=true}})})});
  if(REF.sbj){var m0=REF.sbj.length;REF.sbj=REF.sbj.filter(function(x){return!bs.test(String(x).trim())});if(REF.sbj.length!==m0)ch=true}
  if(ch&&typeof rsave==="function")rsave();
}catch(e){if(window.console)console.error(e)}})();
applyKnownMerges();
buildForm();
sfFill();
render();
renderR();
autoOpenAll();
/* дополнительный ползунок горизонтальной прокрутки сверху таблицы расписания (группы и преподаватели) */
(function(){
  function addTop(id){try{
    var xl=document.getElementById(id),wrap=xl.parentNode;
    var top=document.createElement("div"),inner=document.createElement("div"),busy=false;
    top.className="noprint";top.style.cssText="overflow-x:auto;overflow-y:hidden;margin-bottom:4px";
    inner.style.cssText="height:1px";top.appendChild(inner);wrap.parentNode.insertBefore(top,wrap);
    function upd(){if(id==="txw")tFit();inner.style.width=wrap.scrollWidth+"px";top.style.visibility=wrap.scrollWidth<=wrap.clientWidth+1?"hidden":"visible";top.style.height="16px"}
    top.addEventListener("scroll",function(){if(busy){busy=false;return}if(wrap.scrollLeft!==top.scrollLeft){busy=true;wrap.scrollLeft=top.scrollLeft}});
    wrap.addEventListener("scroll",function(){if(busy){busy=false;return}if(top.scrollLeft!==wrap.scrollLeft){busy=true;top.scrollLeft=wrap.scrollLeft}});
    if(window.ResizeObserver){var rq=0,ro=new ResizeObserver(function(){if(rq)return;rq=requestAnimationFrame(function(){rq=0;upd()})});ro.observe(wrap);ro.observe(xl)}
    window.addEventListener("resize",upd);upd();
  }catch(e){}}
  addTop("xw");addTop("txw");
})();
/* шапка листа («Утверждаю», название, кафедра) занимает видимую ширину блока и не уезжает при прокрутке вбок */
(function(){try{
  var ids=["xw","txw"];
  function eqAll(){var x=document.getElementById("tb");if(x)eqRows(x,ROWH)}
  var busy=false;function eqSoon(){if(busy)return;busy=true;setTimeout(function(){busy=false;try{eqAll()}catch(e){}},0)}
  if(window.MutationObserver)["tb"].forEach(function(id){var x=document.getElementById(id);if(x)new MutationObserver(eqSoon).observe(x,{childList:true})});
  window.addEventListener("resize",eqSoon);
  function upd(){eqSoon();ids.forEach(function(id){var x=document.getElementById(id);if(!x||!x.parentNode)return;var w=x.parentNode,cw=w.clientWidth;
    w.classList.add("xs");if(cw)x.style.setProperty("--xvw",cw+"px")})}
  if(window.ResizeObserver){var rq=0,ro=new ResizeObserver(function(){if(rq)return;rq=requestAnimationFrame(function(){rq=0;upd()})});ids.forEach(function(id){var x=document.getElementById(id);if(x&&x.parentNode)ro.observe(x.parentNode)})}
  window.addEventListener("resize",upd);upd();
}catch(e){}})();
/* ExcelJS нужен только для оформленного Excel: подгружаем в фоне после старта, чтобы не задерживать открытие страницы */
setTimeout(function(){ensureExcelJS()},1500);
