const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// C o d e d   B y   B a y r d Y
let gameState = 'LOBBY'; 
let hostId = null;
let players = new Map(); 
let rolesConfig = { vampir: 1, gozcu: 0, doktor: 0, jester: 0, escort: 0 };

let nightActions = {
    gozcuActions: new Map(),
    doktorActions: new Map(),
    escortActions: new Map(),
    vampireNominee: null, 
    vampireLocks: new Set(),
    vampireTarget: null 
};

// C0ded By BayrdY 
let nightResults = ''; 
let dayVotes = new Map(); 

let controlMessageId = null;
let votingMessageId = null;
let vampireMessageId = null; 

async function applyDeadRestrictions(member) {
    try {
        await member.voice.setMute(true, 'Öldü').catch(()=>{});
        const gameVoice = await client.channels.fetch(config.voiceChannelId);
        await gameVoice.permissionOverwrites.edit(member.id, {
            SendMessages: false,
            Speak: false
        }).catch(()=>{});
    } catch(e) {}
}

async function refreshPlayersInVoice() {
    try {
        const voiceChannel = await client.channels.fetch(config.voiceChannelId);
        if (voiceChannel && voiceChannel.isVoiceBased()) {
            const currentIds = new Set(voiceChannel.members.keys());
            voiceChannel.members.forEach(member => {
                if (!players.has(member.id)) {
                    const isMidGame = gameState !== 'LOBBY';
                    players.set(member.id, { member: member, role: 'Köylü', isDead: isMidGame });
                    if (isMidGame) applyDeadRestrictions(member);
                }
            });
            if (gameState === 'LOBBY') {
                for (const id of players.keys()) {
                    if (!currentIds.has(id)) players.delete(id);
                }
            }
        }
    } catch (e) {}
}

client.on('ready', async () => {
    // C0ded B y  BayrdY
    client.user.setPresence({ activities: [{ name: 'Coded By BayrdY', type: ActivityType.Playing }], status: 'online' });
    await refreshPlayersInVoice();
    await updateControlPanel();
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const gameVoiceId = config.voiceChannelId;
    
    if (oldState.channelId !== gameVoiceId && newState.channelId === gameVoiceId) {
        // C_o_d_e_d_By B_a_y_r_d_Y
        const isMidGame = gameState !== 'LOBBY';
        if (!players.has(newState.member.id)) {
            players.set(newState.member.id, { member: newState.member, role: 'Köylü', isDead: isMidGame });
            if (isMidGame) applyDeadRestrictions(newState.member);
        } else if (players.get(newState.member.id).isDead) {
            applyDeadRestrictions(newState.member);
        } else if (gameState === 'NIGHT') {
            try { await newState.member.voice.setMute(true, 'Gece Oldu').catch(()=>{}); } catch(e){}
        }
        await updateControlPanel();
    } else if (oldState.channelId === gameVoiceId && newState.channelId !== gameVoiceId) {
        if (gameState === 'LOBBY') {
            players.delete(oldState.member.id);
            if (oldState.member.id === hostId) hostId = null; 
            await updateControlPanel();
        } else {
            // Coded_By_BayrdY
            if (players.has(oldState.member.id)) {
                players.get(oldState.member.id).isDead = true;
            }
            try { await oldState.member.edit({ mute: false }).catch(() => {}); } catch(e){}
            await updateControlPanel();
        }
    }
});

