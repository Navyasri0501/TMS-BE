const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const FIXED_SALT = process.env.SECRET_KEY; // Example salt

// Helper function to encrypt the session_id for cookie
const encryptSessionId = (sessionId) => {
  // Get the encryption key from the environment
  const secret = process.env.ENCRYPTION_KEY;

  // Ensure the key is exactly 32 bytes using SHA-256
  const hashedKey = crypto.createHash("sha256").update(secret).digest();

  // Initialize cipher with AES-256-CBC
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    hashedKey, // 32 bytes key
    Buffer.alloc(16, 0) // IV (Initialization Vector) - 16 bytes
  );

  // Encrypt the sessionId
  let encrypted = cipher.update(sessionId, "utf8", "hex");
  encrypted += cipher.final("hex"); // Finalize the encryption

  return encrypted;
};
// Helper function to decrypt the session_id from cookie
const decryptSessionId = (encryptedSessionId) => {
  const secret = process.env.ENCRYPTION_KEY; // Your 32-byte secret key

  // Ensure the key is exactly 32 bytes using SHA-256 (same as in encryption)
  const hashedKey = crypto.createHash("sha256").update(secret).digest();

  const iv = Buffer.alloc(16, 0); // IV should be the same used during encryption

  // Initialize decipher with AES-256-CBC
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    hashedKey, // 32 bytes key (same hashed key used during encryption)
    iv // IV should be the same used during encryption
  );

  let decrypted = decipher.update(encryptedSessionId, "hex", "utf8");
  decrypted += decipher.final("utf8"); // Finalize the decryption

  return decrypted;
};

const encryptPassword = async (password) => {
  try {
    // Hash the password with the fixed salt
    const encryptedPassword = await bcrypt.hash(password, FIXED_SALT);

    // Return only the first 36 characters to ensure a 36-character string.
    return encryptedPassword.substring(0, 36);
  } catch (error) {
    console.log(error);
    throw new Error("Encryption failed");
  }
};

module.exports = {
  decryptSessionId,
  encryptPassword,
  encryptSessionId,
};
