// ═══ REMA 1000 Work Dashboard — App Logic ═══

// ── Actual salary data from payslips ──
const SALARY_DATA = [
  { month:"January", short:"Jan", period:"15 Dec–14 Jan", netPay:11600.27, grossIncome:16748.29, hours:79.27, pension:2688.03, feriepenge:2015.32, perfBonus:0 },
  { month:"February", short:"Feb", period:"15 Jan–14 Feb", netPay:7077.52, grossIncome:7683.15, hours:38.27, pension:1312.13, feriepenge:983.75, perfBonus:270.14 },
  { month:"March", short:"Mar", period:"15 Feb–14 Mar", netPay:9831.37, grossIncome:13642.37, hours:55.50, pension:2356.19, feriepenge:1752.86, perfBonus:608.33 },
  { month:"April", short:"Apr", period:"15 Mar–14 Apr", netPay:19364.10, grossIncome:30477.10, hours:134.50, pension:4693.76, feriepenge:3491.86, perfBonus:1235.36 },
];

// How many months have real payslip data (Jan=1, Feb=2, ... Apr=4)
const LAST_ACTUAL_MONTH = SALARY_DATA.length;
const FIRST_PROJECTED_MONTH = LAST_ACTUAL_MONTH + 1;
const ALL_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ALL_MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Pay rates ──
const RATES = {
  hourly: 158.45, lager: 9.65, frost: 8.55,
  shiftWeekday: 49.10, shiftWeekend: 106.65,
  amPct: 0.08, taxPct: 0.38, fradrag: 5652,
  pensionOwn: 0.02, pensionEmployer: 0.11,
  atp: 99, kantine: 84
};

// ── SU Fribeløb 2026 (income limits, after AM-bidrag) ──
const SU_LIMITS = {
  videregaaende: { withSU: 20749, withoutSU: 23598, noEducation: 45420 },
  ungdom:        { withSU: 15297, withoutSU: 23598, noEducation: 45420 }
};

// Actual A-indkomst (after AM-bidrag) from payslips for Jan–Apr
const ACTUAL_A_INDKOMST = {
  1: 15408.29,  // January
  2: 8064.52,   // February (includes AM-free sick pay)
  3: 12551.37,  // March
  4: 28039.10   // April
};

// ── Default schedule from contract images ──
const DEFAULT_SCHEDULE = {
  1:{3:'n',4:'n',10:'n',11:'n',17:'n',18:'n',23:'n',24:'n',25:'n'},
  2:{1:'n',2:'n',3:'n',6:'n',7:'n',8:'n',14:'n',15:'n',20:'n',21:'n',22:'n',27:'n',28:'n'},
  3:{1:'n',6:'n',7:'n',8:'n',14:'n',15:'n',19:'n',20:'n',21:'n',26:'n',27:'n',28:'n',29:'n'},
  4:{3:'n',4:'n',5:'n',10:'n',11:'n',12:'n',17:'n',18:'n',19:'n',24:'n',25:'n',26:'n'},
  5:{1:'n',2:'n',3:'n',8:'n',9:'n',10:'n',15:'n',16:'n',17:'n',22:'n',23:'n',24:'n',29:'n',30:'n',31:'n'},
  6:{5:'n',6:'n',7:'n',12:'n',13:'n',14:'n',19:'n',20:'n',21:'n',26:'n',27:'n',28:'n'},
  7:{1:'n',2:'n',7:'n',8:'n',9:'n',10:'n',11:'n',12:'n',14:'n',15:'n',16:'n',17:'n',18:'n',21:'n',22:'n',23:'n',28:'n',29:'n',30:'n'},
  8:{1:'n',2:'n',7:'n',8:'n',9:'n',14:'n',15:'n',16:'n',21:'n',22:'n',23:'n',28:'n',29:'n',30:'n'},
  9:{4:'n',5:'n',6:'n',11:'n',12:'n',13:'n',17:'n',18:'n',19:'n',20:'n',25:'n',26:'n',27:'n'},
  10:{1:'n',2:'n',3:'n',4:'n',9:'n',10:'n',11:'n',16:'n',17:'n',18:'n',23:'n',24:'n',25:'n',30:'n',31:'n'},
  11:{1:'n',6:'n',7:'n',8:'n',13:'n',14:'n',15:'n',20:'n',21:'n',22:'n',27:'n',28:'n',29:'n'},
  12:{4:'n',5:'n',6:'n',11:'n',12:'n',13:'n',18:'n',19:'n',20:'n',25:'n',26:'n',27:'n'}
};

let calendarData = {};
let overtimeData = {}; // tracks which days have OT
let shiftHours = 7.25;
let overtimeHours = 3; // default OT hours on overtime days
let currentTool = 'n'; // n=normal, e=extra, h=holiday, o=overtime, v=vacation, x=remove
let suEducationType = 'videregaaende';
let suMonths = {};

function loadState() {
  try {
    const saved = localStorage.getItem('rema_cal');
    if (saved) { calendarData = JSON.parse(saved); }
    else { calendarData = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)); }
    const savedOt = localStorage.getItem('rema_cal_ot');
    if (savedOt) { overtimeData = JSON.parse(savedOt); }
    const hrs = localStorage.getItem('rema_hours');
    if (hrs) shiftHours = parseFloat(hrs);
    const ot = localStorage.getItem('rema_ot_hours');
    if (ot) overtimeHours = parseFloat(ot);
    const edu = localStorage.getItem('rema_su_edu');
    if (edu) suEducationType = edu;
    const sm = localStorage.getItem('rema_su_months');
    if (sm) suMonths = JSON.parse(sm);
    else { for (let m=1;m<=12;m++) suMonths[m]='su'; }
  } catch(e) { calendarData = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)); for(let m=1;m<=12;m++) suMonths[m]='su'; }
}

