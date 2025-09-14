const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');

// Simple logging
const log = {
    info: (msg) => console.log(`ℹ [INFO] ${new Date().toLocaleTimeString()} ${msg}`),
    success: (msg) => console.log(`✓ [SUCCESS] ${new Date().toLocaleTimeString()} ${msg}`),
    error: (msg) => console.log(`✗ [ERROR] ${new Date().toLocaleTimeString()} ${msg}`),
    warning: (msg) => console.log(`⚠ [WARNING] ${new Date().toLocaleTimeString()} ${msg}`),
    bot: (msg) => console.log(`🤖 [BOT] ${new Date().toLocaleTimeString()} ${msg}`)
};

// Menus
const PRIVATE_MENU = `🤖 ברוכים הבאים לבוט!

בחרו פעולה:
1️⃣ יצירת קבוצה
2️⃣ מידע על הבוט`;

const GROUP_MENU = `🤖 תפריט קבוצה:

בחרו פעולה:
1️⃣ שליחת תמונה עם שם
2️⃣ שליחת טקסט
3️⃣ קבלת תמונה שמורה
4️⃣ קבלת טקסט שמור`;

const BOT_INFO = `📖 מידע על הבוט

🤖 בוט WhatsApp לניהול קבוצות ושמירת קבצים
⚡ פשוט, מהיר ויעיל
📅 עודכן: ${new Date().toLocaleDateString('he-IL')}`;

// User states for multi-step processes
const USER_STATES = {
    WAITING_FOR_IMAGE: 'waiting_image',
    WAITING_FOR_TEXT: 'waiting_text',
    WAITING_FOR_TEXT_NAME: 'waiting_text_name',
    WAITING_FOR_IMAGE_SELECTION: 'waiting_image_selection',
    WAITING_FOR_TEXT_SELECTION: 'waiting_text_selection'
};

// Global variables
const userStates = new Map();
const knownGroups = new Map();
const phoneMapping = new Map(); // Maps LID to real phone number
const groupsFile = path.join(__dirname, 'groups.json');
const mappingFile = path.join(__dirname, 'phone_mapping.json');

// Load groups from file
function loadGroups() {
    try {
        if (fs.existsSync(groupsFile)) {
            const data = fs.readFileSync(groupsFile, 'utf8');
            const groupsData = JSON.parse(data);
            Object.entries(groupsData).forEach(([id, info]) => {
                knownGroups.set(id, info);
            });
            log.info(`Loaded ${knownGroups.size} groups`);
        }
    } catch (error) {
        log.error(`Failed to load groups: ${error.message}`);
    }
}

// Save groups to file
function saveGroups() {
    try {
        const groupsData = Object.fromEntries(knownGroups);
        fs.writeFileSync(groupsFile, JSON.stringify(groupsData, null, 2));
        log.info(`Saved ${knownGroups.size} groups`);
    } catch (error) {
        log.error(`Failed to save groups: ${error.message}`);
    }
}

// Load phone mapping from file
function loadPhoneMapping() {
    try {
        if (fs.existsSync(mappingFile)) {
            const data = fs.readFileSync(mappingFile, 'utf8');
            const mappingData = JSON.parse(data);
            Object.entries(mappingData).forEach(([lid, phone]) => {
                phoneMapping.set(lid, phone);
            });
            log.info(`Loaded ${phoneMapping.size} phone mappings`);
        }
    } catch (error) {
        log.error(`Failed to load phone mapping: ${error.message}`);
    }
}

// Save phone mapping to file
function savePhoneMapping() {
    try {
        const mappingData = Object.fromEntries(phoneMapping);
        fs.writeFileSync(mappingFile, JSON.stringify(mappingData, null, 2));
        log.info(`Saved ${phoneMapping.size} phone mappings`);
    } catch (error) {
        log.error(`Failed to save phone mapping: ${error.message}`);
    }
}


