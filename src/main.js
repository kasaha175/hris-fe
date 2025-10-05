// src/main.js

// ====== Utilities ======
function titleCase(str = '') {
  return str
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
function getRoute() {
  const raw = (location.hash || '').replace(/^#\//, '').trim();
  return raw || 'dashboard';
}
function isAuthRoute(route) {
  return route === 'login' || route === 'otp';
}
function setAuthMode(on) {
  const html = document.documentElement;
  html.classList.toggle('auth-mode', !!on);
}

// daftar halaman valid (FE-only)
const VALID_ROUTES = new Set([
  'login', 'otp',
  'dashboard', 'recruitment', 'client', 'employee',
  'reports', 'settings', 'leave-approval', 'fine-approval', 'leave-request',
]);

// halaman yang butuh login (opsional guard)
const RESTRICTED_ROUTES = new Set(['leave-approval', 'fine-approval']);

// ====== Auth (FE-only) ======
function getAuth() { try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; } }
function setAuth(obj) { localStorage.setItem('auth', JSON.stringify(obj)); }
function clearAuth() { localStorage.removeItem('auth'); }

// ====== Shell loader (header/sidebar/breadcrumb) ======
let shellLoaded = false;

async function ensureShellLoaded() {
  if (shellLoaded) return;
  await loadComponent('header-container', 'src/components/header.html');
  await loadComponent('sidebar-container', 'src/components/sidebar.html');
  await loadComponent('breadcrumb-container', 'src/components/breadcrumb.html');
  bindGlobalUI();
  renderAuthUI();
  shellLoaded = true;

  // tampilkan shell & nonaktifkan auth-mode
  document.getElementById('header-container')?.classList.remove('d-none');
  document.getElementById('sidebar-container')?.classList.remove('d-none');
  document.getElementById('breadcrumb-container')?.classList.remove('d-none');
  setAuthMode(false);
}

function unloadShell() {
  shellLoaded = false;
  // kosongkan + sembunyikan komponen shell
  ['header-container','sidebar-container','breadcrumb-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.classList.add('d-none'); }
  });
  // aktifkan auth-mode untuk hilangkan scroll & center
  setAuthMode(true);
}

// ====== Component Loader ======
async function loadComponent(id, path) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(path);
  el.innerHTML = await res.text();
}

// ====== Breadcrumb Bootstrap ======
function updateBreadcrumb(route) {
  const bcContainer = document.getElementById('breadcrumb-container');
  if (!bcContainer) return;
  if (isAuthRoute(route)) {
    bcContainer.innerHTML = '';
    bcContainer.classList.add('d-none');
    return;
  }
  bcContainer.classList.remove('d-none');
  bcContainer.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-3">
        <li class="breadcrumb-item"><a href="#/dashboard">Dashboard</a></li>
        <li class="breadcrumb-item active" aria-current="page">${titleCase(route)}</li>
      </ol>
    </nav>`;
}

// ====== Sidebar Active Link ======
function setActiveNav(route) {
  const activeHref = `#/${route}`;
  document.querySelectorAll('.nav .nav-link')?.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === activeHref);
  });
}

// ====== Global UI (Bootstrap + Header) ======
function bindGlobalUI() {
  const btnSidebar = document.querySelector('#btnSidebar');
  const sidebar = document.getElementById('sidebar-container');
  if (btnSidebar && sidebar) {
    btnSidebar.addEventListener('click', () => sidebar.classList.toggle('d-none'));
  }
  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const html = document.documentElement;
      html.setAttribute('data-bs-theme',
        html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'
      );
    });
  }
  document.querySelectorAll('.nav .nav-link').forEach(a => {
    a.addEventListener('click', () => {
      const sb = document.getElementById('sidebar-container');
      if (window.innerWidth < 992 && sb) sb.classList.add('d-none');
    });
  });
}

// ====== Auth dropdown (header) ======
function renderAuthUI() {
  const wrap = document.getElementById('authArea');
  if (!wrap) return;
  const auth = getAuth();

  if (!auth) {
    wrap.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-ghost btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-box-arrow-in-right me-1"></i> Login
        </button>
        <div class="dropdown-menu dropdown-menu-end p-3" style="min-width: 260px;">
          <div class="d-grid">
            <a class="btn btn-primary btn-sm" id="btnLoginGo" href="#/login">
              <i class="bi bi-door-open me-1"></i> Buka Halaman Login
            </a>
          </div>
        </div>
      </div>`;
  } else {
    const initials = (auth.name || 'User').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
    wrap.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-ghost btn-sm d-flex align-items-center gap-2 dropdown-toggle" data-bs-toggle="dropdown">
          <span class="avatar-sm">${initials}</span>
          <span class="d-none d-sm-inline">${auth.name || 'User'}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="#/settings"><i class="bi bi-person-circle me-2"></i> Profil</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" id="btnLogout"><i class="bi bi-box-arrow-right me-2"></i> Keluar</button></li>
        </ul>
      </div>`;
  }

  document.getElementById('btnLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuth();
    unloadShell();
    renderAuthUI();
    location.hash = '#/login';
  });
}

