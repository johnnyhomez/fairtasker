// FairTasker - Main App Logic
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { 
  getAuth, 
  signInWithEmailLink, 
  isSignInWithEmailLink, 
  sendSignInLinkToEmail, 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  updateDoc, 
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB2Gy0yd9sKYn_yBJmP4u6XKRW90v8NbmY",
  authDomain: "taskmate-123.firebaseapp.com",
  projectId: "taskmate-123",
  storageBucket: "taskmate-123.firebasestorage.app",
  messagingSenderId: "783596986866",
  appId: "1:783596986866:web:936b7a7127c7c96f4acb6b",
  measurementId: "G-4Z2FV4Y86H"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==================== UTILITIES ====================

function showToast(message, type = 'info') {
  if (window.Sonner) {
    if (type === 'error') window.Sonner.error(message);
    else if (type === 'success') window.Sonner.success(message);
    else window.Sonner.info(message);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

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

// Compress image: max 300x300px, JPEG quality 0.85
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.85
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ==================== AUTHENTICATION ====================

function setupAuthUI() {
  const authContainer = document.getElementById('authContainer');
  const userEmail = document.getElementById('userEmail');
  const authMenuBtn = document.getElementById('authMenuBtn');
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      authContainer.innerHTML = `
        <button id="logoutBtn" class="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs sm:text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Logout
        </button>
      `;
      userEmail.textContent = user.email || user.phoneNumber || 'Signed in';
      userEmail.classList.remove('hidden');

      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        showToast('Signed out successfully', 'success');
      });
    } else {
      authContainer.innerHTML = `
        <button id="authMenuBtn" class="rounded-xl bg-gradient-to-r from-primary to-primaryDark px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105">
          Sign In
        </button>
      `;
      userEmail.classList.add('hidden');

      const newAuthBtn = document.getElementById('authMenuBtn');
      if (newAuthBtn && authModal) {
        newAuthBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
      }
    }
  });

  if (authMenuBtn && authModal) {
    authMenuBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
  }
  if (closeAuthModal && authModal) {
    closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));
  }

  // Google Sign-In
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      try {
        const googleProvider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, googleProvider);
        showToast(`Signed in as ${result.user.email}`, 'success');
        authModal.classList.add('hidden');
      } catch (err) {
        showToast(`Google sign-in failed: ${err.message}`, 'error');
      }
    });
  }

  // Phone Sign-In
  const phoneSignInBtn = document.getElementById('phoneSignInBtn');
  const phoneAuthModal = document.getElementById('phoneAuthModal');
  const closePhoneModal = document.getElementById('closePhoneModal');
  const phoneNumberDiv = document.getElementById('phoneNumberDiv');
  const phoneRecaptchaDiv = document.getElementById('phoneRecaptchaDiv');
  const phoneCodeDiv = document.getElementById('phoneCodeDiv');
  const phoneCodeInput = document.getElementById('phoneCodeInput');
  const verifyPhoneBtn = document.getElementById('verifyPhoneBtn');

  if (phoneSignInBtn && phoneAuthModal) {
    phoneSignInBtn.addEventListener('click', () => {
      authModal.classList.add('hidden');
      phoneAuthModal.classList.remove('hidden');
      setupPhoneAuth();
    });
  }

  if (closePhoneModal && phoneAuthModal) {
    closePhoneModal.addEventListener('click', () => phoneAuthModal.classList.add('hidden'));
  }

  function setupPhoneAuth() {
    phoneNumberDiv.innerHTML = `
      <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
      <input id="phoneNumberInput" type="tel" placeholder="+61412345678" class="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-900"/>
      <button id="sendPhoneCodeBtn" type="button" class="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700">Send Code</button>
    `;

    const sendPhoneCodeBtn = document.getElementById('sendPhoneCodeBtn');
    const phoneNumberInput = document.getElementById('phoneNumberInput');

    if (sendPhoneCodeBtn) {
      sendPhoneCodeBtn.addEventListener('click', async () => {
        const phoneNumber = phoneNumberInput.value;
        if (!phoneNumber) {
          showToast('Please enter a phone number', 'error');
          return;
        }

        try {
          const recaptchaVerifier = new RecaptchaVerifier(phoneRecaptchaDiv, {
            size: 'normal',
            callback: () => {}
          }, auth);

          window.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
          phoneNumberDiv.classList.add('hidden');
          phoneCodeDiv.classList.remove('hidden');
          showToast('Code sent to your phone', 'success');
        } catch (err) {
          showToast(`Phone auth failed: ${err.message}`, 'error');
        }
      });
    }

    if (verifyPhoneBtn && phoneCodeInput) {
      verifyPhoneBtn.addEventListener('click', async () => {
        const code = phoneCodeInput.value;
        if (!code) {
          showToast('Please enter the verification code', 'error');
          return;
        }

        try {
          if (window.confirmationResult) {
            const result = await window.confirmationResult.confirm(code);
            showToast(`Signed in as ${result.user.phoneNumber}`, 'success');
            phoneAuthModal.classList.add('hidden');
            phoneNumberDiv.classList.remove('hidden');
            phoneCodeDiv.classList.add('hidden');
            location.reload();
          }
        } catch (err) {
          showToast(`Verification failed: ${err.message}`, 'error');
        }
      });
    }
  }

  // Email Sign-In
  const emailSignInBtn = document.getElementById('emailSignInBtn');
  const emailAuthModal = document.getElementById('emailAuthModal');
  const closeEmailModal = document.getElementById('closeEmailModal');
  const emailInput = document.getElementById('emailInput');
  const sendEmailLinkBtn = document.getElementById('sendEmailLinkBtn');

  if (emailSignInBtn && emailAuthModal) {
    emailSignInBtn.addEventListener('click', () => {
      authModal.classList.add('hidden');
      emailAuthModal.classList.remove('hidden');
    });
  }

  if (closeEmailModal && emailAuthModal) {
    closeEmailModal.addEventListener('click', () => emailAuthModal.classList.add('hidden'));
  }

  if (sendEmailLinkBtn && emailInput) {
    sendEmailLinkBtn.addEventListener('click', async () => {
      const email = emailInput.value;
      if (!email) {
        showToast('Please enter an email address', 'error');
        return;
      }

      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
      };

      try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        localStorage.setItem('emailForSignIn', email);
        showToast('Check your email for the magic link!', 'success');
        emailAuthModal.classList.add('hidden');
        emailInput.value = '';
      } catch (err) {
        showToast(`Email sign-in failed: ${err.message}`, 'error');
      }
    });
  }

  // Handle email link sign-in
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = localStorage.getItem('emailForSignIn');
    if (!email) {
      email = prompt('Enter your email:');
    }

    if (email) {
      signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          localStorage.removeItem('emailForSignIn');
          showToast(`Signed in as ${result.user.email}`, 'success');
          window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
          location.reload();
        })
        .catch((err) => {
          showToast(`Email sign-in failed: ${err.message}`, 'error');
        });
    }
  }
}

