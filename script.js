// ============ TOAST SYSTEM ============
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  // Hapus toast: tunggu animasi keluar, fallback timer jika animationend tidak terpicu
  setTimeout(() => {
    toast.classList.add('hide');
    const cleanup = () => toast.remove();
    toast.addEventListener('animationend', cleanup, { once: true });
    // Fallback: paksa hapus setelah 500ms jika animationend tidak terpicu (tab blur, dll)
    setTimeout(cleanup, 500);
  }, duration);
}

// ============ CONFIRM MODAL ============
function showConfirm({ icon = '⚠️', title = 'Konfirmasi', msg = '', confirmText = 'Ya', confirmClass = 'danger', cancelText = 'Batal' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <span class="modal-icon">${icon}</span>
        <div class="modal-title">${title}</div>
        <div class="modal-msg">${msg}</div>
        <div class="modal-actions">
          <button class="btn-secondary" id="modalCancel">${cancelText}</button>
          <button class="btn-confirm ${confirmClass}" id="modalConfirm">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#modalConfirm').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('#modalCancel').addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

// ============ RIPPLE EFFECT ============
function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}
document.querySelectorAll('.btn-primary, .btn-secondary, .btn-export, .btn-danger-outline').forEach(btn => {
  btn.addEventListener('click', addRipple);
});

// ============ THEME TOGGLE ============
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
  }
}
applyTheme(localStorage.getItem('theme') || 'light');

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
  render();
});

// ============ CUSTOM DROPDOWN ============
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  }
});

function setupCustomSelect(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const trigger = container.querySelector('.select-trigger');
  const optionsEl = container.querySelector('.select-options');
  const hiddenInput = container.querySelector('input[type="hidden"]');
  const selectedText = container.querySelector('.selected-text');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-select.open').forEach(el => {
      if (el !== container) el.classList.remove('open');
    });
    container.classList.toggle('open');
  });

  optionsEl.addEventListener('click', (e) => {
    const option = e.target.closest('.option');
    if (!option) return;
    hiddenInput.value = option.dataset.value;
    selectedText.innerHTML = option.innerHTML;
    optionsEl.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    container.classList.remove('open');
    if (onChange) onChange();
  });
}

// ============ STATE + MIGRASI ============
let transaksi = [];
const saved = localStorage.getItem('transaksi') || localStorage.getItem('pengeluaran');
if (saved) {
  transaksi = JSON.parse(saved).map(t => ({ ...t, tipe: t.tipe || 'keluar' }));
  localStorage.setItem('transaksi', JSON.stringify(transaksi));
  localStorage.removeItem('pengeluaran');
}

let budgetBulanan = Number(localStorage.getItem('budgetBulanan')) || 0;
let currentTipe = 'keluar';
let editIndex = null;
let expenseChart = null;

// ============ ELEMEN ============
const form          = document.getElementById('formTransaksi');
const btnSubmit     = document.getElementById('btnSubmit');
const btnCancel     = document.getElementById('btnCancel');
const daftar        = document.getElementById('daftarTransaksi');
const totalMasukEl  = document.getElementById('totalMasuk');
const totalKeluarEl = document.getElementById('totalKeluar');
const totalSaldoEl  = document.getElementById('totalSaldo');
const labelMasuk    = document.getElementById('labelMasuk');
const labelKeluar   = document.getElementById('labelKeluar');
const labelSaldo    = document.getElementById('labelSaldo');
const chartTitle    = document.getElementById('chartTitle');
const emptyState    = document.getElementById('emptyState');
const filterTipe    = document.getElementById('filterTipe');
const filterKategori = document.getElementById('filterKategori');
const filterBulan   = document.getElementById('filterBulan');
const kategoriList  = document.getElementById('kategoriList');
const jumlahInput   = document.getElementById('jumlah');
const toggleButtons = document.querySelectorAll('.type-toggle button');
const chartCanvas   = document.getElementById('pieChart');
const chartEmptyState = document.getElementById('chartEmptyState');
const btnSetBudget  = document.getElementById('btnSetBudget');
const budgetStatusText = document.getElementById('budgetStatusText');
const budgetNumbers = document.getElementById('budgetNumbers');
const budgetProgress = document.getElementById('budgetProgress');
const transactionCount = document.getElementById('transactionCount');
const btnExport     = document.getElementById('btnExport');
const btnClearAll   = document.getElementById('btnClearAll');

