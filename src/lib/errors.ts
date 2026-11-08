// Turn database errors into plain-English messages. Unknown errors are logged on the
// server (never silenced) and a generic message is shown to the user.

type DbError = { code?: string; message: string; details?: string | null; hint?: string | null };

const UNIQUE_MESSAGES: Record<string, string> = {
  profiles_employee_code_unique: "This employee ID is already in use.",
  profiles_work_email_unique: "This work email is already in use.",
  departments_name_unique: "A department with this name already exists.",
};

export const GENERIC_ERROR = "Something went wrong. Please try again, or contact your admin if it keeps happening.";

export function friendlyDbError(error: DbError, context: string): string {
  // Our database functions raise user-facing messages with these codes.
  if (error.code === "P0001" || error.code === "42501") {
    if (error.message.startsWith("new row violates row-level security")) {
      return "You are not allowed to do this.";
    }
    if (error.message.startsWith("permission denied")) {
      return "You are not allowed to do this.";
    }
    return error.message;
  }
  if (error.code === "23505") {
    for (const [constraint, message] of Object.entries(UNIQUE_MESSAGES)) {
      if (error.message.includes(constraint) || error.details?.includes(constraint)) return message;
    }
    return "This value is already in use.";
  }
  if (error.code === "23514") {
    return "Some of the values entered are not valid. Please check the form.";
  }
  console.error(`[db-error] ${context}`, { code: error.code, message: error.message, details: error.details });
  return GENERIC_ERROR;
}
