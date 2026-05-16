const mongoose = require("mongoose");
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;

function encrypt(text) {
  if (!text) return null;
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    picture: {
      type: String,
    },
    gmail: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiryDate: { type: Number },
      scope: { type: String },
      connectedAt: { type: Date },
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt tokens before saving
userSchema.pre("save", function (next) {
  if (this.isModified("gmail.accessToken") && this.gmail.accessToken) {
    this.gmail.accessToken = encrypt(this.gmail.accessToken);
  }
  if (this.isModified("gmail.refreshToken") && this.gmail.refreshToken) {
    this.gmail.refreshToken = encrypt(this.gmail.refreshToken);
  }
  next();
});

// Instance method to get decrypted tokens
userSchema.methods.getDecryptedTokens = function () {
  return {
    access_token: decrypt(this.gmail.accessToken),
    refresh_token: decrypt(this.gmail.refreshToken),
    expiry_date: this.gmail.expiryDate,
    scope: this.gmail.scope,
  };
};

// Static method to find or create user from Google OAuth
userSchema.statics.findOrCreateFromGoogle = async function (profile, tokens) {
  let user = await this.findOne({ email: profile.emailAddress });

  const updateData = {
    email: profile.emailAddress,
    lastLogin: new Date(),
    gmail: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      connectedAt: new Date(),
    },
  };

  if (profile.name) updateData.name = profile.name;
  if (profile.picture) updateData.picture = profile.picture;

  if (user) {
    // Update existing user - set fields directly to trigger pre-save encryption
    user.gmail.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.gmail.refreshToken = tokens.refresh_token;
    }
    user.gmail.expiryDate = tokens.expiry_date;
    user.gmail.scope = tokens.scope;
    user.gmail.connectedAt = new Date();
    user.lastLogin = new Date();
    if (profile.name) user.name = profile.name;
    if (profile.picture) user.picture = profile.picture;
    await user.save();
  } else {
    user = await this.create(updateData);
  }

  return user;
};

module.exports = mongoose.model("User", userSchema);
