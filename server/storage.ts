import {
  users,
  barbers,
  chairs,
  services,
  bookings,
  bookingServices,
  type User,
  type UpsertUser,
  type Barber,
  type Chair,
  type Service,
  type Booking,
  type InsertBooking,
  type InsertBookingService,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Barber operations
  getBarbers(): Promise<Barber[]>;
  getBarber(id: number): Promise<Barber | undefined>;
  
  // Chair operations
  getChairs(): Promise<Chair[]>;
  getChair(id: number): Promise<Chair | undefined>;
  
  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  
  // Booking operations
  createBooking(booking: any, services: any[]): Promise<Booking>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  updateBookingPaymentStatus(id: number, status: string): Promise<void>;
  
  // Availability check
  checkAvailability(barberId: number, chairId: number, date: Date): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - Required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Barber operations
  async getBarbers(): Promise<Barber[]> {
    return await db.select().from(barbers).where(eq(barbers.isActive, true));
  }

  async getBarber(id: number): Promise<Barber | undefined> {
    const [barber] = await db.select().from(barbers).where(eq(barbers.id, id));
    return barber;
  }

  // Chair operations
  async getChairs(): Promise<Chair[]> {
    return await db.select().from(chairs).where(eq(chairs.isActive, true));
  }

  async getChair(id: number): Promise<Chair | undefined> {
    const [chair] = await db.select().from(chairs).where(eq(chairs.id, id));
    return chair;
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.isActive, true));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  // Booking operations
  async createBooking(bookingData: any, servicesData: any[]): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    
    // Add services to the booking
    const bookingServicesData = servicesData.map(service => ({
      ...service,
      bookingId: booking.id,
    }));
    
    await db.insert(bookingServices).values(bookingServicesData);
    
    return booking;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(bookings.bookingDate);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async updateBookingPaymentStatus(id: number, status: string): Promise<void> {
    await db
      .update(bookings)
      .set({ paymentStatus: status, updatedAt: new Date() })
      .where(eq(bookings.id, id));
  }

  // Availability check
  async checkAvailability(barberId: number, chairId: number, date: Date): Promise<boolean> {
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.barberId, barberId),
          eq(bookings.chairId, chairId),
          eq(bookings.bookingDate, date),
          eq(bookings.status, "confirmed")
        )
      );
    
    return existingBookings.length === 0;
  }
}

export const storage = new DatabaseStorage();
