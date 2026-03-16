export const APP_ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE];
