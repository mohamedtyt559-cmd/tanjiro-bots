const { default: makeWASocket, useMultiFileAuthState, delay, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const stringSimilarity = require('string-similarity');
const fs = require('fs');

const dbFile = './tanjiro_empire_db.json';
let db = { users: {}, gangs: {}, companies: {}, stockMarket: { price: 100 }, settings: { antilink: true } };
if (fs.existsSync(dbFile)) {
    try { 
        db = JSON.parse(fs.readFileSync(dbFile)); 
        if(!db.gangs) db.gangs = {}; 
        if(!db.companies) db.companies = {};
        if(!db.stockMarket) db.stockMarket = {price: 100}; 
    } catch (e) {}
}
function saveDb() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

// 🍔 1. المطعم ومحل الوجبات الشامل
const RESTAURANT_MENU = [
    { id: '1', name: 'وجبة بيتزا ببروني عملاقة 🍕', price: 150, energy: 45, desc: 'استعادة طاقة +45%' },
    { id: '2', name: 'وجبة شاورما عربي دبل 🌯', price: 120, energy: 35, desc: 'استعادة طاقة +35%' },
    { id: '3', name: 'وجبة برجر إمبراطوري فاخر 🍔', price: 200, energy: 60, desc: 'استعادة طاقة +60%' },
    { id: '4', name: 'إندومي حار كوري 🍜', price: 80, energy: 25, desc: 'طاقة +25% | ⚠️ تحذير صحي: مضرة جداً!' },
    { id: '5', name: 'مشروب مقاطعة غازي 🥤', price: 50, energy: 10, desc: 'طاقة +10% | ⚠️ تنبيه: أنت تأكل وتشرَب من دم أخواتك!' },
    { id: '6', name: 'بطاطس مقاطعة شيبسي 🍟', price: 40, energy: 8, desc: 'طاقة +8% | ⚠️ تنبيه: دعم المقاطعة واجب!' }
];

// 🛒 2. متجر الأدوات والعتاد المهني
const SHOP_TOOLS = [
    { id: '10', name: 'رخصة قيادة 🪪', price: 1200, type: 'tool', desc: 'مطلوبة لوظائف التوصيل والتاكسي' },
    { id: '11', name: 'جهاز لاب توب متطور 💻', price: 3500, type: 'tool', desc: 'مطلوب لوظائف البرمجة وتأسيس الشركات' },
    { id: '12', name: 'عدة بناء وصيانة 🧰', price: 1500, type: 'tool', desc: 'مطلوبة لوظائف البناء والصيانة' },
    { id: '13', name: 'حقيبة إسعافات طبية 🚑', price: 2500, type: 'tool', desc: 'مطلوبة لوظائف الأطباء والتمريض' },
    { id: '14', name: 'رخصة طيران مدني ✈️', price: 15000, type: 'tool', desc: 'مطلوبة لوظائف الطيران' }
];

// 💼 3. موسوعة الـ 35 وظيفة الإمبراطورية المتدرجة
const JOBS = [
    { name: 'عامل نظافة', minLevel: 1, salary: 200, reqTool: null },
    { name: 'عامل بناء', minLevel: 1, salary: 450, reqTool: 'عدة بناء وصيانة 🧰' },
    { name: 'سائق توصيل طلبات', minLevel: 2, salary: 700, reqTool: 'رخصة قيادة 🪪' },
    { name: 'حارس أمن', minLevel: 2, salary: 850, reqTool: null },
    { name: 'بائع متجر', minLevel: 2, salary: 900, reqTool: null },
    { name: 'مساعد طباخ', minLevel: 3, salary: 1100, reqTool: null },
    { name: 'فني صيانة هواتف', minLevel: 3, salary: 1300, reqTool: 'عدة بناء وصيانة 🧰' },
    { name: 'سائق تاكسي', minLevel: 3, salary: 1450, reqTool: 'رخصة قيادة 🪪' },
    { name: 'رسام جرافيتي', minLevel: 4, salary: 1700, reqTool: null },
    { name: 'محاسب مالي', minLevel: 4, salary: 2000, reqTool: null },
    { name: 'صحفي ميداني', minLevel: 4, salary: 2300, reqTool: null },
    { name: 'مدرب رياضي', minLevel: 5, salary: 2600, reqTool: null },
    { name: 'مصمم جرافيك', minLevel: 5, salary: 3000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'مبرمج ويب', minLevel: 5, salary: 3500, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'مهندس مدني', minLevel: 6, salary: 4200, reqTool: 'عدة بناء وصيانة 🧰' },
    { name: 'ممرض مستشفى', minLevel: 6, salary: 4800, reqTool: 'حقيبة إسعافات طبية 🚑' },
    { name: 'محرر فيديوهات (مونيتور)', minLevel: 6, salary: 5300, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'محامي قانوني', minLevel: 7, salary: 6000, reqTool: null },
    { name: 'طبيب جراح عام', minLevel: 7, salary: 7500, reqTool: 'حقيبة إسعافات طبية 🚑' },
    { name: 'مستشار أمني', minLevel: 7, salary: 8200, reqTool: null },
    { name: 'طيار مروحي (هليكوبتر)', minLevel: 8, salary: 9500, reqTool: 'رخصة طيران مدني ✈️' },
    { name: 'مهندس برمجيات متقدم', minLevel: 8, salary: 11000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'مدير تنفيذي لشركة', minLevel: 9, salary: 13500, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'قبطان سفينة شحن', minLevel: 9, salary: 16000, reqTool: null },
    { name: 'كابتن طيار مدني', minLevel: 10, salary: 20000, reqTool: 'رخصة طيران مدني ✈️' },
    { name: 'بروفيسور جامعي', minLevel: 10, salary: 24000, reqTool: null },
    { name: 'مستشار اقتصادي دولي', minLevel: 11, salary: 30000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'قاضي المحكمة العليا', minLevel: 11, salary: 38000, reqTool: null },
    { name: 'مستكشف الفضاء وسير الذرات', minLevel: 12, salary: 48000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'وزير الاستثمار والتجارة', minLevel: 12, salary: 60000, reqTool: null },
    { name: 'رئيس مجلس الإدارة للشركات', minLevel: 13, salary: 85000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'مالك بنك المركز الإمبراطوري', minLevel: 14, salary: 110000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'زعيم المافيا الاقتصادية الكبرى', minLevel: 14, salary: 140000, reqTool: null },
    { name: 'قائد التحالف العالمي للتقنية', minLevel: 15, salary: 180000, reqTool: 'جهاز لاب توب متطور 💻' },
    { name: 'إمبراطور العالم وعرش تانجيرو', minLevel: 20, salary: 250000, reqTool: 'جهاز لاب توب متطور 💻' }
];

const VALID_COMMANDS = ['منيو', 'اوامر', 'أوامر', 'menu', 'تنصيب', 'مطعم', 'متجر', 'وظائف', 'عمل', 'مودات', 'تطبيق', 'مانجا', 'بنك', 'رصيدي', 'عصابة', 'سطو', 'شركة', 'مطور'];
const processedMsgs = new Set();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({ 
        auth: state, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false, 
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log('✅ Tanjiro Empire Ultimate Master Bot Online 🚀');
        else if (connection === 'close') startBot();
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            if (!msg || !msg.message || msg.key.fromMe) return;

            const msgId = msg.key.id;
            if (processedMsgs.has(msgId)) return;
            processedMsgs.add(msgId);
            if (processedMsgs.size > 200) processedMsgs.clear();

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            
            let rawText = (
                msg.message.conversation || 
                msg.message.extendedTextMessage?.text || 
                msg.message.buttonsResponseMessage?.selectedButtonId || ''
            ).trim().toLowerCase();

            let text = rawText.replace(/^\.|\s+/, '').trim();
            const pushName = msg.pushName || 'إمبراطور';

            let groupName = "الدردشة الخاصة";
            if (from.endsWith('@g.us')) {
                try {
                    let groupMeta = await sock.groupMetadata(from);
                    groupName = groupMeta.subject || "الجروب الملكي";
                } catch (e) { groupName = "الجروب الملكي"; }
            }

            if (!db.users[sender]) {
                db.users[sender] = { wallet: 1000, bank: 0, level: 1, exp: 0, energy: 100, job: null, tools: [], gang: null, company: null };
                saveDb();
            }
            let user = db.users[sender];

            // 🎯 المنيو الرئيسي مع الأزرار الثلاثة المحددة بدقة
            if (['منيو', 'اوامر', 'الاوامر', 'أوامر', 'menu'].some(cmd => text === cmd || text.includes(cmd))) {
                
                const menuText = `⛩️ أهلاً بك في إمبراطورية:\n` +
                                 `\`⛩️ 𝓣𝓐𝓝𝓙𝓘𝓡𝓞 - 𝓔𝓜𝓟𝓘𝓡𝓔 ⛩️\`\n\n` +
                                 `👥 *اسم الجروب:* ${groupName}\n` +
                                 `──────────────────────────\n` +
                                 `🎯 *عدد الأوامر:* 207+ أمر نشط\n` +
                                 `⏳ *حالة البوت:* مستقر مدى الحياة 🟢\n` +
                                 `👨‍💻 *المطور الأساسي:* Tanjiro Kamado 🥷🏻\n` +
                                 `👾 *المستخدم:* ${pushName}\n` +
                                 `──────────────────────────\n\n` +
                                 `📌 *أقسام الإمبراطورية العظمى:* \n` +
                                 `🍔 \`.مطعم\` ➔ الوجبات والمطعم\n` +
                                 `🛒 \`.متجر\` ➔ الأدوات والعتاد\n` +
                                 `💼 \`.وظائف\` ➔ قائمة الـ 35 وظيفة\n` +
                                 `🤝 \`.شركة\` ➔ نظام الشركاء والاستثمار\n` +
                                 `🥷 \`.عصابة\` ➔ العشائر والسطو المسلح\n` +
                                 `🎮 \`.مود [اسم]\` ➔ مودات ماينكرافت (MCPEDL/Curse)\n` +
                                 `📲 \`.تطبيق [اسم]\` ➔ تطبيقات وألعاب (أصلي/مهكر/مكرك)\n` +
                                 `⛩️ \`.مانجا [اسم]\` ➔ أحدث فصول 2026\n` +
                                 `💰 \`.بنك\` ➔ الخزنة والرصيد\n` +
                                 `──────────────────────────`;

                try {
                    let interactiveMsg = generateWAMessageFromContent(from, {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                interactiveMessage: proto.Message.InteractiveMessage.create({
                                    body: proto.Message.InteractiveMessage.Body.create({ text: menuText }),
                                    footer: proto.Message.InteractiveMessage.Footer.create({ text: "TANJIRO EMPIRE 2026" }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [
                                            { 
                                                name: "cta_url", 
                                                buttonParamsJson: JSON.stringify({ 
                                                    display_text: "📢 انتقال إلى القناة", 
                                                    url: "https://whatsapp.com/channel/0029VbDbntnHltYENvgnh81r", 
                                                    merchant_url: "https://whatsapp.com/channel/0029VbDbntnHltYENvgnh81r" 
                                                }) 
                                            },
                                            { 
                                                name: "quick_reply", 
                                                buttonParamsJson: JSON.stringify({ 
                                                    display_text: "👨‍💻 تواصل مع المطور", 
                                                    id: ".مطور" 
                                                }) 
                                            },
                                            { 
                                                name: "quick_reply", 
                                                buttonParamsJson: JSON.stringify({ 
                                                    display_text: "💼 قائمة الأوامر والوظائف", 
                                                    id: ".وظائف" 
                                                }) 
                                            }
                                        ]
                                    })
                                })
                            }
                        }
                    }, { quoted: msg });

                    await sock.relayMessage(from, interactiveMsg.message, { messageId: interactiveMsg.key.id });
                } catch (e) {
                    await sock.sendMessage(from, { text: menuText }, { quoted: msg });
                }
                return;
            }

            // 🍔 المطعم
            else if (text === 'مطعم') {
                let restText = `🍔 *[ مطعم الإمبراطورية الشامل ]*\n──────────────────────────\n`;
                RESTAURANT_MENU.forEach(i => { restText += `*${i.id}.${i.name}* ➔ \`${i.price}\` عملة\n📌 ${i.desc}\n──────────────────────────\n`; });
                restText += `💡 للشراء اكتب: \`.شراء [رقم الوجبة]\``;
                await sock.sendMessage(from, { text: restText }, { quoted: msg });
            }

            // 🛒 متجر الأدوات
            else if (text === 'متجر') {
                let shopText = `🛒 *[ متجر الأدوات المهنية ]*\n──────────────────────────\n`;
                SHOP_TOOLS.forEach(i => { shopText += `*${i.id}.${i.name}* ➔ \`${i.price}\` عملة\n📌 ${i.desc}\n──────────────────────────\n`; });
                shopText += `💡 للشراء اكتب: \`.شراء [رقم الأداة]\``;
                await sock.sendMessage(from, { text: shopText }, { quoted: msg });
            }

            // 🛍️ عمليات الشراء
            else if (text.startsWith('شراء')) {
                let idNum = text.replace(/[^0-9]/g, '');
                let item = [...RESTAURANT_MENU, ...SHOP_TOOLS].find(i => i.id === idNum);
                if (!item || user.wallet < item.price) {
                    await sock.sendMessage(from, { text: `❌ فشل الشراء، تأكد من الرقم ورصيدك.` }, { quoted: msg });
                    return;
                }
                user.wallet -= item.price;
                let note = '';
                if (item.energy) {
                    user.energy = Math.min(100, user.energy + item.energy);
                    if (item.name.includes('إندومي')) note = `\n\n⚠️ تحذير صحي: الإندومي مضرة جداً بالصحّة!`;
                    if (item.name.includes('مقاطعة')) note = `\n\n⚠️ تنبيه أخلاقي: دعم المقاطعة واجب وإثم كبير!`;
                } else if (item.type === 'tool') {
                    user.tools.push(item.name);
                    note = `\n\n🧰 تمت إضافة (${item.name}) إلى حقيبتك!`;
                }
                saveDb();
                await sock.sendMessage(from, { text: `🛍️ تم شراء (${item.name}) بنجاح! رصيدك المتبقي: \`${user.wallet}\`${note}` }, { quoted: msg });
            }

            // 💼 الـ 35 وظيفة
            else if (text === 'وظائف') {
                let jobText = `💼 *[ موسوعة الـ 35 وظيفة الإمبراطورية ]*\n──────────────────────────\n`;
                JOBS.forEach((j, index) => {
                    let req = j.reqTool ? ` 🛠️(${j.reqTool})` : '';
                    jobText += `${index + 1}. *${j.name}* ➔ راتب: \`${j.salary}\` (مستوى ${j.minLevel})${req}\n`;
                });
                jobText += `\n💡 اكتب \`.تقديم [اسم الوظيفة]\` للانضمام، و \`.عمل\` لقبض راتبك.`;
                await sock.sendMessage(from, { text: jobText }, { quoted: msg });
            }

            // 👨‍💻 المطور والتواصل بالرقم الجديد
            else if (text === 'مطور') {
                await sock.sendMessage(from, { text: `⚡ *[ تواصل مع مطور الإمبراطورية ]*\n\n👨‍💻 **Tanjiro Kamado** 🥷🏻\n📱 رقم التواصل الرسمي: \`+201093468758\`\n\nيسعدنا تواصلك لأي استفسار أو دعم فني!` }, { quoted: msg });
            }

            // 🎮 مودات ماينكرافت
            else if (text.startsWith('مود')) {
                let query = text.replace(/^(مود)\s*/, '').trim();
                let msgText = `🎮 *[ محرك مودات ماينكرافت ]*\n\n🔍 المود: *${query}*\n\n🟢 **MCPEDL:** https://mcpedl.com/?s=${encodeURIComponent(query)}\n🟠 **CurseForge:** https://www.curseforge.com/minecraft/search?search=${encodeURIComponent(query)}`;
                await sock.sendMessage(from, { text: msgText }, { quoted: msg });
            }

            // 📲 التطبيقات والألعاب
            else if (text.startsWith('تطبيق') || text.startsWith('لعبة')) {
                let query = text.replace(/^(تطبيق|لعبة)\s*/, '').trim();
                let msgText = `📲 *[ مركز التحميل المباشر 2026 ]*\n\n🎯 الطلب: *${query}*\n\n✨ **الأصلي:** https://apkpure.com/search?q=${encodeURIComponent(query)}\n⚡ **المهكر:** https://an1.com/search/?q=${encodeURIComponent(query)}\n🏴‍☠️ **المكرك:** https://rexdl.com/?s=${encodeURIComponent(query)}`;
                await sock.sendMessage(from, { text: msgText }, { quoted: msg });
            }

            // ⛩️ المانجا 2026
            else if (text.startsWith('مانجا')) {
                let query = text.replace(/^(مانجا)\s*/, '').trim();
                let msgText = `⛩️ *[ مانجا 2026 الحديثة ]*\n\n🔗 **MangaDex:** https://mangadex.org/search?q=${encodeURIComponent(query)}`;
                await sock.sendMessage(from, { text: msgText }, { quoted: msg });
            }

            // 💰 البنك والرصيد
            else if (text === 'بنك' || text === 'رصيدي') {
                let tools = user.tools.length > 0 ? user.tools.join(', ') : 'لا توجد أدوات';
                await sock.sendMessage(from, { text: `💳 *بطاقة حسابك الملكية:*\n💵 كاش: \`${user.wallet}\` | 🏦 بنك: \`${user.bank}\`\n⚡ طاقة: \`${user.energy}%\` | 📊 مستوى: \`Lvl ${user.level}\`\n🛠️ أدواتك: ${tools}` }, { quoted: msg });
            }

            // 🤖 التصحيح الإملائي الذكي
            else if (text.length > 2) {
                let match = stringSimilarity.findBestMatch(text, VALID_COMMANDS);
                if (match.bestMatch.rating < 0.4) {
                    let percent = Math.round(match.bestMatch.rating * 100);
                    await sock.sendMessage(from, { text: `⚠️ الأمر (*${rawText}*) غير موجود.\n\n🔍 هل تقصد: *${match.bestMatch.target}* (نسبة التشابه: ${percent}%)\n💡 اكتب \`.منيو\` لعرض القائمة.` }, { quoted: msg });
                }
            }

        } catch (error) { console.error(error); }
    });
}

startBot();
     
