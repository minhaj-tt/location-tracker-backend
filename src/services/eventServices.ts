import pool from "../db";

export async function createEvent(
  title: string,
  startDatetime: Date,
  endDatetime: Date,
  attendeeIds: number[]
): Promise<{
  id: number;
  title: string;
  start: string;
  end: string;
  attendees: number[];
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventQuery = `
      INSERT INTO events (title, start_datetime, end_datetime)
      VALUES ($1, $2, $3)
      RETURNING id, title, start_datetime AS "start", end_datetime AS "end"
    `;
    const { rows: eventResult } = await client.query(eventQuery, [
      title,
      startDatetime,
      endDatetime,
    ]);
    const event = eventResult[0];

    const attendeeQuery = `
      INSERT INTO event_attendees (event_id, user_id)
      VALUES ($1, unnest($2::int[]))
    `;
    await client.query(attendeeQuery, [event.id, attendeeIds]);

    await client.query("COMMIT");

    return { ...event, attendees: attendeeIds };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating event:", error);
    throw new Error("Failed to create event");
  } finally {
    client.release();
  }
}

export async function getAllEvents(): Promise<
  {
    id: number;
    title: string;
    start: string;
    end: string;
    attendees: string[];
  }[]
> {
  const client = await pool.connect();

  try {
    // Fetch events
    const eventsQuery = `
      SELECT 
        e.id, 
        e.title, 
        e.start_datetime AS "start", 
        e.end_datetime AS "end"
      FROM events e
    `;
    const { rows: events } = await client.query(eventsQuery);

    if (events.length === 0) {
      return [];
    }

    const attendeesQuery = `
      SELECT 
        ea.event_id, 
        u.name 
      FROM event_attendees ea
      JOIN users u ON ea.user_id = u.id
    `;
    const { rows: attendees } = await client.query(attendeesQuery);

    return events.map((event) => {
      const eventAttendees = attendees
        .filter((attendee) => attendee.event_id === event.id)
        .map((attendee) => attendee.name);

      return { ...event, attendees: eventAttendees };
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events");
  } finally {
    client.release();
  }
}
