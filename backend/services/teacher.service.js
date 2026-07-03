"use strict";

const teacherRepository = require("../repositories/teacher.repository");
const userRepository = require("../repositories/user.repository");
const { hashPassword } = require("../utils/passwordHelper");
const { createAuditLog } = require("../middlewares/audit.middleware");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class TeacherService {
  async list(query) {
    const { page, limit, sort, search, ...filterParams } = query;
    const filter = { ...filterParams };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { employeeId: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { mobile: new RegExp(search, "i") },
      ];
    }

    return teacherRepository.findAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: "user", select: "email isActive lastLogin" },
        { path: "assignedClasses", select: "name section" },
        { path: "session", select: "name" },
      ],
    });
  }

  async getById(id) {
    const teacher = await teacherRepository.findById(id, [
      { path: "user", select: "email isActive lastLogin" },
      { path: "assignedClasses", select: "name section" },
      { path: "session", select: "name" },
    ]);
    if (!teacher) throwError("Teacher not found", 404);
    return teacher;
  }

  async create(data, user, req) {
    const User = require("../models/User.model");

    // ─── STEP 1: Check duplicates BEFORE creating anything ────
    const emailExists = await userRepository.findByEmail(data.email);
    if (emailExists) {
      throwError(
        `Email "${data.email}" is already registered. Use a different email.`,
        409,
      );
    }

    const empExists = await teacherRepository.findByEmployeeId(data.employeeId);
    if (empExists) {
      throwError(
        `Employee ID "${data.employeeId}" already exists. Use a different ID.`,
        409,
      );
    }

    // ─── STEP 2: Create user first ───────────────────────────
    let userDoc = null;
    try {
      const hashedPassword = await hashPassword(data.password);

      userDoc = await userRepository.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: "teacher",
        isActive: true,
      });
    } catch (err) {
      if (err.code === 11000) {
        throwError(`Email "${data.email}" is already registered.`, 409);
      }
      throw err;
    }

    // ─── STEP 3: Create teacher profile (with rollback) ──────
    let teacher = null;
    try {
      teacher = await teacherRepository.create({
        user: userDoc._id,
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        alternateMobile: data.alternateMobile || "",
        gender: data.gender,
        dob: data.dob,
        qualification: data.qualification || "",
        designation: data.designation || "Teacher",
        joinDate: data.joinDate,
        address: data.address || "",
        assignedClasses: data.assignedClasses || [],
        session: data.session,
        isActive: true,
        createdBy: user._id,
      });
    } catch (err) {
      // ROLLBACK: Delete user if teacher creation failed
      try {
        await User.findByIdAndDelete(userDoc._id);
      } catch (rollbackErr) {
        // Silent rollback fail
      }

      if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        throwError(
          `Duplicate ${field}: "${err.keyValue[field]}" already exists.`,
          409,
        );
      }
      throw err;
    }

    // ─── STEP 4: Add teacher to assigned classes ─────────────
    if (data.assignedClasses?.length > 0) {
      const Class = require("../models/Class.model");
      try {
        await Class.updateMany(
          { _id: { $in: data.assignedClasses } },
          { $addToSet: { assignedTeachers: teacher._id } },
        );
      } catch {
        // Non-critical, log only
      }
    }

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Teacher",
      description: `Created teacher ${teacher.name} (${teacher.employeeId})`,
      resourceId: teacher._id,
      resourceType: "Teacher",
      after: { ...teacher, password: "***" },
      req,
    });

    return teacher;
  }

  async update(id, data, user, req) {
    const existing = await teacherRepository.findById(id);
    if (!existing) throwError("Teacher not found", 404);

    if (data.email && data.email !== existing.email) {
      const dup = await userRepository.findByEmail(data.email);
      if (dup && dup._id.toString() !== existing.user.toString()) {
        throwError("Email already in use", 409);
      }
      const User = require("../models/User.model");
      await User.findByIdAndUpdate(existing.user, {
        $set: { email: data.email, name: data.name || existing.name },
      });
    }

    if (data.name && data.name !== existing.name) {
      const User = require("../models/User.model");
      await User.findByIdAndUpdate(existing.user, {
        $set: { name: data.name },
      });
    }

    const updated = await teacherRepository.updateById(id, data);

    if (data.isActive !== undefined) {
      const User = require("../models/User.model");
      await User.findByIdAndUpdate(existing.user, {
        $set: { isActive: data.isActive },
      });
    }

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Teacher",
      description: `Updated teacher ${updated.name}`,
      resourceId: id,
      resourceType: "Teacher",
      before: existing,
      after: updated,
      req,
    });

    return updated;
  }

  async delete(id, user, req) {
    const teacher = await teacherRepository.findById(id);
    if (!teacher) throwError("Teacher not found", 404);

    const Class = require("../models/Class.model");
    await Class.updateMany(
      { $or: [{ classTeacher: id }, { assignedTeachers: id }] },
      {
        $unset: { classTeacher: "" },
        $pull: { assignedTeachers: id },
      },
    );

    const User = require("../models/User.model");
    await User.findByIdAndDelete(teacher.user);

    await teacherRepository.deleteById(id);

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Teacher",
      description: `Deleted teacher ${teacher.name} (${teacher.employeeId})`,
      resourceId: id,
      resourceType: "Teacher",
      before: teacher,
      req,
    });

    return true;
  }

  async assignClasses(id, classIds, user, req) {
    const teacher = await teacherRepository.findById(id);
    if (!teacher) throwError("Teacher not found", 404);

    const updated = await teacherRepository.assignClasses(id, classIds);

    const Class = require("../models/Class.model");
    await Class.updateMany(
      { assignedTeachers: id },
      { $pull: { assignedTeachers: id } },
    );
    await Class.updateMany(
      { _id: { $in: classIds } },
      { $addToSet: { assignedTeachers: id } },
    );

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Teacher",
      description: `Assigned ${classIds.length} class(es) to ${teacher.name}`,
      resourceId: id,
      resourceType: "Teacher",
      req,
    });

    return updated;
  }

  /**
   * Admin resets a teacher's password
   */
  async resetPassword(teacherId, newPassword, adminUser, req) {
    const teacher = await teacherRepository.findById(teacherId);
    if (!teacher) throwError("Teacher not found", 404);

    if (!newPassword || newPassword.length < 8) {
      throwError("Password must be at least 8 characters", 400);
    }

    const { hashPassword } = require("../utils/passwordHelper");
    const hashed = await hashPassword(newPassword);

    const User = require("../models/User.model");
    await User.findByIdAndUpdate(teacher.user, {
      $set: {
        password: hashed,
        passwordChangedAt: new Date(),
        refreshTokens: [],
      },
    });

    await createAuditLog({
      user: adminUser,
      action: "UPDATE",
      module: "Teacher",
      description: `Admin reset password for teacher ${teacher.name} (${teacher.employeeId})`,
      resourceId: teacherId,
      resourceType: "Teacher",
      req,
    });

    return { success: true, message: "Password reset successfully" };
  }

  /**
   * Get teacher profile for currently logged-in teacher user
   */
  async getMyProfile(userId) {
    const teacher = await teacherRepository.findByUserId(userId);

    if (!teacher) {
      throwError("Teacher profile not found", 404);
    }

    // Populate the data
    const Teacher = require("../models/Teacher.model");
    const populated = await Teacher.findById(teacher._id)
      .populate("user", "email isActive lastLogin")
      .populate("assignedClasses", "name section")
      .populate("session", "name")
      .lean();

    return populated;
  }
}

module.exports = new TeacherService();
