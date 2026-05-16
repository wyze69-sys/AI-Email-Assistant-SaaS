const dns = require("dns");
const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  const dnsServers = process.env.MONGODB_DNS_SERVERS;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the environment.");
  }

  if (dnsServers) {
    dns.setServers(dnsServers.split(",").map((server) => server.trim()));
  }

  const connection = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
}

module.exports = connectDB;
