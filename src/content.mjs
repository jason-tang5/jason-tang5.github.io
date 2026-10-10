// all the text about me that shows up on the desktop.
// career stuff was checked against my resume on 2026-10-09.
export const profile = {
  name: 'Jason Tang',
  subtitle: 'Computer Engineering @ UofT',
  // typed out one at a time under my name on the about page
  roles: ['Software Engineer', 'Autodidact', 'Problem Solver', 'Tinkerer', 'Get-It-Done Guy', 'Builder', 'Student Athlete', 'Gym Rat?'],
  intro: 'Hi, I’m Jason, a third-year Computer Engineering student at UofT and former software engineering intern at AMD. I like building useful tools, learning new technologies, and digging into complex problems.',
  links: {
    linkedin: 'https://www.linkedin.com/in/jason-tang-uoft/',
    github: 'https://github.com/jason-tang5',
  },
  bio: 'When I’m not building, I’m usually playing some sport, at the gym, or learning some random skill.',
  // the quick facts under the divider on the about page (AboutFacts.vue): work first, then
  // for fun. the text takes *italic* and **bold** like the blog. awards each get a ribbon
  // medal under the fact, and books sets the links in the pixel font with a little book
  facts: [
    {
      label: 'Studying',
      text: 'Comp Eng @ UofT ’28',
      awards: ['Edward S Rogers Sr. Scholarship', 'Faculty of Applied Science and Engineering Scholarship'],
    },
    { label: 'Previously', text: '16-month SWE intern @ AMD, building tooling for 1,000+ engineers' },
    { label: 'Currently building', text: 'LiftLens, a computer vision app that analyzes Olympic lifts and gives technique feedback' },
    { label: 'Sports', text: 'volleyball (captain), ultimate frisbee, badminton' },
    // best lifts in lb, each weight in the pixel font after the lift's name
    { label: 'Lifts (lb)', lifts: [['Power clean', '265'], ['Squat', '405'], ['Bench', '265'], ['Pull-up', '+100']] },
    { label: 'Favorite books', text: '[The Name of the Wind](https://www.goodreads.com/book/show/186074.The_Name_of_the_Wind), [Meditations](https://www.goodreads.com/book/show/30659.Meditations)', books: true },
  ],
  education: 'BASc, Computer Engineering · September 2023 – May 2028',
  skills: ['Python', 'TypeScript', 'JavaScript', 'Rust', 'C++', 'Ruby', 'SQL', 'Vue.js', 'Node.js', 'PostgreSQL', 'CUDA', 'Verilog'],
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
      'Developed and scaled an internal regression-management platform serving **1,000+ engineers** and processing **3.1M tests** monthly, building full-stack features across Vue, TypeScript, Node.js/Express, Ruby, and PostgreSQL.',
      'Reduced failure triage from **15–30 minutes to 30 seconds** by building an **AI debugging agent** that correlated logs, scheduler events, and regression metadata to automatically identify likely root causes.',
      'Improved reliability for **239K jobs per month** by building job lifecycle services that reconcile job state after failures.',
      'Enabled **10K+ monthly AI operations** with an authenticated **TypeScript MCP** integration used by **100+ engineers**.',
      'Automated deployment workflows with Python, Ruby, and Jenkins, saving **20+ engineering hours per week** and shortening release cycles by **30%**.',
      'Secured traceability for **1.4M+ regression runs** with validation workflows for a **113-repository** Perforce-to-Git migration.',
    ],
  },
  {
    company: 'U+ Education',
    role: 'Web Developer',
    location: 'Ottawa, ON',
    dates: 'June – September 2023',
    bullets: [
      'Designed and launched two responsive WordPress websites serving **100+ customers**, with reusable page layouts.',
      'Improved page-load speed by **30%** through image optimization, caching, and lazy loading; grew organic traffic by **50%+** through technical SEO and analytics-driven content updates across both websites.',
      'Spearheaded the company’s **expansion into Ottawa**, launching its local web presence and student outreach.',
    ],
  },
  {
    company: 'Digitera Interactive',
    role: 'Full-stack Developer Intern',
    location: 'Ottawa, ON',
    dates: 'June – September 2020',
    bullets: [
      'Built an event-planning app with scheduling, registration, and accounts using **HTML, CSS, JavaScript, and MySQL**.',
      'Designed the **MySQL** database structure and implemented form validation, filtering, and error handling for reliable CRUD operations.',
      'Implemented authentication and **role-based permissions** to secure event management and registration features.',
    ],
  },
];

