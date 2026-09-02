/**
 * SmartAssess local data store.
 *
 * Seed data is only written when a key is genuinely absent. A parse failure no
 * longer overwrites the key — that turned one corrupt value into permanent
 * loss of every real submission.
 */

const KEYS = {
  tests: "smartassess_tests_list",
  submissions: "smartassess_submissions",
  results: "smartassess_results",
};

export const INITIAL_TESTS = [
  { id: 1, title: "Java Programming Fundamentals", subject: "Java", date: "20 May 2025", duration: 90, marks: 100, status: "Published", students: 42, attempts: 0, proctored: true },
  { id: 2, title: "Data Structures & Algorithms", subject: "DSA", date: "22 May 2025", duration: 60, marks: 100, status: "Upcoming", students: 38, attempts: 0, proctored: true },
  { id: 3, title: "Web Development Mastery", subject: "Web Dev", date: "25 May 2025", duration: 90, marks: 100, status: "Upcoming", students: 35, attempts: 0, proctored: false },
  { id: 4, title: "DBMS Fundamentals", subject: "DBMS", date: "27 May 2025", duration: 60, marks: 100, status: "Draft", students: 0, attempts: 0, proctored: true },
  { id: 5, title: "Operating Systems Concepts", subject: "OS", date: "18 May 2025", duration: 60, marks: 100, status: "Published", students: 51, attempts: 47, proctored: true },
  { id: 6, title: "Computer Networks", subject: "CN", date: "15 May 2025", duration: 60, marks: 100, status: "Published", students: 44, attempts: 39, proctored: true },
  { id: 7, title: "Python Programming", subject: "Python", date: "12 May 2025", duration: 90, marks: 100, status: "Published", students: 60, attempts: 58, proctored: true },
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 101,
    studentName: "Rahul Verma",
    studentEmail: "rahul.verma@student.com",
    testId: 2,
    testTitle: "Data Structures & Algorithms",
    date: "19 May 2025, 11:30",
    score: "85 / 100",
    totalScore: 85,
    maxScore: 100,
    status: "Pending Correction",
    feedback: "Good conceptual clarity on Stacks and Trees. Work on time complexity analysis for sorting edge cases.",
    questions: [
      { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", studentAns: "Stack", correctAns: "Stack", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "What is the worst-case time complexity of Quick Sort?", studentAns: "O(n²)", correctAns: "O(n²)", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "Which traversal visits the root node first?", studentAns: "Pre-order", correctAns: "Pre-order", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "What is the time complexity of searching in a balanced BST?", studentAns: "O(n)", correctAns: "O(log n)", isCorrect: false, maxMarks: 20, scoreGiven: 10 },
      { id: 5, text: "Which algorithm finds shortest paths from a single source in weighted graphs?", studentAns: "Dijkstra", correctAns: "Dijkstra", isCorrect: true, maxMarks: 20, scoreGiven: 15 },
    ],
  },
  {
    id: 102,
    studentName: "Anjali Sharma",
    studentEmail: "anjali.s@student.com",
    testId: 1,
    testTitle: "Java Programming Fundamentals",
    date: "19 May 2025, 14:15",
    score: "92 / 100",
    totalScore: 92,
    maxScore: 100,
    status: "Pending Correction",
    feedback: "Excellent understanding of OOP principles, interfaces, and multithreading.",
    questions: [
      { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", studentAns: "Stack", correctAns: "Stack", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "Which keyword is used to inherit a class in Java?", studentAns: "extends", correctAns: "extends", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "What is the size of int data type in Java?", studentAns: "32 bit", correctAns: "32 bit", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "Which of these is NOT a Java access modifier?", studentAns: "friend", correctAns: "friend", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 5, text: "Which collection allows duplicate elements?", studentAns: "List", correctAns: "List", isCorrect: true, maxMarks: 20, scoreGiven: 12 },
    ],
  },
  {
    id: 103,
    studentName: "Vikram Singh",
    studentEmail: "vikram.s@student.com",
    testId: 3,
    testTitle: "Web Development Mastery",
    date: "18 May 2025, 16:00",
    score: "78 / 100",
    totalScore: 78,
    maxScore: 100,
    status: "Graded & Published",
    feedback: "Strong CSS styling fundamentals. Practice more React lifecycle hooks and async APIs.",
    questions: [
      { id: 1, text: "Which HTML tag is used for internal CSS styles?", studentAns: "<style>", correctAns: "<style>", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "What does CSS stand for?", studentAns: "Cascading Style Sheets", correctAns: "Cascading Style Sheets", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "Which hook manages local component state in React?", studentAns: "useState", correctAns: "useState", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "What HTTP status code means 'Resource Not Found'?", studentAns: "404", correctAns: "404", isCorrect: true, maxMarks: 20, scoreGiven: 10 },
      { id: 5, text: "Which of the following is NOT a JavaScript data type?", studentAns: "float", correctAns: "float", isCorrect: true, maxMarks: 20, scoreGiven: 8 },
    ],
  },
  {
    id: 104,
    studentName: "Neha Gupta",
    studentEmail: "neha.g@student.com",
    testId: 4,
    testTitle: "DBMS Fundamentals",
    date: "18 May 2025, 17:30",
    score: "88 / 100",
    totalScore: 88,
    maxScore: 100,
    status: "Graded & Published",
    feedback: "Thorough grasp of normalization and ACID properties.",
    questions: [
      { id: 1, text: "What does SQL stand for?", studentAns: "Structured Query Language", correctAns: "Structured Query Language", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "Which SQL clause is used to filter grouped data?", studentAns: "HAVING", correctAns: "HAVING", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "What does ACID stand for in DBMS?", studentAns: "Atomicity, Consistency, Isolation, Durability", correctAns: "Atomicity, Consistency, Isolation, Durability", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "Which normal form eliminates transitive dependency?", studentAns: "3NF", correctAns: "3NF", isCorrect: true, maxMarks: 20, scoreGiven: 18 },
      { id: 5, text: "Which command permanently removes all records without row-by-row logging?", studentAns: "TRUNCATE", correctAns: "TRUNCATE", isCorrect: true, maxMarks: 20, scoreGiven: 10 },
    ],
  },
];

export const INITIAL_RESULTS = [
  { id: 1, testId: 5, title: "Operating Systems Concepts", test: "Operating Systems Concepts", subject: "OS", date: "18 May 2025", score: "85%", percent: 85, student: "Rahul Verma", studentEmail: "rahul.verma@student.com", reviewer: "Dr. Johnson" },
  { id: 2, testId: 6, title: "Computer Networks", test: "Computer Networks", subject: "CN", date: "15 May 2025", score: "72%", percent: 72, student: "Anjali Sharma", studentEmail: "anjali.s@student.com", reviewer: "Dr. Johnson" },
  { id: 3, testId: 7, title: "Python Programming", test: "Python Programming", subject: "Python", date: "12 May 2025", score: "80%", percent: 80, student: "Vikram Singh", studentEmail: "vikram.s@student.com", reviewer: "Dr. Johnson" },
  { id: 4, testId: 4, title: "DBMS Fundamentals", test: "DBMS Fundamentals", subject: "DBMS", date: "10 May 2025", score: "75%", percent: 75, student: "Neha Gupta", studentEmail: "neha.g@student.com", reviewer: "Dr. Johnson" },
  { id: 5, testId: 1, title: "Java Programming Fundamentals", test: "Java Programming Fundamentals", subject: "Java", date: "08 May 2025", score: "95%", percent: 95, student: "Rahul Verma", studentEmail: "rahul.verma@student.com", reviewer: "Dr. Johnson" },
];

/**
 * Read a key, seeding it only when it is genuinely missing.
 * A corrupt value is reported and the seed is returned *without* clobbering
 * whatever is stored, so the data can still be recovered by hand.
 */
const readCollection = (key, seed) => {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    console.warn(`Local storage unavailable for "${key}":`, err?.name || err);
    return seed;
  }

  if (raw === null) {
    writeCollection(key, seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`"${key}" is not an array; using defaults for this session.`);
      return seed;
    }
    return parsed;
  } catch (err) {
    console.error(
      `"${key}" contains invalid JSON and was NOT overwritten. Inspect it in DevTools to recover the data.`,
      err
    );
    return seed;
  }
};

const writeCollection = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Could not save "${key}":`, err?.name || err);
    return false;
  }
};

export const getStoredTests = () => readCollection(KEYS.tests, INITIAL_TESTS);
export const saveStoredTests = (tests) => writeCollection(KEYS.tests, tests);

export const getStoredSubmissions = () => readCollection(KEYS.submissions, INITIAL_SUBMISSIONS);
export const saveStoredSubmissions = (subs) => writeCollection(KEYS.submissions, subs);

export const getStoredResults = () => readCollection(KEYS.results, INITIAL_RESULTS);
export const saveStoredResults = (results) => writeCollection(KEYS.results, results);

/** Monotonic id generator — `Date.now()` collides when called twice in a tick. */
let idCounter = 0;
export const nextId = () => {
  idCounter += 1;
  return Number(`${Date.now()}${String(idCounter % 1000).padStart(3, "0")}`);
};

export const STORAGE_KEYS = KEYS;
