// Shared Firebase & Auth setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB2Gy0yd9sKYn_yBJmP4u6XKRW90v8NbmY",
  authDomain: "taskmate-123.firebaseapp.com",
  projectId: "taskmate-123",
  storageBucket: "taskmate-123.firebasestorage.app",
  messagingSenderId: "783596986866",
  appId: "1:783596986866:web:936b7a7127c7c96f4acb6b",
  measurementId: "G-4Z2FV4Y86H"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper: Toast notifications
export function showToast(message, type = 'info') {
  if (window.Sonner) {
    if (type === 'error') window.Sonner.error(message);
    else if (type === 'success') window.Sonner.success(message);
    else window.Sonner.info(message);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Helper: Dark mode persistence
export function setupDarkMode() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

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

// Helper: Update auth UI across all pages
export function setupAuthStateListener() {
  const authContainer = document.getElementById('authContainer');
  const userEmail = document.getElementById('userEmail');
  const authMenuBtn = document.getElementById('authMenuBtn');
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');

  onAuthStateChanged(auth, (user) => {
    if (authContainer && userEmail && authMenuBtn) {
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
        userEmail.textContent = '';

        const newAuthBtn = document.getElementById('authMenuBtn');
        if (newAuthBtn && authModal) {
          newAuthBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
        }
      }
    }
  });

  // Auth Modal
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
    if (!phoneNumberDiv || !phoneRecaptchaDiv) return;

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
      } catch (err) {
        showToast(`Email sign-in failed: ${err.message}`, 'error');
      }
    });
  }

  // Handle email link sign-in
  if (isSignInWithEmailLink(auth, window.location.href)) {
    (async () => {
      let email = localStorage.getItem('emailForSignIn');
      if (!email) {
        email = prompt('Enter your email:');
      }

      if (email) {
        try {
          const result = await signInWithEmailLink(auth, email, window.location.href);
          localStorage.removeItem('emailForSignIn');
          showToast(`Signed in as ${result.user.email}`, 'success');
          window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
        } catch (err) {
          showToast(`Email sign-in failed: ${err.message}`, 'error');
        }
      }
    })();
  }
}

// Helper: Compress image
export async function compressImage(file, maxWidth = 300, maxHeight = 300, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
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
            quality
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
