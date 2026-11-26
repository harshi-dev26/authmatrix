// Public verification key for this classroom's signed access passes.
export const issuer =
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEABinEJF6wLZKqW321RHXo81BGOe5LXW5Wg6M57Kc9l3k=\n-----END PUBLIC KEY-----\n";
export default [
  {
    id: "student",
    name: "Student",
    email: "student@authmatrix.test",
    role: "student",
  },
  {
    id: "student2",
    name: "Second student",
    email: "student2@authmatrix.test",
    role: "student",
  },
  {
    id: "admin",
    name: "Admin",
    email: "admin@authmatrix.test",
    role: "admin",
  },
];
