const firebaseConfig = {
  apiKey: "AIzaSyA2XzMogtbxIOf1IGF_3ufb8BWryr8xSek",
  authDomain: "monitoring-ci-e12ca.firebaseapp.com",
  projectId: "monitoring-ci-e12ca",
  storageBucket: "monitoring-ci-e12ca.firebasestorage.app",
  messagingSenderId: "884090638769",
  appId: "1:884090638769:web:ebba5e7dd5812b2d512d90"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================================
// 1. DATA MASTER & HAK AKSES ROLE
// ==========================================
const ALL_ROLES = [
  "PIC",
  "FASILITATOR",
  "MANAGER",
  "CI_TEAM",
  "FINANCE",
  "MGR_RISK",
];

// Role yang boleh mengakses All Projects Registry (Semua KECUALI PIC)
const REGISTRY_ROLES = [
  "FASILITATOR",
  "MANAGER",
  "CI_TEAM",
  "FINANCE",
  "MGR_RISK",
];

const menu = [
  ["dashboard", "▣", "Summary Improvement", ["CI_TEAM", "MGR_RISK"]], // <-- UBAH DARI ALL_ROLES MENJADI INI
  [
    "registration",
    "＋",
    "Project Registration",
    ["CI_TEAM", "PIC", "FASILITATOR"],
  ],
  ["myprojects", "▤", "My Workspace", ALL_ROLES],
  ["allprojects", "▦", "All Projects Registry", REGISTRY_ROLES],
  ["deliverables", "◫", "Project Deliverables", ALL_ROLES],
  ["verification", "✓", "CI Verification & Review", ["CI_TEAM"]],
];

let currentUserRole = "CI_TEAM";
let currentPage = "dashboard";
let currentOverviewCategory = "ALL";
let selectedVerifRegNo = "";

// Target per departemen default
const defaultDeptTargets = {
  "Risk & Compliance": { team: 4, indiv: 6 },
  "Product & Quality Development": { team: 5, indiv: 10 },
  PPIC: { team: 8, indiv: 12 },
  Operational: { team: 15, indiv: 30 },
  "Information Technology": { team: 4, indiv: 6 },
  "Human Capital & General Service": { team: 4, indiv: 8 },
  "Financial Directorate": { team: 3, indiv: 7 },
  "Commercial Directorate": { team: 3, indiv: 5 },
  Engineering: { team: 6, indiv: 6 },
  Maintenance: { team: 4, indiv: 4 },
};

let deptTargets =
  JSON.parse(localStorage.getItem("binnovate_dept_targets")) ||
  defaultDeptTargets;

const defaultFinancialTargets = {
  qccTarget: 350000000,
  ssTarget: 150000000,
};

let financialTargets =
  JSON.parse(localStorage.getItem("binnovate_financial_targets")) ||
  defaultFinancialTargets;

const initialProjectsData = [
  {
    regNo: "OPS/2026/001",
    regDate: "2026-08-01",
    title: "Pengurangan Downtime Mesin Line Machining",
    dept: "Operational",
    section: "Line 2 Machining",
    owner: "PIC / Team Leader",
    contact: "081234567890",
    teamName: "QCC Sejahtera",
    teamMembers: "Bambang, Joko, Rian",
    method: "QCC",
    category: "Cost Reduction",
    problemStatement:
      "Tingginya downtime pada mesin line machining yang mencapai 120 menit/bulan akibat seringnya kendala penggantian pisau tooling.",
    improvementTarget:
      "Menurunkan downtime mesin machining hingga di bawah 70 menit/bulan dan menghemat biaya operasional.",
    costSavingVal: 45000000,
    costInvestmentVal: 5000000,
    costSaving: "Rp 45.000.000",
    status: "Pending",
    currentStep: 2,
    progress: 25,
    deadline: "25 Aug 2026",
    deliverableFile: "Laporan_A3_Downtime_OPS.pdf",
    finalTitle: "Optimalisasi Setup & Changeover Tooling Mesin MC-02",
    actualResult: "Downtime turun menjadi 65 mnt/bln",
  },
  {
    regNo: "ENG/2026/001",
    title: "Optimasi Konsumsi Energi Kompresor Plant",
    dept: "Engineering",
    section: "Utility & Powerhouse",
    owner: "Department Manager",
    contact: "081987654321",
    teamName: "Six Sigma Energy",
    teamMembers: "Asep, Dedi",
    method: "Six Sigma (DMAIC)",
    category: "Energy / Environmental",
    problemStatement:
      "Beban listrik kompresor sentral plant berlebih saat jam beban puncak operasional.",
    improvementTarget:
      "Efisiensi daya konsumsi listrik kompresor sebesar 15% per bulan.",
    costSavingVal: 80000000,
    costInvestmentVal: 10000000,
    costSaving: "Rp 80.000.000",
    status: "Pending",
    currentStep: 3,
    progress: 45,
    deadline: "10 Sep 2026",
    deliverableFile: "DMAIC_Energy_Plant_2026.pdf",
    finalTitle: "-",
    actualResult: "-",
  },
];

let projectList =
  JSON.parse(localStorage.getItem("binnovate_master_projects")) ||
  initialProjectsData;

function persistProjects() {
  localStorage.setItem(
    "binnovate_master_projects",
    JSON.stringify(projectList),
  );
}

const approvalSteps = [
  "PIC / Ketua Team",
  "Fasilitator",
  "Manager Dept",
  "CI Team",
  "Finance",
  "Manager Risk & Comp",
];

function isTeamMethod(method) {
  if (!method) return false;
  const m = method.toUpperCase();
  return (
    m.includes("QCC") ||
    m.includes("QCP") ||
    m.includes("QAC") ||
    m.includes("SIX SIGMA")
  );
}

function statusClass(s) {
  return s === "Completed" ? "green" : s === "Pending" ? "yellow" : "blue";
}

// ==========================================
// 2. NAVIGASI, ROLE SWITCHER & NOTIFIKASI
// ==========================================
function renderNav() {
  const navContainer = document.getElementById("nav");
  if (!navContainer) return;

  const accessibleMenus = menu.filter((m) => m[3].includes(currentUserRole));
  navContainer.innerHTML = accessibleMenus
    .map(
      (x) => `
    <button onclick="showPage('${x[0]}')" data-page="${x[0]}" id="nav-${x[0]}">
      ${x[1]} <span>${x[2]}</span>
    </button>
  `,
    )
    .join("");
}

function updateNotificationCount() {
  const notifEl = document.getElementById("notifBadgeCount");
  if (!notifEl) return;

  let pendingTasks = 0;
  if (currentUserRole === "PIC") {
    pendingTasks = projectList.filter((p) => p.status !== "Completed").length;
  } else if (currentUserRole === "FASILITATOR") {
    pendingTasks = projectList.filter(
      (p) => p.currentStep === 2 && p.status !== "Completed",
    ).length;
  } else if (currentUserRole === "MANAGER") {
    pendingTasks = projectList.filter(
      (p) => p.currentStep === 3 && p.status !== "Completed",
    ).length;
  } else if (currentUserRole === "CI_TEAM") {
    pendingTasks = projectList.filter(
      (p) => p.currentStep === 4 && p.status !== "Completed",
    ).length;
  } else if (currentUserRole === "FINANCE") {
    pendingTasks = projectList.filter(
      (p) => p.currentStep === 5 && p.status !== "Completed",
    ).length;
  } else if (currentUserRole === "MGR_RISK") {
    pendingTasks = projectList.filter(
      (p) => p.currentStep === 6 && p.status !== "Completed",
    ).length;
  }

  notifEl.innerText = pendingTasks;
  notifEl.style.display = pendingTasks > 0 ? "inline-block" : "none";
}

function switchUserRole(newRole) {
  currentUserRole = newRole;

  const roleSelector = document.getElementById("roleSelector");
  if (roleSelector) roleSelector.value = newRole;

  const nameLabel = document.getElementById("currentRoleLabel");
  const deptLabel = document.getElementById("currentRoleDept");

  if (newRole === "PIC") {
    if (nameLabel) nameLabel.innerText = "PIC / Team Leader";
    if (deptLabel) deptLabel.innerText = "Leader / PIC (Operational)";
  } else if (newRole === "FASILITATOR") {
    if (nameLabel) nameLabel.innerText = "Fasilitator Lapangan";
    if (deptLabel) deptLabel.innerText = "Fasilitator (Operational)";
  } else if (newRole === "MANAGER") {
    if (nameLabel) nameLabel.innerText = "Department Manager";
    if (deptLabel) deptLabel.innerText = "Manager Dept (Operational)";
  } else if (newRole === "CI_TEAM") {
    if (nameLabel) nameLabel.innerText = "CI Administrator";
    if (deptLabel) deptLabel.innerText = "CI Team (Super Admin)";
  } else if (newRole === "FINANCE") {
    if (nameLabel) nameLabel.innerText = "Finance Verifier";
    if (deptLabel) deptLabel.innerText = "Finance Directorate";
  } else if (newRole === "MGR_RISK") {
    if (nameLabel) nameLabel.innerText = "Risk & Compliance Head";
    if (deptLabel) deptLabel.innerText = "Manager Risk & Compliance";
  }

  const btnManageKpi = document.getElementById("btnManageKpi");
  if (btnManageKpi) {
    btnManageKpi.style.display =
      newRole === "CI_TEAM" ? "inline-block" : "none";
  }

  const btnRegisterNew = document.getElementById("btnRegisterNew");
  if (btnRegisterNew) {
    const canRegister = ["PIC", "FASILITATOR", "CI_TEAM"].includes(newRole);
    btnRegisterNew.style.display = canRegister ? "inline-block" : "none";
  }

  const widgetCIQueue = document.getElementById("widgetCIQueue");
  if (widgetCIQueue) {
    widgetCIQueue.style.display = newRole === "CI_TEAM" ? "block" : "none";
  }

  renderNav();
  setupRegistrationFormRole();
  renderParticipation();
  renderTables();
  updateNotificationCount();

  if (currentPage === "deliverables") {
    setupDeliverablesPage();
  } else if (currentPage === "allprojects") {
    if (currentUserRole === "PIC") {
      showPage("dashboard");
    } else {
      const approvedForRegistry = projectList.filter(
        (p) => p.currentStep > 2 || p.status === "Completed",
      );
      renderAllTable(approvedForRegistry);
    }
  } else if (currentPage === "verification") {
    setupVerificationPage();
  } else {
    showPage("dashboard");
  }
}

function showPage(id) {
  let targetId = id;
  if (id === "register") targetId = "registration";
  if (id === "workspace") targetId = "myprojects";
  if (id === "overview") targetId = "dashboard";

  if (targetId === "allprojects" && currentUserRole === "PIC") {
    targetId = "dashboard";
  }

  if (targetId === "verification" && currentUserRole !== "CI_TEAM") {
    targetId = "dashboard";
  }

  // --- SISIPKAN VALIDASI INI DI SINI ---
  if (
    targetId === "dashboard" &&
    currentUserRole !== "CI_TEAM" &&
    currentUserRole !== "MGR_RISK"
  ) {
    targetId = "myprojects"; // Dialihkan otomatis ke workspace jika role lain mencoba mengakses
  }
  // ------------------------------------

  currentPage = targetId;

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav button, #nav button").forEach((b) => {
    const btnPage = b.getAttribute("data-page");
    b.classList.toggle("active", btnPage === id || btnPage === targetId);
  });

  const item = menu.find((x) => x[0] === id || x[0] === targetId);
  const pageTitleEl = document.getElementById("pageTitle");
  if (pageTitleEl) {
    pageTitleEl.textContent = item ? item[2] : "Dashboard Overview";
  }

  if (targetId === "dashboard") {
    renderParticipation();
    renderTables();
  } else if (targetId === "myprojects") {
    renderTables();
  } else if (targetId === "allprojects") {
    const approvedForRegistry = projectList.filter(
      (p) => p.currentStep > 2 || p.status === "Completed",
    );
    renderAllTable(approvedForRegistry);
  } else if (targetId === "deliverables") {
    setupDeliverablesPage();
  } else if (targetId === "registration") {
    setupRegistrationFormRole();
  } else if (targetId === "verification") {
    setupVerificationPage();
  }

  updateNotificationCount();
  window.scrollTo(0, 0);
}

