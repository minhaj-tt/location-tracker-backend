import Event from "../models/event";
import User from "../models/users";

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
  try {
    const event = await Event.create({
      title,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    });

    const attendees = await User.findAll({
      where: {
        id: attendeeIds,
      },
    });

    await event.addUsers(attendees);

    return {
      id: event.id,
      title: event.title,
      start: event.start_datetime.toISOString(),
      end: event.end_datetime.toISOString(),
      attendees: attendeeIds,
    };
  } catch (error) {
    console.error("Error creating event:", error);
    throw new Error("Failed to create event");
  }
}

export async function getAllEvents(): Promise<
  {
    id: number;
    title: string;
    start: string;
    end: string;
    attendees: { id: number; name: string | null }[];
  }[]
> {
  try {
    const events = await Event.findAll({
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id", "username"],
          through: { attributes: [] },
        },
      ],
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_datetime.toISOString(),
      end: event.end_datetime.toISOString(),
      attendees: event.users
        ? event.users.map((user: any) => ({
            id: user.id,
            name: user.username,
          }))
        : [],
    }));
  } catch (error) {
    console.error("Error fetching events:", error);
    throw new Error("Failed to fetch events");
  }
}

export async function editEvent(
  eventId: number,
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
  try {
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error("Event not found");

    event.title = title;
    event.start_datetime = startDatetime;
    event.end_datetime = endDatetime;
    await event.save();

    await event.setUsers([]);

    const attendees = await User.findAll({
      where: {
        id: attendeeIds,
      },
    });
    await event.addUsers(attendees);

    return {
      id: event.id,
      title: event.title,
      start: event.start_datetime.toISOString(),
      end: event.end_datetime.toISOString(),
      attendees: attendeeIds,
    };
  } catch (error) {
    console.error("Error editing event:", error);
    throw new Error("Failed to edit event");
  }
}
