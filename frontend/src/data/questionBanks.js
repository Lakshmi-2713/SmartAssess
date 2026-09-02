/**
 * Subject question banks.
 *
 * Extracted from TakeTest so the exam component holds no test content, and so
 * banks can be swapped for a server-provided paper without touching the UI.
 * `correct` is the zero-based index into `options`.
 */
export const QUESTION_BANKS = {
  Java: [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { id: 2, text: "Which keyword is used to inherit a class in Java?", options: ["implements", "inherits", "extends", "import"], correct: 2 },
    { id: 3, text: "What is the size of the int data type in Java?", options: ["8 bit", "16 bit", "32 bit", "64 bit"], correct: 2 },
    { id: 4, text: "Which of these is NOT a Java access modifier?", options: ["public", "protected", "friend", "private"], correct: 2 },
    { id: 5, text: "Which collection allows duplicate elements?", options: ["Set", "List", "Map", "TreeSet"], correct: 1 },
  ],
  DSA: [
    { id: 1, text: "Which data structure uses LIFO (Last In First Out) ordering?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { id: 2, text: "What is the worst-case time complexity of Quick Sort?", options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"], correct: 1 },
    { id: 3, text: "Which traversal visits the root node first?", options: ["In-order", "Post-order", "Pre-order", "Level-order"], correct: 2 },
    { id: 4, text: "What is the time complexity of searching in a balanced BST?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], correct: 2 },
    { id: 5, text: "Which algorithm finds shortest paths from a single source in weighted graphs?", options: ["Kruskal", "Prim", "Dijkstra", "Floyd-Warshall"], correct: 2 },
  ],
  "Web Dev": [
    { id: 1, text: "Which HTML tag is used for internal CSS styles?", options: ["<css>", "<script>", "<style>", "<link>"], correct: 2 },
    { id: 2, text: "What does CSS stand for?", options: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style System", "Colourful Style Sheet"], correct: 1 },
    { id: 3, text: "Which hook manages local component state in React?", options: ["useEffect", "useMemo", "useState", "useRef"], correct: 2 },
    { id: 4, text: "Which HTTP status code means 'Resource Not Found'?", options: ["200", "401", "404", "500"], correct: 2 },
    { id: 5, text: "Which of the following is NOT a JavaScript data type?", options: ["undefined", "boolean", "float", "symbol"], correct: 2 },
  ],
  DBMS: [
    { id: 1, text: "What does SQL stand for?", options: ["Structured Query Language", "Simple Question Language", "Sequential Query Logic", "Standard Query Language"], correct: 0 },
    { id: 2, text: "Which SQL clause is used to filter grouped data?", options: ["WHERE", "ORDER BY", "HAVING", "GROUP BY"], correct: 2 },
    { id: 3, text: "What does ACID stand for in DBMS?", options: ["Atomicity, Consistency, Isolation, Durability", "Automated, Compact, Isolated, Durable", "All, Clear, Indexed, Data", "Accuracy, Control, Integrity, Definition"], correct: 0 },
    { id: 4, text: "Which normal form eliminates transitive dependency?", options: ["1NF", "2NF", "3NF", "BCNF"], correct: 2 },
    { id: 5, text: "Which command removes all records without row-by-row logging?", options: ["DELETE", "DROP", "TRUNCATE", "REMOVE"], correct: 2 },
  ],
  OS: [
    { id: 1, text: "Which scheduling algorithm gives the minimum average waiting time?", options: ["FCFS", "Round Robin", "SJF (Shortest Job First)", "Priority"], correct: 2 },
    { id: 2, text: "Which deadlock condition describes a process holding a resource while waiting for another?", options: ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Circular Wait"], correct: 1 },
    { id: 3, text: "What is the main purpose of virtual memory?", options: ["Speed up the CPU", "Simulate a larger memory space", "Prevent viruses", "Cache GPU instructions"], correct: 1 },
    { id: 4, text: "Which memory management technique divides physical memory into fixed-size blocks?", options: ["Segmentation", "Paging", "Fragmentation", "Swapping"], correct: 1 },
    { id: 5, text: "Which system call creates a new child process in UNIX/Linux?", options: ["fork()", "exec()", "spawn()", "create()"], correct: 0 },
  ],
  CN: [
    { id: 1, text: "Which layer of the OSI model handles routing?", options: ["Data Link", "Network", "Transport", "Session"], correct: 1 },
    { id: 2, text: "Which protocol guarantees ordered, reliable delivery?", options: ["UDP", "IP", "TCP", "ICMP"], correct: 2 },
    { id: 3, text: "What is the default port for HTTPS?", options: ["80", "21", "443", "8080"], correct: 2 },
    { id: 4, text: "Which device operates at the data link layer?", options: ["Hub", "Switch", "Router", "Repeater"], correct: 1 },
    { id: 5, text: "What does DNS translate?", options: ["MAC to IP", "Domain names to IP addresses", "IP to port", "Binary to hex"], correct: 1 },
  ],
  Python: [
    { id: 1, text: "Which keyword defines a function in Python?", options: ["func", "define", "def", "function"], correct: 2 },
    { id: 2, text: "Which data type is immutable in Python?", options: ["list", "dict", "set", "tuple"], correct: 3 },
    { id: 3, text: "What does the len() function return for an empty list?", options: ["None", "0", "-1", "Raises an error"], correct: 1 },
    { id: 4, text: "Which statement handles exceptions in Python?", options: ["catch", "try/except", "throw", "handle"], correct: 1 },
    { id: 5, text: "What is a list comprehension used for?", options: ["Sorting a list", "Building a list concisely from an iterable", "Deleting elements", "Reversing a list"], correct: 1 },
  ],
};

export default QUESTION_BANKS;