async function updateControlPanel() {
    try {
        const controlChannel = await client.channels.fetch(config.controlChannelId);
        if (!controlChannel) return;

        let embed = new EmbedBuilder().setColor('#2b2d31').setTimestamp();
        let components = [];

        if (gameState === 'LOBBY') {
            embed.setTitle('🦇 Vampir Köylü - Lobi');
            embed.setDescription(`Şu an kanalda ${players.size} kişi var.\nOyunu başlatmak için birinin Host olması gerekiyor.`);
            embed.setFooter({ text: 'Lobi - Coded By BayrdY' });
            
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('become_host').setLabel('Host Ol & Oyunu Kur').setStyle(ButtonStyle.Primary)
            ));
        } 
        else if (gameState === 'ROLE_SELECTION') {
            const hostMember = players.get(hostId)?.member;
            const hostName = hostMember ? hostMember.displayName : 'Bilinmeyen';
            embed.setTitle('⚙️ Rol Ayarları');
            embed.setFooter({ text: 'Rol Ayarları - Coded By BayrdY' });
            
            let totalSpecial = rolesConfig.vampir + rolesConfig.gozcu + rolesConfig.doktor + rolesConfig.jester + rolesConfig.escort;
            let villagers = (players.size - 1) - totalSpecial; 
            
            embed.setDescription(`**Host:** ${hostName}\n\n**Oyuncu Sayısı (Host Hariç):** ${players.size - 1}\n\n` +
                `**Vampir:** ${rolesConfig.vampir}\n**Gözcü:** ${rolesConfig.gozcu}\n**Doktor:** ${rolesConfig.doktor}\n**Jester:** ${rolesConfig.jester}\n**Escort:** ${rolesConfig.escort}\n` +
                `**Köylü (Masum):** ${Math.max(0, villagers)}\n\n`);

            // C o d e d_By_BayrdY
            components.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('set_vampir').setPlaceholder(`Vampir Sayısı (${rolesConfig.vampir})`)
                        .addOptions([...Array(6).keys()].map(i => ({ label: `${i} Vampir`, value: `${i}` })))
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('set_gozcu').setPlaceholder(`Gözcü Sayısı (${rolesConfig.gozcu})`)
                        .addOptions([...Array(3).keys()].map(i => ({ label: `${i} Gözcü`, value: `${i}` })))
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('set_doktor').setPlaceholder(`Doktor Sayısı (${rolesConfig.doktor})`)
                        .addOptions([...Array(3).keys()].map(i => ({ label: `${i} Doktor`, value: `${i}` })))
                ),
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('set_escort').setPlaceholder(`Escort Sayısı (${rolesConfig.escort})`)
                        .addOptions([...Array(3).keys()].map(i => ({ label: `${i} Escort`, value: `${i}` })))
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('start_game').setLabel('Oyunu Başlat').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cancel_game').setLabel('İptal Et').setStyle(ButtonStyle.Danger)
                )
            );
        }
        else {
            embed.setTitle(`🎮 Oyun Devam Ediyor - ${gameState === 'NIGHT' ? '🌙 Gece' : (gameState === 'DAY' ? '☀️ Gündüz' : '⚖️ Oylama')}`);
            embed.setFooter({ text: 'Denetim Paneli - Coded By BayrdY' });
            
            let statusText = `**Host:** <@${hostId}>\n\n**Oyuncular:**\n`;
            players.forEach((p, id) => {
                if (id === hostId) return;
                let deadText = p.isDead ? ' 💀 (ÖLÜ)' : '';
                statusText += `- ${p.member.displayName} [${p.role}]${deadText}\n`;
            });
            
            if (gameState === 'NIGHT') {
                statusText += `\n**Gece Seçimleri (Bekleniyor):**\n`;
                let eNames = []; nightActions.escortActions.forEach(tid => eNames.push(players.get(tid)?.member.displayName));
                let gNames = []; nightActions.gozcuActions.forEach(tid => gNames.push(players.get(tid)?.member.displayName));
                let dNames = []; nightActions.doktorActions.forEach(tid => dNames.push(players.get(tid)?.member.displayName));
                const vName = nightActions.vampireTarget ? players.get(nightActions.vampireTarget)?.member.displayName : 'Bekleniyor...';
                
                statusText += `Escortlar: ${eNames.length > 0 ? eNames.join(', ') : 'Bekleniyor'}\n`;
                statusText += `Gözcüler: ${gNames.length > 0 ? gNames.join(', ') : 'Bekleniyor'}\n`;
                statusText += `Doktorlar: ${dNames.length > 0 ? dNames.join(', ') : 'Bekleniyor'}\n`;
                statusText += `Vampirler: ${vName}\n`;
            }
            
            if (gameState === 'DAY' && nightResults !== '') {
                statusText += `\n**Gece Sonuçları:**\n${nightResults}\n`;
            }

            if (gameState === 'VOTING') {
                statusText += `\n**Oylama Durumu:**\n`;
                const voteCounts = new Map();
                let pasCount = 0;
                dayVotes.forEach(target => {
                    if(target === 'pas') pasCount++;
                    else voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
                });
                voteCounts.forEach((c, tId) => {
                    statusText += `${players.get(tId)?.member.displayName}: ${c} oy\n`;
                });
                statusText += `Pas Geçenler: ${pasCount}\n`;
            }

            embed.setDescription(statusText);

            // C0d3d By B4yrdY
            const row1 = new ActionRowBuilder();
            if (gameState === 'DAY') {
                row1.addComponents(
                    new ButtonBuilder().setCustomId('start_vote').setLabel('Oylama Başlat').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('make_night').setLabel('Gece Yap (Yeni Tur)').setStyle(ButtonStyle.Secondary)
                );
            } else if (gameState === 'VOTING') {
                row1.addComponents(
                    new ButtonBuilder().setCustomId('end_vote').setLabel('Oylama Bitir').setStyle(ButtonStyle.Danger)
                );
            } else if (gameState === 'NIGHT') {
                row1.addComponents(
                    new ButtonBuilder().setCustomId('make_day').setLabel('Gündüz Yap (Geceyi Çöz)').setStyle(ButtonStyle.Success)
                );
            }
            row1.addComponents(new ButtonBuilder().setCustomId('end_game').setLabel('Oyunu Bitir').setStyle(ButtonStyle.Danger));

            let aliveOptions = [];
            players.forEach((p, id) => {
                if (id !== hostId && !p.isDead) aliveOptions.push({ label: p.member.displayName, value: id });
            });
            if (aliveOptions.length === 0) aliveOptions.push({ label: 'Kimse Yok', value: 'none' });
            
            const row2 = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('mark_dead').setPlaceholder('Öldürülen Oyuncuları Seç (Susturulacaklar)')
                    .setMinValues(1).setMaxValues(aliveOptions.length === 1 && aliveOptions[0].value === 'none' ? 1 : aliveOptions.length)
                    .setOptions(aliveOptions)
                    .setDisabled(aliveOptions.length === 1 && aliveOptions[0].value === 'none')
            );

            components.push(row1, row2);
        }

        if (controlMessageId) {
            try {
                const msg = await controlChannel.messages.fetch(controlMessageId);
                await msg.edit({ embeds: [embed], components });
                return;
            } catch (e) {
                controlMessageId = null;
            }
        }
        
        const messages = await controlChannel.messages.fetch({ limit: 10 });
        for (const msg of messages.values()) {
            if (msg.author.id === client.user.id) await msg.delete().catch(()=>null);
        }

        const newMsg = await controlChannel.send({ embeds: [embed], components });
        controlMessageId = newMsg.id;

    } catch (e) {}
}

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        
        // Co_ded By Bay_rdY
        if (interaction.customId === 'become_host') {
            await refreshPlayersInVoice();
            if (!players.has(interaction.user.id)) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder().setDescription('Ses kanalında değilsiniz!').setColor('#ff0000').setFooter({ text: 'Hata - Coded By BayrdY' })], 
                    ephemeral: true 
                });
            }
            hostId = interaction.user.id;
            gameState = 'ROLE_SELECTION';
            await interaction.deferUpdate();
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'cancel_game') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host iptal edebilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            hostId = null;
            gameState = 'LOBBY';
            await interaction.deferUpdate();
            await updateControlPanel();
            return;
        }

        if (interaction.customId.startsWith('set_')) {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host ayar yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            const val = parseInt(interaction.values[0]);
            if (interaction.customId === 'set_vampir') rolesConfig.vampir = val;
            if (interaction.customId === 'set_gozcu') rolesConfig.gozcu = val;
            if (interaction.customId === 'set_doktor') rolesConfig.doktor = val;
            if (interaction.customId === 'set_escort') rolesConfig.escort = val;
            await interaction.deferUpdate();
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'start_game') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host başlatabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            const totalRequired = rolesConfig.vampir + rolesConfig.gozcu + rolesConfig.doktor + rolesConfig.escort;
            if (players.size - 1 < totalRequired) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Yeterli oyuncu yok! Özel rollerin toplamı ${totalRequired}, ama kanalda (host hariç) ${players.size - 1} kişi var.`).setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            }
            await interaction.deferUpdate();
            await startGame();
            return;
        }

        if (interaction.customId === 'make_night') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            gameState = 'NIGHT';
            nightActions = { gozcuActions: new Map(), doktorActions: new Map(), escortActions: new Map(), vampireNominee: null, vampireLocks: new Set(), vampireTarget: null };
            nightResults = '';
            await interaction.deferUpdate();
            await startNightPhase();
            return;
        }

        if (interaction.customId === 'make_day') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            await resolveNightPhase();
            gameState = 'DAY';
            
            players.forEach(async (p, id) => {
                if (id !== hostId && !p.isDead) {
                    try { await p.member.voice.setMute(false, 'Gündüz Oldu').catch(()=>{}); } catch(e){}
                }
            });

            await interaction.deferUpdate();
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'start_vote') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            gameState = 'VOTING';
            dayVotes.clear();
            await interaction.deferUpdate();
            await createVotingMessage();
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'end_vote') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            gameState = 'DAY';
            await interaction.deferUpdate();
            await finishVoting();
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'end_game') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            await interaction.deferUpdate();
            await endGame();
            return;
        }

        if (interaction.customId === 'mark_dead') {
            if (interaction.user.id !== hostId) return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Sadece host yapabilir.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            if (interaction.values[0] === 'none') return interaction.deferUpdate();
            
            await interaction.deferReply({ ephemeral: true });
            for (const id of interaction.values) {
                const p = players.get(id);
                if (p) {
                    p.isDead = true;
                    await applyDeadRestrictions(p.member);
                }
            }
            await updateControlPanel();
            await interaction.editReply({ embeds: [new EmbedBuilder().setDescription('Seçilen kişiler öldü olarak işaretlendi, susturuldu ve kanala yazmaları engellendi.').setColor('#00ff00').setFooter({ text: 'Coded By BayrdY' })] });
            return;
        }

        // C o d e_d B y_B a y r_d Y
        if (interaction.customId === 'escort_select') {
            nightActions.escortActions.set(interaction.user.id, interaction.values[0]);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Seçimin kaydedildi! Sabah olduğunda engellemenin işe yarayıp yaramadığını göreceğiz.`).setColor('#00ff00').setFooter({ text: 'Gece - Coded By BayrdY' })], ephemeral: true });
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'gozcu_select') {
            nightActions.gozcuActions.set(interaction.user.id, interaction.values[0]);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Seçimin kaydedildi! Sabah olduğunda hedefine ulaşıp ulaşmadığını öğreneceksin.`).setColor('#00ff00').setFooter({ text: 'Gece - Coded By BayrdY' })], ephemeral: true });
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'doktor_select') {
            nightActions.doktorActions.set(interaction.user.id, interaction.values[0]);
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Seçimin kaydedildi! Sabah olduğunda hedefini başarıyla koruyup koruyamadığını göreceğiz.`).setColor('#00ff00').setFooter({ text: 'Gece - Coded By BayrdY' })], ephemeral: true });
            await updateControlPanel();
            return;
        }

        if (interaction.customId === 'vampire_vote') {
            const targetId = interaction.values[0];
            
            if (nightActions.vampireNominee === targetId) {
                nightActions.vampireLocks.add(interaction.user.id);
            } else {
                nightActions.vampireNominee = targetId;
                nightActions.vampireLocks.clear();
                nightActions.vampireLocks.add(interaction.user.id); 
            }
            
            nightActions.vampireTarget = null;
            
            let aliveVampires = 0;
            players.forEach(p => {
                if (p.role === 'Vampir' && !p.isDead) aliveVampires++;
            });

            if (nightActions.vampireLocks.size === aliveVampires && aliveVampires > 0) {
                nightActions.vampireTarget = nightActions.vampireNominee;
                await updateControlPanel();
            }

            await updateVampireMessage();
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`Seçiminiz işlendi.`).setColor('#00ff00').setFooter({ text: 'Vampir - Coded By BayrdY' })], ephemeral: true });
            return;
        }

        if (interaction.customId === 'vampire_lock') {
            if (!nightActions.vampireNominee) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Önce menüden bir kurban adayı seçmelisiniz!').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            }
            
            nightActions.vampireLocks.add(interaction.user.id);
            
            let aliveVampires = 0;
            players.forEach(p => {
                if (p.role === 'Vampir' && !p.isDead) aliveVampires++;
            });

            if (nightActions.vampireLocks.size === aliveVampires && aliveVampires > 0) {
                nightActions.vampireTarget = nightActions.vampireNominee;
                await updateControlPanel();
            }
            
            await updateVampireMessage();
            await interaction.deferUpdate();
            return;
        }

        if (interaction.customId === 'day_vote') {
            if (gameState !== 'VOTING') return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Oylama aktif değil.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            if (!players.has(interaction.user.id) || players.get(interaction.user.id).isDead || interaction.user.id === hostId) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Oy kullanamazsınız.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            }

            const targetId = interaction.values[0];
            if (targetId === interaction.user.id) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Kendinize oy veremezsiniz!').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
            }

            dayVotes.set(interaction.user.id, targetId);
            await updateVotingMessage();
            await interaction.reply({ embeds: [new EmbedBuilder().setDescription(targetId === 'pas' ? 'Oyunu pas geçtin.' : `Oyun başarıyla kaydedildi!`).setColor('#00ff00').setFooter({ text: 'Coded By BayrdY' })], ephemeral: true });
        }
    }
});

