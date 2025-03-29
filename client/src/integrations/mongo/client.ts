
// This file is a simulation for MongoDB connection
// In a real application, this would be implemented server-side

// MongoDB connection parameters
export const MONGO_URI = "mongodb://127.0.0.1:27017/outingApp";

// Simulated MongoDB client for frontend demo purposes
class MongoClient {
  private static instance: MongoClient;
  private connected: boolean = false;
  
  private constructor() {
    console.log(`MongoDB client initialized with URI: ${MONGO_URI}`);
  }
  
  public static getInstance(): MongoClient {
    if (!MongoClient.instance) {
      MongoClient.instance = new MongoClient();
    }
    return MongoClient.instance;
  }
  
  public async connect(): Promise<boolean> {
    // This would actually connect to MongoDB in a real backend
    console.log("Simulating MongoDB connection...");
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.connected = true;
    console.log("MongoDB connected successfully (simulated)");
    return true;
  }
  
  public isConnected(): boolean {
    return this.connected;
  }
  
  public async disconnect(): Promise<void> {
    console.log("Disconnecting from MongoDB (simulated)");
    this.connected = false;
  }
}

// Export singleton instance
export const mongoClient = MongoClient.getInstance();

// Simulate connecting to MongoDB on app initialization
mongoClient.connect().catch(error => {
  console.error("Failed to connect to MongoDB:", error);
});
