export const minimumPasswordLength = 12
export const maximumPasswordLength = 128

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
