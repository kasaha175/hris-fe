// ================== PATH & FETCH HELPERS ==================
const BASE = import.meta.env.BASE_URL || '/'; // ex: "/dev_indra/hris-fe/"

function urlJoin(...parts) {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/\/+$/,'') : p.replace(/^\/+|\/+$/g,'')))
    .join('/') + '/';
}

async function fetchText(path) {
  const abs = path.startsWith('http') ? path : urlJoin(BASE, path).replace(/\/+$/, '');
  const res = await fetch(abs, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${abs}`);
  return res.text();
}

// ================== UTILITIES ==================
function titleCase(str = '') {
  return str.split(/[\s-]+/).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

// ================== ROUTE (hash-first) ==================
function getRoute() {
  const hash = (location.hash || '').replace(/^#\/?/, '').trim();
  return hash || 'login';
}
function isAuthRoute(route) { return route === 'login' || route === 'otp'; }
function setAuthMode(on) {
  document.documentElement.classList.toggle('auth-mode', !!on);
  document.body.classList.toggle('login-page', !!on);
}

// (opsional) daftar rute untuk highlight nav
const VALID_ROUTES = new Set([
  'login','otp','dashboard','recruitment','client','employee','reports',
  'settings','leave-approval','fine-approval','leave-request','profile'
]);

// ================== AUTH (MOCK, TANPA GUARD) ==================
function getAuth(){ try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; } }
function setAuth(obj){ localStorage.setItem('auth', JSON.stringify(obj)); }
function clearAuth(){ localStorage.removeItem('auth'); }

// ================== COMPONENT LOADER ==================
async function loadComponent(id, relPath) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    el.innerHTML = await fetchText(relPath);
  } catch (e) {
    console.error('[HRIS] gagal load component', relPath, e);
    el.innerHTML = '';
  }
}

// ================== FOOTER INIT ==================
function initFooter() {
  const yearEl = document.querySelector('#footer-container #fy');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const toTop = document.querySelector('#footer-container #toTop');
  if (toTop) toTop.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

// ================== SHELL (header/sidebar/breadcrumb/footer) ==================
let shellLoaded = false;

async function ensureShellLoaded() {
  if (shellLoaded) return;
  await loadComponent('header-container',     'components/header.html');
  await loadComponent('sidebar-container',    'components/sidebar.html');
  await loadComponent('breadcrumb-container', 'components/breadcrumb.html');
  await loadComponent('footer-container',     'components/footer.html');
  bindGlobalUI();
  renderAuthUI();
  initFooter();
  shellLoaded = true;
}

function toggleShell(visible) {
  ['header-container','sidebar-container','breadcrumb-container','footer-container'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('d-none', !visible);
    if (!visible) el.setAttribute('aria-hidden','true'); else el.removeAttribute('aria-hidden');
  });
  setAuthMode(!visible); // halaman login/otp => auth-mode ON
}

// ================== BREADCRUMB ==================
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

// ================== SIDEBAR ACTIVE ==================
function setActiveNav(route) {
  const activeHref = `#/${route}`;
  document.querySelectorAll('.nav .nav-link')?.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === activeHref);
  });
}

// ================== GLOBAL UI ==================
function bindGlobalUI() {
  const btnSidebar = document.querySelector('#btnSidebar');
  const sidebar = document.getElementById('sidebar-container');
  if (btnSidebar && sidebar) btnSidebar.addEventListener('click', () => sidebar.classList.toggle('d-none'));

  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const html = document.documentElement;
      html.setAttribute('data-bs-theme', html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    });
  }
  document.querySelectorAll('.nav .nav-link').forEach(a => {
    a.addEventListener('click', () => {
      const sb = document.getElementById('sidebar-container');
      if (window.innerWidth < 992 && sb) sb.classList.add('d-none');
    });
  });
}

// ================== AUTH DROPDOWN (HEADER) ==================
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
    renderAuthUI();
  });
}

