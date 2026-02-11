// State Management
let state = {
  tournamentName: "",
  numGroups: 4,
  teamsPerGroup: 4,
  qualifiersPerGroup: 2,
  groups: [], // [{ name: 'Grupo A', teams: [], matches: [] }]
  bracket: [], // [{ roundName: 'Quartas', matches: [] }]
  currentView: "setup",
};

// DOM Elements
const views = {
  setup: document.getElementById("view-setup"),
  groups: document.getElementById("view-groups"),
  brackets: document.getElementById("view-brackets"),
};

const navItems = document.querySelectorAll(".nav-item");
const setupForm = document.getElementById("setup-form");
const groupsContainer = document.getElementById("groups-container");
const bracketsContainer = document.getElementById("brackets-container");
const modalMatch = document.getElementById("modal-match");
const modalClose = modalMatch.querySelector(".close");

// --- Initialization ---
function init() {
  loadState();
  setupEventListeners();
  updateUI();
}

function setupEventListeners() {
  // Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.id === "nav-groups" && state.groups.length === 0) return;
      if (item.id === "nav-brackets" && state.bracket.length === 0) return;

      const viewName = item.dataset.view;
      switchView(viewName);
    });
  });

  // Form Setup
  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const config = {
      name: document.getElementById("tournament-name").value,
      groups: parseInt(document.getElementById("num-groups").value),
      teams: parseInt(document.getElementById("teams-per-group").value),
      qualifiers: parseInt(
        document.getElementById("qualifiers-per-group").value,
      ),
      teamNames: document.getElementById("team-names-list").value.split("\n").filter(n => n.trim() !== "")
    };
    if (config.qualifiers > config.teams) {
      alert("O número de classificados não pode ser maior que o número de times por grupo!");
      return;
    }
    
    // Check if total teams provided matches total needed
    const totalNeeded = config.groups * config.teams;
    if (config.teamNames.length > 0 && config.teamNames.length < totalNeeded) {
        if (!confirm(`Você forneceu ${config.teamNames.length} nomes, mas o torneio precisa de ${totalNeeded}. Os times restantes terão nomes genéricos. Continuar?`)) return;
    }

    startTournament(config);
  });

  // Reset
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (
      confirm(
        "Tem certeza que deseja reiniciar o campeonato? Todos os dados serão perdidos.",
      )
    ) {
      localStorage.removeItem("elite_championship_state");
      location.reload();
    }
  });

  // Generate Bracket
  document
    .getElementById("generate-bracket-btn")
    .addEventListener("click", generateBracket);

  // Modal Close
  modalClose.onclick = () => (modalMatch.style.display = "none");
  window.onclick = (event) => {
    if (event.target == modalMatch) modalMatch.style.display = "none";
  };
}

// --- Core Functions ---

function startTournament(config) {
  state.tournamentName = config.name;
  state.numGroups = config.groups;
  state.teamsPerGroup = config.teams;
  state.qualifiersPerGroup = config.qualifiers;
  state.groups = [];
  state.bracket = [];

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  
  // Prepare all team names
  let allTeams = [...config.teamNames];
  const totalTeams = state.numGroups * state.teamsPerGroup;
  
  // Fill with generic names if needed
  while (allTeams.length < totalTeams) {
    allTeams.push(`Time ${allTeams.length + 1}`);
  }

  // Shuffle all teams globally before distributing to groups
  for (let i = allTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTeams[i], allTeams[j]] = [allTeams[j], allTeams[i]];
  }

  let teamIndex = 0;
  for (let i = 0; i < state.numGroups; i++) {
    const groupLabel = i < 26 ? alphabet[i] : (i + 1).toString();
    const groupName = `Grupo ${groupLabel}`;
    const teams = [];
    
    for (let j = 0; j < state.teamsPerGroup; j++) {
      teams.push({
        id: `t-${i}-${j}`,
        name: allTeams[teamIndex++],
        pts: 0,
        pj: 0,
        v: 0,
        e: 0,
        d: 0,
        gp: 0,
        gc: 0,
        sg: 0,
      });
    }

    // Shuffle teams before creating matches
    for (let x = teams.length - 1; x > 0; x--) {
      const j = Math.floor(Math.random() * (x + 1));
      [teams[x], teams[j]] = [teams[j], teams[x]];
    }

    // Generate Round Robin matches using Circle Method (Berger Table)
    let schedulingTeams = [...teams];
    if (schedulingTeams.length % 2 !== 0) {
      schedulingTeams.push({ id: "bye", name: "BYE" });
    }

    const n = schedulingTeams.length;
    const rounds = n - 1;
    const matchesPerRound = n / 2;
    const matches = [];

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < matchesPerRound; i++) {
        const t1 = schedulingTeams[i];
        const t2 = schedulingTeams[n - 1 - i];

        if (t1.id !== "bye" && t2.id !== "bye") {
          matches.push({
            id: `m-${state.groups.length}-${round}-${i}`,
            team1Id: t1.id,
            team2Id: t2.id,
            score1: null,
            score2: null,
            played: false,
          });
        }
      }
      // Rotate teams (keep the first team fixed)
      schedulingTeams.splice(1, 0, schedulingTeams.pop());
    }

    state.groups.push({
      name: groupName,
      teams,
      matches,
    });
  }

  state.currentView = "groups";
  saveState();
  updateUI();
}

