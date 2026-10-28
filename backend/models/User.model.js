"use strict";

const mongoose = require("mongoose");
const { ROLES, ROLE_LIST } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ROLE_LIST,
        message: `Role must be one of: ${ROLE_LIST.join(", ")}`,
      },
      required: true,
    },

    // Links to a Class document (only for role="class")
    linkedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },

    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ linkedClass: 1 });

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = async function () {
  const now = Date.now();

  return this.constructor.updateOne(
    {
      _id: this._id,
      $or: [{ lockUntil: null }, { lockUntil: { $lte: new Date(now) } }],
    },
    [
      {
        $set: {
          loginAttempts: { $add: [{ $ifNull: ['$loginAttempts', 0] }, 1] },
        },
      },
      {
        $set: {
          lockUntil: {
            $cond: [
              {
                $and: [
                  { $gte: ['$loginAttempts', 5] },
                  { $eq: [{ $mod: ['$loginAttempts', 5] }, 0] },
                ],
              },
              {
                $add: [
                  now,
                  {
                    $multiply: [
                      {
                        $min: [
                          { $multiply: [{ $floor: { $divide: ['$loginAttempts', 5] } }, 5] },
                          15,
                        ],
                      },
                      60 * 1000,
                    ],
                  },
                ],
              },
              '$$REMOVE',
            ],
          },
        },
      },
    ],
    { timestamps: false },
  );
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
