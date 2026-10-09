/* Ventra — the patient record. ONE source of truth for every screen.
   Raw logs live in DATA; everything a screen shows (adherence, streaks,
   pill counts, weight changes, nurse script) is derived by the functions below.
   Change a log entry here and every artboard follows. */
(function () {
  var DATA = {
    patient: { name: 'Mdm Tan', age: 72, condition: 'heart failure', family: { name: 'Mei Ling', relation: 'daughter' } },
    today: '2026-10-07',
    nowMin: 9 * 60 + 41,                       // 9:41 AM
    discharge: '2026-09-27',
    period: { from: '2026-10-01', to: '2026-10-07' },   // report period
    targets: { dryKg: 58.0, alertGainKg: 2, alertDays: 3, fluidMl: 1500, sodiumMg: 2000, capMl: 150 },
    meds: [
      { id: 'furo', name: 'Water pill', generic: 'Furosemide', strength: '40 mg', times: [480],
        purpose: 'Helps your body get rid of extra water, so you breathe easier and swell less.', looks: 'Small white round tablet',
        tile: '#DCE3EC', round: { size: 36, bg: '#FFFFFF', border: '#C9CED6', line: '#C9CED6' } },
      { id: 'biso', name: 'Heart rate pill', generic: 'Bisoprolol', strength: '2.5 mg', times: [480],
        purpose: 'Keeps your heartbeat slow and steady, so your heart works less hard.', looks: 'Small pale-yellow round tablet',
        tile: '#E3E6EC', round: { size: 30, bg: '#F6E7A8', border: '#D8C277', line: '#C9B266' } },
      { id: 'sv', name: 'Heart helper', generic: 'Sacubitril/Valsartan', strength: '49/51 mg', times: [480, 1200],
        purpose: 'Relaxes your blood vessels so your heart pumps more easily.', looks: 'Light-purple oval tablet',
        tile: '#E6E8EE', oval: { bg: '#D9C8E6', border: '#B8A3C9' } },
      { id: 'spiro', name: 'Heart protector', generic: 'Spironolactone', strength: '25 mg', times: [480],
        purpose: 'Protects your heart muscle over time and helps remove extra water.', looks: 'Light-brown round tablet',
        tile: '#E3E6EC', round: { size: 34, bg: '#EFD8BE', border: '#CDB08F', line: '#C2A584' } }
    ],
    // Every due dose is taken unless listed here.
    missed: [
      { date: '2026-10-03', med: 'furo', time: 480, why: 'going out' },
      { date: '2026-10-06', med: 'furo', time: 480, why: 'going out' }
    ],
    takenAt: { '2026-10-07': { 480: '8:05 AM' } },
    weights: {   // morning weight, kg
      '2026-09-27': 59.2, '2026-09-28': 58.9, '2026-09-29': 58.6, '2026-09-30': 58.4,
      '2026-10-01': 58.1, '2026-10-02': 58.3, '2026-10-03': 58.0, '2026-10-04': 58.2,
      '2026-10-05': 58.2, '2026-10-06': 58.2, '2026-10-07': 58.4
    },
    weighTime: '7:10 AM',
    fluid: {     // daily totals, ml (today comes from drinksToday)
      '2026-10-01': 1350, '2026-10-02': 1400, '2026-10-03': 1750, '2026-10-04': 1300,
      '2026-10-05': 1450, '2026-10-06': 1200
    },
    drinksToday: [
      { t: '3:00 PM', what: 'Water', ml: 300 },
      { t: '12:40 PM', what: 'Soup', ml: 250 },
      { t: '9:15 AM', what: 'Tea', ml: 150 },
      { t: '7:30 AM', what: 'Water', ml: 150 }
    ],
    // Meal-photo estimates. plate = share of the plate for carbs / protein / fat.
    mealsToday: [
      { t: '7:30 AM', meal: 'Breakfast', what: 'Oat porridge with banana', sodiumMg: 500, kcal: 330, potassiumMg: 480, phosphorusMg: 260,
        carbs: { g: 58, what: 'Oats and banana' }, protein: { g: 9, what: 'Oats and milk' }, fat: { g: 7, what: 'Milk' },
        plate: [0.75, 0.125, 0.125], tip: 'A good choice. Most of the salt comes from the instant oats — plain rolled oats have less.' },
      { t: '12:40 PM', meal: 'Lunch', what: 'Fish soup with noodles', sodiumMg: 1100, kcal: 420, potassiumMg: 650, phosphorusMg: 280,
        carbs: { g: 52, what: 'Noodles' }, protein: { g: 24, what: 'Fish' }, fat: { g: 12, what: 'Oil and fish' },
        plate: [0.5, 0.25, 0.25], tip: 'Most of the salt is in the soup — try drinking only half next time.' }
    ],
    // What the demo camera "finds" when the patient scans the next meal.
    demoScan: { t: '6:30 PM', meal: 'Dinner', what: 'Steamed fish with rice and vegetables', sodiumMg: 450, kcal: 480, potassiumMg: 720, phosphorusMg: 320,
      carbs: { g: 60, what: 'Rice' }, protein: { g: 28, what: 'Fish' }, fat: { g: 10, what: 'Oil' },
      plate: [0.5, 0.25, 0.25], tip: 'Great pick — steaming keeps the salt low. Skip extra soy sauce.' },
    symptoms: [
      { date: '2026-10-02', key: 'tired', sev: 'Mild' },
      { date: '2026-10-03', key: 'ankles', sev: 'Mild' },
      { date: '2026-10-04', key: 'dizzy', sev: 'Mild' },
      { date: '2026-10-04', key: 'tired', sev: 'Mild' },
      { date: '2026-10-05', key: 'ankles', sev: 'Mild' },
      { date: '2026-10-06', key: 'tired', sev: 'Mild' }
    ],
    alerts: [ { date: '2026-10-03', time: '6:10 PM', zone: 'yellow', familyTold: true } ]
  };

  var SYM = {
    ankles: { label: 'Swollen ankles', say: 'swollen ankles', short: 'ankle swelling' },
    tired: { label: 'Tired in the afternoon', say: 'very tired', short: 'tired' },
    dizzy: { label: 'Dizzy after morning pills', say: 'dizzy after my morning pills', short: 'dizzy' },
    breath: { label: 'Short of breath', say: 'short of breath', short: 'breathless' }
  };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MOL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function parse(d) { var p = d.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(d, n) { return iso(parse(d) + n * 864e5); }
  function range(a, b) { var out = []; for (var d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function kg(n) { return n.toFixed(1) + ' kg'; }
  function signed(n) { var r = Math.round(n * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r).toFixed(1) + ' kg'; }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap; }
  function listJoin(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  var R = { data: DATA, today: DATA.today, targets: DATA.targets, patient: DATA.patient, meds: DATA.meds,
    fmt: { num: num, kg: kg, signed: signed, clock: clock, list: listJoin } };

  R.dayShort = function (d) { var t = new Date(parse(d)); return WD[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MO[t.getUTCMonth()]; };
  R.dayNum = function (d) { return new Date(parse(d)).getUTCDate(); };
  R.dayLong = function (d) { var t = new Date(parse(d)); return t.getUTCDate() + ' ' + MOL[t.getUTCMonth()]; };
  R.dayName = function (d) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(parse(d)).getUTCDay()]; };
  R.yesterday = addDays(DATA.today, -1);
  R.periodDays = range(DATA.period.from, DATA.period.to);
  R.sinceDischarge = range(DATA.discharge, DATA.today);
  R.periodLabel = R.dayNum(DATA.period.from) + '–' + R.dayNum(DATA.period.to) + ' ' + MO[new Date(parse(DATA.period.to)).getUTCMonth()];

  R.med = function (id) { for (var i = 0; i < DATA.meds.length; i++) if (DATA.meds[i].id === id) return DATA.meds[i]; };
  /* Doses: one entry per med per scheduled time. */
  R.dosesPerDay = DATA.meds.reduce(function (s, m) { return s + m.times.length; }, 0);
  R.dosesOn = function (d) {
    var out = [];
    DATA.meds.forEach(function (m) {
      m.times.forEach(function (t, i) {
        var missed = DATA.missed.some(function (x) { return x.date === d && x.med === m.id && x.time === t; });
        var dueYet = d < DATA.today || t <= DATA.nowMin;
        out.push({ med: m, time: t, index: i, of: m.times.length, due: dueYet, missed: dueYet && missed, taken: dueYet && !missed,
          takenAt: (DATA.takenAt[d] || {})[t] || null });
      });
    });
    return out;
  };
  R.adherence = function (days) {
    days = days || R.periodDays;
    var due = 0, taken = 0;
    days.forEach(function (d) { R.dosesOn(d).forEach(function (x) { if (x.due) { due++; if (x.taken) taken++; } }); });
    return { due: due, taken: taken, missed: due - taken, pct: due ? Math.round(taken / due * 100) : 100,
      text: taken + ' of ' + due };
  };
  R.missedIn = function (days) {
    days = days || R.periodDays;
    return DATA.missed.filter(function (x) { return days.indexOf(x.date) >= 0; });
  };
  R.pillsToday = function () {
    var ds = R.dosesOn(DATA.today);
    var morning = ds.filter(function (x) { return x.time < 720; }), evening = ds.filter(function (x) { return x.time >= 720; });
    var next = ds.filter(function (x) { return !x.due; })[0] || null;
    return { all: ds, morning: morning, evening: evening, total: ds.length,
      taken: ds.filter(function (x) { return x.taken; }).length,
      morningTaken: morning.filter(function (x) { return x.taken; }).length,
      next: next, nextTime: next ? clock(next.time) : '' };
  };

  /* Weight */
  R.weight = function (d) { return DATA.weights[d] == null ? null : DATA.weights[d]; };
  R.weightToday = R.weight(DATA.today);
  R.dischargeWeight = R.weight(DATA.discharge);
  R.weightChange = function (days, d) { d = d || DATA.today; var a = R.weight(addDays(d, -days)), b = R.weight(d); return a == null || b == null ? null : Math.round((b - a) * 10) / 10; };
  R.vsDry = function (d) { var w = R.weight(d || DATA.today); return Math.round((w - DATA.targets.dryKg) * 10) / 10; };
  R.alertLineKg = DATA.targets.dryKg + DATA.targets.alertGainKg;
  R.weightAlert = function (d) { var c = R.weightChange(DATA.targets.alertDays, d); return c != null && c >= DATA.targets.alertGainKg; };
  R.alertRuleText = 'Call the nurse if you gain more than ' + DATA.targets.alertGainKg + ' kg in ' + DATA.targets.alertDays + ' days.';
  R.weightWord = function () { return R.weightAlert(DATA.today) ? 'Going up' : 'Steady'; };

  /* Fluid & salt */
  R.drinksToday = DATA.drinksToday;
  R.fluidOn = function (d) { return d === DATA.today ? DATA.drinksToday.reduce(function (s, e) { return s + e.ml; }, 0) : DATA.fluid[d]; };
  R.fluidOk = function (d) { var f = R.fluidOn(d); return f != null && f <= DATA.targets.fluidMl; };
  R.fluidDaysOk = function (days) { days = days || R.periodDays; return { ok: days.filter(R.fluidOk).length, of: days.length }; };
  R.sodiumToday = DATA.mealsToday.reduce(function (s, m) { return s + m.sodiumMg; }, 0);

  /* Symptoms & alerts */
  R.sym = SYM;
  R.symptomsOn = function (d) { return DATA.symptoms.filter(function (s) { return s.date === d; }); };
  R.symptomDays = function (key, days) { days = days || R.periodDays; return days.filter(function (d) { return R.symptomsOn(d).some(function (s) { return s.key === key; }); }); };
  R.recentSymptoms = function (n) { return DATA.symptoms.slice().reverse().slice(0, n || 3).map(function (s) { return { what: SYM[s.key].label, when: R.dayShort(s.date).replace(/ Oct$/, ' Oct'), sev: s.sev }; }); };
  R.alertOn = function (d) { for (var i = 0; i < DATA.alerts.length; i++) if (DATA.alerts[i].date === d) return DATA.alerts[i]; return null; };
  R.latestAlert = function () { return DATA.alerts[DATA.alerts.length - 1] || null; };
  R.zone = function (d) { var a = R.alertOn(d); if (a) return a.zone === 'red' ? 'r' : 'y'; return d <= DATA.today && R.weight(d) != null ? 'g' : null; };

  /* A good day = weighed, every dose taken, drinks within limit, no alert. Only finished days count. */
  R.isGoodDay = function (d) {
    if (d >= DATA.today) return false;
    return R.weight(d) != null && R.dosesOn(d).every(function (x) { return x.taken; }) && R.fluidOk(d) && !R.alertOn(d);
  };
  R.goodDaysInMonth = function () { var pre = DATA.today.slice(0, 8); return R.sinceDischarge.filter(function (d) { return d.slice(0, 8) === pre && R.isGoodDay(d); }); };
  R.goodStreak = (function () { var n = 0, d = R.yesterday; while (R.isGoodDay(d)) { n++; d = addDays(d, -1); } return n; })();
  R.weighStreak = (function () { var n = 0, d = DATA.today; while (R.weight(d) != null) { n++; d = addDays(d, -1); } return n; })();
  R.streakText = R.goodStreak >= 2
    ? R.goodStreak + ' good days in a row.'
    : 'You have weighed yourself ' + R.weighStreak + ' mornings in a row.';

  /* Reasons a day went yellow, from its logs */
  R.reasons = function (d) {
    var out = [], t = DATA.targets;
    var wc = R.weightChange(t.alertDays, d);
    if (wc != null && wc >= t.alertGainKg) out.push({ key: 'weight', chip: 'Weight up ' + wc.toFixed(1) + ' kg in ' + t.alertDays + ' days' });
    R.dosesOn(d).filter(function (x) { return x.missed; }).forEach(function (x) { out.push({ key: 'missed', chip: 'Missed ' + x.med.name.toLowerCase() + ' (' + clock(x.time) + ')' }); });
    var f = R.fluidOn(d); if (f != null && f > t.fluidMl) out.push({ key: 'fluid', chip: 'Drank ' + num(f) + ' ml · limit ' + num(t.fluidMl) });
    R.symptomsOn(d).forEach(function (s) { if (s.key !== 'tired') out.push({ key: 'sym', chip: SYM[s.key].label + ' (' + s.sev.toLowerCase() + ')' }); });
    return out;
  };
  R.alertHeadline = function (d) {
    var wc = R.weightChange(DATA.targets.alertDays, d);
    if (wc != null && wc >= DATA.targets.alertGainKg) return 'Your weight went up ' + wc.toFixed(1) + ' kg in ' + DATA.targets.alertDays + ' days';
    return 'Signs of extra fluid in your body';
  };
  R.alertSentence = function (d) {
    var bits = R.reasons(d).map(function (r) {
      if (r.key === 'weight') return 'your weight went up';
      if (r.key === 'missed') return 'you missed your ' + r.chip.replace(/^Missed /, '').replace(/ \(.*$/, '');
      if (r.key === 'fluid') return 'you drank more than your limit';
      return 'you had ' + r.chip.replace(/ \(.*$/, '').toLowerCase();
    });
    return 'On ' + R.dayName(d) + ' ' + R.dayLong(d) + ', ' + listJoin(bits) + '.';
  };

  /* The nurse script — built from that day's logs. Lines of segments {t, b}. */
  R.nurseScript = function (d) {
    var t = DATA.targets, P = DATA.patient, lines = [];
    var S = function (x) { return { t: x, b: false }; }, B = function (x) { return { t: x, b: true }; };
    lines.push([S('“Hello, I am '), B(P.name), S('. I have ' + P.condition + '.')]);
    var w = R.weight(d), wc = R.weightChange(t.alertDays, d), w0 = R.weight(addDays(d, -t.alertDays));
    if (wc != null && wc >= t.alertGainKg) lines.push([S('My weight went up from '), B(kg(w0) + ' to ' + kg(w)), S(' in ' + t.alertDays + ' days.')]);
    else if (w != null) lines.push([S('My weight this morning was '), B(kg(w)), S(wc == null ? '.' : ' (' + (wc >= 0 ? 'up ' : 'down ') + Math.abs(wc).toFixed(1) + ' kg in ' + t.alertDays + ' days).')]);
    var sy = R.symptomsOn(d).filter(function (s) { return s.key !== 'tired'; });
    if (sy.length) lines.push([S('I have '), B(listJoin(sy.map(function (s) { return SYM[s.key].say; }))), S(' (' + sy[0].sev.toLowerCase() + ').')]);
    var f = R.fluidOn(d);
    if (f != null && f > t.fluidMl) lines.push([S('I drank '), B(num(f) + ' ml'), S(' today. My limit is ' + num(t.fluidMl) + ' ml.')]);
    var miss = R.dosesOn(d).filter(function (x) { return x.missed; });
    if (miss.length) {
      lines.push([S('I missed my '), B(listJoin(miss.map(function (x) { return x.med.name.toLowerCase() + ' (' + x.med.generic.toLowerCase() + ' ' + x.med.strength + ')'; }))),
        S(' at ' + clock(miss[0].time) + '. I took my other medicines.”')]);
    } else {
      lines.push([S('I took all my medicine today.”')]);
    }
    return lines.map(function (segs, i) { return { i: i, segs: segs }; });
  };
  R.nurseScriptPlain = function (d) { return R.nurseScript(d).map(function (l) { return l.segs.map(function (s) { return s.t; }).join(''); }).join(' '); };

  R.questions = function () {
    var ank = R.symptomDays('ankles').length;
    return [
      'My ankles were swollen on ' + ank + ' day' + (ank === 1 ? '' : 's') + '. Is that a problem?',
      'I feel tired most afternoons. Is it my medicine?',
      'How can I take my water pill when I go out?'
    ];
  };

  window.VentraRecord = R;
})();
