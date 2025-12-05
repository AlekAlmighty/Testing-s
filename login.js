// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACafoJ0E-rJGv0Qz0F5C879ggI8CRSQ3A",
  authDomain: "breathe-green-7cc38.firebaseapp.com",
  projectId: "breathe-green-7cc38",
  storageBucket: "breathe-green-7cc38.firebasestorage.app",
  messagingSenderId: "219050855571",
  appId: "1:219050855571:web:5a418b7b9982baa806d166",
  measurementId: "G-4CZ35QJLJ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
// Note: Avoid enableIndexedDbPersistence which can delay initialization
// Firebase will use IndexedDB automatically if available

const container = document.getElementById('container');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');

switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.add('active');
  // clear previous messages
  const loginErr = document.getElementById('loginError');
  const registerErr = document.getElementById('registerError');
  const registerSucc = document.getElementById('registerSuccess');
  if (loginErr) loginErr.style.display = 'none';
  if (registerErr) registerErr.style.display = 'none';
  if (registerSucc) registerSucc.style.display = 'none';
});

switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.remove('active');
  // clear previous messages
  const loginErr = document.getElementById('loginError');
  const registerErr = document.getElementById('registerError');
  const registerSucc = document.getElementById('registerSuccess');
  if (loginErr) loginErr.style.display = 'none';
  if (registerErr) registerErr.style.display = 'none';
  if (registerSucc) registerSucc.style.display = 'none';
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = this.querySelector('input[type="email"]').value;
  const password = this.querySelector('input[type="password"]').value;
  const loginButton = document.getElementById('loginButton');
  const errorDiv = document.getElementById('loginError');

  try {
    // Disable button during authentication
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
    errorDiv.style.display = 'none';

    // Sign in user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      // Allow login even if email not verified, but show a clear warning.
      // NOTE: Allowing unverified logins reduces security; consider enforcing verification.
      const warnDiv = document.getElementById('loginError');
      warnDiv.textContent = 'Warning: your email is not verified. Please check your inbox, but you are being allowed to log in.';
      warnDiv.style.display = 'block';
      warnDiv.style.color = 'orange';
      console.warn('User logged in without email verification:', user.uid);
      // continue to fetch user data and redirect
    }

    // Get additional user data from Firestore (handle offline gracefully)
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        // Store user data in sessionStorage for use in dashboard
        const ud = userDoc.data();
        sessionStorage.setItem('userData', JSON.stringify(ud));

        // If this user hasn't been assessed yet, run the AI assessment flow (first-login only)
        if (!ud.assessed) {
          try {
            await runFirstLoginAssessment(user.uid, ud);
            // refresh sessionStorage with the updated doc if possible
            const refreshed = await getDoc(doc(db, 'users', user.uid));
            if (refreshed.exists()) sessionStorage.setItem('userData', JSON.stringify(refreshed.data()));
          } catch (assessErr) {
            console.warn('Assessment flow failed or was skipped:', assessErr);
          }
        }
      }
    } catch (getErr) {
      console.warn('Failed to read user document:', getErr);
      // If Firestore says the client is offline, allow login but warn user
      if (getErr && typeof getErr.message === 'string' && getErr.message.toLowerCase().includes('client is offline')) {
        const warnDiv = document.getElementById('loginError');
        if (warnDiv) {
          warnDiv.style.display = 'block';
          warnDiv.style.color = 'orange';
          warnDiv.textContent = 'You appear to be offline — profile data may be unavailable until you reconnect.';
        }
        console.warn('Proceeding without user Firestore data because client is offline');
      } else {
        // unknown error: rethrow to be handled by outer catch
        throw getErr;
      }
    }

    window.location.href = "profile/dashboard/dashboard.html";
  } catch (error) {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
    
    // Handle specific Firebase Auth errors
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorDiv.textContent = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        errorDiv.textContent = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/network-request-failed':
        errorDiv.textContent = 'Network error. Please check your connection';
        break;
      default:
        errorDiv.textContent = error.message;
    }
    errorDiv.style.display = 'block';
  }
});

