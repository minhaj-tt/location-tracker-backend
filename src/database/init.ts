import sequelize from "../config/sequelize"; 
import User from "../models/users"; 
import Event from "../models/event"; 

const init = async () => {
  try {
    await sequelize.sync({ force: false }); 
    console.log("Database synced successfully.");
  } catch (error) {
    console.error("Error syncing database:", error);
  }
};

init(); 

export default sequelize; 
