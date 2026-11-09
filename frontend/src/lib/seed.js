import { dayKey, shiftKey } from "./time";

export const COURSE_COLORS = {
  CS301: "#06B6D4",
  CS302: "#F97316",
  CS303: "#8B5CF6",
  CS304: "#EC4899",
  CS305: "#84CC16",
  MA301: "#94A3B8",
  CS399: "#F43F5E",
};
const PALETTE = [
  "#06B6D4",
  "#8B5CF6",
  "#F97316",
  "#EC4899",
  "#84CC16",
  "#38BDF8",
  "#F43F5E",
  "#EAB308",
];
export const colorFor = (code = "") =>
  COURSE_COLORS[code] ||
  PALETTE[[...code].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const C = (id, day, start, end, code, name, room, type = "lecture") => ({
  id,
  day,
  start,
  end,
  code,
  name,
  room,
  type,
});

const TIMETABLE = [
  C("t1", 1, "09:00", "10:00", "CS301", "Operating Systems", "LH-204"),
  C(
    "t2",
    1,
    "10:00",
    "11:00",
    "CS302",
    "Computer Organization & Architecture",
    "LH-204",
  ),
  C("t3", 1, "13:00", "14:00", "MA301", "Probability & Statistics", "LH-110"),
  C("t4", 1, "14:00", "16:00", "CS301", "OS Lab (Linux)", "Lab-3", "lab"),
  C(
    "t5",
    2,
    "09:00",
    "10:00",
    "CS303",
    "Data Structures & Algorithms",
    "LH-301",
  ),
  C(
    "t6",
    2,
    "11:00",
    "12:00",
    "CS304",
    "Database Management Systems",
    "LH-301",
  ),
  C("t7", 2, "12:00", "13:00", "CS305", "Machine Learning", "LH-305"),
  C("t8", 2, "15:00", "17:00", "CS303", "DSA Lab", "Lab-1", "lab"),
  C(
    "t9",
    3,
    "08:00",
    "09:00",
    "CS302",
    "Computer Organization & Architecture",
    "LH-204",
  ),
  C("t10", 3, "10:00", "11:00", "CS301", "Operating Systems", "LH-204"),
  C("t11", 3, "13:00", "15:00", "CS305", "ML Lab", "AI-Lab", "lab"),
  C("t12", 3, "16:00", "17:00", "MA301", "Probability & Statistics", "LH-110"),
  C("t13", 4, "09:00", "10:00", "CS305", "Machine Learning", "LH-305"),
  C(
    "t14",
    4,
    "10:00",
    "11:00",
    "CS303",
    "Data Structures & Algorithms",
    "LH-301",
  ),
  C(
    "t15",
    4,
    "12:00",
    "13:00",
    "CS304",
    "Database Management Systems",
    "LH-301",
  ),
  C(
    "t16",
    4,
    "15:00",
    "16:00",
    "CS302",
    "Computer Organization & Architecture",
    "LH-204",
  ),
  C("t17", 5, "09:00", "11:00", "CS304", "DBMS Lab", "Lab-2", "lab"),
  C("t18", 5, "11:00", "12:00", "CS301", "Operating Systems", "LH-204"),
  C(
    "t19",
    5,
    "14:00",
    "15:00",
    "CS303",
    "Data Structures & Algorithms",
    "LH-301",
  ),
  C("t20", 5, "15:00", "16:00", "MA301", "Probability & Statistics", "LH-110"),
  C(
    "t21",
    6,
    "10:00",
    "12:00",
    "CS399",
    "Mini Project Studio",
    "Innovation Hub",
    "lab",
  ),
];

const M = (n, title, progress, topics) => ({ n, title, progress, topics });

const COURSES = [
  {
    id: "CS301",
    code: "CS301",
    name: "Operating Systems",
    modules: [
      M(1, "OS Structure & System Calls", 100, [
        "Kernel modes",
        "syscalls",
        "fork/exec",
      ]),
      M(2, "Process & Thread Scheduling", 90, [
        "FCFS/SJF/RR",
        "MLFQ",
        "context switch",
      ]),
      M(3, "Synchronization", 70, [
        "Mutex",
        "Semaphores",
        "Monitors",
        "Peterson",
      ]),
      M(4, "Deadlocks", 40, [
        "Banker's algorithm",
        "RAG",
        "Prevention vs avoidance",
      ]),
      M(5, "Memory Management", 20, ["Paging", "TLB", "Page replacement LRU"]),
      M(6, "File Systems & I/O", 0, [
        "inodes",
        "journaling",
        "disk scheduling",
      ]),
    ],
    notes:
      "## OS Lab — Linux CLI cheatsheet\n\n```bash\nps aux | grep python      # find processes\ntop -o %CPU               # live CPU usage\nkill -9 <PID>             # force kill\nchmod 755 run.sh          # rwx r-x r-x\nls -la /proc/$$/fd        # open file descriptors\ngcc fork.c -o fork && ./fork\nstrace -c ./a.out         # count syscalls\nvmstat 1 5                # memory + paging stats\n```\n\n- `fork()` returns 0 in child, PID in parent.\n- Zombie = exited child not yet `wait()`-ed.",
  },
  {
    id: "CS302",
    code: "CS302",
    name: "Computer Organization & Architecture",
    modules: [
      M(1, "Number Systems & Data Representation", 100, [
        "IEEE 754",
        "2's complement",
      ]),
      M(2, "Instruction Set Architecture", 80, [
        "Addressing modes",
        "RISC vs CISC",
      ]),
      M(3, "ALU & Datapath", 60, [
        "Booth's multiplication",
        "Carry look-ahead",
      ]),
      M(4, "Pipelining & Hazards", 30, [
        "5-stage MIPS",
        "Forwarding",
        "Branch prediction",
      ]),
      M(5, "Memory Hierarchy & Cache", 10, ["Direct/assoc mapping", "AMAT"]),
      M(6, "I/O & Interrupts", 0, ["DMA", "Polling vs interrupts"]),
    ],
    notes:
      "## COA reference\n\n- AMAT = Hit time + Miss rate × Miss penalty\n- Speedup (pipeline, k stages, n instr) = nk / (k + n − 1)\n- Cache address = | Tag | Index | Offset |\n- Booth: 01 → add M, 10 → subtract M, then arithmetic shift right.",
  },
  {
    id: "CS303",
    code: "CS303",
    name: "Data Structures & Algorithms",
    modules: [
      M(1, "Complexity & Recurrences", 100, ["Big-O", "Master theorem"]),
      M(2, "Arrays, Stacks, Queues, Linked Lists", 100, [
        "Monotonic stack",
        "Two pointers",
      ]),
      M(3, "Trees, BST & Heaps", 85, ["AVL", "Heapify", "Segment tree"]),
      M(4, "Graphs", 55, ["BFS/DFS", "Dijkstra", "Topo sort", "Union-Find"]),
      M(5, "Dynamic Programming", 35, ["Knapsack", "LIS", "Interval DP"]),
      M(6, "Greedy & Advanced", 15, ["Huffman", "MST", "Bit masking"]),
    ],
    notes:
      "## DSA patterns\n\n```cpp\n// Dijkstra O((V+E) log V)\npriority_queue<pii, vector<pii>, greater<pii>> pq;\ndist[src] = 0; pq.push({0, src});\nwhile (!pq.empty()) {\n  auto [d, u] = pq.top(); pq.pop();\n  if (d > dist[u]) continue;\n  for (auto [v, w] : adj[u])\n    if (dist[u] + w < dist[v]) pq.push({dist[v] = dist[u] + w, v});\n}\n```\n\n- DP checklist: state → transition → base case → order.",
  },
  {
    id: "CS304",
    code: "CS304",
    name: "Database Management Systems",
    modules: [
      M(1, "ER Model", 100, ["Cardinality"]),
      M(2, "Relational Algebra & SQL", 75, ["Joins", "Subqueries"]),
      M(3, "Normalization", 50, ["1NF–BCNF"]),
      M(4, "Transactions & Concurrency", 20, ["ACID", "2PL"]),
      M(5, "Indexing & Hashing", 0, ["B+ trees"]),
      M(6, "Recovery", 0, ["WAL", "ARIES"]),
    ],
    notes:
      "## SQL\n\n```sql\nSELECT dept, AVG(salary) FROM emp GROUP BY dept HAVING AVG(salary) > 50000;\n```",
  },
  {
    id: "CS305",
    code: "CS305",
    name: "Machine Learning",
    modules: [
      M(1, "Regression", 100, ["OLS", "Regularization"]),
      M(2, "Classification", 80, ["Logistic", "SVM"]),
      M(3, "Trees & Ensembles", 65, ["RF", "XGBoost"]),
      M(4, "Neural Networks", 45, ["Backprop", "DNN"]),
      M(5, "Unsupervised", 10, ["K-Means", "PCA"]),
      M(6, "Model Evaluation", 30, ["MAE/RMSE", "CV"]),
    ],
    notes:
      "## ML notes\n\n- RMSE punishes large errors more than MAE.\n- XGBoost: tune `max_depth`, `eta`, `subsample`.",
  },
];

function heatmap() {
  let s = 42;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 140 }, (_, i) =>
    i > 125
      ? 1 + Math.floor(rnd() * 6)
      : rnd() < 0.22
        ? 0
        : Math.floor(rnd() * 9),
  );
}

