import mongoose from 'mongoose';

/**
 * Database Core Module
 * Singleton MongoDB connection
 */
class Database {
  private static instance: Database;
  private connectionString: string;

  private constructor() {
    this.connectionString = process.env.MONGODB_URI || '';

    if (!this.connectionString) {
      throw new Error('MONGODB_URI environment variable is required');
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<typeof mongoose> {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    try {
      await mongoose.connect(this.connectionString);
      console.log('✅ MongoDB connected');
      return mongoose;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  getConnection() {
    return mongoose.connection;
  }
}

export const db = Database.getInstance();