// Map LID to real phone number
function mapLidToPhone(lidJid, realPhone) {
    if (lidJid.includes('@lid') && realPhone) {
        phoneMapping.set(lidJid, realPhone);
        savePhoneMapping();
        log.info(`Mapped ${lidJid} to ${realPhone}`);
    }
}

// Check if phone number is valid
function isValidPhoneNumber(number) {
    if (!number || typeof number !== 'string') return false;

    // Extract digits from LID format or regular format
    let digitsOnly;
    if (number.includes('@lid')) {
        // Extract the number part before @lid
        digitsOnly = number.split('@')[0].replace(/\D/g, '');
    } else {
        digitsOnly = number.replace(/\D/g, '');
    }

    return digitsOnly.length >= 10 &&
        digitsOnly.length <= 15 &&
        !number.includes('@broadcast') &&
        !number.includes('@newsletter');
}

// Extract real phone number from various WhatsApp formats
function extractPhoneNumber(jidOrNumber) {
    if (!jidOrNumber || typeof jidOrNumber !== 'string') return null;

    // Check if we have a mapping for this LID
    if (jidOrNumber.includes('@lid')) {
        const mappedPhone = phoneMapping.get(jidOrNumber);
        if (mappedPhone) {
            return mappedPhone;
        }

        // Try to extract from LID format
        const lidPart = jidOrNumber.split('@')[0];
        const digitsOnly = lidPart.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
            return digitsOnly;
        }

        // If we can't extract, return null - we need manual mapping
        return null;
    }

    // Handle regular @s.whatsapp.net format
    if (jidOrNumber.includes('@s.whatsapp.net')) {
        return jidOrNumber.replace('@s.whatsapp.net', '');
    }

    // Handle raw number
    const digitsOnly = jidOrNumber.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
        return digitsOnly;
    }

    return null;
}

// Create user directory
async function createUserDirectory(phoneNumber) {
    if (!isValidPhoneNumber(phoneNumber)) {
        log.warning(`Invalid phone number: ${phoneNumber}`);
        return null;
    }

    const userDir = path.join(__dirname, 'people', phoneNumber);
    const documentsDir = path.join(userDir, 'documents');
    const textsDir = path.join(userDir, 'texts');

    try {
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, {
            recursive: true
        });
        if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, {
            recursive: true
        });
        if (!fs.existsSync(textsDir)) fs.mkdirSync(textsDir, {
            recursive: true
        });

        log.info(`Created directories for user: ${phoneNumber}`);
        return userDir;
    } catch (error) {
        log.error(`Failed to create directory for ${phoneNumber}: ${error.message}`);
        return null;
    }
}

// Find user's group by phone number
function findUserGroup(phoneNumber) {
    for (const [groupId, groupInfo] of knownGroups) {
        if (groupInfo.creator === phoneNumber && groupInfo.status === 'active') {
            return {
                groupId,
                groupInfo
            };
        }
    }
    return null;
}

