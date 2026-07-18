import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/wealthgenie');
try {
  const session = await mongoose.startSession();
  session.startTransaction();
  console.log('Transactions are supported!');
  await session.abortTransaction();
  session.endSession();
} catch (e) {
  console.log('Transactions NOT supported:', e.message);
}
await mongoose.disconnect();
