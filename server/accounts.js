// Public verification key for this classroom's signed access passes.
export const issuer =
  "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEABinEJF6wLZKqW321RHXo81BGOe5LXW5Wg6M57Kc9l3k=\n-----END PUBLIC KEY-----\n";
export default [
  {
    id: "student",
    name: "Student",
    email: "student@authmatrix.test",
    role: "student",
    passwordHash: "acd5fd17367f1ac613394e5819b31be8779311e47b91fe53f03a1f1cb09f5c59",
  },
  {
    id: "student2",
    name: "Second student",
    email: "student2@authmatrix.test",
    role: "student",
    passwordHash: "acd5fd17367f1ac613394e5819b31be8779311e47b91fe53f03a1f1cb09f5c59",
  },
  {
    id: "admin",
    name: "Admin",
    email: "admin@authmatrix.test",
    role: "admin",
    passwordHash: "70d5f9c82b80e08c811fde4921eebc5d6e98fb0a0fb8873f3d1cda7dd17bd38a",
  },
];
