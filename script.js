const loginPage = document.getElementById("loginPage");
const mfaPage = document.getElementById("mfaPage");
const dashboardPage = document.getElementById("dashboardPage");
const adminPage = document.getElementById("adminPage");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const mfaCode = document.getElementById("mfaCode");
const verifyMfaBtn = document.getElementById("verifyMfaBtn");
const cancelMfaBtn = document.getElementById("cancelMfaBtn");
const mfaMessage = document.getElementById("mfaMessage");
const riskReason = document.getElementById("riskReason");

const emergencyBtn = document.getElementById("emergencyBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

let pendingLogin = null;

let sessions = [
    {
        id: 1,
        user: "demo@example.com",
        device: "Windows / Chrome",
        location: "Coimbatore",
        risk: 10,
        riskLevel: "LOW",
        status: "Active"
    },
    {
        id: 2,
        user: "alex@example.com",
        device: "Android / Chrome",
        location: "Chennai",
        risk: 45,
        riskLevel: "MEDIUM",
        status: "Active"
    },
    {
        id: 3,
        user: "user@example.com",
        device: "Unknown Device",
        location: "Unknown Location",
        risk: 85,
        riskLevel: "HIGH",
        status: "Active"
    }
];

let auditLogs = [
    {
        time: getTime(),
        text: "Security system initialized"
    }
];

function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function showPage(page) {
    loginPage.classList.remove("active");
    mfaPage.classList.remove("active");
    dashboardPage.classList.remove("active");
    adminPage.classList.remove("active");

    page.classList.add("active");
}

function addAuditLog(text) {
    auditLogs.unshift({
        time: getTime(),
        text: text
    });

    if (auditLogs.length > 20) {
        auditLogs.pop();
    }

    renderAuditLogs();
}

function renderAuditLogs() {
    const userAuditLog = document.getElementById("userAuditLog");
    const adminAuditLog = document.getElementById("adminAuditLog");

    const html = auditLogs
        .map(function(log) {
            return `
                <div class="audit-item">
                    <span class="audit-time">${log.time}</span>
                    ${escapeHtml(log.text)}
                </div>
            `;
        })
        .join("");

    userAuditLog.innerHTML = html;
    adminAuditLog.innerHTML = html;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function calculateRisk(newDevice, newLocation) {
    let score = 10;
    let reasons = [];

    if (newDevice) {
        score += 30;
        reasons.push("New device");
    }

    if (newLocation) {
        score += 30;
        reasons.push("New location");
    }

    const failedAttempts = Number(
        localStorage.getItem("failedAttempts") || 0
    );

    if (failedAttempts >= 3) {
        score += 20;
        reasons.push("Multiple failed attempts");
    }

    let riskLevel = "LOW";

    if (score >= 61) {
        riskLevel = "HIGH";
    } else if (score >= 31) {
        riskLevel = "MEDIUM";
    }

    return {
        score: score,
        level: riskLevel,
        reasons: reasons
    };
}

function updateUserDashboard(risk, device, location, authMethod) {
    document.getElementById("dashboardRisk").textContent = risk.level;
    document.getElementById("dashboardAuth").textContent = authMethod;
    document.getElementById("dashboardDevice").textContent = device;

    document.getElementById("sessionDevice").textContent = device;
    document.getElementById("sessionLocation").textContent = location;
    document.getElementById("sessionRisk").textContent = risk.score;
    document.getElementById("sessionAuth").textContent = authMethod;

    const riskElement = document.getElementById("dashboardRisk");

    riskElement.style.color =
        risk.level === "HIGH"
            ? "#c62828"
            : risk.level === "MEDIUM"
            ? "#b77900"
            : "#16803c";
}

function openUserDashboard(risk, device, location, authMethod) {
    updateUserDashboard(
        risk,
        device,
        location,
        authMethod
    );

    showPage(dashboardPage);
    renderAuditLogs();
}

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const newDevice = document.getElementById("newDevice").checked;
    const newLocation = document.getElementById("newLocation").checked;

    loginMessage.className = "message";

    if (!email || !password) {
        loginMessage.textContent = "Please enter email and password.";
        loginMessage.classList.add("error");
        return;
    }

    if (
        email === "admin@example.com" &&
        password === "admin123"
    ) {
        addAuditLog("Admin logged into the security dashboard.");
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        showPage(adminPage);
        renderAdminDashboard();
        return;
    }

    if (
        email !== "demo@example.com" ||
        password !== "demo123"
    ) {
        let failedAttempts = Number(
            localStorage.getItem("failedAttempts") || 0
        );

        failedAttempts++;

        localStorage.setItem(
            "failedAttempts",
            failedAttempts
        );

        loginMessage.textContent =
            "Invalid email or password.";

        loginMessage.classList.add("error");

        addAuditLog(
            "Failed login attempt for " + email
        );

        return;
    }

    localStorage.setItem("failedAttempts", "0");

    const risk = calculateRisk(
        newDevice,
        newLocation
    );

    let device = newDevice
        ? "New Device"
        : "Windows / Chrome";

    let location = newLocation
        ? "New Location"
        : "Coimbatore";

    pendingLogin = {
        email: email,
        risk: risk,
        device: device,
        location: location
    };

    if (risk.level === "HIGH") {

        riskReason.textContent =
            "Risk score " +
            risk.score +
            " detected due to " +
            (risk.reasons.length
                ? risk.reasons.join(", ")
                : "unusual login activity") +
            ".";

        addAuditLog(
            "High-risk login detected. Step-up MFA triggered."
        );

        showPage(mfaPage);

    } else if (risk.level === "MEDIUM") {

        riskReason.textContent =
            "Medium-risk login detected. Additional verification is required.";

        addAuditLog(
            "Medium-risk login detected. MFA requested."
        );

        showPage(mfaPage);

    } else {

        addAuditLog(
            "Successful low-risk login for " + email
        );

        openUserDashboard(
            risk,
            device,
            location,
            "Password Verified"
        );
    }
});