// ==================== JOB FEED ====================

function renderJobCard(job, jobId) {
  const thumbnailUrl = job.thumbnail || job.photos?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22system-ui%22 font-size=%2224%22 fill=%22%239ca3af%22%3ENo image%3C/text%3E%3C/svg%3E';
  
  const descSnippet = (job.description || '').substring(0, 120) + (job.description && job.description.length > 120 ? '...' : '');
  
  const totalCost = job.rateType === 'hourly' 
    ? parseFloat(job.rate) * parseFloat(job.hours || 1)
    : parseFloat(job.rate);

  const card = document.createElement('div');
  card.id = `job-${jobId}`;
  card.className = 'animate-fadeIn overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-xl transition hover:shadow-2xl hover:scale-105 dark:border-gray-800/50 dark:bg-gray-900/50';
  
  card.innerHTML = `
    <div class="aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
      <img src="${thumbnailUrl}" alt="${job.title}" class="h-full w-full object-cover transition hover:scale-110" loading="lazy">
    </div>
    <div class="p-6 space-y-4">
      <div>
        <h3 class="text-lg font-black text-gray-900 dark:text-gray-100">${job.title}</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${descSnippet}</p>
      </div>
      
      <div class="flex gap-2 flex-wrap">
        <span class="inline-flex items-center rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">${job.category}</span>
      </div>
      
      <div class="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4 dark:border-primary/10 dark:from-primary/5 dark:to-accent/5">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400">💰 Total Budget</p>
        <p class="mt-1 text-2xl font-black text-primary dark:text-emerald-300">$${totalCost.toFixed(2)}</p>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-500">${job.rateType === 'hourly' ? `$${job.rate}/hr × ${job.hours}h` : 'Fixed price'}</p>
      </div>
      
      <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <span>📍</span>
        <span>${job.postcode || 'Location TBD'}</span>
      </div>
      
      <button class="claim-btn w-full rounded-xl ${auth.currentUser ? 'bg-primary hover:bg-primaryDark shadow-lg hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'} px-4 py-3 font-bold text-white transition duration-200" data-job-id="${jobId}" data-job-title="${job.title}" ${auth.currentUser ? '' : 'disabled'}>
        ${auth.currentUser ? '✨ Claim Job ($5)' : '🔒 Sign in to claim'}
      </button>
    </div>
  `;
  
  const claimBtn = card.querySelector('.claim-btn');
  if (auth.currentUser) {
    claimBtn.addEventListener('click', async () => {
      claimBtn.textContent = '⏳ Processing...';
      claimBtn.disabled = true;
      try {
        await claimJob(jobId, job.title);
        claimBtn.textContent = '✅ Claimed!';
      } catch (err) {
        claimBtn.textContent = '✨ Claim Job ($5)';
        claimBtn.disabled = false;
        showToast(`Claim failed: ${err.message}`, 'error');
      }
    });
  }
  
  return card;
}