function saveState() {
  localStorage.setItem('rema_cal', JSON.stringify(calendarData));
  localStorage.setItem('rema_cal_ot', JSON.stringify(overtimeData));
  localStorage.setItem('rema_hours', shiftHours.toString());
  localStorage.setItem('rema_ot_hours', overtimeHours.toString());
  localStorage.setItem('rema_su_edu', suEducationType);
  localStorage.setItem('rema_su_months', JSON.stringify(suMonths));
}

function exportData() {
  const data = { calendarData, overtimeData, shiftHours, overtimeHours, suEducationType, suMonths };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rema_dashboard_backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.calendarData) calendarData = data.calendarData;
      if (data.overtimeData) overtimeData = data.overtimeData;
      if (data.shiftHours) shiftHours = parseFloat(data.shiftHours);
      if (data.overtimeHours) overtimeHours = parseFloat(data.overtimeHours);
      if (data.suEducationType) suEducationType = data.suEducationType;
      if (data.suMonths) suMonths = data.suMonths;
      saveState();
      recalcAll();
      document.getElementById('shift-hours-input').value = shiftHours;
      document.getElementById('su-edu-select').value = suEducationType;
      alert('Data imported successfully!');
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // Reset input
}

function fmt(n) {
  return new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK',minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
}
function fmt2(n) {
  return new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK',minimumFractionDigits:2}).format(n);
}

// ── Calculate gross for a single day ──
function calcDayGross(type, dayOfWeek, otHoursValue) {
  const h = shiftHours;
  const isWeekend = dayOfWeek >= 5;
  const shiftPrem = isWeekend ? RATES.shiftWeekend : RATES.shiftWeekday;
  const supplements = h * (RATES.lager + RATES.frost + shiftPrem);

  let gross = 0;
  if (type === 'v') return 0; // vacation — no pay
  else if (type === 'n' || type === 's') gross = h * RATES.hourly + supplements; // normal or sick
  else { // extra or holiday: first 3h at 150%, rest at 200%
    const base3 = Math.min(h, 3) * RATES.hourly * 1.5;
    const rest = Math.max(0, h - 3) * RATES.hourly * 2.0;
    gross = base3 + rest + supplements;
  }
  
  if (otHoursValue > 0) {
    gross += otHoursValue * RATES.hourly * 2.0;
  }
  
  return gross;
}

// ── Calculate net from gross (monthly) ──
function calcMonthlyNet(grossMonthly, hoursWorked = 0) {
  if (grossMonthly <= 0) return { net: 0, am: 0, tax: 0, pensionOwn: 0, atp: 0, kantine: 0, gross: 0 };
  
  let atp = 99;
  if (hoursWorked < 39) atp = 0;
  else if (hoursWorked < 78) atp = 33;
  else if (hoursWorked < 117) atp = 66;

  const am = grossMonthly * RATES.amPct;
  const afterAm = grossMonthly - am;
  const taxable = Math.max(0, afterAm - RATES.fradrag);
  const tax = taxable * RATES.taxPct;
  
  // Pensionable base (Pensionsgivende Løn) includes 9% Fritvalg and 12.5% Feriepenge = ~1.215
  const pensionBase = grossMonthly * 1.215;
  const pensionOwn = pensionBase * RATES.pensionOwn;
  
  const net = afterAm - tax - pensionOwn - atp - RATES.kantine;
  return { net: Math.max(0, net), am, tax, pensionOwn, atp: atp, kantine: RATES.kantine, gross: grossMonthly };
}

// ── Calculate projected income for a month from calendar ──
function calcMonthProjection(month) {
  const days = calendarData[month] || {};
  const otDays = overtimeData[month] || {};
  let grossTotal = 0, otHoursSum = 0;
  let normalDays = 0, extraDays = 0, holidayDays = 0, overtimeDaysCount = 0, vacationDays = 0, sickDays = 0;

  Object.entries(days).forEach(([dayStr, type]) => {
    const day = parseInt(dayStr);
    const dow = (new Date(2026, month - 1, day).getDay() + 6) % 7;
    const otHoursValue = otDays[day] ? parseFloat(otDays[day]) : 0;
    
    otHoursSum += otHoursValue;
    grossTotal += calcDayGross(type, dow, otHoursValue);
    
    if (type === 'n') normalDays++;
    else if (type === 'e') extraDays++;
    else if (type === 'h') holidayDays++;
    else if (type === 'v') vacationDays++;
    else if (type === 's') sickDays++;
    
    if (otHoursValue > 0) overtimeDaysCount++;
  });

  const totalWorkedDays = normalDays + extraDays + holidayDays + sickDays;

  // Add performance bonus dynamically based on worked days (including sick)
  // Calculate historical bonus per day (estimated from historical hours)
  const histTotalBonus = SALARY_DATA.reduce((s,m) => s + m.perfBonus, 0);
  const histTotalHours = SALARY_DATA.reduce((s,m) => s + m.hours, 0);
  const histTotalDays = histTotalHours / shiftHours;
  const avgBonusPerDay = histTotalDays > 0 ? (histTotalBonus / histTotalDays) : 0;
  
  const projectedBonus = avgBonusPerDay * totalWorkedDays;
  grossTotal += projectedBonus;

  const expectedHours = (totalWorkedDays * shiftHours) + otHoursSum;
  const result = calcMonthlyNet(grossTotal, expectedHours);
  result.normalDays = normalDays;
  result.extraDays = extraDays;
  result.holidayDays = holidayDays;
  result.overtimeDays = overtimeDaysCount;
  result.vacationDays = vacationDays;
  result.sickDays = sickDays;
  result.totalDays = totalWorkedDays; 
  result.avgPerfBonus = projectedBonus;
  result.expectedHours = expectedHours;
  return result;
}

