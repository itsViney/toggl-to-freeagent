const csvInput = document.getElementById('csvInput');
const memberSelect = document.getElementById('memberSelect');
const weekSelect = document.getElementById('weekSelect');
const projectSelect = document.getElementById('projectSelect');
const taskSelect = document.getElementById('taskSelect');
const roundingSelect = document.getElementById('roundingSelect');
const timesheetBody = document.getElementById('timesheetBody');
const controls = document.getElementById('controls');
const tableTotal = document.getElementById('tableTotal');
const weekSummary = document.getElementById('weekSummary');
const themeToggle = document.getElementById('themeToggle');
const csvError = document.getElementById('csvError');
const loadStatus = document.getElementById('csvStatus');
const hoursHeading = document.getElementById('hoursHeading');


initTheme();

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// restore rounding preference if present
const storedRounding = localStorage.getItem('rounding');
if (storedRounding) {
  roundingSelect.value = storedRounding;
}

let parsedData = [];

loadStoredCsv();

csvInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  file.text().then(text => {
    processCsvData(text, true, file.name);
  });
});

function showCsvError(msg) {
  csvError.textContent = msg;
  csvError.classList.remove('d-none');
  csvInput.classList.add('is-invalid');
  loadStatus.classList.add('d-none');
  // loadStatus.classList.remove('d-block');
}

function populateWeekDropdown() {
  const weeks = [...new Set(parsedData.map(row => row['Start date']))]
    .map(date => ({
      raw: date,
      formatted: formatWeekLabel(date)
    }))
    .filter((item, index, self) =>
      index === self.findIndex(t => t.formatted === item.formatted)
    )
    .sort((a, b) => new Date(b.raw) - new Date(a.raw));

  setOptions(weekSelect, weeks.map(w => w.formatted));
  const storedWeek = localStorage.getItem('selectedWeek');
  if (storedWeek && weeks.some(w => w.formatted === storedWeek)) {
    weekSelect.value = storedWeek;
  } else {
    weekSelect.selectedIndex = 0;
  }

  weekSelect.addEventListener('change', () => {
    localStorage.setItem('selectedWeek', weekSelect.value);
    populateMemberDropdown();
    updateTable();
  });

  roundingSelect.addEventListener('change', () => {
    localStorage.setItem('rounding', roundingSelect.value);
    updateTable();
  });
  populateMemberDropdown();
}

function populateMemberDropdown() {
  const selectedWeek = weekSelect.value.split(' ')[0];
  const members = [...new Set(parsedData
    .filter(row => row['Start date'] >= selectedWeek && row['Start date'] < getNextWeekDate(selectedWeek))
    .map(row => row['Member']))].sort();

  setOptions(memberSelect, members);
  const storedMember = localStorage.getItem('selectedMember');
  if (storedMember && members.includes(storedMember)) {
    memberSelect.value = storedMember;
  } else {
    memberSelect.selectedIndex = 0;
  }

  memberSelect.addEventListener('change', () => {
    localStorage.setItem('selectedMember', memberSelect.value);
    populateProjectDropdown();
    updateTable();
  });

  populateProjectDropdown();
}

function populateProjectDropdown() {
  const selectedWeek = weekSelect.value.split(' ')[0];
  const selectedMember = memberSelect.value;
  const projects = [...new Set(parsedData
    .filter(row => row['Member'] === selectedMember && row['Start date'] >= selectedWeek && row['Start date'] < getNextWeekDate(selectedWeek))
    .map(row => row['Project'].trim()))].sort();

  setOptions(projectSelect, projects);
  const storedProject = localStorage.getItem('selectedProject');
  if (storedProject && projects.includes(storedProject)) {
    projectSelect.value = storedProject;
  } else {
    projectSelect.selectedIndex = 0;
  }

  projectSelect.addEventListener('change', () => {
    localStorage.setItem('selectedProject', projectSelect.value);
    populateTaskDropdown();
    updateTable();
  });

  populateTaskDropdown();
}

function populateTaskDropdown() {
  const selectedWeek = weekSelect.value.split(' ')[0];
  const selectedMember = memberSelect.value;
  const selectedProject = projectSelect.value;
  const tasks = [...new Set(parsedData
    .filter(row => row['Member'] === selectedMember && row['Project'].trim() === selectedProject && row['Start date'] >= selectedWeek && row['Start date'] < getNextWeekDate(selectedWeek))
    .map(row => row['Description'].trim()))].sort();

  setOptions(taskSelect, tasks);
  const storedTask = localStorage.getItem('selectedTask');
  if (storedTask && tasks.includes(storedTask)) {
    taskSelect.value = storedTask;
  } else {
    taskSelect.selectedIndex = 0;
  }
  taskSelect.addEventListener('change', () => {
    localStorage.setItem('selectedTask', taskSelect.value);
    updateTable();
  });
  updateTable();
}

function setOptions(select, items) {
  select.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

function formatWeekLabel(dateStr) {
  const date = new Date(dateStr);
  const startOfWeek = new Date(date);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  const isoDate = startOfWeek.toISOString().split('T')[0];
  const weekNumber = getWeekNumber(startOfWeek);
  return `${isoDate} (Week ${weekNumber})`;
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function parseDuration(durationStr) {
  const parts = durationStr.split(':');
  let hours = parseInt(parts[0]) || 0;
  let minutes = parseInt(parts[1]) || 0;
  let seconds = parseInt(parts[2]) || 0;
  if (seconds > 0) {
    minutes += 1;
  }
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
  }
  return hours + minutes / 60;
}

function roundDuration(value, method) {
  switch (method) {
    case 'Up to the hour': return Math.ceil(value);
    case 'Up to the half hour': return Math.ceil(value * 2) / 2;
    case 'Closest hour': return Math.round(value);
    case 'Closest half hour': return Math.round(value * 2) / 2;
    default: return value;
  }
}

function formatHoursMinutes(value) {
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function formatDayWithDate(startDate, index) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  const options = { day: 'numeric', month: 'short' };
  const dayNum = date.getDate();
  const suffix = ['th','st','nd','rd'][(dayNum % 10 > 3 || Math.floor((dayNum % 100) / 10) === 1) ? 0 : dayNum % 10];
  const formatted = `${dayNum}${suffix} ${date.toLocaleString('en', { month: 'long' })}`;
  return formatted;
}

function initTheme() {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-bs-theme', next);
  localStorage.setItem('theme', next);
  updateThemeButton(next);
});

