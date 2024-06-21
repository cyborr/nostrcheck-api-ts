  function getServerUptime() {
    fetch(window.location.protocol + "//" + window.location.host + '/api/v2/admin/status')
    .then(res => res.json())
    .then(out =>
      {let uptimes = document.getElementsByClassName('server-uptime');
      Array.prototype.forEach.call(uptimes, function(uptime) {
        uptime.innerHTML = out.uptime;
      })})
    .catch(err => { throw err });
    setTimeout(getServerUptime, 1000);
  }
  getServerUptime();
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))


// Smooth scroll and offset by 200px
function smoothScroll(target, duration) {
  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 200;
  const startPosition = window.scrollY;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function ease(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
  }

  requestAnimationFrame(animation);
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      smoothScroll(targetElement, 1000); 
  });
});

// Theme switcher
const themeSwitch = document.getElementById('theme-switch');
const body = document.body;
const themeSwithLabelText = document.getElementById('theme-swith-label-text');

function applyTheme(theme) {
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    body.setAttribute('data-bs-theme', 'dark');
    themeSwitch.checked = true;
    themeSwithLabelText.textContent = 'Dark mode';
  } else {
    body.setAttribute('data-bs-theme', 'light');
    themeSwitch.checked = false;
    themeSwithLabelText.textContent = 'Light mode';
  }
}

function setTheme(theme) {
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

themeSwitch.addEventListener('change', () => {
  if (themeSwitch.checked) {
    setTheme('dark');
  } else {
    setTheme('light');
  }
});

const savedTheme = localStorage.getItem('theme') || 'system';
applyTheme(savedTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem('theme') === 'system') {
    applyTheme('system');
  }
});


// Reload page when loaded from cache
window.addEventListener('pageshow', (event) => {
  if (event.persisted || (performance && performance.navigation.type === 2)) {
      console.log('Page loaded from cache, reloading...');
      window.location.reload();
  }
});

// Messages engine
const showMessage = (message, messageClass = "alert-warning", timeout = 2500) => {
  const messagesContainer = 'message-container';

  if (!document.getElementById(messagesContainer)) {
      $('body').append('<div id="' + messagesContainer + '" class="message-container"></div>');
  }

  const messageBox = 'message-box-' + Date.now();
  const messageBoxHtml = `
      <div id="${messageBox}" class="alert alert-modal message-box ${messageClass}">
          ${message}
      </div>
  `;

  const $messagesContainer = $('#' + messagesContainer);
  $messagesContainer.prepend(messageBoxHtml);

  const maxMessages = 5;
  const currentMessages = $messagesContainer.children('.message-box');
  if (currentMessages.length > maxMessages) {
      currentMessages.last().remove();
  }

  setTimeout(() => {
      $('#' + messageBox).fadeOut(500, function () {
          $(this).remove();
      });
  }, timeout);
}