function updateUI() {
  // Update Sidebar states
  document.getElementById("nav-groups").style.opacity =
    state.groups.length > 0 ? "1" : "0.5";
  document.getElementById("nav-brackets").style.opacity =
    state.bracket.length > 0 ? "1" : "0.5";

  // Update Active Nav
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === state.currentView);
  });

  // Update Views
  Object.keys(views).forEach((key) => {
    views[key].classList.toggle("active", key === state.currentView);
  });

  if (state.currentView === "groups") renderGroups();
  if (state.currentView === "brackets") renderBrackets();

  document.getElementById("display-tournament-name").textContent =
    state.tournamentName || "Grupos";
}

function switchView(viewName) {
  state.currentView = viewName;
  saveState();
  updateUI();
}

// --- Rendering ---

function renderGroups() {
  groupsContainer.innerHTML = "";
  state.groups.forEach((group, gIdx) => {
    const sortedTeams = [...group.teams].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      return b.gp - a.gp;
    });

    const card = document.createElement("div");
    card.className = "group-card animate-in";
    card.innerHTML = `
            <div class="group-header">
                <span class="group-title">${group.name}</span>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th class="pos-col">#</th>
                            <th class="team-col">Equipe</th>
                            <th class="pts-col">P</th>
                            <th class="stats-col">J</th>
                            <th class="stats-col">V</th>
                            <th class="stats-col">SM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTeams
                          .map(
                            (team, idx) => `
                            <tr class="${idx < state.qualifiersPerGroup ? "qualifier-row" : ""}">
                                <td class="pos-col">${idx + 1}</td>
                                <td class="team-col">${team.name}</td>
                                <td class="pts-col">${team.pts}</td>
                                <td class="stats-col">${team.pj}</td>
                                <td class="stats-col">${team.v}</td>
                                <td class="stats-col">${team.sg}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            <div class="group-matches">
                ${group.matches
                  .map((match) => {
                    const t1 = group.teams.find((t) => t.id === match.team1Id);
                    const t2 = group.teams.find((t) => t.id === match.team2Id);
                    return `
                        <div class="match-item" onclick="openMatchModal('${gIdx}', '${match.id}')">
                            <span>${t1.name}</span>
                            <span class="match-score">${match.played ? `${match.score1} - ${match.score2}` : "vs"}</span>
                            <span>${t2.name}</span>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
            <div class="table-legend">
                <span>P: Pontos</span> <span class="separator">•</span>
                <span>J: Jogos</span> <span class="separator">•</span>
                <span>V: Vitórias</span> <span class="separator">•</span>
                <span>SM: Saldo de Mapas</span>
            </div>
        `;
    groupsContainer.appendChild(card);
  });
}

function renameTeam(groupIndex, teamId) {
  const group = state.groups[groupIndex];
  const team = group.teams.find((t) => t.id === teamId);
  const newName = prompt("Novo nome para a equipe:", team.name);
  if (newName && newName.trim()) {
    team.name = newName.trim();
    saveState();
    renderGroups();
  }
}

function openMatchModal(groupIdx, matchId) {
  const group = state.groups[groupIdx];
  const match = group.matches.find((m) => m.id === matchId);
  const t1 = group.teams.find((t) => t.id === match.team1Id);
  const t2 = group.teams.find((t) => t.id === match.team2Id);

  document.getElementById("modal-team1-name").textContent = t1.name;
  document.getElementById("modal-team2-name").textContent = t2.name;

  // Load existing map scores if available
  const maps = match.maps || [{}, {}, {}];
  document.getElementById("score1_m1").value = maps[0].s1 || "";
  document.getElementById("score2_m1").value = maps[0].s2 || "";
  document.getElementById("score1_m2").value = maps[1].s1 || "";
  document.getElementById("score2_m2").value = maps[1].s2 || "";
  document.getElementById("score1_m3").value = maps[2].s1 || "";
  document.getElementById("score2_m3").value = maps[2].s2 || "";

  modalMatch.style.display = "flex";

  document.getElementById("save-match-btn").onclick = () => {
    // Read map scores
    const m1s1 = parseInt(document.getElementById("score1_m1").value) || 0;
    const m1s2 = parseInt(document.getElementById("score2_m1").value) || 0;
    const m2s1 = parseInt(document.getElementById("score1_m2").value) || 0;
    const m2s2 = parseInt(document.getElementById("score2_m2").value) || 0;
    const m3s1 = parseInt(document.getElementById("score1_m3").value) || 0;
    const m3s2 = parseInt(document.getElementById("score2_m3").value) || 0;

    let t1Wins = 0;
    let t2Wins = 0;

    // Determine map winners
    if (m1s1 > m1s2) t1Wins++;
    if (m2s1 > m2s2) t1Wins++;
    if (m1s2 > m1s1) t2Wins++;
    if (m2s2 > m2s1) t2Wins++;
    
    // Check if Map 3 was needed/played
    // Logic: If 2-0, Map 3 matters less for win, but maybe for SR.
    // User said: "caso o mesmo time ganhar os 2 mapas não tem o terceiro"
    // So usually user won't fill map 3 if 2-0.
    if ((t1Wins < 2 && t2Wins < 2) || (m3s1 > 0 || m3s2 > 0)) {
       if (m3s1 > m3s2) t1Wins++;
       if (m3s2 > m3s1) t2Wins++;
    }

    // Update match data
    match.played = true;
    match.score1 = t1Wins; // Series Score (e.g. 2)
    match.score2 = t2Wins; // Series Score (e.g. 1)
    
    match.maps = [
        { s1: m1s1, s2: m1s2 },
        { s1: m2s1, s2: m2s2 },
        { s1: m3s1, s2: m3s2 }
    ];

    recalculateStandings(groupIdx);
    modalMatch.style.display = "none";
    saveState();
    renderGroups();
  };
}

function recalculateStandings(groupIdx) {
  const group = state.groups[groupIdx];

  // Reset stats
  group.teams.forEach((t) => {
    t.pts = 0;
    t.pj = 0;
    t.v = 0;
    t.e = 0; // Not used in Bo3 usually
    t.d = 0;
    t.gp = 0; // Rounds Won
    t.gc = 0; // Rounds Lost
    t.sg = 0; // Round Diff
  });

  group.matches
    .filter((m) => m.played)
    .forEach((m) => {
      const t1 = group.teams.find((t) => t.id === m.team1Id);
      const t2 = group.teams.find((t) => t.id === m.team2Id);

      t1.pj++;
      t2.pj++;

      // Calculate Rounds (GP/GC) from Maps
      if (m.maps) {
          m.maps.forEach(map => {
              const s1 = map.s1 || 0;
              const s2 = map.s2 || 0;
              t1.gp += s1;
              t2.gp += s2;
              t1.gc += s2;
              t2.gc += s1;
          });
      } else {
          // Fallback legacy (should not happen for new matches)
          t1.gp += m.score1;
          t2.gp += m.score2;
          t1.gc += m.score2;
          t2.gc += m.score1;
      }

      // SR (Saldo de Rounds) agora reflete o Saldo de Mapas (2x0 = +2)
      t1.sg += m.score1 - m.score2;
      t2.sg += m.score2 - m.score1;

      if (m.score1 > m.score2) {
        t1.pts += 3;
        t1.v++;
        t2.d++;
      } else {
        t2.pts += 3;
        t2.v++;
        t1.d++;
      }
    });
}

// --- Bracket Logic ---

function generateBracket() {
  const qualifiers = [];

  // Determine who qualified from each group
  state.groups.forEach((group) => {
    const sorted = [...group.teams].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      return b.gp - a.gp;
    });

    for (let i = 0; i < state.qualifiersPerGroup; i++) {
      qualifiers.push({ ...sorted[i], sourceGroup: group.name, rank: i + 1 });
    }
  });

  // Create the bracket structure based on qualifiers count
  // Supported counts: 2 (Final), 4 (Semis), 8 (Quartas), 16 (Oitavas)
  const count = qualifiers.length;
  let roundsNeeded = Math.log2(count);

  if (!Number.isInteger(roundsNeeded)) {
    alert(
      "A quantidade de classificados deve ser uma potência de 2 (2, 4, 8, 16) para gerar as eliminatórias corretamente.",
    );
    return;
  }

  state.bracket = [];

  // Initial matches (Round 1 of Bracket)
  const round1 = {
    name: getRoundName(count),
    matches: [],
  };

  // Simple pairing: 1st vs Last (usually should be cross-group)
  // For 4 groups/2 qualifiers = 8 teams. Typical: A1 vs B2, B1 vs A2, etc.
  if (state.numGroups === 4 && state.qualifiersPerGroup === 2) {
    // A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2
    const seed = (g1, r1, g2, r2) => {
      const t1 = state.groups[g1].teams.sort((a, b) => b.pts - a.pts)[r1 - 1];
      const t2 = state.groups[g2].teams.sort((a, b) => b.pts - a.pts)[r2 - 1];
      return {
        team1: { ...t1 },
        team2: { ...t2 },
        score1: null,
        score2: null,
        played: false,
        winner: null,
      };
    };
    round1.matches.push(seed(0, 1, 1, 2)); // A1 vs B2
    round1.matches.push(seed(2, 1, 3, 2)); // C1 vs D2
    round1.matches.push(seed(1, 1, 0, 2)); // B1 vs A2
    round1.matches.push(seed(3, 1, 2, 2)); // D1 vs C2
  } else {
    // Default random/simple pairing
    for (let i = 0; i < count; i += 2) {
      round1.matches.push({
        team1: qualifiers[i],
        team2: qualifiers[i + 1],
        score1: null,
        score2: null,
        played: false,
        winner: null,
      });
    }
  }

  state.bracket.push(round1);

  // Create empty subsequent rounds
  let currentCount = count / 2;
  while (currentCount >= 1) {
    if (currentCount === 1) break;
    currentCount /= 2;
    state.bracket.push({
      name: getRoundName(currentCount * 2),
      matches: Array(currentCount)
        .fill(null)
        .map(() => ({
          team1: { name: "?" },
          team2: { name: "?" },
          score1: null,
          score2: null,
          played: false,
          winner: null,
        })),
    });
  }

  // Add final round name properly
  if (state.bracket[state.bracket.length - 1].matches.length === 1) {
    state.bracket[state.bracket.length - 1].name = "Final";
  }

  state.currentView = "brackets";
  saveState();
  updateUI();
}

