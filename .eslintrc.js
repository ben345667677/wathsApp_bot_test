module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        'no-console': 'off', // Allow console.log for bot logging
        'no-unused-vars': ['warn', {
            argsIgnorePattern: '^_'
        }],
        'prefer-const': 'warn',
        'no-var': 'error',
        'semi': ['error', 'always'],
        'quotes': ['warn', 'single', {
            allowTemplateLiterals: true
        }],
        'no-trailing-spaces': 'warn',
        'eol-last': 'warn'
    },
    globals: {
        'process': 'readonly',
        'Buffer': 'readonly',
        '__dirname': 'readonly',
        'module': 'readonly',
        'require': 'readonly',
        'exports': 'readonly'
    }
};