// Create new group
async function createGroup(socket, userJid, phoneNumber) {
    try {
        // Check if user has any groups and validate them
        const existingGroup = findUserGroup(phoneNumber);
        if (existingGroup) {
            const {
                groupId,
                groupInfo
            } = existingGroup;

            // Check if user is actually still in the group
            const groupStatus = await checkBothInGroup(socket, groupId, userJid);

            if (groupStatus.bothInGroup && (!groupInfo.status || groupInfo.status === 'active')) {
                await socket.sendMessage(userJid, {
                    text: `⚠️ יש לך כבר קבוצה פעילה: "${groupInfo.name}"`
                });
                return;
            } else {
                // Mark group as inactive since user or bot is not in it
                log.info(`User ${phoneNumber} or bot not in existing group ${groupInfo.name} - marking as inactive`);
                groupInfo.status = 'inactive';
                groupInfo.leftAt = new Date().toISOString();
                knownGroups.set(groupId, groupInfo);
                saveGroups();
                // Continue to create new group below
            }
        }

        // Create new group
        const groupName = `בוט ${phoneNumber} - ${new Date().toLocaleDateString('he-IL')}`;
        const group = await socket.groupCreate(groupName, [userJid]);

        if (group && group.id) {
            // Save group info
            knownGroups.set(group.id, {
                name: groupName,
                creator: phoneNumber,
                created: new Date().toISOString(),
                status: 'active'
            });
            saveGroups();

            // Create user directory
            await createUserDirectory(phoneNumber);

            // Send immediate confirmation to user
            await socket.sendMessage(userJid, {
                text: `✅ נוצרה קבוצה חדשה: "${groupName}"\n\n🔧 מגדיר הגדרות קבוצה...`
            });

            // Send immediate welcome to group
            await socket.sendMessage(group.id, {
                text: `🎉 ברוכים הבאים לקבוצה!\n\n📋 הגדרות הקבוצה:\n• ✅ ניתן לשלוח הודעות\n• ❌ לא ניתן להוסיף חברים\n• ❌ לא ניתן להתקשר\n\n${GROUP_MENU}`
            });

            // Set group settings with delays to ensure they work
            try {
                // Wait a bit for group to be fully created
                await new Promise(resolve => setTimeout(resolve, 2000));

                await socket.groupSettingUpdate(group.id, 'restrict');
                log.info(`Set restrict setting for group ${group.id}`);

                await new Promise(resolve => setTimeout(resolve, 1000));

                await socket.groupSettingUpdate(group.id, 'not_announcement');
                log.info(`Set not_announcement setting for group ${group.id}`);

                // Update user that group is ready
                await socket.sendMessage(userJid, {
                    text: `✅ הקבוצה מוכנה לשימוש! הגדרות הוגדרו בהצלחה.`
                });

                // Send private main menu to user
                await sendMenu(socket, userJid, false);

            } catch (settingsError) {
                log.warning(`Could not set all group settings: ${settingsError.message}`);
            }

            log.success(`Created group ${group.id} for user ${phoneNumber}`);
        }
    } catch (error) {
        log.error(`Failed to create group: ${error.message}`);
        await socket.sendMessage(userJid, {
            text: '❌ שגיאה ביצירת קבוצה. נסה שוב מאוחר יותר.'
        });
    }
}

// Check if both user and bot are in group
async function checkBothInGroup(socket, groupId, userJid) {
    try {
        const groupMetadata = await socket.groupMetadata(groupId);
        const participants = groupMetadata.participants || [];

        const userInGroup = participants.some(p => p.id === userJid);
        const botJid = socket.user.id;
        const botInGroup = participants.some(p => p.id === botJid);

        log.info(`Group ${groupId}: User in group: ${userInGroup}, Bot in group: ${botInGroup}`);

        return {
            userInGroup,
            botInGroup,
            bothInGroup: userInGroup && botInGroup
        };
    } catch (error) {
        log.warning(`Could not check group metadata for ${groupId}: ${error.message}`);
        return {
            userInGroup: false,
            botInGroup: false,
            bothInGroup: false
        };
    }
}

// Handle group participant updates
async function handleGroupParticipants(socket, update) {
    const {
        id: groupId,
        participants,
        action
    } = update;

    if (!knownGroups.has(groupId)) return;

    const groupInfo = knownGroups.get(groupId);

    if (action === 'remove') {
        for (const participant of participants) {
            const participantNumber = participant.split('@')[0];

            // If group creator left, bot leaves too
            if (participantNumber === groupInfo.creator) {
                log.info(`Group creator ${participantNumber} left group ${groupInfo.name}`);

                try {
                    await socket.groupLeave(groupId);
                    groupInfo.status = 'inactive';
                    groupInfo.leftAt = new Date().toISOString();
                    knownGroups.set(groupId, groupInfo);
                    saveGroups();
                    log.success(`Bot left group: ${groupInfo.name}`);
                } catch (error) {
                    log.error(`Failed to leave group: ${error.message}`);
                }
                break;
            }
        }
    }
}

