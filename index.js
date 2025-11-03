// index.js - Bot de Música 24/7 (CÓDIGO FINAL CORREGIDO)

// 1. IMPORTACIONES
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
// Importamos Player y QueryType desde 'discord-player'
const { Player, QueryType } = require('discord-player');

// 2. CONFIGURACIÓN E INICIALIZACIÓN
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inicialización de Player
const player = new Player(client, {
    ytdlOptions: {
        quality: "highestaudio",
        filter: "audioonly",
    }
});

// El token se obtiene de la variable de entorno de Render (DISCORD_TOKEN)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;


// 3. EVENTO READY (Conexión)
client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});


// 4. LÓGICA DE COMANDOS
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;
    
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    
    // CORRECCIÓN CLAVE: Usamos player.queues.get en lugar de player.getQueue
    const queue = player.queues.get(message.guild.id);
    const voiceChannel = message.member?.voice.channel;
    
    // COMANDO !PLAY (o !p) - Reproduce un enlace
    if (['play', 'p'].includes(command)) {
        if (!voiceChannel) return message.reply("❌ ¡Debes estar en un canal de voz!");
        
        const query = args.join(' ');
        if (!query) return message.reply('Por favor, dime la URL de la música que quieres reproducir.');

        try {
            const result = await player.search(query, {
                requestedBy: message.member,
                searchEngine: QueryType.AUTO
            });

            if (!result.tracks.length) return message.reply('❌ No se encontraron resultados.');

            const track = result.tracks[0];

            // CORRECCIÓN CLAVE: Usar el nuevo método de conexión/reproducción
            const newQueue = player.queues.create(message.guild.id, {
                metadata: { channel: message.channel, client: message.client },
                volume: 50
            });

            // Conectar al canal de voz si no está conectado
            if (!newQueue.connection) {
                await newQueue.connect(voiceChannel);
            }

            // Reproducir la pista
            await newQueue.play(track);


            message.channel.send(`🎵 **Añadida a la cola:** **${track.title}** - Duración: ${track.duration}`);

        } catch (error) {
            console.error(error);
            message.channel.send(`❌ Error al intentar reproducir: ${error.message}. Asegúrate que la URL es un MP3 directo o YouTube.`);
        }
    }

    // COMANDO !LISTA (Funciona con el objeto 'queue' corregido)
    if (['queue', 'lista'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay nada reproduciéndose.');
        
        const tracks = queue.tracks.map((track, i) => 
            `${i + 1}. **${track.title}** (${track.duration}) - Solicitado por: ${track.requestedBy.displayName}`
        ).slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🎶 Cola de Reproducción')
            .setDescription(tracks.join('\n') || '¡La cola está vacía!')
            .setFooter({ text: `Reproduciendo ahora: ${queue.currentTrack.title}` })
            .setColor(0x0099ff);

        message.channel.send({ embeds: [embed] });
    }

    // COMANDO !PAUSA (Funciona con el objeto 'queue' corregido)
    if (['pause', 'pausa'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay nada reproduciéndose para pausar.');
        queue.pause();
        message.channel.send('⏸️ **Música pausada.** Usa `!reanudar` para continuar.');
    }

    // COMANDO !REANUDAR (Funciona con el objeto 'queue' corregido)
    if (['resume', 'reanudar'].includes(command)) {
        if (!queue || queue.playing) return message.reply('❌ La música ya está reproduciéndose.');
        queue.resume();
        message.channel.send('▶️ **Música reanudada.**');
    }

    // COMANDO !STOP (Funciona con el objeto 'queue' corregido)
    if (['stop', 'parar'].includes(command)) {
        if (!queue) return message.reply('❌ No hay nada en la cola para detener.');
        queue.destroy();
        message.channel.send('⏹️ **Cola vaciada y bot desconectado.**');
    }

    // COMANDO !AVANZAR (seek) (Funciona con el objeto 'queue' corregido)
    if (['seek', 'avanzar'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay música para avanzar.');
        const timeInSeconds = parseInt(args[0]);
        if (isNaN(timeInSeconds) || timeInSeconds < 0) return message.reply('❌ Por favor, especifica el tiempo en segundos (ej: `!avanzar 60` para avanzar 1 minuto).');
        
        queue.seek(timeInSeconds * 1000); 
        message.channel.send(`⏩ **Avanzado a ${timeInSeconds} segundos.**`);
    }
});


// 5. LOGIN
client.login(DISCORD_TOKEN).catch(e => {
    console.error("❌ ERROR DE CONEXIÓN. Asegúrate de haber configurado la variable de entorno DISCORD_TOKEN en Render.");
    console.error(e);
});
