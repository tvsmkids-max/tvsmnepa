"use strict";

const studentRepository = require("../repositories/student.repository");
const classRepository = require("../repositories/class.repository");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class StudentService {
  async list(query, user) {
    const { page, limit, sort, search, ...filterParams } = query;
    const filter = { ...filterParams };

    // Default to active session
    if (!filter.session) {
      const settings = await Settings.getSettings();
      if (settings?.activeSession) {
        filter.session = settings.activeSession;
      }
    }

    // ─── KEY FIX: Teachers see ONLY students in their assigned classes ───
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

      // Restrict to teacher's assigned classes only
      if (filter.class) {
        // If specific class requested, check it's in assigned list
        const requestedClass = filter.class.toString();
        const isAssigned = teacher.assignedClasses.some(
          (c) => c.toString() === requestedClass,
        );
        if (!isAssigned) {
          return {
            data: [],
            pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
          };
        }
      } else {
        // No specific class → show all from teacher's assigned classes
        filter.class = { $in: teacher.assignedClasses };
      }
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { fatherName: new RegExp(search, "i") },
        { scholarNumber: new RegExp(search, "i") },
        { rollNumber: new RegExp(search, "i") },
        { mobile: new RegExp(search, "i") },
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

  async getById(id) {
    const student = await studentRepository.findById(id, [
      { path: "class", select: "name section" },
      { path: "session", select: "name startDate endDate" },
      { path: "createdBy", select: "name" },
    ]);
    if (!student) throwError("Student not found", 404);
    return student;
  }

  async create(data, user, req) {
    // Check duplicate scholar number
    const existing = await studentRepository.findByScholarNumber(
      data.scholarNumber,
    );
    if (existing) {
      throwError(`Scholar number "${data.scholarNumber}" already exists`, 409);
    }

    // Verify class exists
    const cls = await classRepository.findById(data.class);
    if (!cls) throwError("Class not found", 400);

    // Set section from class if missing
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

    // If class changing, update section
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

    await studentRepository.deleteById(id);

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Student",
      description: `Deleted student ${student.name} (${student.scholarNumber})`,
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
}

module.exports = new StudentService();
