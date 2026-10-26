
"use strict";

// ==================================================
// LOGIN.JS — Task Management System
// ==================================================

const API = {
    login: "/auth/login",
    me: "/auth/me",
    googleClientId: "/auth/google/client-id",
    googleLogin: "/auth/google"
};

let googleClientIdCache = null;
let googleInitialized = false;
let googleInitializationPromise = null;
let googleTokenClient = null;

// ==================================================
// Helper: Safely Read JSON Responses
// ==================================================

async function readResponse(response) {
    const text = await response.text();

    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `Server returned an invalid response (${response.status}).`
        );
    }
}

// ==================================================
// Helper: Show Error
// ==================================================

function showError(message) {
    const errorBox = document.getElementById("loginError");

    if (errorBox) {
        errorBox.textContent = message;
        errorBox.style.display = "block";
    } else {
        alert(message);
    }

    console.error("Login error:", message);
}

// ==================================================
// Helper: Clear Error
// ==================================================

function clearError() {
    const errorBox = document.getElementById("loginError");

    if (errorBox) {
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }
}

// ==================================================
// Helper: Load Button State
// ==================================================

function setLoginLoading(loading) {
    const button = document.getElementById("loginButton");

    if (!button) return;

    button.disabled = loading;

    if (loading) {
        button.dataset.originalText =
            button.textContent.trim() || "Login";

        button.textContent = "Logging in...";
    } else {
        button.textContent =
            button.dataset.originalText || "Login";
    }
}

// ==================================================
// 1. EMAIL AND PASSWORD LOGIN
// ==================================================

async function loginUser(event) {
    if (event) event.preventDefault();

    clearError();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (!emailInput || !passwordInput) {
        showError("Email or password field is missing from the page.");
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }

    if (password.length < 6) {
        showError("Password must contain at least 6 characters.");
        return;
    }

    setLoginLoading(true);

    try {
        const response = await fetch(API.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.detail ||
                result.error ||
                `Login failed. HTTP ${response.status}`
            );
        }

        if (!result.token) {
            throw new Error(
                "The server did not return an authentication token."
            );
        }

        // Save authentication details.
        localStorage.setItem("token", result.token);

        if (result.user) {
            localStorage.setItem(
                "user",
                JSON.stringify(result.user)
            );
        }

        // Redirect after successful authentication.
        window.location.href = "/task-manager.html";

    } catch (error) {
        console.error("Email login failed:", error);

        if (error instanceof TypeError) {
            showError(
                "Cannot connect to the server. Check that your backend is running."
            );
        } else {
            showError(
                error.message || "Unable to login. Please try again."
            );
        }
    } finally {
        setLoginLoading(false);
    }
}

// ==================================================
// 2. PASSWORD VISIBILITY TOGGLE
// ==================================================

function togglePassword() {
    const passwordInput = document.getElementById("password");
    const passwordIcon = document.getElementById("passwordIcon");

    if (!passwordInput) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";

        if (passwordIcon) {
            passwordIcon.classList.remove("fa-eye");
            passwordIcon.classList.add("fa-eye-slash");
        }
    } else {
        passwordInput.type = "password";

        if (passwordIcon) {
            passwordIcon.classList.remove("fa-eye-slash");
            passwordIcon.classList.add("fa-eye");
        }
    }
}

// ==================================================
// 3. LOAD GOOGLE IDENTITY SERVICES
// ==================================================

function loadGoogleScript() {
    if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id &&
        window.google.accounts.oauth2
    ) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        let script = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (!script) {
            script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const timeout = setTimeout(() => {
            reject(
                new Error(
                    "Google Sign-In could not load. Check your internet connection or browser settings."
                )
            );
        }, 15000);

        script.addEventListener(
            "load",
            () => {
                clearTimeout(timeout);

                if (
                    window.google &&
                    window.google.accounts
                ) {
                    resolve();
                } else {
                    reject(
                        new Error("Google Sign-In did not initialize.")
                    );
                }
            },
            { once: true }
        );

        script.addEventListener(
            "error",
            () => {
                clearTimeout(timeout);
                reject(
                    new Error("Unable to load Google Sign-In.")
                );
            },
            { once: true }
        );
    });
}

// ==================================================
// 4. FETCH GOOGLE CLIENT ID
// ==================================================

async function fetchGoogleClientId() {
    if (googleClientIdCache !== null) {
        return googleClientIdCache;
    }

    const response = await fetch(API.googleClientId, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });

    const data = await readResponse(response);

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.detail ||
            "Unable to load Google Client ID from the server."
        );
    }

    googleClientIdCache = data.clientId || data.client_id || "";

    if (!googleClientIdCache) {
        throw new Error(
            "Google Client ID is missing. Configure GOOGLE_CLIENT_ID in your backend .env file."
        );
    }

    return googleClientIdCache;
}

// ==================================================
// 5. INITIALIZE GOOGLE SIGN-IN
// ==================================================

