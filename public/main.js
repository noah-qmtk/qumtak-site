// ─── CARD TOGGLES ───
function toggleJourney(card) {
  card.classList.toggle('active');
}

function toggleExpand(trigger) {
  trigger.classList.toggle('open');
  trigger.nextElementSibling.classList.toggle('open');
}

// ─── CONTACT POPUP ───
function openSurvey() {
  var o = document.getElementById('survey-overlay');
  o.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeSurvey() {
  var o = document.getElementById('survey-overlay');
  o.style.display = 'none';
  document.body.style.overflow = '';
}
document.getElementById('survey-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeSurvey();
});

function submitContact(e) {
  e.preventDefault();
  var name    = document.getElementById('contact-name').value.trim();
  var email   = document.getElementById('contact-email').value.trim();
  var message = document.getElementById('contact-msg').value.trim();
  var subject = encodeURIComponent('Qumtak Inquiry from ' + name);
  var body    = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
  window.location.href = 'mailto:noah@qmtk.org?subject=' + subject + '&body=' + body;
  setTimeout(function() { closeSurvey(); }, 800);
}

// ─── SCROLL REVEAL ───
// Re-animates every time an element enters the viewport (scrolling down OR back up)
var REVEAL_SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-up-fast';

var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    } else {
      // Remove visible so it re-animates next time it scrolls back into view
      entry.target.classList.remove('visible');
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -50px 0px'
});

document.querySelectorAll(REVEAL_SELECTOR).forEach(function(el) {
  revealObserver.observe(el);
});

// ─── NAV SCROLL EFFECT ───
// Shrink + deepen nav background as user scrolls down
var nav = document.querySelector('nav');
window.addEventListener('scroll', function() {
  if (window.scrollY > 60) {
    nav.style.background = 'rgba(10,15,12,0.98)';
    nav.style.borderBottomColor = 'rgba(34,162,77,0.18)';
  } else {
    nav.style.background = 'rgba(10,15,12,0.92)';
    nav.style.borderBottomColor = 'rgba(255,255,255,0.07)';
  }
}, { passive: true });