// Handle register form submission
document.querySelector('.register-container form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const fullName = this.querySelector('input[name="fullName"]').value;
  const email = this.querySelector('input[name="email"]').value;
  const password = this.querySelector('input[name="password"]').value;
  const confirmPassword = this.querySelector('input[name="confirmPassword"]').value;
  const age = this.querySelector('input[name="age"]').value;
  const gender = this.querySelector('select[name="gender"]').value;
  const registerButton = document.getElementById('registerButton');
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');

  // Basic validation
  if (password !== confirmPassword) {
    errorDiv.textContent = "Passwords don't match!";
    errorDiv.style.display = 'block';
    return;
  }

  try {
    // Disable button during registration
    registerButton.disabled = true;
    registerButton.textContent = 'Creating Account...';
    errorDiv.style.display = 'none';

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User created in Firebase Auth:', user.uid);

    // Update user profile with full name
    await updateProfile(user, {
      displayName: fullName
    });
    console.log('User profile updated');

    // Store additional user data in Firestore
    const userData = {
      fullName,
      email,
      age: parseInt(age),
      gender,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      emailVerified: false,
      assessed: false
    };

    // Create a document in the 'users' collection with the user's UID as the document ID
    try {
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('Firestore document created');
    } catch (setErr) {
      console.warn('Failed to write user document to Firestore:', setErr);
      // If offline, inform the user that their profile will sync when back online
      if (setErr && typeof setErr.message === 'string' && setErr.message.toLowerCase().includes('client is offline')) {
        if (successDiv) {
          successDiv.textContent = 'Account created! Profile data will be saved when you reconnect. A verification email may be sent when online.';
        }
      } else {
        console.error('Firestore error during registration:', setErr);
        // Continue anyway; we'll show success since the user account exists
      }
    }

    // Send email verification (modular SDK)
    try {
      await sendEmailVerification(user);
      console.log('Verification email sent');
    } catch (sendErr) {
      // Non-fatal: verification email failed to send — we'll continue but log it
      console.error('Failed to send verification email:', sendErr);
    }

    // Show success message (visible element + console)
    if (successDiv) {
      successDiv.style.display = 'block';
      successDiv.textContent = 'Account created! A verification email was sent (check inbox/spam). You may log in now.';
    }
    // hide any previous error message
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
    registerButton.textContent = 'Account Created';
    console.log('User created:', user.uid);

    // Store user data in sessionStorage for use in profile page
    sessionStorage.setItem('userData', JSON.stringify(userData));
    console.log('About to redirect to profile/profile.html');

    // Redirect to profile page after successful registration
    window.location.href = "profile/profile.html";
    console.log('Redirect initiated');

  } catch (error) {
    console.error('Registration error caught:', error);
    registerButton.disabled = false;
    registerButton.textContent = 'Register';
    
    // Handle specific Firebase Auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorDiv.textContent = 'This email is already registered';
        break;
      case 'auth/invalid-email':
        errorDiv.textContent = 'Invalid email address';
        break;
      case 'auth/weak-password':
        errorDiv.textContent = 'Password should be at least 6 characters';
        break;
      case 'auth/network-request-failed':
        errorDiv.textContent = 'Network error. Please check your connection';
        break;
      default:
        errorDiv.textContent = error.message;
    }
    errorDiv.style.display = 'block';
    errorDiv.style.color = 'red';
  }
  }


  // --- First-login AI assessment helpers ---
  async function runFirstLoginAssessment(uid, existingData) {
    try {
      const assessment = await showAssessmentModalPromise(existingData);
      // if user skipped assessment, assessment may be null — still mark assessed to avoid repeated prompts
      const finalAssessment = assessment || { skipped: true, feedback: 'User skipped assessment' };
      await setDoc(doc(db, 'users', uid), { assessed: true, assessment: finalAssessment, lastAssessed: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('runFirstLoginAssessment error:', err);
      // Do not block login on assessment errors
      throw err;
    }
  }

  function showAssessmentModalPromise(existingData) {
    return new Promise((resolve, reject) => {
      try {
        const modal = document.getElementById('ai-assessment-modal');
        const form = document.getElementById('aiAssessmentForm');
        const resultDiv = document.getElementById('aiAssessmentResult');
        const cancelBtn = document.getElementById('aiAssessmentCancel');
        const submitBtn = document.getElementById('aiAssessmentSubmit');

        if (!modal || !form) return resolve(null);

        modal.style.display = 'flex';
        resultDiv.style.display = 'none';

        const onCancel = () => {
          cleanup();
          resolve(null);
        };

        const onSubmit = async (e) => {
          e.preventDefault();
          submitBtn.disabled = true;
          submitBtn.textContent = 'Assessing...';

          const formData = new FormData(form);
          const payload = {
            currentSmoker: formData.get('currentSmoker'),
            years: parseInt(formData.get('years') || '0', 10),
            cigsPerDay: parseInt(formData.get('cigsPerDay') || '0', 10),
            motivation: formData.get('motivation') || 'medium',
            age: existingData && existingData.age ? existingData.age : null,
            gender: existingData && existingData.gender ? existingData.gender : null
          };

          try {
            let assessment = null;
            try {
              assessment = await attemptAIAssessment(payload);
            } catch (aiErr) {
              console.warn('AI endpoint failed, falling back to local heuristic:', aiErr);
              assessment = localAssessment(payload);
            }

            // Show result in modal briefly
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<strong>Feedback:</strong><div style="margin-top:6px;">' + (assessment.feedback || JSON.stringify(assessment)) + '</div>';

            // cleanup and resolve with assessment object
            setTimeout(() => {
              cleanup();
              resolve(assessment);
            }, 900);
          } catch (err) {
            cleanup();
            reject(err);
          }
        };

        function cleanup() {
          modal.style.display = 'none';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get feedback';
          form.removeEventListener('submit', onSubmit);
          cancelBtn.removeEventListener('click', onCancel);
        }

        form.addEventListener('submit', onSubmit);
        cancelBtn.addEventListener('click', onCancel);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function attemptAIAssessment(payload) {
    // This expects a backend endpoint that calls your AI provider (OpenAI or others).
    // Example endpoint path: '/api/ai/assess' — implement server-side to keep keys secret.
    const endpoint = '/api/ai/assess';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('AI endpoint error: ' + res.statusText);
    const data = await res.json();
    // Expected response shape: { feedback: string, score?: number, recommendations?: string[] }
    return data;
  }

  function localAssessment(payload) {
    // Simple heuristic fallback if no server-side AI is available.
    const years = Number(payload.years || 0);
    const cigs = Number(payload.cigsPerDay || 0);
    let score = 0;
    if (payload.currentSmoker === 'yes') score += 50;
    score += Math.min(30, Math.floor(years * 2));
    score += Math.min(20, Math.floor(cigs / 2));

    let risk = 'Low';
    if (score >= 80) risk = 'High';
    else if (score >= 50) risk = 'Moderate';

    const feedback = `Estimated risk level: ${risk}. Years smoked: ${years}, cigarettes/day: ${cigs}. Recommendation: ` +
      (risk === 'High' ? 'Seek medical advice and consider an intensive quit plan; try counselling + pharmacotherapy.' :
       risk === 'Moderate' ? 'Consider quitting supports (apps, counselling). Increase motivation and plan steps.' :
       'Maintain healthy habits; avoid relapse and consider brief cessation support if concerned.');

    return { score, feedback, recommendations: [] };
  }

  // --- end helpers ---
});