document.getElementById('tanggal').valueAsDate = new Date();

setupCustomSelect('customTipe', render);
setupCustomSelect('customKategori', render);
setupCustomSelect('customBulan', render);

// ============ HELPER ============
function formatRupiah(angka) { return 'Rp ' + Number(angka).toLocaleString('id-ID'); }
function simpan()            { localStorage.setItem('transaksi', JSON.stringify(transaksi)); }
function bulanKey(tanggal)   { return tanggal.slice(0, 7); }
function labelBulan(key) {
  const [y, m] = key.split('-');
  const nama = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${nama[Number(m) - 1]} ${y}`;
}
function rapikanKategori(str) { return str.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function formatRibuan(input) {
  const raw = input.value;
  const cursor = input.selectionStart;
  const digitsBefore = raw.slice(0, cursor).replace(/\D/g, '').length;
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 15) digits = digits.slice(0, 15);
  input.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  let pos = 0, count = 0;
  while (pos < input.value.length && count < digitsBefore) {
    if (/\d/.test(input.value[pos])) count++;
    pos++;
  }
  input.setSelectionRange(pos, pos);
}

// Animasi angka counter — mendukung nilai negatif, cancel animasi lama
const _animRafs = new WeakMap();
function animateValue(el, start, end, duration = 600) {
  // Batalkan animasi lama di elemen ini
  if (_animRafs.has(el)) cancelAnimationFrame(_animRafs.get(el));
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(start + (end - start) * ease);
    // Format dengan tanda minus yang benar untuk nilai negatif
    if (current < 0) {
      el.textContent = '−Rp ' + Math.abs(current).toLocaleString('id-ID');
    } else {
      el.textContent = 'Rp ' + current.toLocaleString('id-ID');
    }
    if (progress < 1) {
      _animRafs.set(el, requestAnimationFrame(update));
    } else {
      _animRafs.delete(el);
    }
  }
  _animRafs.set(el, requestAnimationFrame(update));
}

function parseRupiah(str) {
  // Tangani nilai negatif yang diformat sebagai "−Rp ..." atau "-Rp ..."
  const isNegative = /^[−-]/.test(String(str).trim());
  const num = Number(String(str).replace(/[^\d]/g, '')) || 0;
  return isNegative ? -num : num;
}

// ============ TIPE TOGGLE ============
function setTipe(tipe) {
  currentTipe = tipe;
  toggleButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tipe === tipe));
  btnSubmit.classList.remove('is-income', 'is-expense');
  btnSubmit.classList.add(tipe === 'masuk' ? 'is-income' : 'is-expense');
  if (editIndex === null) {
    btnSubmit.textContent = tipe === 'masuk' ? '+ Tambah Pemasukan' : '+ Tambah Pengeluaran';
  }
  document.getElementById('kategori').placeholder = tipe === 'masuk' ? 'Contoh: Gaji' : 'Contoh: Makanan';
}
toggleButtons.forEach(btn => btn.addEventListener('click', () => setTipe(btn.dataset.tipe)));

// ============ CANCEL EDIT ============
function resetForm() {
  editIndex = null;
  form.reset();
  document.getElementById('tanggal').valueAsDate = new Date();
  btnCancel.classList.remove('visible');
  btnSubmit.textContent = currentTipe === 'masuk' ? '+ Tambah Pemasukan' : '+ Tambah Pengeluaran';
}
btnCancel.addEventListener('click', resetForm);

// ============ BUDGET INPUT MODAL ============
function showBudgetModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const current = budgetBulanan > 0 ? budgetBulanan.toLocaleString('id-ID') : '';
    overlay.innerHTML = `
      <div class="modal-box">
        <span class="modal-icon">🎯</span>
        <div class="modal-title">Atur Budget Bulanan</div>
        <div class="modal-msg">Batas pengeluaran per bulan. Isi 0 untuk menghapus budget.</div>
        <div class="field" style="margin-bottom:20px">
          <label for="budgetInput" style="text-align:left">Jumlah (Rp)</label>
          <input type="text" id="budgetModalInput" inputmode="numeric"
            placeholder="Contoh: 2.000.000"
            value="${current}"
            style="margin-top:4px"
            autocomplete="off">
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="budgetModalCancel">Batal</button>
          <button class="btn-confirm primary" id="budgetModalConfirm">Simpan</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#budgetModalInput');
    // Format ribuan saat mengetik
    input.addEventListener('input', function() { formatRibuan(this); });
    // Fokus otomatis
    setTimeout(() => input.focus(), 50);

    overlay.querySelector('#budgetModalConfirm').addEventListener('click', () => {
      const angka = Number(input.value.replace(/\D/g, ''));
      overlay.remove();
      resolve(angka);
    });
    overlay.querySelector('#budgetModalCancel').addEventListener('click', () => { overlay.remove(); resolve(null); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
    // Enter untuk submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') overlay.querySelector('#budgetModalConfirm').click();
    });
  });
}

