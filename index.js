// index.js - Bot de Música 24/7 (Soporte para URL Directa y Comandos de Gestión)

// 1. IMPORTACIONES
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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

// ¡IMPORTANTE! El token se obtiene de las variables de entorno de Render.
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
    
    const queue = player.getQueue(message.guild.id);
    const voiceChannel = message.member?.voice.channel;
    
    // COMANDO !PLAY (o !p) - Reproduce un enlace directo a MP3 o un vídeo de YouTube
    if (['play', 'p'].includes(command)) {
        if (!voiceChannel) return message.reply("❌ ¡Debes estar en un canal de voz!");
        
        const query = args.join(' ');
        if (!query) return message.reply('Por favor, dime la URL de la música que quieres reproducir (URL directa o YouTube).');

        try {
            // Buscamos resultados (usamos QueryType.AUTO para aceptar URLs de la nube, YouTube o búsquedas)
            const result = await player.search(query, {
                requestedBy: message.member,
                searchEngine: QueryType.AUTO // Analiza si es URL, búsqueda o YouTube
            });

            if (!result.tracks.length) return message.reply('❌ No se encontraron resultados.');

            const track = result.tracks[0];

            await player.play(voiceChannel, track, {
                metadata: { channel: message.channel, client: message.client },
                immediate: false
            });

            message.channel.send(`🎵 **Añadida a la cola:** **${track.title}** - Duración: ${track.duration}`);

        } catch (error) {
            console.error(error);
            message.channel.send(`❌ Error al intentar reproducir: ${error.message}`);
        }
    }

    // COMANDO !LISTA (Requisito 2)
    if (['queue', 'lista'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay nada reproduciéndose.');
        
        const tracks = queue.tracks.map((track, i) => 
            `${i + 1}. **${track.title}** (${track.duration}) - Solicitado por: ${track.requestedBy.displayName}`
        ).slice(0, 10); // Mostrar solo las primeras 10

        const embed = new EmbedBuilder()
            .setTitle('🎶 Cola de Reproducción')
            .setDescription(tracks.join('\n') || '¡La cola está vacía!')
            .setFooter({ text: `Reproduciendo ahora: ${queue.current.title}` })
            .setColor(0x0099ff);

        message.channel.send({ embeds: [embed] });
    }

    // COMANDO !PAUSA (Requisito 5)
    if (['pause', 'pausa'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay nada reproduciéndose para pausar.');
        queue.pause();
        message.channel.send('⏸️ **Música pausada.** Usa `!reanudar` para continuar.');
    }

    // COMANDO !REANUDAR (Requisito 5)
    if (['resume', 'reanudar'].includes(command)) {
        if (!queue || queue.playing) return message.reply('❌ La música ya está reproduciéndose.');
        queue.resume();
        message.channel.send('▶️ **Música reanudada.**');
    }

    // COMANDO !STOP (Requisito 5)
    if (['stop', 'parar'].includes(command)) {
        if (!queue) return message.reply('❌ No hay nada en la cola para detener.');
        queue.destroy();
        message.channel.send('⏹️ **Cola vaciada y bot desconectado.**');
    }

    // COMANDO !AVANZAR (seek) (Requisito 5)
    if (['seek', 'avanzar'].includes(command)) {
        if (!queue || !queue.playing) return message.reply('❌ No hay música para avanzar.');
        const timeInSeconds = parseInt(args[0]);
        if (isNaN(timeInSeconds) || timeInSeconds < 0) return message.reply('❌ Por favor, especifica el tiempo en segundos (ej: `!avanzar 60` para avanzar 1 minuto).');
        
        queue.seek(timeInSeconds * 1000); // discord-player usa milisegundos
        message.channel.send(`⏩ **Avanzado a ${timeInSeconds} segundos.**`);
    }
});


// 5. LOGIN
client.login(DISCORD_TOKEN).catch(e => {
    console.error("❌ ERROR DE CONEXIÓN. Asegúrate de haber configurado la variable de entorno DISCORD_TOKEN en Render.");
    console.error(e);
});
