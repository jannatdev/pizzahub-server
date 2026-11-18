import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import imageRoutes from "./route/image.route.ts";


const app = express();
const PORT = 8000;

// Allow the Next.js frontend to call the API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
}));
app.use(express.json());
app.use((req, res, next) => {
  
  next();
});

app.use("/images", imageRoutes);

app.use((err, req, res, next) => {
  console.error("Backend error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Something went wrong",
  });
});



const DB_NAME = 'pizza-hub';
const COLLECTIONS = ['users', 'menus', 'orders'];

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Add it to your .env file.');
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  await client.connect();
  console.log('You successfully connected to MongoDB!');
  return client;
}


async function ensureCollections(db) {
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      console.log(`Created collection "${name}" in "${DB_NAME}"`);
    } catch (err) {
      // 48 / NamespaceExists -> collection is already there, nothing to do.
      if (err.code === 48 || err.codeName === 'NamespaceExists') continue;
      console.warn(`Could not create collection "${name}":`, err.message);
    }
  }
}

let db;
try {
  const connectClient = await connectToMongoDB();
  db = connectClient.db(DB_NAME);
  await ensureCollections(db);
} catch (err) {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
}

const user = db.collection('users');
const menus = db.collection('menus');
const orders = db.collection('orders');



app.get('/', (req, res) => {
  res.send({ message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running at port,${PORT}`);
});