// ==========================================
// 3. MENU 1: SUMMARY IMPROVEMENT & SPEEDOMETER
// ==========================================
function renderParticipation() {
  const deptNames = Object.keys(deptTargets);
  let totalTarget = 0,
    totalActual = 0,
    totalClosed = 0;

  const summaryData = deptNames.map((dept) => {
    let target = 0;
    if (currentOverviewCategory === "TEAM") {
      target = deptTargets[dept].team;
    } else if (currentOverviewCategory === "INDIVIDUAL") {
      target = deptTargets[dept].indiv;
    } else {
      target = deptTargets[dept].team + deptTargets[dept].indiv;
    }

    const deptProjects = projectList.filter((p) => {
      if (p.dept !== dept) return false;
      if (currentOverviewCategory === "TEAM") return isTeamMethod(p.method);
      if (currentOverviewCategory === "INDIVIDUAL")
        return !isTeamMethod(p.method);
      return true;
    });

    const actual = deptProjects.length;
    const closed = deptProjects.filter((p) => p.status === "Completed").length;

    totalTarget += target;
    totalActual += actual;
    totalClosed += closed;
    return { dept, target, actual, closed };
  });

  const targetTotalEl = document.getElementById("targetTotal");
  if (targetTotalEl) targetTotalEl.textContent = totalTarget;

  const actualTotalEl = document.getElementById("actualTotal");
  if (actualTotalEl) actualTotalEl.textContent = totalActual;

  const closedTotalEl = document.getElementById("closedTotal");
  if (closedTotalEl) closedTotalEl.textContent = totalClosed;

  const achievement = totalTarget
    ? Math.round((totalActual / totalTarget) * 100)
    : 0;
  const overallAchEl = document.getElementById("overallAchievement");
  if (overallAchEl) overallAchEl.textContent = achievement + "%";

  const overallAchBar = document.getElementById("overallAchievementBar");
  if (overallAchBar)
    overallAchBar.style.width = Math.min(100, achievement) + "%";

  let qccSaving = 0;
  let ssSaving = 0;

  projectList.forEach((p) => {
    const val = Number(p.costSavingVal) || 0;
    if (isTeamMethod(p.method)) {
      qccSaving += val;
    } else {
      ssSaving += val;
    }
  });

  const totalSaving = qccSaving + ssSaving;

  const qccEl = document.getElementById("qccSavingDisplay");
  if (qccEl) qccEl.innerText = "Rp " + qccSaving.toLocaleString("id-ID");

  const ssEl = document.getElementById("ssSavingDisplay");
  if (ssEl) ssEl.innerText = "Rp " + ssSaving.toLocaleString("id-ID");

  const totalEl = document.getElementById("totalSavingDisplay");
  if (totalEl) totalEl.innerText = "Rp " + totalSaving.toLocaleString("id-ID");

  const targetQccLabel = document.getElementById("targetQccLabel");
  if (targetQccLabel)
    targetQccLabel.innerText =
      "Rp " + financialTargets.qccTarget.toLocaleString("id-ID");

  const targetSsLabel = document.getElementById("targetSsLabel");
  if (targetSsLabel)
    targetSsLabel.innerText =
      "Rp " + financialTargets.ssTarget.toLocaleString("id-ID");

  const percentQcc = Math.min(
    100,
    Math.round((qccSaving / (financialTargets.qccTarget || 1)) * 100),
  );
  const gaugePercentQcc = document.getElementById("gaugePercentQcc");
  if (gaugePercentQcc) gaugePercentQcc.innerText = `${percentQcc}% dari Target`;

  const needleAngleQcc = -90 + (percentQcc / 100) * 180;
  const needleQcc = document.getElementById("gaugeNeedleQcc");
  if (needleQcc)
    needleQcc.style.transform = `translateX(-50%) rotate(${needleAngleQcc}deg)`;

  const arcQcc = document.getElementById("gaugeArcQcc");
  if (arcQcc)
    arcQcc.style.strokeDashoffset = 251.32 - (percentQcc / 100) * 251.32;

  const percentSs = Math.min(
    100,
    Math.round((ssSaving / (financialTargets.ssTarget || 1)) * 100),
  );
  const gaugePercentSs = document.getElementById("gaugePercentSs");
  if (gaugePercentSs) gaugePercentSs.innerText = `${percentSs}% dari Target`;

  const needleAngleSs = -90 + (percentSs / 100) * 180;
  const needleSs = document.getElementById("gaugeNeedleSs");
  if (needleSs)
    needleSs.style.transform = `translateX(-50%) rotate(${needleAngleSs}deg)`;

  const arcSs = document.getElementById("gaugeArcSs");
  if (arcSs) arcSs.style.strokeDashoffset = 251.32 - (percentSs / 100) * 251.32;

  const maxVal = Math.max(
    ...summaryData.flatMap((d) => [d.target, d.actual, d.closed]),
    10,
  );
  const compareChartEl = document.getElementById("compareChart");
  if (compareChartEl) {
    compareChartEl.innerHTML = summaryData
      .map(
        (d) => `
      <div class="group">
        <div class="vbar v-target" style="height:${(d.target / maxVal) * 200}px"><span>${d.target}</span></div>
        <div class="vbar v-actual" style="height:${(d.actual / maxVal) * 200}px"><span>${d.actual}</span></div>
        <div class="vbar v-closed" style="height:${(d.closed / maxVal) * 200}px"><span>${d.closed}</span></div>
        <div class="group-label">${d.dept}</div>
      </div>
    `,
      )
      .join("");
  }

  const catLabel =
    currentOverviewCategory === "TEAM"
      ? "Kelompok (QCC/QCP/Six Sigma)"
      : currentOverviewCategory === "INDIVIDUAL"
        ? "Individu (SS / Kaizen)"
        : "Seluruh Inovasi";

  const kpiInsightEl = document.getElementById("kpiInsight");
  if (kpiInsightEl) {
    kpiInsightEl.innerHTML = `Pencapaian kategori <b>${catLabel}</b> seluruh divisi tercatat <b>${achievement}%</b> (${totalActual}/${totalTarget} tema). Sebanyak <b>${totalClosed}</b> tema telah Closed.`;
  }
}

