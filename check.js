/* ПРОВЕРКА РАСПИСАНИЯ: ищет нарушения в уже расставленном расписании S.entries.
   Правила те же, что использует расстановка (conflict / ordOk / maxDay / выходные дни преподавателя).
   Вызов из консоли: checkSchedule() — вернёт массив нарушений [{type,msg}] и выведет таблицу.
   Кнопка «Проверить» рядом с «Печать» показывает результат в окне. */
function checkSchedule(){
  var V=[],pairs=S.pairs,days=S.days;
  function add(type,msg){V.push({type:type,msg:msg})}
  function dn(d){return DN[d]||("день "+(d+1))}
  var occG={},occT={},occR={},perGD={},ord={};
  S.entries.forEach(function(e,i){
    var sl=slots(e),what=e.g+" · "+e.s+" · "+e.tc;
    /* 1. занятие помещается в сетку */
    if(!(e.day>=0&&e.day<days))add("Сетка","Занятие вне недели ("+what+"): день "+e.day);
    if(!sl.length)add("Сетка","Пустое занятие ("+what+")");
    sl.forEach(function(x){
      if(x.p<1||x.p>pairs)add("Сетка","Пара вне сетки: "+what+", "+dn(e.day)+", "+x.p+" пара (всего пар в день: "+pairs+")");
      var kg=e.g+"|"+e.day+"|"+x.p;(occG[kg]=occG[kg]||[]).push(e);
      var kt=e.tc+"|"+e.day+"|"+x.p;(occT[kt]=occT[kt]||[]).push({e:e,r:String(x.r||"").toLowerCase()});
      var r=String(x.r||"").toLowerCase();
      if(r){var kr=r+"|"+e.day+"|"+x.p;(occR[kr]=occR[kr]||[]).push({e:e,r:r})}
      var kd=e.g+"|"+e.day;(perGD[kd]=perGD[kd]||{g:e.g,d:e.day,n:0,s:{}});perGD[kd].n++;
      var ps=perGD[kd].s[e.s]||(perGD[kd].s[e.s]={n:0,cap:0});ps.n++;ps.cap=Math.max(ps.cap,maxDay(e.s,e.tc));
      /* порядок: лекции раньше практик/лабораторных */
      var ko=e.g+"|"+e.s,o=ord[ko]||(ord[ko]={g:e.g,s:e.s,maxL:-1,minO:1e9,lp:"",op:""}),v=e.day*100+x.p,lbl=dn(e.day)+", "+x.p+" пара";
      if(x.t==="Лек"){if(v>o.maxL){o.maxL=v;o.lp=lbl}}else if(v<o.minO){o.minO=v;o.op=lbl}
    });
    /* 2. выходной день преподавателя */
    var t=REF.t.filter(function(y){return y.n===e.tc})[0];
    if(t&&t.nd&&t.nd.indexOf(e.day)>=0)add("Выходной преподавателя",e.tc+": "+dn(e.day)+" — выходной (группа "+e.g+", «"+e.s+"»)");
  });
  /* 3. группа: два занятия в одну пару */
  Object.keys(occG).forEach(function(k){var a=occG[k];if(a.length<2)return;var p=k.split("|");
    add("Наложение у группы","Группа "+p[0]+": "+dn(+p[1])+", "+p[2]+" пара — "+a.map(function(e){return"«"+e.s+"» ("+e.tc+")"}).join(" и "))});
  /* 4. преподаватель: два разных занятия в одну пару (общая пара — тот же предмет и та же аудитория — допустима) */
  Object.keys(occT).forEach(function(k){var a=occT[k];if(a.length<2)return;
    var u={};a.forEach(function(x){u[x.e.s+"|"+x.r]=x});var keys=Object.keys(u);if(keys.length<2)return;
    var p=k.split("|");add("Наложение у преподавателя",p[0]+": "+dn(+p[1])+", "+p[2]+" пара — "+keys.map(function(z){var x=u[z];return"«"+x.e.s+"» ("+x.e.g+")"}).join(" и "))});
  /* 5. аудитория занята двумя разными занятиями */
  Object.keys(occR).forEach(function(k){var a=occR[k];if(a.length<2)return;
    var u={};a.forEach(function(x){u[x.e.s+"|"+x.e.tc]=x});var keys=Object.keys(u);if(keys.length<2)return;
    var p=k.split("|");add("Аудитория занята","Аудитория "+p[0]+": "+dn(+p[1])+", "+p[2]+" пара — "+keys.map(function(z){var x=u[z];return"«"+x.e.s+"» ("+x.e.tc+", "+x.e.g+")"}).join(" и "))});
  /* 6. лимиты в день */
  Object.keys(perGD).forEach(function(k){var o=perGD[k];
    if(o.n>pairs)add("Лимит пар в день","Группа "+o.g+", "+dn(o.d)+": "+o.n+" пар (максимум "+pairs+")");
    Object.keys(o.s).forEach(function(s){var q=o.s[s];if(q.n>q.cap)add("Лимит предмета в день","Группа "+o.g+", "+dn(o.d)+": «"+s+"» — "+q.n+" пар (максимум "+q.cap+")")})});
  /* 7. порядок лекций и практик */
  Object.keys(ord).forEach(function(k){var o=ord[k];
    if(o.maxL>=0&&o.minO<1e9&&o.maxL>o.minO)add("Порядок занятий","Группа "+o.g+", «"+o.s+"»: лекция ("+o.lp+") стоит позже практики/лабораторной ("+o.op+")")});
  return V;
}
function checkShow(){
  var V=checkSchedule();
  if(window.console&&console.table)console.table(V);
  if(!S.entries.length){askAlert("Расписание пусто — проверять нечего.");return V}
  if(!V.length){askAlert("Нарушений не найдено ✓\nПроверено занятий: "+S.entries.length+".");return V}
  var by={};V.forEach(function(v){(by[v.type]=by[v.type]||[]).push(v.msg)});
  var txt="Найдено нарушений: "+V.length+"\n",shown=0,LIM=12;
  Object.keys(by).forEach(function(t){
    txt+="\n"+t+" — "+by[t].length+":\n";
    by[t].slice(0,3).forEach(function(m){txt+="• "+m+"\n";shown++});
    if(by[t].length>3)txt+="  …и ещё "+(by[t].length-3)+"\n";
  });
  txt+="\nПолный список — в консоли браузера (F12): checkSchedule()";
  askAlert(txt);return V;
}
(function(){
  var pr=document.getElementById("prn");if(!pr||document.getElementById("chk"))return;
  var b=document.createElement("button");b.id="chk";b.type="button";b.className="g";b.textContent="Проверить";
  b.title="Найти нарушения в расписании: наложения у групп, преподавателей и аудиторий, выходные дни, лимиты пар, порядок лекций и практик";
  b.onclick=checkShow;pr.parentNode.insertBefore(b,pr);
})();