// Download and save image
async function saveImage(socket, msg, phoneNumber, imageName) {
    try {
        const userDir = path.join(__dirname, 'people', phoneNumber, 'documents');

        // Check if message has image
        if (!msg.message || !msg.message.imageMessage) {
            throw new Error('No image message found');
        }

        // Download image using the correct method
        let buffer;
        try {
            // Try the new method first
            buffer = await socket.downloadMediaMessage(msg);
        } catch (downloadError) {
            log.warning(`Primary download method failed: ${downloadError.message}`);
            // Try alternative method
            const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
        }

        // Save with .jpg extension
        const fileName = `${imageName}.jpg`;
        const filePath = path.join(userDir, fileName);
        fs.writeFileSync(filePath, buffer);

        log.success(`Saved image "${fileName}" for user ${phoneNumber}`);
        return fileName;
    } catch (error) {
        log.error(`Failed to save image: ${error.message}`);
        throw error;
    }
}

// Send menu without deleting messages
async function sendMenu(socket, jid, isGroup, successMessage = null) {
    try {
        // Send the message
        let messageToSend;
        if (successMessage) {
            if (isGroup) {
                messageToSend = `${successMessage}\n\n${GROUP_MENU}`;
            } else {
                messageToSend = `${successMessage}\n\n${PRIVATE_MENU}`;
            }
        } else {
            messageToSend = isGroup ? GROUP_MENU : PRIVATE_MENU;
        }

        await socket.sendMessage(jid, {
            text: messageToSend
        });

    } catch (error) {
        log.error(`Failed to send menu: ${error.message}`);
    }
}

// Save text file
async function saveTextFile(socket, phoneNumber, textContent, fileName) {
    try {
        const userDir = path.join(__dirname, 'people', phoneNumber, 'texts');

        // Save as .txt file
        const fullFileName = `${fileName}.txt`;
        const filePath = path.join(userDir, fullFileName);
        fs.writeFileSync(filePath, textContent, 'utf8');

        log.success(`Saved text file "${fullFileName}" for user ${phoneNumber}`);
        return fullFileName;
    } catch (error) {
        log.error(`Failed to save text file: ${error.message}`);
        throw error;
    }
}

// Get list of saved images for user
async function getUserImages(phoneNumber) {
    try {
        const documentsDir = path.join(__dirname, 'people', phoneNumber, 'documents');

        if (!fs.existsSync(documentsDir)) {
            return [];
        }

        const files = fs.readdirSync(documentsDir);
        const imageFiles = files.filter(file =>
            file.toLowerCase().endsWith('.jpg') ||
            file.toLowerCase().endsWith('.jpeg') ||
            file.toLowerCase().endsWith('.png') ||
            file.toLowerCase().endsWith('.gif')
        );

        return imageFiles;
    } catch (error) {
        log.error(`Failed to get user images: ${error.message}`);
        return [];
    }
}

// Get list of saved text files for user
async function getUserTexts(phoneNumber) {
    try {
        const textsDir = path.join(__dirname, 'people', phoneNumber, 'texts');

        if (!fs.existsSync(textsDir)) {
            return [];
        }

        const files = fs.readdirSync(textsDir);
        const textFiles = files.filter(file => file.toLowerCase().endsWith('.txt'));

        return textFiles;
    } catch (error) {
        log.error(`Failed to get user texts: ${error.message}`);
        return [];
    }
}

// Send image by number selection
async function sendImageBySelection(socket, jid, phoneNumber, selection) {
    try {
        const images = await getUserImages(phoneNumber);
        const imageIndex = parseInt(selection) - 1;

        if (imageIndex < 0 || imageIndex >= images.length) {
            throw new Error('Invalid selection');
        }

        const imageName = images[imageIndex];
        const imagePath = path.join(__dirname, 'people', phoneNumber, 'documents', imageName);

        // Send the image
        const imageBuffer = fs.readFileSync(imagePath);
        await socket.sendMessage(jid, {
            image: imageBuffer,
            caption: `📷 ${imageName}`
        });

        return imageName;
    } catch (error) {
        log.error(`Failed to send image: ${error.message}`);
        throw error;
    }
}

