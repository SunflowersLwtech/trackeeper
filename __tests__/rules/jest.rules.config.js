/** Jest config for Firestore security rules tests (runs under Node, not jest-expo). */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          target: "es2020",
          esModuleInterop: true,
          moduleResolution: "node",
          strict: true,
        },
      },
    ],
  },
  // Rules tests talk to the emulator and can be slow
  testTimeout: 30000,
};