// ── Is month in the past (already paid)? ──
function isPastMonth(m) { return m <= LAST_ACTUAL_MONTH; }

// ── Recalculate everything ──
function recalcAll() {
  renderDashboard();
  renderCalendarStats();
  renderProjection();
  renderSU();
  saveState();
}

// ══════════ NAVIGATION ══════════
function initNav() {
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(link.dataset.section).classList.add('active');
    });
  });
}

// ══════════ DASHBOARD ══════════
function renderDashboard() {
  // Actual earnings from payslips (Jan–Apr)
  const actualNet = SALARY_DATA.reduce((s,m) => s + m.netPay, 0);
  const actualGross = SALARY_DATA.reduce((s,m) => s + m.grossIncome, 0);
  const actualHours = SALARY_DATA.reduce((s,m) => s + m.hours, 0);
  const actualPension = SALARY_DATA.reduce((s,m) => s + m.pension, 0);

  // Future projections from CALENDAR (May–Dec)
  let futureNet = 0, futureGross = 0, futureDays = 0;
  for (let m = FIRST_PROJECTED_MONTH; m <= 12; m++) {
    const proj = calcMonthProjection(m);
    futureNet += proj.net;
    futureGross += proj.gross;
    futureDays += proj.totalDays;
  }

  // Bonuses & Holiday Pay (All before tax)
  const summerBonusGross = 8000;
  const winterBonusGross = 8000;
  
  const actualFeriepenge = SALARY_DATA.reduce((s,m) => s + m.feriepenge, 0);
  const futureFeriepenge = futureGross * 0.125;
  const holidayPayGross = actualFeriepenge + futureFeriepenge;
  
  // Update progress bar
  const ferieValEl = document.getElementById('dynamic-holiday-earn-val');
  if (ferieValEl) ferieValEl.textContent = fmt(holidayPayGross);
  const ferieProgEl = document.getElementById('holiday-earn-progress');
  if (ferieProgEl) {
    const fPct = Math.min(100, (holidayPayGross / 35000) * 100);
    ferieProgEl.style.width = fPct + '%';
  }
  
  const calcBonusNet = (gross) => {
    const am = gross * RATES.amPct;
    return (gross - am) * (1 - RATES.taxPct);
  };

  // Total = actual payslips + calendar projection + bonuses/holiday pay
  const totalWorkNetYear = actualNet + futureNet + calcBonusNet(summerBonusGross) + calcBonusNet(winterBonusGross) + calcBonusNet(holidayPayGross);
  const totalGrossYear = actualGross + futureGross + summerBonusGross + winterBonusGross + holidayPayGross;
  
  // Calculate SU Net for the whole year (assumes 6820 gross standard, 38% tax on B-card)
  const SU_GROSS = 6820;
  let suMonthsCount = 0;
  for (let m = 1; m <= 12; m++) { if (suMonths[m] === 'su') suMonthsCount++; }
  const totalSuNetYear = suMonthsCount * (SU_GROSS * (1 - RATES.taxPct));
  
  const combinedTotalNet = totalWorkNetYear + totalSuNetYear;
  const avgMonthlyNet = combinedTotalNet / 12;

  document.getElementById('stat-total-earned').textContent = fmt(actualNet);
  document.getElementById('stat-total-earned-label').textContent = `Work Net Received So Far (Jan–${ALL_MONTH_SHORT[LAST_ACTUAL_MONTH - 1]})`;
  document.getElementById('stat-projected-year').textContent = fmt(totalWorkNetYear);
  document.getElementById('stat-projected-year-label').textContent = `Full Year Work Net (incl. Bonuses)`;
  document.getElementById('stat-su-net').textContent = fmt(totalSuNetYear);
  document.getElementById('stat-su-net-label').textContent = `Full Year SU Net (${suMonthsCount} months)`;
  document.getElementById('stat-combined-net').textContent = fmt(combinedTotalNet);
  document.getElementById('stat-avg-monthly').textContent = fmt(avgMonthlyNet);
  document.getElementById('stat-total-hours').textContent = actualHours.toFixed(0) + 'h';
  document.getElementById('stat-total-hours-label').textContent = `Hours Worked So Far (Jan–${ALL_MONTH_SHORT[LAST_ACTUAL_MONTH - 1]})`;
  document.getElementById('stat-total-pension').textContent = fmt(actualPension);
  document.getElementById('stat-total-pension-label').textContent = `Pension Deposited So Far (Jan–${ALL_MONTH_SHORT[LAST_ACTUAL_MONTH - 1]})`;
  document.getElementById('stat-holiday-pay').textContent = fmt(holidayPayGross);

  // Bar chart — actual months (dark green) + projected months (light green)
  const allMonths = [];
  SALARY_DATA.forEach(m => allMonths.push({ label: m.short, net: m.netPay, gross: m.grossIncome, actual: true }));
  for (let m = FIRST_PROJECTED_MONTH; m <= 12; m++) {
    const proj = calcMonthProjection(m);
    allMonths.push({ label: ALL_MONTH_SHORT[m-1], net: proj.net, gross: proj.gross, actual: false });
  }

  const maxNet = Math.max(...allMonths.map(m => m.net), 1);
  document.getElementById('net-pay-bars').innerHTML = allMonths.map(m => {
    const pct = (m.net / maxNet) * 100;
    const color = m.actual ? '#2d936c' : '#a8d5c2';
    return `<div class="bar-group">
      <div class="bar-value">${fmt(m.net)}</div>
      <div class="bar" style="height:${pct}%;background:${color}">
        <div class="bar-tooltip">${m.label}: ${fmt(m.net)}${m.actual ? '' : ' (from calendar)'}</div>
      </div>
      <div class="bar-label">${m.label}</div>
    </div>`;
  }).join('');

  // Monthly table — actual rows + projected rows
  document.getElementById('monthly-breakdown-body').innerHTML =
    SALARY_DATA.map(m => `<tr>
      <td><strong>${m.month}</strong></td><td>${m.period}</td><td>${m.hours}h</td>
      <td>${fmt2(m.grossIncome)}</td><td style="color:var(--accent-green);font-weight:700">${fmt2(m.netPay)}</td>
      <td><span class="badge badge-green">✅ Paid</span></td>
    </tr>`).join('') +
    Array.from({length: 12 - LAST_ACTUAL_MONTH}, (_, i) => {
      const m = FIRST_PROJECTED_MONTH + i;
      const proj = calcMonthProjection(m);
      return `<tr style="opacity:${proj.totalDays ? 1 : 0.4}">
        <td><strong>${ALL_MONTH_NAMES[m-1]}</strong></td><td>From calendar</td><td>${(proj.totalDays * shiftHours).toFixed(0)}h</td>
        <td>${fmt(proj.gross)}</td><td style="color:var(--accent-blue);font-weight:600">${fmt(proj.net)}</td>
        <td><span class="badge badge-blue">📅 ${proj.totalDays} days</span></td>
      </tr>`;
    }).join('');
}