function openKpiModal() {
  const container = document.getElementById("kpiInputsList");
  if (!container) return;

  let html = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
      <label style="font-size: 13px; font-weight: 800; color: #166534; display: block; margin-bottom: 8px;">
        🎯 Kelola Target Finansial Speedometer (Tahunan)
      </label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <span style="font-size: 11px; font-weight: 600; color: #166534;">Target Saving QCC / Kelompok (Rp)</span>
          <input type="number" id="inputTargetQcc" value="${financialTargets.qccTarget}" style="width: 100%; padding: 6px 8px; border: 1px solid #86efac; border-radius: 4px; box-sizing: border-box;" />
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 600; color: #0369a1;">Target Saving SS / Individu (Rp)</span>
          <input type="number" id="inputTargetSs" value="${financialTargets.ssTarget}" style="width: 100%; padding: 6px 8px; border: 1px solid #7dd3fc; border-radius: 4px; box-sizing: border-box;" />
        </div>
      </div>
    </div>
    <div style="font-size: 12px; font-weight: 700; color: #475569; margin: 10px 0 6px 0;">Target Jumlah Tema per Departemen:</div>
  `;

  html += Object.keys(deptTargets)
    .map((dept) => {
      const cleanKey = dept.replace(/[^a-zA-Z0-9]/g, "");
      return `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #fafafa; margin-bottom: 8px;">
        <label style="font-size: 13px; font-weight: 700; display: block; margin-bottom: 6px;">${dept}</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <span style="font-size: 11px; color: #64748b;">👥 Target Kelompok (QCC/Six Sigma)</span>
            <input type="number" id="kpi-team-${cleanKey}" value="${deptTargets[dept].team}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;" />
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b;">👤 Target Individu (SS/Kaizen)</span>
            <input type="number" id="kpi-indiv-${cleanKey}" value="${deptTargets[dept].indiv}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box;" />
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
  const modal = document.getElementById("kpiModal");
  if (modal) modal.style.display = "flex";
}

function closeKpiModal() {
  const modal = document.getElementById("kpiModal");
  if (modal) modal.style.display = "none";
}

function saveKpiTargets() {
  const qccInput = document.getElementById("inputTargetQcc");
  const ssInput = document.getElementById("inputTargetSs");
  if (qccInput && ssInput) {
    financialTargets.qccTarget = parseInt(qccInput.value) || 0;
    financialTargets.ssTarget = parseInt(ssInput.value) || 0;
  }

  Object.keys(deptTargets).forEach((dept) => {
    const cleanKey = dept.replace(/[^a-zA-Z0-9]/g, "");
    const inputTeam = document.getElementById(`kpi-team-${cleanKey}`);
    const inputIndiv = document.getElementById(`kpi-indiv-${cleanKey}`);
    if (inputTeam && inputIndiv) {
      deptTargets[dept].team = parseInt(inputTeam.value) || 0;
      deptTargets[dept].indiv = parseInt(inputIndiv.value) || 0;
    }
  });

  localStorage.setItem(
    "binnovate_financial_targets",
    JSON.stringify(financialTargets),
  );
  localStorage.setItem("binnovate_dept_targets", JSON.stringify(deptTargets));

  renderParticipation();
  closeKpiModal();
  alert(
    "Target Finansial Speedometer & KPI Departemen berhasil diperbarui untuk seluruh akun!",
  );
}

function filterOverviewCategory(cat) {
  currentOverviewCategory = cat;

  const tabAll = document.getElementById("tabCatAll");
  const tabTeam = document.getElementById("tabCatTeam");
  const tabIndiv = document.getElementById("tabCatIndiv");

  if (tabAll) {
    tabAll.style.background = cat === "ALL" ? "#fff" : "transparent";
    tabAll.style.fontWeight = cat === "ALL" ? "600" : "normal";
    tabAll.style.boxShadow =
      cat === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
  }
  if (tabTeam) {
    tabTeam.style.background = cat === "TEAM" ? "#fff" : "transparent";
    tabTeam.style.fontWeight = cat === "TEAM" ? "600" : "normal";
    tabTeam.style.boxShadow =
      cat === "TEAM" ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
  }
  if (tabIndiv) {
    tabIndiv.style.background = cat === "INDIVIDUAL" ? "#fff" : "transparent";
    tabIndiv.style.fontWeight = cat === "INDIVIDUAL" ? "600" : "normal";
    tabIndiv.style.boxShadow =
      cat === "INDIVIDUAL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none";
  }

  renderParticipation();
}

// ==========================================
// 4. MENU 2: PROJECT REGISTRATION
// ==========================================
function setupRegistrationFormRole() {
  const divisionSelect = document.getElementById("division");
  const ownerInput = document.getElementById("projectOwner");
  const contactInput = document.getElementById("picContact");
  const roleBadge = document.getElementById("regRoleBadge");

  if (!divisionSelect || !ownerInput || !contactInput) return;

  divisionSelect.disabled = false;
  divisionSelect.style.background = "#fff";
  divisionSelect.style.cursor = "pointer";

  // Set placeholder standar untuk seluruh role
  ownerInput.placeholder = "Name of project owner";
  contactInput.placeholder = "Contoh: 081234567890";

  if (currentUserRole === "PIC") {
    if (!divisionSelect.value) divisionSelect.value = "Operational";
    ownerInput.value = ""; // Dikosongkan agar menjadi placeholder abu-abu
    contactInput.value = ""; // Dikosongkan agar menjadi placeholder abu-abu

    if (roleBadge) {
      roleBadge.innerText = "Mode: PIC Submission";
      roleBadge.style.background = "#e0f2fe";
      roleBadge.style.color = "#0369a1";
    }
  } else if (currentUserRole === "CI_TEAM") {
    ownerInput.readOnly = false;
    ownerInput.value = "";
    contactInput.value = "";
    if (roleBadge) {
      roleBadge.innerText = "Mode: Super Admin (Full Control / Proxy Entry)";
      roleBadge.style.background = "#fef3c7";
      roleBadge.style.color = "#92400e";
    }
  } else {
    ownerInput.value = "";
    contactInput.value = "";
    if (roleBadge) {
      roleBadge.innerText = `Mode: ${currentUserRole} Entry`;
      roleBadge.style.background = "#f1f5f9";
      roleBadge.style.color = "#475569";
    }
  }

  updateAutoRegNo();
}

function updateAutoRegNo() {
  const divisionSelect = document.getElementById("division");
  const regNoInput = document.getElementById("regNo");
  if (!divisionSelect || !regNoInput) return;

  const dept = divisionSelect.value || "Operational";
  const year = new Date().getFullYear();

  const deptCodes = {
    Operational: "OPS",
    "Product & Quality Development": "PQD",
    PPIC: "PPIC",
    "Information Technology": "IT",
    "Human Capital & General Service": "HCGS",
    "Financial Directorate": "FIN",
    "Commercial Directorate": "COM",
    Engineering: "ENG",
    Maintenance: "MTN",
    "Risk & Compliance": "RNC",
  };

  const code = deptCodes[dept] || "CI";
  const countSameDept = projectList.filter((p) => p.dept === dept).length + 1;
  const seq = String(countSameDept).padStart(3, "0");

  regNoInput.value = `${code}/${year}/${seq}`;
}

function renderMemberInputs() {
  const countSelect = document.getElementById("memberCount");
  const container = document.getElementById("memberInputsContainer");
  const grid = document.getElementById("memberInputsGrid");

  if (!countSelect || !container || !grid) return;

  const count = parseInt(countSelect.value) || 0;

  if (count === 0) {
    container.style.display = "none";
    grid.innerHTML = "";
    return;
  }

  container.style.display = "block";
  let html = "";
  for (let i = 1; i <= count; i++) {
    html += `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 12px; font-weight: 600; color: #475569;">Anggota ${i} *</label>
        <input 
          type="text" 
          class="member-name-input" 
          placeholder="Nama Lengkap Anggota ${i}" 
          style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 13px; box-sizing: border-box;" 
        />
      </div>
    `;
  }
  grid.innerHTML = html;
}