// ============ BUDGET ============
btnSetBudget.addEventListener('click', async () => {
  const angka = await showBudgetModal();
  if (angka === null) return;
  budgetBulanan = angka;
  localStorage.setItem('budgetBulanan', budgetBulanan);
  render();
  showToast(angka === 0 ? 'Budget dihapus.' : `Budget diset: ${formatRupiah(angka)}`, angka === 0 ? 'info' : 'success');
});

// ============ RENDER BUDGET ============
function renderBudget(totalPengeluaranBulanIni) {
  if (budgetBulanan <= 0) {
    budgetStatusText.textContent = 'Belum ada budget diset. Klik ⚙️ Atur.';
    budgetNumbers.textContent = '';
    budgetProgress.style.width = '0%';
    budgetProgress.className = 'progress-bar-fill safe';
    return;
  }

  const persentase = (totalPengeluaranBulanIni / budgetBulanan) * 100;
  const sisa = budgetBulanan - totalPengeluaranBulanIni;
  budgetNumbers.textContent = `${formatRupiah(totalPengeluaranBulanIni)} / ${formatRupiah(budgetBulanan)}`;
  budgetProgress.style.width = Math.min(persentase, 100) + '%';

  if (persentase >= 100) {
    budgetProgress.className = 'progress-bar-fill danger';
    budgetStatusText.innerHTML = `⚠️ <b>Over Budget!</b> Kamu lebih boros ${formatRupiah(Math.abs(sisa))}.`;
  } else if (persentase >= 80) {
    budgetProgress.className = 'progress-bar-fill warning';
    budgetStatusText.innerHTML = `⚠️ <b>Hati-hati!</b> Sisa budget tinggal ${formatRupiah(sisa)}.`;
  } else {
    budgetProgress.className = 'progress-bar-fill safe';
    budgetStatusText.innerHTML = `✅ <b>Aman.</b> Sisa budget ${formatRupiah(sisa)}.`;
  }
}

// ============ RENDER CHART ============
function renderChart(dataDasar) {
  const pengeluaran = dataDasar.filter(t => t.tipe === 'keluar');

  if (pengeluaran.length === 0) {
    chartCanvas.style.display = 'none';
    chartEmptyState.classList.remove('hidden');
    if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
    return;
  }

  chartCanvas.style.display = 'block';
  chartEmptyState.classList.add('hidden');

  const kategoriData = {};
  pengeluaran.forEach(t => {
    kategoriData[t.kategori] = (kategoriData[t.kategori] || 0) + Number(t.jumlah);
  });

  const labels      = Object.keys(kategoriData);
  const dataValues  = Object.values(kategoriData);
  const colors = ['#ef4444','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#d946ef','#ec4899','#14b8a6'];
  const isDark      = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor   = isDark ? '#f1f5f9' : '#1e1b4b';
  const tooltipBg   = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.5)',
        hoverOffset: 8,
        hoverBorderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      animation: { animateRotate: true, animateScale: true, duration: 800, easing: 'easeOutBack' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: textColor,
          bodyColor: textColor,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          callbacks: { label: (ctx) => `  ${formatRupiah(ctx.parsed)}` }
        }
      }
    }
  });
}

