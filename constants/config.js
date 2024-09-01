const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:5000/",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

export { corsOptions };
