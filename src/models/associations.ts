import User from "./users";
import Event from "./event";
import EventAttendees from "./eventAttendees";

export const associateModels = () => {
  User.belongsToMany(Event, {
    through: EventAttendees,
    foreignKey: "user_id",
    as: "events",
  });

  Event.belongsToMany(User, {
    through: EventAttendees,
    foreignKey: "event_id",
    as: "users",
  });
};