const HEALTH = [
  [-6, 8420, 6.1, 342, 7.5, 8, 4.5],
  [-5, 11230, 8.2, 455, 6.0, 6, 3.0],
  [-4, 6120, 4.4, 251, 5.2, 5, 2.0],
  [-3, 9870, 7.1, 401, 7.8, 9, 5.5],
  [-2, 12450, 9.0, 507, 8.1, 9, 6.0],
  [-1, 4310, 3.1, 176, 6.4, 7, 3.5],
  [0, 6420, 4.6, 262, 7.2, 8, 1.5],
].map(([o, steps, distance, calories, sleep, sharpness, deepWork]) => ({
  date: shiftKey(o),
  steps,
  distance,
  calories,
  sleep,
  sharpness,
  deepWork,
  water: o === 0 ? 1250 : 2000 + ((o * 250) % 750),
}));

export function buildSeed(name, email = "") {
  const today = dayKey();
  const rawUser = typeof localStorage !== "undefined" ? localStorage.getItem("aegis_user") : null;
  let userName = name;
  if (!userName && rawUser) {
    try {
      userName = JSON.parse(rawUser)?.name;
    } catch {}
  }
  userName = userName || "Operator";
  return {
    meta: { version: 1, updated_at: 0, seeded: true },
    profile: { name: userName, email, program: "B.Tech CSE · Sem 5" },
    settings: {
      mode: "normal",
      aiEngine: "emergent",
      aiProvider: "openai",
      aiModels: {
        openai: "gpt-6-luna",
        anthropic: "claude-sonnet-5-5",
        gemini: "gemini-3-flash-preview",
      },
      voiceReplies: false,
      geminiKey: "",
      fitClientId: "",
      github: "torvalds",
      leetcode: "arjun_codes",
      codeforces: "tourist",
      stepGoal: 10000,
      waterGoal: 3000,
      leetTarget: 15,
    },
    tasks: [
      {
        id: "k1",
        title: "Finish OS Assignment 3 — Banker's algorithm",
        priority: "high",
        done: false,
        due: shiftKey(1),
      },
      {
        id: "k2",
        title: "Revise COA pipelining hazards for midterm",
        priority: "high",
        done: false,
        due: shiftKey(3),
      },
      {
        id: "k3",
        title: "Train XGBoost v3 on spatial demand dataset",
        priority: "high",
        done: false,
        due: shiftKey(2),
      },
      {
        id: "k4",
        title: "Solve 3 graph problems (LeetCode)",
        priority: "med",
        done: false,
        due: today,
      },
      {
        id: "k5",
        title: "Submit DBMS lab record",
        priority: "med",
        done: true,
        due: shiftKey(-1),
      },
      {
        id: "k6",
        title: "Edit hackathon showcase video",
        priority: "low",
        done: false,
        due: shiftKey(4),
      },
    ],
    timetable: TIMETABLE,
    courses: COURSES,
    exams: [
      {
        id: "e1",
        course: "CS301",
        title: "OS Quiz 2 — Sync & Deadlocks",
        date: shiftKey(2),
      },
      { id: "e2", course: "CS303", title: "DSA Lab Viva", date: shiftKey(4) },
      {
        id: "e3",
        course: "CS302",
        title: "COA Mid-Semester Exam",
        date: shiftKey(6),
      },
    ],
    quizHistory: [
      { id: "q1", date: shiftKey(-12), subject: "CS301", score: 6, total: 10 },
      { id: "q2", date: shiftKey(-9), subject: "CS303", score: 7, total: 10 },
      { id: "q3", date: shiftKey(-6), subject: "CS302", score: 5, total: 10 },
      { id: "q4", date: shiftKey(-4), subject: "CS301", score: 8, total: 10 },
      { id: "q5", date: shiftKey(-1), subject: "CS303", score: 9, total: 10 },
    ],
    dsa: [
      {
        id: "d1",
        title: "Course Schedule II",
        platform: "LeetCode",
        difficulty: "Medium",
        tags: ["Graph", "Topo Sort"],
        notes: "Kahn's algorithm; cycle if processed < n.",
        code: "queue<int> q; for i: if(indeg[i]==0) q.push(i);",
        solvedAt: shiftKey(-3),
        lastReview: shiftKey(-3),
        stage: 0,
      },
      {
        id: "d2",
        title: "Edit Distance",
        platform: "LeetCode",
        difficulty: "Hard",
        tags: ["DP", "Strings"],
        notes: "dp[i][j] = min(ins, del, rep).",
        code: "dp[i][j] = a[i]==b[j] ? dp[i-1][j-1] : 1+min({...});",
        solvedAt: shiftKey(-10),
        lastReview: shiftKey(-7),
        stage: 1,
      },
      {
        id: "d3",
        title: "Network Delay Time",
        platform: "LeetCode",
        difficulty: "Medium",
        tags: ["Graph", "Dijkstra"],
        notes: "Min-heap on dist; answer = max dist.",
        code: "pq.push({0,k});",
        solvedAt: shiftKey(-1),
        lastReview: shiftKey(-1),
        stage: 0,
      },
      {
        id: "d4",
        title: "Burst Balloons",
        platform: "LeetCode",
        difficulty: "Hard",
        tags: ["DP", "Interval DP"],
        notes: "Pick LAST balloon to burst in (l,r).",
        code: "dp[l][r] = max(dp[l][k]+dp[k][r]+a[l]*a[k]*a[r])",
        solvedAt: shiftKey(-30),
        lastReview: shiftKey(-22),
        stage: 2,
      },
      {
        id: "d5",
        title: "Number of Islands",
        platform: "LeetCode",
        difficulty: "Medium",
        tags: ["Graph", "DFS"],
        notes: "Flood fill, mark visited in-place.",
        code: "void dfs(i,j){ if(out||g[i][j]!='1') return; g[i][j]='0'; ... }",
        solvedAt: shiftKey(-40),
        lastReview: shiftKey(-5),
        stage: 3,
      },
      {
        id: "d6",
        title: "Longest Increasing Subsequence",
        platform: "Codeforces",
        difficulty: "Medium",
        tags: ["DP", "Binary Search"],
        notes: "Patience sorting, O(n log n).",
        code: "auto it = lower_bound(t.begin(), t.end(), x);",
        solvedAt: shiftKey(-8),
        lastReview: shiftKey(-8),
        stage: 0,
      },
    ],
    coding: { heatmap: heatmap(), heatmapEnd: today, leetSolvedWeek: 9 },
    kanban: [
      {
        id: "b1",
        title: "Spatial demand forecasting paper — lit review",
        team: "ML Research",
        col: "doing",
        tag: "Research",
      },
      {
        id: "b2",
        title: "Smart India Hackathon — campus parking API",
        team: "Team Aegis",
        col: "review",
        tag: "Hackathon",
      },
      {
        id: "b3",
        title: "Feature engineering: geo-hash + weather lags",
        team: "ML Research",
        col: "doing",
        tag: "ML",
      },
      {
        id: "b4",
        title: "Pitch deck v2",
        team: "Team Aegis",
        col: "ideas",
        tag: "Hackathon",
      },
      {
        id: "b5",
        title: "Baseline XGBoost submission",
        team: "ML Research",
        col: "done",
        tag: "ML",
      },
      {
        id: "b6",
        title: "Edge deploy on Raspberry Pi",
        team: "Team Aegis",
        col: "ideas",
        tag: "IoT",
      },
    ],
    experiments: [
      {
        id: "x1",
        model: "DNN (4×256, ReLU)",
        dataset: "Spatial Demand v2 (Bengaluru grid)",
        mae: 12.4,
        rmse: 18.9,
        acc: 0.912,
        params: "lr=1e-3, epochs=80, dropout=0.2",
      },
      {
        id: "x2",
        model: "XGBoost",
        dataset: "Spatial Demand v2 (Bengaluru grid)",
        mae: 10.8,
        rmse: 16.2,
        acc: 0.927,
        params: "max_depth=8, eta=0.05, n=900",
      },
      {
        id: "x3",
        model: "Random Forest",
        dataset: "Spatial Demand v2 (Bengaluru grid)",
        mae: 13.9,
        rmse: 20.5,
        acc: 0.894,
        params: "n_estimators=500, max_depth=None",
      },
      {
        id: "x4",
        model: "LSTM (seq=24)",
        dataset: "Spatial Demand v2 (Bengaluru grid)",
        mae: 11.9,
        rmse: 17.6,
        acc: 0.918,
        params: "hidden=128, layers=2",
      },
    ],
    health: {
      days: HEALTH,
      caffeine: [
        {
          id: "c1",
          date: today,
          time: "08:30",
          mg: 95,
          label: "Filter coffee",
        },
        { id: "c2", date: today, time: "16:10", mg: 64, label: "Cold brew" },
      ],
      workouts: [
        { id: "w1", date: shiftKey(-1), type: "Push day (gym)", mins: 50 },
        { id: "w2", date: shiftKey(-3), type: "5K run", mins: 28 },
      ],
    },
    webhooks: [
      {
        id: "h1",
        name: "Ping Test Server",
        url: "https://httpbin.org/post",
        method: "POST",
        payload: '{"source":"aegis","action":"ping"}',
        color: "cyan",
      },
      {
        id: "h2",
        name: "Run Scraper Script",
        url: "https://your-tunnel.ngrok-free.app/run/scraper",
        method: "POST",
        payload: '{"script":"scrape_jobs.py"}',
        color: "violet",
      },
      {
        id: "h3",
        name: "Start Model Training",
        url: "http://100.64.0.12:8000/train",
        method: "POST",
        payload: '{"model":"xgboost","dataset":"spatial_v2"}',
        color: "emerald",
      },
      {
        id: "h4",
        name: "Fetch Server Status",
        url: "https://httpbin.org/get",
        method: "GET",
        payload: "",
        color: "amber",
      },
    ],
    webhookLog: [],
    videos: [
      {
        id: "v1",
        title: "Aegis OS — Building my AI Command Center",
        team: "Solo · React + FastAPI",
        thumb: "I BUILT JARVIS",
        bgm: "Lofi Synthwave — Nightdrive",
        status: "editing",
      },
      {
        id: "v2",
        title: "SIH Hackathon Parking API demo",
        team: "Team Aegis · 4 members",
        thumb: "24H BUILD",
        bgm: "Cinematic Pulse",
        status: "recording",
      },
      {
        id: "v3",
        title: "XGBoost vs DNN on Spatial Demand",
        team: "ML Research · Jupyter",
        thumb: "XGB WINS?",
        bgm: "Ambient Focus 03",
        status: "scripting",
      },
      {
        id: "v4",
        title: "My Linux CLI workflow for OS Lab",
        team: "Solo · Arch + tmux",
        thumb: "TERMINAL GOD",
        bgm: "Chillhop Essentials",
        status: "uploaded",
      },
    ],
    notifications: [
      {
        id: "n1",
        title: "OS Quiz 2 in 2 days",
        body: "Deadlocks module is at 40% — Zero suggests a review block.",
        at: Date.now() - 3600000,
        read: false,
      },
      {
        id: "n2",
        title: "DSA revision due",
        body: "Course Schedule II hit its +3 day review.",
        at: Date.now() - 7200000,
        read: false,
      },
    ],
    chat: [
      {
        id: "m0",
        role: "zero",
        text: "Zero online. I've scanned your timetable, tasks, exams and bio-metrics. Ask me to plan your day, build a study schedule, or break a task into subtasks — I'll hand you 1-click action cards.",
        actions: [],
      },
    ],
  };
}
