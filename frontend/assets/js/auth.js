const setButtonLoading = (button, label) => {
  button.dataset.originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = label;
};

const resetButton = (button) => {
  button.disabled = false;
  button.textContent = button.dataset.originalLabel || button.textContent;
};

const validateForm = (form) => {
  if (form.checkValidity()) return true;
  form.classList.add('was-validated');
  showToast('Please complete the highlighted fields.', 'danger');
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = qs('#loginForm');
  const registerForm = qs('#registerForm');

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(loginForm)) return;

    const submit = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submit, 'Signing in...');

    try {
      const payload = {
        email: qs('#email').value.trim(),
        password: qs('#password').value
      };
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSession(data);
      showToast('Login successful. Redirecting...');
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? 'admin-dashboard.html' : 'events.html';
      }, 450);
    } catch (error) {
      showToast(error.message, 'danger');
      resetButton(submit);
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(registerForm)) return;

    const submit = registerForm.querySelector('button[type="submit"]');
    setButtonLoading(submit, 'Creating account...');

    try {
      const payload = {
        name: qs('#name').value.trim(),
        email: qs('#email').value.trim(),
        password: qs('#password').value
      };
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSession(data);
      showToast('Account created. Welcome to EventHub.');
      setTimeout(() => {
        window.location.href = 'events.html';
      }, 450);
    } catch (error) {
      showToast(error.message, 'danger');
      resetButton(submit);
    }
  });
});
