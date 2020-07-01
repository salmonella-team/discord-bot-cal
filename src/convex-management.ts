import * as Discord from 'discord.js'
import throwEnv from 'throw-env'
import Settings from 'const-settings'

export const ConvexManagement = () => {
  const client = new Discord.Client()
  client.on('guildMemberAdd', (member: Discord.GuildMember) => {
    // ウェルカムメッセージしないサーバなら終了
    if (member.guild.name !== Settings.WELCOME_SERVER) return

    const channel = client.channels.cache.get(throwEnv('WELCOME_CHANNEL_ID')) as Discord.TextChannel
    channel?.send(`<@!${member.user?.id}> まずは <#${throwEnv('GUIDE_CHANNEL_ID')}> を確認しなさい！`)
  })
  client.login(throwEnv('CAL_TOKEN'))
}