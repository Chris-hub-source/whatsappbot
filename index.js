const { Client, LocalAuth } = require('whatsapp-web.js');
const qrImage = require('qr-image');
const http = require('http');

const estWindows = process.platform === 'win32';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        // Si Windows, on laisse Puppeteer gérer. Si Railway, on utilise le Chromium Linux.
        executablePath: estWindows ? undefined : (process.env.CHROMIUM_PATH || '/usr/bin/chromium'),
        args: estWindows ? [] : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
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

// Variable pour stocker temporairement le texte du QR code
let dernierQR = null;

// Création d'un mini serveur web pour afficher le QR Code sous forme d'image PNG nette
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    if (dernierQR) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        const qrSvg = qrImage.image(dernierQR, { type: 'png' });
        qrSvg.pipe(res);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Le QR Code n\'est pas encore généré ou le bot est déjà connecté avec succès.</h1>');
    }
}).listen(port, () => {
    console.log(`Serveur web d'affichage QR Code démarré sur le port ${port}`);
});

// Événement de réception du QR Code
client.on('qr', (qr) => {
    dernierQR = qr; // On sauvegarde le token du QR code
    console.log('--- NOUVEAU QR CODE DISPONIBLE ! Ouvrez le lien généré par Railway pour le scanner ---');
});

client.on('ready', () => {
    dernierQR = null; // On efface le QR code une fois la connexion établie
    console.log('Bot Agence prêt !'); 
});

// ÉCOUTE DES MESSAGES REÇUS ET ENVOYÉS
client.on('message_create', async (msg) => {
    try {
        if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return;

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const text = msg.body.trim().toLowerCase();

        // 1. GESTION DES COMMANDES DE DÉBRAYAGE (Par la secrétaire ou l'agence)
        const estUnMessageHumainDeLAgence = msg.fromMe 
            ? (msg.hasMedia === false && !text.includes("bienvenue chez god willing")) 
            : (msg.from.includes(NUMERO_SECRETAIRE) && NUMERO_SECRETAIRE !== '');

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

            // Si l'humain écrit, on coupe le bot automatiquement pour ce client
            if (!discussionsActives.has(clientId)) {
                discussionsActives.add(clientId);
                console.log(`La secrétaire a pris la main manuellement sur le client ${clientId}. Le bot s'efface.`);
            }
            return;
        }

        // 2. GESTION DES MESSAGES DES CLIENTS
        if (!msg.fromMe) {
            const clientId = msg.from;

            // Si le client est en cours de gestion par la secrétaire, le bot ignore
            if (discussionsActives.has(clientId)) {
                console.log(`Message de ${clientId} ignoré (géré par la secrétaire)`);
                return;
            }

            const mainMenu = `🌟 *Bienvenue chez God Willing Agency !* ✈️🌍\nVotre partenaire de confiance pour vos voyages.\n\nComment pouvons-nous vous aider aujourd'hui ? Répondez avec le *chiffre* correspondant :\n\n*1.* 🎫 Achat de Billets d'avion\n*2.* 🛂 Demande de Visa\n*3.* 🪪 Carte de Séjour / Résidence\n*4.* 🏨 Réservation d'Hôtel\n\n_Veuillez envoyer juste le numéro de votre choix (ex: 1)_`;

            // Simulation d'un délai humain (2 secondes)
            setTimeout(async () => {
                try {
                    // Si le client suit déjà un tunnel/formulaire
                    if (etapesClients.has(clientId)) {
                        const session = etapesClients.get(clientId);

                        // --- SERVICE BILLET D'AVION ---
                        if (session.service === 'billet') {
                            if (session.etape === 1) {
                                await msg.reply(`Merci. Souhaitez-vous un :\n\n*A.* Billet confirmé (Billet réel et payé, obligatoire pour voyager)\n*B.* Billet non confirmé (Réservation temporaire souvent demandée pour les dossiers de visa)\n\n_Veuillez répondre par *A* ou *B*._`);
                                etapesClients.set(clientId, { service: 'billet', etape: 2 });
                            } else if (session.etape === 2) {
                                await msg.reply(`Bien reçu ! Vos choix ont été transmis. Notre secrétaire prend le relais sur ce chat pour finaliser votre achat de billet. Veuillez patienter... ✨`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        // --- SERVICE DEMANDE DE VISA ---
                        if (session.service === 'visa') {
                            if (session.etape === 1) {
                                await msg.reply(`Parfait ! Pour cette destination, voici les documents à fournir pour l'instant :\n- 📑 Passeport scanné (en couleur et bien lisible)\n- 📸 Photo passeport\n\nNotre secrétaire vient de recevoir votre demande et va prendre le relais. Vous pouvez déjà envoyer vos fichiers ici.`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        // --- SERVICE CARTE DE SÉJOUR ---
                        if (session.service === 'sejour') {
                            if (session.etape === 1) {
                                await msg.reply(`Merci pour cette précision. Veuillez maintenant nous fournir :\n- 📸 Une photo passeport\n- 📑 Un scan bien lisible de votre passeport\n\nVotre demande est enregistrée. La secrétaire prend le relais pour analyser vos pièces.`);
                                discussionsActives.add(clientId);
                                etapesClients.delete(clientId);
                            }
                            return;
                        }

                        // --- SERVICE RÉSERVATION HÔTEL ---
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
                        // --- CHOIX INITIAL DU MENU PRINCIPAL ---
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
                    console.error("Erreur lors de la réponse automatique:", err.message);
                }
            }, 2000);
        }
    } catch (globalError) {
        console.error("Erreur dans la boucle principale du message:", globalError.message);
    }
});

client.initialize();