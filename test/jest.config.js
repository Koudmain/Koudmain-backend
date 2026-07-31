module.exports = {
    testEnvironment: 'node',
    preset: 'ts-jest',
    rootDir: '../',
    modulePaths: ['<rootDir>'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^src$': '<rootDir>/src',
        '^src/(.+)$': '<rootDir>/src/$1',
    },
    globals: {
        'ts-jest': {
            tsconfig: '<rootDir>/tsconfig.json',
        },
    },
    modulePathIgnorePatterns: ['src/typings'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/(coverage|dist|lib|tmp)/',
    ],
    setupFilesAfterEnv: ['dotenv/config'],
};