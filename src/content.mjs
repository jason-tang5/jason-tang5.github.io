// all the text about me that shows up on the desktop.
// career stuff was checked against my resume on 2026-09-24.
export const profile = {
  name: 'Jason Tang',
  subtitle: 'Computer Engineering @ UofT',
  intro: 'Hi, I’m Jason — a Computer Engineering student at UofT and former software engineering intern at AMD. I like building useful tools, learning new technologies, and digging into complex problems.',
  links: {
    linkedin: 'https://www.linkedin.com/in/jason-tang-uoft/',
    github: 'https://github.com/jason-tang5',
  },
  bio: 'When I’m not building, I’m usually playing some sport, at the gym, or learning some random skill.',
  education: 'BASc, Computer Engineering · September 2023 – May 2028',
  skills: ['Python', 'TypeScript', 'JavaScript', 'Rust', 'C++', 'Ruby', 'SQL', 'Vue.js', 'Node.js', 'PostgreSQL', 'CUDA', 'Verilog'],
  // best lifts in lb, shown in a small group box at the bottom of the about window
  lifts: [
    ['Power clean', '265'],
    ['Squat', '405'],
    ['Bench', '265'],
    ['Pull-up', '+100'],
  ],
};

// the breakout game in the contact window spells this out
export const contact = { email: 'jasontcanada@gmail.com' };

// **text** in a bullet is bold, the same spots the resume pdf bolds
export const roles = [
  {
    company: 'AMD',
    role: 'Software Engineer Intern',
    location: 'Toronto, ON',
    dates: 'May 2025 – August 2026',
    bullets: [
      'Developed and scaled an internal regression-management platform used by **2,000+ engineers**, supporting **3.1M tests** per month across Vue, TypeScript, Node.js/Express, Ruby, and PostgreSQL.',
      'Built IBM LSF lifecycle services to improve reliability and recovery for **239K jobs per month**, reconciling scheduler and application state across timeouts, failures, and abnormal terminations.',
      'Developed an authenticated **TypeScript MCP** integration, enabling **100+ engineers** to execute **10K+ monthly** AI-assisted operations for failure investigation, coverage analysis, and controlled regression workflows.',
      'Built an AI debugging agent that correlated logs, scheduler events, and regression metadata, reducing initial failure triage from **15–30 minutes to approximately 30 seconds**.',
      'Automated deployment workflows with Python, Ruby, and Jenkins, saving **20+ engineering hours per week** and shortening release cycles by **30%**.',
      'Architected version-control abstractions and validation workflows for a **113-repository** Perforce-to-Git migration, preserving traceability for **1.4M+** historical regression runs.',
    ],
  },
  {
    company: 'U+ Education',
    role: 'Web Developer',
    location: 'Ottawa, ON',
    dates: 'June – September 2023',
    bullets: [
      'Designed and launched two responsive WordPress websites serving **100+ customers**, with reusable layouts and streamlined content-management workflows.',
      'Improved page-load performance by **30%** and increased organic traffic by **over 50%** through performance optimization, technical SEO, and analytics-driven content updates.',
    ],
  },
  {
    company: 'Digitera Interactive',
    role: 'Full-stack Developer Intern',
    location: 'Ottawa, ON',
    dates: 'June – September 2020',
    bullets: [
      'Developed an event-planning application prototype with event creation, scheduling, attendee registration, and account management using **HTML, CSS, JavaScript, and MySQL**.',
      'Designed the **MySQL** database structure and implemented form validation, filtering, and error handling for reliable CRUD operations.',
    ],
  },
];

