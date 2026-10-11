// Google accounts allowed into the admin panel.
// Keep this in sync with isAdmin() in firestore.rules, which is what actually enforces it.
export const ADMIN_EMAILS = ["bhoomiarun5@gmail.com", "anirudhsandilya363@gmail.com"];

export const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
