/**
 * Floating support chat — persists messages per signed-in user via API.
 */
(function () {
  const SUPPORT_EMAIL = 'support@aeloriacareer.com';

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function renderMessage(msg) {
    const row = el('div', `support-chat-msg support-chat-msg--${msg.role}`);
    const bubble = el('div', 'support-chat-bubble');
    bubble.textContent = msg.body;
    row.appendChild(bubble);
    if (msg.createdAt) {
      const meta = el('div', 'support-chat-meta', formatTime(msg.createdAt));
      row.appendChild(meta);
    }
    return row;
  }

  class SupportChat {
    constructor() {
      this.open = false;
      this.loading = false;
      this.messages = [];
      this.build();
      this.bind();
      window.addEventListener('proresume:auth', () => this.onAuthChange());
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-support-chat-open]')) {
          e.preventDefault();
          this.toggle(true);
        }
      });
    }

    build() {
      this.root = el('div', 'support-chat-root');
      this.root.innerHTML = `
        <button type="button" class="support-chat-fab" aria-label="Open support chat" aria-expanded="false">
          <i class="fa-solid fa-comments" aria-hidden="true"></i>
        </button>
        <div class="support-chat-panel hidden" role="dialog" aria-label="Support chat">
          <div class="support-chat-header">
            <div>
              <p class="support-chat-title">Support</p>
              <p class="support-chat-subtitle">We reply within 1 business day</p>
            </div>
            <button type="button" class="support-chat-close" aria-label="Close chat"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="support-chat-messages"></div>
          <div class="support-chat-compose">
            <p class="support-chat-gate hidden">Sign in to message our team.</p>
            <textarea class="support-chat-input hidden" rows="2" maxlength="4000" placeholder="Type your message…"></textarea>
            <div class="support-chat-actions hidden">
              <button type="button" class="support-chat-send">Send</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(this.root);

      this.fab = this.root.querySelector('.support-chat-fab');
      this.panel = this.root.querySelector('.support-chat-panel');
      this.list = this.root.querySelector('.support-chat-messages');
      this.input = this.root.querySelector('.support-chat-input');
      this.sendBtn = this.root.querySelector('.support-chat-send');
      this.gate = this.root.querySelector('.support-chat-gate');
      this.composeActions = this.root.querySelector('.support-chat-actions');
      this.closeBtn = this.root.querySelector('.support-chat-close');
    }

    bind() {
      this.fab.addEventListener('click', () => this.toggle());
      this.closeBtn.addEventListener('click', () => this.toggle(false));
      this.sendBtn.addEventListener('click', () => this.send());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
    }

    onAuthChange() {
      if (this.open) this.loadMessages();
      else this.updateComposeState();
    }

    updateComposeState() {
      const loggedIn = window.ProResumeAPI?.isLoggedIn();
      this.gate.classList.toggle('hidden', loggedIn);
      this.input.classList.toggle('hidden', !loggedIn);
      this.composeActions.classList.toggle('hidden', !loggedIn);
      if (loggedIn) {
        this.gate.innerHTML = '';
      } else {
        this.gate.innerHTML = `Sign in to chat with support, or email <a href="mailto:${SUPPORT_EMAIL}" class="text-emerald-400 hover:underline">${SUPPORT_EMAIL}</a>. <a href="/login.html" class="text-emerald-400 hover:underline">Sign in</a>`;
      }
    }

    async toggle(force) {
      this.open = typeof force === 'boolean' ? force : !this.open;
      this.panel.classList.toggle('hidden', !this.open);
      this.fab.classList.toggle('is-open', this.open);
      this.fab.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      if (this.open) {
        this.updateComposeState();
        await this.loadMessages();
        if (window.ProResumeAPI?.isLoggedIn()) this.input.focus();
      }
    }

    paintMessages() {
      this.list.innerHTML = '';
      if (!this.messages.length) {
        this.list.appendChild(el('p', 'support-chat-empty', 'Loading conversation…'));
        return;
      }
      this.messages.forEach((msg) => this.list.appendChild(renderMessage(msg)));
      this.list.scrollTop = this.list.scrollHeight;
    }

    async loadMessages() {
      if (!window.ProResumeAPI?.isLoggedIn()) {
        this.messages = [{
          role: 'system',
          body: `Questions about billing, usage, or your account? Sign in to chat with us, or email ${SUPPORT_EMAIL}.`,
          createdAt: new Date().toISOString()
        }];
        this.paintMessages();
        return;
      }
      this.loading = true;
      try {
        const data = await window.ProResumeAPI.listSupportMessages();
        this.messages = data.messages || [];
      } catch {
        this.messages = [{
          role: 'system',
          body: 'Could not load chat history. Check your connection and try again.',
          createdAt: new Date().toISOString()
        }];
      }
      this.loading = false;
      this.paintMessages();
    }

    async send() {
      if (!window.ProResumeAPI?.isLoggedIn()) {
        location.href = '/login.html?next=' + encodeURIComponent(location.pathname);
        return;
      }
      const body = this.input.value.trim();
      if (!body || this.loading) return;
      this.loading = true;
      this.sendBtn.disabled = true;
      try {
        const data = await window.ProResumeAPI.sendSupportMessage(body);
        this.messages.push(data.message);
        this.input.value = '';
        this.paintMessages();
      } catch (err) {
        alert(err.message || 'Could not send message');
      } finally {
        this.loading = false;
        this.sendBtn.disabled = false;
      }
    }
  }

  function init() {
    if (document.querySelector('.support-chat-root')) return;
    window.ProResumeSupportChat = new SupportChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