// ══════════ CALENDAR ══════════
function renderCalendar() {
  const container = document.getElementById('calendar-months');
  const today = new Date();
  const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Find the next working day from today
  let nextWorkMonth = 0, nextWorkDay = 0;
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  let searching = true;
  for (let m = todayMonth; m <= 12 && searching; m++) {
    const mDays = calendarData[m] || {};
    const daysInM = new Date(2026, m, 0).getDate();
    const startDay = (m === todayMonth) ? todayDay + 1 : 1;
    for (let d = startDay; d <= daysInM && searching; d++) {
      const t = mDays[d];
      if (t && t !== 'v') {
        nextWorkMonth = m;
        nextWorkDay = d;
        searching = false;
      }
    }
  }

  let html = '';
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(2026, month, 0).getDate();
    const firstDay = (new Date(2026, month - 1, 1).getDay() + 6) % 7;
    const mData = calendarData[month] || {};

    html += `<div class="card cal-month"><div class="cal-month-title">${monthNames[month-1]}</div>`;
    html += `<div class="cal-header">${dayNames.map(d=>`<span>${d}</span>`).join('')}</div>`;
    html += `<div class="cal-days">`;
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDay + day - 1) % 7;
      const type = mData[day];
      const otHoursValue = overtimeData[month] && overtimeData[month][day];
      const isToday = today.getFullYear()===2026 && today.getMonth()===month-1 && today.getDate()===day;
      const isNextWork = (month === nextWorkMonth && day === nextWorkDay);
      let cls = 'cal-day';
      if (type === 'n') cls += ' normal';
      else if (type === 'e') cls += ' extra';
      else if (type === 'h') cls += ' holiday';
      else if (type === 's') cls += ' sick';
      else if (type === 'v') cls += ' vacation';
      else if (dow >= 5) cls += ' weekend';
      if (isToday) cls += ' today';
      if (isNextWork) cls += ' next-work';
      if (otHoursValue) cls += ' has-ot';
      
      const otBadge = otHoursValue ? `<div class="ot-badge">${otHoursValue}h</div>` : '';
      html += `<div class="${cls}" data-month="${month}" data-day="${day}" onclick="toggleDay(${month},${day})">${day}${otBadge}</div>`;
    }
    html += `</div></div>`;
  }
  container.innerHTML = html;
}

function toggleDay(month, day) {
  if (!calendarData[month]) calendarData[month] = {};
  if (!overtimeData[month]) overtimeData[month] = {};
  
  const current = calendarData[month][day];

  if (currentTool === 'o') {
    // Prompt for OT hours if clicking an active working shift
    if (current && current !== 'v') {
      if (overtimeData[month][day]) {
        if (confirm("Remove overtime for this day? Cancel to change hours instead.")) {
          delete overtimeData[month][day];
        } else {
          let hrs = prompt("Enter new overtime hours:", overtimeData[month][day]);
          if (hrs !== null && !isNaN(parseFloat(hrs)) && parseFloat(hrs) > 0) overtimeData[month][day] = parseFloat(hrs);
        }
      } else {
        let hrs = prompt("Enter overtime hours:", "3");
        if (hrs !== null && !isNaN(parseFloat(hrs)) && parseFloat(hrs) > 0) overtimeData[month][day] = parseFloat(hrs);
      }
    }
  } else if (currentTool === 'x') {
    delete calendarData[month][day];
    delete overtimeData[month][day];
  } else {
    calendarData[month][day] = current === currentTool ? undefined : currentTool;
    if (!calendarData[month][day]) {
      delete calendarData[month][day];
      delete overtimeData[month][day];
    }
  }
  
  renderCalendar();
  recalcAll();
}

function setTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.cal-controls .tool-btn').forEach(b => {
    b.classList.toggle('active-tool', b.dataset.tool === tool);
  });
}

function resetCalendar() {
  if (confirm('Reset calendar to default schedule?')) {
    calendarData = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
    renderCalendar();
    recalcAll();
  }
}

function updateShiftHours(val) {
  const v = parseFloat(val);
  if (!isNaN(v) && v > 0 && v <= 24) { shiftHours = v; recalcAll(); }
}

function updateOvertimeHours(val) {
  const v = parseFloat(val);
  if (!isNaN(v) && v >= 0 && v <= 24) { overtimeHours = v; recalcAll(); }
}

function renderCalendarStats() {
  let totalDays = 0, normalDays = 0, extraDays = 0, holidayDays = 0, overtimeDays = 0, vacationDays = 0, sickDays = 0;
  for (let m = 1; m <= 12; m++) {
    const days = calendarData[m] || {};
    const otDays = overtimeData[m] || {};
    Object.keys(days).forEach(d => {
      const t = days[d];
      if (t === 'n') { normalDays++; totalDays++; }
      else if (t === 'e') { extraDays++; totalDays++; }
      else if (t === 'h') { holidayDays++; totalDays++; }
      else if (t === 's') { sickDays++; totalDays++; }
      else if (t === 'v') { vacationDays++; }
      
      if (otDays[d]) { overtimeDays++; }
    });
  }
  document.getElementById('cal-total').textContent = totalDays;
  document.getElementById('cal-normal').textContent = normalDays;
  document.getElementById('cal-extra').textContent = extraDays;
  document.getElementById('cal-holiday').textContent = holidayDays;
  document.getElementById('cal-sick').textContent = sickDays;
  document.getElementById('cal-overtime').textContent = overtimeDays;
  document.getElementById('cal-vacation').textContent = vacationDays;
}

// ══════════ PROJECTION ══════════
function renderProjection() {
  // Actual = payslip data (Jan–Apr)
  const actualNet = SALARY_DATA.reduce((s,m) => s + m.netPay, 0);
  const actualGross = SALARY_DATA.reduce((s,m) => s + m.grossIncome, 0);

  // Projected = calendar-based (May–Dec)
  let futureNet = 0, futureGross = 0;
  const monthlyProj = [];
  for (let m = FIRST_PROJECTED_MONTH; m <= 12; m++) {
    const p = calcMonthProjection(m);
    futureNet += p.net;
    futureGross += p.gross;
    monthlyProj.push({ month: m, ...p });
  }

  // Bonuses & Holiday Pay (All before tax)
  const summerBonusGross = 8000;
  const winterBonusGross = 8000;
  const actualFeriepenge = SALARY_DATA.reduce((s,m) => s + m.feriepenge, 0);
  const holidayPayGross = actualFeriepenge + (futureGross * 0.125);

  const calcBonusNet = (gross) => {
    const am = gross * RATES.amPct;
    return (gross - am) * (1 - RATES.taxPct);
  };

  const totalBonusNet = calcBonusNet(summerBonusGross) + calcBonusNet(winterBonusGross) + calcBonusNet(holidayPayGross);
  const totalBonusGross = summerBonusGross + winterBonusGross + holidayPayGross;

  // Calculate SU Net for the whole year
  const SU_GROSS = 6820;
  const suNetPerMonth = SU_GROSS * (1 - RATES.taxPct);
  let suMonthsCount = 0;
  let suMonthsPast = 0;
  for (let m = 1; m <= 12; m++) {
    if (suMonths[m] === 'su') {
      suMonthsCount++;
      if (m <= LAST_ACTUAL_MONTH) suMonthsPast++;
    }
  }
  const totalSuNetYear = suMonthsCount * suNetPerMonth;
  const suReceivedSoFar = suMonthsPast * suNetPerMonth;

  // Year total = actual + calendar projection + bonuses + holiday pay
  const totalWorkNet = actualNet + futureNet + totalBonusNet;
  const totalGross = actualGross + futureGross + totalBonusGross;
  const combinedGrandNet = totalWorkNet + totalSuNetYear;

  document.getElementById('proj-earned').textContent = fmt(actualNet);
  document.getElementById('proj-earned-label').textContent = `Work Net Received So Far (Jan–${ALL_MONTH_SHORT[LAST_ACTUAL_MONTH - 1]})`;
  document.getElementById('proj-future-net').textContent = fmt(futureNet);
  document.getElementById('proj-future-label').textContent = `Remaining Work Net (${ALL_MONTH_SHORT[FIRST_PROJECTED_MONTH - 1]}–Dec, From Calendar)`;
  document.getElementById('proj-bonus-net').textContent = fmt(totalBonusNet);
  document.getElementById('proj-year-net').textContent = fmt(totalWorkNet);
  document.getElementById('proj-su-received').textContent = fmt(suReceivedSoFar);
  document.getElementById('proj-su-received-label').textContent = `SU Net Received So Far (Jan–${ALL_MONTH_SHORT[LAST_ACTUAL_MONTH - 1]})`;
  document.getElementById('proj-su-net').textContent = fmt(totalSuNetYear);
  document.getElementById('proj-su-net-label').textContent = `Full Year SU Net (${suMonthsCount} months)`;
  document.getElementById('proj-grand-net').textContent = fmt(combinedGrandNet);

  // Projection table
  document.getElementById('proj-table-title').textContent = `Monthly Projection (${ALL_MONTH_NAMES[FIRST_PROJECTED_MONTH - 1]}–December) — Based on Calendar`;
  document.getElementById('proj-table-body').innerHTML = monthlyProj.map(p => {
    // We calculate total holiday pay earned year-to-date and future to get the May payout
    const actFerie = SALARY_DATA.reduce((s,m) => s + m.feriepenge, 0);
    const futFerie = futureGross * 0.125;
    const holPay = actFerie + futFerie;

    // Show what bonuses land in this month (shown as Gross, since the table shows Gross)
    let bonusNote = '';
    if (p.month === 5) bonusNote = `<div style="font-size:0.65rem;color:var(--accent-blue);margin-top:2px">+${fmt(holPay)} Holiday Pay (Gross)</div><div style="font-size:0.6rem;color:var(--text-muted)">SU uses: (${fmt(p.gross)}+${fmt(holPay)})×0.92 = ${fmt((p.gross + holPay) * 0.92)}</div>`;
    if (p.month === 6) bonusNote = `<div style="font-size:0.65rem;color:var(--accent-amber);margin-top:2px">+8.000 Summer Bonus (Gross)</div><div style="font-size:0.6rem;color:var(--text-muted)">SU uses: (${fmt(p.gross)}+8.000)×0.92 = ${fmt((p.gross + 8000) * 0.92)}</div>`;
    if (p.month === 12) bonusNote = `<div style="font-size:0.65rem;color:var(--accent-amber);margin-top:2px">+8.000 Winter Bonus (Gross)</div><div style="font-size:0.6rem;color:var(--text-muted)">SU uses: (${fmt(p.gross)}+8.000)×0.92 = ${fmt((p.gross + 8000) * 0.92)}</div>`;
    // SU net for this month
    const hasSU = suMonths[p.month] === 'su';
    const suNetMonth = hasSU ? (6820 * (1 - RATES.taxPct)) : 0;
    const monthTotal = p.net + suNetMonth;
    
    return `<tr>
    <td><strong>${ALL_MONTH_NAMES[p.month - 1]}</strong>${bonusNote}</td>
    <td>${p.normalDays}</td><td>${p.extraDays}</td><td>${p.holidayDays}</td><td>${p.sickDays}</td><td>${p.overtimeDays}</td><td>${p.vacationDays}</td>
    <td>${p.expectedHours.toFixed(1)}h</td>
    <td>${fmt(p.gross)}</td>
    <td style="color:var(--accent-green);font-weight:700">${fmt(p.net)}</td>
    <td style="color:var(--accent-blue);font-weight:600">${hasSU ? fmt(suNetMonth) : '<span style="color:var(--text-muted)">—</span>'}</td>
    <td style="font-weight:700">${fmt(monthTotal)}</td>
  </tr>`;
  }).join('');
}

