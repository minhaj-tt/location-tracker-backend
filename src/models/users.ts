import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/sequelize";
import Event from "./event";
import EventAttendees from "./eventAttendees"; 

export interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  dob: Date;
  address: string;
  phone_number: string;
  image?: string | null;
  isVerified?: boolean;
  subscription?: "free_trial" | "standard" | "premium";
  trial_end_date?: Date;
  verificationToken?: string | null;
  events?: Event[];
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, "id"> {}

class User extends Model<UserAttributes, UserCreationAttributes> {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public dob!: Date;
  public address!: string;
  public phone_number!: string;
  public image?: string | null;
  public isVerified?: boolean;
  public subscription?: "free_trial" | "standard" | "premium";
  public trial_end_date?: Date;
  public verificationToken?: string | null;
  public events?: Event[];
  public addEvents!: (events: Event[]) => Promise<void>;
  public setEvents!: (events: Event[]) => Promise<void>;
  public removeEvents!: (events: Event[]) => Promise<void>;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    subscription: {
      type: DataTypes.ENUM("free_trial", "standard", "premium"),
      allowNull: true,
    },
    trial_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: "users",
    modelName: "User",
  }
);

// User.belongsToMany(Event, {
//   through: "EventAttendees", // Ensure the join table exists
//   foreignKey: "user_id",
//   otherKey: "event_id",
// });

// User.hasMany(Event, { foreignKey: "userId" });

// User.belongsToMany(Event, {
//   through: EventAttendees,
//   foreignKey: "user_id",
//   otherKey: "event_id",
// });

export default User;
