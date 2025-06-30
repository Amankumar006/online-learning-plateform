export interface Lesson {
  id: string;
  title: string;
  subject: string;
  description: string;
  image: string;
  videoUrl?: string;
  content: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export const lessons: Lesson[] = [
  {
    id: '1',
    title: 'Introduction to Algebra',
    subject: 'Mathematics',
    description: 'Learn the fundamental concepts of algebra, including variables, equations, and functions.',
    image: 'https://placehold.co/600x400.png',
    videoUrl: 'https://www.youtube.com/embed/grSekI2xp2s',
    content: 'Algebra is a branch of mathematics that substitutes letters for numbers. An algebraic equation represents a scale, what is done on one side of the scale with a number is also done to the other side of the scale. The numbers are the constants. Algebra can include real numbers, complex numbers, matrices, vectors, and many more forms of mathematical representation.',
    difficulty: 'Beginner',
  },
  {
    id: '2',
    title: 'The Laws of Motion',
    subject: 'Physics',
    description: 'Explore Newton\'s three laws of motion and their applications in the real world.',
    image: 'https://placehold.co/600x400.png',
    content: 'Newton\'s First Law states that an object will remain at rest or in uniform motion in a straight line unless acted upon by an external force. The Second Law states that the acceleration of an object is directly proportional to the net force and inversely proportional to its mass. The Third Law states that for every action, there is an equal and opposite reaction.',
    difficulty: 'Intermediate',
  },
  {
    id: '3',
    title: 'Cellular Respiration',
    subject: 'Biology',
    description: 'Understand the process of how cells generate energy in the form of ATP.',
    image: 'https://placehold.co/600x400.png',
    videoUrl: 'https://www.youtube.com/embed/00jbG_cfGuQ',
    content: 'Cellular respiration is a set of metabolic reactions and processes that take place in the cells of organisms to convert chemical energy from oxygen molecules or nutrients into adenosine triphosphate (ATP), and then release waste products.',
    difficulty: 'Advanced',
  },
  {
    id: '4',
    title: 'The Renaissance Period',
    subject: 'History',
    description: 'Discover the art, culture, and innovations of the European Renaissance.',
    image: 'https://placehold.co/600x400.png',
    content: 'The Renaissance was a fervent period of European cultural, artistic, political and economic “rebirth” following the Middle Ages. Generally described as taking place from the 14th century to the 17th century, the Renaissance promoted the rediscovery of classical philosophy, literature and art.',
    difficulty: 'Intermediate'
  }
];

export const userProgress = {
  completedLessons: 12,
  averageScore: 88,
  mastery: 75,
  subjectsMastery: [
    { subject: 'Algebra', mastery: 90 },
    { subject: 'Physics', mastery: 75 },
    { subject: 'Biology', mastery: 60 },
    { subject: 'History', mastery: 85 },
    { subject: 'Chemistry', mastery: 40 },
  ],
};

export const exercises = [
    {
      id: 'alg-1',
      lessonId: '1',
      difficulty: 1,
      question: 'Solve for x: 2x + 3 = 7',
      options: ['1', '2', '3', '4'],
      correctAnswer: '2',
    },
    {
      id: 'alg-2',
      lessonId: '1',
      difficulty: 2,
      question: 'What is the value of x in the equation 5x - 15 = 10?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '5',
    },
    {
        id: 'alg-3',
        lessonId: '1',
        difficulty: 3,
        question: 'Factor the expression: x² + 5x + 6',
        options: ['(x+2)(x+3)', '(x+1)(x+6)', '(x-2)(x-3)', '(x-1)(x-6)'],
        correctAnswer: '(x+2)(x+3)',
      },
    {
      id: 'phy-1',
      lessonId: '2',
      difficulty: 1,
      question: 'Which law is also known as the law of inertia?',
      options: ['First Law', 'Second Law', 'Third Law', 'Zeroth Law'],
      correctAnswer: 'First Law',
    },
    {
        id: 'phy-2',
        lessonId: '2',
        difficulty: 2,
        question: 'If a 5kg object is pushed with a force of 20N, what is its acceleration?',
        options: ['2 m/s²', '3 m/s²', '4 m/s²', '5 m/s²'],
        correctAnswer: '4 m/s²',
    },
];
