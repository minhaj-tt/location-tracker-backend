import { Request, Response } from "express";
import * as eventService from "../services/eventServices";

export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const {
      title,
      start,
      end,
      attendees,
    }: { title: string; start: string; end: string; attendees: number[] } =
      req.body;

    if (!title || !start || !end || !attendees || attendees.length === 0) {
      res
        .status(400)
        .json({ message: "Invalid input: Missing required fields" });
      return;
    }

    const startDatetime = new Date(start);
    const endDatetime = new Date(end);

    if (isNaN(startDatetime.getTime()) || isNaN(endDatetime.getTime())) {
      res.status(400).json({ message: "Invalid datetime format" });
      return;
    }

    const event = await eventService.createEvent(
      title,
      startDatetime,
      endDatetime,
      attendees
    );

    res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Error in createEvent:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAllEvents(req: Request, res: Response): Promise<void> {
  try {
    const events = await eventService.getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    console.error("Error in getAllEvents:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getEventsForUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.userId || "1";

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const events = await eventService.getAllEvents();

    res
      .status(200)
      .json({ message: "Events fetched successfully", events: events });
  } catch (error) {
    console.error("Error in getEventsForUser API:", error);
    res.status(500).json({ message: "Server error" });
  }
}

export async function editEvent(req: Request, res: Response): Promise<void> {
  try {
    const { eventId } = req.params;
    const {
      title,
      start,
      end,
      attendees,
    }: { title: string; start: string; end: string; attendees: number[] } =
      req.body;

    if (!title || !start || !end || !attendees || attendees.length === 0) {
      res
        .status(400)
        .json({ message: "Invalid input: Missing required fields" });
      return;
    }

    const startDatetime = new Date(start);
    const endDatetime = new Date(end);

    if (isNaN(startDatetime.getTime()) || isNaN(endDatetime.getTime())) {
      res.status(400).json({ message: "Invalid datetime format" });
      return;
    }

    const event = await eventService.editEvent(
      parseInt(eventId),
      title,
      startDatetime,
      endDatetime,
      attendees
    );

    res.status(200).json({
      message: "Event edited successfully",
      event,
    });
  } catch (error) {
    console.error("Error in editEvent:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