verifyMfaBtn.addEventListener("click", function() {

    const code = mfaCode.value.trim();

    mfaMessage.className = "message";

    if (!pendingLogin) {
        mfaMessage.textContent =
            "Login session expired. Please try again.";

        mfaMessage.classList.add("error");
        return;
    }

    if (!/^\d{6}$/.test(code)) {
        mfaMessage.textContent =
            "Enter a valid 6-digit code.";

        mfaMessage.classList.add("error");
        return;
    }

    if (code !== "123456") {
        mfaMessage.textContent =
            "Incorrect verification code.";

        mfaMessage.classList.add("error");

        addAuditLog(
            "Failed MFA verification attempt."
        );

        return;
    }

    addAuditLog(
        "MFA verification successful. Secure session created."
    );

    openUserDashboard(
        pendingLogin.risk,
        pendingLogin.device,
        pendingLogin.location,
        "Password + MFA"
    );

    mfaCode.value = "";
    pendingLogin = null;
});

cancelMfaBtn.addEventListener("click", function() {
    pendingLogin = null;
    mfaCode.value = "";
    mfaMessage.textContent = "";
    showPage(loginPage);
});

emergencyBtn.addEventListener("click", function() {

    const emergencyRisk = {
        score: 0,
        level: "EMERGENCY"
    };

    addAuditLog(
        "Emergency access activated with controlled permissions."
    );

    openUserDashboard(
        emergencyRisk,
        "Emergency Terminal",
        "Hospital Emergency Unit",
        "Emergency Access"
    );

    document.getElementById("dashboardRisk").textContent =
        "EMERGENCY";

    document.getElementById("dashboardRisk").style.color =
        "#c62828";
});

logoutBtn.addEventListener("click", function() {
    addAuditLog("User logged out.");
    pendingLogin = null;
    showPage(loginPage);
});

adminLogoutBtn.addEventListener("click", function() {
    addAuditLog("Admin logged out.");
    showPage(loginPage);
});

function renderAdminDashboard() {

    const total = sessions.length;

    const active = sessions.filter(function(session) {
        return session.status === "Active";
    }).length;

    const highRisk = sessions.filter(function(session) {
        return session.riskLevel === "HIGH" &&
               session.status === "Active";
    }).length;

    const revoked = sessions.filter(function(session) {
        return session.status === "Revoked";
    }).length;

    document.getElementById("totalSessions").textContent = total;
    document.getElementById("activeSessions").textContent = active;
    document.getElementById("highRiskSessions").textContent = highRisk;
    document.getElementById("revokedSessions").textContent = revoked;

    const tableBody =
        document.getElementById("sessionTableBody");

    tableBody.innerHTML = "";

    sessions.forEach(function(session) {

        const riskClass =
            session.riskLevel === "HIGH"
                ? "risk-high"
                : session.riskLevel === "MEDIUM"
                ? "risk-medium"
                : "risk-low";

        const statusClass =
            session.status === "Active"
                ? "session-active"
                : "session-revoked";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(session.user)}</td>
            <td>${escapeHtml(session.device)}</td>
            <td>${escapeHtml(session.location)}</td>
            <td class="${riskClass}">
                ${session.riskLevel} (${session.risk})
            </td>
            <td class="${statusClass}">
                ${session.status}
            </td>
            <td>
                <button
                    class="revoke-btn"
                    data-id="${session.id}"
                    ${session.status === "Revoked" ? "disabled" : ""}
                >
                    ${session.status === "Revoked" ? "Revoked" : "Revoke"}
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    document
        .querySelectorAll(".revoke-btn")
        .forEach(function(button) {

            button.addEventListener("click", function() {

                const id = Number(
                    button.getAttribute("data-id")
                );

                revokeSession(id);
            });
        });

    renderAuditLogs();
}

function revokeSession(id) {

    const session = sessions.find(function(item) {
        return item.id === id;
    });

    if (!session) {
        return;
    }

    if (session.status === "Revoked") {
        return;
    }

    session.status = "Revoked";

    addAuditLog(
        "Admin revoked session for " + session.user
    );

    renderAdminDashboard();
}

renderAuditLogs();