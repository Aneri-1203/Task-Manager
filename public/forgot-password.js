// ==================================================
// FORGOT-PASSWORD.JS
// ==================================================

async function handleForgotPassword(event) {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const submitBtn = document.getElementById("submitBtn");
    const errorBox = document.getElementById("forgotError");
    const successBox = document.getElementById("forgotSuccess");

    const email = emailInput.value.trim().toLowerCase();

    errorBox.style.display = "none";
    successBox.style.display = "none";
    errorBox.textContent = "";
    successBox.textContent = "";

    if (!email) {
        errorBox.textContent = "Please enter your email address.";
        errorBox.style.display = "block";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending link...';

    try {
        const response = await fetch("/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to process password reset request.");
        }

        successBox.textContent = data.message || "Password reset instructions have been sent to your email.";
        successBox.style.display = "block";
        emailInput.value = "";
    } catch (err) {
        console.error("Forgot password error:", err);
        errorBox.textContent = err.message || "Unable to send reset link. Please try again.";
        errorBox.style.display = "block";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Reset Link';
    }
}
