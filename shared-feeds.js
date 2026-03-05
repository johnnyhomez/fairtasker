// Shared Feed functionality
import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, showToast } from "./shared-auth.js";

const db = getFirestore();

export async function fetchOpenJobs() {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs;
  } catch (err) {
    console.error('Error fetching jobs:', err);
    showToast('Failed to fetch jobs', 'error');
    return [];
  }
}

export function renderJobCard(job, jobId) {
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
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-500">${job.rateType === 'hourly' ? `${job.rate}/hr × ${job.hours}h` : 'Fixed price'}</p>
      </div>
      
      <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <span>📍</span>
        <span>${job.postcode || 'Location TBD'}</span>
      </div>
      
      <button class="claim-btn w-full rounded-xl ${auth.currentUser ? 'bg-primary hover:bg-primaryDark  shadow-lg hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'} px-4 py-3 font-bold text-white transition duration-200" data-job-id="${jobId}" data-job-title="${job.title}" ${auth.currentUser ? '' : 'disabled'}>
        ${auth.currentUser ? '✨ Claim Job' : '🔒 Sign in to claim'}
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
        claimBtn.textContent = '✨ Claim Job';
        claimBtn.disabled = false;
        showToast(`Claim failed: ${err.message}`, 'error');
      }
    });
  }
  
  return card;
}

export async function claimJob(jobId, jobTitle) {
  if (!auth.currentUser) {
    showToast('Please sign in first', 'error');
    return;
  }

  try {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      showToast('Job not found', 'error');
      return;
    }

    const jobData = jobSnap.data();

    // Check if already claimed
    if (jobData.claimantId && jobData.claimantId !== auth.currentUser.uid) {
      showToast('This job has already been claimed', 'error');
      return;
    }

    // Update job with claimant info
    await updateDoc(jobRef, {
      claimantId: auth.currentUser.uid,
      claimantEmail: auth.currentUser.email || auth.currentUser.phoneNumber,
      status: 'claimed',
      claimedAt: new Date()
    });

    alert(`Claimed! ${jobTitle}\n\n💰 Stripe checkout coming soon`);
    showToast('Job claimed! Stripe payment coming soon.', 'success');
  } catch (err) {
    console.error('Claim error:', err);
    throw err;
  }
}

export async function loadAndRenderFeed(container) {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'col-span-3 flex justify-center py-12';
  loadingDiv.innerHTML = '<div class="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary dark:border-gray-700 dark:border-t-primary"></div>';
  container.appendChild(loadingDiv);

  const jobs = await fetchOpenJobs();
  container.innerHTML = '';

  if (jobs.length === 0) {
    container.innerHTML = '<div class="col-span-3 rounded-2xl border-2 border-dashed border-gray-300 px-8 py-12 text-center dark:border-gray-700"><svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3 class="mt-4 text-lg font-bold">No jobs yet</h3><p class="mt-1 text-gray-600 dark:text-gray-400">Be the first to post! 👆</p></div>';
    return;
  }

  jobs.forEach(doc => {
    container.appendChild(renderJobCard(doc.data(), doc.id));
  });
}

export function startFeedPolling(container, interval = 5000) {
  loadAndRenderFeed(container);
  return setInterval(() => loadAndRenderFeed(container), interval);
}

export function stopFeedPolling(pollId) {
  if (pollId) clearInterval(pollId);
}