// ══════════ SALARY DETAILS ══════════
function renderSalary() {
  const details = [
    { m:"January", period:"15 Dec–14 Jan", hrs:"79.27h (57.77 + 1.5 OT50 + 20 OT100)", rate:"153.70", base:8879.26,ot50:115.28,ot100:3074,lager:557.48,frost:493.93,shiftWd:759.20,shiftWe:2243.39,sogneH:1088.27,bonus:0,sick:0,am:1340,tax:3707,atp:198,pension:413.54,kantine:84,net:11600.27,payDate:"30.01.2026" },
    { m:"February", period:"15 Jan–14 Feb", hrs:"38.27h (30.02 + 1 OT50 + 7.25 sick)", rate:"153.70", base:4614.08,ot50:76.85,ot100:0,lager:289.69,frost:256.67,shiftWd:736.42,shiftWe:1494.22,sogneH:0,bonus:270.14,sick:996.37,am:615,tax:916,atp:0,pension:201.87,kantine:56,net:7077.52,payDate:"27.02.2026" },
    { m:"March", period:"15 Feb–14 Mar", hrs:"55.50h (53 + 2.5 OT50)", rate:"158.45", base:8397.84,ot50:198.07,ot100:0,lager:511.45,frost:453.15,shiftWd:1534.39,shiftWe:2319.63,sogneH:0,bonus:608.33,sick:0,am:1091,tax:2621,atp:99,pension:362.49,kantine:84,net:9831.37,payDate:"31.03.2026" },
    { m:"April", period:"15 Mar–14 Apr", hrs:"134.50h (89 + 11 OT50 + 34.5 OT100)", rate:"158.45", base:14102.04,ot50:871.50,ot100:5466.53,lager:858.85,frost:760.95,shiftWd:2319.99,shiftWe:2319.63,sogneH:3363.37,bonus:1235.36,sick:0,am:2438,tax:8507,atp:297,pension:722.12,kantine:168,net:19364.10,payDate:"30.04.2026" },
  ];

  document.getElementById('salary-details').innerHTML = details.map(d => {
    const earnings = [
      {l:'Base Pay',v:d.base,c:'blue'},{l:'Overtime 50%',v:d.ot50,c:'amber'},{l:'Overtime 100%',v:d.ot100,c:'red'},
      {l:'Warehouse Supp.',v:d.lager,c:'green'},{l:'Cold Storage Supp.',v:d.frost,c:'purple'},
      {l:'Shift (Weekday)',v:d.shiftWd,c:'blue'},{l:'Shift (Weekend)',v:d.shiftWe,c:'amber'},
      {l:'Public Holiday',v:d.sogneH,c:'purple'},{l:'Bonus',v:d.bonus,c:'green'},{l:'Sick Pay',v:d.sick,c:'amber'},
    ].filter(e => e.v > 0);
    const maxE = Math.max(...earnings.map(e=>e.v));
    return `<div class="card full-width">
      <div class="card-title"><span class="dot"></span>${d.m} — ${d.period}</div>
      <div class="two-col"><div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Earnings</div>
        <div class="pay-breakdown-bars">${earnings.map(e=>`<div class="pay-bar-row">
          <div class="pay-bar-label">${e.l}</div>
          <div class="pay-bar-track"><div class="pay-bar-fill ${e.c}" style="width:${(e.v/maxE)*100}%">${fmt2(e.v)}</div></div>
        </div>`).join('')}</div>
      </div><div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Summary</div>
        <div class="info-row"><span class="info-label">Hours</span><span class="info-value">${d.hrs}</span></div>
        <div class="info-row"><span class="info-label">Rate</span><span class="info-value">${d.rate} DKK/h</span></div>
        <div class="info-row"><span class="info-label">AM-bidrag (8%)</span><span class="info-value" style="color:var(--accent-red)">−${fmt2(d.am)}</span></div>
        <div class="info-row"><span class="info-label">A-skat (38%)</span><span class="info-value" style="color:var(--accent-red)">−${fmt2(d.tax)}</span></div>
        <div class="info-row"><span class="info-label">Pension (2%)</span><span class="info-value" style="color:var(--accent-red)">−${fmt2(d.pension)}</span></div>
        <div class="info-row"><span class="info-label">ATP</span><span class="info-value" style="color:var(--accent-red)">−${fmt2(d.atp)}</span></div>
        <div class="info-row"><span class="info-label">Canteen</span><span class="info-value" style="color:var(--accent-red)">−${fmt2(d.kantine)}</span></div>
        <div class="info-row" style="border-top:2px solid var(--accent-green);padding-top:14px;margin-top:4px">
          <span class="info-label" style="font-weight:700;color:var(--text-primary)">Net Pay</span>
          <span class="info-value" style="color:var(--accent-green);font-size:1.15rem">${fmt2(d.net)}</span>
        </div>
        <div class="info-row"><span class="info-label">Pay Date</span><span class="info-value"><span class="badge badge-blue">${d.payDate}</span></span></div>
      </div></div></div>`;
  }).join('');
}

