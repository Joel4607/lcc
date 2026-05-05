import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import connectToDatabase from "../src/shared/config/db.js";
import Branch from "../src/modules/branches/branch.model.js";
import User from "../src/modules/users/user.model.js";
import { ROLES } from "../src/shared/constants/roles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../config.env") });

function getSeedValue(key, fallback) {
  return process.env[key] || fallback;
}

async function seed() {
  await connectToDatabase();

  const branchName = getSeedValue("SEED_BRANCH_NAME", "Headquarters");
  const branchCode = getSeedValue("SEED_BRANCH_CODE", "HQ").toUpperCase();
  const superAdminName = getSeedValue("SEED_SUPER_ADMIN_NAME", "System Super Admin");
  const superAdminEmail = getSeedValue("SEED_SUPER_ADMIN_EMAIL", "superadmin@lcc.local")
    .trim()
    .toLowerCase();
  const superAdminPassword = getSeedValue("SEED_SUPER_ADMIN_PASSWORD", "ChangeMe123!");

  const branch = await Branch.findOneAndUpdate(
    { code: branchCode },
    {
      $set: {
        name: branchName,
        code: branchCode,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

  if (!existingSuperAdmin) {
    await User.create({
      name: superAdminName,
      email: superAdminEmail,
      password: superAdminPassword,
      role: ROLES.SUPER_ADMIN,
      branchId: null,
      buscellId: null,
    });

    console.log("Seeded initial super admin.");
  } else {
    console.log("Super admin already exists, skipping user creation.");
  }

  console.log(`Branch ready: ${branch.name} (${branch.code})`);
  console.log(`Super admin email: ${superAdminEmail}`);
  console.log(`Super admin password: ${superAdminPassword}`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed.", error);
    process.exit(1);
  });
