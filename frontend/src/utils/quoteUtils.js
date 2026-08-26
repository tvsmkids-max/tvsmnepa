const EDUCATIONAL_QUOTES = [
  {
    quote:
      "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
  },
  {
    quote:
      "Learning gives creativity, creativity leads to thinking, thinking provides knowledge, knowledge makes you great.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    quote: "Arise, awake, and stop not till the goal is reached.",
    author: "Swami Vivekananda",
  },
  {
    quote: "The mind is not a vessel to be filled, but a fire to be kindled.",
    author: "Plutarch",
  },
  {
    quote:
      "Education is not the learning of facts, but the training of the mind to think.",
    author: "Albert Einstein",
  },
  {
    quote:
      "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
  },
  {
    quote:
      "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
  },
  {
    quote: "Excellence is a continuous process and not an accident.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
  },
  {
    quote:
      "The function of education is to teach one to think intensively and to think critically.",
    author: "Martin Luther King Jr.",
  },
  {
    quote: "Knowledge will give you power, but character respect.",
    author: "Bruce Lee",
  },
  {
    quote: "What a teacher is, is more important than what he teaches.",
    author: "Karl A. Menninger",
  },
  {
    quote:
      "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
    author: "Malcolm X",
  },
  { quote: "To teach is to learn twice.", author: "Joseph Joubert" },
  {
    quote: "Children must be taught how to think, not what to think.",
    author: "Margaret Mead",
  },
  {
    quote: "A person who never made a mistake never tried anything new.",
    author: "Albert Einstein",
  },
  {
    quote: "He who opens a school door, closes a prison.",
    author: "Victor Hugo",
  },
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
  },
  {
    quote: "Education is the key to unlock the golden door of freedom.",
    author: "George Washington Carver",
  },
  {
    quote:
      "Teachers can change lives with just the right mix of chalk and challenges.",
    author: "Joyce Meyer",
  },
  {
    quote:
      "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.",
    author: "Albert Einstein",
  },
  {
    quote: "You can never be overdressed or overeducated.",
    author: "Oscar Wilde",
  },
  {
    quote:
      "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.",
    author: "Brad Henry",
  },
  {
    quote:
      "Education without values, as useful as it is, seems rather to make man a more clever devil.",
    author: "C.S. Lewis",
  },
  {
    quote:
      "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    author: "Dr. Seuss",
  },
  {
    quote:
      "Let us remember: One book, one pen, one child, and one teacher can change the world.",
    author: "Malala Yousafzai",
  },
  {
    quote: "Change is the end result of all true learning.",
    author: "Leo Buscaglia",
  },
  {
    quote: "Education is the mother of leadership.",
    author: "Wendell Willkie",
  },
  {
    quote:
      "Every student can learn, just not on the same day, or the same way.",
    author: "George Evans",
  },
  {
    quote:
      "I am always ready to learn although I do not always like being taught.",
    author: "Winston Churchill",
  },
  {
    quote:
      "Study without desire spoils the memory, and it retains nothing that it takes in.",
    author: "Leonardo da Vinci",
  },
  {
    quote:
      "You educate a man; you educate a man. You educate a woman; you educate a generation.",
    author: "Brigham Young",
  },
  {
    quote: "The highest result of education is tolerance.",
    author: "Helen Keller",
  },
  {
    quote: "The art of teaching is the art of assisting discovery.",
    author: "Mark Van Doren",
  },
  {
    quote:
      "Education is a shared commitment between dedicated teachers, motivated students and enthusiastic parents.",
    author: "Bob Beauprez",
  },
  { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  {
    quote:
      "A teacher affects eternity; he can never tell where his influence stops.",
    author: "Henry Adams",
  },
  {
    quote: "Don't let what you cannot do interfere with what you can do.",
    author: "John Wooden",
  },
  {
    quote: "Education is not preparation for life; education is life itself.",
    author: "John Dewey",
  },
  {
    quote:
      "The only person who is educated is the one who has learned how to learn and change.",
    author: "Carl Rogers",
  },
  {
    quote:
      "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.",
    author: "Albert Einstein",
  },
  {
    quote:
      "Education is the ability to listen to almost anything without losing your temper or your self-confidence.",
    author: "Robert Frost",
  },
  {
    quote:
      "A child's life is like a piece of paper on which every person leaves a mark.",
    author: "Robert A. Heinlein",
  },
  {
    quote: "If you think education is expensive, try ignorance.",
    author: "Derek Bok",
  },
  {
    quote:
      "To me education is a leading out of what is already there in the pupil's soul.",
    author: "Muriel Spark",
  },
  {
    quote: "Teaching is the greatest act of optimism.",
    author: "Colleen Wilcox",
  },
  {
    quote: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    quote: "The great aim of education is not knowledge but action.",
    author: "Herbert Spencer",
  },
  { quote: "Knowledge speaks, but wisdom listens.", author: "Jimi Hendrix" },
  {
    quote:
      "Education is what survives when what has been learned has been forgotten.",
    author: "B.F. Skinner",
  },
  {
    quote: "The mind, once enlightened, cannot again become dark.",
    author: "Thomas Paine",
  },
  {
    quote:
      "They cannot stop me. I will get my education, if it is in the home, school, or anyplace.",
    author: "Malala Yousafzai",
  },
  {
    quote: "Instruction does much, but encouragement everything.",
    author: "Johann Wolfgang von Goethe",
  },
  {
    quote: "Learning is a treasure that will follow its owner everywhere.",
    author: "Chinese Proverb",
  },
  {
    quote: "Education costs money. But then so does ignorance.",
    author: "Sir Claus Moser",
  },
  {
    quote:
      "Teachers, I believe, are the most responsible and important members of society.",
    author: "Helen Caldicott",
  },
  {
    quote: "Genius without education is like silver in the mine.",
    author: "Benjamin Franklin",
  },
  {
    quote: "He who knows, does. He who understands, teaches.",
    author: "Aristotle",
  },
  {
    quote: "By seeking and blundering we learn.",
    author: "Johann Wolfgang von Goethe",
  },
  {
    quote: "Education is the foundation upon which we build our future.",
    author: "Christine Gregoire",
  },
  {
    quote:
      "The direction in which education starts a man will determine his future in life.",
    author: "Plato",
  },
  { quote: "We learn from failure, not from success!", author: "Bram Stoker" },
  {
    quote:
      "Education is not a tool for development - individual, community and the nation. It is the foundation for our future.",
    author: "Nitin Namdeo",
  },
  {
    quote:
      "No one has yet realized the wealth of sympathy, the kindness and generosity hidden in the soul of a child.",
    author: "Emma Goldman",
  },
  {
    quote: "You learn something every day if you pay attention.",
    author: "Ray LeBlond",
  },
  {
    quote: "A well-educated mind will always have more questions than answers.",
    author: "Helen Keller",
  },
  {
    quote:
      "A good teacher is like a candle—it consumes itself to light the way for others.",
    author: "Mustafa Kemal Atatürk",
  },
  {
    quote: "Never stop learning, because life never stops teaching.",
    author: "Lin Pernille",
  },
  {
    quote:
      "Knowledge is power. Information is liberating. Education is the premise of progress.",
    author: "Kofi Annan",
  },
  {
    quote:
      "Teaching kids to count is fine, but teaching them what counts is best.",
    author: "Bob Talbert",
  },
  {
    quote:
      "The philosophy of the school room in one generation will be the philosophy of government in the next.",
    author: "Abraham Lincoln",
  },
  {
    quote:
      "In a global economy where the most valuable skill you can sell is your knowledge, a good education is no longer just a pathway to opportunity - it is a pre-requisite.",
    author: "Barack Obama",
  },
  {
    quote:
      "Tell me and I forget. Teach me and I remember. Involve me and I learn.",
    author: "Benjamin Franklin",
  },
  {
    quote: "The roots of education are bitter, but the fruit is sweet.",
    author: "Aristotle",
  },
  {
    quote: "Your attitude, not your aptitude, will determine your altitude.",
    author: "Zig Ziglar",
  },
  {
    quote: "Don't let schooling interfere with your education.",
    author: "Mark Twain",
  },
  {
    quote: "Education is teaching our children to desire the right things.",
    author: "Plato",
  },
  {
    quote: "Education is the movement from darkness to light.",
    author: "Allan Bloom",
  },
  {
    quote:
      "If you are planning for a year, sow rice; if you are planning for a decade, plant trees; if you are planning for a lifetime, educate people.",
    author: "Chinese Proverb",
  },
  {
    quote: "The secret in education lies in respecting the student.",
    author: "Ralph Waldo Emerson",
  },
  {
    quote:
      "What sculpture is to a block of marble, education is to the human soul.",
    author: "Joseph Addison",
  },
  {
    quote:
      "A teacher's purpose is not to create students in his own image, but to develop students who can create their own image.",
    author: "Unknown",
  },
  {
    quote:
      "It is the mark of an educated mind to be able to entertain a thought without accepting it.",
    author: "Aristotle",
  },
  {
    quote: "Education is the lighting of a fire, not the filling of a pail.",
    author: "W.B. Yeats",
  },
  {
    quote:
      "Do not train a child to learn by force or harshness; but direct them to it by what amuses their minds.",
    author: "Plato",
  },
  {
    quote: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    quote:
      "The mind is just like a muscle - the more you exercise it, the stronger it gets and the more it can expand.",
    author: "Idowu Koyenikan",
  },
  {
    quote: "Teachers open the door, but you must enter by yourself.",
    author: "Chinese Proverb",
  },
  {
    quote: "Education is a progressive discovery of our own ignorance.",
    author: "Will Durant",
  },
  {
    quote:
      "Develop a passion for learning. If you do, you will never cease to grow.",
    author: "Anthony J. D'Angelo",
  },
  {
    quote:
      "A truly special teacher is very wise, and sees tomorrow in every child's eyes.",
    author: "Unknown",
  },
  {
    quote: "To know how to suggest is the great art of teaching.",
    author: "Henri Frederic Amiel",
  },
  {
    quote:
      "The job of an educator is to teach students to see vitality in themselves.",
    author: "Joseph Campbell",
  },
  {
    quote:
      "A human being is not attaining his full heights until he is educated.",
    author: "Horace Mann",
  },
  {
    quote: "Good teachers know how to bring out the best in students.",
    author: "Charles Kuralt",
  },
  {
    quote:
      "The most important part of education is proper training in the nursery.",
    author: "Plato",
  },
  {
    quote: "I cannot teach anybody anything, I can only make them think.",
    author: "Socrates",
  },
  {
    quote:
      "Whatever the cost of our libraries, the price is cheap compared to that of an ignorant nation.",
    author: "Walter Cronkite",
  },
  {
    quote: "The best teachers teach from the heart, not from the book.",
    author: "Unknown",
  },
  {
    quote: "Education is a better safeguard of liberty than a standing army.",
    author: "Edward Everett",
  },
  {
    quote:
      "Learning starts with failure; the first failure is the beginning of education.",
    author: "John Hersey",
  },
  {
    quote: "When you learn, teach. When you get, give.",
    author: "Maya Angelou",
  },
  {
    quote:
      "An educational system isn't worth a great deal if it teaches young people how to make a living but doesn't teach them how to make a life.",
    author: "Unknown",
  },
  { quote: "Only the educated are free.", author: "Epictetus" },
  {
    quote: "He who opens a school door, closes a prison.",
    author: "Victor Hugo",
  },
  {
    quote: "It is easier to build strong children than to repair broken men.",
    author: "Frederick Douglass",
  },
  {
    quote:
      "The teacher who is indeed wise does not bid you to enter the house of his wisdom but rather leads you to the threshold of your mind.",
    author: "Kahlil Gibran",
  },
  {
    quote:
      "A teacher plants the seeds of knowledge, sprinkles them with love, and patiently nurtures their growth to produce tomorrow's dreams.",
    author: "Unknown",
  },
  {
    quote:
      "You can't do it alone. Be open to collaboration. Find a group of people who challenge and inspire you. Spend a lot of time with them and it will change your life.",
    author: "Amy Poehler",
  },
  { quote: "Learning is not a spectator sport.", author: "D. Blocher" },
  {
    quote: "A child without education is like a bird without wings.",
    author: "Tibetan Proverb",
  },
  {
    quote:
      "Without education, we are in a horrible and deadly danger of taking educated people seriously.",
    author: "G.K. Chesterton",
  },
  {
    quote:
      "Give a man a bowl of rice and you feed him for a day. Teach him how to grow his own rice and you save his life.",
    author: "Confucius",
  },
  {
    quote:
      "A teacher's job is to take a bunch of live wires and see that they are well-grounded.",
    author: "D. Martin",
  },
  {
    quote:
      "Keep away from people who try to belittle your ambitions. Small people always do that, but the really great make you feel that you, too, can become great.",
    author: "Mark Twain",
  },
  { quote: "Strive for progress, not perfection.", author: "Unknown" },
  {
    quote:
      "Spoon feeding in the long run teaches us nothing but the shape of the spoon.",
    author: "E.M. Forster",
  },
  {
    quote:
      "Knowledge is like a garden: if it is not cultivated, it cannot be harvested.",
    author: "African Proverb",
  },
  {
    quote:
      "Aim for success, not perfection. Never give up your right to be wrong.",
    author: "Dr. David M. Burns",
  },
  {
    quote: "What we learn with pleasure we never forget.",
    author: "Alfred Mercier",
  },
  {
    quote: "Every artist was first an amateur.",
    author: "Ralph Waldo Emerson",
  },
  {
    quote:
      "There is no end to education. It is not that you read a book, pass an examination, and finish with education.",
    author: "Jiddu Krishnamurti",
  },
  {
    quote: "Nine-tenths of education is encouragement.",
    author: "Anatole France",
  },
  {
    quote: "A good teacher must know the rules; a good pupil, the exceptions.",
    author: "Martin H. Fischer",
  },
  {
    quote:
      "The object of education is to prepare the young to educate themselves throughout their lives.",
    author: "Robert M. Hutchins",
  },
  {
    quote: "Education’s purpose is to replace an empty mind with an open one.",
    author: "Malcolm Forbes",
  },
  {
    quote:
      "Learning is a continuous process. It is not limited to schools and colleges.",
    author: "Unknown",
  },
  {
    quote: "We don’t stop going to school when we graduate.",
    author: "Carol Burnett",
  },
  {
    quote:
      "Education makes a people easy to lead but difficult to drive: easy to govern, but impossible to enslave.",
    author: "Peter Brougham",
  },
  {
    quote: "Curiosity is the wick in the candle of learning.",
    author: "William Arthur Ward",
  },
  {
    quote: "Real learning comes about when the competitive spirit has ceased.",
    author: "Jiddu Krishnamurti",
  },
  {
    quote: "The only real failure in life is one not learned from.",
    author: "Anthony J. D'Angelo",
  },
  {
    quote:
      "Better than a thousand days of diligent study is one day with a great teacher.",
    author: "Japanese Proverb",
  },
  {
    quote:
      "Knowledge has to be improved, challenged, and increased constantly, or it vanishes.",
    author: "Peter Drucker",
  },
  { quote: "I touch the future. I teach.", author: "Christa McAuliffe" },
  {
    quote:
      "Students don't care how much you know until they know how much you care.",
    author: "John C. Maxwell",
  },
  {
    quote: "Good teaching is 1/4 preparation and 3/4 pure theatre.",
    author: "Gail Godwin",
  },
  { quote: "To teach is to touch a life forever.", author: "Unknown" },
  {
    quote:
      "A good teacher is someone who can understand those who are not very good at explaining, and explain to those who are not very good at understanding.",
    author: "Dwight D. Eisenhower",
  },
  {
    quote:
      "Never discourage anyone who continually makes progress, no matter how slow.",
    author: "Plato",
  },
  {
    quote:
      "You don't understand anything until you learn it more than one way.",
    author: "Marvin Minsky",
  },
  {
    quote:
      "The mind is not a vessel that needs filling, but wood that needs igniting.",
    author: "Mestrius Plutarchus",
  },
  {
    quote: "Learn continually - there's always 'one more thing' to learn.",
    author: "Steve Jobs",
  },
  {
    quote:
      "If you want to be successful, it's just this simple: Know what you are doing, love what you are doing, and believe in what you are doing.",
    author: "Will Rogers",
  },
  {
    quote:
      "Education breeds confidence. Confidence breeds hope. Hope breeds peace.",
    author: "Confucius",
  },
  {
    quote:
      "If a child can't learn the way we teach, maybe we should teach the way they learn.",
    author: "Ignacio Estrada",
  },
  {
    quote:
      "What is a teacher? I'll tell you: it isn't someone who teaches something, but someone who inspires the student to give of her best in order to discover what she already knows.",
    author: "Paulo Coelho",
  },
  {
    quote:
      "All our dreams can come true if we have the courage to pursue them.",
    author: "Walt Disney",
  },
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    quote:
      "Education is not simply about acquiring knowledge; it's about forming character.",
    author: "Unknown",
  },
  {
    quote: "In learning you will teach, and in teaching you will learn.",
    author: "Phil Collins",
  },
];

/**
 * Returns a unique daily educational quote for each user.
 * Mathematically loops perfectly so it never crashes!
 */
export const getDailyQuoteForUser = (user) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const userIdStr = user?._id || user?.name || "tvsm";
  const userHash = userIdStr
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // The `%` (modulo) operator forces the index to automatically loop back to 0!
  const index = Math.abs(dayOfYear + userHash) % EDUCATIONAL_QUOTES.length;
  return EDUCATIONAL_QUOTES[index];
};
