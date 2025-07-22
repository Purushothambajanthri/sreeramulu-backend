import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBookingSchema, insertBookingServiceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Public routes - no authentication required

  // Barbers
  app.get('/api/barbers', async (req, res) => {
    try {
      const barbers = await storage.getBarbers();
      res.json(barbers);
    } catch (error) {
      console.error("Error fetching barbers:", error);
      res.status(500).json({ message: "Failed to fetch barbers" });
    }
  });

  // Chairs
  app.get('/api/chairs', async (req, res) => {
    try {
      const chairs = await storage.getChairs();
      res.json(chairs);
    } catch (error) {
      console.error("Error fetching chairs:", error);
      res.status(500).json({ message: "Failed to fetch chairs" });
    }
  });

  // Services
  app.get('/api/services', async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Bookings - Now public, no authentication required
  app.post('/api/bookings', async (req: any, res) => {
    try {
      // Generate a simple guest user ID based on phone number
      const guestUserId = `guest_${req.body.phoneNumber}`;
      
      const bookingData = {
        userId: guestUserId,
        barberId: parseInt(req.body.barberId),
        chairId: parseInt(req.body.chairId),
        bookingDate: new Date(req.body.bookingDate),
        phoneNumber: req.body.phoneNumber,
        customerName: req.body.customerName,
        totalAmount: req.body.totalAmount, // Keep as string for decimal
        paymentMethod: req.body.paymentMethod,
        paymentStatus: req.body.paymentStatus || 'pending',
        status: 'confirmed',
      };

      // Prepare services data
      const services = req.body.services || [];
      const servicesData = services.map((service: any) => ({
        serviceId: parseInt(service.serviceId),
        quantity: parseInt(service.quantity) || 1,
        price: service.price,
      }));

      // Check availability
      const isAvailable = await storage.checkAvailability(
        bookingData.barberId,
        bookingData.chairId,
        bookingData.bookingDate
      );

      if (!isAvailable) {
        return res.status(400).json({ message: "This slot is not available" });
      }

      const booking = await storage.createBooking(bookingData, servicesData);
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Check availability
  app.get('/api/availability', async (req, res) => {
    try {
      const { barberId, chairId, date } = req.query;
      
      if (!barberId || !chairId || !date) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const isAvailable = await storage.checkAvailability(
        parseInt(barberId as string),
        parseInt(chairId as string),
        new Date(date as string)
      );

      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Update payment status - Now public
  app.patch('/api/bookings/:id/payment', async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { status } = req.body;
      
      await storage.updateBookingPaymentStatus(bookingId, status);
      res.json({ message: "Payment status updated" });
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
