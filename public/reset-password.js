// ==================================================
// RESET-PASSWORD.JS
// ==================================================

function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function togglePassVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const token = getUrlParameter("token");
    const tokenInput = document.getElementById("resetToken");
    const errorBox = document.getElementById("resetError");
    const resetBtn = document.getElementById("resetBtn");

    if (!token) {
        errorBox.textContent = "Invalid or missing password reset token. Please request a new link.";
        errorBox.style.display = "block";
        if (resetBtn) resetBtn.disabled = true;
    } else {
        tokenInput.value = token;
    }
});

async function handleResetPassword(event) {
    event.preventDefault();

    const token = document.getElementById("resetToken").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const resetBtn = document.getElementById("resetBtn");
    const errorBox = document.getElementById("resetError");
    const successBox = document.getElementById("resetSuccess");

    errorBox.style.display = "none";
    successBox.style.display = "none";

    if (!token) {
        errorBox.textContent = "Reset token is missing. Please use the link sent to your email.";
        errorBox.style.display = "block";
        return;
    }

    if (newPassword.length < 6) {
        errorBox.textContent = "Password must be at least 6 characters long.";
        errorBox.style.display = "block";
        return;
    }

    if (newPassword !== confirmPassword) {
        errorBox.textContent = "Passwords do not match. Please re-enter.";
        errorBox.style.display = "block";
        return;
    }

    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting password...';

    try {
        const response = await fetch("/auth/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token,
                password: newPassword,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to reset password.");
        }

        successBox.textContent = data.message || "Password reset successful! Redirecting to login...";
        successBox.style.display = "block";

        setTimeout(() => {
            window.location.href = "/login.html";
        }, 2000);
    } catch (err) {
        console.error("Reset password error:", err);
        errorBox.textContent = err.message || "An error occurred while resetting password.";
        errorBox.style.display = "block";
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Password';
    }
}
