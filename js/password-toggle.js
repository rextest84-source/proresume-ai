/**
 * Adds show/hide toggle to password inputs marked with data-password-toggle.
 */
(function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((input) => {
    if (input.closest('.password-field')) return;

    const field = document.createElement('div');
    field.className = 'password-field';
    input.parentNode.insertBefore(field, input);
    field.appendChild(input);

    input.classList.add('password-field-input');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-toggle-btn';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i>';

    btn.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      btn.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
      btn.setAttribute('aria-pressed', visible ? 'false' : 'true');
      btn.innerHTML = visible
        ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>'
        : '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>';
    });

    field.appendChild(btn);
  });
})();