async function resolveNightPhase() {
    nightResults = '';
    
    // C0ded By BayrdY
    const blockedPlayers = new Set();
    nightActions.escortActions.forEach(targetId => {
        blockedPlayers.add(targetId);
    });

    let vampiresBlocked = false;
    players.forEach((p, id) => {
        if (p.role === 'Vampir' && blockedPlayers.has(id)) {
            vampiresBlocked = true;
        }
    });

    if (vampiresBlocked) {
        nightResults += `🚫 **Escort**, vampirleri oyaladı! Bu gece kimseye saldıramadılar.\n`;
        nightActions.vampireTarget = null;
    }

    nightActions.gozcuActions.forEach((targetId, gozcuId) => {
        const pGozcu = players.get(gozcuId);
        if (blockedPlayers.has(gozcuId)) {
            nightResults += `🚫 **Escort**, bir Gözcüyü oyaladı.\n`;
            pGozcu.member.send({ embeds: [new EmbedBuilder().setDescription('🛑 Bu gece biri seni oyaladı, hedefine gidemedin!').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' })] }).catch(()=>{});
        } else {
            const target = players.get(targetId);
            pGozcu.member.send({ embeds: [new EmbedBuilder().setDescription(`🔍 Dün gece araştırdığın **${target.member.displayName}** adlı kişinin rolü: **${target.role}**`).setColor('#3498db').setFooter({ text: 'Coded By BayrdY' })] }).catch(()=>{});
        }
    });

    let protectedPlayers = new Set();
    nightActions.doktorActions.forEach((targetId, doktorId) => {
        if (blockedPlayers.has(doktorId)) {
            nightResults += `🚫 **Escort**, bir Doktoru oyaladığı için koruması iptal oldu.\n`;
        } else {
            protectedPlayers.add(targetId);
        }
    });

    if (nightActions.vampireTarget) {
        if (protectedPlayers.has(nightActions.vampireTarget)) {
            nightResults += `🛡️ **Doktor**, vampirlerin hedefini başarıyla kurtardı!\n`;
        } else {
            const victim = players.get(nightActions.vampireTarget);
            nightResults += `💀 **Vampirler**, **${victim.member.displayName}** kişisini öldürdü!\n`;
        }
    } else if (!vampiresBlocked && rolesConfig.vampir > 0) {
        nightResults += `😴 Vampirler bu gece saldırmadı veya hedeflerini kilitlemediler.\n`;
    }
}

async function startGame() {
    gameState = 'DAY';
    
    // C_o d e_d  B y  B a_y_r d_Y
    let availablePlayers = [];
    players.forEach((p, id) => {
        if (id !== hostId) {
            p.isDead = false;
            availablePlayers.push(id);
        }
    });

    availablePlayers.sort(() => Math.random() - 0.5);

    let rolesToAssign = [];
    for(let i=0; i<rolesConfig.vampir; i++) rolesToAssign.push('Vampir');
    for(let i=0; i<rolesConfig.gozcu; i++) rolesToAssign.push('Gözcü');
    for(let i=0; i<rolesConfig.doktor; i++) rolesToAssign.push('Doktor');
    for(let i=0; i<rolesConfig.escort; i++) rolesToAssign.push('Escort');
    
    while(rolesToAssign.length < availablePlayers.length) rolesToAssign.push('Köylü');

    rolesToAssign.sort(() => Math.random() - 0.5);

    let vampires = [];

    for (let i = 0; i < availablePlayers.length; i++) {
        const pId = availablePlayers[i];
        players.get(pId).role = rolesToAssign[i];
        
        try {
            const roleEmbed = new EmbedBuilder()
                .setTitle('🦇 Vampir Köylü Başladı!')
                .setDescription(`Gizli Rolünüz: **${rolesToAssign[i]}**\n\nLütfen rolünüzü kimseye söylemeyin!`)
                .setColor('#9b59b6')
                .setFooter({ text: 'Gizli Rol - Coded By BayrdY' })
                .setTimestamp();
            await players.get(pId).member.send({ embeds: [roleEmbed] });
        } catch(e) {}

        if (rolesToAssign[i] === 'Vampir') vampires.push(pId);
    }

    try {
        const vampChannel = await client.channels.fetch(config.vampireChannelId);
        if (vampChannel) {
            await vampChannel.permissionOverwrites.edit(vampChannel.guild.roles.everyone, { ViewChannel: false });
            await vampChannel.permissionOverwrites.edit(hostId, { ViewChannel: true, SendMessages: true });
            for (const vId of vampires) {
                await vampChannel.permissionOverwrites.edit(vId, { ViewChannel: true, SendMessages: true });
            }
            const vampEmbed = new EmbedBuilder()
                .setTitle('🩸 Vampir Sığınağı')
                .setDescription('Oyun Başladı! Bu kanal sadece **Vampirler** ve Host tarafından görülür. Gece olduğunda kimi öldüreceğinizi buradan seçeceksiniz.')
                .setColor('#c0392b')
                .setFooter({ text: 'Coded By BayrdY' });
            await vampChannel.send({ embeds: [vampEmbed] });
        }
    } catch(e) {}

    await updateControlPanel();
}

async function startNightPhase() {
    const aliveOptions = [];
    const aliveVillagersForVampire = [];

    players.forEach((p, id) => {
        if (id !== hostId && !p.isDead) {
            aliveOptions.push({ label: p.member.displayName, value: id });
            if (p.role !== 'Vampir') {
                aliveVillagersForVampire.push({ label: p.member.displayName, value: id });
            }
        }
    });

    if (aliveOptions.length === 0) aliveOptions.push({ label: 'Kimse', value: 'none' });
    if (aliveVillagersForVampire.length === 0) aliveVillagersForVampire.push({ label: 'Kimse', value: 'none' });

    players.forEach(async (p, id) => {
        if (id === hostId || p.isDead) return;

        try { await p.member.voice.setMute(true, 'Gece Oldu').catch(()=>{}); } catch(e){}

        if (p.role === 'Gözcü') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('gozcu_select').setPlaceholder('Kimin rolünü görmek istersin?').setOptions(aliveOptions)
            );
            const embed = new EmbedBuilder().setDescription('Gece oldu! Birinin rolünü öğrenmek için seç:').setColor('#2c3e50').setFooter({ text: 'Gözcü - Coded By BayrdY' });
            await p.member.send({ embeds: [embed], components: [row] }).catch(()=>{});
        }
        else if (p.role === 'Doktor') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('doktor_select').setPlaceholder('Kimi korumak istersin?').setOptions(aliveOptions)
            );
            const embed = new EmbedBuilder().setDescription('Gece oldu! Bu gece kimi korumak istiyorsun?').setColor('#27ae60').setFooter({ text: 'Doktor - Coded By BayrdY' });
            await p.member.send({ embeds: [embed], components: [row] }).catch(()=>{});
        }
        else if (p.role === 'Escort') {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('escort_select').setPlaceholder('Kimi oyalayacaksın?').setOptions(aliveOptions)
            );
            const embed = new EmbedBuilder().setDescription('Gece oldu! Bu gece kimi oyalayarak yeteneğini kullanmasını engelleyeceksin?').setColor('#8e44ad').setFooter({ text: 'Escort - Coded By BayrdY' });
            await p.member.send({ embeds: [embed], components: [row] }).catch(()=>{});
        }
    });

    // C o_d_e_d  B_y  Bayr d Y
    try {
        const vampChannel = await client.channels.fetch(config.vampireChannelId);
        const row1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('vampire_vote').setPlaceholder('Kimi öldürüyoruz?').setOptions(aliveVillagersForVampire)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vampire_lock').setLabel('Kararı Kilitle').setStyle(ButtonStyle.Danger)
        );
        
        const embed = new EmbedBuilder().setDescription('Gece oldu! Bir kurban adayı seçip kilitleyin.').setColor('#e74c3c').setFooter({ text: 'Vampir Konseyi - Coded By BayrdY' });
        const msg = await vampChannel.send({ content: '@everyone', embeds: [embed], components: [row1, row2] });
        vampireMessageId = msg.id;
        await updateVampireMessage();
    } catch(e) {}

    await updateControlPanel();
}