function updateTable() {
  const selectedMember = memberSelect.value;
  const selectedProject = projectSelect.value;
  const selectedTask = taskSelect.value;
  const selectedWeek = weekSelect.value.split(' ')[0];
  const rounding = roundingSelect.value;
  const startDate = new Date(selectedWeek);

  const filtered = parsedData.filter(row => {
    return row['Member'] === selectedMember &&
      row['Project'].trim() === selectedProject &&
      row['Description'].trim() === selectedTask &&
      row['Start date'] >= selectedWeek &&
      row['Start date'] < getNextWeekDate(selectedWeek);
  });

  const weekAll = parsedData.filter(row =>
    row['Member'] === selectedMember &&
    row['Start date'] >= selectedWeek &&
    row['Start date'] < getNextWeekDate(selectedWeek)
  );

  const totals = {};
  weekdays.forEach(day => totals[day] = 0);

  filtered.forEach(row => {
    const day = row['Weekday'];
    totals[day] += parseDuration(row['Duration']);
  });

  let totalRaw = 0;
  weekAll.forEach(row => { totalRaw += parseDuration(row['Duration']); });

  timesheetBody.innerHTML = '';
  weekdays.forEach((day, idx) => {
    const raw = totals[day];
    const rounded = roundDuration(raw, rounding);
    const row = document.createElement('tr');
    const label = `${day} (${formatDayWithDate(startDate, idx)})`;
    if (rounding !== 'None') {
      row.innerHTML = `<td>${label}</td><td>${formatHoursMinutes(rounded)} <span class="text-muted small">(${formatHoursMinutes(raw)})</span></td>`;
    } else {
      row.innerHTML = `<td>${label}</td><td>${formatHoursMinutes(raw)}</td>`;
    }
    timesheetBody.appendChild(row);
  });

  const tableRaw = weekdays.reduce((sum, d) => sum + totals[d], 0);
  const tableRounded = weekdays.reduce(
    (sum, d) => sum + roundDuration(totals[d], rounding), 0);
  if (rounding !== 'None') {
    tableTotal.innerHTML = `${formatHoursMinutes(tableRounded)} <span class="text-muted small">(${formatHoursMinutes(tableRaw)})</span>`;
  } else {
    tableTotal.textContent = formatHoursMinutes(tableRounded);
  }

  const weekRounded = weekAll.reduce(
    (sum, row) => sum + roundDuration(parseDuration(row['Duration']), rounding),
    0);
  let summaryText = formatHoursMinutes(weekRounded);
  if (rounding !== 'None') {
    summaryText += ` <span class="text-muted small fw-normal">(${formatHoursMinutes(totalRaw)})</span>`;
  }
  weekSummary.innerHTML = `Total hours this week: ${summaryText}`;

  if (rounding !== 'None') {
    hoursHeading.innerHTML = 'Hours Worked <span class="text-muted small fw-normal">(Unrounded Hours)</span>';
  } else {
    hoursHeading.textContent = 'Hours Worked';
  }
}

function getNextWeekDate(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

function loadStoredCsv() {
  const stored = localStorage.getItem('csvData');
  if (stored) {
    const name = localStorage.getItem('csvName');
    processCsvData(stored, false, name);
  }
}

function processCsvData(text, save = false, fileName = null) {
  csvError.textContent = '';
  csvError.classList.add = 'd-none';
  csvInput.classList.remove('is-invalid');
  controls.style.display = 'none';
  parsedData = [];
  loadStatus.classList.add('d-none');

  Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const required = ['Member', 'Project', 'Description', 'Start date', 'Weekday', 'Duration'];
      const fields = results.meta.fields || [];
      const missing = required.filter(f => !fields.includes(f));
      if (missing.length) {
        showCsvError('Missing required columns: ' + missing.join(', '));
        return;
      }
      const data = results.data;
      if (data.length === 0) {
        showCsvError('CSV contains no data');
        return;
      }
      const durationRe = /^\d{1,2}:\d{2}:\d{2}$/;
      const invalid = data.some(row => {
        return isNaN(new Date(row['Start date'])) || !durationRe.test(row['Duration']);
      });
      if (invalid) {
        showCsvError('CSV contains invalid data');
        return;
      }
      parsedData = data;
      if (save) {
        localStorage.setItem('csvData', text);
        if (fileName) {
          localStorage.setItem('csvName', fileName);
        }
      }
      populateWeekDropdown();
      controls.style.display = 'block';
      updateLoadStatus(fileName);
    }
  });
}

function updateLoadStatus(name) {
  const storedName = name || localStorage.getItem('csvName');
  if (storedName) {
    loadStatus.textContent = `Loaded: ${storedName} successfully!`;
    loadStatus.classList.remove('d-none');
    // loadStatus.classList.add('d-block');
  } else {
    loadStatus.textContent = 'Loaded CSV from local storage successfully!';
    loadStatus.classList.remove('d-none');
    // loadStatus.classList.add('d-block');
  }
}
