export function isValidUrl(url: string): boolean {
  if (!url) return true // URL vacía es válida
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateBio(bio: string): {valid: boolean; error?: string} {
  if (bio.length > 500) {
    return {valid: false, error: "La biografía no puede exceder 500 caracteres"}
  }
  return {valid: true}
}

export function validateAvatarUrl(url: string): {
  valid: boolean
  error?: string
} {
  if (!url.trim()) return {valid: true}

  if (!isValidUrl(url)) {
    return {valid: false, error: "URL inválida"}
  }

  const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
  const hasValidExtension = validExtensions.some((ext) =>
    url.toLowerCase().includes(ext)
  )

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "La URL debe ser una imagen (.jpg, .png, .gif, .webp)"
    }
  }

  return {valid: true}
}