export const projects = [
  {
    id: 'portfolio',
    name: 'Portfolio Website',
    kind: 'Web development',
    date: 'September 2026',
    icon: 'computer',
    tech: ['Vue', 'JavaScript', 'Cloudflare Workers', 'Durable Objects', 'Workers KV', 'Vite', 'Playwright'],
    // interactive figures under these sections, see PortfolioFigures.vue
    figures: { built: 'apps', implementation: 'stack', results: 'live' },
    summary: 'This site: a portfolio dressed up as a Windows 95 desktop, with games, a CD player, a blog and live analytics.',
    contribution: 'Designed and built a Windows 95 style desktop in Vue and Vite, with draggable, resizable windows, a taskbar and start menu, folders, a light and dark theme, and a separate touch layout for phones. Inside it are apps that go past a typical portfolio: Breakout in an arcade cabinet that reveals my email when you clear it, Snake on a handheld with a world leaderboard, Minesweeper, Reversi against a trash-talking Clippy, a Spotify CD player with a music visualizer, sticky notes and a blog.',
    implementation: [
      'The window manager keeps every window inside the screen at its minimum size, remembers where windows were left, and links to any window through the URL. The window geometry is plain JavaScript with no Vue in it, so it is unit tested in Node.',
      'A Cloudflare Worker serves the static build and runs the API. The contact form sends email through Cloudflare Email Routing, blog posts are saved to Workers KV and written from the site itself behind Cloudflare Access, and videos go through the worker so Safari gets the range requests it needs to play them.',
      'A SQLite Durable Object keeps the live scoreboard: total visits, who is online now, game wins, and the Snake leaderboard over the last 7 and 30 days and all time. Leaderboard names are checked in the browser and again in the worker with a profanity filter that sees through letter swaps.',
      'Anonymous, cookie-free visit analytics are recorded in Workers Analytics Engine and read back with its SQL API into an Analytics window with 7, 30 and 90 day views. Nothing is sent until the first click or key press, which keeps bots and link previews out of the numbers.',
      'The retro details are generated rather than loaded: UI sounds come from Web Audio with no sound files, the game backdrops are animated ASCII, and phones get haptic feedback, even on iPhones through a hidden switch that triggers Safari’s haptic tick.',
    ],
    outcomes: [
      'Deployed on Cloudflare Workers, with every push to main going live automatically.',
      'Unit tests for the worker, window geometry and games, plus Playwright browser checks that click through every app at desktop and phone sizes.',
      'Respects reduced motion and works with a keyboard and screen reader, with labelled controls and status announcements in the games.',
    ],
  },
  {
    id: 'mini-ml',
    name: 'Mini ML Framework',
    kind: 'Machine learning',
    date: 'August 2026',
    icon: 'chip',
    tech: ['Rust', 'CUDA', 'TypeScript', 'PyTorch', 'TensorFlow'],
    summary: 'A custom ML framework, from tensors to GPU-accelerated training.',
    contribution: 'Built multidimensional tensors, reverse-mode automatic differentiation, CPU/CUDA backends, and TypeScript bindings for training and inference.',
    implementation: 'Validated tensor operations, gradients, and optimizer behavior against PyTorch and TensorFlow using cross-framework correctness tests. Developed custom CUDA kernels for elementwise operations and reductions.',
    outcomes: [
      'Trained a 235K-parameter MLP on MNIST to 97.4% test accuracy using cross-entropy loss and Adam.',
      'Reduced training time from 4.1s to 1.3s per epoch: a 3.2× speedup over the CPU backend.',
    ],
  },
  {
    id: 'fpga-2048',
    name: 'FPGA 2048',
    kind: 'Digital hardware',
    date: 'September 2024',
    icon: '2048',
    tech: ['Verilog', 'VHDL', 'Quartus', 'ModelSim'],
    // opens the playable version in the games folder
    game: '2048',
    // interactive figures under these sections, see FpgaFigures.vue
    // the implementation list can drop them in between its paragraphs too
    figures: { built: 'register' },
    summary: 'The tile-merging game, implemented in hardware on a DE1-SoC.',
    contribution: 'Built an FPGA implementation of 2048 in Verilog, rendered to a 160 × 120 VGA display at 60 Hz through a custom VGA adapter.',
    implementation: [
      'Implemented tile movement, merging, and scoring using a modular datapath and FSM controller. Verified the design through ModelSim testbenches, Tcl simulations, and physical I/O.',
      'Drawing starts in memory. Each tile, 2 up to 2048, is a sprite in on-chip ROM. Multiplexers pick which sprite to draw and which cell it goes in, registers hold that cell’s corner, and row and column counters sweep across the tile one pixel at a time into the VGA adapter, in 8 colours.',
      { figure: 'datapath' },
      'Moving the tiles works on the board register directly. A slide happens in two steps: equal tiles combine, skipping any gaps between them, then everything compacts to the side it was pushed toward.',
      { figure: 'slide' },
      'Moves come from a PS/2 keyboard. Each key sends a make code when it goes down, then a break code (F0) and the key again when it comes up. A one-hot FSM turns W, A, S and D into 0001, 0010, 0100 and 1000, and a gap state swallows the extra break code so one press is one move.',
      { figure: 'fsm' },
      'The hardest part was integration. Modules built on their own disagreed on wire widths, and even on bit order: [0:63] in one, [63:0] in another.',
      'The Games folder has a version rebuilt for the browser from the same design, with the game over check and sliding animation we listed as next steps.',
    ],
    lessons: 'Integrate early. Every module passed its own testbench, but the bugs lived in the wires between them: widths that didn’t match and buses numbered in opposite directions. Next time I’d agree on the interfaces first and wire the modules together while they’re still small.',
    funFact: 'The presentation for this project was due the same day as my interview with AMD, so I presented it to my interviewer as well! It went well enough, I spent the next 16 months interning there.',
  },
  {
    id: 'reversi-ai',
    name: 'Reversi AI Bot',
    kind: 'Game AI',
    date: 'February 2024',
    icon: 'reversi',
    tech: ['C'],
    // opens the playable version in the games folder
    game: 'reversi',
    summary: 'A reversi clone in the terminal built in C with an AI opponent for my computer fundamentals (aps105) course.',
    contribution: 'Created a reversi clone in C with core game logic and responsive user input handling, then developed an opponent using heuristic-based algorithms to evaluate potential game states each move.',
    // a list is shown as separate paragraphs, with { figure } entries from ReversiFigures.vue between them
    implementation: [
      'The bot scores candidate moves by board position, mobility, and corner control, looking ahead at how the opponent can respond.',
      'The original source code is unfortunately lost, so the version in the Games folder recreates it from scratch, with Clippy talking smack in the background while you play. The figures below run that version’s bot.',
      'Board position starts from a table of weights. Corners are worth the most, since a disc there can never be flipped back. The squares touching an empty corner are the worst, since playing one usually hands the corner over.',
      { figure: 'weights' },
      'To score a move, the bot plays it on a copy of the board and adds up the weights of the squares each side holds, its mobility (how many moves it keeps against how many it leaves you), and the corners it owns. With 13 or fewer empty squares left, it counts discs too.',
      { figure: 'eval' },
      'The move that scores best right now can still be a mistake. The bot looks ahead with minimax: for each of its moves it assumes you answer with the reply that hurts it most, then plays the move whose worst case is best.',
      { figure: 'lookahead' },
    ],
    outcomes: [
      'Achieved a 100% win rate over basic random-move bots.',
      'Maintained an 80% win rate against algorithms developed by other students in the course.',
    ],
  },
];
