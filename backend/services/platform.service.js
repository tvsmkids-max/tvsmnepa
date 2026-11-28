"use strict";

const PlatformSettings = require("../models/PlatformSettings.model");
const { checkImageDataUrl } = require("../utils/imageData");

const fail = (message) => Object.assign(new Error(message), { statusCode: 400 });
const FIELDS = ["productName", "tagline", "companyName", "primaryColor", "supportEmail", "supportPhone", "website", "poweredByText"];

// Only what the login page / app header / install name need. No ids, no audit data.
const toPublic = (d) => ({
  productName: d.productName || "",
  tagline: d.tagline || "",
  companyName: d.companyName || "",
  logo: d.logo || null,
  primaryColor: d.primaryColor || "",
  supportEmail: d.supportEmail || "",
  supportPhone: d.supportPhone || "",
  website: d.website || "",
  poweredByText: d.poweredByText || "",
});

class PlatformService {
  async getPublic() {
    const doc = await PlatformSettings.findOne().lean();
    return toPublic(doc || {});
  }

  async update(ownerId, body) {
    const doc = await PlatformSettings.getSingleton();
    for (const f of FIELDS) if (body[f] !== undefined) doc[f] = String(body[f]);
    if (doc.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(doc.primaryColor)) throw fail("Colour must look like #1A2B3C");
    if (doc.website && !/^https?:\/\//i.test(doc.website)) throw fail("Website must start with http:// or https://");
    if (body.logo !== undefined) doc.logo = checkImageDataUrl(body.logo, "Logo");
    doc.updatedBy = ownerId;
    await doc.save();
    return toPublic(doc.toObject());
  }
}

module.exports = new PlatformService();