// ══════════ SU FRIBELØB ══════════
function getMonthlyIncomeAfterAM(month) {
  let baseAIndkomst = 0;
  
  // Base A-indkomst from payslips or calendar
  if (ACTUAL_A_INDKOMST[month] !== undefined) {
    baseAIndkomst = ACTUAL_A_INDKOMST[month];
  } else {
    const proj = calcMonthProjection(month);
    baseAIndkomst = proj.gross * (1 - RATES.amPct); // A-indkomst = gross - AM-bidrag
  }

  // SU limits evaluate A-indkomst (Income after AM-bidrag, before Tax)
  let extraAIndkomst = 0;
  
  // Calculate dynamic holiday pay
  const actFerie = SALARY_DATA.reduce((s,m) => s + m.feriepenge, 0);
  let futGross = 0;
  for (let m = FIRST_PROJECTED_MONTH; m <= 12; m++) { futGross += calcMonthProjection(m).gross; }
  const holPay = actFerie + (futGross * 0.125);

  if (month === 5 && month > LAST_ACTUAL_MONTH) {
    // Holiday pay -> A-indkomst
    extraAIndkomst += holPay * (1 - RATES.amPct); 
  }
  if (month === 6 && month > LAST_ACTUAL_MONTH) {
    // Summer bonus (8,000 gross) -> A-indkomst
    extraAIndkomst += 8000 * (1 - RATES.amPct);
  }
  if (month === 12 && month > LAST_ACTUAL_MONTH) {
    // Winter bonus (8,000 gross) -> A-indkomst
    extraAIndkomst += 8000 * (1 - RATES.amPct);
  }

  return baseAIndkomst + extraAIndkomst;
}

function getSULimit(month) {
  const type = suMonths[month] || 'su';
  const limits = SU_LIMITS[suEducationType];
  if (type === 'su') return limits.withSU;
  if (type === 'nosu') return limits.withoutSU;
  return limits.noEducation;
}

function setSUEducation(type) {
  suEducationType = type;
  recalcAll();
}

function setSUMonth(month, type) {
  suMonths[month] = type;
  recalcAll();
}

