/** All user-facing text lives here so it can be translated later. */
export const es = {
  appName: "Disco",
  login: {
    title: "Entrar",
    intro: "Escribe tu correo y te enviamos un enlace para entrar. No necesitas contraseña.",
    emailLabel: "Tu correo",
    emailPlaceholder: "nombre@correo.com",
    submit: "Enviarme el enlace",
    sent: "Listo. Revisa tu correo y toca el enlace para entrar. Si no lo ves, mira en spam.",
    invalidEmail: "Escribe un correo válido.",
    tryLater: "No pudimos enviar el enlace ahora. Intenta de nuevo en unos minutos.",
    invalidLink: "Ese enlace no sirve. Pide uno nuevo.",
    expiredLink: "El enlace venció o ya se usó. Pide uno nuevo.",
  },
  admin: {
    title: "Tus discos",
    signedInAs: "Entraste como",
    signOut: "Salir",
  },
} as const;
