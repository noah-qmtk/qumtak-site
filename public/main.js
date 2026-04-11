function toggleJourney(card) {
  card.classList.toggle('active');
}

function toggleExpand(trigger) {
  trigger.classList.toggle('open');
  trigger.nextElementSibling.classList.toggle('open');
}

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
// Auto-open after 8s, once per session
if (!sessionStorage.getItem('surveyShown')) {
  setTimeout(function() {
    openSurvey();
    sessionStorage.setItem('surveyShown', '1');
  }, 8000);
}

// ─── SCROLL REVEAL ───
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
  observer.observe(el);
});