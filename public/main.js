// ─── CARD TOGGLES ───
function toggleJourney(card) {
  card.classList.toggle('active');
}

function toggleExpand(trigger) {
  trigger.classList.toggle('open');
  trigger.nextElementSibling.classList.toggle('open');
}

// ─── FAQ TOGGLE ───
function toggleFaq(item) {
  var isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item.open').forEach(function(el) {
    el.classList.remove('open');
  });
  // Open clicked if it wasn't open
  if (!isOpen) {
    item.classList.add('open');
  }
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
  var subject = encodeURIComponent('qmtk Inquiry from ' + name);
  var body    = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
  window.location.href = 'mailto:noah@qmtk.org?subject=' + subject + '&body=' + body;
  setTimeout(function() { closeSurvey(); }, 800);
}

// ─── SCROLL REVEAL ───
var REVEAL_SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-up-fast';

var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    } else {
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

// ─── NEXT SESSION DATE ───
// NOTE: main.js is NOT loaded by index.html (all JS/CSS is inline there).
// This function is dead code kept only for reference — the live "Week of"
// date comes from the inline loadTrainingPlans() in index.html, driven by
// public/training-plans.json.
// Summer 2026 schedule: Jul 9 – Aug 20, Thursdays, 6:00–7:30 PM
// (K–5 6:00–6:45, Grades 6–8 6:45–7:30)
function updateNextSessionDate() {
  var el = document.getElementById('next-session-date');
  if (!el) return;
  var SEASON_START = new Date(2026, 6, 9);              // Jul 9, 2026
  var SEASON_END   = new Date(2026, 7, 20, 19, 30, 0);  // Aug 20, 7:30 PM
  var SESSION_DAYS = [4];                               // Thu
  var START_H = 18, START_M = 0;                        // 6:00 PM start
  var DURATION_MIN = 90;                                // both groups combined
  var now = new Date();
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var found = null;
  var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (var i = 0; i < 70; i++) {
    if (SESSION_DAYS.indexOf(d.getDay()) !== -1) {
      var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), START_H, START_M);
      var end   = new Date(start.getTime() + DURATION_MIN * 60000);
      if (end >= now && start >= SEASON_START && start <= SEASON_END) {
        found = start;
        break;
      }
    }
    d.setDate(d.getDate() + 1);
  }
  if (found) {
    el.textContent = months[found.getMonth()] + ' ' + found.getDate();
  } else {
    el.textContent = 'Next Season';
  }
}
updateNextSessionDate();

// ─── NAV SCROLL EFFECT ───
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