async function updateVampireMessage() {
    if (!vampireMessageId) return;
    try {
        const vampChannel = await client.channels.fetch(config.vampireChannelId);
        const msg = await vampChannel.messages.fetch(vampireMessageId);
        if (msg) {
            let desc = '';
            const nomineeName = nightActions.vampireNominee ? players.get(nightActions.vampireNominee)?.member.displayName : 'Henüz seçilmedi';
            desc += `**Ortaya Atılan Kurban:** ${nomineeName}\n\n**Vampirlerin Durumu:**\n`;
            
            players.forEach((p, id) => {
                if (p.role === 'Vampir' && !p.isDead) {
                    const lock = nightActions.vampireLocks.has(id);
                    const lockText = lock ? '🔒 Destekliyor / Kilitledi' : '⏳ Karar Bekleniyor...';
                    desc += `- ${p.member.displayName}: ${lockText}\n`;
                }
            });
            
            if (nightActions.vampireTarget) {
                desc += `\n✅ **TÜM VAMPİRLER KİLİTLEDİ!** Kurban kesinleşti.`;
            }

            const embed = new EmbedBuilder().setTitle('Vampir Konseyi').setDescription(desc).setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' });
            await msg.edit({ content: '@everyone', embeds: [embed] });
        }
    } catch(e) {}
}

