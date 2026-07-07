"use strict";

const classRepository = require("../repositories/class.repository");
const studentRepository = require("../repositories/student.repository");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ClassService {
  async list(query, user) {
    const { page, limit, sort, ...filterParams } = query;

    const filter = { ...filterParams };
    if (filter.isArchived === undefined) filter.isArchived = false;

    if (user && user.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();

      if (
        !teacher ||
        !teacher.assignedClasses ||
        teacher.assignedClasses.length === 0
      ) {
        return {
          data: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        };
      }

      filter._id = { $in: teacher.assignedClasses };
    } else {
      if (!filter.session && !filter.all) {
        const settings = await Settings.getSettings();
        if (settings?.activeSession) {
          filter.session = settings.activeSession;
        }
      }
      delete filter.all;
    }

    const result = await classRepository.findAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: "classTeacher", select: "name employeeId email mobile" },
        { path: "assignedTeachers", select: "name employeeId" },
        { path: "session", select: "name" },
      ],
    });

    if (result.data.length > 0) {
      const Student = require("../models/Student.model");
      const classIds = result.data.map((c) => c._id);

      const counts = await Student.aggregate([
        {
          $match: {
            class: { $in: classIds },
            status: "Active",
            isActive: true,
          },
        },
        { $group: { _id: "$class", count: { $sum: 1 } } },
      ]);

      const countMap = {};
      counts.forEach((c) => {
        countMap[c._id.toString()] = c.count;
      });

      result.data = result.data.map((cls) => ({
        ...cls,
        studentCount: countMap[cls._id.toString()] || 0,
      }));
    }

    return result;
  }

  async getById(id) {
    const cls = await classRepository.findById(id, [
      { path: "classTeacher", select: "name employeeId email mobile" },
      { path: "assignedTeachers", select: "name employeeId email" },
      { path: "session", select: "name startDate endDate" },
      { path: "createdBy", select: "name" },
    ]);

    if (!cls) throwError("Class not found", 404);

    const studentCount = await studentRepository.count({
      class: cls._id,
      status: "Active",
    });

    return { ...cls, studentCount };
  }

  // ═══════════════════════════════════════════════════════════════
  //  CREATE — with bi-directional teacher sync
  // ═══════════════════════════════════════════════════════════════
  async create(data, user, req) {
    const exists = await classRepository.exists({
      name: data.name,
      section: data.section,
      session: data.session,
    });

    if (exists) {
      throwError(
        `Class "${data.name} - ${data.section}" already exists in this session`,
        409,
      );
    }

    const cls = await classRepository.create({
      ...data,
      createdBy: user._id,
    });

    const Teacher = require("../models/Teacher.model");

    // Collect ALL teacher IDs that need this class in their assignedClasses
    const teacherIdsToSync = new Set();

    if (data.classTeacher) {
      teacherIdsToSync.add(data.classTeacher.toString());
    }

    if (data.assignedTeachers?.length > 0) {
      data.assignedTeachers.forEach((id) =>
        teacherIdsToSync.add(id.toString()),
      );
    }

    // Sync: Add this class to each teacher's assignedClasses
    if (teacherIdsToSync.size > 0) {
      const teacherIds = Array.from(teacherIdsToSync);

      await Teacher.updateMany(
        { _id: { $in: teacherIds } },
        { $addToSet: { assignedClasses: cls._id } },
      );

      // Also ensure classTeacher is in assignedTeachers list on the Class
      if (
        data.classTeacher &&
        !data.assignedTeachers?.includes(data.classTeacher.toString())
      ) {
        await classRepository.updateById(cls._id, {
          $addToSet: { assignedTeachers: data.classTeacher },
        });
      }
    }

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Class",
      description: `Created class ${cls.name} - ${cls.section}`,
      resourceId: cls._id,
      resourceType: "Class",
      after: cls,
      req,
    });

    return cls;
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE — with bi-directional teacher sync
  // ═══════════════════════════════════════════════════════════════
  async update(id, data, user, req) {
    const existing = await classRepository.findById(id);
    if (!existing) throwError("Class not found", 404);

    if (
      (data.name && data.name !== existing.name) ||
      (data.section && data.section !== existing.section)
    ) {
      const dupExists = await classRepository.exists({
        name: data.name || existing.name,
        section: data.section || existing.section,
        session: existing.session,
        _id: { $ne: id },
      });
      if (dupExists)
        throwError("Another class with same name & section exists", 409);
    }

    const Teacher = require("../models/Teacher.model");

    // --- Track classTeacher changes ---
    const oldClassTeacher = existing.classTeacher
      ? existing.classTeacher.toString()
      : null;
    const newClassTeacher =
      data.classTeacher !== undefined
        ? data.classTeacher
          ? data.classTeacher.toString()
          : null
        : oldClassTeacher;

    const classTeacherChanged = oldClassTeacher !== newClassTeacher;

    // --- Track assignedTeachers changes ---
    const oldTeachers = (existing.assignedTeachers || []).map((t) =>
      t.toString(),
    );
    const newTeachers = data.assignedTeachers
      ? data.assignedTeachers.map((t) => t.toString())
      : oldTeachers;

    const addedTeachers = newTeachers.filter((t) => !oldTeachers.includes(t));
    const removedTeachers = oldTeachers.filter((t) => !newTeachers.includes(t));

    // --- Ensure classTeacher is always in assignedTeachers ---
    if (newClassTeacher && !newTeachers.includes(newClassTeacher)) {
      newTeachers.push(newClassTeacher);
      addedTeachers.push(newClassTeacher);
      data.assignedTeachers = newTeachers;
    }

    // --- Perform the update ---
    const updated = await classRepository.updateById(id, data);

    // Sync Teacher.assignedClasses for added teachers
    if (addedTeachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: addedTeachers } },
        { $addToSet: { assignedClasses: id } },
      );
    }

    // Remove class from removed teachers' assignedClasses
    if (removedTeachers.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: removedTeachers } },
        { $pull: { assignedClasses: id } },
      );
    }

    // Handle classTeacher change specifically
    if (classTeacherChanged) {
      if (oldClassTeacher && !newTeachers.includes(oldClassTeacher)) {
        await Teacher.updateOne(
          { _id: oldClassTeacher },
          { $pull: { assignedClasses: id } },
        );
      }

      if (newClassTeacher) {
        await Teacher.updateOne(
          { _id: newClassTeacher },
          { $addToSet: { assignedClasses: id } },
        );
      }
    }

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Class",
      description: `Updated class ${updated.name} - ${updated.section}`,
      resourceId: id,
      resourceType: "Class",
      before: existing,
      after: updated,
      req,
    });

    return updated;
  }

  async delete(id, user, req) {
    const cls = await classRepository.findById(id);
    if (!cls) throwError("Class not found", 404);

    const studentCount = await studentRepository.count({ class: id });
    if (studentCount > 0) {
      throwError(
        `Cannot delete class. It has ${studentCount} student(s). Archive instead.`,
        409,
      );
    }

    await classRepository.deleteById(id);

    // Clean up ALL teacher references
    const Teacher = require("../models/Teacher.model");
    await Teacher.updateMany(
      { assignedClasses: id },
      { $pull: { assignedClasses: id } },
    );

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Class",
      description: `Deleted class ${cls.name} - ${cls.section}`,
      resourceId: id,
      resourceType: "Class",
      before: cls,
      req,
    });

    return true;
  }

  async archive(id, isArchived, user, req) {
    const cls = await classRepository.findById(id);
    if (!cls) throwError("Class not found", 404);

    const updated = await classRepository.updateById(id, { isArchived });

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Class",
      description: `${isArchived ? "Archived" : "Unarchived"} class ${cls.name} - ${cls.section}`,
      resourceId: id,
      resourceType: "Class",
      req,
    });

    return updated;
  }
}

module.exports = new ClassService();
