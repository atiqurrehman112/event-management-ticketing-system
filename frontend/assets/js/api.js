const API_BASE = localStorage.getItem('eventhubApiBase') || 'http://localhost:5000/api';
const FILE_BASE = API_BASE.replace(/\/api\/?$/, '');
const FALLBACK_POSTER = 'assets/images/eventhub-hero.png';

const getToken = () => localStorage.getItem('eventhubToken');
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('eventhubUser'));
  } catch (error) {
    return null;
  }
};

const setSession = (payload) => {
  localStorage.setItem('eventhubToken', payload.token);
  localStorage.setItem('eventhubUser', JSON.stringify(payload.user));
};

const clearSession = () => {
  localStorage.removeItem('eventhubToken');
  localStorage.removeItem('eventhubUser');
};

const apiFetch = async (path, options = {}) => {
  const headers = options.body instanceof FormData
    ? {}
    : { 'Content-Type': 'application/json' };

  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const posterUrl = (poster) => {
  if (!poster) return FALLBACK_POSTER;
  const value = String(poster);
  if (value.startsWith('http')) return value;
  return `${FILE_BASE}${value.startsWith('/') ? value : `/${value}`}`;
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
};

const formatMoney = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
};

const escapeHTML = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const qs = (selector, root = document) => root.querySelector(selector);

const showToast = (message, tone = 'success') => {
  const container = qs('#toastContainer');
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${tone === 'danger' ? 'danger' : 'dark'} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHTML(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  container.appendChild(toast);
  const instance = new bootstrap.Toast(toast);
  instance.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
};

const requireAuth = () => {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const requireAdmin = () => {
  const user = getUser();
  if (!getToken() || user?.role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const renderNav = () => {
  const authLinks = qs('#authLinks');
  const adminLinks = document.querySelectorAll('[data-admin-only]');
  const user = getUser();

  adminLinks.forEach((item) => {
    item.classList.toggle('d-none', user?.role !== 'admin');
  });

  if (!authLinks) return;

  if (user) {
    authLinks.innerHTML = `
      <span class="navbar-text me-lg-3 text-light small"><i class="bi bi-person-circle me-1"></i>${escapeHTML(user.name)}</span>
      <button class="btn btn-sm btn-outline-light" id="logoutBtn" type="button"><i class="bi bi-box-arrow-right me-1"></i>Logout</button>
    `;
    qs('#logoutBtn')?.addEventListener('click', () => {
      clearSession();
      window.location.href = 'index.html';
    });
  } else {
    authLinks.innerHTML = `
      <a class="btn btn-sm btn-outline-light me-2" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Login</a>
      <a class="btn btn-sm btn-primary" href="register.html"><i class="bi bi-person-plus me-1"></i>Register</a>
    `;
  }
};

document.addEventListener('DOMContentLoaded', renderNav);
