"use strict";

const escapeRegex = require("../utils/escapeRegex");
const studentRepository = require("../repositories/student.repository");
const classRepository = require("../repositories/class.repository");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");
const { ROLES } = require("../constants/roles");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const MAX_BULK_DELETE = 100;

// Class users can only toggle between these two statuses
const CLASS_ALLOWED_STATUSES = ["Active", "Inactive"];

// Removes every record that belongs to the given students (used for hard delete only).
async function purgeStudentData(ids) {
  const Attendance = require("../models/Attendance.model");
  const ExamMarks = require("../models/exam/ExamMarks.model");
  const ExamResult = require("../models/exam/ExamResult.model");
  const ExamRollNumber = require("../models/exam/ExamRollNumber.model");
  const ExamReportCardMeta = require("../models/exam/ExamReportCardMeta.model");
  const filter = { student: { $in: ids } };
  const [att, marks, results, rolls, meta] = await Promise.all([
    Attendance.deleteMany(filter),
    ExamMarks.deleteMany(filter),
    ExamResult.deleteMany(filter),
    ExamRollNumber.deleteMany(filter),
    ExamReportCardMeta.deleteMany(filter),
  ]);
  return {
    attendance: att.deletedCount || 0,
    examRecords:
      (marks.deletedCount || 0) +
      (results.deletedCount || 0) +
      (rolls.deletedCount || 0) +
      (meta.deletedCount || 0),
  };
}

class StudentService {
  /**
   * Restrict filters for role=class to their linkedClass only
   */
  _applyClassRoleFilter(filter, user) {
    if (!user || user.role !== ROLES.CLASS) return filter;

    if (!user.linkedClass) {
      return null; // no access
    }

    const linked = user.linkedClass.toString();

    if (filter.class) {
      if (filter.class.toString() !== linked) {
        return null; // requested someone else's class
      }
    }

    filter.class = user.linkedClass;
    return filter;
  }