function submitRegistration() {
  const divisionEl = document.getElementById("division");
  const dept = divisionEl ? divisionEl.value : "";
  const regNo = document.getElementById("regNo")?.value || "";
  const regDateVal =
    document.getElementById("regDate")?.value ||
    new Date().toISOString().slice(0, 10);
  const section = document.getElementById("section")?.value || "";
  const method = document.getElementById("ciMethod")?.value || "";
  const title = document.getElementById("projectTitle")?.value || "";
  const category = document.getElementById("projectCategory")?.value || "";
  const owner = document.getElementById("projectOwner")?.value || "";
  const contact = document.getElementById("picContact")?.value || "";
  const teamNameEl = document.getElementById("teamName");
  const teamName = teamNameEl ? teamNameEl.value : "-";

  const memberInputs = document.querySelectorAll(".member-name-input");
  const memberNames = Array.from(memberInputs)
    .map((input) => input.value.trim())
    .filter((name) => name !== "");

  const memberCountSelect = document.getElementById("memberCount");
  const memberCountSelected = memberCountSelect
    ? parseInt(memberCountSelect.value) || 0
    : 0;

  const problem = document.getElementById("problemStatement")?.value || "";
  const target = document.getElementById("improvementTarget")?.value || "";
  const costVal = document.getElementById("costSaving")?.value || 0;
  const investVal = document.getElementById("costInvestment")?.value || 0;
  const deadline = document.getElementById("targetDate")?.value || "";

  if (!dept || !title || !owner || !contact || !method) {
    alert("Mohon lengkapi field wajib bertanda bintang (*).");
    return;
  }

  if (memberCountSelected > 0 && memberNames.length < memberCountSelected) {
    alert("Mohon lengkapi seluruh nama anggota tim yang telah Anda pilih.");
    return;
  }

  const formattedCost =
    costVal && Number(costVal) > 0
      ? "Rp " + Number(costVal).toLocaleString("id-ID")
      : "-";

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "TBD";

  projectList.unshift({
    regNo: regNo,
    regDate: regDateVal,
    title: title,
    dept: dept,
    section: section,
    owner: owner,
    contact: contact,
    teamName: teamName || "-",
    teamMembers: memberNames.length > 0 ? memberNames.join(", ") : "-",
    method: method,
    category: category,
    problemStatement: problem || "-",
    improvementTarget: target || "-",
    costSavingVal: Number(costVal) || 0,
    costInvestmentVal: Number(investVal) || 0,
    costSaving: formattedCost,
    status: "Pending",
    currentStep: 2,
    progress: 15,
    deadline: formattedDeadline,
    deliverableFile: "-",
    finalTitle: "-",
    actualResult: "-",
  });

  persistProjects();

  alert(
    `Registrasi Berhasil! Nomor Proyek: ${regNo}\nTema otomatis masuk ke antrean ACC Fasilitator (${dept}).`,
  );

  const formIds = [
    "section",
    "ciMethod",
    "projectTitle",
    "projectCategory",
    "projectOwner",
    "picContact",
    "teamName",
    "problemStatement",
    "improvementTarget",
    "costSaving",
    "costInvestment",
    "startDate",
    "targetDate",
  ];
  formIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  if (memberCountSelect) {
    memberCountSelect.value = "0";
    renderMemberInputs();
  }

  setupRegistrationFormRole();
  renderTables();
  renderParticipation();
  updateNotificationCount();
  showPage("myprojects");
}

// ==========================================
// 5. WORKSPACE, APPROVAL BERJENJANG & ALL REGISTRY
// ==========================================
function approveCurrentStep(regNo) {
  const project = projectList.find((p) => p.regNo === regNo);
  if (!project) return;

  const currentStep = project.currentStep;

  if (currentStep === 2) {
    project.currentStep = 3;
    project.progress = 35;
    alert(
      `✅ Proyek ${regNo} disetujui Fasilitator!\nBerkas otomatis diteruskan ke Manager Departemen.`,
    );
  } else if (currentStep === 3) {
    project.currentStep = 4;
    project.progress = 55;
    alert(
      `✅ Proyek ${regNo} disetujui Manager!\nBerkas otomatis diteruskan ke CI Team untuk verifikasi standar.`,
    );
  } else if (currentStep === 4) {
    project.currentStep = 5;
    project.progress = 75;
    alert(
      `✅ Standar format diverifikasi CI Team!\nBerkas diteruskan ke Finance untuk validasi Cost Saving.`,
    );
  } else if (currentStep === 5) {
    project.currentStep = 6;
    project.progress = 90;
    alert(
      `✅ Validasi Finansial disetujui!\nMenunggu ACC penutupan dari Manager Risk & Compliance.`,
    );
  } else if (currentStep === 6) {
    project.status = "Completed";
    project.progress = 100;
    alert(
      `🎉 Proyek ${regNo} RESMI CLOSED & SELESAI 100%!\nSeluruh jenjang wewenang telah menyetujui.`,
    );
  }

  persistProjects();
  renderTables();
  renderParticipation();
  updateNotificationCount();
}

function rejectCurrentStep(regNo) {
  const project = projectList.find((p) => p.regNo === regNo);
  if (!project) return;

  const reason = prompt(
    `Masukkan alasan penolakan/catatan revisi untuk proyek ${regNo}:`,
    "Mohon lengkapi latar belakang masalah dan perbaiki estimasi biaya.",
  );

  if (reason === null) return;

  const cleanReason = reason.trim() || "Tidak ada catatan spesifik.";

  project.status = "Revision Needed";
  project.currentStep = 1;
  project.progress = 5;
  project.rejectionNote = cleanReason;

  persistProjects();
  alert(
    `❌ Proyek ${regNo} DITOLAK / DIKEMBALIKAN KE PIC!\nCatatan revisi: "${cleanReason}"\n\nTema telah dipindahkan kembali ke PIC untuk diperbaiki.`,
  );

  renderTables();
  renderParticipation();
  updateNotificationCount();
}

