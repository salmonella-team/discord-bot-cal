import * as Discord from 'discord.js'
import Settings from 'const-settings'

/**
 * キャルが起動した際に通知を送る
 * @param client botのClient情報
 */
export const Ready = async (client: Discord.Client) => {
  const channel = client.channels.cache.get(Settings.CHANNEL_CALL_ID) as Discord.TextChannel
  await channel?.send('キャルの参上よ！')
  console.log(`Logged in as ${client.user?.username}!`)
}
