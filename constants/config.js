const corsOptions = {
  origin: [
    "http://localhost:4173",
<<<<<<< HEAD
    process.env.CLIENT_URL, // Ensure this is set correctly in the .env file
    "https://chat-frontend-delta-five.vercel.app",
    "https://chat-frontend-iota-puce.vercel.app/login",
=======
    process.env.CLIENT_URL,
    "chat-frontend-delta-five.vercel.app",
    "chat-frontend-peach.vercel.app"
>>>>>>> 9713bc5530f5930b7207ebc4f6416db340ded7e8
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

export { corsOptions };
