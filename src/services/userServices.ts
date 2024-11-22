import pool from "../db";
import { User } from "../models/users";
import moment from "moment";

export async function registerUser(user: User): Promise<User | null> {
  const trialEndDate = moment().add(7, "days").toDate();
  const query = `
    INSERT INTO users (username, email, password, image, subscription, trial_end_date)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, image, subscription, trial_end_date
  `;
  const values = [
    user.username,
    user.email,
    user.password,
    user.image,
    "free_trial",
    trialEndDate,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const query = `SELECT * FROM users WHERE email = $1`;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const query = `SELECT id, username, email, image, subscription, trial_end_date FROM users WHERE id = $1`;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

export async function upgradeSubscription(
  userId: number,
  newSubscription: "standard" | "premium"
): Promise<User | null> {
  const newEndDate =
    newSubscription === "standard"
      ? moment().add(1, "month").toDate()
      : moment().add(1, "year").toDate();

  const query = `
    UPDATE users 
    SET subscription = $1, trial_end_date = $2 
    WHERE id = $3 
    RETURNING id, username, email, image, subscription, trial_end_date
  `;
  const { rows } = await pool.query(query, [
    newSubscription,
    newEndDate,
    userId,
  ]);

  return rows[0] || null;
}

export async function hasTrialEnded(userId: number): Promise<boolean> {
  const query = `SELECT trial_end_date FROM users WHERE id = $1`;
  const { rows } = await pool.query(query, [userId]);
  const trialEndDate = rows[0]?.trial_end_date;
  if (trialEndDate) {
    return moment().isAfter(moment(trialEndDate));
  }
  return false;
}

export async function downgradeSubscription(
  userId: number
): Promise<User | null> {
  try {
    const query = `
      UPDATE users 
      SET subscription = 'free', trial_end_date = NULL 
      WHERE id = $1 
      RETURNING id, username, email, image, subscription, trial_end_date
    `;
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      console.error(`User with id ${userId} not found or update failed.`);
      return null;
    }

    console.log("Subscription downgrade successful:", rows[0]);

    return rows[0];
  } catch (error) {
    console.error("Error downgrading subscription:", error);
    throw new Error("Database error during subscription downgrade");
  }
}

export async function updateUser(
  userId: number | undefined,
  updates: Partial<User>
): Promise<User | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No fields provided for update");
    }

    // Add the userId as the last value
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING id, username, email, image, subscription, trial_end_date
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      console.error(`User with id ${userId} not found or update failed.`);
      return null;
    }

    console.log("User update successful:", rows[0]);

    return rows[0];
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Database error during user update");
  }
}