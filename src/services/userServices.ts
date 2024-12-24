import User from "../models/users"; 
import moment from "moment";

export async function registerUser(user: {
  username: string;
  email: string;
  password: string;
  phone_number: string;
  address: string;
  dob: Date;
  image: string | null;
  subscription: "free_trial" | "standard" | "premium";
  trialEndDate: Date;
}): Promise<User | null> {
  try {
    const newUser = await User.create({
      username: user.username,
      email: user.email,
      password: user.password,
      phone_number: user.phone_number,
      address: user.address,
      dob: user.dob,
      image: user.image,
      subscription: user.subscription,
      trial_end_date: user.trialEndDate,
    });
    return newUser;
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user in the database");
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    return await User.findOne({ where: { email } });
  } catch (error) {
    console.error(`Error fetching user by email (${email}):`, error);
    throw new Error("Failed to fetch user by email");
  }
}

export async function getUserById(id: number): Promise<User | null> {
  if (!id || isNaN(id)) {
    throw new Error("Invalid user ID provided");
  }

  try {
    const user = await User.findOne({
      where: { id },
      attributes: [
        "id",
        "username",
        "email",
        "phone_number",
        "address",
        "dob",
        "image",
        "subscription",
        "trial_end_date",
      ],
    });
    return user;
  } catch (error) {
    console.error(`Error fetching user by ID (${id}):`, error);
    throw new Error("Failed to fetch user by ID");
  }
}

export async function upgradeSubscription(
  userId: number,
  newSubscription: "standard" | "premium"
): Promise<User | null> {
  const newEndDate =
    newSubscription === "standard"
      ? moment().add(1, "month").toDate()
      : moment().add(1, "year").toDate();

  try {
    const [updatedCount, updatedUsers] = await User.update(
      {
        subscription: newSubscription,
        trial_end_date: newEndDate,
      },
      {
        where: { id: userId },
        returning: true,
      }
    );

    return updatedCount > 0 ? updatedUsers[0] : null;
  } catch (error) {
    console.error(`Error upgrading subscription for user ID ${userId}:`, error);
    throw new Error("Failed to upgrade subscription");
  }
}

export async function hasTrialEnded(userId: number): Promise<boolean> {
  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["trial_end_date"],
    });
    return user && user.trial_end_date
      ? moment().isAfter(user.trial_end_date)
      : false;
  } catch (error) {
    console.error(`Error checking trial status for user ID ${userId}:`, error);
    throw new Error("Failed to check trial end status");
  }
}

export async function downgradeSubscription(
  userId: number
): Promise<User | null> {
  try {
    const [updatedCount, updatedUsers] = await User.update(
      { subscription: "free_trial", trial_end_date: undefined },
      {
        where: { id: userId },
        returning: true,
      }
    );

    return updatedCount > 0 ? updatedUsers[0] : null;
  } catch (error) {
    console.error(
      `Error downgrading subscription for user ID ${userId}:`,
      error
    );
    throw new Error("Failed to downgrade subscription");
  }
}

export async function updateUser(
  userId: number | undefined,
  updates: Partial<User>
): Promise<User | null> {
  if (!userId) {
    throw new Error("User ID is required for update");
  }

  try {
    const [updatedCount, updatedUsers] = await User.update(updates, {
      where: { id: userId },
      returning: true,
    });

    return updatedCount > 0 ? updatedUsers[0] : null;
  } catch (error) {
    console.error(`Error updating user ID ${userId}:`, error);
    throw new Error("Failed to update user information");
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    return await User.findAll({
      attributes: [
        "id",
        "username",
        "email",
        "phone_number",
        "address",
        "dob",
        "image",
        "subscription",
        "trial_end_date",
      ],
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    throw new Error("Failed to fetch users");
  }
}
