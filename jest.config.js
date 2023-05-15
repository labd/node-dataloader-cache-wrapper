module.exports = {
  // coverageReporters: ['text', 'cobertura', 'lcov'],
  moduleDirectories: ['./node_modules', __dirname],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    "^.+\\.tsx?$": "esbuild-jest"
  },
  testMatch: ['<rootDir>/**/*.test.{ts,tsx,js}'],
  testEnvironment: "node",
  modulePathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
}
