// src/main.js

// ====== Utilities ======
function titleCase(str = '') {
  return str
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// READ ROUTE: take hash first, fallback to pathname (strip leading /)
// -> returns raw route string (may be empty)
function getRoute() {
  // prefer hash-based routing if present: #/dashboard or #dashboard
  const hash = (location.hash || '').replace(/^#\/?/, '').trim();
  if (hash) return hash;
  // fallback: path-based routing, e.g. /custom-route => 'custom-route'
  const path = (location.pathname || '').replace(/^\/+|\/+$/g, '').trim();
  return path; // may be '' (empty)
}

function isAuthRoute(route) {
  return route === 'login' || route === 'otp';
}
function setAuthMode(on) {
  const html = document.documentElement;
  const body = document.body;
  html.classList.toggle('auth-mode', !!on);   // kompat lama
  body.classList.toggle('login-page', !!on);  // trigger CSS di index.html
}

// daftar halaman valid (FE-only) -- tetap ada sebagai referensi
const VALID_ROUTES = new Set([
  'login', 'otp',
  'dashboard', 'recruitment', 'client', 'employee',
  'reports', 'settings', 'leave-approval', 'fine-approval', 'leave-request','profile'
]);

// halaman yang butuh login (opsional guard)
const RESTRICTED_ROUTES = new Set(['leave-approval', 'fine-approval']);

// ====== Auth (FE-only) ======
function getAuth() { try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; } }
function setAuth(obj) { localStorage.setItem('auth', JSON.stringify(obj)); }
function clearAuth() { localStorage.removeItem('auth'); }

// ====== Component Loader ======
async function loadComponent(id, path) {
  const el = document.getElementById(id);
  if (!el) return;
  const res = await fetch(path);
  el.innerHTML = await res.text();
}

// ====== Footer init (karena <script> di innerHTML tidak otomatis jalan) ======
function initFooter() {
  const yearEl = document.querySelector('#footer-container #fy');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const toTop = document.querySelector('#footer-container #toTop');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ====== Shell loader (header/sidebar/breadcrumb/footer) ======
let shellLoaded = false;

async function ensureShellLoaded() {
  if (shellLoaded) return;
  await loadComponent('header-container', 'src/components/header.html');
  await loadComponent('sidebar-container', 'src/components/sidebar.html');
  await loadComponent('breadcrumb-container', 'src/components/breadcrumb.html');
  await loadComponent('footer-container', 'src/components/footer.html');

  bindGlobalUI();
  renderAuthUI();
  initFooter(); // penting: jalankan script footer

  shellLoaded = true;

  // tampilkan shell & nonaktifkan auth-mode
  document.getElementById('header-container')?.classList.remove('d-none');
  document.getElementById('sidebar-container')?.classList.remove('d-none');
  document.getElementById('breadcrumb-container')?.classList.remove('d-none');
  document.getElementById('footer-container')?.classList.remove('d-none');
  setAuthMode(false);
}

function unloadShell() {
  shellLoaded = false;
  // kosongkan + sembunyikan komponen shell (fix: footer-container)
  ['header-container','sidebar-container','breadcrumb-container','footer-container'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.classList.add('d-none'); }
  });
  // aktifkan auth-mode (no scroll + hide shell via index.html)
  setAuthMode(true);
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
  const label = route ? titleCase(route) : 'Home';
  bcContainer.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-3">
        <li class="breadcrumb-item"><a href="#/dashboard">Dashboard</a></li>
        <li class="breadcrumb-item active" aria-current="page">${label}</li>
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
          <li><a class="dropdown-item" href="#/profile"><i class="bi bi-person-circle me-2"></i> Profil</a></li>
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
    // don't force change hash; keep current location so developer can inject url
    location.hash = '#/login';
  });
}

// ====== Page Loader ======
async function loadPage(route) {
  const pageContainer = document.getElementById('page-container');
  const authRoot = document.getElementById('auth-root');
  if (!pageContainer || !authRoot) return;

  // NOTE:
  // we intentionally DO NOT coerce route into a safeRoute here so developer can inject arbitrary route
  // If you want to enforce allowed routes again, uncomment the next line and use safeRoute:
  // const safeRoute = VALID_ROUTES.has(route) ? route : 'login';
  const safeRoute = route; // allow arbitrary

  // Optional auth guard (commented out so injected URL can load)
  // if (!getAuth() && !isAuthRoute(safeRoute)) {
  //   // If you want to block access when not authenticated, enable redirect here:
  //   // location.hash = '#/login';
  //   // return;
  // }

  const isAuth = isAuthRoute(safeRoute);

  // Atur shell/kelas & tentukan target container
  if (isAuth) {
    unloadShell();                       // hide shell & no-scroll
    pageContainer.innerHTML = '';        // kosongkan shell container
  } else {
    await ensureShellLoaded();           // show shell
    authRoot.innerHTML = '';             // kosongkan auth root
  }

  const target = isAuth ? authRoot : pageContainer;

  // Fetch page
  // If route is empty string, we still attempt to load 'login' as fallback to preserve previous behavior.
  const pageName = (safeRoute && safeRoute.length) ? safeRoute : 'login';
  const path = `src/pages/${pageName}.html`;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('not found');
    target.innerHTML = await res.text();
  } catch {
    target.innerHTML = `<div class="container py-5 text-center">
      <h4 class="text-danger">Halaman tidak ditemukan: ${pageName}</h4>
    </div>`;
  }

  // Breadcrumb hanya untuk non-auth
  updateBreadcrumb(isAuth ? 'login' : pageName);
  setActiveNav(pageName);

  // Bind UI dalam scope yang tepat
  bindPageUI(target);
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
      scope.getElementById?.(id)?.classList.add('open');
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
      await ensureShellLoaded();   // setelah login baru muat komponen (termasuk footer)
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
  const route = getRoute(); // now reads hash OR pathname
  // NOTE: we do not force redirect to #/login here so developers can inject URL
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