async function createVotingMessage() {
    try {
        const gameVoice = await client.channels.fetch(config.voiceChannelId);
        
        let aliveOptions = [];
        players.forEach((p, id) => {
            if (id !== hostId && !p.isDead) aliveOptions.push({ label: p.member.displayName, value: id });
        });
        aliveOptions.push({ label: 'Pas Geç', value: 'pas' });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('day_vote').setPlaceholder('Kimi asıyoruz?').setOptions(aliveOptions)
        );

        const embed = getVotingEmbed();
        const msg = await gameVoice.send({ content: '@here', embeds: [embed], components: [row] });
        votingMessageId = msg.id;
    } catch(e) {}
}

async function updateVotingMessage() {
    if (!votingMessageId) return;
    try {
        const gameVoice = await client.channels.fetch(config.voiceChannelId);
        const msg = await gameVoice.messages.fetch(votingMessageId);
        if (msg) {
            await msg.edit({ embeds: [getVotingEmbed()] });
        }
    } catch(e) {}
}

async function finishVoting() {
    if (!votingMessageId) return;
    try {
        const gameVoice = await client.channels.fetch(config.voiceChannelId);
        const msg = await gameVoice.messages.fetch(votingMessageId);
        if (msg) {
            const embed = getVotingEmbed();
            embed.setTitle('🛑 Oylama Bitti!');
            
            const components = msg.components;
            if(components[0]) components[0].components[0].setDisabled(true);

            await msg.edit({ embeds: [embed], components: [components[0]] });
            votingMessageId = null;
        }
    } catch(e) {}
}

