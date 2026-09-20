import { User, Course, Assignment, LabSession, LiveStudentState, ActivityLog } from '@/types';

export const SEED_USERS: User[] = [
  {
    id: 'inst-1',
    email: 'sarah.jenkins@university.edu',
    fullName: 'Dr. Sarah Jenkins',
    role: 'instructor',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-1',
    email: 'alex.chen@university.edu',
    fullName: 'Alex Chen',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-2',
    email: 'maya.patel@university.edu',
    fullName: 'Maya Patel',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-3',
    email: 'liam.davis@university.edu',
    fullName: 'Liam Davis',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-4',
    email: 'sofia.rodriguez@university.edu',
    fullName: 'Sofia Rodriguez',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-5',
    email: 'marcus.taylor@university.edu',
    fullName: 'Marcus Taylor',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'admin-1',
    email: 'admin@vlab.edu',
    fullName: 'System Administrator',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face'
  }
];

export const SEED_COURSES: Course[] = [
  {
    id: 'course-1',
    code: 'CS101',
    title: 'Introduction to Computer Science & Python',
    description: 'Core concepts of algorithmic problem solving, recursion, data structures, and Python modules.',
    instructorId: 'inst-1',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'course-2',
    code: 'CS204',
    title: 'Web Engineering & Frontend Systems',
    description: 'Modern JavaScript, async programming, DOM manipulation, and interactive web architecture.',
    instructorId: 'inst-1',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
  }
];

