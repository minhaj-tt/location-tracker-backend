import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequelize";

class EventAttendees extends Model {
  public user_id!: number;
  public event_id!: number;
}

EventAttendees.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
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
    modelName: "EventAttendees",
    tableName: "event_attendees",
  }
);

export default EventAttendees;