// ================== PAGE LOADER (NO GUARD) ==================
async function loadPage(route) {
  const pageContainer = document.getElementById('page-container');
  const authRoot = document.getElementById('auth-root');
  if (!pageContainer || !authRoot) {
    console.error('[HRIS] container tidak ditemukan (#page-container / #auth-root)');
    return;
  }

  const authPage = isAuthRoute(route);

  if (authPage) {
    // Halaman auth: sembunyikan shell, render ke #auth-root
    toggleShell(false);
    pageContainer.innerHTML = '';
  } else {
    // Halaman non-auth: pastikan shell terpasang, render ke #page-container
    await ensureShellLoaded();
    toggleShell(true);
    authRoot.innerHTML = '';
  }

  const target = authPage ? authRoot : pageContainer;
  const pageName = route || 'login';
  const relPath  = `pages/${pageName}.html`;

  try {
    const html = await fetchText(relPath);
    target.innerHTML = html;
  } catch (err) {
    console.error('[HRIS] gagal memuat page:', relPath, err);
    target.innerHTML = `
      <div class="container py-5 text-center">
        <h4 class="text-danger">Halaman tidak ditemukan: ${pageName}</h4>
        <div class="text-muted small">${String(err)}</div>
      </div>`;
  }

  updateBreadcrumb(authPage ? 'login' : pageName);
  setActiveNav(pageName);
  bindPageUI(target);
}

// ================== PAGE-SPECIFIC UI ==================
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
      scope.querySelector(`#${id}`)?.classList.add('open');
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
  const formLeave = scope.querySelector('#formLeaveRequest');
  if (formLeave) formLeave.addEventListener('submit', e => { e.preventDefault(); alert('Pengajuan berhasil dikirim (FE-only).'); });

  // ---- Login (mock) ----
  const loginForm = scope.querySelector('#formLogin');
  if (loginForm) {
    const pass   = scope.querySelector('#loginPass');
    const toggle = scope.querySelector('#togglePass');
    toggle?.addEventListener('click', () => {
      const t = pass.getAttribute('type') === 'password' ? 'text' : 'password';
      pass.setAttribute('type', t);
      toggle.innerHTML = t === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
    });

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (scope.querySelector('#loginUser')?.value || 'User').trim();
      setAuth({ name });      // opsional, untuk header demo
      renderAuthUI();
      // langsung ke OTP (SPA)
      location.hash = '#/otp';
    });
  }

  // ---- OTP (mock) ----
const otpForm = scope.querySelector('#formOTP');
if (otpForm) {
  const inputs    = [...scope.querySelectorAll('.otp-input')];
  const btnVerify = scope.querySelector('#btnVerify');
  const resend    = scope.querySelector('#resendOTP');

  // Pastikan tombol bisa diklik (inline script di otp.html tidak berjalan)
  if (btnVerify) {
    btnVerify.disabled = false;
    btnVerify.removeAttribute('aria-disabled');
  }

  // UX input tetap hidup (opsional)
  inputs[0]?.focus();
  inputs.forEach((inp, idx) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
      if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx-1].focus();
    });
  });

  // Submit → langsung ke dashboard (tanpa validasi)
  otpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (btnVerify) {
      btnVerify.disabled = true;
      btnVerify.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Mengalihkan…';
    }
    // Perbarui header (opsional), lalu alihkan via hash router
    renderAuthUI();
    location.hash = '#/dashboard';
  });

  // Resend (opsional)
  resend?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('OTP dikirim ulang (mock).');
  });
}

  // Bootstrap init
  [...scope.querySelectorAll('[data-bs-toggle="tooltip"]')].forEach(el => new bootstrap.Tooltip(el));
  [...scope.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el));
}

// ================== INIT ==================
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) {
    location.replace(`${location.pathname}#/login`);
    return;
  }
  loadPage(getRoute());
});

window.addEventListener('storage', (e) => {
  if (e.key === 'auth') renderAuthUI();
});

window.addEventListener('hashchange', () => {
  loadPage(getRoute());
});