async function initGoogleSignIn() {
    if (googleInitialized) return;

    if (googleInitializationPromise) {
        return googleInitializationPromise;
    }

    googleInitializationPromise = (async () => {
        const clientId = await fetchGoogleClientId();

        await loadGoogleScript();

        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        const container = document.getElementById(
            "googleBtnContainer"
        );

        if (container) {
            container.innerHTML = "";

            google.accounts.id.renderButton(container, {
                theme: "outline",
                size: "large",
                width: 340,
                text: "continue_with",
                shape: "rectangular",
                logo_alignment: "left"
            });
        }

        // The backend accepts verified Google ID credentials, not OAuth access tokens.
        // The official rendered button above is the primary sign-in method.

        googleInitialized = true;

        const customButton = document.getElementById(
            "customGoogleBtn"
        );

        if (customButton && container) {
            // Prefer Google's official rendered button.
            // Keep the custom button available as a fallback.
            const hasGoogleButton =
                container.querySelector("iframe") ||
                container.children.length > 0;

            if (hasGoogleButton) {
                customButton.style.display = "none";
            }
        }

    })();

    try {
        await googleInitializationPromise;
    } catch (error) {
        console.error("Google initialization failed:", error);
        showError(error.message || "Google Sign-In initialization failed.");
    } finally {
        googleInitializationPromise = null;
    }
}

// ==================================================
// 6. CUSTOM CONTINUE WITH GOOGLE BUTTON
// ==================================================

async function triggerGoogleLogin(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    clearError();

    try {
        if (!googleInitialized) {
            await initGoogleSignIn();
        }

        if (!window.google?.accounts?.id) {
            throw new Error("Google Sign-In is not ready. Please refresh the page and try again.");
        }

        // Fallback flow returns an ID credential verified by the backend.
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed?.()) {
                showError("Google sign-in could not be displayed. Use the official Google button or check browser privacy settings.");
            }
        });
    } catch (error) {
        console.error("Google button error:", error);
        showError(error.message || "Unable to start Google Sign-In.");
    }
}

// Backward-compatible function name.
const googleLogin = triggerGoogleLogin;

// ==================================================
// 7. GOOGLE ACCESS TOKEN LOGIN
// ==================================================

async function handleGoogleAccessToken(accessToken) {
    clearError();

    try {
        const profileResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        const profile = await readResponse(profileResponse);

        if (!profileResponse.ok || !profile.email) {
            throw new Error(
                "Unable to retrieve your Google account information."
            );
        }

        // This request requires backend support for the googleUser format.
        const response = await fetch(API.googleLogin, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                googleUser: {
                    googleId: profile.sub,
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture
                }
            })
        });

        const result = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                result.message ||
                result.detail ||
                result.error ||
                "Google authentication failed."
            );
        }

        if (!result.token) {
            throw new Error(
                "Google authentication succeeded, but no token was returned."
            );
        }

        localStorage.setItem("token", result.token);

        if (result.user) {
            localStorage.setItem(
                "user",
                JSON.stringify(result.user)
            );
        }

        window.location.href = "/task-manager.html";

    } catch (error) {
        console.error("Google access-token login failed:", error);

        showError(
            error.message || "Google login failed. Please try again."
        );
    }
}

// ==================================================
// 8. GOOGLE ID CREDENTIAL LOGIN
// ==================================================

async function handleGoogleCredentialResponse(response) {
    clearError();

    if (!response || !response.credential) {
        showError("Google did not return a valid credential.");
        return;
    }

    try {
        const resultResponse = await fetch(API.googleLogin, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential: response.credential
            })
        });

        const result = await readResponse(resultResponse);

        if (!resultResponse.ok) {
            throw new Error(
                result.message ||
                result.detail ||
                result.error ||
                "Google authentication failed."
            );
        }

        if (!result.token) {
            throw new Error(
                "Google authentication succeeded, but no token was returned."
            );
        }

        localStorage.setItem("token", result.token);

        if (result.user) {
            localStorage.setItem(
                "user",
                JSON.stringify(result.user)
            );
        }

        window.location.href = "/task-manager.html";

    } catch (error) {
        console.error("Google credential login failed:", error);

        showError(
            error.message || "Google login failed. Please try again."
        );
    }
}

// ==================================================
// 9. FORGOT PASSWORD
// ==================================================

function forgotPassword(event) {
    if (event) event.preventDefault();

    alert(
        "Forgot password functionality has not been connected yet."
    );
}

// ==================================================
// 10. CHECK EXISTING LOGIN
// ==================================================

async function checkExistingLogin() {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
        const response = await fetch(API.me, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.ok) {
            window.location.replace("/task-manager.html");
            return;
        }

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } else {
            // Preserve the token if the server has a temporary error.
            console.warn(
                "Unable to validate existing login:",
                response.status
            );
        }

    } catch (error) {
        console.error("Authentication check failed:", error);
        // Do not delete a potentially valid token because the server
        // may simply be unavailable.
    }
}

// ==================================================
// 11. INITIALIZE LOGIN PAGE
// ==================================================

function startApp() {
    // Support forms that use onsubmit="loginUser(event)".
    const loginForm = document.getElementById("loginForm");

    if (loginForm && !loginForm.dataset.loginHandlerAttached) {
        loginForm.addEventListener("submit", loginUser);
        loginForm.dataset.loginHandlerAttached = "true";
    }

    // Support buttons using either inline onclick or this listener.
    const googleButton = document.getElementById("customGoogleBtn");

    if (googleButton && !googleButton.dataset.googleHandlerAttached) {
        googleButton.addEventListener("click", triggerGoogleLogin);
        googleButton.dataset.googleHandlerAttached = "true";
    }

    checkExistingLogin();
    initGoogleSignIn();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, {
        once: true
    });
} else {
    startApp();
}