function renderTables() {
  const recentEl = document.getElementById("recent");
  if (recentEl) {
    recentEl.innerHTML = projectList
      .slice(0, 4)
      .map((p) => {
        const actionHtml =
          currentUserRole === "CI_TEAM"
            ? `<span class="action" style="cursor:pointer; color:#d97706; font-weight:600;" onclick="showPage('verification')">Review</span>`
            : `<span style="color:#94a3b8; font-size:12px;">Read-Only</span>`;

        return `
        <tr>
          <td><b>${p.regNo}</b></td>
          <td>${p.title}</td>
          <td>${p.dept}</td>
          <td><span class="status ${statusClass(p.status)}">${p.status}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
      })
      .join("");
  }

  let filteredWorkspaceProjects = [];
  const workspaceBadge = document.getElementById("workspaceBadge");
  const workspaceSubtitle = document.getElementById("workspaceSubtitle");

  if (currentUserRole === "PIC") {
    filteredWorkspaceProjects = projectList.filter(
      (p) =>
        p.owner === "PIC / Team Leader" ||
        p.owner === "Andi Pratama" ||
        (p.teamMembers && p.teamMembers.includes("Andi Pratama")) ||
        p.dept === "Operational" ||
        p.status === "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "✍️ 1. Workspace PIC / Tim Proyek";
      workspaceBadge.style.background = "#e0f2fe";
      workspaceBadge.style.color = "#0369a1";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar proyek Anda: input laporan, upload berkas deliverable, dan pantau jalur approval.";
    }
  } else if (currentUserRole === "FASILITATOR") {
    filteredWorkspaceProjects = projectList.filter(
      (p) => p.currentStep === 2 && p.status !== "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "🧭 2. Antrean ACC Fasilitator";
      workspaceBadge.style.background = "#e0e7ff";
      workspaceBadge.style.color = "#3730a3";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar proyek yang memerlukan bimbingan teknis & ACC Fasilitator.";
    }
  } else if (currentUserRole === "MANAGER") {
    filteredWorkspaceProjects = projectList.filter(
      (p) => p.currentStep === 3 && p.status !== "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "👔 3. Antrean Approval Manager Dept";
      workspaceBadge.style.background = "#fef3c7";
      workspaceBadge.style.color = "#92400e";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar usulan & laporan akhir perbaikan yang memerlukan persetujuan Manager Departemen.";
    }
  } else if (currentUserRole === "CI_TEAM") {
    filteredWorkspaceProjects = projectList.filter(
      (p) => p.currentStep === 4 && p.status !== "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "👑 4. Antrean Verifikasi Standar CI Team";
      workspaceBadge.style.background = "#f3e8ff";
      workspaceBadge.style.color = "#6b21a8";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar proyek seluruh divisi yang siap direview metodologi & standar laporannya.";
    }
  } else if (currentUserRole === "FINANCE") {
    filteredWorkspaceProjects = projectList.filter(
      (p) => p.currentStep === 5 && p.status !== "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "💰 5. Antrean Validasi Cost Saving (Finance)";
      workspaceBadge.style.background = "#dcfce7";
      workspaceBadge.style.color = "#166534";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar proyek inovasi yang menunggu validasi pembukuan realisasi efisiensi biaya.";
    }
  } else if (currentUserRole === "MGR_RISK") {
    filteredWorkspaceProjects = projectList.filter(
      (p) => p.currentStep === 6 && p.status !== "Completed",
    );
    if (workspaceBadge) {
      workspaceBadge.innerText = "🛡️ 6. Antrean Final ACC Manager Risk & Comp";
      workspaceBadge.style.background = "#fee2e2";
      workspaceBadge.style.color = "#991b1b";
    }
    if (workspaceSubtitle) {
      workspaceSubtitle.innerText =
        "Daftar proyek tahap akhir yang menunggu verifikasi kepatuhan & mitigasi risiko sebelum Closed.";
    }
  }

  const myTableEl = document.getElementById("myTable");
  if (myTableEl) {
    if (filteredWorkspaceProjects.length === 0) {
      myTableEl.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: #94a3b8; padding: 28px;">
            🎉 <b>Tidak ada antrean pending.</b> Seluruh tema proyek pada wewenang akun Anda telah disetujui / diproses.
          </td>
        </tr>
      `;
    } else {
      myTableEl.innerHTML = filteredWorkspaceProjects
        .map((p) => {
          const currentApprover = approvalSteps[(p.currentStep || 1) - 1];
          const approvalBadgeText =
            p.status === "Completed" ? "Closed" : `Pending: ${currentApprover}`;

          let roleLabel = "Approver";
          if (currentUserRole === "PIC") roleLabel = "Leader";
          else if (currentUserRole === "FASILITATOR") roleLabel = "Fasilitator";
          else if (currentUserRole === "MANAGER") roleLabel = "Dept Manager";
          else if (currentUserRole === "CI_TEAM") roleLabel = "CI Verifier";
          else if (currentUserRole === "FINANCE")
            roleLabel = "Finance Verifier";
          else if (currentUserRole === "MGR_RISK") roleLabel = "Risk Approver";

          let actionHtml = "";
          if (currentUserRole === "PIC") {
            const isFullyApproved = p.status === "Completed";
            const hasUploaded = p.deliverableFile && p.deliverableFile !== "-";

            let uploadBtn = "";
            if (!isFullyApproved) {
              uploadBtn = `<span 
                   style="color: #94a3b8; font-size: 11.5px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; cursor: not-allowed;" 
                   title="Menunggu persetujuan selesai sampai tahap akhir (Manager Risk)"
                 >
                   🔒 Menunggu ACC
                 </span>`;
            } else if (hasUploaded) {
              // Jika SUDAH UPLOAD: tombol berganti jadi "Review" berwarna biru
              uploadBtn = `<button 
                   onclick="showDeliverableForProject('${p.regNo}')" 
                   style="background: #0284c7; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;"
                   title="Klik untuk melihat/mengedit berkas deliverable yang telah diunggah"
                 >
                   🔍 Review / Edit
                 </button>`;
            } else {
              // Jika BELUM UPLOAD: tombol tetap "Upload Laporan" berwarna hijau
              uploadBtn = `<button 
                   onclick="showDeliverableForProject('${p.regNo}')" 
                   style="background: #16a34a; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;"
                   title="Klik untuk mengunggah berkas laporan akhir"
                 >
                   📤 Upload Laporan &rarr;
                 </button>`;
            }

            actionHtml = `
              <div style="display: flex; gap: 8px; align-items: center;">
                <span class="action" onclick="viewProjectDetail('${p.regNo}')" style="cursor: pointer; font-size: 11.5px; color: #0284c7; text-decoration: underline; font-weight: 600;">
                  Berkas
                </span>
                ${uploadBtn}
              </div>
            `;
          } else {
            actionHtml = `
              <div style="display: flex; gap: 6px; align-items: center;">
                <button 
                  onclick="approveCurrentStep('${p.regNo}')" 
                  title="Setujui Proyek"
                  style="background: #16a34a; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;"
                >
                  ✓ ACC
                </button>
                <button 
                  onclick="rejectCurrentStep('${p.regNo}')" 
                  title="Tolak / Minta Revisi Proyek"
                  style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;"
                >
                  ✕ Tolak
                </button>
                <span class="action" onclick="viewProjectDetail('${p.regNo}')" style="cursor: pointer; font-size: 11.5px; color: #d97706; text-decoration: underline; font-weight: 600;">
                  Berkas
                </span>
              </div>
            `;
          }

          const formattedRegDate = p.regDate
            ? new Date(p.regDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "-";

          return `
          <tr>
            <td><b>${p.regNo}</b></td>
            <td>${p.title}</td>
            <td><span style="font-weight: 600; font-size: 12px;">${roleLabel}</span></td>
            <td>${p.dept}</td>
            <td><span style="font-size: 12px; color: #475569;">${p.method}</span></td>
            <td>
              <span 
                class="status yellow clickable-status" 
                title="Klik untuk melacak alur approval 6 tahap" 
                onclick="showWorkflowModal('${p.regNo}')"
                style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
              >
                ⏳ ${approvalBadgeText} 🔍
              </span>
            </td>
            <td><b>${p.progress}%</b></td>
            <td><span style="font-size: 12px; color: #64748b;">${formattedRegDate}</span></td> <!-- Tanggal Reg di Workspace -->
            <td>${p.deadline}</td>
            <td>${actionHtml}</td>
          </tr>
        `;
        })
        .join("");
    }
  }

  const approvedForRegistry = projectList.filter(
    (p) => p.currentStep > 2 || p.status === "Completed",
  );
  renderAllTable(approvedForRegistry);
}

function renderAllTable(data) {
  const allTableEl = document.getElementById("allTable");
  if (!allTableEl) return;

  const btnExport = document.getElementById("btnExportCsv");
  if (btnExport) {
    btnExport.style.display =
      currentUserRole === "CI_TEAM" ? "inline-block" : "none";
  }

  const thAction = document.getElementById("thRegistryAction");
  if (thAction) {
    thAction.style.display = "table-cell";
  }

  const regAccessBadge = document.getElementById("regAccessBadge");
  if (regAccessBadge) {
    if (currentUserRole === "CI_TEAM") {
      regAccessBadge.innerText = "🛠️ Mode: Super Admin (Full Control & Export)";
      regAccessBadge.style.background = "#fef3c7";
      regAccessBadge.style.color = "#92400e";
    } else if (["FASILITATOR", "MANAGER"].includes(currentUserRole)) {
      regAccessBadge.innerText = "👁️ Mode: Manager/Fasilitator View";
      regAccessBadge.style.background = "#e0f2fe";
      regAccessBadge.style.color = "#0369a1";
    } else {
      regAccessBadge.innerText = "👁️ Mode: Read-Only (Knowledge Repository)";
      regAccessBadge.style.background = "#f1f5f9";
      regAccessBadge.style.color = "#475569";
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (a.status === "Completed" && b.status !== "Completed") return -1;
    if (a.status !== "Completed" && b.status === "Completed") return 1;
    return 0;
  });

  if (sortedData.length === 0) {
    allTableEl.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">
          Tidak ada data proyek yang sesuai dengan pencarian / filter.
        </td>
      </tr>
    `;
    return;
  }

  allTableEl.innerHTML = sortedData
    .map((p) => {
      const currentApprover = approvalSteps[(p.currentStep || 1) - 1];
      const isCompleted = p.status === "Completed";

      const approvalBadgeHtml = isCompleted
        ? `<span class="status green">✅ Closed / Approved</span>`
        : `<span 
            class="status yellow clickable-status" 
            title="Klik untuk melacak detail 6 tahap persetujuan" 
            onclick="showWorkflowModal('${p.regNo}')"
            style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
           >
             ⏳ Pending: ${currentApprover} 🔍
           </span>`;

      const displayTitle =
        p.finalTitle && p.finalTitle !== "-" ? p.finalTitle : p.title;

      const fileActionHtml = `
        <td>
          <span 
            class="action" 
            onclick="viewProjectDetail('${p.regNo}')" 
            style="cursor: pointer; font-size: 11.5px; color: #d97706; text-decoration: underline; font-weight: 700;"
          >
            Berkas
          </span>
        </td>
      `;

      return `
      <tr>
        <td><b>${p.regNo}</b></td>
        <td><b>${displayTitle}</b></td>
        <td>${p.dept}</td>
        <td>${p.owner}</td>
        <td><span style="font-size: 12px; color: #475569;">${p.method}</span></td>
        <td>${approvalBadgeHtml}</td>
        <td><b>${p.progress}%</b></td>
        ${fileActionHtml}
      </tr>
    `;
    })
    .join("");
}

function filterAllProjects() {
  const searchInput = document.getElementById("searchAll");
  const deptSelect = document.getElementById("filterDeptRegistry");

  const query = searchInput ? searchInput.value.toLowerCase() : "";
  const selectedDept = deptSelect ? deptSelect.value : "";

  const approvedProjects = projectList.filter(
    (p) => p.currentStep > 2 || p.status === "Completed",
  );

  const filtered = approvedProjects.filter((p) => {
    const matchQuery =
      p.regNo.toLowerCase().includes(query) ||
      p.title.toLowerCase().includes(query) ||
      p.owner.toLowerCase().includes(query);

    const matchDept = selectedDept === "" || p.dept === selectedDept;
    return matchQuery && matchDept;
  });

  renderAllTable(filtered);
}

function exportProjectsToCSV() {
  if (currentUserRole !== "CI_TEAM") {
    alert(
      "Akses ditolak: Hanya CI Team yang memiliki otorisasi untuk mengekspor data master formulir registrasi.",
    );
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  const headers = [
    "No. Register",
    "Departemen",
    "Section / Area",
    "Metode Inovasi",
    "Kategori Proyek",
    "Tema Awal Registrasi",
    "Tema Akhir Deliverable",
    "Leader / PIC",
    "Kontak PIC",
    "Nama Tim",
    "Daftar Anggota Tim",
    "Problem Statement",
    "Improvement Target",
    "Estimasi Cost Saving (Rp/Tahun)",
    "Estimasi Biaya Investasi (Rp)",
    "Target Deadline",
    "Berkas PDF",
    "Posisi Approval Saat Ini",
    "Progress (%)",
    "Status Proyek",
  ];

  csvContent += headers.map((h) => `"${h}"`).join(",") + "\n";

  projectList.forEach((p) => {
    const approver = approvalSteps[(p.currentStep || 1) - 1] || "Selesai";
    const approvalStatus =
      p.status === "Completed" ? "Closed / Approved" : `Pending: ${approver}`;

    const cleanText = (val) => {
      if (!val || val === "-") return "-";
      return String(val)
        .replace(/"/g, '""')
        .replace(/\r?\n|\r/g, " ");
    };

    const row = [
      `"${cleanText(p.regNo)}"`,
      `"${cleanText(p.dept)}"`,
      `"${cleanText(p.section)}"`,
      `"${cleanText(p.method)}"`,
      `"${cleanText(p.category)}"`,
      `"${cleanText(p.title)}"`,
      `"${cleanText(p.finalTitle)}"`,
      `"${cleanText(p.owner)}"`,
      `"${cleanText(p.contact)}"`,
      `"${cleanText(p.teamName)}"`,
      `"${cleanText(p.teamMembers)}"`,
      `"${cleanText(p.problemStatement)}"`,
      `"${cleanText(p.improvementTarget)}"`,
      `"${p.costSavingVal || 0}"`,
      `"${p.costInvestmentVal || 0}"`,
      `"${cleanText(p.deadline)}"`,
      `"${cleanText(p.deliverableFile)}"`,
      `"${approvalStatus}"`,
      `"${p.progress || 0}%"`,
      `"${cleanText(p.status)}"`,
    ].join(",");

    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `Data_Registrasi_Inovasi_Peserta_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 6. MODAL WORKFLOW TIMELINE APPROVAL
// ==========================================
function showWorkflowModal(regNo) {
  const p = projectList.find((x) => x.regNo === regNo);
  if (!p) return;

  const modalTitle = document.getElementById("modalProjectTitle");
  if (modalTitle) modalTitle.textContent = p.title;

  const modalReg = document.getElementById("modalProjectReg");
  if (modalReg)
    modalReg.textContent = `No. Reg: ${p.regNo} · Departemen: ${p.dept} · PIC: ${p.owner}`;

  const currentStep = p.currentStep || 1;
  const isCompleted = p.status === "Completed";
  const timelineEl = document.getElementById("modalTimeline");
  if (timelineEl) {
    timelineEl.innerHTML = approvalSteps
      .map((stepName, idx) => {
        const stepNum = idx + 1;
        let stepClass = "";
        let dotContent = stepNum;
        if (isCompleted || stepNum < currentStep) {
          stepClass = "done";
          dotContent = "&checkmark;";
        } else if (stepNum === currentStep) {
          stepClass = "current";
          dotContent = stepNum;
        }
        return `
        <div class="step ${stepClass}">
          <span class="dot">${dotContent}</span>
          <div class="label">${stepName}</div>
        </div>
      `;
      })
      .join("");
  }

  const currentRoleName = isCompleted
    ? "Resmi Ditutup (Closed)"
    : approvalSteps[currentStep - 1] || "Selesai";
  const noteEl = document.getElementById("modalWorkflowNote");
  if (noteEl) {
    noteEl.innerHTML = `💡 <b>Posisi Persetujuan Saat Ini:</b> ${
      isCompleted
        ? "Proyek ini telah melalui seluruh proses persetujuan dan resmi ditutup."
        : `Menunggu review &amp; ACC dari <b>${currentRoleName}</b> (Tahap ${currentStep} dari 6).`
    }`;
  }

  const modal = document.getElementById("workflowModal");
  if (modal) modal.style.display = "flex";
}

function closeWorkflowModal() {
  const modal = document.getElementById("workflowModal");
  if (modal) modal.style.display = "none";
}

// ==========================================
// 7. MENU 5: PROJECT DELIVERABLES
// ==========================================
function setupDeliverablesPage() {
  const selectEl = document.getElementById("delivProjectSelect");
  const roleBadge = document.getElementById("delivRoleBadge");
  const subTitle = document.getElementById("delivSubtitle");
  const uploadSec = document.getElementById("picUploadSection");
  const btnSubmit = document.getElementById("btnSubmitDeliverable");
  const btnValidate = document.getElementById("btnValidateDeliv");
  const btnReject = document.getElementById("btnRejectDeliv");
  const guideBox = document.getElementById("reviewerGuidanceBox");
  const guideText = document.getElementById("reviewerGuidanceText");
  const finalTitleInput = document.getElementById("delivFinalTitle");
  const actualResultInput = document.getElementById("delivActualResult");

  if (!selectEl) return;

  let availableProjects = [];
  if (currentUserRole === "PIC") {
    availableProjects = projectList.filter((p) => p.status === "Completed");
  } else if (
    currentUserRole === "FASILITATOR" ||
    currentUserRole === "MANAGER"
  ) {
    availableProjects = [...projectList];
  } else if (currentUserRole === "FINANCE") {
    availableProjects = projectList.filter(
      (p) => p.costSaving && p.costSaving !== "-" && p.costSaving !== "Rp 0",
    );
  } else {
    availableProjects = [...projectList];
  }

  if (availableProjects.length === 0 && currentUserRole === "PIC") {
    selectEl.innerHTML = `<option value="">-- Belum ada proyek yang selesai disetujui seluruh tahapan --</option>`;
    resetDeliverableFields();
    return;
  }

  selectEl.innerHTML =
    `<option value="">-- Pilih Proyek (${availableProjects.length} Proyek Tersedia) --</option>` +
    availableProjects
      .map((p) => `<option value="${p.regNo}">${p.regNo} - ${p.title}</option>`)
      .join("");

  if (currentUserRole === "PIC") {
    if (roleBadge) {
      roleBadge.innerText = "📤 Mode: Upload Berkas (Inovator/PIC)";
      roleBadge.style.background = "#e0f2fe";
      roleBadge.style.color = "#0369a1";
    }
    if (subTitle) {
      subTitle.innerText =
        "Unggah berkas laporan akhir (PDF) dan input realisasi hasil perbaikan.";
    }
    if (uploadSec) uploadSec.style.display = "block";
    if (btnSubmit) btnSubmit.style.display = "inline-block";
    if (btnValidate) btnValidate.style.display = "none";
    if (btnReject) btnReject.style.display = "none";
    if (guideBox) guideBox.style.display = "none";

    if (finalTitleInput) {
      finalTitleInput.readOnly = false;
      finalTitleInput.style.background = "#ffffff";
      finalTitleInput.style.cursor = "text";
    }
    if (actualResultInput) {
      actualResultInput.readOnly = false;
      actualResultInput.style.background = "#ffffff";
      actualResultInput.style.cursor = "text";
    }
  } else if (currentUserRole === "CI_TEAM") {
    if (roleBadge) {
      roleBadge.innerText = "👑 Mode: CI Super Admin (Upload & Verifikasi)";
      roleBadge.style.background = "#f3e8ff";
      roleBadge.style.color = "#6b21a8";
    }
    if (subTitle) {
      subTitle.innerText =
        "Super Admin: Akses penuh review metodologi, upload berkas revisi, dan validasi standar.";
    }
    if (uploadSec) uploadSec.style.display = "block";
    if (btnSubmit) btnSubmit.style.display = "inline-block";
    if (btnValidate) btnValidate.style.display = "inline-block";
    if (btnReject) btnReject.style.display = "inline-block";
    if (finalTitleInput) finalTitleInput.readOnly = false;
    if (actualResultInput) actualResultInput.readOnly = false;
    if (guideBox) guideBox.style.display = "block";
    if (guideText) {
      guideText.innerText =
        "Verifikasi kepatuhan format inovasi standar perusahaan sebelum penutupan resmi.";
    }
  } else {
    if (uploadSec) uploadSec.style.display = "none";
    if (btnSubmit) btnSubmit.style.display = "none";
    if (btnValidate) btnValidate.style.display = "inline-block";
    if (btnReject) btnReject.style.display = "inline-block";
    if (finalTitleInput) {
      finalTitleInput.readOnly = true;
      finalTitleInput.style.background = "#f8fafc";
    }
    if (actualResultInput) {
      actualResultInput.readOnly = true;
      actualResultInput.style.background = "#f8fafc";
    }
    if (guideBox) guideBox.style.display = "block";

    if (currentUserRole === "FASILITATOR") {
      roleBadge.innerText = "🧭 2. Mode: Review Fasilitator Dept";
      roleBadge.style.background = "#e0e7ff";
      roleBadge.style.color = "#3730a3";
      if (guideText) {
        guideText.innerText =
          "Periksa langkah metodologi PDCA/DMAIC anggota tim sebelum diserahkan ke Manager Dept.";
      }
    } else if (currentUserRole === "MANAGER") {
      roleBadge.innerText = "👔 3. Mode: Approval Manager Dept";
      roleBadge.style.background = "#fef3c7";
      roleBadge.style.color = "#92400e";
      if (guideText) {
        guideText.innerText =
          "Setujui implementasi perbaikan departemen sebelum diverifikasi oleh Tim CI.";
      }
    } else if (currentUserRole === "FINANCE") {
      roleBadge.innerText = "💰 5. Mode: Validasi Finansial & Cost Saving";
      roleBadge.style.background = "#dcfce7";
      roleBadge.style.color = "#166534";
      if (guideText) {
        guideText.innerText =
          "Validasi kalkulasi pembukuan efisiensi biaya (Cost Saving/ROI) dalam laporan.";
      }
    } else if (currentUserRole === "MGR_RISK") {
      roleBadge.innerText = "🛡️ 6. Mode: Final Approval Manager Risk";
      roleBadge.style.background = "#fee2e2";
      roleBadge.style.color = "#991b1b";
      if (guideText) {
        guideText.innerText =
          "Persetujuan tahap akhir aspek mitigasi risiko dan kepatuhan sebelum proyek resmi Closed.";
      }
    }
  }

  if (availableProjects.length > 0) {
    selectEl.value = availableProjects[0].regNo;
    onDeliverableProjectChange();
  } else {
    resetDeliverableFields();
  }
}

function onDeliverableProjectChange() {
  const selectEl = document.getElementById("delivProjectSelect");
  if (!selectEl) return;
  const regNo = selectEl.value;

  const project = projectList.find((p) => p.regNo === regNo);
  if (!project) {
    resetDeliverableFields();
    return;
  }

  const deptLeaderEl = document.getElementById("delivDeptLeader");
  if (deptLeaderEl) {
    deptLeaderEl.value = `${project.dept} | Leader: ${project.owner}`;
  }

  const methodCostEl = document.getElementById("delivMethodCost");
  if (methodCostEl) {
    methodCostEl.value = `${project.method} | Est. Saving: ${project.costSaving || "-"}`;
  }

  const finalTitleEl = document.getElementById("delivFinalTitle");
  if (finalTitleEl) {
    finalTitleEl.value =
      project.finalTitle && project.finalTitle !== "-"
        ? project.finalTitle
        : project.title;
  }

  const actualResultEl = document.getElementById("delivActualResult");
  if (actualResultEl) {
    actualResultEl.value =
      project.actualResult && project.actualResult !== "-"
        ? project.actualResult
        : "";
  }

  const currentFileEl = document.getElementById("currentFileName");
  const btnDownload = document.getElementById("btnDownloadDeliv");

  if (project.deliverableFile && project.deliverableFile !== "-") {
    if (currentFileEl) currentFileEl.innerText = project.deliverableFile;
    if (btnDownload) btnDownload.style.display = "inline-block";
  } else {
    if (currentFileEl) currentFileEl.innerText = "Belum ada berkas terunggah.";
    if (btnDownload) btnDownload.style.display = "none";
  }
}

function resetDeliverableFields() {
  [
    "delivDeptLeader",
    "delivMethodCost",
    "delivFinalTitle",
    "delivActualResult",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const currentFileEl = document.getElementById("currentFileName");
  if (currentFileEl) currentFileEl.innerText = "Belum ada berkas.";
  const btnDownload = document.getElementById("btnDownloadDeliv");
  if (btnDownload) btnDownload.style.display = "none";
}

function saveDeliverable() {
  const selectEl = document.getElementById("delivProjectSelect");
  const regNo = selectEl ? selectEl.value : "";
  const finalTitle =
    document.getElementById("delivFinalTitle")?.value.trim() || "";
  const actualResult =
    document.getElementById("delivActualResult")?.value.trim() || "";
  const fileInput = document.getElementById("delivFileInput");

  if (!regNo) {
    alert("Silakan pilih proyek terlebih dahulu.");
    return;
  }
  if (!finalTitle) {
    alert("Mohon isi Judul Akhir Laporan Inovasi.");
    return;
  }
  if (!actualResult) {
    alert("Mohon ketikkan Realisasi Hasil Pencapaian Aktual.");
    return;
  }

  const project = projectList.find((p) => p.regNo === regNo);
  if (project) {
    project.finalTitle = finalTitle;
    project.actualResult = actualResult;

    if (fileInput && fileInput.files.length > 0) {
      project.deliverableFile = fileInput.files[0].name;
    } else if (!project.deliverableFile || project.deliverableFile === "-") {
      project.deliverableFile = `Laporan_${regNo.replace(/\//g, "_")}.pdf`;
    }

    persistProjects();
    alert(
      `✅ Berkas & Judul Akhir untuk proyek ${regNo} berhasil disimpan!\nJudul Awal: "${project.title}"\nJudul Akhir: "${project.finalTitle}"`,
    );

    renderTables();
    onDeliverableProjectChange();
  }
}

function downloadDeliverable() {
  const selectEl = document.getElementById("delivProjectSelect");
  const regNo = selectEl ? selectEl.value : "";
  const project = projectList.find((p) => p.regNo === regNo);

  if (project && project.deliverableFile && project.deliverableFile !== "-") {
    alert(
      `Mengunduh file: ${project.deliverableFile} (Simulasi PDF Viewer)...`,
    );
  } else {
    alert("Berkas PDF belum diunggah.");
  }
}

function validateDeliverable() {
  const selectEl = document.getElementById("delivProjectSelect");
  const regNo = selectEl ? selectEl.value : "";
  const project = projectList.find((p) => p.regNo === regNo);

  if (!project) return;
  if (!project.deliverableFile || project.deliverableFile === "-") {
    alert("Peringatan: Berkas belum diunggah, belum dapat divalidasi.");
    return;
  }

  approveCurrentStep(regNo);
}

function rejectDeliverable() {
  const selectEl = document.getElementById("delivProjectSelect");
  const regNo = selectEl ? selectEl.value : "";
  const reason = prompt("Masukkan catatan revisi untuk Inovator / PIC:");
  if (reason) {
    alert(`Catatan revisi untuk proyek ${regNo} terkirim ke PIC:\n"${reason}"`);
  }
}

// ==========================================
// 8. MENU 6: CI VERIFICATION & REVIEW (TABEL & AUDIT)
// ==========================================
let verificationAuditLog = JSON.parse(
  localStorage.getItem("binnovate_audit_log"),
) || [
  {
    regNo: "OPS/2026/001",
    initialTitle: "Pengurangan Downtime Mesin Line Machining",
    finalTitle: "Optimalisasi Setup & Changeover Tooling Mesin MC-02",
    dept: "Operational",
    method: "QCC",
    matchStatus: "MATCH & VALID",
    verdict: "Approved (Closed)",
    verdictClass: "green",
    comment: "Metodologi PDCA sesuai standar dan penghematan biaya valid.",
    verifier: "CI Administrator",
    verifiedAt: "2026-08-25 14:30",
  },
];

function persistAuditLog() {
  localStorage.setItem(
    "binnovate_audit_log",
    JSON.stringify(verificationAuditLog),
  );
}

function setupVerificationPage() {
  renderVerificationTable();
}

function renderVerificationTable() {
  const tbody = document.getElementById("verifTableList");
  if (!tbody) return;

  if (projectList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">Belum ada proyek terdaftar.</td></tr>`;
    return;
  }

  const sorted = [...projectList].sort((a, b) => {
    if (a.status === "Completed" && b.status !== "Completed") return -1;
    if (a.status !== "Completed" && b.status === "Completed") return 1;
    return 0;
  });

  tbody.innerHTML = sorted
    .map((p) => {
      const isCompleted = p.status === "Completed";
      const hasFile = p.deliverableFile && p.deliverableFile !== "-";
      const displayTitle =
        p.finalTitle && p.finalTitle !== "-" ? p.finalTitle : p.title;

      const fileStatusHtml = hasFile
        ? `<span class="status green">📄 ${p.deliverableFile}</span>`
        : `<span class="status yellow">⏳ Belum Upload</span>`;

      const approvalBadgeHtml = isCompleted
        ? `<span class="status green">✅ Closed / Approved</span>`
        : `<span class="status yellow">⏳ Pending ACC</span>`;

      return `
      <tr>
        <td><b>${p.regNo}</b></td>
        <td>
          <b>${displayTitle}</b>
          ${p.finalTitle && p.finalTitle !== "-" && p.finalTitle !== p.title ? `<br><small style="color:#64748b;">(Awal: ${p.title})</small>` : ""}
        </td>
        <td>${p.dept}</td>
        <td>${p.owner}</td>
        <td><span style="font-size:12px; color:#475569;">${p.method}</span></td>
        <td>${fileStatusHtml}</td>
        <td>${approvalBadgeHtml}</td>
        <td>
          <button 
            onclick="openVerifModal('${p.regNo}')"
            style="background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11.5px; font-weight: 700; cursor: pointer;"
          >
            🔍 Review
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function openVerifModal(regNo) {
  selectedVerifRegNo = regNo;
  const project = projectList.find((p) => p.regNo === regNo);
  if (!project) return;

  document.getElementById("modalVerifTitle").innerText =
    `Review Proyek: ${project.title}`;
  document.getElementById("modalVerifReg").innerText =
    `No. Reg: ${project.regNo} · Departemen: ${project.dept} · PIC: ${project.owner}`;

  document.getElementById("verifInitialTitle").innerText = project.title;
  document.getElementById("verifInitialDetails").innerText =
    `Dept: ${project.dept} | Section: ${project.section || "-"} | Metode: ${project.method}`;

  const hasFinal = project.finalTitle && project.finalTitle !== "-";
  document.getElementById("verifFinalTitle").innerText = hasFinal
    ? project.finalTitle
    : "(Belum diisi / Mengikuti tema awal)";
  document.getElementById("verifActualResult").innerText =
    `Aktual: ${project.actualResult || "Belum diinput"}`;

  const hasFile = project.deliverableFile && project.deliverableFile !== "-";
  const fileBadge = document.getElementById("verifFileBadge");
  if (fileBadge) {
    fileBadge.innerText = hasFile
      ? `📄 ${project.deliverableFile}`
      : "📄 Belum ada PDF";
    fileBadge.className = hasFile ? "status green" : "status yellow";
  }

  const matchStatus = document.getElementById("verifMatchStatus");
  const matchDesc = document.getElementById("verifMatchDesc");
  const ciComment = document.getElementById("ciComment");

  if (project.status === "Completed") {
    if (matchStatus) {
      matchStatus.innerText = "PROYEK CLOSED";
      matchStatus.className = "status green";
    }
    if (matchDesc)
      matchDesc.innerText =
        "Tema telah disetujui penuh di seluruh tahap persetujuan.";
    if (ciComment) ciComment.value = "Tema valid dan resmi ditutup.";
  } else if (!hasFile) {
    if (matchStatus) {
      matchStatus.innerText = "PENDING REPORT";
      matchStatus.className = "status yellow";
    }
    if (matchDesc)
      matchDesc.innerText =
        "Menunggu Inovator mengunggah berkas PDF di menu Deliverables.";
    if (ciComment)
      ciComment.value = "Menunggu kelengkapan dokumen laporan akhir.";
  } else if (
    project.title.trim().toLowerCase() ===
    (project.finalTitle || "").trim().toLowerCase()
  ) {
    if (matchStatus) {
      matchStatus.innerText = "IDENTICAL (KONSISTEN)";
      matchStatus.className = "status blue";
    }
    if (matchDesc)
      matchDesc.innerText =
        "Tema akhir konsisten dan sama persis dengan tema registrasi awal.";
    if (ciComment)
      ciComment.value =
        "Tema konsisten dari awal pendaftaran. Metodologi dan laporan valid.";
  } else {
    if (matchStatus) {
      matchStatus.innerText = "EVOLVED (SOLUTIF)";
      matchStatus.className = "status green";
    }
    if (matchDesc)
      matchDesc.innerText =
        "Tema akhir berevolusi menjadi berbasis tindakan/solusi nyata hasil perbaikan.";
    if (ciComment)
      ciComment.value =
        "Penyesuaian tema akhir sesuai dengan implementasi perbaikan di lapangan.";
  }

  const modalEl = document.getElementById("verifActionModal");
  if (modalEl) modalEl.style.display = "flex";
}

function closeVerifModal() {
  const modalEl = document.getElementById("verifActionModal");
  if (modalEl) modalEl.style.display = "none";
}

function approveVerification() {
  if (!selectedVerifRegNo) return;
  const project = projectList.find((p) => p.regNo === selectedVerifRegNo);
  const comment =
    document.getElementById("ciComment")?.value ||
    "Tema diverifikasi sesuai standar CI.";

  addVerificationAudit(project, "Verified by CI", "green", comment);
  approveCurrentStep(selectedVerifRegNo);
  closeVerifModal();
  renderVerificationTable();
}

function revisionVerification() {
  if (!selectedVerifRegNo) return;
  const comment = document.getElementById("ciComment")?.value || "";
  if (!comment) {
    alert("Mohon ketikkan catatan revisi pada kotak komentar.");
    return;
  }
  const project = projectList.find((p) => p.regNo === selectedVerifRegNo);
  addVerificationAudit(project, "Revision Requested", "yellow", comment);
  alert(
    `⚠️ Catatan revisi untuk proyek ${selectedVerifRegNo} tersimpan & terkirim ke PIC.`,
  );
  closeVerifModal();
}

function rejectVerification() {
  if (!selectedVerifRegNo) return;
  const comment =
    document.getElementById("ciComment")?.value ||
    "Format inovasi tidak memenuhi standar.";
  const project = projectList.find((p) => p.regNo === selectedVerifRegNo);

  if (
    confirm(
      `Apakah Anda yakin ingin me-REJECT tema proyek ${selectedVerifRegNo}?`,
    )
  ) {
    project.status = "Pending";
    project.progress = 0;
    persistProjects();
    addVerificationAudit(project, "Rejected", "red", comment);
    alert(
      `❌ Proyek ${selectedVerifRegNo} ditolak dan tercatat pada audit trail verifikasi.`,
    );
    closeVerifModal();
    renderVerificationTable();
  }
}

function addVerificationAudit(project, verdict, verdictClass, comment) {
  const now = new Date();
  const dateStr =
    now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 5);

  const finalTitle =
    project.finalTitle && project.finalTitle !== "-"
      ? project.finalTitle
      : project.title;

  verificationAuditLog.unshift({
    regNo: project.regNo,
    initialTitle: project.title,
    finalTitle: finalTitle,
    dept: project.dept,
    method: project.method,
    matchStatus:
      project.deliverableFile && project.deliverableFile !== "-"
        ? "MATCH & VALID"
        : "INCOMPLETE",
    verdict: verdict,
    verdictClass: verdictClass,
    comment: comment || "-",
    verifier: "CI Administrator",
    verifiedAt: dateStr,
  });

  persistAuditLog();
}

function exportVerificationMatrixCSV() {
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent +=
    "No. Reg,Departemen,Metode,Tema Awal (Registrasi),Tema Akhir (Deliverable),Status Match,Hasil Verifikasi,Catatan Verifikator CI,Verifikator,Waktu Verifikasi\n";

  verificationAuditLog.forEach((log) => {
    const row = [
      `"${log.regNo}"`,
      `"${log.dept}"`,
      `"${log.method}"`,
      `"${log.initialTitle}"`,
      `"${log.finalTitle}"`,
      `"${log.matchStatus}"`,
      `"${log.verdict}"`,
      `"${log.comment}"`,
      `"${log.verifier}"`,
      `"${log.verifiedAt}"`,
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `CI_Verification_Matrix_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// 9. KONTROL SESI & INISIALISASI APLIKASI
// ==========================================
function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
    localStorage.removeItem("binnovate_user_role");
    window.location.href = "login.html";
  }
}

function initApp() {
  const savedRole = localStorage.getItem("binnovate_user_role");
  if (!savedRole) {
    window.location.href = "login.html";
    return;
  }

  currentUserRole = savedRole;

  const regDateEl = document.getElementById("regDate");
  if (regDateEl) regDateEl.value = new Date().toISOString().slice(0, 10);

  switchUserRole(currentUserRole);
}

window.addEventListener("DOMContentLoaded", initApp);

// Fungsi untuk menampilkan formulir pendaftaran peserta
function openBerkasDetail(regNo) {
  // 1. Cari data proyek berdasarkan Nomor Registrasi
  const project = projectList.find((p) => p.regNo === regNo);
  if (!project) {
    alert("Data proyek dengan No. Reg " + regNo + " tidak ditemukan!");
    return;
  }

  // 2. Buat atau ambil elemen modal
  let modal = document.getElementById("berkasModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "berkasModal";
    modal.style.cssText =
      "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999;";
    document.body.appendChild(modal);
  }

  // 3. Tampilkan isi formulir pendaftaran peserta
  modal.innerHTML = `
    <div style="background:#fff; width:90%; max-width:650px; max-height:85vh; overflow-y:auto; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,0.2); position:relative; font-family:sans-serif;">
      <button onclick="closeBerkasModal()" style="position:absolute; top:16px; right:16px; border:none; background:#f1f5f9; width:32px; height:32px; border-radius:50%; font-weight:bold; cursor:pointer;">✕</button>

      <h3 style="margin-top:0; color:#1e293b; border-bottom:2px solid #e2e8f0; padding-bottom:12px; font-size:18px;">
        📋 Formulir Pendaftaran Peserta (${project.regNo})
      </h3>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:13px; margin-bottom:16px;">
        <div><b style="color:#64748b;">No. Registrasi:</b><br><span style="color:#0284c7; font-weight:700;">${project.regNo}</span></div>
        <div><b style="color:#64748b;">Tanggal Reg:</b><br><span>${project.regDate || "-"}</span></div>
        <div><b style="color:#64748b;">Nama Peserta / Leader:</b><br><span>${project.owner || "-"}</span></div>
        <div><b style="color:#64748b;">Departemen:</b><br><span>${project.dept || "-"}</span></div>
        <div><b style="color:#64748b;">Metode CI:</b><br><span>${project.method || "-"}</span></div>
        <div><b style="color:#64748b;">Status Approval:</b><br><span>${project.status || "-"}</span></div>
      </div>

      <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:12px; font-size:13px;">
        <b style="color:#334155;">Judul / Tema Project:</b>
        <p style="margin:4px 0 0 0; font-weight:600; color:#0f172a;">${project.title || "-"}</p>
      </div>

      <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:12px; font-size:13px;">
        <b style="color:#334155;">Latar Belakang / Problem Statement:</b>
        <p style="margin:4px 0 0 0; color:#475569;">${project.problemStatement || project.deskripsi || "Belum ada detail"}</p>
      </div>

      <div style="text-align:right; margin-top:20px;">
        <button onclick="closeBerkasModal()" style="padding:8px 20px; background:#64748b; color:#fff; border:none; border-radius:6px; font-weight:600; cursor:pointer;">Tutup</button>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeBerkasModal() {
  const modal = document.getElementById("berkasModal");
  if (modal) modal.style.display = "none";
}
