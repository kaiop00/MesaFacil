import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

/**
 * Updates user data in Firestore
 * @param {string} uid - User ID
 * @param {Object} userData - User data to update
 * @param {string} [userData.name] - User's name
 * @param {Object} [userData.role] - User's permissions/role
 * @param {string} [userData.status] - User's status
 * @returns {Promise<void>}
 */
async function updateUserInFirestore(uid, { name, role, status }) {
  const userRef = doc(db, "users", uid);
  const updateData = {};

  // Only include fields that are provided
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (status !== undefined) updateData.status = status;

  // Add updatedAt timestamp
  updateData.updatedAt = new Date().toISOString();

  await updateDoc(userRef, updateData);
}

export default updateUserInFirestore;