export const projects = [
  {
    id: 'liftlens',
    name: 'LiftLens',
    kind: 'Computer vision',
    date: 'October 2026 – Present',
    icon: 'chip',
    tech: ['Python', 'OpenCV', 'PyTorch', 'ONNX Runtime', 'TypeScript', 'Next.js', 'FastAPI', 'Redis', 'Docker'],
    // interactive figures, see LiftLensFigures.vue. the implementation list places the rest
    figures: { lead: 'angles' },
    summary: 'A computer vision app that measures joint angles and bar path in Olympic lifts.',
    contribution: 'Built an app that takes a side-on video of a snatch or clean & jerk, or a live webcam feed, and measures the lifter’s joint angles and the bar’s path and speed, rep by rep.',
    implementation: [
      'A pretrained YOLOv8 pose model, exported to ONNX, finds 17 keypoints on the lifter in each frame. Knee, hip and elbow angles come from three keypoints each on the side facing the camera. If any of them is under 35% confidence, the angle is left blank instead of guessed from the other side.',
      'Finding the bar was the hard part. A barbell detector needs labeled footage I don’t have yet, so the bar is found with classical computer vision instead. From the side, a bumper plate is a circle with the bar at its center. At setup the lifter’s wrists are below their hips and the plate sits by their ankles, so the pose narrows down where to look, and a Hough circle search finds candidates there. Each one is scored by how much of its rim has a strong edge.',
      { figure: 'plate' },
      'A false circle, like a knee or a plate on the rack, rarely holds still. A plate only counts once three samples in a row agree on its center and size, and across reps only plates of the most common size are kept.',
      'From there, the tracker predicts where the plate moved and re-fits the circle around that spot every frame, up to 60 fps. Under motion blur it falls back to matching the last clear image of the plate, and after 0.3 seconds without a match it stops instead of drifting. A quadratic fit over a short window around each point then gives position, velocity and acceleration without the lag of a moving average.',
      { figure: 'smooth' },
      'Plates are 450 mm across, so the plate’s size in pixels sets the scale, and bar speed comes out in metres per second with no extra calibration.',
      'Uploaded videos go to a FastAPI server, which queues them in Redis for a Python worker while the page polls for progress. Live mode runs the same model in the browser with ONNX Runtime Web inside a Web Worker, one frame at a time, so no video ever leaves the computer.',
      'Saved reps are resampled to 101 points from start to finish, so two lifts of different lengths can be compared on the same knee angle chart.',
    ],
    outcomes: [
      'Runs locally as four Docker containers (web app, API, Redis and worker) with one command.',
      'TypeScript and Python tests cover the angle math, model output decoding and the API, and a smoke test sends a video through the whole queue to real pose inference.',
      'The YOLOv8 training and export pipeline for a dedicated barbell detector is ready for when there’s labeled footage to train it on.',
    ],
    lessons: 'Don’t wait on the data. I planned around a trained barbell detector, but without labeled footage it would have blocked everything else. A circle fit that leans on what the pose model already knows got the bar tracked now, and the detector can slot in later.',
    funFact: 'Competition bumper plates are all 450 mm across, whether they weigh 10 kg or 25 kg. That’s what lets the plate double as a ruler: it’s the same size no matter what’s loaded on the bar.',
  },
  {
    id: 'portfolio',
    name: 'Portfolio Website',
    kind: 'Web development',
    date: 'September 2026',
    icon: 'computer',
    tech: ['Vue', 'JavaScript', 'Cloudflare Workers', 'Durable Objects', 'Workers KV', 'Vite', 'Playwright'],
    // interactive figures under these sections, see PortfolioFigures.vue
    // lead sits under the heading before the text, the rest after it. the projects
    // folder shows the lead figure in its preview too
    figures: { lead: 'desktop', built: 'apps', implementation: 'stack', results: 'live' },
    summary: 'This site!',
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
    // interactive figures, see MlFigures.vue. the implementation list places the rest
    figures: { lead: 'graph' },
    summary: 'A small ML framework in Rust, from tensors to GPU training.',
    contribution: 'Built a deep learning library in Rust with tensors, reverse-mode automatic differentiation, a CPU backend, a CUDA backend with hand-written kernels, and TypeScript bindings for Node.js, then trained an MNIST classifier with it.',
    implementation: [
      'Every operation on a tensor that needs gradients records its inputs and a backward rule. Calling backward on the loss walks that graph in reverse and adds up every contribution. The adding matters: in x·x + x, x gets gradient from three places, so at x = 3 it’s 3 + 3 + 1 = 7.',
      'The CUDA kernels are written by hand: elementwise ops with grid-stride loops, sums and maxes with warp shuffles and shared memory, and a 16 × 16 tiled matrix multiply with transpose flags, so the backward pass never has to transpose anything. Softmax and cross-entropy are fused into one kernel, and Adam updates each parameter in place in one kernel too.',
      { figure: 'tiles' },
      'The backward kernels read their starting gradient from GPU memory, so a training step never has to wait on the CPU.',
      'Each test case runs through PyTorch and TensorFlow first, and both sets of answers are saved as fixtures. The Rust tests check ops, gradients, the loss, and five steps of Adam and SGD with momentum against both, on CPU and GPU, plus finite difference checks that don’t depend on either framework.',
      { figure: 'epsilon' },
      'The Node bindings, built with napi-rs, expose tensors, the model and Adam to TypeScript, so the same training loop runs from JavaScript.',
    ],
    outcomes: [
      'Trained a 235,146-parameter MLP on MNIST to 97.8% test accuracy in 10 epochs, using cross-entropy loss and Adam.',
      'Cut training from 2.83 s to 0.18 s per epoch on an RTX 4080 laptop GPU: about 16× faster than the single-threaded CPU backend.',
    ],
    lessons: 'Test against more than one reference. Adam matched PyTorch to 1e-4 but not TensorFlow, and the difference wasn’t a bug in my code: Keras adds epsilon to √v before bias correction, not after. With only one framework to check against, I’d never have known which answer was the convention and which was the mistake.',
    funFact: 'The whole framework is about 1,800 lines of Rust, and the CUDA kernels live in it as one big string. They’re compiled the first time the GPU is used, so it builds on a laptop with no CUDA toolkit or Visual Studio installed at all.',
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
    figures: { lead: 'register' },
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
    // the figure under the what i built heading, see ReversiFigures.vue
    figures: { lead: 'board' },
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