function getRoundName(teamsCount) {
  if (teamsCount === 2) return "Final";
  if (teamsCount === 4) return "Semifinais";
  if (teamsCount === 8) return "Quartas de Final";
  if (teamsCount === 16) return "Oitavas de Final";
  return `Rodada de ${teamsCount}`;
}

function renderBrackets() {
  bracketsContainer.innerHTML = "";
  state.bracket.forEach((round, rIdx) => {
    const roundEl = document.createElement("div");
    roundEl.className = "round";
    roundEl.innerHTML = `<div class="round-title">${round.name}</div>`;

    round.matches.forEach((match, mIdx) => {
      const matchEl = document.createElement("div");
      matchEl.className = "bracket-match animate-in";
      matchEl.innerHTML = `
                <div class="bracket-team ${match.winner === 1 ? "winner" : ""}" onclick="openBracketMatchModal(${rIdx}, ${mIdx}, 1)">
                    <span>${match.team1.name}</span>
                    <span class="bracket-score">${match.played ? match.score1 : "-"}</span>
                </div>
                <div class="bracket-vs">vs</div>
                <div class="bracket-team ${match.winner === 2 ? "winner" : ""}" onclick="openBracketMatchModal(${rIdx}, ${mIdx}, 2)">
                    <span>${match.team2.name}</span>
                    <span class="bracket-score">${match.played ? match.score2 : "-"}</span>
                </div>
            `;
      roundEl.appendChild(matchEl);
    });
    bracketsContainer.appendChild(roundEl);
  });
}

