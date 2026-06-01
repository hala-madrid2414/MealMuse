export type Id = string

export const APP_NAME = "MealMuse"

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}
