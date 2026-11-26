export function accessReason(route, user) {
  if (["home", "admin"].includes(route) && !user)
    return "Your session has ended or you have not signed in.";
  if (route === "admin" && user.role !== "admin")
    return "This role does not have permission to open the admin dashboard.";
  return "";
}
