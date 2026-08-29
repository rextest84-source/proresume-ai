/**
 * Contact form → Railway API (emails sent immediately via Resend on the API service)
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const params = new URLSearchParams(location.search);
  const subjectSelect = document.getElementById('subject');
  if (params.get('subject') === 'sales' && subjectSelect) {
    subjectSelect.value = 'sales';
  }
  if (params.get('plan') === 'enterprise' && subjectSelect) {
    subjectSelect.value = 'sales';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value,
      message: form.message.value.trim()
    };

    try {
      const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Send failed');
      window.location.href = '/contact-success.html';
    } catch (err) {
      alert(err.message || 'Could not send message. Email support@aeloriacareer.com directly.');
      btn.disabled = false;
      btn.textContent = label;
    }
  });
});
