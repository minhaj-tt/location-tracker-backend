import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/sequelize";
import User from "./users";

interface EventAttributes {
  id: number;
  title: string;
  start_datetime: Date;
  end_datetime: Date;
  users?: User[];
}

interface EventCreationAttributes extends Optional<EventAttributes, "id"> {}

class Event
  extends Model<EventAttributes, EventCreationAttributes>
  implements EventAttributes
{
  public id!: number;
  public title!: string;
  public start_datetime!: Date;
  public end_datetime!: Date;

  public users?: User[];

  public addUsers!: (users: User[]) => Promise<void>;
  public setUsers!: (users: User[]) => Promise<void>;
  public removeUsers!: (users: User[]) => Promise<void>;
}

Event.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "events",
    modelName: "Event",
  }
);

export default Event;
