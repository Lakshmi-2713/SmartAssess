// SmartAssess Shared Storage & Data Synchronization Service

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
    testTitle: "Data Structures Midterm",
    date: "19 May 2025, 11:30 AM",
    score: "85 / 100",
    totalScore: 85,
    status: "Pending Correction",
    feedback: "Good conceptual clarity on Stacks and Trees. Work on time complexity analysis for sorting edge cases.",
    questions: [
      { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", studentAns: "Stack", correctAns: "Stack", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "What is the worst-case time complexity of Quick Sort?", studentAns: "O(n²)", correctAns: "O(n²)", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "Which traversal visits the root node first?", studentAns: "Pre-order", correctAns: "Pre-order", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "What does SQL stand for?", studentAns: "Simple Question Language", correctAns: "Structured Query Language", isCorrect: false, maxMarks: 20, scoreGiven: 10 },
      { id: 5, text: "Which of the following is NOT a JavaScript data type?", studentAns: "float", correctAns: "float", isCorrect: true, maxMarks: 20, scoreGiven: 15 },
    ]
  },
  {
    id: 102,
    studentName: "Anjali Sharma",
    studentEmail: "anjali.s@student.com",
    testId: 1,
    testTitle: "Java Programming",
    date: "19 May 2025, 02:15 PM",
    score: "92 / 100",
    totalScore: 92,
    status: "Pending Correction",
    feedback: "Excellent understanding of OOP principles, interfaces, and multithreading.",
    questions: [
      { id: 1, text: "What is the entry point method for a Java application?", studentAns: "public static void main(String[] args)", correctAns: "public static void main(String[] args)", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "Which keyword prevents inheritance in Java?", studentAns: "final", correctAns: "final", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "Which collection allows duplicate elements?", studentAns: "List", correctAns: "List", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "What exception is thrown when dividing by zero in integer arithmetic?", studentAns: "ArithmeticException", correctAns: "ArithmeticException", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 5, text: "Which operator is used for object type check?", studentAns: "instanceof", correctAns: "instanceof", isCorrect: true, maxMarks: 20, scoreGiven: 12 },
    ]
  },
  {
    id: 103,
    studentName: "Vikram Singh",
    studentEmail: "vikram.s@student.com",
    testId: 3,
    testTitle: "Web Development",
    date: "18 May 2025, 04:00 PM",
    score: "78 / 100",
    totalScore: 78,
    status: "Graded & Published",
    feedback: "Strong CSS styling fundamentals. Practice more React lifecycle hooks and async APIs.",
    questions: [
      { id: 1, text: "Which HTML tag is used for internal CSS?", studentAns: "<style>", correctAns: "<style>", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "What is the default display property of a div?", studentAns: "block", correctAns: "block", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "Which hook manages state in React functional components?", studentAns: "useState", correctAns: "useState", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "What does HTTP status 404 represent?", studentAns: "Not Found", correctAns: "Not Found", isCorrect: true, maxMarks: 20, scoreGiven: 10 },
      { id: 5, text: "Which CSS property adds rounded corners?", studentAns: "border-radius", correctAns: "border-radius", isCorrect: true, maxMarks: 20, scoreGiven: 8 },
    ]
  },
  {
    id: 104,
    studentName: "Neha Gupta",
    studentEmail: "neha.g@student.com",
    testId: 4,
    testTitle: "DBMS Fundamentals",
    date: "18 May 2025, 05:30 PM",
    score: "88 / 100",
    totalScore: 88,
    status: "Graded & Published",
    feedback: "Thorough grasp of normalization and ACID properties.",
    questions: [
      { id: 1, text: "What does ACID stand for in DBMS?", studentAns: "Atomicity, Consistency, Isolation, Durability", correctAns: "Atomicity, Consistency, Isolation, Durability", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 2, text: "Which SQL clause filters grouped records?", studentAns: "HAVING", correctAns: "HAVING", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 3, text: "What is a foreign key?", studentAns: "Reference to primary key in another table", correctAns: "Reference to primary key in another table", isCorrect: true, maxMarks: 20, scoreGiven: 20 },
      { id: 4, text: "Which normal form removes transitive dependency?", studentAns: "3NF", correctAns: "3NF", isCorrect: true, maxMarks: 20, scoreGiven: 18 },
      { id: 5, text: "Which command removes all rows without logging individual row deletes?", studentAns: "TRUNCATE", correctAns: "TRUNCATE", isCorrect: true, maxMarks: 20, scoreGiven: 10 },
    ]
  },
];

export const INITIAL_RESULTS = [
  { id: 1, title: "Operating Systems", test: "Operating Systems", subject: "Computer Science", date: "18 May 2025", score: "85%", student: "Rahul Verma", reviewer: "Dr. Johnson" },
  { id: 2, title: "Computer Networks", test: "Computer Networks", subject: "Computer Science", date: "15 May 2025", score: "72%", student: "Anjali Sharma", reviewer: "Dr. Johnson" },
  { id: 3, title: "Python Programming", test: "Python Programming", subject: "Computer Science", date: "12 May 2025", score: "80%", student: "Vikram Singh", reviewer: "Dr. Johnson" },
  { id: 4, title: "Database Systems", test: "DBMS Fundamentals", subject: "DBMS", date: "10 May 2025", score: "75%", student: "Neha Gupta", reviewer: "Dr. Johnson" },
  { id: 5, title: "Java Programming", test: "Java Programming", subject: "Computer Science", date: "08 May 2025", score: "95%", student: "Rahul Verma", reviewer: "Dr. Johnson" },
];

export const getStoredTests = () => {
  try {
    const raw = localStorage.getItem("smartassess_tests_list");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem("smartassess_tests_list", JSON.stringify(INITIAL_TESTS));
  return INITIAL_TESTS;
};

export const saveStoredTests = (tests) => {
  localStorage.setItem("smartassess_tests_list", JSON.stringify(tests));
};

export const getStoredSubmissions = () => {
  try {
    const raw = localStorage.getItem("smartassess_submissions");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem("smartassess_submissions", JSON.stringify(INITIAL_SUBMISSIONS));
  return INITIAL_SUBMISSIONS;
};

export const saveStoredSubmissions = (subs) => {
  localStorage.setItem("smartassess_submissions", JSON.stringify(subs));
};

export const getStoredResults = () => {
  try {
    const raw = localStorage.getItem("smartassess_results");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem("smartassess_results", JSON.stringify(INITIAL_RESULTS));
  return INITIAL_RESULTS;
};

export const saveStoredResults = (results) => {
  localStorage.setItem("smartassess_results", JSON.stringify(results));
};