function renderSU() {
  const limits = SU_LIMITS[suEducationType];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fullNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Calculate annual fribeløb and annual income
  let annualLimit = 0, annualIncome = 0;
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const income = getMonthlyIncomeAfterAM(m);
    const limit = getSULimit(m);
    annualLimit += limit;
    annualIncome += income;
    const diff = limit - income;
    rows.push({ month: m, name: fullNames[m-1], short: monthNames[m-1], income, limit, diff, type: suMonths[m]||'su', isPast: m<=LAST_ACTUAL_MONTH });
  }

  const remaining = annualLimit - annualIncome;
  const pct = Math.min(100, (annualIncome / annualLimit) * 100);
  const isOver = annualIncome > annualLimit;

  // Update stat cards
  document.getElementById('su-annual-limit').textContent = fmt(annualLimit);
  document.getElementById('su-annual-income').textContent = fmt(annualIncome);
  document.getElementById('su-remaining').textContent = isOver ? '−' + fmt(annualIncome - annualLimit) : fmt(remaining);
  document.getElementById('su-remaining').style.color = isOver ? 'var(--accent-red)' : 'var(--accent-green)';
  const pctEl = document.getElementById('su-pct');
  pctEl.textContent = pct.toFixed(1) + '%';
  pctEl.style.color = pct > 90 ? 'var(--accent-red)' : pct > 70 ? 'var(--accent-amber)' : 'var(--accent-green)';

  // Progress bar
  const bar = document.getElementById('su-progress-fill');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.style.background = isOver ? 'var(--accent-red)' : pct > 90 ? 'var(--accent-amber)' : 'var(--accent-green)';
  
  // Calculate remaining if skat counted gross (before AM-bidrag) instead of A-indkomst
  // If they used gross, your income would appear HIGHER (gross > A-indkomst), so less remaining
  const annualGrossIncome = annualIncome / (1 - RATES.amPct); // Convert A-indkomst back to gross
  const remainingIfGross = annualLimit - annualGrossIncome;
  
  // Calculate how many more extra days they can work
  const extraDayGross = calcDayGross('e', 1, 0); // 1 = Tuesday (weekday)
  const extraDayAIndkomst = extraDayGross * (1 - RATES.amPct);
  const extraDaysLeft = remaining > 0 ? Math.floor(remaining / extraDayAIndkomst) : 0;
  
  document.getElementById('su-progress-text').textContent =
    isOver ? `⚠️ Over limit by ${fmt(annualIncome - annualLimit)}! You may need to repay SU.`
    : `${fmt(remaining)} remaining under the annual limit`;
    
  document.getElementById('su-progress-extra').innerHTML = 
    isOver ? `You have exceeded the limit and cannot take any more shifts without penalization.`
    : `(only <strong>${fmt(Math.max(0, remainingIfGross))}</strong> remaining if skat counted your gross income including that 8% AM-bidrag).<br>You can work approx. <strong>${extraDaysLeft} more Extra Days</strong> before reaching the limit.`;

  // Education type selector
  document.getElementById('su-edu-select').value = suEducationType;

  // Monthly table
  document.getElementById('su-table-body').innerHTML = rows.map(r => {
    const barPct = Math.min(100, (r.income / r.limit) * 100);
    const overMonth = r.income > r.limit;
    
    // Calculate dynamic holiday pay
    const actFerie = SALARY_DATA.reduce((s,m) => s + m.feriepenge, 0);
    let futGross = 0;
    for (let m = FIRST_PROJECTED_MONTH; m <= 12; m++) { futGross += calcMonthProjection(m).gross; }
    const holPay = actFerie + (futGross * 0.125);

    // Show bonus breakdown in income column with A-indkomst amounts
    let bonusBadge = '';
    if (r.month === 5 && r.month > LAST_ACTUAL_MONTH) bonusBadge = `<div style="font-size:0.6rem;color:var(--accent-blue);margin-top:1px">🌴 incl. ${fmt(holPay * (1 - RATES.amPct))} Holiday Pay</div>`;
    if (r.month === 6 && r.month > LAST_ACTUAL_MONTH) bonusBadge = `<div style="font-size:0.6rem;color:var(--accent-amber);margin-top:1px">☀️ incl. ${fmt(8000 * (1 - RATES.amPct))} Summer Bonus</div>`;
    if (r.month === 12 && r.month > LAST_ACTUAL_MONTH) bonusBadge = `<div style="font-size:0.6rem;color:var(--accent-amber);margin-top:1px">❄️ incl. ${fmt(8000 * (1 - RATES.amPct))} Winter Bonus</div>`;
    
    return `<tr>
      <td><strong>${r.name}</strong></td>
      <td>
        <select onchange="setSUMonth(${r.month}, this.value)" style="padding:3px 6px;border:1px solid var(--border-color);border-radius:4px;font-size:0.75rem;font-family:Inter,sans-serif;background:white">
          <option value="su" ${r.type==='su'?'selected':''}>Receiving SU</option>
          <option value="nosu" ${r.type==='nosu'?'selected':''}>No SU / Orlov</option>
          <option value="noedu" ${r.type==='noedu'?'selected':''}>Not in education</option>
        </select>
      </td>
      <td>${fmt(r.limit)}</td>
      <td>${r.isPast ? fmt(r.income) + ' <span class="badge badge-green" style="font-size:0.6rem">actual</span>' : fmt(r.income) + ' <span class="badge badge-blue" style="font-size:0.6rem">proj.</span>'}${bonusBadge}</td>
      <td style="color:${overMonth ? 'var(--accent-red)' : 'var(--accent-green)'};font-weight:600">${overMonth ? '−' + fmt(r.income - r.limit) : fmt(r.diff)}</td>
      <td style="width:120px">
        <div style="height:8px;background:var(--bg-subtle);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${barPct}%;background:${overMonth?'var(--accent-red)':barPct>90?'var(--accent-amber)':'var(--accent-green)'};border-radius:4px;transition:width 0.4s"></div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ══════════ INIT ══════════
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNav();
  renderCalendar();
  renderDashboard();
  renderCalendarStats();
  renderProjection();
  renderSalary();
  renderSU();
  setTool('n');

  document.getElementById('shift-hours-input').value = shiftHours;
  document.getElementById('shift-hours-input').addEventListener('change', e => updateShiftHours(e.target.value));
  document.getElementById('su-edu-select').addEventListener('change', e => setSUEducation(e.target.value));
});