async function claimJob(jobId, jobTitle) {
  if (!auth.currentUser) {
    showToast('Please sign in first', 'error');
    return;
  }

  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    showToast('Job not found', 'error');
    return;
  }

  const jobData = jobSnap.data();
  if (jobData.claimantId && jobData.claimantId !== auth.currentUser.uid) {
    showToast('This job has already been claimed', 'error');
    return;
  }

  await updateDoc(jobRef, {
    claimantId: auth.currentUser.uid,
    claimantEmail: auth.currentUser.email || auth.currentUser.phoneNumber,
    status: 'claimed',
    claimedAt: Timestamp.now()
  });

  alert(`Claimed! ${jobTitle}\n\n💰 Stripe checkout coming soon`);
  showToast('Job claimed! Stripe payment coming soon.', 'success');

  // Refresh feed
  await loadAndRenderFeed();
}

async function loadAndRenderFeed() {
  const jobFeed = document.getElementById('jobFeed');
  const emptyState = document.getElementById('emptyState');

  try {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    jobFeed.innerHTML = '';
    if (snapshot.empty) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      snapshot.docs.forEach(doc => {
        jobFeed.appendChild(renderJobCard(doc.data(), doc.id));
      });
    }
  } catch (err) {
    console.error('Error loading jobs:', err);
    showToast('Failed to load jobs', 'error');
  }
}

function startFreedPolling() {
  loadAndRenderFeed();
  const pollId = setInterval(loadAndRenderFeed, 5000);
  window.addEventListener('beforeunload', () => clearInterval(pollId));
  return pollId;
}

// ==================== JOB POSTING ====================

function setupJobForm() {
  const jobForm = document.getElementById('jobForm');
  const photoDropZone = document.getElementById('photoDropZone');
  const photoInput = document.getElementById('photoInput');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const jobRateType = document.getElementById('jobRateType');
  const hoursContainer = document.getElementById('hoursContainer');

  // Toggle hours field based on rate type
  jobRateType.addEventListener('change', (e) => {
    if (e.target.value === 'hourly') {
      hoursContainer.classList.remove('hidden');
    } else {
      hoursContainer.classList.add('hidden');
    }
  });

  // Photo drag & drop
  photoDropZone.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', handlePhotoFiles);

  photoDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoDropZone.classList.add('border-primary', 'bg-primary/5');
  });

  photoDropZone.addEventListener('dragleave', () => {
    photoDropZone.classList.remove('border-primary', 'bg-primary/5');
  });

  photoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropZone.classList.remove('border-primary', 'bg-primary/5');
    handlePhotoFiles(e.dataTransfer.files);
  });

  function handlePhotoFiles(files) {
    photoPreviewContainer.innerHTML = '';
    Array.from(files || photoInput.files || []).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'w-full h-32 object-cover rounded-lg shadow-md';
        photoPreviewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  // Submit form
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      showToast('Sign in first to post jobs', 'error');
      return;
    }

    const submitBtn = jobForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Posting...';

    try {
      // Upload photos
      const photos = [];
      const selectedFiles = Array.from(photoInput.files || []);

      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) {
          showToast('One or more files exceed 10MB', 'error');
          continue;
        }

        try {
          const compressedBlob = await compressImage(file);
          const timestamp = Date.now();
          const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `jobs/${auth.currentUser.uid}/${timestamp}_${safeFileName}`;
          const fileRef = ref(storage, storagePath);
          await uploadBytes(fileRef, compressedBlob);
          const downloadURL = await getDownloadURL(fileRef);
          photos.push(downloadURL);
        } catch (err) {
          showToast(`Failed to upload image: ${err.message}`, 'error');
        }
      }

      const jobData = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        category: document.getElementById('jobCategory').value,
        postcode: document.getElementById('jobPostcode').value,
        rate: parseFloat(document.getElementById('jobRate').value),
        rateType: document.getElementById('jobRateType').value,
        hours: document.getElementById('jobRateType').value === 'hourly' ? parseFloat(document.getElementById('jobHours').value) : 1,
        posterId: auth.currentUser.uid,
        posterEmail: auth.currentUser.email || auth.currentUser.phoneNumber,
        status: 'open',
        createdAt: Timestamp.now(),
        photos,
        thumbnail: photos[0] || ''
      };

      await addDoc(collection(db, 'jobs'), jobData);
      showToast('Job posted successfully! 🎉', 'success');
      jobForm.reset();
      photoPreviewContainer.innerHTML = '';
      await loadAndRenderFeed();
    } catch (err) {
      showToast(`Error posting job: ${err.message}`, 'error');
      console.error('Job post error:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Job ($5 Fee)';
    }
  });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  setupDarkMode();
  setupAuthUI();
  setupJobForm();
  startFreedPolling();
});