// Send text file by number selection
async function sendTextBySelection(socket, jid, phoneNumber, selection) {
    try {
        const texts = await getUserTexts(phoneNumber);
        const textIndex = parseInt(selection) - 1;

        if (textIndex < 0 || textIndex >= texts.length) {
            throw new Error('Invalid selection');
        }

        const textName = texts[textIndex];
        const textPath = path.join(__dirname, 'people', phoneNumber, 'texts', textName);

        // Read and send the text content
        const textContent = fs.readFileSync(textPath, 'utf8');
        await socket.sendMessage(jid, {
            text: `📄 ${textName}:\n\n${textContent}`
        });

        return textName;
    } catch (error) {
        log.error(`Failed to send text: ${error.message}`);
        throw error;
    }
}

// Handle messages
async function handleMessage(socket, msg) {
    try {
        const jid = msg.key.remoteJid;
        const isGroup = jid.includes('@g.us');

        // Skip group system messages and messages without participant
        if (isGroup && !msg.key.participant) {
            // This is a system message from the group itself, ignore it
            return;
        }

        // Get sender number
        let senderNumber;
        if (isGroup) {
            // In groups, extract from participant field
            senderNumber = extractPhoneNumber(msg.key.participant);
        } else {
            // In private chats, extract from jid
            senderNumber = extractPhoneNumber(jid);
        }

        // Skip invalid phone numbers
        if (!senderNumber || !isValidPhoneNumber(senderNumber)) {
            log.warning(`Ignoring message from invalid/unknown number: ${msg.key.participant || jid}`);
            return;
        }

        // Get message text
        const messageText = (msg.message && msg.message.conversation) ||
            (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || '';

        // Get user state
        const userState = userStates.get(senderNumber);

        log.bot(`📩 Message from ${senderNumber} (${isGroup ? 'group' : 'private'}): "${messageText}"`);

        // Handle user states first
        if (userState) {
            if (userState === USER_STATES.WAITING_FOR_IMAGE) {
                // User should send image with caption
                if (msg.message.imageMessage && msg.message.imageMessage.caption) {
                    const imageName = msg.message.imageMessage.caption.trim();
                    try {
                        const fileName = await saveImage(socket, msg, senderNumber, imageName);
                        await sendMenu(socket, jid, isGroup, `✅ התמונה "${fileName}" נשמרה בהצלחה!`);
                        userStates.delete(senderNumber);
                    } catch (error) {
                        await sendMenu(socket, jid, isGroup, '❌ שגיאה בשמירת התמונה. נסה שוב.');
                        userStates.delete(senderNumber);
                    }
                    return;
                } else {
                    await socket.sendMessage(jid, {
                        text: '❌ אנא שלח תמונה עם שם בכיתוב (Caption)'
                    });
                    return;
                }
            }

            if (userState === USER_STATES.WAITING_FOR_TEXT) {
                // User sent text content, now wait for name
                userStates.set(senderNumber, {
                    state: USER_STATES.WAITING_FOR_TEXT_NAME,
                    textContent: messageText
                });
                await socket.sendMessage(jid, {
                    text: '📝 עכשיו שלח את השם לקובץ הטקסט:'
                });
                return;
            }

            if (userState.state === USER_STATES.WAITING_FOR_TEXT_NAME) {
                // User sent text name, save the file
                const fileName = messageText.trim();
                try {
                    const savedFileName = await saveTextFile(socket, senderNumber, userState.textContent, fileName);
                    await sendMenu(socket, jid, isGroup, `✅ קובץ הטקסט "${savedFileName}" נשמר בהצלחה!`);
                    userStates.delete(senderNumber);
                } catch (error) {
                    await sendMenu(socket, jid, isGroup, '❌ שגיאה בשמירת הטקסט. נסה שוב.');
                    userStates.delete(senderNumber);
                }
                return;
            }

            if (userState === USER_STATES.WAITING_FOR_IMAGE_SELECTION) {
                // User selected image number
                const selection = messageText.trim();
                try {
                    const imageName = await sendImageBySelection(socket, jid, senderNumber, selection);
                    await sendMenu(socket, jid, isGroup, `✅ התמונה "${imageName}" נשלחה בהצלחה!`);
                    userStates.delete(senderNumber);
                } catch (error) {
                    await sendMenu(socket, jid, isGroup, '❌ בחירה לא תקינה או שגיאה בשליחה. נסה שוב.');
                    userStates.delete(senderNumber);
                }
                return;
            }

            if (userState === USER_STATES.WAITING_FOR_TEXT_SELECTION) {
                // User selected text number
                const selection = messageText.trim();
                try {
                    const textName = await sendTextBySelection(socket, jid, senderNumber, selection);
                    await sendMenu(socket, jid, isGroup, `✅ הטקסט "${textName}" נשלח בהצלחה!`);
                    userStates.delete(senderNumber);
                } catch (error) {
                    await sendMenu(socket, jid, isGroup, '❌ בחירה לא תקינה או שגיאה בשליחה. נסה שוב.');
                    userStates.delete(senderNumber);
                }
                return;
            }
        }

        // Handle regular messages
        if (isGroup) {
            if (messageText === '1') {
                // User wants to send image - immediate response
                userStates.set(senderNumber, USER_STATES.WAITING_FOR_IMAGE);
                await socket.sendMessage(jid, {
                    text: '📷 אנא שלח תמונה עם השם שלה בכיתוב (Caption)'
                });
            } else if (messageText === '2') {
                // User wants to send text - immediate response
                userStates.set(senderNumber, USER_STATES.WAITING_FOR_TEXT);
                await socket.sendMessage(jid, {
                    text: '📝 אנא שלח את הטקסט שברצונך לשמור:'
                });
            } else if (messageText === '3') {
                // User wants to get saved image
                const images = await getUserImages(senderNumber);
                if (images.length === 0) {
                    await sendMenu(socket, jid, isGroup, '❌ אין תמונות שמורות עדיין.');
                } else {
                    let imageList = '📷 תמונות שמורות:\n\n';
                    images.forEach((image, index) => {
                        imageList += `${index + 1}️⃣ ${image}\n`;
                    });
                    imageList += '\n💡 שלח מספר לקבלת התמונה:';

                    userStates.set(senderNumber, USER_STATES.WAITING_FOR_IMAGE_SELECTION);
                    await socket.sendMessage(jid, {
                        text: imageList
                    });
                }
            } else if (messageText === '4') {
                // User wants to get saved text
                const texts = await getUserTexts(senderNumber);
                if (texts.length === 0) {
                    await sendMenu(socket, jid, isGroup, '❌ אין טקסטים שמורים עדיין.');
                } else {
                    let textList = '📄 טקסטים שמורים:\n\n';
                    texts.forEach((text, index) => {
                        textList += `${index + 1}️⃣ ${text}\n`;
                    });
                    textList += '\n💡 שלח מספר לקבלת הטקסט:';

                    userStates.set(senderNumber, USER_STATES.WAITING_FOR_TEXT_SELECTION);
                    await socket.sendMessage(jid, {
                        text: textList
                    });
                }
            } else {
                // Any other message - send menu only once
                await sendMenu(socket, jid, isGroup);
            }
        } else {
            if (messageText === '1') {
                // User wants to create group - immediate response
                await createGroup(socket, jid, senderNumber);
            } else if (messageText === '2') {
                // User wants bot info - immediate response
                await socket.sendMessage(jid, {
                    text: `${PRIVATE_MENU}\n\n${BOT_INFO}`
                });
            } else {
                // Any other message - send menu only once
                await sendMenu(socket, jid, isGroup);
            }
        }

    } catch (error) {
        log.error(`Error handling message: ${error.message}`);
    }
}

// Start bot
async function startBot() {
    try {
        log.info('🤖 Starting Simple WhatsApp Bot...');

        // Load existing groups and phone mappings
        loadGroups();
        loadPhoneMapping();

        // Add manual mapping for known LIDs
        phoneMapping.set('27608385368236@lid', '972545460223');
        savePhoneMapping();

        // Setup directories
        const authDir = path.join(__dirname, 'auth');
        const qrDir = path.join(__dirname, 'qr');

        if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, {
            recursive: true
        });
        if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, {
            recursive: true
        });

        // Initialize auth state
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(authDir);
        const {
            version
        } = await fetchLatestBaileysVersion();

        // Create custom logger to suppress Baileys logs
        const customLogger = {
            level: 'silent',
            child: () => customLogger,
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            fatal: () => {}
        };

        // Create socket
        const socket = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            logger: customLogger
        });

        // Save credentials
        socket.ev.on('creds.update', saveCreds);

        // Handle connection updates
        socket.ev.on('connection.update', async (update) => {
            const {
                connection,
                lastDisconnect,
                qr
            } = update;

            if (qr) {
                const qrPath = path.join(qrDir, 'whatsapp-qr.png');
                try {
                    await qrcode.toFile(qrPath, qr, {
                        width: 300,
                        margin: 2
                    });
                    log.success(`QR code saved to: ${qrPath}`);
                    log.info('Scan the QR code with your phone to connect');
                } catch (err) {
                    log.error(`Failed to save QR code: ${err.message}`);
                }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect && lastDisconnect.error &&
                    lastDisconnect.error.output && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    log.warning('Connection closed, reconnecting in 3 seconds...');
                    setTimeout(startBot, 3000);
                } else {
                    log.error('Logged out from WhatsApp. Delete auth folder and restart.');
                }
            } else if (connection === 'open') {
                log.success('Successfully connected to WhatsApp!');
                log.info('Bot is ready and listening for messages...');

                // Reset active group chats and send fresh menu on startup
                try {
                    for (const [groupId, groupInfo] of knownGroups) {
                        if (!groupInfo.status || groupInfo.status === 'active') {
                            // Check if user is still in group before trying to clear
                            const userJid = `${groupInfo.creator}@s.whatsapp.net`;
                            const groupStatus = await checkBothInGroup(socket, groupId, userJid);

                            if (groupStatus.bothInGroup) {
                                await sendMenu(socket, groupId, true);
                            } else {
                                // Mark group as inactive if user or bot left
                                log.info(`User ${groupInfo.creator} or bot not in group ${groupInfo.name} - marking as inactive`);
                                groupInfo.status = 'inactive';
                                groupInfo.leftAt = new Date().toISOString();
                                knownGroups.set(groupId, groupInfo);
                                saveGroups();
                            }
                        }
                    }
                } catch (startupClearError) {
                    log.warning(`Failed to reset chats on startup: ${startupClearError.message}`);
                }
            }
        });

        // Handle messages
        socket.ev.on('messages.upsert', async ({
            messages,
            type
        }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                if (!msg.key.fromMe) {
                    await handleMessage(socket, msg);
                }
            }
        });

        // Handle group participant updates
        socket.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipants(socket, update);
        });

    } catch (error) {
        log.error(`Bot failed to start: ${error.message}`);
        setTimeout(startBot, 5000);
    }
}

// Handle shutdown
process.on('SIGINT', () => {
    log.info('Shutting down bot...');
    process.exit(0);
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidPhoneNumber,
        extractPhoneNumber,
        createUserDirectory,
        sendMenu,
        checkBothInGroup,
        saveTextFile,
        saveImage,
        findUserGroup,
        startBot
    };
} else {
    // Start the bot only if not in test environment
    console.log('🚀 Simple WhatsApp Bot v2.0');
    console.log('📱 Clean and Simple Logic');
    startBot();
}