export const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign-1',
    courseId: 'course-1',
    title: 'Algorithm Lab: Primes & Fibonacci Engine',
    description: 'Implement prime checking and Fibonacci sequence generation with test cases and clean code architecture.',
    language: 'python',
    instructionsMarkdown: `### 🎯 Assignment Overview
Welcome to **Lab 4: Primes & Fibonacci Generator**. In this lab, you will write a modular Python script that computes prime numbers and generates Fibonacci sequences.

#### 📋 Tasks to Complete:
1. **Implement \`is_prime(n)\` in \`utils.py\`**:
   - Return \`True\` if integer $n \\ge 2$ is prime, else \`False\`.
   - Optimize by checking up to $\\sqrt{n}$.
2. **Implement \`get_fibonacci(count)\` in \`utils.py\`**:
   - Return a list containing the first \`count\` Fibonacci numbers starting with $[0, 1]$.
3. **Execute and Verify in \`main.py\`**:
   - Import functions from \`utils\`.
   - Test primes between $1$ and $50$.
   - Generate the first $10$ Fibonacci numbers and print the formatted output.

#### 💡 Need Guidance?
Click **"Need Help"** at any point to notify the instructor, and they will review your workspace live.`,
    starterFiles: [
      {
        id: 'file-1',
        name: 'main.py',
        language: 'python',
        content: `# CS101 Lab 4: Algorithm & Modular Architecture
# Student assignment: complete utils.py and test here

from utils import is_prime, get_fibonacci

def main():
    print("=== CS101 Lab 4 Execution ===")
    
    # Task 1: Check Primes
    test_numbers = [2, 3, 4, 11, 15, 19, 24, 29]
    print("\\n1. Prime Number Tests:")
    for num in test_numbers:
        result = is_prime(num)
        print(f"  - is_prime({num}) -> {result}")

    # Task 2: Fibonacci Sequence
    print("\\n2. Fibonacci Sequence (first 10 numbers):")
    fib_list = get_fibonacci(10)
    print(f"  Result: {fib_list}")

if __name__ == "__main__":
    main()
`
      },
      {
        id: 'file-2',
        name: 'utils.py',
        language: 'python',
        content: `import math

def is_prime(n: int) -> bool:
    """Returns True if n is a prime number, otherwise False."""
    # TODO: Complete this implementation
    if n < 2:
        return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def get_fibonacci(count: int) -> list:
    """Returns the first 'count' numbers of the Fibonacci sequence."""
    # TODO: Complete this implementation
    if count <= 0:
        return []
    if count == 1:
        return [0]
    
    seq = [0, 1]
    while len(seq) < count:
        seq.append(seq[-1] + seq[-2])
    return seq
`
      }
    ],
    tasks: [
      { id: 't-1', description: 'Implement is_prime(n) logic in utils.py', required: true },
      { id: 't-2', description: 'Implement get_fibonacci(count) in utils.py', required: true },
      { id: 't-3', description: 'Run main.py and ensure 0 errors', required: true },
      { id: 't-4', description: 'Validate edge case n < 2', required: false }
    ],
    maxScore: 100,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'assign-2',
    courseId: 'course-2',
    title: 'JavaScript Async State Machine',
    description: 'Build a promise-based queue processor and debounce handler.',
    language: 'javascript',
    instructionsMarkdown: `### 🎯 Assignment Overview
Build a lightweight event scheduler in modern JavaScript (ES6+).`,
    starterFiles: [
      {
        id: 'f-js-1',
        name: 'index.js',
        language: 'javascript',
        content: `// Web Programming Lab: Async Processor
console.log("Starting Async Task Queue...");

function processQueue(items) {
  return items.map(item => ({ id: item.id, processedAt: new Date().toISOString() }));
}

const sampleTasks = [{ id: 1 }, { id: 2 }, { id: 3 }];
console.log("Processed:", JSON.stringify(processQueue(sampleTasks), null, 2));
`
      }
    ],
    tasks: [
      { id: 't-js-1', description: 'Complete processQueue transform', required: true }
    ],
    maxScore: 100,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'assign-3',
    courseId: 'course-2',
    title: 'Interactive Portfolio Card (HTML & CSS)',
    description: 'Design a clean, accessible developer profile card with responsive flexbox and CSS styling.',
    language: 'html',
    instructionsMarkdown: `### 🎯 Assignment Overview
Build an interactive modern developer profile card using HTML and CSS.`,
    starterFiles: [
      {
        id: 'f-html-1',
        name: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Developer Profile</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card">
    <div class="avatar">👨‍💻</div>
    <h2>Student Developer</h2>
    <p class="role">CS101 Lab Participant</p>
    <div class="skills">
      <span class="badge">Python</span>
      <span class="badge">JavaScript</span>
      <span class="badge">Algorithms</span>
    </div>
    <button class="btn" onclick="alert('Hello from VLab!')">Contact Me</button>
  </div>
</body>
</html>`
      },
      {
        id: 'f-css-1',
        name: 'styles.css',
        language: 'css',
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}
.card {
  background: #1e293b;
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  max-width: 320px;
  width: 100%;
}
.avatar {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.role {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}
.skills {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.badge {
  background: #334155;
  color: #38bdf8;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
}
.btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
}
.btn:hover {
  background: #2563eb;
}`
      }
    ],
    tasks: [
      { id: 't-html-1', description: 'Create responsive card markup', required: true },
      { id: 't-html-2', description: 'Apply custom CSS styling and badges', required: true }
    ],
    maxScore: 100,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

