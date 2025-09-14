const fs = require('fs');
const path = require('path');

// Mock the WhatsApp dependencies
jest.mock('@whiskeysockets/baileys', () => ({
    default: jest.fn(),
    useMultiFileAuthState: jest.fn(),
    DisconnectReason: {},
    fetchLatestBaileysVersion: jest.fn(),
    downloadContentFromMessage: jest.fn()
}));

jest.mock('qrcode', () => ({
    toFile: jest.fn()
}));

// Import functions to test (we'll need to modify simple_bot.js to export them)
describe('WhatsApp Bot Tests', () => {
    let mockSocket;

    beforeEach(() => {
        // Mock socket object
        mockSocket = {
            sendMessage: jest.fn().mockResolvedValue({
                key: {
                    id: 'test-id'
                }
            }),
            groupCreate: jest.fn().mockResolvedValue({
                id: 'test-group-id'
            }),
            groupMetadata: jest.fn().mockResolvedValue({
                participants: [{
                        id: '972545460223@s.whatsapp.net'
                    },
                    {
                        id: 'bot@s.whatsapp.net'
                    }
                ]
            }),
            groupSettingUpdate: jest.fn().mockResolvedValue({}),
            downloadMediaMessage: jest.fn().mockResolvedValue(Buffer.from('test-image')),
            user: {
                id: 'bot@s.whatsapp.net'
            }
        };

        // Clear any existing test files
        const testDir = path.join(__dirname, '..', 'test_people');
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, {
                recursive: true,
                force: true
            });
        }
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Clean up test files
        const testDir = path.join(__dirname, '..', 'test_people');
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, {
                recursive: true,
                force: true
            });
        }
    });

    describe('Phone Number Validation', () => {
        test('should validate correct phone numbers', () => {
            const isValidPhoneNumber = require('../simple_bot').isValidPhoneNumber;

            expect(isValidPhoneNumber('972545460223')).toBe(true);
            expect(isValidPhoneNumber('1234567890')).toBe(true);
            expect(isValidPhoneNumber('123456789012345')).toBe(true); // 15 digits max
        });

        test('should reject invalid phone numbers', () => {
            const isValidPhoneNumber = require('../simple_bot').isValidPhoneNumber;

            expect(isValidPhoneNumber('123456789')).toBe(false); // too short
            expect(isValidPhoneNumber('1234567890123456')).toBe(false); // too long
            expect(isValidPhoneNumber('12345@lid')).toBe(false); // contains @lid
            expect(isValidPhoneNumber('test@broadcast')).toBe(false); // broadcast
            expect(isValidPhoneNumber('')).toBe(false); // empty
            expect(isValidPhoneNumber(null)).toBe(false); // null
        });
    });

    describe('User Directory Creation', () => {
        test('should create user directories for valid phone numbers', async () => {
            // We'll need to modify simple_bot.js to export this function
            const createUserDirectory = require('../simple_bot').createUserDirectory;

            const phoneNumber = '972545460223';
            const userDir = await createUserDirectory(phoneNumber);

            expect(userDir).toBeTruthy();
            expect(fs.existsSync(path.join(userDir, 'documents'))).toBe(true);
            expect(fs.existsSync(path.join(userDir, 'texts'))).toBe(true);
        });

        test('should not create directories for invalid phone numbers', async () => {
            const createUserDirectory = require('../simple_bot').createUserDirectory;

            const result = await createUserDirectory('invalid@lid');
            expect(result).toBeNull();
        });
    });

    describe('Menu Functions', () => {
        test('should send correct menu for groups', async () => {
            const sendMenu = require('../simple_bot').sendMenu;

            await sendMenu(mockSocket, 'test-group@g.us', true);

            expect(mockSocket.sendMessage).toHaveBeenCalledWith(
                'test-group@g.us',
                expect.objectContaining({
                    text: expect.stringContaining('🤖 תפריט קבוצה')
                })
            );
        });

        test('should send correct menu for private chats', async () => {
            const sendMenu = require('../simple_bot').sendMenu;

            await sendMenu(mockSocket, '972545460223@s.whatsapp.net', false);

            expect(mockSocket.sendMessage).toHaveBeenCalledWith(
                '972545460223@s.whatsapp.net',
                expect.objectContaining({
                    text: expect.stringContaining('🤖 ברוכים הבאים לבוט!')
                })
            );
        });

        test('should send success message with menu', async () => {
            const sendMenu = require('../simple_bot').sendMenu;

            await sendMenu(mockSocket, 'test-group@g.us', true, '✅ פעולה הושלמה');

            expect(mockSocket.sendMessage).toHaveBeenCalledWith(
                'test-group@g.us',
                expect.objectContaining({
                    text: expect.stringMatching(/✅ פעולה הושלמה.*🤖 תפריט קבוצה/s)
                })
            );
        });
    });

    describe('Group Management', () => {
        test('should check if both user and bot are in group', async () => {
            const checkBothInGroup = require('../simple_bot').checkBothInGroup;

            const result = await checkBothInGroup(
                mockSocket,
                'test-group-id',
                '972545460223@s.whatsapp.net'
            );

            expect(result.userInGroup).toBe(true);
            expect(result.botInGroup).toBe(true);
            expect(result.bothInGroup).toBe(true);
        });

        test('should handle group metadata errors gracefully', async () => {
            const checkBothInGroup = require('../simple_bot').checkBothInGroup;

            mockSocket.groupMetadata.mockRejectedValue(new Error('Group not found'));

            const result = await checkBothInGroup(
                mockSocket,
                'invalid-group-id',
                '972545460223@s.whatsapp.net'
            );

            expect(result.userInGroup).toBe(false);
            expect(result.botInGroup).toBe(false);
            expect(result.bothInGroup).toBe(false);
        });
    });

    describe('File Operations', () => {
        test('should save text file correctly', async () => {
            const saveTextFile = require('../simple_bot').saveTextFile;

            const phoneNumber = '972545460223';
            const textContent = 'Test content';
            const fileName = 'test-file';

            // Create user directory first
            const userDir = path.join(__dirname, '..', 'people', phoneNumber);
            const textsDir = path.join(userDir, 'texts');
            fs.mkdirSync(textsDir, {
                recursive: true
            });

            const savedFileName = await saveTextFile(mockSocket, phoneNumber, textContent, fileName);

            expect(savedFileName).toBe('test-file.txt');

            const savedContent = fs.readFileSync(
                path.join(textsDir, 'test-file.txt'),
                'utf8'
            );
            expect(savedContent).toBe(textContent);
        });
    });

    describe('Error Handling', () => {
        test('should handle sendMessage errors gracefully', async () => {
            const sendMenu = require('../simple_bot').sendMenu;

            mockSocket.sendMessage.mockRejectedValue(new Error('Network error'));

            // Should not throw
            await expect(sendMenu(mockSocket, 'test-jid', false)).resolves.not.toThrow();
        });

        test('should handle file system errors in saveTextFile', async () => {
            const saveTextFile = require('../simple_bot').saveTextFile;

            // Try to save to invalid directory
            await expect(
                saveTextFile(mockSocket, 'invalid/path', 'content', 'file')
            ).rejects.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete image saving flow', async () => {
            const mockMsg = {
                message: {
                    imageMessage: {
                        caption: 'test-image'
                    }
                },
                key: {
                    remoteJid: 'test-group@g.us',
                    participant: '972545460223@s.whatsapp.net'
                }
            };

            const phoneNumber = '972545460223';

            // Create user directory
            const userDir = path.join(__dirname, '..', 'people', phoneNumber);
            const documentsDir = path.join(userDir, 'documents');
            fs.mkdirSync(documentsDir, {
                recursive: true
            });

            const saveImage = require('../simple_bot').saveImage;

            const fileName = await saveImage(mockSocket, mockMsg, phoneNumber, 'test-image');

            expect(fileName).toBe('test-image.jpg');
            expect(fs.existsSync(path.join(documentsDir, 'test-image.jpg'))).toBe(true);
        });
    });
});