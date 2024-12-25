import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class EventAttendees extends Model {
  public user_id!: number;
  public event_id!: number;
}

EventAttendees.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "events",
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "event_attendees",
    modelName: "EventAttendees",
  }
);

export default EventAttendees;
