import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../modules/user/user.model.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return;
    }

    const jsonPath = path.resolve(__dirname, '../../../embellish_erp.users.json');
    if (fs.existsSync(jsonPath)) {
      const rawData = fs.readFileSync(jsonPath, 'utf-8');
      const usersData = JSON.parse(rawData);
      
      const docsToInsert = usersData.map(u => {
        const doc = { ...u };
        if (doc._id && doc._id.$oid) {
          doc._id = doc._id.$oid;
        }
        delete doc.createdAt;
        delete doc.updatedAt;
        delete doc.lastLoginAt;
        return doc;
      });

      await User.collection.insertMany(docsToInsert);
      logger.info(`Seeded ${docsToInsert.length} demo users into database.`);
    }
  } catch (error) {
    logger.warn(`Failed to seed users: ${error.message}`);
  }
};

export default seedUsers;