// ============ RENDER UTAMA ============
function render() {
  const bln        = filterBulan.value;
  const tipeFilter = filterTipe.value;
  const katFilter  = filterKategori.value;

  let dataDasar = transaksi;
  if (bln) dataDasar = transaksi.filter(t => bulanKey(t.tanggal) === bln);

  const labelTeks = bln ? labelBulan(bln) : 'Semua Waktu';
  labelMasuk.textContent  = `Pemasukan (${labelTeks})`;
  labelKeluar.textContent = `Pengeluaran (${labelTeks})`;
  labelSaldo.textContent  = `Saldo (${labelTeks})`;
  chartTitle.textContent  = `Distribusi Pengeluaran (${labelTeks})`;

  const totalMasuk  = dataDasar.filter(t => t.tipe === 'masuk').reduce((s, t) => s + Number(t.jumlah), 0);
  const totalKeluar = dataDasar.filter(t => t.tipe === 'keluar').reduce((s, t) => s + Number(t.jumlah), 0);

  // Animasi angka
  animateValue(totalMasukEl,  parseRupiah(totalMasukEl.textContent),  totalMasuk);
  animateValue(totalKeluarEl, parseRupiah(totalKeluarEl.textContent), totalKeluar);
  animateValue(totalSaldoEl,  parseRupiah(totalSaldoEl.textContent),  totalMasuk - totalKeluar);

  // Budget SELALU pakai bulan ini, bukan bulan filter
  const bulanIni = bulanKey(new Date().toISOString().slice(0, 10));
  const pengeluaranBulanIni = transaksi
    .filter(t => t.tipe === 'keluar' && bulanKey(t.tanggal) === bulanIni)
    .reduce((s, t) => s + Number(t.jumlah), 0);
  renderBudget(pengeluaranBulanIni);

  // Buat index langsung dari posisi asli SEBELUM di-spread
  const indexed = dataDasar.map((t, i) => ({ t, _origIndex: transaksi.indexOf(t) }));
  const filtered = indexed
    .filter(({ t }) => (!tipeFilter || t.tipe === tipeFilter) && (!katFilter || t.kategori === katFilter))
    .sort((a, b) => b.t.tanggal.localeCompare(a.t.tanggal));

  // Update counter
  transactionCount.textContent = `${filtered.length} transaksi`;

  daftar.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(({ t: item, _origIndex }, i) => {
      const li = document.createElement('li');
      const isMasuk = item.tipe === 'masuk';
      li.className = `expense-item ${isMasuk ? 'income' : 'expense'}`;
      li.style.animationDelay = `${i * 40}ms`;
      li.innerHTML = `
        <div class="expense-info">
          <div class="expense-top">
            <span class="expense-kategori">${escapeHtml(item.kategori)}</span>
            <span class="expense-tanggal">${item.tanggal}</span>
          </div>
          ${item.catatan ? `<div class="expense-catatan">${escapeHtml(item.catatan)}</div>` : ''}
        </div>
        <div class="expense-jumlah">${isMasuk ? '+' : '−'} ${formatRupiah(item.jumlah)}</div>
        <div class="expense-actions">
          <button class="btn-icon edit"   data-index="${_origIndex}" title="Edit">✏️</button>
          <button class="btn-icon delete" data-index="${_origIndex}" title="Hapus">🗑️</button>
        </div>
      `;
      daftar.appendChild(li);
    });
  }

  // ---- Dropdown Kategori ----
  const kategoriUnik = [...new Set(transaksi.map(t => t.kategori))].sort();
  const katTerpilih  = filterKategori.value;
  const katContainer = document.getElementById('customKategori');
  const katOptions   = katContainer.querySelector('.select-options');
  const katText      = katContainer.querySelector('.selected-text');

  katOptions.innerHTML = `<div class="option ${katTerpilih === '' ? 'selected' : ''}" data-value="">Semua Kategori</div>`;
  kategoriUnik.forEach(k => {
    const div = document.createElement('div');
    div.className = `option ${k === katTerpilih ? 'selected' : ''}`;
    div.dataset.value = k;
    div.textContent = k;
    katOptions.appendChild(div);
  });
  const selKat = katOptions.querySelector('.option.selected');
  if (selKat) katText.innerHTML = selKat.innerHTML;

  kategoriList.innerHTML = '';
  kategoriUnik.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    kategoriList.appendChild(opt);
  });

  // ---- Dropdown Bulan ----
  const bulanSet    = new Set(transaksi.map(t => bulanKey(t.tanggal)));
  const blnTerpilih = filterBulan.value;
  const blnContainer = document.getElementById('customBulan');
  const blnOptions   = blnContainer.querySelector('.select-options');
  const blnText      = blnContainer.querySelector('.selected-text');

  blnOptions.innerHTML = `<div class="option ${blnTerpilih === '' ? 'selected' : ''}" data-value="">Semua Bulan</div>`;
  [...bulanSet].sort().reverse().forEach(b => {
    const div = document.createElement('div');
    div.className = `option ${b === blnTerpilih ? 'selected' : ''}`;
    div.dataset.value = b;
    div.textContent = labelBulan(b);
    blnOptions.appendChild(div);
  });
  const selBln = blnOptions.querySelector('.option.selected');
  if (selBln) blnText.innerHTML = selBln.innerHTML;

  renderChart(dataDasar);
}

