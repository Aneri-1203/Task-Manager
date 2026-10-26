// ==================================================
// SIGNUP.JS
// Task Management System
// ==================================================


// ==================================================
// Register User
// ==================================================

async function registerUser(event) {

    event.preventDefault();

    // ------------------------------------------
    // Get Form Elements
    // ------------------------------------------

    const usernameInput =
        document.getElementById("username");

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const signupButton =
        document.getElementById("signupButton");

    const errorBox =
        document.getElementById("signupError");

    const successBox =
        document.getElementById("signupSuccess");


    // ------------------------------------------
    // Get Values
    // ------------------------------------------

    const username =
        usernameInput.value.trim();

    const email =
        emailInput.value.trim().toLowerCase();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    // ------------------------------------------
    // Clear Previous Messages
    // ------------------------------------------

    errorBox.textContent = "";

    errorBox.style.display = "none";

    successBox.textContent = "";

    successBox.style.display = "none";


    // ------------------------------------------
    // Validate Username
    // ------------------------------------------

    if (username === "") {

        showSignupError(
            "Please enter a username."
        );

        usernameInput.focus();

        return;

    }


    if (username.length < 3) {

        showSignupError(
            "Username must contain at least 3 characters."
        );

        usernameInput.focus();

        return;

    }


    if (username.length > 30) {

        showSignupError(
            "Username cannot exceed 30 characters."
        );

        usernameInput.focus();

        return;

    }


    // ------------------------------------------
    // Validate Username Characters
    // ------------------------------------------

    const usernameRegex =
        /^[a-zA-Z0-9_]+$/;


    if (
        !usernameRegex.test(username)
    ) {

        showSignupError(
            "Username can contain only letters, numbers and underscore."
        );

        usernameInput.focus();

        return;

    }


    // ------------------------------------------
    // Validate Email
    // ------------------------------------------

    if (email === "") {

        showSignupError(
            "Please enter your email."
        );

        emailInput.focus();

        return;

    }


    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
        !emailRegex.test(email)
    ) {

        showSignupError(
            "Please enter a valid email address."
        );

        emailInput.focus();

        return;

    }


    // ------------------------------------------
    // Validate Password
    // ------------------------------------------

    if (password === "") {

        showSignupError(
            "Please create a password."
        );

        passwordInput.focus();

        return;

    }


    if (password.length < 6) {

        showSignupError(
            "Password must contain at least 6 characters."
        );

        passwordInput.focus();

        return;

    }


    // ------------------------------------------
    // Confirm Password
    // ------------------------------------------

    if (confirmPassword === "") {

        showSignupError(
            "Please confirm your password."
        );

        confirmPasswordInput.focus();

        return;

    }


    if (
        password !== confirmPassword
    ) {

        showSignupError(
            "Passwords do not match."
        );

        confirmPasswordInput.focus();

        return;

    }


    // ------------------------------------------
    // Disable Button
    // ------------------------------------------

    signupButton.disabled = true;

    signupButton.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Creating Account...

    `;


    const roleInput =
        document.getElementById("role");

    const role =
        roleInput ? roleInput.value : "user";

    try {

        // ------------------------------------------
        // Send Registration Request
        // ------------------------------------------

        const response =
            await fetch(
                "/auth/register",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                    },

                    body:
                        JSON.stringify({

                            username:
                                username,

                            email:
                                email,

                            password:
                                password,

                            role:
                                role,

                        }),

                }
            );


        // ------------------------------------------
        // Read API Response
        // ------------------------------------------

        const result =
            await response.json();


        console.log(
            "POST /auth/register response:",
            result
        );


        // ------------------------------------------
        // Handle API Error
        // ------------------------------------------

        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to create account."
            );

        }


        // ------------------------------------------
        // Make Sure Token Exists
        // ------------------------------------------

        if (!result.token) {

            throw new Error(
                "Account was created, but authentication token was not received."
            );

        }


        // ------------------------------------------
        // Store JWT
        // ------------------------------------------

        localStorage.setItem(
            "token",
            result.token
        );


        // ------------------------------------------
        // Store User Information
        // ------------------------------------------

        if (result.user) {

            localStorage.setItem(
                "user",
                JSON.stringify(
                    result.user
                )
            );

        }


        // ------------------------------------------
        // Show Success Message
        // ------------------------------------------

        successBox.textContent =
            result.message ||
            "Account created successfully.";

        successBox.style.display =
            "block";


        // ------------------------------------------
        // Update Button
        // ------------------------------------------

        signupButton.innerHTML = `

            <i class="fa-solid fa-check"></i>

            Account Created

        `;


        // ------------------------------------------
        // Redirect
        // ------------------------------------------

        setTimeout(
            () => {

                window.location.href =
                    "/task-manager.html";

            },
            1000
        );


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        // ------------------------------------------
        // Show Error
        // ------------------------------------------

        showSignupError(
            error.message ||
            "Unable to create account. Please try again."
        );


        // ------------------------------------------
        // Restore Button
        // ------------------------------------------

        signupButton.disabled =
            false;


        signupButton.innerHTML = `

            <i class="fa-solid fa-user-plus"></i>

            Create Account

        `;

    }

}


// ==================================================
// Show Signup Error
// ==================================================

function showSignupError(message) {

    const errorBox =
        document.getElementById(
            "signupError"
        );


    errorBox.textContent =
        message;


    errorBox.style.display =
        "block";

}


// ==================================================
// Toggle Password
// ==================================================

function toggleSignupPassword() {

    const passwordInput =
        document.getElementById(
            "password"
        );

    const passwordIcon =
        document.getElementById(
            "passwordIcon"
        );


    if (
        passwordInput.type ===
        "password"
    ) {

        passwordInput.type =
            "text";


        passwordIcon.classList.remove(
            "fa-eye"
        );


        passwordIcon.classList.add(
            "fa-eye-slash"
        );

    } else {

        passwordInput.type =
            "password";


        passwordIcon.classList.remove(
            "fa-eye-slash"
        );


        passwordIcon.classList.add(
            "fa-eye"
        );

    }

}


// ==================================================
// Toggle Confirm Password
// ==================================================

function toggleConfirmPassword() {

    const confirmPasswordInput =
        document.getElementById(
            "confirmPassword"
        );

    const confirmPasswordIcon =
        document.getElementById(
            "confirmPasswordIcon"
        );


    if (
        confirmPasswordInput.type ===
        "password"
    ) {

        confirmPasswordInput.type =
            "text";


        confirmPasswordIcon.classList.remove(
            "fa-eye"
        );


        confirmPasswordIcon.classList.add(
            "fa-eye-slash"
        );

    } else {

        confirmPasswordInput.type =
            "password";


        confirmPasswordIcon.classList.remove(
            "fa-eye-slash"
        );


        confirmPasswordIcon.classList.add(
            "fa-eye"
        );

    }

}


// ==================================================
// Google Identity Services Integration
// ==================================================

let googleClientIdCache = null;

async function fetchGoogleClientId() {
    if (googleClientIdCache !== null) return googleClientIdCache;
    try {
        const res = await fetch("/auth/google/client-id");
        const data = await res.json();
        googleClientIdCache = data.clientId || "";
        return googleClientIdCache;
    } catch (e) {
        console.error("Failed to fetch Google Client ID:", e);
        return "";
    }
}

async function initGoogleSignUp() {
    const clientId = await fetchGoogleClientId();
    if (!clientId) return;

    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            const container = document.getElementById("googleBtnContainer");
            if (container) {
                container.innerHTML = "";
                google.accounts.id.renderButton(container, {
                    theme: "outline",
                    size: "large",
                    width: 340,
                    text: "signup_with",
                    shape: "rectangular",
                    logo_alignment: "left",
                });
                setTimeout(() => {
                    const customBtn = document.getElementById("customGoogleBtn");
                    if (container.children.length > 0 && customBtn) {
                        customBtn.style.display = "none";
                    }
                }, 300);
            }
        } catch (e) {
            console.error("Google accounts init error:", e);
        }
    } else {
        setTimeout(initGoogleSignUp, 300);
    }
}

async function googleSignup() {
    const clientId = await fetchGoogleClientId();

    if (!clientId) {
        alert(
            "Google Sign-In is not configured yet.\n\nPlease add your GOOGLE_CLIENT_ID in the .env file and restart the server."
        );
        return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        alert("Google Sign-In library is loading. Please try again in a moment.");
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
        });

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log("GIS Prompt status:", notification.getNotDisplayedReason?.() || notification.getSkippedReason?.());
            }
        });
    } catch (err) {
        console.error("Google signup prompt error:", err);
        showSignupError("Unable to initialize Google Sign-In.");
    }
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
        showSignupError("Google authentication failed. No credentials received.");
        return;
    }

    try {
        const res = await fetch("/auth/google", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                credential: response.credential,
            }),
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || "Google registration failed.");
        }

        if (!result.token) {
            throw new Error("Registration succeeded but token was missing.");
        }

        localStorage.setItem("token", result.token);
        if (result.user) {
            localStorage.setItem("user", JSON.stringify(result.user));
        }

        window.location.href = "/task-manager.html";
    } catch (err) {
        console.error("Google backend verification error:", err);
        showSignupError(err.message || "Google registration failed.");
    }
}



// ==================================================
// Check Existing Authentication
// ==================================================

async function checkExistingLogin() {

    const token =
        localStorage.getItem(
            "token"
        );


    // ------------------------------------------
    // No Token
    // ------------------------------------------

    if (!token) {

        return;

    }


    try {

        // ------------------------------------------
        // Verify Token
        // ------------------------------------------

        const response =
            await fetch(
                "/auth/me",
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                    },

                }
            );


        // ------------------------------------------
        // Already Logged In
        // ------------------------------------------

        if (response.ok) {

            window.location.href =
                "/task-manager.html";

            return;

        }


        // ------------------------------------------
        // Invalid / Expired Token
        // ------------------------------------------

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

    } catch (error) {

        console.error(
            "Authentication check error:",
            error
        );

    }

}


// ==================================================
// Password Match Indicator
// ==================================================

function checkPasswordMatch() {

    const password =
        document.getElementById(
            "password"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;


    const confirmInput =
        document.getElementById(
            "confirmPassword"
        );


    if (
        confirmPassword === ""
    ) {

        confirmInput.style.borderColor =
            "";

        return;

    }


    if (
        password === confirmPassword
    ) {

        confirmInput.style.borderColor =
            "green";

    } else {

        confirmInput.style.borderColor =
            "red";

    }

}


// ==================================================
// Page Load
// ==================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        checkExistingLogin();
        setTimeout(initGoogleSignUp, 500);

        const passwordInput =
            document.getElementById(
                "password"
            );



        const confirmPasswordInput =
            document.getElementById(
                "confirmPassword"
            );


        if (passwordInput) {

            passwordInput.addEventListener(
                "input",
                checkPasswordMatch
            );

        }


        if (confirmPasswordInput) {

            confirmPasswordInput.addEventListener(
                "input",
                checkPasswordMatch
            );

        }

    }
);