function openBracketMatchModal(rIdx, mIdx) {
  const match = state.bracket[rIdx].matches[mIdx];
  if (match.team1.name === "?" || match.team2.name === "?") return;

  document.getElementById("modal-team1-name").textContent = match.team1.name;
  document.getElementById("modal-team2-name").textContent = match.team2.name;
  
  // Load maps
  const maps = match.maps || [{}, {}, {}];
  document.getElementById("score1_m1").value = maps[0].s1 || "";
  document.getElementById("score2_m1").value = maps[0].s2 || "";
  document.getElementById("score1_m2").value = maps[1].s1 || "";
  document.getElementById("score2_m2").value = maps[1].s2 || "";
  document.getElementById("score1_m3").value = maps[2].s1 || "";
  document.getElementById("score2_m3").value = maps[2].s2 || "";

  modalMatch.style.display = "flex";

  document.getElementById("save-match-btn").onclick = () => {
    // Read map scores
    const m1s1 = parseInt(document.getElementById("score1_m1").value) || 0;
    const m1s2 = parseInt(document.getElementById("score2_m1").value) || 0;
    const m2s1 = parseInt(document.getElementById("score1_m2").value) || 0;
    const m2s2 = parseInt(document.getElementById("score2_m2").value) || 0;
    const m3s1 = parseInt(document.getElementById("score1_m3").value) || 0;
    const m3s2 = parseInt(document.getElementById("score2_m3").value) || 0;

    let t1Wins = 0;
    let t2Wins = 0;

    // Determine map winners
    if (m1s1 > m1s2) t1Wins++;
    if (m2s1 > m2s2) t1Wins++;
    if (m1s2 > m1s1) t2Wins++;
    if (m2s2 > m2s1) t2Wins++;
    
    // Check Map 3
    if ((t1Wins < 2 && t2Wins < 2) || (m3s1 > 0 || m3s2 > 0)) {
       if (m3s1 > m3s2) t1Wins++;
       if (m3s2 > m3s1) t2Wins++;
    }

    if (t1Wins === t2Wins) {
       alert("O confronto terminou empatado em mapas! Verifique os placares.");
       return;
    }

    match.score1 = t1Wins; // Series Score (e.g. 2)
    match.score2 = t2Wins; // Series Score (e.g. 1)
    match.played = true;
    match.winner = t1Wins > t2Wins ? 1 : 2;
    
    match.maps = [
        { s1: m1s1, s2: m1s2 },
        { s1: m2s1, s2: m2s2 },
        { s1: m3s1, s2: m3s2 }
    ];

    const winnerTeam = t1Wins > t2Wins ? match.team1 : match.team2;

    // Advance winner to next round or check for final champion
    if (rIdx + 1 < state.bracket.length) {
      const nextRound = state.bracket[rIdx + 1];
      const nextMatchIdx = Math.floor(mIdx / 2);
      const nextTeamPos = mIdx % 2 === 0 ? "team1" : "team2";
      nextRound.matches[nextMatchIdx][nextTeamPos] = winnerTeam;
    } else if (state.bracket[rIdx].name === "Final") {
      // It's the final round!
      setTimeout(() => {
        alert(`🏆 PARABÉNS! 🏆\n\nO grande campeão é:\n${winnerTeam.name.toUpperCase()}`);
      }, 500);
    }

    modalMatch.style.display = "none";
    saveState();
    renderBrackets();
  };
}

// --- Persistence ---

function saveState() {
  localStorage.setItem("elite_championship_state", JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem("elite_championship_state");
  if (saved) {
    state = JSON.parse(saved);
  }
}

// Run
init();