// ====== Page Loader ======
async function loadPage(route) {
  const container = document.getElementById('page-container');
  if (!container) return;

  const safeRoute = VALID_ROUTES.has(route) ? route : 'dashboard';

  // Redirect awal: kalau belum login & bukan auth, pergi ke login
  if (!getAuth() && !isAuthRoute(safeRoute)) {
    location.hash = '#/login';
    return;
  }

  // Guard halaman tertentu
  if (RESTRICTED_ROUTES.has(safeRoute) && !getAuth()) {
    location.hash = '#/login';
    return;
  }

  // Shell behavior + toggle .auth-mode
  if (isAuthRoute(safeRoute)) {
    unloadShell();          // juga setAuthMode(true)
  } else {
    await ensureShellLoaded(); // juga setAuthMode(false)
  }

  // Fetch page
  const path = `src/pages/${safeRoute}.html`;
  try {
    const res = await fetch(path);
    container.innerHTML = await res.text();
  } catch {
    container.innerHTML = `<div class="container py-5 text-center">
      <h4 class="text-danger">Halaman tidak ditemukan</h4>
    </div>`;
  }

  updateBreadcrumb(safeRoute);
  setActiveNav(safeRoute);
  bindPageUI();
}

// ====== Page-Specific UI ======
function bindPageUI(scope = document) {
  // Tabs
  const tabs = scope.querySelectorAll('.tab');
  const panels = scope.querySelectorAll('.tabpanel');
  if (tabs.length) {
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const target = t.dataset.tab;
        panels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${target}`));
      });
    });
  }

  // Modal FE-only
  scope.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open');
      document.getElementById(id)?.classList.add('open');
    });
  });
  scope.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal')?.classList.remove('open'));
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  });

  // Dummy action
  scope.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => alert('Approved ✔')));
  scope.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => alert('Rejected ✖')));

  // Dummy form submit (leave)
  const formLeave = scope.getElementById?.('formLeaveRequest');
  if (formLeave) {
    formLeave.addEventListener('submit', e => {
      e.preventDefault();
      alert('Pengajuan berhasil dikirim (FE-only).');
    });
  }

  // ---- Login & OTP flow (mock) ----
  const loginForm = scope.getElementById?.('formLogin');
  if (loginForm) {
    // toggle password
    const pass = scope.getElementById('loginPass');
    const toggle = scope.getElementById('togglePass');
    toggle?.addEventListener('click', () => {
      const t = pass.getAttribute('type') === 'password' ? 'text' : 'password';
      pass.setAttribute('type', t);
      toggle.innerHTML = t === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = scope.getElementById('loginUser')?.value?.trim() || 'User';
      localStorage.setItem('pending_user', JSON.stringify({ name }));
      location.hash = '#/otp';
    });
  }

  const otpForm = scope.getElementById?.('formOTP');
  if (otpForm) {
    const inputs = [...scope.querySelectorAll('.otp-input')];
    inputs[0]?.focus();
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g,'').slice(0,1);
        if (inp.value && idx < inputs.length - 1) inputs[idx+1].focus();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx-1].focus();
      });
      inp.addEventListener('paste', (e) => {
        const txt = (e.clipboardData?.getData('text') || '').replace(/\D/g,'').slice(0,6);
        if (!txt) return;
        e.preventDefault();
        inputs.forEach((i, n) => i.value = txt[n] || '');
        inputs[Math.min(txt.length, inputs.length)-1]?.focus();
      });
    });
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = inputs.map(i => i.value).join('');
      if (code !== '123456') { alert('Kode OTP salah (gunakan 123456 untuk mock).'); return; }
      const pending = JSON.parse(localStorage.getItem('pending_user') || '{}');
      if (pending?.name) setAuth({ name: pending.name });
      localStorage.removeItem('pending_user');
      await ensureShellLoaded();   // setelah login baru muat komponen
      renderAuthUI();
      location.hash = '#/dashboard';
    });
    scope.getElementById('resendOTP')?.addEventListener('click', (e) => {
      e.preventDefault();
      alert('OTP baru telah dikirim (mock). Gunakan 123456.');
    });
  }

  // Bootstrap init
  [...scope.querySelectorAll('[data-bs-toggle="tooltip"]')].forEach(el => new bootstrap.Tooltip(el));
  [...scope.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el));
}

// ====== Init App ======
window.addEventListener('DOMContentLoaded', async () => {
  // jangan muat shell dulu; lihat rute & auth
  const route = getRoute();
  if (!getAuth() && !isAuthRoute(route)) {
    // pastikan halaman auth benar-benar mode auth
    unloadShell();              // juga setAuthMode(true)
    location.hash = '#/login';
    return;
  }
  // set kelas sesuai rute saat pertama kali load
  setAuthMode(isAuthRoute(route));
  loadPage(route);
});

// re-render auth UI jika localStorage berubah dari tab lain
window.addEventListener('storage', (e) => {
  if (e.key === 'auth') renderAuthUI();
});

// ====== Router ======
window.addEventListener('hashchange', () => {
  loadPage(getRoute());
});
