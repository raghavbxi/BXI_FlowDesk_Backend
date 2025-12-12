const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`mongodb+srv://Anmol:Bxiw2025@bxiworld-development.ehlehea.mongodb.net/BXI_Development_DB?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

