import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { BranchModel } from "../src/models/branch.js";
import { DepartmentModel } from "../src/models/department.js";
import { TeamModel } from "../src/models/team.js";
import { UserModel } from "../src/models/user.js";
import { TaskModel } from "../src/models/task.js";
import { todayUTC } from "../src/lib/dates.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  await Promise.all([
    BranchModel.deleteMany({}),
    DepartmentModel.deleteMany({}),
    TeamModel.deleteMany({}),
    UserModel.deleteMany({}),
    TaskModel.deleteMany({}),
  ]);

  const branch = await BranchModel.create({ code: "ny", name: "New York" });
  const dept = await DepartmentModel.create({
    code: "eng",
    name: "Engineering",
    branchId: branch._id,
  });
  const team = await TeamModel.create({
    code: "alpha",
    name: "Alpha",
    branchId: branch._id,
    departmentId: dept._id,
  });

  const admin = await UserModel.create({
    email: "admin@example.com",
    passwordHash: await bcrypt.hash("password", 10),
    role: "admin",
    branchId: branch._id,
    departmentId: dept._id,
    teamId: team._id,
  });

  const teamLead = await UserModel.create({
    email: "lead@example.com",
    passwordHash: await bcrypt.hash("password", 10),
    role: "teamLead",
    branchId: branch._id,
    departmentId: dept._id,
    teamId: team._id,
  });

  await UserModel.create({
    email: "user@example.com",
    passwordHash: await bcrypt.hash("password", 10),
    role: "user",
    branchId: branch._id,
    departmentId: dept._id,
    teamId: team._id,
    teamLeadId: teamLead._id,
  });

  const forDate = new Date(todayUTC());
  await TaskModel.create({
    userId: admin._id,
    forDate,
    description: "seed task",
    createdBy: admin._id,
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