// ============ INPUT HANDLER ============
jumlahInput.addEventListener('input', function () {
  formatRibuan(this);
  this.setCustomValidity('');
});

// ============ FORM SUBMIT ============
form.addEventListener('submit', function (e) {
  e.preventDefault();
  const jumlahRaw = jumlahInput.value.replace(/\D/g, '');
  const jumlah    = Number(jumlahRaw);

  if (!jumlah || jumlah <= 0) {
    jumlahInput.setCustomValidity('Jumlah harus lebih dari 0');
    jumlahInput.reportValidity();
    return;
  }
  jumlahInput.setCustomValidity('');

  const data = {
    tanggal:  document.getElementById('tanggal').value,
    tipe:     currentTipe,
    kategori: rapikanKategori(document.getElementById('kategori').value),
    jumlah,
    catatan:  document.getElementById('catatan').value.trim()
  };

  if (!data.kategori) return;

  const isEdit = editIndex !== null;
  if (isEdit) {
    transaksi[editIndex] = data;
  } else {
    transaksi.push(data);
  }

  simpan();
  render();
  resetForm();
  setTipe(data.tipe);
  showToast(isEdit ? `Transaksi diperbarui: ${data.kategori}` : `Transaksi ditambah: ${data.kategori}`, 'success');
});

// ============ LIST ACTIONS (Edit & Delete) ============
daftar.addEventListener('click', async function (e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = Number(btn.dataset.index);

  if (btn.classList.contains('delete')) {
    const ok = await showConfirm({
      icon: '🗑️',
      title: 'Hapus Transaksi',
      msg: `Hapus transaksi <b>${escapeHtml(transaksi[idx].kategori)}</b>?<br>Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Hapus',
      confirmClass: 'danger',
    });
    if (ok) {
      const nama = transaksi[idx].kategori;
      transaksi.splice(idx, 1);
      // Reset edit jika item yang diedit dihapus
      if (editIndex === idx) resetForm();
      else if (editIndex !== null && editIndex > idx) editIndex--;
      simpan();
      render();
      showToast(`Transaksi "${nama}" dihapus.`, 'info');
    }
  }

  if (btn.classList.contains('edit')) {
    const t = transaksi[idx];
    document.getElementById('tanggal').value  = t.tanggal;
    document.getElementById('kategori').value = t.kategori;
    jumlahInput.value = Number(t.jumlah).toLocaleString('id-ID');
    document.getElementById('catatan').value  = t.catatan || '';
    editIndex = idx;
    setTipe(t.tipe);
    btnSubmit.textContent = '💾 Simpan Perubahan';
    btnCancel.classList.add('visible');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Mode edit aktif. Ubah data lalu simpan.', 'info', 2500);
  }
});

// ============ HAPUS SEMUA ============
btnClearAll.addEventListener('click', async () => {
  if (transaksi.length === 0) { showToast('Belum ada transaksi.', 'warning'); return; }
  const ok = await showConfirm({
    icon: '⚠️',
    title: 'Hapus Semua Data?',
    msg: `Semua <b>${transaksi.length} transaksi</b> akan dihapus permanen.<br>Data tidak bisa dikembalikan!`,
    confirmText: 'Hapus Semua',
    confirmClass: 'danger',
  });
  if (ok) {
    transaksi = [];
    if (editIndex !== null) resetForm();
    simpan();
    render();
    showToast('Semua transaksi dihapus.', 'info');
  }
});

// ============ EXPORT CSV ============
btnExport.addEventListener('click', () => {
  if (transaksi.length === 0) { showToast('Tidak ada data untuk diekspor.', 'warning'); return; }

  const header = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan'];
  const rows = transaksi.map(t => [
    t.tanggal,
    t.tipe === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
    t.kategori,
    t.jumlah,
    t.catatan || ''
  ]);

  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const now  = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  a.href     = url;
  a.download = `catatan-keuangan-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${transaksi.length} transaksi diekspor ke CSV.`, 'success');
});

// Ripple pada tombol yang muncul belakangan (delegasi)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-icon, .btn-cancel');
  if (btn) addRipple(e);
});

// ============ INIT ============
setTipe('keluar');
render();
