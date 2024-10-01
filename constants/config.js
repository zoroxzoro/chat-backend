const corsOptions = {
  origin: [
    "http://localhost:4173",
    process.env.CLIENT_URL, // Ensure this is set correctly in the .env file
    "https://chat-frontend-delta-five.vercel.app",
    "https://chat-frontend-iota-puce.vercel.app/login",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

export { corsOptions };
