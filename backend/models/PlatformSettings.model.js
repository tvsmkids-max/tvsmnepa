"use strict";

const mongoose = require("mongoose");

// Singleton: the product's own brand (not any school's). Edited by the owner.
const platformSettingsSchema = new mongoose.Schema(
  {
    productName: { type: String, trim: true, maxlength: 80, default: "" },
    tagline: { type: String, trim: true, maxlength: 160, default: "" },
    companyName: { type: String, trim: true, maxlength: 120, default: "" },
    // Small raster image as a data URL (png/jpeg/webp), validated in the service.
    logo: { type: String, default: null },
    primaryColor: { type: String, trim: true, default: "" }, // #RRGGBB or ""
    supportEmail: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    supportPhone: { type: String, trim: true, maxlength: 40, default: "" },
    website: { type: String, trim: true, maxlength: 200, default: "" },
    poweredByText: { type: String, trim: true, maxlength: 120, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", default: null },
  },
  { timestamps: true, versionKey: false },
);

platformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
