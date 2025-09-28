import express from "express";
import cors from 'cors';
import tagsRoute from "./routes/tags.mjs";
import mongoose from 'mongoose'
const app=express()
import dotenv from 'dotenv';

dotenv.config();

const mongodbUrl = process.env.MONGO_URL ||'mongodb+srv://222kashafnaveed:kashafnaveed@cluster0.vdp24.mongodb.net/SampleBackend?retryWrites=true&w=majority'
console.log(mongodbUrl)

import notesRoutes from './routes/notesRoutes.js'
const port = process.env.PORT | 5002
 
app.use(express.json())
app.use(cors())

app.use('/notes' ,notesRoutes )
app.use("/tags", tagsRoute);


mongoose.connect(mongodbUrl).then(() => {
  console.log("Database is connected")
}).catch((err) => {
  console.log(err)
})


app.listen(port, () => {
  console.log(`Server is running on ${port}`)
})