export const SEED_SESSIONS: LabSession[] = [
  {
    id: 'session-101',
    assignmentId: 'assign-1',
    courseId: 'course-1',
    name: 'CS101 Lab Session #4: Algorithms & Modular Python',
    sessionCode: 'PY-101',
    startTime: new Date(Date.now() - 45 * 60000).toISOString(),
    endTime: new Date(Date.now() + 75 * 60000).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'session-102',
    assignmentId: 'assign-2',
    courseId: 'course-2',
    name: 'CS204 Lab Session #2: Modern JavaScript Architecture',
    sessionCode: 'JS-204',
    startTime: new Date(Date.now() - 120 * 60000).toISOString(),
    endTime: new Date(Date.now() - 10 * 60000).toISOString(),
    isActive: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

// Initial pre-populated active students for session-101
export const INITIAL_STUDENTS_STATE: Record<string, LiveStudentState> = {
  'stud-1': {
    studentId: 'stud-1',
    studentName: 'Alex Chen',
    studentEmail: 'alex.chen@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    status: 'Active',
    currentFileId: 'file-1',
    files: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS[0].starterFiles)),
    terminalOutput: '=== CS101 Lab 4 Execution ===\n\n1. Prime Number Tests:\n  - is_prime(2) -> True\n  - is_prime(3) -> True\n  - is_prime(4) -> False\n  - is_prime(11) -> True\n  - is_prime(15) -> False\n  - is_prime(19) -> True\n  - is_prime(24) -> False\n  - is_prime(29) -> True\n\n2. Fibonacci Sequence (first 10 numbers):\n  Result: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n[Process completed successfully in 0.082s]',
    lastExecution: {
      timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
      status: 'success',
      durationMs: 82
    },
    lastActivity: 'Executed main.py with all tests passing',
    lastActivityTime: new Date(Date.now() - 2 * 60000).toISOString(),
    progressPercentage: 85,
    completedTaskIds: ['t-1', 't-2', 't-3'],
    helpRequest: null,
    instructorNote: {
      id: 'note-1',
      sessionId: 'session-101',
      studentId: 'stud-1',
      instructorId: 'inst-1',
      tag: 'EXCELLENT',
      content: 'Understands isqrt optimization well. Code is neat and modular.',
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString()
    },
    joinTime: new Date(Date.now() - 42 * 60000).toISOString(),
    timeInLabSeconds: 2520
  },
  'stud-2': {
    studentId: 'stud-2',
    studentName: 'Maya Patel',
    studentEmail: 'maya.patel@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=face',
    status: 'Active',
    currentFileId: 'file-2',
    files: [
      {
        id: 'file-1',
        name: 'main.py',
        language: 'python',
        content: SEED_ASSIGNMENTS[0].starterFiles[0].content
      },
      {
        id: 'file-2',
        name: 'utils.py',
        language: 'python',
        content: `import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    # Facing IndexError on edge cases
    for i in range(2, n):
        if n % i == 0:
            return False
    return True

def get_fibonacci(count: int) -> list:
    # Need help with recursive termination
    pass
`
      }
    ],
    terminalOutput: 'Traceback (most recent call last):\n  File "main.py", line 18, in <module>\n    fib_list = get_fibonacci(10)\nTypeError: \'NoneType\' object is not iterable',
    lastExecution: {
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      status: 'error',
      durationMs: 45
    },
    lastActivity: 'Requested instructor assistance',
    lastActivityTime: new Date(Date.now() - 3 * 60000).toISOString(),
    progressPercentage: 40,
    completedTaskIds: ['t-1'],
    helpRequest: {
      id: 'help-2',
      sessionId: 'session-101',
      studentId: 'stud-2',
      studentName: 'Maya Patel',
      status: 'pending',
      message: 'I am getting TypeError: NoneType object is not iterable when calling get_fibonacci(). Could you check my utils.py?',
      requestedAt: new Date(Date.now() - 3 * 60000).toISOString()
    },
    instructorNote: {
      id: 'note-2',
      sessionId: 'session-101',
      studentId: 'stud-2',
      instructorId: 'inst-1',
      tag: 'NEEDS_SUPPORT',
      content: 'Stuck on Fibonacci return value. Reviewing now.',
      updatedAt: new Date(Date.now() - 2 * 60000).toISOString()
    },
    joinTime: new Date(Date.now() - 38 * 60000).toISOString(),
    timeInLabSeconds: 2280
  },
  'stud-3': {
    studentId: 'stud-3',
    studentName: 'Liam Davis',
    studentEmail: 'liam.davis@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face',
    status: 'Idle',
    currentFileId: 'file-1',
    files: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS[0].starterFiles)),
    terminalOutput: '=== CS101 Lab 4 Execution ===\nWaiting for user input...',
    lastExecution: {
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'success',
      durationMs: 60
    },
    lastActivity: 'Idle for 12 minutes',
    lastActivityTime: new Date(Date.now() - 12 * 60000).toISOString(),
    progressPercentage: 30,
    completedTaskIds: ['t-1'],
    helpRequest: null,
    instructorNote: null,
    joinTime: new Date(Date.now() - 35 * 60000).toISOString(),
    timeInLabSeconds: 2100
  },
  'stud-4': {
    studentId: 'stud-4',
    studentName: 'Sofia Rodriguez',
    studentEmail: 'sofia.rodriguez@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    status: 'Submitted',
    currentFileId: 'file-1',
    files: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS[0].starterFiles)),
    terminalOutput: '=== CS101 Lab 4 Execution ===\nAll 4 tasks completed!\nFinal score: 100/100\n[Submission recorded]',
    lastExecution: {
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
      status: 'success',
      durationMs: 95
    },
    lastActivity: 'Submitted final assignment solution',
    lastActivityTime: new Date(Date.now() - 6 * 60000).toISOString(),
    progressPercentage: 100,
    completedTaskIds: ['t-1', 't-2', 't-3', 't-4'],
    helpRequest: null,
    instructorNote: {
      id: 'note-4',
      sessionId: 'session-101',
      studentId: 'stud-4',
      instructorId: 'inst-1',
      tag: 'EXCELLENT',
      content: 'Early completion, full unit tests included.',
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString()
    },
    joinTime: new Date(Date.now() - 40 * 60000).toISOString(),
    timeInLabSeconds: 2400
  },
  'stud-5': {
    studentId: 'stud-5',
    studentName: 'Marcus Taylor',
    studentEmail: 'marcus.taylor@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    status: 'Disconnected',
    currentFileId: 'file-1',
    files: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS[0].starterFiles)),
    terminalOutput: '',
    lastActivity: 'Disconnected 18 minutes ago',
    lastActivityTime: new Date(Date.now() - 18 * 60000).toISOString(),
    progressPercentage: 10,
    completedTaskIds: [],
    helpRequest: null,
    instructorNote: {
      id: 'note-5',
      sessionId: 'session-101',
      studentId: 'stud-5',
      instructorId: 'inst-1',
      tag: 'DID_NOT_PARTICIPATE',
      content: 'Network dropout or left early. Need to follow up.',
      updatedAt: new Date(Date.now() - 15 * 60000).toISOString()
    },
    joinTime: new Date(Date.now() - 30 * 60000).toISOString(),
    timeInLabSeconds: 720
  }
};

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-1',
    sessionId: 'session-101',
    studentId: 'stud-1',
    eventType: 'JOINED_LAB',
    description: 'Joined Lab Session PY-101',
    createdAt: new Date(Date.now() - 42 * 60000).toISOString()
  },
  {
    id: 'act-2',
    sessionId: 'session-101',
    studentId: 'stud-1',
    eventType: 'OPENED_ASSIGNMENT',
    description: 'Opened Assignment: Algorithm Lab',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    id: 'act-3',
    sessionId: 'session-101',
    studentId: 'stud-1',
    eventType: 'STARTED_TYPING',
    description: 'Started typing in utils.py',
    createdAt: new Date(Date.now() - 37 * 60000).toISOString()
  },
  {
    id: 'act-4',
    sessionId: 'session-101',
    studentId: 'stud-1',
    eventType: 'EXECUTED_CODE',
    description: 'Executed main.py (Result: Success)',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'act-5',
    sessionId: 'session-101',
    studentId: 'stud-2',
    eventType: 'JOINED_LAB',
    description: 'Joined Lab Session PY-101',
    createdAt: new Date(Date.now() - 38 * 60000).toISOString()
  },
  {
    id: 'act-6',
    sessionId: 'session-101',
    studentId: 'stud-2',
    eventType: 'EDITED_FILE',
    description: 'Modified utils.py (is_prime logic)',
    createdAt: new Date(Date.now() - 28 * 60000).toISOString()
  },
  {
    id: 'act-7',
    sessionId: 'session-101',
    studentId: 'stud-2',
    eventType: 'EXECUTED_CODE',
    description: 'Executed main.py (Error: TypeError)',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 'act-8',
    sessionId: 'session-101',
    studentId: 'stud-2',
    eventType: 'REQUESTED_HELP',
    description: 'Requested Help: "Getting TypeError on get_fibonacci"',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString()
  },
  {
    id: 'act-9',
    sessionId: 'session-101',
    studentId: 'stud-4',
    eventType: 'SUBMITTED_ASSIGNMENT',
    description: 'Submitted completed assignment with 100% test pass rate',
    createdAt: new Date(Date.now() - 6 * 60000).toISOString()
  }
];
