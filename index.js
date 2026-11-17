import express from 'express';
import { MongoClient } from 'mongodb';
import 'dotenv/config';


const app =express();
const PORT = 8000;

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectClient = await connectToMongoDB()
const db= connectClient.db('pizza-hub')
const users =  db.collection('users')
const menus =  db.collection('menus')
const order =  db.collection('orders')





app.get('/',(req,res)=>{
   res.send({message:"Server is running"})
})

app.listen(PORT,()=>{
    console.log(`Server is running at port,${PORT}`)

})