  async list(query, user) {
    const {
      page,
      limit,
      sort,
      search,
      section,
      gender,
      category,
      bloodGroup,
      ...filterParams
    } = query;

    let filter = { ...filterParams };

    if (!filter.session) {
      const settings = await Settings.getSettings();
      if (settings?.activeSession) {
        filter.session = settings.activeSession;
      }
    }

    // ✅ Class-login RBAC (replaces old Teacher model lookup)
    filter = this._applyClassRoleFilter(filter, user);
    if (!filter) {
      return {
        data: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      };
    }

    if (section) filter.section = section;
    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    if (search && search.trim()) {
      const trimmed = search.trim();
      filter.$or = [
        { name: new RegExp(escapeRegex(trimmed), "i") },
        { fatherName: new RegExp(escapeRegex(trimmed), "i") },
        { motherName: new RegExp(escapeRegex(trimmed), "i") },
        { scholarNumber: new RegExp(escapeRegex(trimmed), "i") },
        { mobile: new RegExp(escapeRegex(trimmed), "i") },
        { alternateMobile: new RegExp(escapeRegex(trimmed), "i") },
      ];
    }

    return studentRepository.findAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: "class", select: "name section" },
        { path: "session", select: "name" },
      ],
    });
  }

  async getSections(user) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;

    const filter = { isActive: true };
    if (sessionId) filter.session = sessionId;

    if (user && user.role === ROLES.CLASS) {
      if (!user.linkedClass) return [];
      filter.class = user.linkedClass;
    }

    const Student = require("../models/Student.model");
    const sections = await Student.distinct("section", filter);
    return sections.filter(Boolean).sort();
  }

  async getById(id) {
    const student = await studentRepository.findById(id, [
      { path: "class", select: "name section" },
      { path: "session", select: "name" },
      { path: "createdBy", select: "name" },
    ]);
    if (!student) throwError("Student not found", 404);
    return student;
  }

  async create(data, user, req) {
    const existing = await studentRepository.findByScholarNumber(
      data.scholarNumber,
      data.session,
    );
    if (existing) {
      throwError(
        `Scholar number "${data.scholarNumber}" already exists in this session`,
        409,
      );
    }

    // Class accounts can only add students to their own class.
    if (user && user.role === ROLES.CLASS) {
      if (!user.linkedClass) {
        throwError("No class is linked to this account", 403);
      }
      if (data.class && data.class.toString() !== user.linkedClass.toString()) {
        throwError("You can only add students to your own class", 403);
      }
      data.class = user.linkedClass;
    }

    const cls = await classRepository.findById(data.class);
    if (!cls) throwError("Class not found", 400);

    if (!data.section) data.section = cls.section;

    const student = await studentRepository.create({
      ...data,
      createdBy: user._id,
    });

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Student",
      description: `Added student ${student.name} (${student.scholarNumber})`,
      resourceId: student._id,
      resourceType: "Student",
      after: student,
      req,
    });

    return student;
  }

  async update(id, data, user, req) {
    const existing = await studentRepository.findById(id);
    if (!existing) throwError("Student not found", 404);

    if (
      data.scholarNumber &&
      data.scholarNumber.trim().toUpperCase() !== existing.scholarNumber
    ) {
      const formattedScholar = data.scholarNumber.trim().toUpperCase();
      const duplicate = await studentRepository.findByScholarNumber(
        formattedScholar,
        data.session || existing.session,
      );
      if (duplicate && duplicate._id.toString() !== id) {
        throwError(
          `Scholar number "${formattedScholar}" is already assigned to another student`,
          409,
        );
      }
      data.scholarNumber = formattedScholar;
    }

    // ✅ Class user can only edit students in their linked class
    if (user && user.role === ROLES.CLASS) {
      if (!user.linkedClass) {
        throwError("No class is linked to this account", 403);
      }

      const existingClassId = existing.class?.toString();
      if (existingClassId !== user.linkedClass.toString()) {
        throwError("You can only edit students in your own class", 403);
      }

      // Cannot change class/section
      if (data.class && data.class.toString() !== existingClassId) {
        throwError(
          "Class accounts cannot change a student's class. Contact admin.",
          403,
        );
      }
      delete data.class;
      delete data.section;
    }

    if (data.class && data.class.toString() !== existing.class.toString()) {
      const newClass = await classRepository.findById(data.class);
      if (!newClass) throwError("New class not found", 400);
      data.section = newClass.section;
    }

    const updated = await studentRepository.updateById(id, data);

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Student",
      description: `Updated student ${updated.name}`,
      resourceId: id,
      resourceType: "Student",
      before: existing,
      after: updated,
      req,
    });

    return updated;
  }

  async updateStatus(id, statusData, user, req) {
    const existing = await studentRepository.findById(id);
    if (!existing) throwError("Student not found", 404);

    if (user && user.role === ROLES.CLASS) {
      if (!user.linkedClass) {
        throwError("No class is linked to this account", 403);
      }

      const existingClassId = existing.class?.toString();
      if (existingClassId !== user.linkedClass.toString()) {
        throwError(
          "You can only change status of students in your own class",
          403,
        );
      }

      if (!CLASS_ALLOWED_STATUSES.includes(statusData.status)) {
        throwError(
          `Class accounts can only mark students as Active or Inactive. ` +
            `Contact admin to change status to "${statusData.status}".`,
          403,
        );
      }

      if (!CLASS_ALLOWED_STATUSES.includes(existing.status)) {
        throwError(
          `Cannot change status of ${existing.status} student. Contact admin.`,
          403,
        );
      }
    }

    const updated = await studentRepository.updateById(id, {
      status: statusData.status,
      statusRemark: statusData.statusRemark || "",
      statusDate: statusData.statusDate || new Date(),
      isActive: !STATUSES_BLOCKING_ATTENDANCE.includes(statusData.status),
    });

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Student",
      description: `Changed status of ${existing.name} to ${statusData.status}`,
      resourceId: id,
      resourceType: "Student",
      before: { status: existing.status },
      after: { status: updated.status, remark: updated.statusRemark },
      req,
    });

    return updated;
  }

  async delete(id, user, req) {
    const student = await studentRepository.findById(id);
    if (!student) throwError("Student not found", 404);

    const purged = await purgeStudentData([student._id]);
    await studentRepository.deleteById(id);

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Student",
      description: `Deleted student ${student.name} (${student.scholarNumber}). Attendance removed: ${purged.attendance}, exam records removed: ${purged.examRecords}`,
      resourceId: id,
      resourceType: "Student",
      before: student,
      req,
    });

    return true;
  }

  async search(query, sessionId) {
    if (!query || query.trim().length < 2) {
      throwError("Search query must be at least 2 characters", 400);
    }

    const filter = {};
    if (sessionId) filter.session = sessionId;

    return studentRepository.search(query.trim(), filter);
  }

  async bulkDelete(ids, mode, user, req) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throwError("No student IDs provided", 400);
    }

    if (ids.length > MAX_BULK_DELETE) {
      throwError(
        `Cannot delete more than ${MAX_BULK_DELETE} students at once`,
        400,
      );
    }

    if (!["soft", "hard"].includes(mode)) {
      throwError("Invalid mode. Must be 'soft' or 'hard'", 400);
    }

    const students = await studentRepository.findByIds(ids);
    if (students.length === 0) {
      throwError("No matching students found", 404);
    }

    const foundIds = students.map((s) => s._id.toString());
    const missingIds = ids.filter((id) => !foundIds.includes(id.toString()));

    if (missingIds.length > 0) {
      throwError(
        `${missingIds.length} student(s) not found. Operation cancelled.`,
        400,
      );
    }

    let attendanceDeleted = 0;

    if (mode === "hard") {
      const purged = await purgeStudentData(foundIds);
      attendanceDeleted = purged.attendance;

      await studentRepository.bulkHardDelete(foundIds);
    } else {
      await studentRepository.bulkSoftDelete(
        foundIds,
        `Bulk soft-deleted by ${user.name || user._id}`,
      );
    }

    const studentNames = students
      .slice(0, 5)
      .map((s) => `${s.name} (${s.scholarNumber})`)
      .join(", ");
    const moreText =
      students.length > 5 ? ` and ${students.length - 5} more` : "";

    await createAuditLog({
      user,
      action: mode === "hard" ? "DELETE" : "UPDATE",
      module: "Student",
      description:
        mode === "hard"
          ? `Bulk HARD DELETED ${students.length} students: ${studentNames}${moreText}. Attendance records removed: ${attendanceDeleted}`
          : `Bulk SOFT DELETED ${students.length} students: ${studentNames}${moreText}`,
      resourceType: "Student",
      before: { count: students.length, mode },
      after: { deleted: students.length, attendanceDeleted },
      req,
    });

    return {
      mode,
      requested: ids.length,
      deleted: students.length,
      attendanceDeleted,
    };
  }
}

module.exports = new StudentService();
