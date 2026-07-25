import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Card from './models/Card.js';

dotenv.config();

const test = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected!');

    const cards = await Card.find({});
    console.log('Cards:', JSON.stringify(cards, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

test();