function getVotingEmbed() {
    // C0d3d _ By _ B4yrdY
    const voteCounts = new Map();
    let pasCount = 0;
    dayVotes.forEach(target => {
        if(target === 'pas') pasCount++;
        else voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
    });

    const sortedVotes = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);

    let desc = 'Mevcut oylama durumu:\n\n';
    if (sortedVotes.length === 0 && pasCount === 0) {
        desc += '*Henüz oy kullanılmadı.*';
    } else {
        sortedVotes.forEach(([votedId, count]) => {
            const p = players.get(votedId);
            const name = p ? p.member.displayName : 'Bilinmeyen';
            desc += `**${name}**: ${count} oy\n`;
        });
        if (pasCount > 0) desc += `\n**Pas Geçenler:** ${pasCount} kişi`;
    }

    return new EmbedBuilder().setTitle('⚖️ Şüpheli Oylaması').setDescription(desc).setColor('#e67e22').setFooter({ text: 'Oylama - Coded By BayrdY' });
}

async function endGame() {
    gameState = 'LOBBY';
    hostId = null;
    players.forEach(p => { p.role = 'Köylü'; p.isDead = false; });
    
    try {
        const gameVoice = await client.channels.fetch(config.voiceChannelId);
        for (const [id, p] of players) {
            await p.member.voice.setMute(false).catch(()=>{});
            await gameVoice.permissionOverwrites.delete(id).catch(()=>{});
        }
        
        const vampChannel = await client.channels.fetch(config.vampireChannelId);
        if (vampChannel) {
            const overwrites = vampChannel.permissionOverwrites.cache;
            for (const [id, overwrite] of overwrites) {
                if (overwrite.type === 1) { 
                    await overwrite.delete().catch(()=>{});
                }
            }
            const endEmbed = new EmbedBuilder().setDescription('🛑 Oyun Sona Erdi! Yetkiler sıfırlandı.').setColor('#ff0000').setFooter({ text: 'Coded By BayrdY' });
            await vampChannel.send({ embeds: [endEmbed] });
        }
    } catch(e) {}

    await refreshPlayersInVoice();
    await updateControlPanel();
}

// Cod_ed  By Bayr_dY
client.login(config.token);
