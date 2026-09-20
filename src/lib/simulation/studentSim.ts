import { Server as SocketIOServer } from 'socket.io';
import { dbStore } from '../db/store';

let simulationInterval: NodeJS.Timeout | null = null;

const SIMULATION_SNIPPETS = [
  {
    studentId: 'stud-2', // Maya Patel
    fileId: 'file-2',
    actions: [
      `import math

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.isqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def get_fibonacci(count: int) -> list:
    if count <= 0:
        return []
    if count == 1:
        return [0]
    fib = [0, 1]
    while len(fib) < count:
        fib.append(fib[-1] + fib[-2])
    return fib
`,
      `# Adding edge case checks and docstrings
def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    if n in (2, 3):
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True
`
    ]
  },
  {
    studentId: 'stud-3', // Liam Davis
    fileId: 'file-1',
    actions: [
      `from utils import is_prime, get_fibonacci

print("Liam testing prime sequence:")
for x in [2, 7, 13, 17, 23, 29]:
    print(f"{x} is prime -> {is_prime(x)}")
`,
      `print("Generating Fibonacci sequence for limit = 15:")
print(get_fibonacci(15))
`
    ]
  }
];

export function startStudentSimulation(io: SocketIOServer, sessionId: string = 'session-101') {
  if (simulationInterval) return;

  let step = 0;

  simulationInterval = setInterval(() => {
    step++;
    const pick = SIMULATION_SNIPPETS[step % SIMULATION_SNIPPETS.length];
    const code = pick.actions[step % pick.actions.length];

    // Update code
    const updated = dbStore.updateStudentCode(sessionId, pick.studentId, pick.fileId, code);
    if (updated) {
      // simulate execution on every 3rd step
      if (step % 3 === 0) {
        dbStore.recordExecution(
          sessionId,
          pick.studentId,
          `=== Execution Step ${step} ===\nAll unit tests passed.\nResult: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`,
          'success',
          78
        );
      }

      // Broadcast real-time typing to instructor
      io.to(`session:${sessionId}`).emit('student_code_synced', {
        studentId: pick.studentId,
        fileId: pick.fileId,
        content: code,
        studentState: updated
      });

      io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
    }
  }, 4000);
}

export function stopStudentSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

export function isSimulationActive(): boolean {
  return simulationInterval !== null;
}
