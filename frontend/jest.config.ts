import type { Config } from 'jest'
import nextJest from 'next/jest'
 
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coveragePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/src/app/layout.tsx",
    "<rootDir>/src/app/page.tsx",
    "<rootDir>/src/config/env.ts",
    "<rootDir>/src/lib/constants/index.ts",
    "tooltip\\.tsx$",
    "loading\\.tsx$",
    "page\\.tsx$",
    "card\\.tsx$",
    "skeleton\\.tsx$",
    "DataTable\\.tsx$",
    "Button2\\.tsx$",
    "TypeSelector\\.tsx$",
    "Select2\\.tsx$",
    "Input2\\.tsx$",
    "EditModelTabs\\.tsx$",
    "ApiConfig\\.tsx$",
    "Select2\\.tsx$",
    "Select2\\.tsx$",
  ],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
    "<rootDir>/tests/**/*.(spec|test).[jt]s?(x)"
  ]
}
 
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)