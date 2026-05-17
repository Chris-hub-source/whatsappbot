const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Scannez ce QR Code :');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Le bot de l\'Agence de Voyage est prêt !');
});

client.on('message', async (msg) => {
    try {
        if (msg.from === 'status@broadcast') return; 

        const chat = await msg.getChat();
        
        if (!chat.isGroup) {
            const userMessage = msg.body.trim().toLowerCase();
            console.log(`Message de ${msg.from}: ${msg.body}`);

            // Message d'accueil principal et menu
            const mainMenu = `🌟 *Bienvenue chez God Willing Agency !* ✈️🌍\nVotre partenaire de confiance pour tous vos projets de voyage.\n\nComment pouvons-nous vous aider aujourd'hui ? Répondez avec le *chiffre* correspondant :\n\n*1.* 🎫 Achat de Billets d'avion\n*2.* 🛂 Demande de Visa\n*3.* 🪪 Carte de Séjour / Résidence\n*4.* 🏨 Réservation d'Hôtel\n*5.* 📞 Parler à un conseiller\n\n_Veuillez envoyer juste le numéro de votre choix (ex: 1)_`;

            setTimeout(async () => {
                try {
                    switch (userMessage) {
                        case '1':
                            await msg.reply(`🎫 *ACHAT DE BILLETS D'AVION*\n\nPour vous trouver le meilleur tarif, veuillez nous envoyer :\n- Votre ville de départ\n- Votre destination\n- Vos dates (Aller simple ou Aller-Retour)\n- Le nombre de passagers.\n\nUn agent va analyser les vols disponibles et vous recontacter d'ici peu !`);
                            break;
                            
                        case '2':
                            await msg.reply(`🛂 *ASSISTANCE VISA*\n\nNous vous accompagnons dans les démarches d'obtention de visa pour plusieurs destinations (Europe, Canada, USA, Asie, Afrique).\n\nPour quelle destination ou type de visa (Études, Tourisme, Travail) souhaitez-vous postuler ? Répondez brièvement et notre secrétaire prendra en charge votre dossier.`);
                            break;
                            
                        case '3':
                            await msg.reply(`🪪 *CARTE DE SÉJOUR & RÉSIDENCE*\n\nBesoin d'aide pour régulariser vos documents ou renouveler votre carte de séjour ?\n\nNous vous aidons à constituer un dossier solide et conforme. Laissez-nous un message expliquant votre situation actuelle et le pays concerné.`);
                            break;
                            
                        case '4':
                            await msg.reply(`🏨 *RÉSERVATION D'HÔTEL*\n\nNous trouvons des hébergements adaptés à votre budget partout dans le monde.\n\nVeuillez nous préciser :\n- La ville / destination\n- Le nombre de nuits\n- Le type de chambre (Simple, Double, Familiale)\n- Votre budget approximatif.`);
                            break;
                            
                        case '5':
                            await msg.reply(`📞 *CONSEILLER EN LIGNE*\n\nVotre demande a été transmise en priorité à notre équipe. Un conseiller va prendre le relais pour échanger directement avec vous. Merci de patienter un instant ! ✨`);
                            break;
                            
                        default:
                            // Si le client écrit autre chose ou dit juste "Bonjour", on lui renvoie le menu principal
                            await msg.reply(mainMenu);
                            break;
                    }
                    console.log(`Réponse envoyée à ${msg.from}`);
                } catch (replyError) {
                    console.error("Erreur envoi:", replyError.message);
                }
            }, 2000); 
        }
    } catch (globalError) {
        console.error("Erreur générale:", globalError.message);
    }
});

client.initialize();