// all the text about me that shows up on the desktop.
// career stuff was checked against my resume on 2026-09-24.
export const profile = {
  name: 'Jason Tang',
  subtitle: 'Computer Engineering @ UofT',
  intro: 'Hi, I’m Jason — a Computer Engineering student at UofT and former software engineering intern at AMD. I like building useful tools, learning new technologies, and digging into hard technical problems.',
  bio: 'When I’m not coding, I’m usually playing badminton or volleyball, at the gym, or trying out another sport.',
  education: 'BASc, Computer Engineering · September 2023 – May 2028',
  skills: ['Python', 'TypeScript', 'JavaScript', 'Rust', 'C++', 'Ruby', 'SQL', 'Vue.js', 'Node.js', 'PostgreSQL', 'CUDA', 'Verilog'],
  // best lifts in lb, shown in a small table at the bottom of the about window
  lifts: [
    ['Power clean', '265'],
    ['Squat', '405'],
    ['Bench', '265'],
    ['Pull-up', '+100'],
  ],
};

// the breakout game in the contact window spells this out
export const contact = { email: 'jasontcanada@gmail.com' };

export const roles = [
  {
    company: 'AMD',
    role: 'Software Engineer Intern',
    location: 'Toronto, ON',
    dates: 'May 2025 – August 2026',
    bullets: [
      'Developed and scaled an internal regression-management platform used by 2,000+ engineers, supporting 3.1M tests per month across Vue, TypeScript, Node.js/Express, Ruby, and PostgreSQL.',
      'Built IBM LSF lifecycle services to improve reliability and recovery for 239K jobs per month, reconciling scheduler and application state across timeouts, failures, and abnormal terminations.',
      'Developed an authenticated TypeScript MCP integration, enabling 100+ engineers to execute 10K+ monthly AI-assisted operations for failure investigation, coverage analysis, and controlled regression workflows.',
      'Built an AI debugging agent that correlated logs, scheduler events, and regression metadata, reducing initial failure triage from 15–30 minutes to approximately 30 seconds.',
      'Automated deployment workflows with Python, Ruby, and Jenkins, saving 20+ engineering hours per week and shortening release cycles by 30%.',
      'Architected version-control abstractions and validation workflows for a 113-repository Perforce-to-Git migration, preserving traceability for 1.4M+ historical regression runs.',
    ],
  },
  {
    company: 'U+ Education',
    role: 'Web Developer',
    location: 'Ottawa, ON',
    dates: 'June – September 2023',
    bullets: [
      'Designed and launched two responsive WordPress websites serving 100+ customers, with reusable layouts and streamlined content-management workflows.',
      'Improved page-load performance by 30% and increased organic traffic by over 50% through performance optimization, technical SEO, and analytics-driven content updates.',
    ],
  },
  {
    company: 'Digitera Interactive',
    role: 'Full-stack Developer Intern',
    location: 'Ottawa, ON',
    dates: 'June – September 2020',
    bullets: [
      'Developed an event-planning application prototype with event creation, scheduling, attendee registration, and account management using HTML, CSS, JavaScript, and MySQL.',
      'Designed the MySQL database structure and implemented form validation, filtering, and error handling for reliable CRUD operations.',
    ],
  },
];

export const projects = [
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
    icon: 'chip',
    tech: ['Verilog', 'VHDL', 'Quartus', 'ModelSim'],
    summary: 'The tile-merging game, implemented in hardware on a DE1-SoC.',
    contribution: 'Built an FPGA implementation of 2048 in Verilog, rendered to a 160 × 120 VGA display at 60 Hz through a custom VGA adapter.',
    implementation: 'Implemented tile movement, merging, and scoring using a modular datapath and FSM controller. Verified the design through ModelSim testbenches, Tcl simulations, and physical I/O.',
  },
];
