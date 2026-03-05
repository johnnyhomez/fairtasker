// Dashboard App Logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2Gy0yd9sKYn_yBJmP4u6XKRW90v8NbmY",
  authDomain: "taskmate-123.firebaseapp.com",
  projectId: "taskmate-123",
  storageBucket: "taskmate-123.firebasestorage.app",
  messagingSenderId: "783596986866",
  appId: "1:783596986866:web:936b7a7127c7c96f4acb6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Dark mode
function setupDarkMode() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }

  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
}

// Auth
function setupAuthUI() {
  const authContainer = document.getElementById('authContainer');
  const userEmail = document.getElementById('userEmail');
  const authCheck = document.getElementById('authCheck');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      authContainer.innerHTML = `
        <button id="logoutBtn" class="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs sm:text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300">Logout</button>
      `;
      userEmail.textContent = user.email || user.phoneNumber || 'Signed in';
      userEmail.classList.remove('hidden');
      authCheck.classList.add('hidden');

      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
      });

      loadDashboard(user.uid);
    } else {
      authContainer.innerHTML = `
        <button id="authMenuBtn" class="rounded-xl bg-gradient-to-r from-primary to-primaryDark px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105">Sign In</button>
      `;
      userEmail.classList.add('hidden');
      authCheck.classList.remove('hidden');
    }
  });
}

// Load dashboard data
async function loadDashboard(userId) {
  const postedJobs = document.getElementById('postedJobs');
  const claimedJobs = document.getElementById('claimedJobs');
  const completedJobs = document.getElementById('completedJobs');
  const postedEmpty = document.getElementById('postedEmpty');
  const claimedEmpty = document.getElementById('claimedEmpty');
  const completedEmpty = document.getElementById('completedEmpty');

  try {
    // Posted jobs
    const postedQ = query(collection(db, 'jobs'), where('posterId', '==', userId));
    const postedDocs = await getDocs(postedQ);
    postedJobs.innerHTML = '';

    if (postedDocs.empty) {
      postedEmpty.classList.remove('hidden');
    } else {
      postedEmpty.classList.add('hidden');
      postedDocs.forEach(doc => {
        const job = doc.data();
        const card = renderJobCard(job, doc.id, 'posted');
        postedJobs.appendChild(card);
      });
    }

    // Claimed jobs
    const claimedQ = query(collection(db, 'jobs'), where('claimantId', '==', userId));
    const claimedDocs = await getDocs(claimedQ);
    claimedJobs.innerHTML = '';

    if (claimedDocs.empty) {
      claimedEmpty.classList.remove('hidden');
    } else {
      claimedEmpty.classList.add('hidden');
      claimedDocs.forEach(doc => {
        const job = doc.data();
        if (job.status === 'claimed') {
          const card = renderJobCard(job, doc.id, 'claimed');
          claimedJobs.appendChild(card);
        }
      });
    }

    // Completed jobs
    const completedQ = query(collection(db, 'jobs'), where('claimantId', '==', userId));
    const completedDocs = await getDocs(completedQ);
    completedJobs.innerHTML = '';

    if (completedDocs.empty) {
      completedEmpty.classList.remove('hidden');
    } else {
      let hasCompleted = false;
      completedDocs.forEach(doc => {
        const job = doc.data();
        if (job.status === 'completed' || job.status === 'paid') {
          hasCompleted = true;
          const card = renderJobCard(job, doc.id, 'completed');
          completedJobs.appendChild(card);
        }
      });
      if (!hasCompleted) {
        completedEmpty.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderJobCard(job, jobId, type) {
  const totalCost = job.rateType === 'hourly'
    ? parseFloat(job.rate) * parseFloat(job.hours || 1)
    : parseFloat(job.rate);
  const taskerEarnings = totalCost - 5;

  const card = document.createElement('div');
  card.className = 'glass-card p-6';
  
  let actions = '';
  if (type === 'posted' && job.claimantId && job.status === 'claimed') {
    actions = `
      <div class="mt-4 space-y-2">
        <button class="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primaryDark">Complete Job</button>
        <button class="w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold transition dark:border-gray-700">Message Tasker</button>
      </div>
    `;
  } else if (type === 'claimed' && job.status === 'claimed') {
    actions = `
      <div class="mt-4 space-y-2">
        <button class="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-white transition hover:bg-accentDark">Mark Complete</button>
        <button class="w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold transition dark:border-gray-700">Message Poster</button>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h3 class="text-lg font-black text-gray-900 dark:text-gray-100">${job.title}</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${job.category} • ${job.postcode}</p>
      </div>
      <span class="inline-flex items-center rounded-full ${
        job.status === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
        job.status === 'claimed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      } px-3 py-1 text-xs font-bold">${job.status.toUpperCase()}</span>
    </div>

    <div class="mt-4 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4 dark:border-primary/10 dark:from-primary/5 dark:to-accent/5">
      <p class="text-xs font-semibold text-gray-600 dark:text-gray-400">💰 ${type === 'claimed' || type === 'completed' ? 'Your Earnings' : 'Total Budget'}</p>
      <p class="mt-1 text-2xl font-black text-primary dark:text-emerald-300">$${type === 'claimed' || type === 'completed' ? taskerEarnings.toFixed(2) : totalCost.toFixed(2)}</p>
      <p class="mt-1 text-xs text-gray-600 dark:text-gray-500">${job.rateType === 'hourly' ? `$${job.rate}/hr × ${job.hours}h - $5 fee` : 'Fixed price - $5 fee'}</p>
    </div>

    ${actions}
  `;

  return card;
}

// Tab switching
function setupTabs() {
  const postedTab = document.getElementById('postedTab');
  const claimedTab = document.getElementById('claimedTab');
  const completedTab = document.getElementById('completedTab');
  const postedSection = document.getElementById('postedSection');
  const claimedSection = document.getElementById('claimedSection');
  const completedSection = document.getElementById('completedSection');

  postedTab.addEventListener('click', () => {
    postedSection.classList.remove('hidden');
    claimedSection.classList.add('hidden');
    completedSection.classList.add('hidden');
    updateTabActive(postedTab, [claimedTab, completedTab]);
  });

  claimedTab.addEventListener('click', () => {
    postedSection.classList.add('hidden');
    claimedSection.classList.remove('hidden');
    completedSection.classList.add('hidden');
    updateTabActive(claimedTab, [postedTab, completedTab]);
  });

  completedTab.addEventListener('click', () => {
    postedSection.classList.add('hidden');
    claimedSection.classList.add('hidden');
    completedSection.classList.remove('hidden');
    updateTabActive(completedTab, [postedTab, claimedTab]);
  });

  function updateTabActive(active, inactive) {
    active.classList.add('border-primary', 'text-primary');
    active.classList.remove('border-transparent', 'text-gray-600', 'dark:text-gray-400');
    inactive.forEach(tab => {
      tab.classList.remove('border-primary', 'text-primary');
      tab.classList.add('border-transparent', 'text-gray-600', 'dark:text-gray-400');
    });
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupAuthUI();
  setupTabs();
});
