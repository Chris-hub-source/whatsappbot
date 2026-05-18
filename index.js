const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// Liste des clients gérés par la secrétaire
const discussionsActives = new Set();
// Suivi des étapes des clients
const etapesClients = new Map();

// ⚠️ METS ICI LE NUMÉRO DE TÉLÉPHONE DE LA SECRÉTAIRE (avec l'indicatif pays, ex: '22890XXXXXX')
// Laisse-le vide '' si la secrétaire utilise le MÊME compte WhatsApp que le Bot.
const NUMERO_SECRETAIRE = ''; 

client.on('qr', (qr) => {
    console.log('Scannez ce QR Code :');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot Agence CORRIGÉ et prêt !');
});

// ÉCOUTE DES MESSAGES REÇUS ET ENVOYÉS
client.on('message_create', async (msg) => {
    try {
        if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return;

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const text = msg.body.trim().toLowerCase();

        // 1. GESTION DES COMMANDES DE DÉBRAYAGE (Par la secrétaire)
        // Si le message vient du numéro de la secrétaire OU s'il est envoyé depuis le compte du bot lui-même par un humain
        const estUnMessageHumainDeLAgence = msg.fromMe ? (msg.hasMedia === false && !text.includes("bienvenue chez god willing")) : (msg.from.includes(NUMERO_SECRETAIRE) && NUMERO_SECRETAIRE !== '');

        if (estUnMessageHumainDeLAgence) {
            const clientId = msg.fromMe ? msg.to : msg.from;

            // Commande pour réactiver le bot
            if (text === '*fin*') {
                discussionsActives.delete(clientId);
                etapesClients.delete(clientId);
                await client.sendMessage(clientId, `🔄 *Système* : Le bot est réactivé.`);
                console.log(`Bot réactivé pour le client ${clientId}`);
                return;
            }

            // Si la secrétaire écrit un vrai message (pas le bot), on coupe le bot pour ce client
            if (!discussionsActives.has(clientId)) {
                discussionsActives.add(clientId);
                console.log(`La secrétaire a pris la main manuellement sur le client ${clientId}. Le bot s'efface.`);
            }
            return; // On arrête là pour les messages de l'agence
        }

        // 2. GESTION DES MESSAGES DES CLIENTS (Uniquement si msg ne vient pas de nous)
        if (!msg.fromMe) {
            const clientId = msg.from;

            // Si le client est géré par l'humain, on ignore
            if (discussionsActives.has(clientId)) {
                console.log(`Message de ${clientId} ignoré (géré par la secrétaire)`);
                return;
            }

            // Menu principal
            const mainMenu = `🌟 *Bienvenue chez God Willing Agency !* ✈️🌍\nVotre partenaire de confiance pour vos voyages.\n\nComment pouvons-nous vous aider aujourd'hui ? Répondez avec le *chiffre* correspondant :\n\n*1.* 🎫 Achat de Billets d'avion\n*2.* 🛂 Demande de Visa\n*3.* 🪪 Carte de Séjour / Résidence\n*4.* 🏨 Réservation d'Hôtel\n\n_Veuillez envoyer juste le numéro de votre choix (ex: 1)_`;

            // On attend un court instant avant de répondre pour simuler un humain
            setTimeout(async () => {
                try {
                    // Si le client est déjà dans un processus
                    if (etapesClients.has(clientId)) {
                        const session = etapesClients.get(clientId);

                        if (session.service === 'billet') {
                            if (session.etape === 1) {
                                await msg.reply(`Merci. Souhaitez-vous un :\n\n*A.* Billet confirmé (Billet réel et payé, obligatoire pour voyager)\n*B.* Billet non confirmé (Réservation temporaire souvent demandée pour les dossiers de visa)\n\n_Veuillez répondre par *A* ou *B*._`);
                                etapesClients.set(clientId, { service: 'billet', etape: 2 });
                            } else if (session.etape === 2) {
                                await msg.reply(`Bien reçu ! Vos choix ont été transmis. Notre secrétaire prend le relais sur ce chat pour finaliser votre achat d'avion. Veuillez patienter... ✨`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        if (session.service === 'visa') {
                            if (session.etape === 1) {
                                await msg.reply(`Parfait ! Pour cette destination, voici les documents à fournir pour l'instant :\n- 📑 Passeport scanné (en couleur et bien lisible)\n- 📸 Photo passeport\n\nNotre secrétaire vient de recevoir votre demande et va prendre le relais. Vous pouvez déjà envoyer vos fichiers ici.`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        if (session.service === 'sejour') {
                            if (session.etape === 1) {
                                await msg.reply(`Merci pour cette précision. Veuillez maintenant nous fournir :\n- 📸 Une photo passeport\n- 📑 Un scan bien lisible de votre passeport\n\nVotre demande est enregistrée. La secrétaire prend le relais pour analyser vos pièces.`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        if (session.service === 'hotel') {
                            if (session.etape === 1) {
                                await msg.reply(`🔑 Très bien. Quelles sont vos dates prévues pour le séjour (Date d'arrivée et date de départ) ?`);
                                etapesClients.set(clientId, { service: 'hotel', etape: 2 });
                            } else if (session.etape === 2) {
                                await msg.reply(`C'est noté ! Nous recherchons les meilleures options d'hôtels disponibles pour vos dates. La secrétaire prend le relais pour vous faire des propositions.`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                    } else {
                        // Choix initial du menu
                        switch (text) {
                            case '1':
                                await msg.reply(`🎫 *ACHAT DE BILLETS D'AVION*\n\nQuelle est votre destination de voyage ?`);
                                etapesClients.set(clientId, { service: 'billet', etape: 1 });
                                break;
                            case '2':
                                await msg.reply(`🛂 *DEMANDE DE VISA*\n\nPour quel pays (destination) souhaitez-vous demander le visa ?`);
                                etapesClients.set(clientId, { service: 'visa', etape: 1 });
                                break;
                            case '3':
                                await msg.reply(`🪪 *CARTE DE SÉJOUR & RÉSIDENCE*\n\nS'agit-il de votre :\n*1.* Première demande\n*2.* Renouvellement\n\n_Répondez par 1 ou 2_`);
                                etapesClients.set(clientId, { service: 'sejour', etape: 1 });
                                break;
                            case '4':
                                await msg.reply(`🏨 *RÉSERVATION D'HÔTEL*\n\nDans quel pays ou ville souhaitez-vous réserver votre hôtel ?`);
                                etapesClients.set(clientId, { service: 'hotel', etape: 1 });
                                break;
                            default:
                                await msg.reply(mainMenu);
                                break;
                        }
                    }
                } catch (err) {
                    console.error("Erreur envoi réponse:", err.message);
                }
            }, 2000);
        }
    } catch (globalError) {
        console.error("Erreur boucle principale:", globalError.message);
    }
});

client.initialize();